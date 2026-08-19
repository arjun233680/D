-- ---------------------------------------------------------------------------
-- 0021 — some levels have no subject to choose
--
-- Onboarding asked every level "which subject?", including PRT. That question
-- has no answer at primary: a primary teacher teaches the whole paper — child
-- development, maths, environmental studies and both languages — and does not
-- apply in one of them. 0020 already said as much in a comment and then asked
-- anyway; the six rows under `prt` in `level_subjects` are the paper's blocks,
-- not a choice between them.
--
-- So whether a level has a subject question becomes a property of the level,
-- in the table, rather than a level id spelled out in the client. If a state
-- introduces a level that works the same way, it is an update here and no
-- deploy.
--
-- The `prt` rows in `level_subjects` are deliberately left in place. They are a
-- true statement about what the primary paper covers, other screens can use
-- them, and deleting content to change a question's flow would be throwing away
-- the wrong thing.
--
-- Safe to paste whole into the Supabase SQL editor. Re-running is a no-op.
-- ---------------------------------------------------------------------------

begin;

alter table levels
  add column if not exists requires_subject boolean not null default true;

comment on column levels.requires_subject is
  'False where the level is examined as one whole paper and there is nothing for the learner to choose — primary teaching. Onboarding skips the subject step for these.';

update levels set requires_subject = false where id = 'prt';

commit;
