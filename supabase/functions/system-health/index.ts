import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let dbHealthy = false;
  let dbLatencyMs = 0;

  try {
    const start = Date.now();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    dbLatencyMs = Date.now() - start;
    dbHealthy = !error;
  } catch (_e) {
    dbHealthy = false;
  }

  const razorpayConfigured = !!(Deno.env.get("RAZORPAY_KEY_ID") && Deno.env.get("RAZORPAY_KEY_SECRET"));
  const aiConfigured = !!(Deno.env.get("GEMINI_API_KEY") || Deno.env.get("OPENAI_API_KEY"));
  const r2Configured = !!(Deno.env.get("R2_ACCOUNT_ID") && Deno.env.get("R2_ACCESS_KEY_ID"));

  return new Response(JSON.stringify({
    status: dbHealthy ? "Healthy" : "Degraded",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: dbHealthy ? "Healthy" : "Unhealthy", latencyMs: dbLatencyMs },
      razorpay: { status: razorpayConfigured ? "Configured" : "Not Configured" },
      ai_providers: { status: aiConfigured ? "Configured" : "Not Configured" },
      r2_storage: { status: r2Configured ? "Configured" : "Not Configured" }
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
