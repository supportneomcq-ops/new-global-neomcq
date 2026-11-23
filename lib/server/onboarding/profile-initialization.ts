export type ExistingOnboardingProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  country_id: string | null;
  language_id: string | null;
  timezone: string | null;
  current_exam_id: string | null;
  exam_locked: boolean | null;
  exam_selected_at: string | null;
  exam_switch_count: number | null;
};

export type ProfileInitializationInput = {
  userId: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  countryId: string | null;
  languageId: string | null;
  timezone: string;
  examId: string | null;
  curriculumReady: boolean;
  now?: string;
};

/**
 * Builds an idempotent initial profile payload without resetting data that
 * already belongs to an existing learner.
 */
export function buildProfileInitialization(
  existing: ExistingOnboardingProfile | null,
  input: ProfileInitializationInput,
) {
  const now = input.now || new Date().toISOString();
  const sameExam = Boolean(existing?.current_exam_id && existing.current_exam_id === input.examId);
  const existingFirstName = existing?.first_name?.trim() || '';

  return {
    id: input.userId,
    auth_user_id: input.userId,
    email: input.email.toLowerCase(),
    first_name: existingFirstName && existingFirstName.toLowerCase() !== 'user'
      ? existingFirstName
      : input.firstName.trim(),
    last_name: existing?.last_name || input.lastName?.trim() || '',
    phone: existing?.phone || input.phone || null,
    country_id: existing?.country_id || input.countryId,
    language_id: existing?.language_id || input.languageId,
    timezone: existing?.timezone || input.timezone,
    current_exam_id: input.examId || existing?.current_exam_id || null,
    exam_locked: Boolean(existing?.exam_locked || (input.examId && input.curriculumReady)),
    exam_selected_at: input.examId
      ? (sameExam ? existing?.exam_selected_at : now)
      : existing?.exam_selected_at || null,
    exam_switch_count: existing?.exam_switch_count ?? 0,
    updated_at: now,
  };
}
