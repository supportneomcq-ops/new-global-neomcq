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
    const body = await req.json();
    const { userId, examId } = body;

    if (!userId || !examId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: userId, examId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call RPC
    const { data: progressData, error: rpcErr } = await supabase.rpc(
      "calculate_user_exam_progress",
      {
        p_user_id: userId,
        p_exam_id: examId,
      }
    );

    if (rpcErr) {
      throw rpcErr;
    }

    return new Response(
      JSON.stringify({ status: "success", progress: progressData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
