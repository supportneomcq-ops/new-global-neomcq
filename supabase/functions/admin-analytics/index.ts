import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;
  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authorization = req.headers.get("Authorization");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error("Admin analytics is missing required server configuration");
      return jsonResponse({ error: "Service temporarily unavailable" }, 503);
    }
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    // Validate the caller's JWT using the user's scoped client before using elevated credentials.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    // is_admin() only returns a true result for the authenticated caller's own user ID.
    const { data: isAdmin, error: adminError } = await userClient.rpc("is_admin", {
      p_user_id: userData.user.id
    });
    if (adminError) {
      console.error("Admin analytics authorization check failed:", adminError.message);
      return jsonResponse({ error: "Unable to verify administrator access" }, 503);
    }
    if (isAdmin !== true) {
      return jsonResponse({ error: "Administrator access required" }, 403);
    }

    // Only after explicit authentication and authorization do we use the service role.
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: summary, error: summaryError } = await serviceClient.rpc("get_admin_analytics_summary");
    if (summaryError) {
      console.error("Admin analytics query failed:", summaryError.message);
      return jsonResponse({ error: "Unable to load analytics" }, 500);
    }

    return jsonResponse({
      status: "success",
      analytics: summary,
      timestamp: new Date().toISOString()
    }, 200);
  } catch (err) {
    console.error("Admin analytics request failed:", err instanceof Error ? err.message : "Unknown error");
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
