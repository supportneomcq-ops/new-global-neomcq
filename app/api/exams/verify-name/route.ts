import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { normalizeInput, calculateLevenshteinSimilarity } from '@/lib/knowledge/normalizer';
import { classifyUserInput } from '@/lib/knowledge/classifier';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { examQuery, country, category } = body || {};

    if (!examQuery || typeof examQuery !== 'string' || !examQuery.trim() || examQuery.trim().length > 160) {
      return NextResponse.json(
        { success: false, error: 'Enter an exam name between 1 and 160 characters.' },
        { status: 400 }
      );
    }

    const rawInput = examQuery.trim();

    // 1. Check if input is purely a country name
    const classification = classifyUserInput(rawInput);
    if (classification.type === 'COUNTRY') {
      return NextResponse.json({
        success: false,
        status: 'INVALID_INPUT',
        error: `"${rawInput}" is a country name, not an examination. Please enter or select a recognized exam name (e.g. USMLE, FMGE, NEET PG, CFA, NCLEX, AWS).`,
      });
    }

    const norm = normalizeInput(rawInput);
    const cleanQuery = norm.canonical.toLowerCase();
    const querySlug = norm.slug.toLowerCase();

    const supabase = getSupabaseAdmin();

    // 2. Fetch all active exams and aliases from DB to check for existing match
    const { data: examRows, error: examLookupError } = await (supabase as any)
      .from('exams')
      .select(`
        id,
        name,
        slug,
        short_name,
        description,
        difficulty,
        question_count,
        time_limit_mins,
        countries (name, iso2, flag_emoji),
        exam_categories (name, slug)
      `)
      .neq('status', 'archived');

    if (examLookupError) {
      console.error('[Verify Name] Canonical exam lookup failed:', examLookupError.message);
      return NextResponse.json(
        { success: false, error: 'We could not check the existing exam list. Please retry in a moment.' },
        { status: 503 }
      );
    }
    const dbExams: any[] = examRows || [];

    const { data: aliasRows, error: aliasLookupError } = await (supabase as any)
      .from('exam_aliases')
      .select('exam_id, alias');

    if (aliasLookupError) {
      console.error('[Verify Name] Alias lookup failed:', aliasLookupError.message);
      return NextResponse.json(
        { success: false, error: 'We could not verify exam aliases. Please retry in a moment.' },
        { status: 503 }
      );
    }
    const dbAliases: any[] = aliasRows || [];

    // Build alias map
    const aliasMap = new Map<string, string[]>();
    for (const a of dbAliases) {
      if (!aliasMap.has(a.exam_id)) aliasMap.set(a.exam_id, []);
      aliasMap.get(a.exam_id)!.push(a.alias.toLowerCase());
    }

    // Match strategy A: Exact match on name, short_name, or slug
    let exactMatch = dbExams.find((e: any) => {
      const eName = (e.name || '').toLowerCase().trim();
      const eShort = (e.short_name || '').toLowerCase().trim();
      return (
        eName === cleanQuery ||
        eName === rawInput.toLowerCase() ||
        eShort === cleanQuery ||
        eShort === rawInput.toLowerCase() ||
        e.slug === querySlug
      );
    });

    if (exactMatch) {
      return NextResponse.json({
        success: true,
        status: 'EXACT_MATCH',
        query: rawInput,
        matchedExam: {
          id: exactMatch.id,
          name: exactMatch.name,
          shortName: exactMatch.short_name || exactMatch.name,
          country: exactMatch.countries?.name || 'Global',
          flag: exactMatch.countries?.flag_emoji || '🌐',
          category: exactMatch.exam_categories?.name || 'Professional Licensing',
        },
        proposedName: exactMatch.name,
        message: `Found exact canonical exam match: ${exactMatch.name}`,
      });
    }

    // Match strategy B: Exact match in aliases
    let aliasMatch = dbExams.find((e: any) => {
      const aliases = aliasMap.get(e.id) || [];
      return aliases.includes(cleanQuery) || aliases.includes(rawInput.toLowerCase());
    });

    if (aliasMatch) {
      return NextResponse.json({
        success: true,
        status: 'EXACT_MATCH',
        query: rawInput,
        matchedExam: {
          id: aliasMatch.id,
          name: aliasMatch.name,
          shortName: aliasMatch.short_name || aliasMatch.name,
          country: aliasMatch.countries?.name || 'Global',
          flag: aliasMatch.countries?.flag_emoji || '🌐',
          category: aliasMatch.exam_categories?.name || 'Professional Licensing',
        },
        proposedName: aliasMatch.name,
        message: `Matched canonical exam via alias: ${aliasMatch.name}`,
      });
    }

    // Match strategy C: Fuzzy / Partial match on DB exams (e.g. User types "USMLE", DB has "USMLE Step 1")
    let bestFuzzyMatch: any = null;
    let highestScore = 0;

    const rawNoPunct = rawInput.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

    for (const e of dbExams) {
      const eName = (e.name || '').toLowerCase();
      const eShort = (e.short_name || '').toLowerCase();
      const eNameNoPunct = eName.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
      const eShortNoPunct = eShort.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

      let score = 0;

      // Prefix or substring match
      if (eName.startsWith(cleanQuery) || eShort.startsWith(cleanQuery)) {
        score = 85;
      } else if (cleanQuery.startsWith(eName) || cleanQuery.startsWith(eShort)) {
        score = 80;
      } else if (eName.includes(cleanQuery) || eShort.includes(cleanQuery) || cleanQuery.includes(eShort)) {
        score = 75;
      } else if (eNameNoPunct.includes(rawNoPunct) || rawNoPunct.includes(eNameNoPunct)) {
        score = 70;
      }

      // Check Levenshtein similarity
      const levName = calculateLevenshteinSimilarity(e.name, rawInput);
      const levShort = e.short_name ? calculateLevenshteinSimilarity(e.short_name, rawInput) : 0;
      const maxLev = Math.max(levName, levShort);

      if (maxLev > 70 && maxLev > score) {
        score = maxLev;
      }

      if (score > highestScore && score >= 65) {
        highestScore = score;
        bestFuzzyMatch = e;
      }
    }

    // If a high-confidence fuzzy match is found in DB, return FUZZY_MATCH_PROPOSAL
    if (bestFuzzyMatch) {
      return NextResponse.json({
        success: true,
        status: 'FUZZY_MATCH_PROPOSAL',
        query: rawInput,
        matchedExam: {
          id: bestFuzzyMatch.id,
          name: bestFuzzyMatch.name,
          shortName: bestFuzzyMatch.short_name || bestFuzzyMatch.name,
          country: bestFuzzyMatch.countries?.name || 'Global',
          flag: bestFuzzyMatch.countries?.flag_emoji || '🌐',
          category: bestFuzzyMatch.exam_categories?.name || 'Professional Licensing',
        },
        proposedName: bestFuzzyMatch.name,
        confidence: highestScore,
        message: `Did you mean ${bestFuzzyMatch.name}?`,
      });
    }

    // 3. If NO DB match found, construct normalized canonical name proposal for a NEW EXAM
    // Format title case (e.g. "fmge screening exam" -> "FMGE Screening Exam")
    let normalizedProposedName = norm.canonical;
    if (rawInput.toUpperCase() === rawInput) {
      normalizedProposedName = rawInput;
    } else {
      // Capitalize standard acronyms if known
      normalizedProposedName = rawInput
        .split(' ')
        .map((word) => {
          const wLower = word.toLowerCase();
          if (['usmle', 'fmge', 'neet', 'upsc', 'cfa', 'nclex', 'plab', 'amc', 'mccqe', 'aws', 'mrcp', 'mrcog', 'dnb'].includes(wLower)) {
            return wLower.toUpperCase();
          }
          if (['part', 'step', 'level'].includes(wLower)) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          }
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
    }

    return NextResponse.json({
      success: true,
      status: 'NEW_EXAM_CONFIRMATION',
      query: rawInput,
      proposedName: normalizedProposedName,
      message: `No existing exam matched. Confirm normalized name '${normalizedProposedName}' before initialization.`,
    });
  } catch (error: any) {
    console.error('Verify Name Error:', error);
    return NextResponse.json(
      { success: false, error: 'We could not verify this exam name right now. Please retry in a moment.' },
      { status: 500 }
    );
  }
}
