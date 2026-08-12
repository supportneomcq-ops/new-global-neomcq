import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user counts
    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    
    // Fetch active subscription counts
    const { count: activeSubs } = await supabase
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Fetch payments revenue
    const { data: payments } = await supabase
      .from("payments")
      .select("amount")
      .eq("status", "captured");

    const totalRevenue = (payments || []).reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);

    // Fetch total AI generation jobs
    const { count: totalAiJobs } = await supabase
      .from("ai_generation_jobs")
      .select("*", { count: "exact", head: true });

    return new Response(
      JSON.stringify({
        status: "success",
        analytics: {
          totalUsers: totalUsers || 0,
          activeSubscriptions: activeSubs || 0,
          totalRevenueInr: totalRevenue,
          totalAiJobs: totalAiJobs || 0,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
