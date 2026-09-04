/**
 * Robust JSON Extractor & Sanitizer for AI Model Outputs
 * Handles markdown fences, preamble text, trailing commas, and unescaped characters.
 */
export function extractJsonFromAiResponse<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('AI response payload was empty or non-string.');
  }

  // 1. Strip markdown fences if present
  let cleaned = rawText
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/\s*```$/im, '')
    .trim();

  // 2. Try direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // Continue to regex extraction
  }

  // 3. Extract outer JSON object or array using regex match
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch && jsonMatch[0]) {
    const candidate = jsonMatch[0];
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // Try sanitizing trailing commas before closing brackets
      const sanitized = candidate
        .replace(/,\s*([\}\]])/g, '$1')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, (match) => {
          if (match === '\n' || match === '\r' || match === '\t') return match;
          return '';
        });

      try {
        return JSON.parse(sanitized);
      } catch (err: any) {
        throw new Error(`Failed to parse AI JSON output: ${err.message}`);
      }
    }
  }

  throw new Error('Could not extract valid JSON structure from AI response.');
}
