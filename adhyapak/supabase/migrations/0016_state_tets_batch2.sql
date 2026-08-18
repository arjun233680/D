-- ---------------------------------------------------------------------------
-- 0016 — the CTET-pattern state TETs, batch 2 of 2
--
-- The six southern and western tests, completing the set 0015 began:
--
--   TS TET, AP TET, TN TET, KTET, KARTET, MAHA TET
--
-- Same shape as batch 1 and as CTET itself: two papers of 150 questions,
-- Paper 1 with five fixed blocks of thirty, Paper 2 with three fixed blocks and
-- a 60-mark subject the candidate chooses between Mathematics & Science and
-- Social Studies.
--
-- Five more Language I subjects arrive with them — Telugu, Tamil, Malayalam,
-- Kannada and Marathi — because Language I is the state's own language and none
-- of these five were modelled. That is the whole reason this is a second batch:
-- eight new languages verified in one go would have been eight chances for a
-- silent mistake.
--
-- Insert order is dependencies before dependents throughout: subjects, exams,
-- papers, elective groups, elective choices, sections. Batch 1 shipped with
-- sections before groups and the foreign key failed the transaction; the order
-- now lives in the generator both batches share rather than in each file.
--
-- WHAT IS NOT HERE, on purpose: `updates` and `sources` are empty for all six,
-- exactly as in batch 1. The paper pattern is published and stable and can be
-- stated; a cycle's notification dates cannot, and `sources` is rendered to the
-- learner as where each claim was checked.
--
-- Also unverified: Kerala runs four KTET categories and only the two primary
-- papers are modelled; Karnataka offers several Language I options depending on
-- the school medium; Tamil Nadu's paper differs from the NCTE template in
-- places. Each surfaces when a real paper for that state is imported.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

insert into subjects (id, name, icon, color, description, sort_order) values
  ('telugu', '{"en":"Telugu","hi":"తెలుగు"}'::jsonb, '📘', '#1D4ED8', '{"en":"Telugu as Language I in the state TETs that examine it. Grammar, comprehension and language pedagogy.","hi":"తెలుగు — उन राज्य TET में भाषा I जो इसे लेते हैं। व्याकरण, बोधगम्यता एवं भाषा शिक्षाशास्त्र।"}'::jsonb, 6),
  ('tamil', '{"en":"Tamil","hi":"தமிழ்"}'::jsonb, '📓', '#9333EA', '{"en":"Tamil as Language I in the state TETs that examine it. Grammar, comprehension and language pedagogy.","hi":"தமிழ் — उन राज्य TET में भाषा I जो इसे लेते हैं। व्याकरण, बोधगम्यता एवं भाषा शिक्षाशास्त्र।"}'::jsonb, 6),
  ('malayalam', '{"en":"Malayalam","hi":"മലയാളം"}'::jsonb, '📔', '#047857', '{"en":"Malayalam as Language I in the state TETs that examine it. Grammar, comprehension and language pedagogy.","hi":"മലയാളം — उन राज्य TET में भाषा I जो इसे लेते हैं। व्याकरण, बोधगम्यता एवं भाषा शिक्षाशास्त्र।"}'::jsonb, 6),
  ('kannada', '{"en":"Kannada","hi":"ಕನ್ನಡ"}'::jsonb, '📒', '#B45309', '{"en":"Kannada as Language I in the state TETs that examine it. Grammar, comprehension and language pedagogy.","hi":"ಕನ್ನಡ — उन राज्य TET में भाषा I जो इसे लेते हैं। व्याकरण, बोधगम्यता एवं भाषा शिक्षाशास्त्र।"}'::jsonb, 6),
  ('marathi', '{"en":"Marathi","hi":"मराठी"}'::jsonb, '📚', '#BE185D', '{"en":"Marathi as Language I in the state TETs that examine it. Grammar, comprehension and language pedagogy.","hi":"मराठी — उन राज्य TET में भाषा I जो इसे लेते हैं। व्याकरण, बोधगम्यता एवं भाषा शिक्षाशास्त्र।"}'::jsonb, 6)
on conflict (id) do nothing;

