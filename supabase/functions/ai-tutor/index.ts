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

  let supabase: ReturnType<typeof createClient> | null = null;
  let reservedUserId: string | null = null;
  let creditsReserved = false;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return json({ error: "The tutor service is temporarily unavailable." }, 503);
    }

    const authorization = req.headers.get("authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) return json({ error: "Authentication required" }, 401);

    const caller = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await caller.auth.getUser(tokenMatch[1]);
    if (authError || !user) return json({ error: "Authentication required" }, 401);

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json();
    const { userId, userMessage, topicId } = body;
    const conversationHistory = Array.isArray(body.conversationHistory) ? body.conversationHistory : [];

    if (typeof userMessage !== "string" || !userMessage.trim()) {
      return json({ error: "Please enter a question." }, 400);
    }
    if (userMessage.length > 5000 || conversationHistory.length > 20 ||
        conversationHistory.some((m: any) => !m || typeof m.content !== "string" || m.content.length > 4000)) {
      return json({ error: "Please shorten your question or conversation and try again." }, 413);
    }

    // Resolve the authenticated identity to the profile ID used by credit and learning tables.
    let profile: { id: string } | null = null;
    const byId = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!byId.error && byId.data) profile = byId.data;
    if (!profile) {
      const byAuthId = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (!byAuthId.error && byAuthId.data) profile = byAuthId.data;
    }
    if (!profile) return json({ error: "Finish setting up your learning profile before using AI Tutor." }, 403);
    if (userId && userId !== profile.id && userId !== user.id) {
      return json({ error: "The requested user does not match the signed-in account." }, 403);
    }
    reservedUserId = profile.id;

    let topicContext = "";
    if (typeof topicId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId)) {
      const { data: topic } = await supabase
        .from("exam_topics")
        .select("name, exam_subjects (name, exams (name))")
        .eq("id", topicId)
        .maybeSingle();
      if (topic) {
        topicContext = `Topic: ${(topic as any).name}, Subject: ${(topic as any).exam_subjects?.name}, Exam: ${(topic as any).exam_subjects?.exams?.name}`;
      }
    }

    if (!geminiApiKey && !openaiApiKey) return json({ error: "AI providers are not configured." }, 503);

    const { error: reserveError } = await supabase.rpc("credit_reserve", {
      p_user_id: profile.id,
      p_amount: 2,
      p_task: "ai-tutor",
      p_metadata: { description: "AI Tutor question reservation" },
    });
    if (reserveError) {
      return json({ error: "There are not enough available credits for this tutor response, or your credit account is unavailable." }, 402);
    }
    creditsReserved = true;

    const systemPrompt = `You are NeoMCQ AI Tutor, an empathetic, accurate tutor for the learner's selected exam. Explain step by step, emphasize high-yield concepts, and use useful memory aids. Do not invent exam-specific facts. If uncertain, say so.\n${topicContext ? `Context: ${topicContext}` : ""}`;
    const history = conversationHistory.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    let replyText = "";
    let provider = "";
    if (geminiApiKey) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [...history, { role: "user", parts: [{ text: userMessage }] }],
              generationConfig: { maxOutputTokens: 1200, temperature: 0.35 },
            }),
          },
        );
        if (response.ok) {
          const data = await response.json();
          replyText = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("").trim() || "";
          if (replyText) provider = "gemini";
        }
      } catch {
        // Attempt the configured fallback provider below.
      }
    }

    if (!replyText && openaiApiKey) {
      const messages = [
        { role: "system", content: systemPrompt },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        })),
        { role: "user", content: userMessage },
      ];
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 1200, temperature: 0.35 }),
      });
      if (response.ok) {
        const data = await response.json();
        replyText = data.choices?.[0]?.message?.content?.trim() || "";
        if (replyText) provider = "openai";
      }
    }

    if (!replyText) {
      await supabase.rpc("credit_release", {
        p_user_id: profile.id,
        p_amount: 2,
        p_task: "ai-tutor",
        p_metadata: { description: "AI Tutor provider failed; reservation released" },
      });
      creditsReserved = false;
      return json({ error: "The tutor could not generate a response right now. Your reserved credits have been returned; please try again." }, 502);
    }

    const { error: consumeError } = await supabase.rpc("credit_consume", {
      p_user_id: profile.id,
      p_amount: 2,
      p_task: "ai-tutor",
      p_job_id: null,
      p_metadata: { description: "AI Tutor response", provider },
    });
    if (consumeError) {
      await supabase.rpc("credit_release", {
        p_user_id: profile.id,
        p_amount: 2,
        p_task: "ai-tutor",
        p_metadata: { description: "AI Tutor credit finalization failed; reservation released" },
      });
      creditsReserved = false;
      return json({ error: "The response was generated, but credit finalization failed. Please retry; no credits were intentionally charged." }, 500);
    }
    creditsReserved = false;

    const { data: account } = await supabase
      .from("credit_accounts")
      .select("credit_balance")
      .eq("user_id", profile.id)
      .maybeSingle();

    return json({
      status: "success",
      reply: replyText,
      provider,
      remainingCredits: account?.credit_balance ?? null,
    });
  } catch (err) {
    if (supabase && reservedUserId && creditsReserved) {
      await supabase.rpc("credit_release", {
        p_user_id: reservedUserId,
        p_amount: 2,
        p_task: "ai-tutor",
        p_metadata: { description: "AI Tutor request failed; reservation released" },
      });
    }
    console.error("[ai-tutor] Request failed", err);
    return json({ error: "The tutor service encountered a problem. Please try again." }, 500);
  }
});
