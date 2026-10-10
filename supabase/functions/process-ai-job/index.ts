import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const authorization = req.headers.get("Authorization") || "";
    const bearerToken = authorization.replace(/^Bearer\s+/i, "");
    const isServiceRole = bearerToken.length > 0 && bearerToken === supabaseServiceKey;
    let callerUserId: string | null = null;

    // This function has JWT gateway verification disabled for compatibility with its
    // existing custom-auth deployment, so enforce identity here before using service role.
    if (!isServiceRole) {
      if (!bearerToken || !supabaseAnonKey) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data: { user }, error: userError } = await callerClient.auth.getUser(bearerToken);
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      callerUserId = user.id;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { jobId } = body;

    if (typeof jobId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid jobId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch queued job from ai_jobs
    const { data: job, error: jobErr } = await supabase
      .from("ai_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: "AI job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isServiceRole && callerUserId !== job.user_id) {
      const { data: isAdmin, error: adminCheckError } = await supabase.rpc("is_admin", {
        p_user_id: callerUserId
      });
      if (adminCheckError || !isAdmin) {
        return new Response(
          JSON.stringify({ error: "You are not allowed to process this AI job" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (job.status === "completed") {
      return new Response(
        JSON.stringify({ status: "already_completed", output: job.output_payload }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark job as running
    await supabase
      .from("ai_jobs")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
        attempts: (job.attempts || 0) + 1
      })
      .eq("id", jobId);

    const prompt = job.input_payload?.prompt || `Generate learning material for task ${job.task}`;
    let resultText = "";
    let provider = "gemini";
    let model = "gemini-2.0-flash";

    if (geminiApiKey) {
      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );
      if (gRes.ok) {
        const data = await gRes.json();
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      }
    } else if (openaiApiKey) {
      provider = "openai";
      model = "gpt-4o-mini";
      const oRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] })
      });
      if (oRes.ok) {
        const data = await oRes.json();
        resultText = data.choices?.[0]?.message?.content || "";
      }
    }

    if (!resultText) {
      throw new Error("AI provider execution failed to generate content");
    }

    // Charge successfully before exposing a completed job. Supabase RPC failures are
    // returned as { error } and do not necessarily throw, so handle them explicitly.
    if (job.user_id) {
      const { error: creditError } = await supabase.rpc("credit_consume", {
        p_user_id: job.user_id,
        p_amount: 10,
        p_task: job.task,
        p_job_id: jobId
      });
      if (creditError) {
        await supabase
          .from("ai_jobs")
          .update({
            status: "failed",
            error: `Credit consumption failed: ${creditError.message}`,
            completed_at: new Date().toISOString()
          })
          .eq("id", jobId);
        throw new Error("AI job could not be finalized because credit accounting failed.");
      }
    }

    const { error: completionError } = await supabase
      .from("ai_jobs")
      .update({
        status: "completed",
        provider,
        model,
        output_payload: { text: resultText },
        completed_at: new Date().toISOString()
      })
      .eq("id", jobId);

    if (completionError) {
      throw new Error(`Failed to mark AI job completed: ${completionError.message}`);
    }

    return new Response(
      JSON.stringify({ status: "completed", jobId, result: resultText }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
