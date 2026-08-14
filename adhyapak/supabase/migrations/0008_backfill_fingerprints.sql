-- ---------------------------------------------------------------------------
-- 0008 — no question without a fingerprint
--
-- 0007 added `questions.fingerprint` and the duplicate lookup that reads it,
-- but nothing filled it in for rows written by any path other than
-- `commit_import_batch` — the seed included. A null fingerprint never equals
-- anything, so `find_duplicate_fingerprints` was silently blind to all of that
-- content: re-importing a question already in the library would have been
-- accepted as new, which is the one failure duplicate detection exists to
-- prevent.
--
-- The fix is *not* a SQL implementation of the fingerprint. That was tried and
-- reverted: Postgres's `[[:alnum:]]` drops Devanagari combining marks
-- inconsistently — it kept the vowel signs in "पियाजे" but dropped the virama
-- in "निकटस्थ" — so the SQL and TypeScript answers differed, and a fingerprint
-- that is *almost* right is worse than none. The lookup would return no rows
-- and look like it worked.
--
-- So there is exactly one implementation, in TypeScript
-- (packages/core/src/content/duplicates.ts). The seed generator emits the
-- fingerprint it computes, and this migration only enforces that nothing
-- lands without one.
-- ---------------------------------------------------------------------------

-- Any pre-0008 rows that were seeded without a fingerprint. Re-running
-- `npm run seed:generate` and re-applying the seed sets the real values; this
-- clears the nulls so the constraint below can hold in the meantime, using a
-- marker that cannot collide with a real fingerprint (which always contains
-- the U+001F separator between its English and Hindi halves).
update questions
   set fingerprint = 'unfingerprinted:' || id
 where fingerprint is null;

alter table questions
  alter column fingerprint set not null;

comment on column questions.fingerprint is
  'Normalised-text key for duplicate detection. Computed by fingerprint() in '
  '@adhyapak/core — the only implementation. Never compute this in SQL: '
  'Postgres character classes and JavaScript Unicode property escapes disagree '
  'about Devanagari combining marks.';

-- A question that reaches the table without one is a bug in whatever wrote it,
-- and the constraint above turns that into an error at the write rather than a
-- silently missed duplicate months later.
