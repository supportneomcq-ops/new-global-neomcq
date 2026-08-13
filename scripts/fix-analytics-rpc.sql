-- Migration 015 Update: get_admin_analytics_summary RPC fix
CREATE OR REPLACE FUNCTION public.get_admin_analytics_summary()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_users INT;
    v_active_users INT;
    v_signups_today INT;
    v_mcq_attempts INT;
    v_ai_requests INT;
    v_ai_cost NUMERIC;
    v_total_revenue NUMERIC;
    v_total_subscriptions INT;
    v_active_subscriptions INT;
    v_failed_jobs INT;
BEGIN
    SELECT count(*) INTO v_total_users FROM public.profiles;
    
    SELECT count(DISTINCT user_id) INTO v_active_users 
    FROM public.study_sessions 
    WHERE completed_at >= (now() - interval '30 days');

    SELECT count(*) INTO v_signups_today 
    FROM public.profiles 
    WHERE created_at >= date_trunc('day', now());

    SELECT count(*) INTO v_mcq_attempts FROM public.study_sessions;
    SELECT count(*) INTO v_ai_requests FROM public.ai_jobs;
    
    SELECT COALESCE(sum(actual_provider_cost), 0) INTO v_ai_cost FROM public.ai_cost_events;
    SELECT COALESCE(sum(amount), 0) INTO v_total_revenue FROM public.payments WHERE status = 'completed';
    
    SELECT count(*) INTO v_total_subscriptions FROM public.subscriptions;
    SELECT count(*) INTO v_active_subscriptions FROM public.subscriptions WHERE status = 'active';
    SELECT count(*) INTO v_failed_jobs FROM public.ai_jobs WHERE status = 'failed';

    RETURN jsonb_build_object(
        'total_users', COALESCE(v_total_users, 0),
        'active_users_30d', COALESCE(v_active_users, 0),
        'signups_today', COALESCE(v_signups_today, 0),
        'mcq_attempts', COALESCE(v_mcq_attempts, 0),
        'ai_requests', COALESCE(v_ai_requests, 0),
        'ai_cost_usd', COALESCE(v_ai_cost, 0),
        'total_revenue', COALESCE(v_total_revenue, 0),
        'total_subscriptions', COALESCE(v_total_subscriptions, 0),
        'active_subscriptions', COALESCE(v_active_subscriptions, 0),
        'failed_ai_jobs', COALESCE(v_failed_jobs, 0)
    );
END;
$$;
