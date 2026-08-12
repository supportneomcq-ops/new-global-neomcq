import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminApiSession, logRevenueAuditEvent } from '@/lib/admin-auth';
import { getSupabaseAdmin } from '@/lib/supabase';

const DEFAULTS: Record<string, any> = {
  general: {
    platformName: 'NeoMCQ',
    platformDescription: 'AI-Powered High-Yield MCQ Sprints, Comprehensive Study Guides, and Adaptive Learning System.',
    supportEmail: 'support@neomcq.com',
    defaultLanguage: 'English',
    defaultCountry: 'United States',
    defaultCurrency: 'USD',
    defaultTimezone: 'UTC',
    termsUrl: 'https://neomcq.com/terms',
    privacyUrl: 'https://neomcq.com/privacy',
    supportUrl: 'https://neomcq.com/support',
    registrationEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: 'NeoMCQ is currently undergoing scheduled maintenance. We will be back online shortly!'
  },
  branding: {
    logoUrl: '/assets/logo.png',
    darkLogoUrl: '/assets/logo-dark.png',
    faviconUrl: '/favicon.ico',
    appleTouchIconUrl: '/apple-touch-icon.png',
    pwaIconUrl: '/icon-192.png',
    loginLogoUrl: '/assets/logo-login.png',
    emailLogoUrl: '/assets/logo-email.png',
    ogImageUrl: '/assets/og-image.png',
    platformName: 'NeoMCQ'
  },
  onboarding: {
    emailVerificationRequired: true,
    examSelectionRequired: true,
    subjectSelectionRequired: true,
    topicSelectionRequired: false,
    allowExamChange: true,
    allowSubjectChange: true,
    allowTopicChange: true,
    allowMultipleExams: false,
    onboardingEnabled: true
  },
  learning: {
    dailyStudyGoal: 45,
    studyStreak: 5,
    sessionLength: 15,
    flashcardSettings: { autoSchedule: true, repetitions: 5 },
    revisionSettings: { autoSummarize: true },
    studyPlanSettings: { active: true },
    aiTutorAvailability: 'Always Available',
    learningReminderDefaults: 'Daily Email'
  },
  mcq: {
    defaultMcqCount: 20,
    allowedCounts: [20, 50, 100, 200],
    maxMcqs: 200,
    timerEnabled: true,
    difficultyLevels: ['Easy', 'Medium', 'Hard'],
    explanationDisplay: 'immediate',
    rationaleDisplay: true,
    practiceMode: true,
    examMode: true,
    retryBehavior: 'incorrect_only'
  },
  ai: {
    aiEnabled: true,
    aiTutorEnabled: true,
    mcqGenerationEnabled: true,
    notesGenerationEnabled: true,
    flashcardGenerationEnabled: true,
    revisionGenerationEnabled: true,
    defaultProvider: 'Google Gemini AI',
    defaultModel: 'gemini-3.5-flash',
    fallbackProvider: 'OpenAI',
    fallbackModel: 'gpt-4o-mini',
    maxOutputTokens: 2048,
    timeoutSeconds: 30,
    retryCount: 3,
    costProtectionEnabled: true,
    creditSystemEnabled: true,
    batchGenerationEnabled: true,
    contextCachingEnabled: true,
    modelRoutingEnabled: true
  },
  payments: {
    paymentProvider: 'Razorpay',
    environment: 'TEST',
    currency: 'USD',
    checkoutEnabled: true,
    subscriptionEnabled: true,
    creditPurchaseEnabled: true,
    refundEnabled: true,
    webhookEnabled: true,
    webhookStatus: 'active',
    lastSuccessfulPayment: null,
    lastFailedPayment: null,
    razorpayKeyId: 'rzp_test_mockKeyId123',
    razorpayKeySecret: '',
    webhookSecret: ''
  },
  email: {
    provider: 'Resend',
    configured: true,
    senderName: 'NeoMCQ Platform',
    senderEmail: 'noreply@neomcq.com',
    replyTo: 'support@neomcq.com',
    verificationEmail: true,
    passwordReset: true,
    welcomeEmail: true,
    transactionalEmail: true,
    announcements: true
  },
  notifications: {
    inApp: true,
    email: true,
    push: false,
    studyReminder: true,
    paymentNotification: true,
    securityNotification: true,
    announcement: true,
    marketingNotification: false
  },
  pwa: {
    pwaEnabled: true,
    appName: 'NeoMCQ Entrance Platform',
    shortName: 'NeoMCQ',
    themeColor: '#05070f',
    backgroundColor: '#05070f',
    displayMode: 'standalone',
    startUrl: '/dashboard',
    manifestUrl: '/manifest.json',
    serviceWorkerUrl: '/sw.js',
    icons: ['/icon-192.png', '/icon-512.png'],
    installabilityStatus: 'Active'
  },
  seo: {
    siteTitle: 'NeoMCQ - AI-Powered MCQ Exam Practice Platform',
    metaDescription: 'Boost your exam scores with our adaptive AI question bank, diagnostic notes, flashcard generation and virtual study companions.',
    canonicalUrl: 'https://neomcq.com',
    ogTitle: 'NeoMCQ - Adaptive Learning & MCQ Preparation',
    ogDescription: 'Personalized path to top percentiles in professional entrance examinations.',
    ogImageUrl: '/assets/og-image.png',
    twitterCard: 'summary_large_image',
    robots: 'index, follow',
    sitemap: 'https://neomcq.com/sitemap.xml',
    structuredData: '{}'
  },
  integrations: {
    supabase: { configured: true, environment: 'Production', health: 'Healthy', lastTested: null },
    openai: { configured: true, environment: 'Sandbox', health: 'Healthy', lastTested: null },
    gemini: { configured: true, environment: 'Production', health: 'Healthy', lastTested: null },
    razorpay: { configured: true, environment: 'Test', health: 'Healthy', lastTested: null },
    cloudflareR2: { configured: true, environment: 'Production', health: 'Healthy', lastTested: null, accountId: 'mock-r2-account-id', bucket: 'neomcq-assets', endpoint: '', accessKeyId: 'mock-access-key-id', secretAccessKey: '' },
    email: { configured: true, environment: 'Production', health: 'Healthy', lastTested: null },
    push: { configured: false, environment: 'Development', health: 'Not Tested', lastTested: null },
    analytics: { configured: true, environment: 'Production', health: 'Healthy', lastTested: null }
  },
  features: {
    aiTutor: true,
    newOnboarding: true,
    flashcards: true,
    revisionSheets: true,
    pwa: true,
    newMcqEngine: true,
    newDashboard: true
  },
  advanced: {
    cacheDurationMinutes: 60,
    rateLimitPerMinute: 60,
    aiCostProtectionMaxDailyUsd: 500.00,
    dataRetentionDays: 365,
    loggingLevel: 'info',
    backgroundJobsActive: true,
    maintenanceActive: false,
    apiLimitsPerUserPerDay: 500
  }
};

