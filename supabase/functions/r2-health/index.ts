import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const accountId = Deno.env.get("R2_ACCOUNT_ID") || "";
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID") || "";
  const secretKey = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
  const bucketName = Deno.env.get("R2_BUCKET_NAME") || "";

  const isConfigured = !!(accountId && accessKeyId && secretKey && bucketName);

  return new Response(JSON.stringify({
    configured: isConfigured,
    bucket: bucketName || "Not Configured",
    status: isConfigured ? "Configured" : "Missing Secrets",
    lastChecked: new Date().toISOString()
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
