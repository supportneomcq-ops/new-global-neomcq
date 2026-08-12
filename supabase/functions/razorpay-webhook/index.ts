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

    // Signature verification (Bypass in test mode if secret not configured)
    if (razorpayWebhookSecret) {
      const isValid = await verifyRazorpaySignature(
        rawBody,
        signature,
        razorpayWebhookSecret
      );
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid Razorpay webhook signature" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const payload = event.payload;

    // Idempotency check via payments table
    const paymentEntity = payload?.payment?.entity || payload?.order?.entity;
    const razorpayPaymentId = paymentEntity?.id;
    const razorpayOrderId = paymentEntity?.order_id;
    const amount = (paymentEntity?.amount || 0) / 100;
    const notes = paymentEntity?.notes || {};
    const userId = notes.userId || notes.user_id;

    if (razorpayPaymentId) {
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("id, status")
        .eq("razorpay_payment_id", razorpayPaymentId)
        .maybeSingle();

      if (existingPayment && existingPayment.status === "captured") {
        return new Response(
          JSON.stringify({ status: "ignored", message: "Event already processed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Process event types
    if (eventType === "payment.captured" || eventType === "order.paid") {
      if (userId) {
        // Upsert payment record
        await supabase.from("payments").upsert({
          user_id: userId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_order_id: razorpayOrderId,
          amount,
          currency: paymentEntity?.currency || "INR",
          status: "captured",
          webhook_payload: event,
        });

        // Grant credits based on package amount
        const creditAmount = amount >= 999 ? 500 : amount >= 499 ? 200 : 100;
        await supabase.rpc("add_user_credits_atomic", {
          p_user_id: userId,
          p_amount: creditAmount,
          p_tx_type: "PURCHASE",
          p_description: `Razorpay Payment ${razorpayPaymentId}`,
          p_reference_id: razorpayPaymentId,
        });
      }
    } else if (eventType === "subscription.charged" || eventType === "subscription.activated") {
      const subEntity = payload?.subscription?.entity;
      if (userId && subEntity) {
        await supabase.from("subscriptions").upsert({
          user_id: userId,
          razorpay_subscription_id: subEntity.id,
          status: "active",
          current_period_start: new Date(subEntity.current_start * 1000).toISOString(),
          current_period_end: new Date(subEntity.current_end * 1000).toISOString(),
        });

        await supabase.rpc("add_user_credits_atomic", {
          p_user_id: userId,
          p_amount: 1000,
          p_tx_type: "SUBSCRIPTION_GRANT",
          p_description: `Subscription ${subEntity.id}`,
          p_reference_id: subEntity.id,
        });
      }
    }

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
