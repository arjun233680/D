-- 0034 — the real subject lists for EMRS, APS and MPTET
--
-- WHY
--
-- 0032 gave these three the standard national TGT twelve and PGT twenty-one,
-- and said in its own header that they were the national pattern rather than
-- each board's verified list. Checked against the boards, all three are wrong
-- in ways a candidate would notice:
--
--   MPTET Varg 2 offers exactly six subjects — Hindi, English, Sanskrit,
--   Maths, Science and Social Science — and a candidate may only sit the one
--   matching their degree. Offering twelve, including Music, Art, Home Science,
--   Punjabi and Urdu, invents six they cannot apply for.
--
--   EMRS recruits Computer Science TGTs, which the twelve does not list, and
--   does not recruit Sanskrit, Punjabi or Home Science TGTs, which it does.
--   Its regional-language posts are Assamese, Bengali, Gujarati, Kannada,
--   Odia, Telugu and Urdu — a different list again, and mostly languages this
--   database has no subject row for, so they fall under "Other Subject".
--
--   APS (AWES) sets its PGT paper in Accountancy, Business Studies,
--   Biotechnology and Informatics Practices among others, and not in Music,
--   Psychology, Sociology, Punjabi or Sanskrit.
--
-- The three boards that keep the standard lists — HSSC, HPSC and the four that
-- had researched lists already — were checked and do match them.
--
-- Still approximations in one respect: where a board recruits a subject this
-- database has no row for (Accountancy, Biotechnology, Assamese, Bengali),
-- the candidate picks "Other Subject". Adding those subjects properly is
-- separate work.

begin;

delete from public.elective_choices
where group_id in (
  'emrs-tgt-elective','emrs-pgt-elective',
  'awes-tgt-elective','awes-pgt-elective',
  'mptet-varg2-elective','mptet-varg1-elective'
);

-- EMRS TGT — core subjects, computer science, the miscellaneous posts (art,
-- music, physical education) and Urdu; regional languages via Other.
insert into public.elective_choices (group_id, subject_id, sort_order) values
  ('emrs-tgt-elective','hindi',1), ('emrs-tgt-elective','english',2),
  ('emrs-tgt-elective','math',3), ('emrs-tgt-elective','science',4),
  ('emrs-tgt-elective','sst',5), ('emrs-tgt-elective','computer-science',6),
  ('emrs-tgt-elective','art',7), ('emrs-tgt-elective','music',8),
  ('emrs-tgt-elective','physical-education',9), ('emrs-tgt-elective','urdu',10),
  ('emrs-tgt-elective','other-subject',99);

insert into public.elective_choices (group_id, subject_id, sort_order) values
  ('emrs-pgt-elective','hindi',1), ('emrs-pgt-elective','english',2),
  ('emrs-pgt-elective','math',3), ('emrs-pgt-elective','physics',4),
  ('emrs-pgt-elective','chemistry',5), ('emrs-pgt-elective','biology',6),
  ('emrs-pgt-elective','history',7), ('emrs-pgt-elective','geography',8),
  ('emrs-pgt-elective','economics',9), ('emrs-pgt-elective','commerce',10),
  ('emrs-pgt-elective','political-science',11),
  ('emrs-pgt-elective','computer-science',12),
  ('emrs-pgt-elective','other-subject',99);

-- APS (AWES).
insert into public.elective_choices (group_id, subject_id, sort_order) values
  ('awes-tgt-elective','hindi',1), ('awes-tgt-elective','english',2),
  ('awes-tgt-elective','math',3), ('awes-tgt-elective','science',4),
  ('awes-tgt-elective','sst',5), ('awes-tgt-elective','sanskrit',6),
  ('awes-tgt-elective','computer-science',7),
  ('awes-tgt-elective','other-subject',99);

insert into public.elective_choices (group_id, subject_id, sort_order) values
  ('awes-pgt-elective','hindi',1), ('awes-pgt-elective','english',2),
  ('awes-pgt-elective','math',3), ('awes-pgt-elective','physics',4),
  ('awes-pgt-elective','chemistry',5), ('awes-pgt-elective','biology',6),
  ('awes-pgt-elective','history',7), ('awes-pgt-elective','geography',8),
  ('awes-pgt-elective','economics',9), ('awes-pgt-elective','commerce',10),
  ('awes-pgt-elective','political-science',11),
  ('awes-pgt-elective','computer-science',12),
  ('awes-pgt-elective','home-science',13),
  ('awes-pgt-elective','physical-education',14),
  ('awes-pgt-elective','fine-arts',15),
  ('awes-pgt-elective','other-subject',99);

-- MPTET Varg 2 — exactly the six the board lists.
insert into public.elective_choices (group_id, subject_id, sort_order) values
  ('mptet-varg2-elective','hindi',1), ('mptet-varg2-elective','english',2),
  ('mptet-varg2-elective','sanskrit',3), ('mptet-varg2-elective','math',4),
  ('mptet-varg2-elective','science',5), ('mptet-varg2-elective','sst',6);

insert into public.elective_choices (group_id, subject_id, sort_order) values
  ('mptet-varg1-elective','hindi',1), ('mptet-varg1-elective','english',2),
  ('mptet-varg1-elective','sanskrit',3), ('mptet-varg1-elective','urdu',4),
  ('mptet-varg1-elective','math',5), ('mptet-varg1-elective','physics',6),
  ('mptet-varg1-elective','chemistry',7), ('mptet-varg1-elective','biology',8),
  ('mptet-varg1-elective','history',9), ('mptet-varg1-elective','geography',10),
  ('mptet-varg1-elective','economics',11),
  ('mptet-varg1-elective','political-science',12),
  ('mptet-varg1-elective','commerce',13),
  ('mptet-varg1-elective','home-science',14),
  ('mptet-varg1-elective','other-subject',99);

commit;
