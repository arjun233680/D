-- ---------------------------------------------------------------------------
-- 0022 — the HTET TGT general-paper syllabus, topic by topic
--
-- The PYQ screen browses by topic, and the topic lists it had were placeholders:
-- nine rows for Child Development, five for English, five for Reasoning. A
-- "Topic Wise" tab over five topics is not a browse, it is a stub.
--
-- These are the six sections every HTET TGT candidate sits regardless of their
-- elective — Child Development & Pedagogy, Hindi, English, Quantitative
-- Aptitude, Reasoning Ability and Haryana General Knowledge. The elective
-- subject's own topics (Science, Maths, SST …) are NOT here; those follow the
-- NCERT class VI-X syllabus and are a separate piece of work.
--
-- WHERE THESE CAME FROM
--
-- Compiled from published HTET Level 2 syllabus breakdowns (see `sources` note
-- below), cross-read against two of them. They describe the BSEH syllabus but
-- are not the board's own PDF, so treat this as a good working list rather than
-- a citation: what is authoritative is the notification, and when a real paper
-- is imported the topic tags on its questions are what will correct this.
--
-- WHAT IS DELIBERATELY ABSENT
--
-- `weightage`. It drives the "high yield" badge and the recommended ordering,
-- and it is a claim about how many marks a topic has historically carried. With
-- no questions in the bank there is nothing to measure, and a number invented
-- here would be rendered to an aspirant as a reason to spend their time one way
-- rather than another. Null leaves the badge hidden, which is the honest state.
--
-- Existing rows are left alone — `on conflict do nothing` throughout, so the
-- nine CDP topics that were already there keep their ids and any questions
-- already tagged to them.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

-- ------------------------------------------- Child Development & Pedagogy

insert into topics (id, subject_id, name) values
  ('cdp-heredity',            'cdp', '{"en":"Heredity and Environment","hi":"वंशानुक्रम और पर्यावरण का प्रभाव"}'::jsonb),
  ('cdp-socialization',       'cdp', '{"en":"Socialization: teachers, parents and peers","hi":"समाजीकरण : शिक्षक, माता-पिता और सहपाठी"}'::jsonb),
  ('cdp-kohlberg',            'cdp', '{"en":"Kohlberg''s theory of moral development","hi":"कोलबर्ग का नैतिक विकास सिद्धांत"}'::jsonb),
  ('cdp-vygotsky',            'cdp', '{"en":"Vygotsky''s socio-cultural theory","hi":"विगोत्स्की का सामाजिक-सांस्कृतिक सिद्धांत"}'::jsonb),
  ('cdp-child-centred',       'cdp', '{"en":"Child-centred and progressive education","hi":"बाल केंद्रित एवं प्रगतिशील शिक्षा"}'::jsonb),
  ('cdp-language-thought',    'cdp', '{"en":"Language and Thought","hi":"भाषा और चिंतन"}'::jsonb),
  ('cdp-individual-differences','cdp','{"en":"Individual differences among learners","hi":"अधिगमकर्ताओं में वैयक्तिक भिन्नताएँ"}'::jsonb),
  ('cdp-special-needs',       'cdp', '{"en":"Children with special needs","hi":"विशेष आवश्यकता वाले बच्चे"}'::jsonb),
  ('cdp-disadvantaged',       'cdp', '{"en":"Disadvantaged, deprived, talented and creative learners","hi":"वंचित, पिछड़े, प्रतिभाशाली एवं सृजनशील अधिगमकर्ता"}'::jsonb),
  ('cdp-errors',              'cdp', '{"en":"Understanding children''s errors","hi":"बच्चों की त्रुटियों को समझना"}'::jsonb),
  ('cdp-cognition-emotion',   'cdp', '{"en":"Cognition and Emotions","hi":"संज्ञान एवं संवेग"}'::jsonb),
  ('cdp-critical-thinking',   'cdp', '{"en":"Critical thinking in the classroom","hi":"कक्षा में आलोचनात्मक चिंतन"}'::jsonb),
  ('cdp-questions',           'cdp', '{"en":"Formulating appropriate questions","hi":"उपयुक्त प्रश्न निर्माण"}'::jsonb),
  ('cdp-teaching-process',    'cdp', '{"en":"Basic processes of teaching and learning","hi":"कक्षा में अधिगम की प्रक्रियाएँ"}'::jsonb),
  ('cdp-learning-strategies', 'cdp', '{"en":"Learning strategies","hi":"अधिगम की रणनीतियाँ"}'::jsonb),
  ('cdp-learning-difficulties','cdp', '{"en":"Learning difficulties","hi":"अधिगम की कठिनाइयाँ"}'::jsonb),
  ('cdp-concept',             'cdp', '{"en":"Concept of child development","hi":"बाल विकास की अवधारणा"}'::jsonb),
  ('cdp-principles',          'cdp', '{"en":"Principles of development","hi":"विकास के सिद्धांत"}'::jsonb),
  ('cdp-learning-concept',    'cdp', '{"en":"Concept and types of learning","hi":"अधिगम की अवधारणा और प्रकार"}'::jsonb)