insert into exams (id, slug, name, short_name, authority, scope, state, about, frequency, color, emoji, next_exam_date, eligibility, highlights, official_site, vacancies) values
  ('tstet', 'tstet', '{"en":"TS TET — Telangana State Teacher Eligibility Test","hi":"TS TET — तेलंगाना राज्य शिक्षक पात्रता परीक्षा"}'::jsonb, 'TS TET', '{"en":"Department of School Education, Government of Telangana","hi":"विद्यालय शिक्षा विभाग, तेलंगाना सरकार"}'::jsonb, 'state', '{"en":"Telangana","hi":"तेलंगाना"}'::jsonb, '{"en":"Required for teaching posts in Telangana government and aided schools, and a qualifying step for the state DSC recruitment.","hi":"तेलंगाना के सरकारी एवं सहायता प्राप्त विद्यालयों में शिक्षक पदों हेतु आवश्यक; राज्य DSC भर्ती हेतु अर्हक चरण।"}'::jsonb, '{"en":"Announced by the department — typically annual","hi":"विभाग द्वारा घोषित — प्रायः वार्षिक"}'::jsonb, '#E11D48', '🏛️', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Telugu, Language II is English","hi":"भाषा I तेलुगु, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://schooledu.telangana.gov.in', null),
  ('aptet', 'aptet', '{"en":"AP TET — Andhra Pradesh Teacher Eligibility Test","hi":"AP TET — आंध्र प्रदेश शिक्षक पात्रता परीक्षा"}'::jsonb, 'AP TET', '{"en":"Department of School Education, Government of Andhra Pradesh","hi":"विद्यालय शिक्षा विभाग, आंध्र प्रदेश सरकार"}'::jsonb, 'state', '{"en":"Andhra Pradesh","hi":"आंध्र प्रदेश"}'::jsonb, '{"en":"Required for teaching posts in Andhra Pradesh government and aided schools, and a qualifying step for the state DSC recruitment.","hi":"आंध्र प्रदेश के सरकारी एवं सहायता प्राप्त विद्यालयों में शिक्षक पदों हेतु आवश्यक; राज्य DSC भर्ती हेतु अर्हक चरण।"}'::jsonb, '{"en":"Announced by the department — typically annual","hi":"विभाग द्वारा घोषित — प्रायः वार्षिक"}'::jsonb, '#0D9488', '🌊', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Telugu, Language II is English","hi":"भाषा I तेलुगु, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://aptet.apcfss.in', null),
  ('tntet', 'tntet', '{"en":"TN TET — Tamil Nadu Teacher Eligibility Test","hi":"TN TET — तमिलनाडु शिक्षक पात्रता परीक्षा"}'::jsonb, 'TN TET', '{"en":"Teachers Recruitment Board (TRB), Tamil Nadu","hi":"शिक्षक भर्ती बोर्ड (TRB), तमिलनाडु"}'::jsonb, 'state', '{"en":"Tamil Nadu","hi":"तमिलनाडु"}'::jsonb, '{"en":"Required for teaching posts in Tamil Nadu government and aided schools. Conducted by the Teachers Recruitment Board.","hi":"तमिलनाडु के सरकारी एवं सहायता प्राप्त विद्यालयों में शिक्षक पदों हेतु आवश्यक। TRB द्वारा आयोजित।"}'::jsonb, '{"en":"Announced by TRB — irregular","hi":"TRB द्वारा घोषित — अनियमित"}'::jsonb, '#B91C1C', '🛕', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Tamil, Language II is English","hi":"भाषा I तमिल, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://trb.tn.gov.in', null),
  ('ktet', 'ktet', '{"en":"KTET — Kerala Teacher Eligibility Test","hi":"KTET — केरल शिक्षक पात्रता परीक्षा"}'::jsonb, 'KTET', '{"en":"Pareeksha Bhavan, Government of Kerala","hi":"परीक्षा भवन, केरल सरकार"}'::jsonb, 'state', '{"en":"Kerala","hi":"केरल"}'::jsonb, '{"en":"Required for teaching posts in Kerala government and aided schools. Kerala runs four categories; the two modelled here are the lower and upper primary papers.","hi":"केरल के सरकारी एवं सहायता प्राप्त विद्यालयों में शिक्षक पदों हेतु आवश्यक। केरल में चार श्रेणियाँ हैं; यहाँ निम्न एवं उच्च प्राथमिक दो पेपर मॉडल किए गए हैं।"}'::jsonb, '{"en":"Usually twice a year","hi":"प्रायः वर्ष में दो बार"}'::jsonb, '#059669', '🌴', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Malayalam, Language II is English","hi":"भाषा I मलयालम, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://ktet.kerala.gov.in', null),
  ('kartet', 'kartet', '{"en":"KARTET — Karnataka Teacher Eligibility Test","hi":"KARTET — कर्नाटक शिक्षक पात्रता परीक्षा"}'::jsonb, 'KARTET', '{"en":"Department of School Education and Literacy, Government of Karnataka","hi":"विद्यालय शिक्षा एवं साक्षरता विभाग, कर्नाटक सरकार"}'::jsonb, 'state', '{"en":"Karnataka","hi":"कर्नाटक"}'::jsonb, '{"en":"Required for teaching posts in Karnataka government and aided schools. Language I may be Kannada or another state language depending on the school medium.","hi":"कर्नाटक के सरकारी एवं सहायता प्राप्त विद्यालयों में शिक्षक पदों हेतु आवश्यक। विद्यालय माध्यम के अनुसार भाषा I कन्नड़ या अन्य राज्य भाषा हो सकती है।"}'::jsonb, '{"en":"Announced by the department — typically annual","hi":"विभाग द्वारा घोषित — प्रायः वार्षिक"}'::jsonb, '#CA8A04', '🐘', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Kannada, Language II is English","hi":"भाषा I कन्नड़, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://schooleducation.kar.nic.in', null),
  ('mahatet', 'mahatet', '{"en":"MAHA TET — Maharashtra Teacher Eligibility Test","hi":"MAHA TET — महाराष्ट्र शिक्षक पात्रता परीक्षा"}'::jsonb, 'MAHA TET', '{"en":"Maharashtra State Council of Examination (MSCE), Pune","hi":"महाराष्ट्र राज्य परीक्षा परिषद (MSCE), पुणे"}'::jsonb, 'state', '{"en":"Maharashtra","hi":"महाराष्ट्र"}'::jsonb, '{"en":"Required for teaching posts in Maharashtra government and aided schools, and a qualifying step for the state TAIT recruitment.","hi":"महाराष्ट्र के सरकारी एवं सहायता प्राप्त विद्यालयों में शिक्षक पदों हेतु आवश्यक; राज्य TAIT भर्ती हेतु अर्हक चरण।"}'::jsonb, '{"en":"Announced by MSCE — irregular","hi":"MSCE द्वारा घोषित — अनियमित"}'::jsonb, '#7C3AED', '🏯', null, '[{"en":"Paper 1 (Classes 1-5): 12th with 50% + D.El.Ed","hi":"पेपर 1 (कक्षा 1-5): 12वीं 50% + D.El.Ed"},{"en":"Paper 2 (Classes 6-8): Graduation with 50% + B.Ed / D.El.Ed","hi":"पेपर 2 (कक्षा 6-8): स्नातक 50% + B.Ed / D.El.Ed"}]'::jsonb, '[{"en":"150 questions, 150 marks, 150 minutes","hi":"150 प्रश्न, 150 अंक, 150 मिनट"},{"en":"Language I is Marathi, Language II is English","hi":"भाषा I मराठी, भाषा II अंग्रेज़ी"},{"en":"No negative marking","hi":"कोई नकारात्मक अंकन नहीं"}]'::jsonb, 'https://mahatet.in', null)
on conflict (id) do nothing;

insert into exam_papers (id, exam_id, name, level, post, marks_per_question, negative_marking, duration_minutes, total_questions, cutoff_general, cutoff_reserved, sort_order) values
  ('tstet-p1', 'tstet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('tstet-p2', 'tstet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('aptet-p1', 'aptet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('aptet-p2', 'aptet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('tntet-p1', 'tntet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('tntet-p2', 'tntet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('ktet-p1', 'ktet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('ktet-p2', 'ktet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('kartet-p1', 'kartet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('kartet-p2', 'kartet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1),
  ('mahatet-p1', 'mahatet', '{"en":"Paper 1 — Classes 1 to 5","hi":"पेपर 1 — कक्षा 1 से 5"}'::jsonb, 'primary', 'Paper 1', 1, 0, 150, 150, 60, 55, 0),
  ('mahatet-p2', 'mahatet', '{"en":"Paper 2 — Classes 6 to 8","hi":"पेपर 2 — कक्षा 6 से 8"}'::jsonb, 'upper-primary', 'Paper 2', 1, 0, 150, 150, 60, 55, 1)
on conflict (id) do nothing;

insert into elective_groups (id, paper_id, name) values
  ('tstet-p2-elective', 'tstet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('aptet-p2-elective', 'aptet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('tntet-p2-elective', 'tntet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('ktet-p2-elective', 'ktet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('kartet-p2-elective', 'kartet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb),
  ('mahatet-p2-elective', 'mahatet-p2', '{"en":"Paper 2 subject","hi":"पेपर 2 विषय"}'::jsonb)
on conflict (id) do nothing;

insert into elective_choices (group_id, subject_id, sort_order) values
  ('tstet-p2-elective', 'maths-science', 0),
  ('tstet-p2-elective', 'sst', 1),
  ('aptet-p2-elective', 'maths-science', 0),
  ('aptet-p2-elective', 'sst', 1),
  ('tntet-p2-elective', 'maths-science', 0),
  ('tntet-p2-elective', 'sst', 1),
  ('ktet-p2-elective', 'maths-science', 0),
  ('ktet-p2-elective', 'sst', 1),
  ('kartet-p2-elective', 'maths-science', 0),
  ('kartet-p2-elective', 'sst', 1),
  ('mahatet-p2-elective', 'maths-science', 0),
  ('mahatet-p2-elective', 'sst', 1)
on conflict do nothing;

insert into paper_sections (paper_id, subject_id, elective_group_id, questions, marks, sort_order) values
  ('tstet-p1', 'cdp', null, 30, 30, 0),
  ('tstet-p1', 'telugu', null, 30, 30, 1),
  ('tstet-p1', 'english', null, 30, 30, 2),
  ('tstet-p1', 'math', null, 30, 30, 3),
  ('tstet-p1', 'evs', null, 30, 30, 4),
  ('tstet-p2', 'cdp', null, 30, 30, 0),
  ('tstet-p2', 'telugu', null, 30, 30, 1),
  ('tstet-p2', 'english', null, 30, 30, 2),
  ('tstet-p2', null, 'tstet-p2-elective', 60, 60, 3),
  ('aptet-p1', 'cdp', null, 30, 30, 0),
  ('aptet-p1', 'telugu', null, 30, 30, 1),
  ('aptet-p1', 'english', null, 30, 30, 2),
  ('aptet-p1', 'math', null, 30, 30, 3),
  ('aptet-p1', 'evs', null, 30, 30, 4),
  ('aptet-p2', 'cdp', null, 30, 30, 0),
  ('aptet-p2', 'telugu', null, 30, 30, 1),
  ('aptet-p2', 'english', null, 30, 30, 2),
  ('aptet-p2', null, 'aptet-p2-elective', 60, 60, 3),
  ('tntet-p1', 'cdp', null, 30, 30, 0),
  ('tntet-p1', 'tamil', null, 30, 30, 1),
  ('tntet-p1', 'english', null, 30, 30, 2),
  ('tntet-p1', 'math', null, 30, 30, 3),
  ('tntet-p1', 'evs', null, 30, 30, 4),
  ('tntet-p2', 'cdp', null, 30, 30, 0),
  ('tntet-p2', 'tamil', null, 30, 30, 1),
  ('tntet-p2', 'english', null, 30, 30, 2),
  ('tntet-p2', null, 'tntet-p2-elective', 60, 60, 3),
  ('ktet-p1', 'cdp', null, 30, 30, 0),
  ('ktet-p1', 'malayalam', null, 30, 30, 1),
  ('ktet-p1', 'english', null, 30, 30, 2),
  ('ktet-p1', 'math', null, 30, 30, 3),
  ('ktet-p1', 'evs', null, 30, 30, 4),
  ('ktet-p2', 'cdp', null, 30, 30, 0),
  ('ktet-p2', 'malayalam', null, 30, 30, 1),
  ('ktet-p2', 'english', null, 30, 30, 2),
  ('ktet-p2', null, 'ktet-p2-elective', 60, 60, 3),
  ('kartet-p1', 'cdp', null, 30, 30, 0),
  ('kartet-p1', 'kannada', null, 30, 30, 1),
  ('kartet-p1', 'english', null, 30, 30, 2),
  ('kartet-p1', 'math', null, 30, 30, 3),
  ('kartet-p1', 'evs', null, 30, 30, 4),
  ('kartet-p2', 'cdp', null, 30, 30, 0),
  ('kartet-p2', 'kannada', null, 30, 30, 1),
  ('kartet-p2', 'english', null, 30, 30, 2),
  ('kartet-p2', null, 'kartet-p2-elective', 60, 60, 3),
  ('mahatet-p1', 'cdp', null, 30, 30, 0),
  ('mahatet-p1', 'marathi', null, 30, 30, 1),
  ('mahatet-p1', 'english', null, 30, 30, 2),
  ('mahatet-p1', 'math', null, 30, 30, 3),
  ('mahatet-p1', 'evs', null, 30, 30, 4),
  ('mahatet-p2', 'cdp', null, 30, 30, 0),
  ('mahatet-p2', 'marathi', null, 30, 30, 1),
  ('mahatet-p2', 'english', null, 30, 30, 2),
  ('mahatet-p2', null, 'mahatet-p2-elective', 60, 60, 3)
on conflict do nothing;

commit;

-- =========================================================================
-- VERIFY — every row should read PASS
-- =========================================================================

with batch as (select unnest(array['tstet', 'aptet', 'tntet', 'ktet', 'kartet', 'mahatet']) as id)
select
  case when count(*) = 6 then 'PASS' else 'FAIL' end          as status,
  'all six exams exist'                                       as check,
  count(*)                                                    as found
from exams where id in (select id from batch)

union all
select case when count(*) = 12 then 'PASS' else 'FAIL' end,
  'each exam has two papers', count(*)
from exam_papers where exam_id in (select id from batch)

union all
select case when count(*) = 0 then 'PASS' else 'FAIL' end,
  'every paper adds up to 150 questions', count(*)
from (
  select ps.paper_id from paper_sections ps
    join exam_papers p on p.id = ps.paper_id
   where p.exam_id in (select id from batch)
   group by ps.paper_id having sum(ps.questions) <> 150) bad

union all
select case when count(*) = 6 then 'PASS' else 'FAIL' end,
  'each Paper 2 has one elective group', count(*)
from elective_groups where paper_id in (
  select id from exam_papers where exam_id in (select id from batch) and post = 'Paper 2')

union all
select case when count(*) = 12 then 'PASS' else 'FAIL' end,
  'each elective offers two choices', count(*)
from elective_choices where group_id in (
  select id from elective_groups where paper_id in (
    select id from exam_papers where exam_id in (select id from batch)))

union all
select case when count(*) = 5 then 'PASS' else 'FAIL' end,
  'the five new Language I subjects exist', count(*)
from subjects where id in ('telugu', 'tamil', 'malayalam', 'kannada', 'marathi')

union all
select case when count(*) = 0 then 'PASS' else 'FAIL' end,
  'no section points at a subject that does not exist', count(*)
from paper_sections ps
  join exam_papers p on p.id = ps.paper_id
  left join subjects s on s.id = ps.subject_id
 where p.exam_id in (select id from batch)
   and ps.subject_id is not null and s.id is null

union all
-- Both batches together. Counting every `scope = 'state'` exam would also
-- catch HSSC and Super TET, which are state recruitment exams rather than
-- CTET-pattern eligibility tests, so the thirteen are named instead.
select case when count(*) = 13 then 'PASS' else 'FAIL' end,
  'all thirteen new CTET-pattern state TETs are present', count(*)
from exams where id in (
  'hptet','pstet','utet','jtet','otet','sktet','gtet',
  'tstet','aptet','tntet','ktet','kartet','mahatet');
