-- Pin the search path for normalization helpers so caller-controlled schemas cannot shadow objects.
ALTER FUNCTION public.populate_exam_normalization() SET search_path = public, pg_temp;
ALTER FUNCTION public.populate_subject_normalization() SET search_path = public, pg_temp;
ALTER FUNCTION public.populate_topic_normalization() SET search_path = public, pg_temp;
ALTER FUNCTION public.populate_subtopic_normalization() SET search_path = public, pg_temp;
ALTER FUNCTION public.normalize_canonical_name(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_slug(text) SET search_path = public, pg_temp;