on conflict (id) do nothing;

-- ------------------------------------------------------------------ Hindi

insert into topics (id, subject_id, name) values
  ('hindi-sangya',        'hindi', '{"en":"Noun (Sangya)","hi":"संज्ञा"}'::jsonb),
  ('hindi-sarvanam',      'hindi', '{"en":"Pronoun (Sarvanam)","hi":"सर्वनाम"}'::jsonb),
  ('hindi-visheshan',     'hindi', '{"en":"Adjective (Visheshan)","hi":"विशेषण"}'::jsonb),
  ('hindi-kriya',         'hindi', '{"en":"Verb (Kriya)","hi":"क्रिया"}'::jsonb),
  ('hindi-ling-vachan',   'hindi', '{"en":"Gender and Number","hi":"लिंग एवं वचन"}'::jsonb),
  ('hindi-upsarg-pratyay','hindi', '{"en":"Prefixes and Suffixes","hi":"उपसर्ग एवं प्रत्यय"}'::jsonb),
  ('hindi-vakya',         'hindi', '{"en":"Sentence construction","hi":"वाक्य निर्माण"}'::jsonb),
  ('hindi-paryayvachi',   'hindi', '{"en":"Synonyms","hi":"पर्यायवाची शब्द"}'::jsonb),
  ('hindi-vilom',         'hindi', '{"en":"Antonyms","hi":"विलोम शब्द"}'::jsonb),
  ('hindi-anekarthi',     'hindi', '{"en":"Words with multiple meanings","hi":"अनेकार्थी शब्द"}'::jsonb),
  ('hindi-muhavare',      'hindi', '{"en":"Idioms and proverbs","hi":"मुहावरे एवं लोकोक्तियाँ"}'::jsonb),
  ('hindi-sandhi',        'hindi', '{"en":"Sandhi","hi":"सन्धि"}'::jsonb),
  ('hindi-samas',         'hindi', '{"en":"Compound words (Samas)","hi":"समास"}'::jsonb),
  ('hindi-tatsam',        'hindi', '{"en":"Tatsam and Tadbhav words","hi":"तत्सम एवं तद्भव शब्द"}'::jsonb),
  ('hindi-deshaj',        'hindi', '{"en":"Indigenous and foreign words","hi":"देशज एवं विदेशी शब्द"}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- English

insert into topics (id, subject_id, name) values
  ('eng-tenses',        'english', '{"en":"Grammar — Tenses","hi":"व्याकरण — काल"}'::jsonb),
  ('eng-voice',         'english', '{"en":"Active and Passive Voice","hi":"कर्तृवाच्य एवं कर्मवाच्य"}'::jsonb),
  ('eng-narration',     'english', '{"en":"Direct and Indirect Speech","hi":"प्रत्यक्ष एवं अप्रत्यक्ष कथन"}'::jsonb),
  ('eng-articles',      'english', '{"en":"Articles","hi":"आर्टिकल्स"}'::jsonb),
  ('eng-prepositions',  'english', '{"en":"Prepositions","hi":"पूर्वसर्ग"}'::jsonb),
  ('eng-conjunctions',  'english', '{"en":"Conjunctions","hi":"संयोजक"}'::jsonb),
  ('eng-modals',        'english', '{"en":"Modals","hi":"मोडल्स"}'::jsonb),
  ('eng-parts-of-speech','english','{"en":"Parts of Speech","hi":"शब्द-भेद"}'::jsonb),
  ('eng-sv-agreement',  'english', '{"en":"Subject — Verb Agreement","hi":"कर्ता-क्रिया सामंजस्य"}'::jsonb),
  ('eng-determiners',   'english', '{"en":"Determiners","hi":"निर्धारक"}'::jsonb),
  ('eng-punctuation',   'english', '{"en":"Punctuation","hi":"विराम चिह्न"}'::jsonb),
  ('eng-synonyms',      'english', '{"en":"Synonyms","hi":"समानार्थी शब्द"}'::jsonb),
  ('eng-antonyms',      'english', '{"en":"Antonyms","hi":"विलोम शब्द"}'::jsonb),
  ('eng-idioms',        'english', '{"en":"Idioms and Phrases","hi":"मुहावरे एवं वाक्यांश"}'::jsonb),
  ('eng-pronoun',       'english', '{"en":"Pronouns","hi":"सर्वनाम"}'::jsonb),
  ('eng-adjective',     'english', '{"en":"Adjectives","hi":"विशेषण"}'::jsonb),
  ('eng-adverb',        'english', '{"en":"Adverbs","hi":"क्रिया-विशेषण"}'::jsonb),
  ('eng-verb',          'english', '{"en":"Verbs","hi":"क्रिया"}'::jsonb)
on conflict (id) do nothing;

-- --------------------------------------------------- Quantitative Aptitude

insert into topics (id, subject_id, name) values
  ('qa-fractions',      'quantitative-aptitude', '{"en":"Fractions and Decimals","hi":"भिन्न और दशमलव"}'::jsonb),
  ('qa-lcm-hcf',        'quantitative-aptitude', '{"en":"L.C.M. and H.C.F.","hi":"L.C.M. और H.C.F."}'::jsonb),
  ('qa-simplification', 'quantitative-aptitude', '{"en":"Important arithmetic operations","hi":"महत्वपूर्ण अंकगणितीय संक्रियाएँ"}'::jsonb),
  ('qa-algebra',        'quantitative-aptitude', '{"en":"Algebra","hi":"बीजगणित"}'::jsonb),
  ('qa-ratio',          'quantitative-aptitude', '{"en":"Ratio and Proportion","hi":"अनुपात और समानुपात"}'::jsonb),
  ('qa-shapes',         'quantitative-aptitude', '{"en":"Elementary shapes (2-D and 3-D)","hi":"प्रारंभिक आकृतियाँ (2-D एवं 3-D)"}'::jsonb),
  ('qa-age',            'quantitative-aptitude', '{"en":"Problems on ages","hi":"आयु संबंधी प्रश्न"}'::jsonb),
  ('qa-speed-distance', 'quantitative-aptitude', '{"en":"Time, Speed and Distance","hi":"समय और दूरी"}'::jsonb),
  ('qa-si',             'quantitative-aptitude', '{"en":"Simple Interest","hi":"साधारण ब्याज"}'::jsonb),
  ('qa-ci',             'quantitative-aptitude', '{"en":"Compound Interest","hi":"चक्रवृद्धि ब्याज"}'::jsonb),
  ('qa-time-work',      'quantitative-aptitude', '{"en":"Time and Work","hi":"समय और कार्य"}'::jsonb),
  ('qa-pipes',          'quantitative-aptitude', '{"en":"Pipes and Cisterns","hi":"पाइप और टंकी"}'::jsonb),
  ('qa-boats',          'quantitative-aptitude', '{"en":"Boats and Streams","hi":"नाव और धारा"}'::jsonb),
  ('qa-mixtures',       'quantitative-aptitude', '{"en":"Mixtures and Alligation","hi":"मिश्रण और अलिगेशन"}'::jsonb)
on conflict (id) do nothing;

-- ------------------------------------------------------- Reasoning Ability

insert into topics (id, subject_id, name) values
  ('rea-classification',  'reasoning', '{"en":"Classification","hi":"वर्गीकरण"}'::jsonb),
  ('rea-analogy',         'reasoning', '{"en":"Similarities and Differences","hi":"समानताएँ और भिन्नताएँ"}'::jsonb),
  ('rea-letter-series',   'reasoning', '{"en":"Letter Series","hi":"अक्षर श्रृंखला"}'::jsonb),
  ('rea-direction',       'reasoning', '{"en":"Direction Sense","hi":"दिशा ज्ञान"}'::jsonb),
  ('rea-seating',         'reasoning', '{"en":"Seating Arrangement","hi":"बैठने की व्यवस्था"}'::jsonb),
  ('rea-statement-conclusion','reasoning','{"en":"Statement and Conclusions","hi":"कथन और निष्कर्ष"}'::jsonb),
  ('rea-statement-assumption','reasoning','{"en":"Statement and Assumptions","hi":"कथन और मान्यताएँ"}'::jsonb),
  ('rea-statement-argument','reasoning', '{"en":"Statement and Arguments","hi":"कथन और तर्क"}'::jsonb),
  ('rea-venn',            'reasoning', '{"en":"Venn Diagrams","hi":"वेन आरेख"}'::jsonb),
  ('rea-data-sufficiency','reasoning', '{"en":"Data Sufficiency","hi":"आंकड़ा पर्याप्तता"}'::jsonb),
  ('rea-decision',        'reasoning', '{"en":"Decision Making","hi":"निर्णय लेना"}'::jsonb),
  ('rea-clock-calendar',  'reasoning', '{"en":"Clocks and Calendars","hi":"घड़ी और कैलेंडर"}'::jsonb),
  ('rea-space',           'reasoning', '{"en":"Space Visualization","hi":"स्थान कल्पना"}'::jsonb),
  ('rea-problem-solving', 'reasoning', '{"en":"Problem Solving","hi":"समस्या समाधान"}'::jsonb),
  ('rea-arithmetical',    'reasoning', '{"en":"Arithmetical Reasoning","hi":"अंकगणितीय तर्कशक्ति"}'::jsonb),
  ('rea-figure-classification','reasoning','{"en":"Figure Classification","hi":"आकृति वर्गीकरण"}'::jsonb)
on conflict (id) do nothing;

-- ------------------------------------------------ Haryana General Knowledge

insert into topics (id, subject_id, name) values
  ('hgk-history-ancient', 'haryana-gk', '{"en":"History of Haryana — Ancient period","hi":"हरियाणा का इतिहास (प्राचीन काल)"}'::jsonb),
  ('hgk-history-medieval','haryana-gk', '{"en":"History of Haryana — Medieval period","hi":"हरियाणा का इतिहास (मध्यकाल)"}'::jsonb),
  ('hgk-history-modern',  'haryana-gk', '{"en":"History of Haryana — Modern period","hi":"हरियाणा का इतिहास (आधुनिक काल)"}'::jsonb),
  ('hgk-location',        'haryana-gk', '{"en":"Location and extent","hi":"हरियाणा की भौगोलिक स्थिति एवं विस्तार"}'::jsonb),
  ('hgk-physical',        'haryana-gk', '{"en":"Physical structure","hi":"हरियाणा की भौतिक संरचना"}'::jsonb),
  ('hgk-climate',         'haryana-gk', '{"en":"Climate","hi":"जलवायु"}'::jsonb),
  ('hgk-rivers',          'haryana-gk', '{"en":"Rivers","hi":"नदियाँ"}'::jsonb),
  ('hgk-soil',            'haryana-gk', '{"en":"Soils","hi":"मिट्टी"}'::jsonb),
  ('hgk-forest',          'haryana-gk', '{"en":"Forests and wildlife","hi":"वन एवं वन्य जीवन"}'::jsonb),
  ('hgk-population',      'haryana-gk', '{"en":"Population","hi":"जनसंख्या"}'::jsonb),
  ('hgk-agriculture',     'haryana-gk', '{"en":"Agriculture","hi":"कृषि"}'::jsonb),
  ('hgk-minerals',        'haryana-gk', '{"en":"Mineral resources","hi":"खनिज संसाधन"}'::jsonb),
  ('hgk-industry',        'haryana-gk', '{"en":"Industry","hi":"उद्योग"}'::jsonb),
  ('hgk-transport',       'haryana-gk', '{"en":"Transport and communication","hi":"परिवहन एवं संचार"}'::jsonb),
  ('hgk-folk',            'haryana-gk', '{"en":"Folk culture and heritage","hi":"हरियाणा की लोक संस्कृति एवं विरासत"}'::jsonb),
  ('hgk-fairs',           'haryana-gk', '{"en":"Fairs, festivals and folk dances","hi":"मेले, त्योहार एवं लोक नृत्य"}'::jsonb),
  ('hgk-districts',       'haryana-gk', '{"en":"Districts of Haryana","hi":"हरियाणा के जिले"}'::jsonb),
  ('hgk-personalities',   'haryana-gk', '{"en":"Prominent personalities","hi":"प्रमुख व्यक्तित्व"}'::jsonb)
on conflict (id) do nothing;

commit;