export async function GET(req: NextRequest, context: { params: any }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const params = await context.params;
    const category = params?.category;

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category parameter is required' }, { status: 400 });
    }

    const adminClient = getSupabaseAdmin();
    const { data, error } = await adminClient
      .from('system_settings')
      .select('*')
      .eq('key', category)
      .maybeSingle();

    if (error) {
      console.error(`Database error loading settings key ${category}:`, error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const settings = data?.value || DEFAULTS[category] || {};

    // Remove any sensitive credentials if sending to browser
    if (category === 'payments' && settings) {
      if (settings.razorpayKeySecret) {
        settings.razorpayKeySecret = '••••••••••••••••';
      }
    }
    if (category === 'integrations' && settings?.cloudflareR2) {
      if (settings.cloudflareR2.secretAccessKey) {
        settings.cloudflareR2.secretAccessKey = '••••••••••••••••';
      }
    }

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    console.error('Admin GET settings error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: any }) {
  try {
    const auth = await verifyAdminApiSession();
    if (!auth.authorized) return auth.response!;

    const params = await context.params;
    const category = params?.category;

    if (!category) {
      return NextResponse.json({ success: false, error: 'Category parameter is required' }, { status: 400 });
    }

    const body = await req.json();

    const adminClient = getSupabaseAdmin();

    // Preserve sensitive credentials from being overwritten by masks
    if (category === 'payments' || category === 'integrations') {
      const { data: current } = await adminClient
        .from('system_settings')
        .select('*')
        .eq('key', category)
        .maybeSingle();
      const currentVal = current?.value || DEFAULTS[category] || {};

      if (category === 'payments') {
        if (body.razorpayKeySecret === '••••••••••••••••') {
          body.razorpayKeySecret = currentVal.razorpayKeySecret || '';
        }
      }
      if (category === 'integrations' && body.cloudflareR2) {
        if (body.cloudflareR2.secretAccessKey === '••••••••••••••••') {
          body.cloudflareR2.secretAccessKey = currentVal.cloudflareR2?.secretAccessKey || '';
        }
      }
    }

    const { error } = await adminClient
      .from('system_settings')
      .upsert(
        {
          key: category,
          value: body,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error(`Database error saving settings key ${category}:`, error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Log to immutable audit log system
    await logRevenueAuditEvent({
      admin_id: auth.user?.id,
      admin_email: auth.user?.email,
      action: `SETTINGS_UPDATE_${category.toUpperCase()}`,
      target: `system_settings:${category}`,
      metadata: body,
    });

    return NextResponse.json({ success: true, settings: body });
  } catch (err: any) {
    console.error('Admin POST settings error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
