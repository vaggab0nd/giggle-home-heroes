
-- 1. Fix reviews: drop blanket SELECT policy, add owner-scoped one
DROP POLICY IF EXISTS "reviews: select authenticated" ON public.reviews;

CREATE POLICY "reviews: select own"
  ON public.reviews FOR SELECT TO authenticated
  USING (auth.uid() = reviewer_id);

-- 2. Add RLS policies to usage_log
CREATE POLICY "usage_log: select own"
  ON public.usage_log FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "usage_log: insert own"
  ON public.usage_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Fix set_updated_at function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;
