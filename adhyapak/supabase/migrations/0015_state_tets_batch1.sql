-- ---------------------------------------------------------------------------
-- 0015 — the CTET-pattern state TETs, batch 1 of 2
--
-- Seven state eligibility tests that follow the NCTE template CTET set: two
-- papers of 150 questions, Paper 1 for classes 1 to 5 with five fixed blocks of
-- thirty, Paper 2 for classes 6 to 8 with three fixed blocks and a 60-mark
-- subject the candidate chooses.
--
--   HP TET, PSTET, UTET, JTET, OTET, Sikkim TET, Gujarat TET
--
-- Batch 2 brings the six southern and western tests, which need five more
-- language subjects. This batch needs three: Odia, Nepali and Gujarati.
--
-- WHAT IS NOT HERE, on purpose: `updates` and `sources` are empty for every one
-- of these. The paper pattern is published and stable and can be stated; a
-- cycle's notification dates cannot, and `sources` is rendered to the learner
-- as where each claim was checked. An invented citation would be worse than an
-- honest gap, so the gap is left visible.
--
-- Also not verified: each state's own deviations from the template. Gujarat in
-- particular runs TET-1 and TET-2 under its own rules, and several states offer
-- regional languages as Language II that are not modelled here. Both are
-- corrected by importing a real paper, which is when they become visible.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

-- ------------------------------------------------------- Language I subjects
--
-- Topics are deliberately absent. A language paper differs enough between
-- states that one shared topic tree would be a guess; topics arrive with the
-- first real paper imported for that state.

insert into subjects (id, name, icon, color, description, sort_order) values
  ('odia', '{"en":"Odia","hi":"ଓଡ଼ିଆ"}'::jsonb, '📗', '#0F766E', '{"en":"Odia as Language I in the state TETs that examine it. Grammar, comprehension and language pedagogy.","hi":"ଓଡ଼ିଆ — उन राज्य TET में भाषा I जो इसे लेते हैं। व्याकरण, बोधगम्यता एवं भाषा शिक्षाशास्त्र।"}'::jsonb, 6),
  ('nepali', '{"en":"Nepali","hi":"नेपाली"}'::jsonb, '📙', '#B91C1C', '{"en":"Nepali as Language I in the state TETs that examine it. Grammar, comprehension and language pedagogy.","hi":"नेपाली — उन राज्य TET में भाषा I जो इसे लेते हैं। व्याकरण, बोधगम्यता एवं भाषा शिक्षाशास्त्र।"}'::jsonb, 6),
  ('gujarati', '{"en":"Gujarati","hi":"ગુજરાતી"}'::jsonb, '📕', '#C2410C', '{"en":"Gujarati as Language I in the state TETs that examine it. Grammar, comprehension and language pedagogy.","hi":"ગુજરાતી — उन राज्य TET में भाषा I जो इसे लेते हैं। व्याकरण, बोधगम्यता एवं भाषा शिक्षाशास्त्र।"}'::jsonb, 6)
on conflict (id) do nothing;

-- ------------------------------------------------------------------- exams

