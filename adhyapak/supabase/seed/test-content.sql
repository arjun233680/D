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
--   delete from questions where 'demo-data' = any(tags);
-- ---------------------------------------------------------------------------

begin;

insert into questions (
  id, status, kind, subject_id, topic_id, exam_ids, levels,
  text, options, correct_index, correct_indices, explanation, difficulty,
  pyq_exam_id, pyq_year, pyq_paper_label, pyq_shift, pyq_question_number,
  tags, fingerprint
) values
-- Two published: what a learner should see.
('test-q-001', 'published', 'mcq-single', 'cdp', 'cdp-piaget',
 array['htet'], array['upper-primary'],
 '{"en":"[TEST] Which stage comes first in this demo question?","hi":"[TEST] इस डेमो प्रश्न में पहली अवस्था कौन-सी है?"}',
 '[{"en":"First","hi":"पहली"},{"en":"Second","hi":"दूसरी"},{"en":"Third","hi":"तीसरी"},{"en":"Fourth","hi":"चौथी"}]',
 0, array[0],
 '{"en":"[TEST] Demo explanation.","hi":"[TEST] डेमो व्याख्या।"}',
 'easy', 'htet', 1999, 'Paper 1', '1', 1,
 array['demo-data'], 'test first stage demo question'),
('test-q-002', 'published', 'mcq-single', 'cdp', 'cdp-learning',
 array['htet'], array['upper-primary'],
 '{"en":"[TEST] Which option is B in this demo question?","hi":"[TEST] इस डेमो प्रश्न में विकल्प B कौन-सा है?"}',
 '[{"en":"Not this","hi":"यह नहीं"},{"en":"This one","hi":"यही"},{"en":"Not this either","hi":"यह भी नहीं"},{"en":"No","hi":"नहीं"}]',
 1, array[1],
 '{"en":"[TEST] Demo explanation.","hi":"[TEST] डेमो व्याख्या।"}',
 'easy', 'htet', 1999, 'Paper 1', '2', 2,
 array['demo-data'], 'test option b demo question'),
-- One of each non-published state: what a learner must never see.
('test-q-003', 'draft', 'mcq-single', 'cdp', 'cdp-piaget',
 array['htet'], array['upper-primary'],
 '{"en":"[TEST] DRAFT — must never reach a learner.","hi":"[TEST] ड्राफ़्ट — शिक्षार्थी तक कभी नहीं पहुँचे।"}',
 '[{"en":"A","hi":"अ"},{"en":"B","hi":"ब"}]', 0, array[0],
 '{"en":"","hi":""}', 'easy', null, null, null, null, null,
 array['demo-data'], 'test draft never reach learner'),
('test-q-004', 'review', 'mcq-single', 'cdp', 'cdp-piaget',
 array['htet'], array['upper-primary'],
 '{"en":"[TEST] IN REVIEW — must never reach a learner.","hi":"[TEST] समीक्षाधीन — शिक्षार्थी तक कभी नहीं पहुँचे।"}',
 '[{"en":"A","hi":"अ"},{"en":"B","hi":"ब"}]', 0, array[0],
 '{"en":"","hi":""}', 'easy', null, null, null, null, null,
 array['demo-data'], 'test review never reach learner'),
('test-q-005', 'archived', 'mcq-single', 'cdp', 'cdp-piaget',
 array['htet'], array['upper-primary'],
 '{"en":"[TEST] ARCHIVED — must never reach a learner.","hi":"[TEST] संग्रहीत — शिक्षार्थी तक कभी नहीं पहुँचे।"}',
 '[{"en":"A","hi":"अ"},{"en":"B","hi":"ब"}]', 0, array[0],
 '{"en":"","hi":""}', 'easy', null, null, null, null, null,
 array['demo-data'], 'test archived never reach learner'),
-- One more published PYQ in a second "year", so the trend chart has two points.
('test-q-006', 'published', 'mcq-single', 'cdp', 'cdp-piaget',
 array['htet'], array['upper-primary'],
 '{"en":"[TEST] Second demo year for the trend chart.","hi":"[TEST] रुझान चार्ट हेतु दूसरा डेमो वर्ष।"}',
 '[{"en":"Yes","hi":"हाँ"},{"en":"No","hi":"नहीं"}]', 0, array[0],
 '{"en":"[TEST] Demo.","hi":"[TEST] डेमो।"}',
 'easy', 'htet', 1998, 'Paper 1', '1', 3,
 array['demo-data'], 'test second demo year trend')
on conflict (id) do nothing;

commit;

-- Expected after applying, as an anonymous or learner client:
--   select count(*) from questions where id like 'test-q-%';   -- 3 (published only)
-- As staff:
--   select count(*) from questions where id like 'test-q-%';   -- 6
-- Analytics:
--   select * from pyq_topic_frequency where exam_id = 'htet';  -- cdp-piaget rows include years 1998-1999
