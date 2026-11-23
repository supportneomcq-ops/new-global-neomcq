import { describe, expect, test } from 'bun:test';
import { buildProfileInitialization, type ExistingOnboardingProfile } from '../profile-initialization';

const existingProfile: ExistingOnboardingProfile = {
  id: 'user-1',
  first_name: 'Existing',
  last_name: 'Learner',
  phone: '+911234567890',
  country_id: 'country-1',
  language_id: 'language-1',
  timezone: 'Asia/Kolkata',
  current_exam_id: 'exam-1',
  exam_locked: true,
  exam_selected_at: '2026-01-01T00:00:00.000Z',
  exam_switch_count: 2,
};

describe('buildProfileInitialization', () => {
  test('initializes a new learner profile without inventing exam readiness', () => {
    const profile = buildProfileInitialization(null, {
      userId: 'user-2',
      email: 'NEW@EXAMPLE.COM',
      firstName: 'New',
      lastName: 'Learner',
      countryId: 'country-2',
      languageId: null,
      timezone: 'UTC',
      examId: 'exam-2',
      curriculumReady: false,
      now: '2026-11-23T00:00:00.000Z',
    });

    expect(profile.email).toBe('new@example.com');
    expect(profile.current_exam_id).toBe('exam-2');
    expect(profile.exam_locked).toBe(false);
    expect(profile.exam_switch_count).toBe(0);
    expect(profile.exam_selected_at).toBe('2026-11-23T00:00:00.000Z');
  });

  test('preserves existing profile details, exam lock, and switch count on retry', () => {
    const profile = buildProfileInitialization(existingProfile, {
      userId: 'user-1',
      email: 'existing@example.com',
      firstName: 'Changed',
      lastName: 'Name',
      phone: '+440000000000',
      countryId: 'country-2',
      languageId: 'language-2',
      timezone: 'Europe/London',
      examId: 'exam-1',
      curriculumReady: false,
      now: '2026-11-23T00:00:00.000Z',
    });

    expect(profile.first_name).toBe('Existing');
    expect(profile.last_name).toBe('Learner');
    expect(profile.phone).toBe('+911234567890');
    expect(profile.country_id).toBe('country-1');
    expect(profile.language_id).toBe('language-1');
    expect(profile.timezone).toBe('Asia/Kolkata');
    expect(profile.exam_locked).toBe(true);
    expect(profile.exam_switch_count).toBe(2);
    expect(profile.exam_selected_at).toBe('2026-01-01T00:00:00.000Z');
  });

  test('replaces a generic login placeholder with the submitted first name', () => {
    const profile = buildProfileInitialization(
      { ...existingProfile, first_name: 'User' },
      {
        userId: 'user-1',
        email: 'existing@example.com',
        firstName: 'Swapnil',
        countryId: null,
        languageId: null,
        timezone: 'UTC',
        examId: 'exam-1',
        curriculumReady: false,
      },
    );

    expect(profile.first_name).toBe('Swapnil');
  });

  test('does not clear a previously selected exam when a retry has no canonical ID yet', () => {
    const profile = buildProfileInitialization(existingProfile, {
      userId: 'user-1',
      email: 'existing@example.com',
      firstName: 'Existing',
      countryId: null,
      languageId: null,
      timezone: 'UTC',
      examId: null,
      curriculumReady: false,
    });

    expect(profile.current_exam_id).toBe('exam-1');
    expect(profile.exam_locked).toBe(true);
    expect(profile.exam_switch_count).toBe(2);
  });
});