insert into exams (id, slug, name, short_name, authority, scope, state, about, frequency, color, emoji, next_exam_date, eligibility, highlights, official_site, vacancies) values
  ('hptet', 'hptet', '{"en":"HP TET — Himachal Pradesh Teacher Eligibility Test","hi":"HP TET — हिमाचल प्रदेश शिक्षक पात्रता परीक्षा"}'::jsonb, 'HP TET', '{"en":"Himachal Pradesh Board of School Education (HPBOSE), Dharamshala","hi":"हिमाचल प्रदेश स्कूल शिक्षा बोर्ड (HPBOSE), धर्मशाला"}'::jsonb, 'state', '{"en":"Himachal Pradesh","hi":"हिमाचल प्रदेश"}'::jsonb, '{"en":"Required for teaching posts in Himachal Pradesh government and aided schools. Conducted by HPBOSE, usually alongside the TET for non-medical and medical subjects.","hi":"हिमाचल प्रदेश के सरकारी एवं सहायता प्राप्त विद्यालयों में शिक्षक पदों हेतु आवश्यक। HPBOSE द्वारा आयोजित।"}'::jsonb, '{"en":"Usually twice a year","hi":"प्रायः वर्ष में दो बार"}'::jsonb, '#0369A1', '🏔️', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Hindi, Language II is English","hi":"भाषा I हिंदी, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://hpbose.org', null),
  ('pstet', 'pstet', '{"en":"PSTET — Punjab State Teacher Eligibility Test","hi":"PSTET — पंजाब राज्य शिक्षक पात्रता परीक्षा"}'::jsonb, 'PSTET', '{"en":"Punjab School Education Board (PSEB), Mohali","hi":"पंजाब स्कूल शिक्षा बोर्ड (PSEB), मोहाली"}'::jsonb, 'state', '{"en":"Punjab","hi":"पंजाब"}'::jsonb, '{"en":"Mandatory for teaching posts in Punjab government schools. Language I is Punjabi, which is also the medium for a large share of the paper.","hi":"पंजाब के सरकारी विद्यालयों में शिक्षक पदों हेतु अनिवार्य। भाषा I पंजाबी है।"}'::jsonb, '{"en":"Announced by PSEB — typically annual","hi":"PSEB द्वारा घोषित — प्रायः वार्षिक"}'::jsonb, '#CA8A04', '🌾', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Punjabi, Language II is English","hi":"भाषा I पंजाबी, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://pseb.ac.in', null),
  ('utet', 'utet', '{"en":"UTET — Uttarakhand Teacher Eligibility Test","hi":"UTET — उत्तराखंड शिक्षक पात्रता परीक्षा"}'::jsonb, 'UTET', '{"en":"Uttarakhand Board of School Education (UBSE), Ramnagar","hi":"उत्तराखंड विद्यालयी शिक्षा परिषद (UBSE), रामनगर"}'::jsonb, 'state', '{"en":"Uttarakhand","hi":"उत्तराखंड"}'::jsonb, '{"en":"Required for primary and upper-primary teaching posts in Uttarakhand. Certificate validity follows the NCTE norm.","hi":"उत्तराखंड में प्राथमिक एवं उच्च प्राथमिक शिक्षक पदों हेतु आवश्यक।"}'::jsonb, '{"en":"Announced by UBSE — typically annual","hi":"UBSE द्वारा घोषित — प्रायः वार्षिक"}'::jsonb, '#15803D', '⛰️', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Hindi, Language II is English","hi":"भाषा I हिंदी, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://ukutet.com', null),
  ('jtet', 'jtet', '{"en":"JTET — Jharkhand Teacher Eligibility Test","hi":"JTET — झारखंड शिक्षक पात्रता परीक्षा"}'::jsonb, 'JTET', '{"en":"Jharkhand Academic Council (JAC), Ranchi","hi":"झारखंड अधिविद्य परिषद (JAC), राँची"}'::jsonb, 'state', '{"en":"Jharkhand","hi":"झारखंड"}'::jsonb, '{"en":"Required for teaching posts in Jharkhand government schools. The state offers several regional and tribal languages as Language II.","hi":"झारखंड के सरकारी विद्यालयों में शिक्षक पदों हेतु आवश्यक। भाषा II में कई क्षेत्रीय एवं जनजातीय भाषाएँ उपलब्ध हैं।"}'::jsonb, '{"en":"Announced by JAC — irregular","hi":"JAC द्वारा घोषित — अनियमित"}'::jsonb, '#7C2D12', '🌳', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Hindi, Language II is English","hi":"भाषा I हिंदी, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://jac.jharkhand.gov.in', null),
  ('otet', 'otet', '{"en":"OTET — Odisha Teacher Eligibility Test","hi":"OTET — ओडिशा शिक्षक पात्रता परीक्षा"}'::jsonb, 'OTET', '{"en":"Board of Secondary Education, Odisha (BSE Odisha), Cuttack","hi":"माध्यमिक शिक्षा बोर्ड, ओडिशा (BSE Odisha), कटक"}'::jsonb, 'state', '{"en":"Odisha","hi":"ओडिशा"}'::jsonb, '{"en":"Required for teaching posts in Odisha government and aided schools. Language I is Odia.","hi":"ओडिशा के सरकारी एवं सहायता प्राप्त विद्यालयों में शिक्षक पदों हेतु आवश्यक। भाषा I ओड़िया है।"}'::jsonb, '{"en":"Announced by BSE Odisha — typically annual","hi":"BSE ओडिशा द्वारा घोषित — प्रायः वार्षिक"}'::jsonb, '#0891B2', '🛕', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Odia, Language II is English","hi":"भाषा I ओड़िया, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://bseodisha.ac.in', null),
  ('sktet', 'sktet', '{"en":"Sikkim TET — Sikkim Teacher Eligibility Test","hi":"सिक्किम TET — सिक्किम शिक्षक पात्रता परीक्षा"}'::jsonb, 'Sikkim TET', '{"en":"Human Resource Development Department (HRDD), Government of Sikkim","hi":"मानव संसाधन विकास विभाग (HRDD), सिक्किम सरकार"}'::jsonb, 'state', '{"en":"Sikkim","hi":"सिक्किम"}'::jsonb, '{"en":"Required for teaching posts in Sikkim government schools. Language I is Nepali; the state also offers Bhutia, Lepcha and Limboo.","hi":"सिक्किम के सरकारी विद्यालयों में शिक्षक पदों हेतु आवश्यक। भाषा I नेपाली; भूटिया, लेप्चा एवं लिम्बू भी उपलब्ध।"}'::jsonb, '{"en":"Announced by HRDD Sikkim — irregular","hi":"HRDD सिक्किम द्वारा घोषित — अनियमित"}'::jsonb, '#DB2777', '🏞️', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Nepali, Language II is English","hi":"भाषा I नेपाली, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://sikkimhrdd.org', null),
  ('gtet', 'gtet', '{"en":"Gujarat TET — Gujarat Teacher Eligibility Test","hi":"गुजरात TET — गुजरात शिक्षक पात्रता परीक्षा"}'::jsonb, 'Gujarat TET', '{"en":"Gujarat State Examination Board (GSEB), Gandhinagar","hi":"गुजरात राज्य परीक्षा बोर्ड (GSEB), गांधीनगर"}'::jsonb, 'state', '{"en":"Gujarat","hi":"गुजरात"}'::jsonb, '{"en":"Required for teaching posts in Gujarat government and grant-in-aid schools. TET-1 covers classes 1 to 5 and TET-2 covers classes 6 to 8.","hi":"गुजरात के सरकारी एवं अनुदानित विद्यालयों में शिक्षक पदों हेतु आवश्यक। TET-1 कक्षा 1-5, TET-2 कक्षा 6-8।"}'::jsonb, '{"en":"Announced by GSEB — irregular","hi":"GSEB द्वारा घोषित — अनियमित"}'::jsonb, '#EA580C', '🦁', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Gujarati, Language II is English","hi":"भाषा I गुजराती, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://sebexam.org', null)
on conflict (id) do nothing;

-- ------------------------------------------------------------------ papers

insert into exam_papers (id, exam_id, name, level, post, marks_per_question, negative_marking, duration_minutes, total_questions, cutoff_general, cutoff_reserved, sort_order) values
  ('hptet-p1', 'hptet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('hptet-p2', 'hptet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('pstet-p1', 'pstet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('pstet-p2', 'pstet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('utet-p1', 'utet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('utet-p2', 'utet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('jtet-p1', 'jtet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('jtet-p2', 'jtet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('otet-p1', 'otet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('otet-p2', 'otet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('sktet-p1', 'sktet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('sktet-p2', 'sktet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('gtet-p1', 'gtet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('gtet-p2', 'gtet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- sections

insert into paper_sections (paper_id, subject_id, elective_group_id, questions, marks, sort_order) values
  ('hptet-p1', 'cdp', null, 30, 30, 0),
  ('hptet-p1', 'hindi', null, 30, 30, 1),
  ('hptet-p1', 'english', null, 30, 30, 2),
  ('hptet-p1', 'math', null, 30, 30, 3),
  ('hptet-p1', 'evs', null, 30, 30, 4),
  ('hptet-p2', 'cdp', null, 30, 30, 0),
  ('hptet-p2', 'hindi', null, 30, 30, 1),
  ('hptet-p2', 'english', null, 30, 30, 2),
  ('hptet-p2', null, 'hptet-p2-elective', 60, 60, 3),
  ('pstet-p1', 'cdp', null, 30, 30, 0),
  ('pstet-p1', 'punjabi', null, 30, 30, 1),
  ('pstet-p1', 'english', null, 30, 30, 2),
  ('pstet-p1', 'math', null, 30, 30, 3),
  ('pstet-p1', 'evs', null, 30, 30, 4),
  ('pstet-p2', 'cdp', null, 30, 30, 0),
  ('pstet-p2', 'punjabi', null, 30, 30, 1),
  ('pstet-p2', 'english', null, 30, 30, 2),
  ('pstet-p2', null, 'pstet-p2-elective', 60, 60, 3),
  ('utet-p1', 'cdp', null, 30, 30, 0),
  ('utet-p1', 'hindi', null, 30, 30, 1),
  ('utet-p1', 'english', null, 30, 30, 2),
  ('utet-p1', 'math', null, 30, 30, 3),
  ('utet-p1', 'evs', null, 30, 30, 4),
  ('utet-p2', 'cdp', null, 30, 30, 0),
  ('utet-p2', 'hindi', null, 30, 30, 1),
  ('utet-p2', 'english', null, 30, 30, 2),
  ('utet-p2', null, 'utet-p2-elective', 60, 60, 3),
  ('jtet-p1', 'cdp', null, 30, 30, 0),
  ('jtet-p1', 'hindi', null, 30, 30, 1),
  ('jtet-p1', 'english', null, 30, 30, 2),
  ('jtet-p1', 'math', null, 30, 30, 3),
  ('jtet-p1', 'evs', null, 30, 30, 4),
  ('jtet-p2', 'cdp', null, 30, 30, 0),
  ('jtet-p2', 'hindi', null, 30, 30, 1),
  ('jtet-p2', 'english', null, 30, 30, 2),
  ('jtet-p2', null, 'jtet-p2-elective', 60, 60, 3),
  ('otet-p1', 'cdp', null, 30, 30, 0),
  ('otet-p1', 'odia', null, 30, 30, 1),
  ('otet-p1', 'english', null, 30, 30, 2),
  ('otet-p1', 'math', null, 30, 30, 3),
  ('otet-p1', 'evs', null, 30, 30, 4),
  ('otet-p2', 'cdp', null, 30, 30, 0),
  ('otet-p2', 'odia', null, 30, 30, 1),
  ('otet-p2', 'english', null, 30, 30, 2),
  ('otet-p2', null, 'otet-p2-elective', 60, 60, 3),
  ('sktet-p1', 'cdp', null, 30, 30, 0),
  ('sktet-p1', 'nepali', null, 30, 30, 1),
  ('sktet-p1', 'english', null, 30, 30, 2),
  ('sktet-p1', 'math', null, 30, 30, 3),
  ('sktet-p1', 'evs', null, 30, 30, 4),
  ('sktet-p2', 'cdp', null, 30, 30, 0),
  ('sktet-p2', 'nepali', null, 30, 30, 1),
  ('sktet-p2', 'english', null, 30, 30, 2),
  ('sktet-p2', null, 'sktet-p2-elective', 60, 60, 3),
  ('gtet-p1', 'cdp', null, 30, 30, 0),
  ('gtet-p1', 'gujarati', null, 30, 30, 1),
  ('gtet-p1', 'english', null, 30, 30, 2),
  ('gtet-p1', 'math', null, 30, 30, 3),
  ('gtet-p1', 'evs', null, 30, 30, 4),
  ('gtet-p2', 'cdp', null, 30, 30, 0),
  ('gtet-p2', 'gujarati', null, 30, 30, 1),
  ('gtet-p2', 'english', null, 30, 30, 2),
  ('gtet-p2', null, 'gtet-p2-elective', 60, 60, 3)
on conflict do nothing;

-- --------------------------------------------------------------- electives

insert into elective_groups (id, paper_id, name) values
  ('hptet-p2-elective', 'hptet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('pstet-p2-elective', 'pstet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('utet-p2-elective', 'utet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('jtet-p2-elective', 'jtet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('otet-p2-elective', 'otet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('sktet-p2-elective', 'sktet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('gtet-p2-elective', 'gtet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb)
on conflict (id) do nothing;

insert into elective_choices (group_id, subject_id, sort_order) values
  ('hptet-p2-elective', 'maths-science', 0),
  ('hptet-p2-elective', 'sst', 1),
  ('pstet-p2-elective', 'maths-science', 0),
  ('pstet-p2-elective', 'sst', 1),
  ('utet-p2-elective', 'maths-science', 0),
  ('utet-p2-elective', 'sst', 1),
  ('jtet-p2-elective', 'maths-science', 0),
  ('jtet-p2-elective', 'sst', 1),
  ('otet-p2-elective', 'maths-science', 0),
  ('otet-p2-elective', 'sst', 1),
  ('sktet-p2-elective', 'maths-science', 0),
  ('sktet-p2-elective', 'sst', 1),
  ('gtet-p2-elective', 'maths-science', 0),
  ('gtet-p2-elective', 'sst', 1)
on conflict do nothing;

commit;

-- =========================================================================
-- VERIFY — every row should read PASS
-- =========================================================================

with batch as (select unnest(array['hptet','pstet','utet','jtet','otet','sktet','gtet']) as id)
select
  case when count(*) = 7 then 'PASS' else 'FAIL' end          as status,
  'all seven exams exist'                                     as check,
  count(*)                                                    as found
from exams where id in (select id from batch)

union all

select
  case when count(*) = 14 then 'PASS' else 'FAIL' end,
  'each exam has two papers',
  count(*)
from exam_papers where exam_id in (select id from batch)

union all

select
  case when count(*) = 0 then 'PASS' else 'FAIL' end,
  'every paper adds up to 150 questions',
  count(*)
from (
  select ps.paper_id
    from paper_sections ps
    join exam_papers p on p.id = ps.paper_id
   where p.exam_id in (select id from batch)
   group by ps.paper_id
  having sum(ps.questions) <> 150
) bad

union all

select
  case when count(*) = 7 then 'PASS' else 'FAIL' end,
  'each Paper 2 has one elective group',
  count(*)
from elective_groups where paper_id in (
  select id from exam_papers where exam_id in (select id from batch) and post = 'Paper 2')

union all

select
  case when count(*) = 14 then 'PASS' else 'FAIL' end,
  'each elective offers two choices',
  count(*)
from elective_choices where group_id in (
  select id from elective_groups where paper_id in (
    select id from exam_papers where exam_id in (select id from batch)))

union all

select
  case when count(*) = 3 then 'PASS' else 'FAIL' end,
  'the three new Language I subjects exist',
  count(*)
from subjects where id in ('odia', 'nepali', 'gujarati')

union all

select
  case when count(*) = 0 then 'PASS' else 'FAIL' end,
  'no section points at a subject that does not exist',
  count(*)
from paper_sections ps
 join exam_papers p on p.id = ps.paper_id
 left join subjects s on s.id = ps.subject_id
 where p.exam_id in (select id from batch)
   and ps.subject_id is not null and s.id is null;
