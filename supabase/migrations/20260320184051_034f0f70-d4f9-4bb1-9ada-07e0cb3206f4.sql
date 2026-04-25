
-- Insert mock review data for all contractors
INSERT INTO public.reviews (contractor_id, reviewer_id, job_id, rating_quality, rating_communication, rating_cleanliness, comment, created_at) VALUES
-- Joe and Sons (8d01d65a) - 4 reviews, avg ~4.3
('8d01d65a-523f-4571-b78e-73d2d490bf80', '77b69364-9c0c-47d2-a446-e9d2ca2920c1', 'mock-job-1', 5, 5, 4, 'Fantastic work on the bathroom refit. Joe''s team arrived on time, communicated every step, and left the place spotless.', now() - interval '12 days'),
('8d01d65a-523f-4571-b78e-73d2d490bf80', 'fc0a9fa2-ce40-4cd3-9eeb-4d25b23989c5', 'mock-job-2', 4, 5, 5, 'Fixed a tricky leak under the kitchen sink. Very professional, explained the issue clearly, and charged exactly what was quoted.', now() - interval '8 days'),
('8d01d65a-523f-4571-b78e-73d2d490bf80', '891a5e00-85ce-408f-89cd-06fa3602906c', 'mock-job-3', 5, 4, 5, 'Replaced all the radiator valves in our 3-bed house. Quick, tidy work.', now() - interval '3 days'),
('8d01d65a-523f-4571-b78e-73d2d490bf80', '77b69364-9c0c-47d2-a446-e9d2ca2920c1', 'mock-job-4', 3, 4, 3, 'Decent job fixing the boiler, but took longer than expected. The repair itself seems solid though.', now() - interval '1 day'),

-- Bob Slob (a7e13b1d) - 2 reviews, avg ~2.2
('a7e13b1d-9e5e-4386-bf1b-218ef532f57d', '77b69364-9c0c-47d2-a446-e9d2ca2920c1', 'mock-job-5', 2, 3, 1, 'Showed up late, left debris everywhere. The actual plumbing work was okay but the cleanup was terrible.', now() - interval '15 days'),
('a7e13b1d-9e5e-4386-bf1b-218ef532f57d', 'fc0a9fa2-ce40-4cd3-9eeb-4d25b23989c5', 'mock-job-6', 3, 2, 2, 'Got the job done but communication was poor. End result was acceptable.', now() - interval '6 days'),

-- joe plumbers (59129856) - 4 reviews, avg ~4.7
('59129856-878c-44f8-a931-98e23d8dcb7e', '77b69364-9c0c-47d2-a446-e9d2ca2920c1', 'mock-job-7', 5, 5, 5, 'Absolute legend. Fixed a burst pipe emergency on a Sunday evening. Fair price, brilliant work!', now() - interval '20 days'),
('59129856-878c-44f8-a931-98e23d8dcb7e', 'fc0a9fa2-ce40-4cd3-9eeb-4d25b23989c5', 'mock-job-8', 4, 4, 5, 'Installed a new shower unit. Professional throughout, very clean worker.', now() - interval '10 days'),
('59129856-878c-44f8-a931-98e23d8dcb7e', '61f62f5b-b669-4de3-b2ce-7becff35d2b5', 'mock-job-9', 5, 5, 4, 'Third time using Joe for plumbing work. Consistently excellent quality and very fair pricing.', now() - interval '2 days'),
('59129856-878c-44f8-a931-98e23d8dcb7e', '77b69364-9c0c-47d2-a446-e9d2ca2920c1', 'mock-job-10', 4, 5, 5, 'Replaced the waste disposal unit. Quick diagnosis, sourced the part same day. Top service.', now() - interval '5 days');
