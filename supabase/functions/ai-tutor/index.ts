import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { userId, userMessage, topicId, conversationHistory = [] } = body;

    if (!userId || !userMessage) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: userId, userMessage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct 2 credits atomically for AI Tutor response
    const { data: deductRes } = await supabase.rpc("deduct_user_credits_atomic", {
      p_user_id: userId,
      p_amount: 2,
      p_description: "AI Tutor Question",
    });

    if (deductRes && !deductRes.success) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits", details: deductRes }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch topic context if provided
    let topicContext = "";
    if (topicId) {
      const { data: topic } = await supabase
        .from("exam_topics")
        .select("name, exam_subjects (name, exams (name))")
        .eq("id", topicId)
        .maybeSingle();

      if (topic) {
        topicContext = `Topic: ${(topic as any).name}, Subject: ${(topic as any).exam_subjects?.name}, Exam: ${(topic as any).exam_subjects?.exams?.name}`;
      }
    }

    const systemPrompt = `You are NeoMCQ AI Tutor, an empathetic, highly knowledgeable medical, engineering, and competitive exam tutor. Provide step-by-step clear explanations, high-yield clinical/conceptual pearls, and memory mnemonics.
${topicContext ? `Context: ${topicContext}` : ""}`;

    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      })),
      { role: "user", parts: [{ text: userMessage }] },
    ];

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({ error: "Gemini API Error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I am here to help you study!";

    return new Response(
      JSON.stringify({
        status: "success",
        reply: replyText,
        remainingCredits: deductRes.new_balance,
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
