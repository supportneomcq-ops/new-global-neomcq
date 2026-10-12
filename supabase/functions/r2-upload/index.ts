import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.750.0?target=deno";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3.750.0?target=deno";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const json = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "application/pdf",
]);

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const accountId = Deno.env.get("R2_ACCOUNT_ID") || "";
    const accessKey = Deno.env.get("R2_ACCESS_KEY_ID") || "";
    const secretKey = Deno.env.get("R2_SECRET_ACCESS_KEY") || "";
    const bucket = Deno.env.get("R2_BUCKET_NAME") || "neomcq-assets";
    const publicBase = (Deno.env.get("R2_PUBLIC_URL") || "").replace(/\/+$/, "");

    if (!supabaseUrl || !anonKey || !accountId || !accessKey || !secretKey || !publicBase) {
      return json({ error: "Secure upload is not configured. Please contact support." }, 503);
    }

    const authorization = req.headers.get("authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return json({ error: "Authentication required" }, 401);

    const caller = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await caller.auth.getUser(tokenMatch[1]);
    if (authError || !user) return json({ error: "Authentication required" }, 401);

    const body = await req.json();
    if (body?.action !== "get_upload_url") {
      return json({ status: "success", r2Configured: true });
    }

    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const contentType = typeof body.contentType === "string" ? body.contentType.toLowerCase().trim() : "";
    if (!fileName || fileName.length > 180) return json({ error: "A valid file name is required." }, 400);
    if (!allowedTypes.has(contentType)) return json({ error: "This file type is not allowed." }, 415);

    const safeName = fileName.split(/[\\/]/).pop()!.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
    if (!safeName || safeName === "." || safeName === "..") return json({ error: "Invalid file name." }, 400);

    const fileKey = `uploads/${user.id}/${crypto.randomUUID()}-${safeName}`;
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      forcePathStyle: true,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileKey,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });

    return json({
      status: "success",
      uploadUrl,
      fileKey,
      publicUrl: `${publicBase}/${fileKey}`,
      expiresIn: 300,
      method: "PUT",
      requiredHeaders: { "Content-Type": contentType },
    });
  } catch (err) {
    console.error("[r2-upload] Upload URL generation failed", err);
    return json({ error: "Could not create a secure upload URL. Please try again." }, 500);
  }
});
