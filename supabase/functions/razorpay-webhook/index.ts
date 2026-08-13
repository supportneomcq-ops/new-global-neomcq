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

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const razorpayWebhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const signature = req.headers.get("x-razorpay-signature") || "";
    const rawBody = await req.text();

    // 1. Strict Signature Verification (if secret configured)
    if (razorpayWebhookSecret) {
      const isValid = await verifyRazorpaySignature(rawBody, signature, razorpayWebhookSecret);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid Razorpay webhook signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event || "unknown";
    const payload = event.payload || {};
    const eventId = event.contains?.[0] || payload?.payment?.entity?.id || `evt_${Date.now()}`;

    // 2. Canonical Idempotency Check via RPC
    const { data: recordRes, error: recordErr } = await supabase.rpc("record_payment_event", {
      p_provider: "razorpay",
      p_event_id: eventId,
      p_event_type: eventType,
      p_payload_hash: null,
      p_payload: event
    });

    if (recordErr) {
      console.error("Error checking idempotency:", recordErr);
    } else if (recordRes?.is_duplicate) {
      return new Response(
        JSON.stringify({ status: "ignored", message: "Webhook event already processed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentEntity = payload?.payment?.entity || payload?.order?.entity;
    const razorpayPaymentId = paymentEntity?.id;
    const razorpayOrderId = paymentEntity?.order_id;
    const amount = (paymentEntity?.amount || 0) / 100;
    const notes = paymentEntity?.notes || {};
    const userId = notes.userId || notes.user_id;

    // 3. Process Events
    if ((eventType === "payment.captured" || eventType === "order.paid") && userId) {
      // Upsert Payment Record
      await supabase.from("payments").upsert({
        user_id: userId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        amount,
        currency: paymentEntity?.currency || "INR",
        status: "completed",
        webhook_payload: event
      });

      // Grant Credits Atomically
      const creditAmount = amount >= 999 ? 1000 : amount >= 499 ? 500 : 200;
      await supabase.rpc("credit_adjust", {
        p_user_id: userId,
        p_amount: creditAmount,
        p_type: "PURCHASE",
        p_reason: `Razorpay Payment ${razorpayPaymentId}`
      });

      // System Audit Log
      await supabase.from("audit_logs").insert({
        user_id: userId,
        action: "PAYMENT_SUCCESS",
        entity_type: "payment",
        entity_id: razorpayPaymentId,
        details: { amount, currency: paymentEntity?.currency || "INR", credits_granted: creditAmount }
      });
    } else if ((eventType === "subscription.charged" || eventType === "subscription.activated") && userId) {
      const subEntity = payload?.subscription?.entity;
      if (subEntity) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          razorpay_subscription_id: subEntity.id,
          status: "active",
          current_period_start: new Date(subEntity.current_start * 1000).toISOString(),
          current_period_end: new Date(subEntity.current_end * 1000).toISOString()
        });

        await supabase.rpc("credit_adjust", {
          p_user_id: userId,
          p_amount: 1000,
          p_type: "SUBSCRIPTION_GRANT",
          p_reason: `Subscription Activated ${subEntity.id}`
        });
      }
    }

    // Mark event completed
    await supabase.from("payment_events").update({
      status: "completed",
      processed_at: new Date().toISOString()
    }).eq("provider", "razorpay").eq("provider_event_id", eventId);

    return new Response(
      JSON.stringify({ status: "success", event: eventType }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
