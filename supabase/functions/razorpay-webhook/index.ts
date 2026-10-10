import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

async function verifyRazorpaySignature(
  bodyText: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!secret || !signature) return false;
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(bodyText)
    );
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const computedSignature = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computedSignature === signature;
  } catch (_e) {
    return false;
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  let supabase: any = null;
  let eventId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const razorpayWebhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "";
    if (!supabaseUrl || !supabaseServiceKey || !razorpayWebhookSecret) {
      console.error("Razorpay webhook is missing required server configuration");
      return new Response(JSON.stringify({ error: "Webhook verification is not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const signature = req.headers.get("x-razorpay-signature") || "";
    const rawBody = await req.text();
    if (!signature || !(await verifyRazorpaySignature(rawBody, signature, razorpayWebhookSecret))) {
      return new Response(JSON.stringify({ error: "Invalid Razorpay webhook signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const event = JSON.parse(rawBody);
    const eventType = typeof event.event === "string" ? event.event : "unknown";
    const payload = event.payload || {};
    const paymentEntity = payload?.payment?.entity || null;
    const orderEntity = payload?.order?.entity || null;
    const subscriptionEntity = payload?.subscription?.entity || null;
    const stableEntityId = paymentEntity?.id || subscriptionEntity?.id || orderEntity?.id || "";
    eventId = req.headers.get("x-razorpay-event-id") || `${eventType}:${stableEntityId || await sha256Hex(rawBody)}`;
    const payloadHash = await sha256Hex(rawBody);

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: recordRes, error: recordErr } = await supabase.rpc("record_payment_event", {
      p_provider: "razorpay",
      p_event_id: eventId,
      p_event_type: eventType,
      p_payload_hash: payloadHash,
      p_payload: event
    });
    if (recordErr || !recordRes) {
      throw new Error(`Unable to record webhook idempotency: ${recordErr?.message || "No response"}`);
    }
    if (recordRes.is_duplicate && recordRes.status === "completed") {
      return new Response(JSON.stringify({ status: "ignored", message: "Webhook event already completed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const paymentId = paymentEntity?.id;
    const orderId = paymentEntity?.order_id || orderEntity?.id || null;
    const amount = Number(paymentEntity?.amount || 0) / 100;
    const currency = paymentEntity?.currency || orderEntity?.currency || "INR";
    const notes = paymentEntity?.notes || orderEntity?.notes || subscriptionEntity?.notes || {};
    const userId = notes.userId || notes.user_id;

    if ((eventType === "payment.captured" || eventType === "order.paid") && userId && paymentId) {
      const { error: paymentError } = await supabase.from("payments").upsert({
        user_id: userId,
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        amount,
        currency,
        status: "completed",
        webhook_payload: event
      }, { onConflict: "razorpay_payment_id" });
      if (paymentError) throw new Error(`Payment record could not be saved: ${paymentError.message}`);

      let creditAmount = 0;
      const creditPackId = notes.creditPackId || notes.credit_pack_id;
      if (creditPackId) {
        const { data: pack, error: packError } = await supabase
          .from("credit_packs")
          .select("id, price_usd, credits, bonus_credits, active")
          .eq("id", creditPackId)
          .eq("active", true)
          .maybeSingle();
        if (packError) throw new Error(`Credit pack could not be verified: ${packError.message}`);
        if (!pack) throw new Error("The referenced credit pack is not active or does not exist.");
        if (currency !== "USD" || Math.round(amount * 100) !== Math.round(Number(pack.price_usd) * 100)) {
          throw new Error("Captured payment currency or amount does not match the selected credit pack.");
        }
        creditAmount = Math.round(Number(pack.credits) + Number(pack.bonus_credits || 0));
        if (!Number.isFinite(creditAmount) || creditAmount <= 0) {
          throw new Error("The selected credit pack has an invalid credit amount.");
        }
        const { error: creditError } = await supabase.rpc("credit_adjust", {
          p_user_id: userId,
          p_amount: creditAmount,
          p_type: "PURCHASE",
          p_reason: `Razorpay Payment ${paymentId}`
        });
        if (creditError) throw new Error(`Verified payment credit grant failed: ${creditError.message}`);
      } else {
        // Subscription charges and other payments must not be misclassified as credit-pack sales.
        console.warn("Captured payment has no credit-pack reference; no credit-pack grant applied:", paymentId);
      }

      const { error: auditError } = await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "PAYMENT_SUCCESS",
        entity_type: "payment",
        entity_id: paymentId,
        details: { amount, currency, credits_granted: creditAmount }
      });
      if (auditError) console.error("Payment audit log could not be saved:", auditError.message);
    } else if ((eventType === "subscription.charged" || eventType === "subscription.activated") && userId && subscriptionEntity?.id) {
      const currentStart = Number(subscriptionEntity.current_start || 0);
      const currentEnd = Number(subscriptionEntity.current_end || 0);
      const subscriptionRecord: Record<string, unknown> = {
        user_id: userId,
        razorpay_subscription_id: subscriptionEntity.id,
        status: "active"
      };
      if (currentStart > 0) subscriptionRecord.current_period_start = new Date(currentStart * 1000).toISOString();
      if (currentEnd > 0) subscriptionRecord.current_period_end = new Date(currentEnd * 1000).toISOString();

      const { error: subscriptionError } = await supabase.from("subscriptions").upsert(
        subscriptionRecord, { onConflict: "user_id" }
      );
      if (subscriptionError) throw new Error(`Subscription record could not be saved: ${subscriptionError.message}`);

      const { error: creditError } = await supabase.rpc("credit_adjust", {
        p_user_id: userId,
        p_amount: 1000,
        p_type: "SUBSCRIPTION_GRANT",
        p_reason: `Subscription Activated ${subscriptionEntity.id}`
      });
      if (creditError) throw new Error(`Subscription credit grant failed: ${creditError.message}`);
    }

    const { error: completionError } = await supabase.from("payment_events").update({
      status: "completed",
      processed_at: new Date().toISOString(),
      error: null
    }).eq("provider", "razorpay").eq("provider_event_id", eventId);
    if (completionError) throw new Error(`Webhook event could not be finalized: ${completionError.message}`);

    return new Response(JSON.stringify({ status: "success", event: eventType }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (err: any) {
    const message = err?.message || "Internal server error";
    if (supabase && eventId) {
      const { error: statusError } = await supabase.from("payment_events").update({
        status: "failed",
        error: message
      }).eq("provider", "razorpay").eq("provider_event_id", eventId).neq("status", "completed");
      if (statusError) console.error("Could not mark webhook event failed:", statusError.message);
    }
    console.error("Razorpay webhook processing failed:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
