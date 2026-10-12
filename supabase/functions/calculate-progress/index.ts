import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Progress service unavailable" }, 503);

    const authorization = req.headers.get("authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return json({ error: "Authentication required" }, 401);

    const caller = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error: authError } = await caller.auth.getUser(tokenMatch[1]);
    if (authError || !user) return json({ error: "Authentication required" }, 401);

    const body = await req.json();
    const { userId, examId } = body;
    if (!examId || typeof examId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examId)) {
      return json({ error: "A valid exam is required." }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    let profileId = user.id;
    const { data: profileById } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (profileById?.id) {
      profileId = profileById.id;
    } else {
      const { data: profileByAuthId } = await admin.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (!profileByAuthId?.id) return json({ error: "Learning profile not found. Please finish onboarding." }, 403);
      profileId = profileByAuthId.id;
    }

    if (userId && userId !== user.id && userId !== profileId) {
      return json({ error: "The requested user does not match the signed-in account." }, 403);
    }

    const { data: progressData, error: rpcErr } = await admin.rpc("calculate_user_exam_progress", {
      p_user_id: profileId,
      p_exam_id: examId,
    });
    if (rpcErr) {
      console.error("[calculate-progress] RPC failed", rpcErr);
      return json({ error: "Could not calculate progress right now." }, 500);
    }

    return json({ status: "success", progress: progressData });
  } catch (err) {
    console.error("[calculate-progress] Request failed", err);
    return json({ error: "Could not calculate progress right now." }, 500);
  }
});
