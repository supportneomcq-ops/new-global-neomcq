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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authentication
    const authHeader = req.headers.get("authorization") || "";
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(tokenMatch[1]);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }
    const userId = user.id;

    const body = await req.json();
    const {
      task = "general",
      prompt,
      tier = "BALANCED",
      exam_id,
      subject_id,
      topic_id,
      max_tokens = 1000
    } = body;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (typeof prompt !== "string" || !prompt.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (prompt.length > 20000) {
      return new Response(JSON.stringify({ error: "Prompt is too long. Please shorten it and try again." }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    if (body.user_id && body.user_id !== userId) {
      return new Response(JSON.stringify({ error: "The requested user does not match the signed-in account." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const reqUserId = userId;
    const maxOutputTokens = Math.max(128, Math.min(Number(max_tokens) || 1000, 3000));

    // 2. Determine Model from ai_task_routing
    const { data: routingRule } = await supabase
      .from("ai_task_routing")
      .select("*")
      .eq("task_type", task)
      .maybeSingle();

    let provider = routingRule?.primary_provider || (geminiApiKey ? "gemini" : "openai");
    let model = routingRule?.primary_model || (provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini");

    // 3. Credit Reservation (10 credits default)
    const estimatedCredits = tier === "PREMIUM" ? 25 : tier === "LOW_COST" ? 5 : 10;
    let reservationLedgerId: string | null = null;

    try {
      const { data: resId, error: resErr } = await supabase.rpc("credit_reserve", {
        p_user_id: reqUserId,
        p_amount: estimatedCredits,
        p_task: task
      });
      if (resErr) {
        return new Response(JSON.stringify({ error: `Credit Reservation Failed: ${resErr.message}` }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      reservationLedgerId = resId;
    } catch (e: any) {
      return new Response(JSON.stringify({ error: `Credit Error: ${e.message}` }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Provider Execution
    let resultText = "";
    let inputTokens = Math.ceil(prompt.length / 4);
    let outputTokens = 0;

    try {
      if (provider === "gemini" && geminiApiKey) {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens }
            })
          }
        );

        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          throw new Error(`Gemini API Error: ${errText}`);
        }

        const data = await geminiRes.json();
        resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        outputTokens = Math.ceil(resultText.length / 4);
      } else if (openaiApiKey) {
        provider = "openai";
        model = "gpt-4o-mini";
        const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            max_tokens: maxOutputTokens
          })
        });

        if (!oaRes.ok) {
          const errText = await oaRes.text();
          throw new Error(`OpenAI API Error: ${errText}`);
        }

        const data = await oaRes.json();
        resultText = data.choices?.[0]?.message?.content || "";
        inputTokens = data.usage?.prompt_tokens || inputTokens;
        outputTokens = data.usage?.completion_tokens || Math.ceil(resultText.length / 4);
      } else {
        throw new Error("No AI API keys configured on backend");
      }

      // 5. Finalize Credit Consumption
      await supabase.rpc("credit_consume", {
        p_user_id: reqUserId,
        p_amount: estimatedCredits,
        p_task: task
      });

      // 6. Record Cost Event
      const estCostUsd = (inputTokens * 0.00000015) + (outputTokens * 0.0000006);
      await supabase.from("ai_cost_events").insert({
        user_id: reqUserId,
        provider,
        model,
        task,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_usd: estCostUsd,
        credits_charged: estimatedCredits
      });

      return new Response(
        JSON.stringify({
          success: true,
          result: resultText,
          provider,
          model,
          tokens: { input: inputTokens, output: outputTokens },
          credits_charged: estimatedCredits
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (execErr: any) {
      // Release reserved credits on failure
      if (reservationLedgerId) {
        await supabase.rpc("credit_release", {
          p_user_id: reqUserId,
          p_amount: estimatedCredits,
          p_task: task
        });
      }

      return new Response(
        JSON.stringify({ error: execErr.message || "AI Execution Failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
