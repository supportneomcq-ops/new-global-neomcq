import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY") || "";

  const results: Record<string, any> = {
    gemini: { configured: !!geminiApiKey, reachable: false, status: "Not Configured" },
    openai: { configured: !!openaiApiKey, reachable: false, status: "Not Configured" },
    timestamp: new Date().toISOString()
  };

  // Check Gemini
  if (geminiApiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
      if (res.ok) {
        results.gemini.reachable = true;
        results.gemini.status = "Healthy";
      } else {
        results.gemini.status = `HTTP ${res.status}`;
      }
    } catch (e: any) {
      results.gemini.status = e.message;
    }
  }

  // Check OpenAI
  if (openaiApiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${openaiApiKey}` }
      });
      if (res.ok) {
        results.openai.reachable = true;
        results.openai.status = "Healthy";
      } else {
        results.openai.status = `HTTP ${res.status}`;
      }
    } catch (e: any) {
      results.openai.status = e.message;
    }
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
