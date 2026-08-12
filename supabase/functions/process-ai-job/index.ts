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
    const { jobId } = body;

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: jobId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch queued job
    const { data: job, error: jobErr } = await supabase
      .from("ai_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobErr || !job) {
      return new Response(
        JSON.stringify({ error: "AI job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (job.status === "completed") {
      return new Response(
        JSON.stringify({ status: "already_completed", result: job.result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark job as processing
    await supabase
      .from("ai_generation_jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    // Deduct user credits atomically
    const creditCost = 5;
    const { data: deductResult } = await supabase.rpc("deduct_user_credits_atomic", {
      p_user_id: job.user_id,
      p_amount: creditCost,
      p_description: `AI Job ${job.job_type}`,
      p_reference_id: jobId,
    });

    if (deductResult && !deductResult.success) {
      await supabase
        .from("ai_generation_jobs")
        .update({
          status: "failed",
          error_message: deductResult.error || "Insufficient credit balance",
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({ error: "Insufficient user credit balance", details: deductResult }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process Job Types
    const params = job.input_params || {};
    let prompt = "";

    if (job.job_type === "mcq_generation") {
      prompt = `Generate ${params.count || 5} high-yield multiple choice questions for Topic: "${params.topicName || "General Topic"}" in Exam: "${params.examName || "Standard Exam"}".
Return ONLY valid JSON matching:
{
  "mcqs": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Detailed step-by-step explanation.",
      "difficulty": "medium"
    }
  ]
}`;
    } else {
      prompt = `Generate high-yield study material for Job Type: "${job.job_type}" with parameters: ${JSON.stringify(params)}.
Return a clean, structured JSON payload.`;
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      await supabase
        .from("ai_generation_jobs")
        .update({
          status: "failed",
          error_message: `Gemini API error: ${errText}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      return new Response(
        JSON.stringify({ error: "Gemini API error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const resultJson = JSON.parse(geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

    // Save generated MCQs to database if applicable
    if (job.job_type === "mcq_generation" && Array.isArray(resultJson.mcqs)) {
      for (const item of resultJson.mcqs) {
        await supabase.from("mcqs").insert({
          exam_id: params.examId,
          subject_id: params.subjectId,
          topic_id: params.topicId,
          question: item.question,
          options: item.options,
          correct_index: item.correct_index,
          explanation: item.explanation,
          difficulty: item.difficulty || "medium",
        });
      }
    }

    // Mark job completed
    await supabase
      .from("ai_generation_jobs")
      .update({
        status: "completed",
        result: resultJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    return new Response(
      JSON.stringify({
        status: "success",
        jobId,
        result: resultJson,
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
