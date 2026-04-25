
-- Fix security definer view by setting security_invoker
ALTER VIEW public.visible_reviews SET (security_invoker = on);
