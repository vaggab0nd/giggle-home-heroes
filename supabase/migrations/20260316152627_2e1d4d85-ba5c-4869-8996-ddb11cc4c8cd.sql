
CREATE TABLE public.contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  postcode text NOT NULL,
  phone text NOT NULL,
  expertise text[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contractors: insert own" ON public.contractors
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "contractors: select own" ON public.contractors
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "contractors: update own" ON public.contractors
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "contractors: public insert" ON public.contractors
  FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);
