-- 0033 — call each level what its own exam calls it
--
-- WHY
--
-- The chooser labelled every level PRT, TGT or PGT. CTET does not use those
-- words: it sets Paper I and Paper II. REET sets Level 1 and Level 2. MPTET
-- sets Varg 3, Varg 2 and Varg 1. A Rajasthan candidate looking for "Level 2"
-- was being shown "TGT" and had to already know the two are the same thing —
-- which is exactly the knowledge somebody sitting their first eligibility test
-- does not have.
--
-- PRT/TGT/PGT stays as the internal vocabulary; it is what the syllabus,
-- subject lists and papers are keyed on, and it is right for the boards that
-- genuinely use those words. This adds the *display* name on top of it.
--
-- WHY NOT DERIVE IT FROM `exam_papers.post`
--
-- Because that column is not only the level's name. KVS and NVS both carry a
-- "Tier 1" row beside PRT — a common paper, not a level — so the derived
-- label came out "PRT / Tier 1". DSSSB's PGT is split across "PGT Tier 1" and
-- "PGT Tier 2", which is two stages of one level. BiharTET has both "Paper 1"
-- and a stray "PRT". A display name has to be one string chosen on purpose.
--
-- SOURCES
--
-- Checked against each board's current notification: CTET is Paper I and
-- Paper II (CBSE), UPTET and the other state TETs Paper 1 and Paper 2, REET
-- Level 1 and Level 2, MPTET Varg 3/2/1, and the recruitment boards — HTET,
-- DSSSB, KVS, NVS, APS, HSSC, HPSC, EMRS — use PRT, TGT and PGT directly.

begin;

alter table public.exam_levels
  add column if not exists label jsonb;

comment on column public.exam_levels.label is
  'What this exam calls this level, shown in the chooser. Null falls back to the level''s own name.';

-- The state TETs: two papers, numbered.
update public.exam_levels set label = case level_id
    when 'prt' then '{"en":"Paper 1","hi":"पेपर 1"}'::jsonb
    when 'tgt' then '{"en":"Paper 2","hi":"पेपर 2"}'::jsonb
  end
where exam_id in (
  'uptet','aptet','gtet','hptet','jtet','kartet','ktet','mahatet','otet',
  'pstet','sktet','tntet','tstet','utet','bihartet','wbtet'
) and level_id in ('prt','tgt');

-- CTET numbers its papers in Roman, which is how CBSE prints them.
update public.exam_levels set label = case level_id
    when 'prt' then '{"en":"Paper I","hi":"पेपर I"}'::jsonb
    when 'tgt' then '{"en":"Paper II","hi":"पेपर II"}'::jsonb
  end
where exam_id = 'ctet' and level_id in ('prt','tgt');

-- REET calls them levels.
update public.exam_levels set label = case level_id
    when 'prt' then '{"en":"Level 1","hi":"स्तर 1"}'::jsonb
    when 'tgt' then '{"en":"Level 2","hi":"स्तर 2"}'::jsonb
  end
where exam_id = 'reet' and level_id in ('prt','tgt');

-- MPTET counts its vargs downwards: Varg 3 is primary, Varg 1 senior.
update public.exam_levels set label = case level_id
    when 'prt' then '{"en":"Varg 3","hi":"वर्ग 3"}'::jsonb
    when 'tgt' then '{"en":"Varg 2","hi":"वर्ग 2"}'::jsonb
    when 'pgt' then '{"en":"Varg 1","hi":"वर्ग 1"}'::jsonb
  end
where exam_id = 'mptet' and level_id in ('prt','tgt','pgt');

-- Everything still unlabelled is a board that uses PRT/TGT/PGT itself, so the
-- level's own name is already the right one and the column stays null.

commit;
