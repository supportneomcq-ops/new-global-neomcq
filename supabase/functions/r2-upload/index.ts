import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID") || "";
    const r2AccessKey = Deno.env.get("R2_ACCESS_KEY_ID") || "";
    const r2SecretKey = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
    const r2BucketName = Deno.env.get("R2_BUCKET_NAME") || "neomcq-assets";
    const r2PublicUrl = Deno.env.get("R2_PUBLIC_URL") || `https://${r2AccountId}.r2.cloudflarestorage.com`;

    const body = await req.json();
    const { action, fileName, contentType } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_upload_url") {
      if (!fileName) {
        return new Response(
          JSON.stringify({ error: "Missing required parameter: fileName" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const fileKey = `uploads/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const uploadUrl = `${r2PublicUrl}/${r2BucketName}/${fileKey}`;

      return new Response(
        JSON.stringify({
          status: "success",
          uploadUrl,
          fileKey,
          publicUrl: `${r2PublicUrl}/${fileKey}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "success",
        r2Configured: !!(r2AccountId && r2AccessKey && r2SecretKey),
        bucket: r2BucketName,
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
