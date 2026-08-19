-- ---------------------------------------------------------------------------
-- 0024 — Science splits three ways, and sections get the name on the chip
--
-- Two things the PYQ browser needed and the schema could not answer.
--
-- SCIENCE IS THREE SUBJECTS WEARING ONE NAME
--
-- The elective block on HTET Level 2 is "Science", and a candidate revising it
-- thinks in Physics, Chemistry and Biology — the screen offers those as tabs
-- under the section. All three already exist as their own `subjects` rows; what
-- was missing was the fact that they compose Science. `parent_subject_id` says
-- so, in the table, so the tabs are a query rather than three ids written into
-- a component. Maths and Social Studies can be split the same way when their
-- papers need it, with no client change.
--
-- Deliberately one level deep. `units` and `subtopics` exist from 0009 for the
-- syllabus tree inside a subject; this is about a subject that *is* several,
-- which is a different relationship and does not nest further.
--
-- THE CHIP NEEDS A SHORTER NAME THAN THE SYLLABUS DOES
--
-- `subjects.name` carries what a syllabus calls a subject — "Quantitative
-- Aptitude", "Hindi (Language I)", "Child Development & Pedagogy". Under a
-- 48px circle those wrap to three lines or truncate to nonsense. `short_name`
-- is what a candidate calls it — Numerical Aptitude, Hindi, CDP — and the long
-- form still appears in the section header underneath, which is exactly how
-- the design reads it back.
--
-- Also adds the NCERT class VI-X chapters for Physics, Chemistry and Biology,
-- taking Science from six placeholder topics to fifty-one real ones. Compiled
-- from the NCERT chapter lists for classes 6 to 10 (see sources note in 0022 —
-- the same caveat applies: this is a good working list, and importing a real
-- paper is what will correct it). `weightage` stays null for the same reason it
-- does there.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

-- =========================================================================
-- STEP 1 — a subject may be part of another
-- =========================================================================

alter table subjects add column if not exists parent_subject_id text
  references subjects(id) on delete set null;
alter table subjects add column if not exists short_name text;

comment on column subjects.parent_subject_id is
  'Set where this subject is one part of a larger one — Physics within Science. Drives the sub-tabs under a section; one level only.';
comment on column subjects.short_name is
  'What a candidate calls the subject, for chips and tabs. `name` stays the syllabus wording and is shown underneath.';

update subjects set parent_subject_id = 'science' where id in ('physics', 'chemistry', 'biology');

update subjects s set short_name = v.short
from (values
  ('cdp', 'CDP'),
  ('hindi', 'Hindi'),
  ('english', 'English'),
  ('quantitative-aptitude', 'Numerical Aptitude'),
  ('reasoning', 'Reasoning Ability'),
  ('haryana-gk', 'Haryana GK'),
  ('science', 'Science'),
  ('physics', 'Physics'),
  ('chemistry', 'Chemistry'),
  ('biology', 'Biology'),
  ('math', 'Mathematics'),
  ('sst', 'Social Studies'),
  ('evs', 'EVS'),
  ('sanskrit', 'Sanskrit')
) as v(id, short)
where s.id = v.id;

-- =========================================================================
-- STEP 2 — Physics, classes VI to X
-- =========================================================================

insert into topics (id, subject_id, name) values
  ('phy-measurement',    'physics', '{"en":"Motion and Measurement of Distances","hi":"गति एवं दूरियों का मापन"}'::jsonb),
  ('phy-light-shadow',   'physics', '{"en":"Light, Shadows and Reflection","hi":"प्रकाश, छाया एवं परावर्तन"}'::jsonb),
  ('phy-circuits',       'physics', '{"en":"Electricity and Circuits","hi":"विद्युत तथा परिपथ"}'::jsonb),
  ('phy-magnets',        'physics', '{"en":"Fun with Magnets","hi":"चुंबकों द्वारा मनोरंजन"}'::jsonb),
  ('phy-force-pressure', 'physics', '{"en":"Force and Pressure","hi":"बल तथा दाब"}'::jsonb),
  ('phy-friction',       'physics', '{"en":"Friction","hi":"घर्षण"}'::jsonb),
  ('phy-sound',          'physics', '{"en":"Sound","hi":"ध्वनि"}'::jsonb),
  ('phy-current-effects','physics', '{"en":"Chemical Effects of Electric Current","hi":"विद्युत धारा के रासायनिक प्रभाव"}'::jsonb),
  ('phy-natural-phenomena','physics','{"en":"Some Natural Phenomena","hi":"कुछ प्राकृतिक परिघटनाएँ"}'::jsonb),
  ('phy-motion-laws',    'physics', '{"en":"Motion and Laws of Motion","hi":"गति एवं गति के नियम"}'::jsonb),
  ('phy-gravitation',    'physics', '{"en":"Gravitation","hi":"गुरुत्वाकर्षण"}'::jsonb),
  ('phy-work-energy',    'physics', '{"en":"Work and Energy","hi":"कार्य तथा ऊर्जा"}'::jsonb),
  ('phy-reflection-refraction','physics','{"en":"Light — Reflection and Refraction","hi":"प्रकाश — परावर्तन तथा अपवर्तन"}'::jsonb),
  ('phy-human-eye',      'physics', '{"en":"The Human Eye and the Colourful World","hi":"मानव नेत्र एवं रंगबिरंगा संसार"}'::jsonb),
  ('phy-electricity',    'physics', '{"en":"Electricity","hi":"विद्युत"}'::jsonb),
  ('phy-magnetic-effects','physics','{"en":"Magnetic Effects of Electric Current","hi":"विद्युत धारा के चुंबकीय प्रभाव"}'::jsonb),
  ('phy-energy-sources', 'physics', '{"en":"Sources of Energy","hi":"ऊर्जा के स्रोत"}'::jsonb)
