const pg = require('pg');

async function run() {
  const rawUrl = process.env.POSTGRES_URL || "postgres://postgres.exzpqrqflfhawgtnzxqx:g5vkvUL3aUJJe8cM@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require";
  const connectionString = rawUrl.split('?')[0];

  console.log("Connecting to Supabase PostgreSQL Database to create system_settings table...");
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected successfully to database!");

    const migrationSql = `
    -- Create system_settings Table if it does not exist
    CREATE TABLE IF NOT EXISTS public.system_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    -- Enable RLS
    ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any
    DROP POLICY IF EXISTS "Public read system_settings" ON public.system_settings;
    CREATE POLICY "Public read system_settings" ON public.system_settings FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Admin write system_settings" ON public.system_settings;
    CREATE POLICY "Admin write system_settings" ON public.system_settings FOR ALL USING (public.is_admin(auth.uid()));
    `;

    console.log("Executing SQL to create system_settings...");
    await client.query(migrationSql);
    console.log("system_settings table created successfully!");

    // Default Seed Data
    const seeds = {
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
        dailyStudyGoal: 45, // in minutes
        studyStreak: 5,
        sessionLength: 15, // default MCQs count per study session
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
        explanationDisplay: 'immediate', // or 'after_quiz'
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
        razorpayKeySecret: '', // NEVER return this or show plaintext
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

    console.log("Seeding system_settings categories...");
    for (const [key, val] of Object.entries(seeds)) {
      await client.query(`
        INSERT INTO public.system_settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO NOTHING;
      `, [key, JSON.stringify(val)]);
    }

    // Also populate a standard 'ai_providers_config' key so the existing GET works immediately!
    const DEFAULT_AI_PROVIDERS = [
      {
        id: 'gemini',
        name: 'Google Gemini AI',
        model: 'gemini-3.5-flash',
        apiKeyMasked: 'AIzaSy... (Environment Configured)',
        status: 'Active',
        priority: 1,
        temperature: 0.2,
        maxTokens: 2048,
      },
      {
        id: 'openai',
        name: 'OpenAI GPT-4o / O3',
        model: 'gpt-4o-mini',
        apiKeyMasked: 'sk-proj... (System Safe)',
        status: 'Standby',
        priority: 2,
        temperature: 0.2,
        maxTokens: 2048,
      },
      {
        id: 'anthropic',
        name: 'Anthropic Claude 3.5 Sonnet',
        model: 'claude-3-5-sonnet-20241022',
        apiKeyMasked: 'sk-ant... (System Safe)',
        status: 'Standby',
        priority: 3,
        temperature: 0.2,
        maxTokens: 2048,
      },
      {
        id: 'groq',
        name: 'Groq Llama 3 Fast Inference',
        model: 'llama-3.3-70b-versatile',
        apiKeyMasked: 'gsk_... (System Safe)',
        status: 'Standby',
        priority: 4,
        temperature: 0.2,
        maxTokens: 2048,
      }
    ];

    await client.query(`
      INSERT INTO public.system_settings (key, value, updated_at)
      VALUES ('ai_providers_config', $1, NOW())
      ON CONFLICT (key) DO NOTHING;
    `, [JSON.stringify(DEFAULT_AI_PROVIDERS)]);

    console.log("Seeding complete!");

  } catch (err) {
    console.error("Migration runtime error:", err.message || err);
  } finally {
    await client.end();
  }
}

run();
