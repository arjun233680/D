-- ---------------------------------------------------------------------------
-- SAFE TEST DATASET — NOT REAL EXAM CONTENT
--
-- Six questions for verifying the content pipeline on a fresh database:
-- import staging, draft visibility, publishing, PYQ analytics. Every row is
-- tagged [TEST] in its text and 'demo-data' in tags, and every "PYQ" reference
-- uses the year 1999 — before any covered exam existed — so nothing here can
-- ever be mistaken for a real previous-year question.
--
-- Apply after the migrations and the main seed:
--   psql "$DATABASE_URL" -f seed/test-content.sql
--
-- Remove when done:
--   delete from questions where source = 'demo-data';
--
-- The fingerprints below are the real values fingerprint() in @adhyapak/core
-- produces for this text, written as `en || chr(31) || hi` so the separator is
-- visible. They have to be exact: duplicate detection is an equality lookup, so
-- an approximate fingerprint would quietly match nothing.
-- ---------------------------------------------------------------------------

begin;

-- Six clearly-marked [TEST] questions in the flat schema, for verifying
-- visibility rules and the analytics views on a live database. Their fake "PYQ
-- years" are 1998-99, before any covered exam existed, so they cannot be
-- mistaken for real papers.
insert into questions (
  id, status, question_en, question_hi,
  option_a_en, option_b_en, option_c_en, option_d_en,
  option_a_hi, option_b_hi, option_c_hi, option_d_hi,
  correct_answers, answer_status, explanation_en, explanation_hi,
  difficulty, topic_id, year, question_no, source, fingerprint
) values
-- Two published: what a learner should see.
('test-q-001', 'published',
 '[TEST] Which stage did Piaget place at 7-11 years?',
 '[TEST] पियाजे ने 7-11 वर्ष को किस अवस्था में रखा?',
 'Sensorimotor', 'Pre-operational', 'Concrete operational', 'Formal operational',
 'संवेदी-पेशीय', 'पूर्व-संक्रियात्मक', 'मूर्त संक्रियात्मक', 'औपचारिक संक्रियात्मक',
 array['C'], 'ok',
 'Demo data. Concrete operational.', 'डेमो डेटा। मूर्त संक्रियात्मक।',
 'easy', 'cdp-piaget', 1998, 1, 'demo-data', 'test-q-001'),

('test-q-002', 'published',
 '[TEST] Who proposed the Zone of Proximal Development?',
 '[TEST] निकटस्थ विकास क्षेत्र किसने दिया?',
 'Piaget', 'Vygotsky', 'Skinner', 'Bruner',
 'पियाजे', 'वाइगोत्स्की', 'स्किनर', 'ब्रूनर',
 array['B'], 'ok',
 'Demo data. Vygotsky.', 'डेमो डेटा। वाइगोत्स्की।',
 'easy', 'cdp-piaget', 1999, 2, 'demo-data', 'test-q-002'),

-- A double answer and a withdrawn question: the two states the old schema
-- could not express, so nothing exercised them until now.
('test-q-003', 'published',
 '[TEST] Which of these are Piagetian stages?',
 '[TEST] इनमें से कौन पियाजे की अवस्थाएँ हैं?',
 'Sensorimotor', 'Latency', 'Formal operational', 'Genital',
 'संवेदी-पेशीय', 'सुप्तावस्था', 'औपचारिक संक्रियात्मक', 'जननांगीय',
 array['A','C'], 'ok',
 'Demo data. Both A and C.', 'डेमो डेटा। A और C दोनों।',
 'medium', 'cdp-piaget', 1998, 3, 'demo-data', 'test-q-003'),

('test-q-004', 'published',
 '[TEST] Withdrawn question, kept to exercise dropped-answer grading.',
 '[TEST] हटाया गया प्रश्न, ड्रॉप्ड ग्रेडिंग जाँचने हेतु।',
 'One', 'Two', 'Three', 'Four',
 'एक', 'दो', 'तीन', 'चार',
 array[]::text[], 'dropped',
 null, null,
 'medium', 'cdp-piaget', 1999, 4, 'demo-data', 'test-q-004'),

-- One draft and one archived: neither should reach a learner.
('test-q-005', 'draft',
 '[TEST] Draft question — must not be visible to a learner.',
 '[TEST] ड्राफ्ट प्रश्न — किसी शिक्षार्थी को न दिखे।',
 'One', 'Two', 'Three', 'Four',
 'एक', 'दो', 'तीन', 'चार',
 array['A'], 'ok',
 'Demo data.', 'डेमो डेटा।',
 'easy', 'cdp-piaget', 1998, 5, 'demo-data', 'test-q-005'),

('test-q-006', 'archived',
 '[TEST] Archived question — withdrawn from the bank.',
 '[TEST] संग्रहीत प्रश्न — बैंक से हटाया गया।',
 'One', 'Two', 'Three', 'Four',
 'एक', 'दो', 'तीन', 'चार',
 array['A'], 'ok',
 'Demo data.', 'डेमो डेटा।',
 'easy', 'cdp-piaget', 1999, 6, 'demo-data', 'test-q-006')
on conflict (id) do nothing;

-- Exam tags live in the junction now.
insert into question_exams (question_id, exam_id)
select q.id, 'htet' from questions q where q.source = 'demo-data'
on conflict do nothing;

commit;

-- Expected after applying, as an anonymous or learner client:
--   select count(*) from questions where id like 'test-q-%';   -- 3 (published only)
-- As staff:
--   select count(*) from questions where id like 'test-q-%';   -- 6
-- Analytics:
--   select * from pyq_topic_frequency where exam_id = 'htet';  -- cdp-piaget rows include years 1998-1999
