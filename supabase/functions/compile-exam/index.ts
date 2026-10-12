import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface RequestBody {
  examName: string;
  userId?: string;
  forceRegenerate?: boolean;
}

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Exam service is temporarily unavailable." }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: RequestBody = await req.json();
    const { examName, userId: requestedUserId, forceRegenerate = false } = body;

    if (!examName || typeof examName !== "string" || !examName.trim() || examName.trim().length > 160) {
      return new Response(
        JSON.stringify({ error: "Enter an exam name between 1 and 160 characters." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Existing canonical exams may be looked up publicly, but enrollment and AI creation
    // must be tied to the verified caller rather than a client-supplied user ID.
    const authorization = req.headers.get("Authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    let authenticatedUserId: string | null = null;
    if (tokenMatch && tokenMatch[1] !== supabaseAnonKey) {
      const caller = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: { user }, error: authError } = await caller.auth.getUser(tokenMatch[1]);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      authenticatedUserId = user.id;
    }

    if (requestedUserId && (!authenticatedUserId || requestedUserId !== authenticatedUserId)) {
      return new Response(JSON.stringify({ error: "The requested user does not match the signed-in account." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (forceRegenerate) {
      if (!authenticatedUserId) {
        return new Response(JSON.stringify({ error: "Authentication required to regenerate curriculum." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", { p_user_id: authenticatedUserId });
      if (adminError || !isAdmin) {
        return new Response(JSON.stringify({ error: "Only an administrator can force-regenerate a canonical exam." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    const cleanQuery = examName.trim().toLowerCase();
    const cleanSlug = cleanQuery.replace(/[^a-z0-9]+/g, "-");

    // Step 1: Check existing canonical exam by slug or exact name
    if (!forceRegenerate) {
      const { data: existingExam } = await supabase
        .from("exams")
        .select(`
          id,
          name,
          slug,
          description,
          exam_subjects (
            id,
            name,
            slug,
            weight_percentage,
            exam_topics (
              id,
              name,
              slug,
              estimated_study_mins
            )
          )
        `)
        .or(`slug.eq.${cleanSlug},name.ilike.${cleanQuery}`)
        .maybeSingle();

      if (existingExam) {
        // Automatically enroll user if userId is provided
        if (authenticatedUserId) {
          await supabase
            .from("user_exams")
            .upsert({ user_id: authenticatedUserId, exam_id: existingExam.id, status: "in_progress" }, { onConflict: "user_id,exam_id" });
        }

        return new Response(
          JSON.stringify({
            status: "EXISTS",
            message: "Reused existing canonical exam taxonomy",
            exam: existingExam,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Step 2: Check exam_aliases
      const { data: aliasMatch } = await supabase
        .from("exam_aliases")
        .select("exam_id, exams (*)")
        .ilike("alias", cleanQuery)
        .maybeSingle();

      if (aliasMatch && aliasMatch.exams) {
        if (authenticatedUserId) {
          await supabase
            .from("user_exams")
            .upsert({ user_id: authenticatedUserId, exam_id: aliasMatch.exam_id, status: "in_progress" }, { onConflict: "user_id,exam_id" });
        }

        return new Response(
          JSON.stringify({
            status: "EXISTS",
            message: "Resolved exam via alias dictionary",
            exam: aliasMatch.exams,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 3: Only a verified user may trigger paid AI curriculum generation.
    if (!authenticatedUserId) {
      return new Response(JSON.stringify({ error: "Sign in before generating a new exam curriculum." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Step 3: Asynchronously compile exam via Gemini API
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY is not configured on Supabase" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `You are a world-class educational syllabus compiler. Generate a comprehensive, professional syllabus structure for the exam: "${examName}".
Return ONLY a valid JSON object matching this schema:
{
  "name": "Canonical Exam Title",
  "category": "Medical | Engineering | Finance | Civil Services | General",
  "description": "Brief description of the exam",
  "subjects": [
    {
      "name": "Subject Name",
      "weight_percentage": 20,
      "topics": [
        {
          "name": "Topic Title",
          "estimated_study_mins": 45,
          "subtopics": ["Subtopic 1", "Subtopic 2"]
        }
      ]
    }
  ]
}`;

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
      return new Response(
        JSON.stringify({ error: "Gemini API compilation error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiRes.json();
    const rawJsonText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    const compiledData = JSON.parse(rawJsonText);

    // Step 4: Persist newly compiled exam canonical structures safely
    const examSlug = compiledData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const { data: insertedExam, error: examErr } = await supabase
      .from("exams")
      .insert({
        name: compiledData.name,
        slug: examSlug,
        description: compiledData.description,
        code: examSlug.toUpperCase().slice(0, 10),
      })
      .select()
      .single();

    if (examErr) {
      throw examErr;
    }

    // Insert alias for original query string
    await supabase
      .from("exam_aliases")
      .insert({ exam_id: insertedExam.id, alias: examName.toLowerCase() })
      .maybeSingle();

    // Insert subjects and topics
    if (Array.isArray(compiledData.subjects)) {
      for (const sub of compiledData.subjects) {
        const subSlug = `${examSlug}-${sub.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        const { data: insertedSub } = await supabase
          .from("exam_subjects")
          .insert({
            exam_id: insertedExam.id,
            name: sub.name,
            slug: subSlug,
            weight_percentage: sub.weight_percentage || 10,
          })
          .select()
          .single();

        if (insertedSub && Array.isArray(sub.topics)) {
          for (const top of sub.topics) {
            const topSlug = `${subSlug}-${top.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            await supabase.from("exam_topics").insert({
              subject_id: insertedSub.id,
              name: top.name,
              slug: topSlug,
              estimated_study_mins: top.estimated_study_mins || 30,
            });
          }
        }
      }
    }

    if (authenticatedUserId) {
      await supabase
        .from("user_exams")
        .upsert({ user_id: authenticatedUserId, exam_id: insertedExam.id, status: "in_progress" }, { onConflict: "user_id,exam_id" });
    }

    return new Response(
      JSON.stringify({
        status: "COMPILED",
        message: "Successfully compiled and saved new exam taxonomy",
        exam: insertedExam,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
