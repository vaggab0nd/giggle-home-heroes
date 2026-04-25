
-- Add project posting fields to videos table
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS trade_category text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS postcode text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

-- Allow contractors to read posted projects
CREATE POLICY "videos: contractors can read posted"
  ON public.videos
  FOR SELECT
  TO authenticated
  USING (status = 'posted');

-- Allow owners to update their own videos (e.g. change status to 'posted')
CREATE POLICY "videos: update own"
  ON public.videos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
