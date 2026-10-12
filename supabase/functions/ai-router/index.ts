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
    // Task names are canonicalized server-side. Never trust a client-supplied
    // tier to choose a cheaper credit charge for a more expensive task.
    const task = typeof body.task === "string" && body.task.trim()
      ? body.task.trim().toUpperCase()
      : "GENERAL";
    const {
      prompt,
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
    const { data: routingRule, error: routingError } = await supabase
      .from("ai_task_routing")
      .select("*")
      .eq("task_type", task)
      .maybeSingle();

    if (routingError) {
      return new Response(JSON.stringify({ error: "AI routing configuration is unavailable." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }
    if (routingRule && routingRule.enabled === false) {
      return new Response(JSON.stringify({ error: "This AI task is temporarily unavailable." }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }

    // Normalize legacy display labels stored in ai_task_routing. The router's
    // execution branches require canonical provider IDs ("gemini" / "openai").
    const configuredProvider = String(routingRule?.primary_provider || "").toLowerCase();
    let provider =
      configuredProvider.includes("gemini") || configuredProvider.includes("google")
        ? "gemini"
        : configuredProvider.includes("openai")
          ? "openai"
          : (geminiApiKey ? "gemini" : "openai");
    let model = routingRule?.primary_model || (provider === "gemini" ? "gemini-3.6-flash" : "gpt-5.4-mini");

    // Charge the server-configured cost for the task, never a client-provided tier.
    const configuredCreditCost = Number(routingRule?.credit_cost);
    const estimatedCredits = Number.isFinite(configuredCreditCost) && configuredCreditCost > 0
      ? Math.ceil(configuredCreditCost)
      : 10;
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
          // Use the secondary provider when the configured primary is unavailable.
          if (!openaiApiKey) {
            await geminiRes.text();
            throw new Error("The configured AI provider is unavailable and no fallback provider is configured.");
          }
          provider = "openai";
          model = routingRule?.fallback_model || "gpt-5.4-mini";
          const fallbackRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              max_tokens: maxOutputTokens
            })
          });
          if (!fallbackRes.ok) {
            await fallbackRes.text();
            throw new Error("Both configured AI providers failed. Reserved credits will be returned.");
          }
          const fallbackData = await fallbackRes.json();
          resultText = fallbackData.choices?.[0]?.message?.content || "";
          inputTokens = fallbackData.usage?.prompt_tokens || inputTokens;
          outputTokens = fallbackData.usage?.completion_tokens || Math.ceil(resultText.length / 4);
        } else {
          const data = await geminiRes.json();
          resultText = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("") || "";
          inputTokens = Number(data.usageMetadata?.promptTokenCount) || inputTokens;
          outputTokens = Number(data.usageMetadata?.candidatesTokenCount) || Math.ceil(resultText.length / 4);
        }
      } else if (openaiApiKey) {
        provider = "openai";
        model = configuredProvider.includes("openai")
          ? (routingRule?.primary_model || "gpt-5.4-mini")
          : (routingRule?.fallback_model || "gpt-5.4-mini");
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

      // Never report success or silently lose a reservation when credit finalization fails.
      if (!resultText.trim()) throw new Error("The AI provider returned an empty response.");
      const { error: consumeError } = await supabase.rpc("credit_consume", {
        p_user_id: reqUserId,
        p_amount: estimatedCredits,
        p_task: task
      });
      if (consumeError) {
        await supabase.rpc("credit_release", {
          p_user_id: reqUserId,
          p_amount: estimatedCredits,
          p_task: task,
          p_metadata: { description: "AI credit finalization failed; reservation released" }
        });
        reservationLedgerId = null;
        throw new Error("Could not finalize AI credits. Please retry.");
      }

      // 6. Record cost using the active model's current per-token rates.
      // Conservative provider defaults prevent under-reporting if a model row is missing.
      const { data: pricingRows, error: pricingLookupError } = await supabase
        .from("ai_model_pricing")
        .select("input_cost_per_1m, output_cost_per_1m")
        .eq("model", model)
        .eq("active", true)
        .order("effective_from", { ascending: false })
        .limit(1);
      if (pricingLookupError) console.error("AI pricing lookup failed:", pricingLookupError.message);
      const pricing = pricingRows?.[0];
      const inputCostPerMillion = Number(pricing?.input_cost_per_1m) || (provider === "gemini" ? 0.75 : 0.75);
      const outputCostPerMillion = Number(pricing?.output_cost_per_1m) || (provider === "gemini" ? 3.75 : 4.50);
      const estCostUsd = (
        inputTokens * inputCostPerMillion +
        outputTokens * outputCostPerMillion
      ) / 1_000_000;
      const { error: costEventError } = await supabase.from("ai_cost_events").insert({
        user_id: reqUserId,
        provider,
        model,
        task,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost_usd: estCostUsd,
        credits_charged: estimatedCredits
      });
      if (costEventError) console.error("AI cost event could not be saved:", costEventError.message);

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
