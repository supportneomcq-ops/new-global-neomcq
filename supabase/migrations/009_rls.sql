-- Migration 009: Row Level Security (RLS) Policies

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timezones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.exam_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exams ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.study_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Internationalization Policies (Public Read, Admin Write)
DROP POLICY IF EXISTS "Public read countries" ON public.countries;
CREATE POLICY "Public read countries" ON public.countries FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read languages" ON public.languages;
CREATE POLICY "Public read languages" ON public.languages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read currencies" ON public.currencies;
CREATE POLICY "Public read currencies" ON public.currencies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read timezones" ON public.timezones;
CREATE POLICY "Public read timezones" ON public.timezones FOR SELECT USING (true);

-- 3. Exam Catalog Policies (Public Read active exams, Admin Write)
DROP POLICY IF EXISTS "Public read active categories" ON public.exam_categories;
CREATE POLICY "Public read active categories" ON public.exam_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read active exams" ON public.exams;
CREATE POLICY "Public read active exams" ON public.exams FOR SELECT USING (status = 'active' OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read subjects" ON public.exam_subjects;
CREATE POLICY "Public read subjects" ON public.exam_subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read topics" ON public.exam_topics;
CREATE POLICY "Public read topics" ON public.exam_topics FOR SELECT USING (true);

-- 4. User Exam Enrollments
DROP POLICY IF EXISTS "Users read own exam enrollments" ON public.user_exams;
CREATE POLICY "Users read own exam enrollments" ON public.user_exams FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own exam enrollments" ON public.user_exams;
CREATE POLICY "Users insert own exam enrollments" ON public.user_exams FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own exam enrollments" ON public.user_exams;
CREATE POLICY "Users update own exam enrollments" ON public.user_exams FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own exam enrollments" ON public.user_exams;
CREATE POLICY "Users delete own exam enrollments" ON public.user_exams FOR DELETE USING (auth.uid() = user_id);

-- 5. User Preferences, Study Plans & Sessions
DROP POLICY IF EXISTS "Users manage own study preferences" ON public.study_preferences;
CREATE POLICY "Users manage own study preferences" ON public.study_preferences FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own study plans" ON public.study_plans;
CREATE POLICY "Users manage own study plans" ON public.study_plans FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own study sessions" ON public.study_sessions;
CREATE POLICY "Users manage own study sessions" ON public.study_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id);

-- 6. Subscription Plans & Subscriptions
DROP POLICY IF EXISTS "Public read subscription plans" ON public.subscription_plans;
CREATE POLICY "Public read subscription plans" ON public.subscription_plans FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users view own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
CREATE POLICY "Users view own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