on conflict (id) do nothing;

-- =========================================================================
-- STEP 3 — Chemistry, classes VI to X
-- =========================================================================

insert into topics (id, subject_id, name) values
  ('chem-sorting',       'chemistry', '{"en":"Sorting Materials into Groups","hi":"वस्तुओं के समूह बनाना"}'::jsonb),
  ('chem-separation',    'chemistry', '{"en":"Separation of Substances","hi":"पदार्थों का पृथक्करण"}'::jsonb),
  ('chem-changes',       'chemistry', '{"en":"Changes Around Us","hi":"हमारे चारों ओर के परिवर्तन"}'::jsonb),
  ('chem-fibre',         'chemistry', '{"en":"Fibre to Fabric","hi":"तंतु से वस्त्र तक"}'::jsonb),
  ('chem-synthetic',     'chemistry', '{"en":"Synthetic Fibres and Plastics","hi":"संश्लिष्ट रेशे एवं प्लास्टिक"}'::jsonb),
  ('chem-metals-nonmetals','chemistry','{"en":"Metals and Non-metals","hi":"धातु एवं अधातु"}'::jsonb),
  ('chem-coal-petroleum','chemistry', '{"en":"Coal and Petroleum","hi":"कोयला तथा पेट्रोलियम"}'::jsonb),
  ('chem-combustion',    'chemistry', '{"en":"Combustion and Flame","hi":"दहन तथा ज्वाला"}'::jsonb),
  ('chem-matter',        'chemistry', '{"en":"Matter in Our Surroundings","hi":"हमारे आस-पास के पदार्थ"}'::jsonb),
  ('chem-matter-pure',   'chemistry', '{"en":"Is Matter Around Us Pure","hi":"क्या हमारे आस-पास के पदार्थ शुद्ध हैं"}'::jsonb),
  ('chem-atoms-molecules','chemistry','{"en":"Atoms and Molecules","hi":"परमाणु एवं अणु"}'::jsonb),
  ('chem-atom-structure','chemistry', '{"en":"Structure of the Atom","hi":"परमाणु की संरचना"}'::jsonb),
  ('chem-reactions',     'chemistry', '{"en":"Chemical Reactions and Equations","hi":"रासायनिक अभिक्रियाएँ एवं समीकरण"}'::jsonb),
  ('chem-acids-bases',   'chemistry', '{"en":"Acids, Bases and Salts","hi":"अम्ल, क्षारक एवं लवण"}'::jsonb),
  ('chem-carbon',        'chemistry', '{"en":"Carbon and its Compounds","hi":"कार्बन एवं उसके यौगिक"}'::jsonb),
  ('chem-periodic-table','chemistry', '{"en":"Periodic Classification of Elements","hi":"तत्वों का आवर्त वर्गीकरण"}'::jsonb)
on conflict (id) do nothing;

-- =========================================================================
-- STEP 4 — Biology, classes VI to X
-- =========================================================================

insert into topics (id, subject_id, name) values
  ('bio-food-source',    'biology', '{"en":"Food: Where Does It Come From?","hi":"भोजन : यह कहाँ से आता है?"}'::jsonb),
  ('bio-food-components','biology', '{"en":"Components of Food","hi":"भोजन के घटक"}'::jsonb),
  ('bio-plants-intro',   'biology', '{"en":"Getting to Know Plants","hi":"पौधों को जानिए"}'::jsonb),
  ('bio-body-movements', 'biology', '{"en":"Body Movements","hi":"शरीर में गति"}'::jsonb),
  ('bio-habitat',        'biology', '{"en":"Living Organisms and Their Surroundings","hi":"सजीव एवं उनका परिवेश"}'::jsonb),
  ('bio-plant-nutrition','biology', '{"en":"Nutrition in Plants","hi":"पादपों में पोषण"}'::jsonb),
  ('bio-animal-nutrition','biology','{"en":"Nutrition in Animals","hi":"प्राणियों में पोषण"}'::jsonb),
  ('bio-respiration',    'biology', '{"en":"Respiration in Organisms","hi":"जीवों में श्वसन"}'::jsonb),
  ('bio-transportation', 'biology', '{"en":"Transportation in Plants and Animals","hi":"पादप एवं जंतुओं में परिवहन"}'::jsonb),
  ('bio-reproduction-plants','biology','{"en":"Reproduction in Plants","hi":"पादपों में जनन"}'::jsonb),
  ('bio-cell-structure', 'biology', '{"en":"Cell — Structure and Functions","hi":"कोशिका — संरचना एवं प्रकार्य"}'::jsonb),
  ('bio-tissues',        'biology', '{"en":"Tissues","hi":"ऊतक"}'::jsonb),
  ('bio-diversity',      'biology', '{"en":"Diversity in Living Organisms","hi":"जीवों में विविधता"}'::jsonb),
  ('bio-life-processes', 'biology', '{"en":"Life Processes","hi":"जैव प्रक्रम"}'::jsonb),
  ('bio-control',        'biology', '{"en":"Control and Coordination","hi":"नियंत्रण एवं समन्वय"}'::jsonb),
  ('bio-heredity',       'biology', '{"en":"Heredity and Evolution","hi":"आनुवंशिकता एवं जैव विकास"}'::jsonb),
  ('bio-environment',    'biology', '{"en":"Our Environment","hi":"हमारा पर्यावरण"}'::jsonb),
  ('bio-microorganisms', 'biology', '{"en":"Microorganisms: Friend and Foe","hi":"सूक्ष्मजीव : मित्र एवं शत्रु"}'::jsonb)
on conflict (id) do nothing;

commit;
