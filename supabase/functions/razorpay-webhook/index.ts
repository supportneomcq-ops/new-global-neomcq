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

    if (computedSignature.length !== signature.length) return false;
    let difference = 0;
    for (let i = 0; i < computedSignature.length; i++) {
      difference |= computedSignature.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return difference === 0;
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
    const notes = {
      ...(subscriptionEntity?.notes || {}),
      ...(orderEntity?.notes || {}),
      ...(paymentEntity?.notes || {})
    };
    const userId = notes.userId || notes.user_id;
    const planCode = notes.planCode || notes.plan_code;
    const isSubscriptionPayment = notes.type === "subscription" && Boolean(userId && planCode);

    if ((eventType === "payment.captured" || eventType === "order.paid") && userId && paymentId) {
      const { error: paymentError } = await supabase.from("payments").upsert({
        user_id: userId,
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        amount,
        currency,
        status: "captured",
        webhook_payload: event
      }, { onConflict: "razorpay_payment_id" });
      if (paymentError) throw new Error(`Payment record could not be saved: ${paymentError.message}`);

      if (isSubscriptionPayment) {
        // A standard order checkout stores the order ID in the pending subscription row.
        // Recurring subscriptions instead carry subscription_id on the payment entity.
        const recurringSubscriptionId = paymentEntity?.subscription_id || notes.subscription_id || null;
        const checkoutId = recurringSubscriptionId || orderId;
        if (!checkoutId) throw new Error("Subscription payment is missing its checkout identifier.");

        const { data: pendingSub, error: pendingError } = await supabase
          .from("subscriptions")
          .select("id, plan_id, plan_code, status, amount, currency, razorpay_subscription_id")
          .eq("user_id", userId)
          .eq("razorpay_subscription_id", checkoutId)
          .maybeSingle();
        if (pendingError) throw new Error(`Pending subscription could not be loaded: ${pendingError.message}`);
        if (!pendingSub || pendingSub.plan_code !== planCode || !["pending", "active"].includes(pendingSub.status)) {
          throw new Error("Captured payment does not match a pending subscription for this user and plan.");
        }
        if (pendingSub.currency !== currency || Math.round(Number(pendingSub.amount) * 100) !== Math.round(Number(paymentEntity?.amount || 0))) {
          throw new Error("Captured subscription payment amount or currency does not match the pending checkout.");
        }

        const { data: planRow, error: planError } = await supabase
          .from("subscription_plans")
          .select("billing_interval")
          .eq("id", pendingSub.plan_id)
          .maybeSingle();
        if (planError || !planRow) throw new Error("The local subscription plan could not be resolved.");

        const startDate = new Date();
        const endDate = new Date(startDate);
        if (planRow.billing_interval === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
        else if (planRow.billing_interval === "monthly") endDate.setMonth(endDate.getMonth() + 1);
        else throw new Error("Unsupported subscription billing interval.");

        const subscriptionUpdate: Record<string, unknown> = {
          status: "active",
          razorpay_payment_id: paymentId,
          current_period_start: startDate.toISOString(),
          current_period_end: endDate.toISOString(),
          updated_at: new Date().toISOString()
        };
        if (pendingSub.status !== "active") subscriptionUpdate.started_at = startDate.toISOString();
        const { error: activateError } = await supabase.from("subscriptions")
          .update(subscriptionUpdate)
          .eq("id", pendingSub.id);
        if (activateError) throw new Error(`Subscription could not be activated: ${activateError.message}`);

        // For a one-time order fallback, no subscription.charged event will arrive.
        // Recurring subscription payments are credited by subscription.charged below.
        if (!recurringSubscriptionId) {
          const { error: creditError } = await supabase.rpc("credit_adjust", {
            p_user_id: userId,
            p_amount: 1000,
            p_type: "SUBSCRIPTION_GRANT",
            p_reason: `Subscription Activated ${checkoutId}`
          });
          if (creditError) throw new Error(`Subscription credit grant failed: ${creditError.message}`);
        }

        const { error: auditError } = await supabase.from("audit_logs").insert({
          user_id: userId,
          action: "PAYMENT_SUCCESS",
          entity_type: "payment",
          entity_id: paymentId,
          details: { amount, currency, plan_code: planCode, subscription_activated: true }
        });
        if (auditError) console.error("Subscription payment audit log could not be saved:", auditError.message);
      } else {
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
      }
    } else if ((eventType === "subscription.charged" || eventType === "subscription.activated") && userId && subscriptionEntity?.id) {
      const { data: existingSub, error: existingSubError } = await supabase
        .from("subscriptions")
        .select("id, plan_id, plan_code, status, amount, currency")
        .eq("user_id", userId)
        .eq("razorpay_subscription_id", subscriptionEntity.id)
        .maybeSingle();
      if (existingSubError) throw new Error(`Subscription could not be loaded: ${existingSubError.message}`);
      if (!existingSub || (planCode && existingSub.plan_code !== planCode)) {
        throw new Error("Razorpay subscription does not match a locally pending subscription.");
      }

      if (paymentEntity?.amount && (existingSub.currency !== currency || Math.round(Number(existingSub.amount) * 100) !== Math.round(Number(paymentEntity.amount)))) {
        throw new Error("Recurring payment amount or currency does not match the stored subscription.");
      }

      const { data: planRow, error: planError } = await supabase
        .from("subscription_plans")
        .select("billing_interval")
        .eq("id", existingSub.plan_id)
        .maybeSingle();
      if (planError || !planRow) throw new Error("The local subscription plan could not be resolved.");

      const startSeconds = Number(subscriptionEntity.current_start || 0);
      const endSeconds = Number(subscriptionEntity.current_end || 0);
      const startDate = startSeconds > 0 ? new Date(startSeconds * 1000) : new Date();
      const endDate = endSeconds > 0 ? new Date(endSeconds * 1000) : new Date(startDate);
      if (endSeconds <= 0) {
        if (planRow.billing_interval === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
        else if (planRow.billing_interval === "monthly") endDate.setMonth(endDate.getMonth() + 1);
        else throw new Error("Unsupported subscription billing interval.");
      }

      const subscriptionUpdate: Record<string, unknown> = {
        status: "active",
        current_period_start: startDate.toISOString(),
        current_period_end: endDate.toISOString(),
        ...(paymentId ? { razorpay_payment_id: paymentId } : {}),
        updated_at: new Date().toISOString()
      };
      if (existingSub.status !== "active") subscriptionUpdate.started_at = startDate.toISOString();
      const { error: subscriptionError } = await supabase.from("subscriptions")
        .update(subscriptionUpdate)
        .eq("id", existingSub.id);
      if (subscriptionError) throw new Error(`Subscription record could not be saved: ${subscriptionError.message}`);

      if (eventType === "subscription.charged") {
        if (paymentId) {
          const { error: paymentError } = await supabase.from("payments").upsert({
            user_id: userId,
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            amount,
            currency,
            status: "captured",
            webhook_payload: event
          }, { onConflict: "razorpay_payment_id" });
          if (paymentError) throw new Error(`Subscription payment record could not be saved: ${paymentError.message}`);
        }

        const { error: creditError } = await supabase.rpc("credit_adjust", {
          p_user_id: userId,
          p_amount: 1000,
          p_type: "SUBSCRIPTION_GRANT",
          p_reason: `Subscription Charge ${subscriptionEntity.id}:${paymentId || eventId}`
        });
        if (creditError) throw new Error(`Subscription credit grant failed: ${creditError.message}`);
      }
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
