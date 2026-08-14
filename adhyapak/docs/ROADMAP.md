# Roadmap

## Done

**Phase 1 — content library.** Domain model with units/subtopics, structured
PYQ provenance, a draft→review→published→archived lifecycle, validation, CSV
import, and the Postgres schema behind it (migrations 0001–0006).

**Phase 2 — the repository boundary.** Every learner screen reads through
`repository.ts`; published-only is enforced there rather than in screens; every
database-backed screen has loading, empty and error states with retry.

**Phase 3 — Studio.** Bulk import wizard, duplicate protection by normalised
fingerprint, draft review with bulk publish through the database's own
`set_question_status`, and PYQ analytics with data-derived frequency bands
(migration 0007).

**Phase 4 — backend activation.** Deploy workflow passes `SUPABASE_URL` and
`SUPABASE_ANON_KEY` into both builds; `docs/BACKEND-SETUP.md` is the runbook;
`seed/test-content.sql` is a safe, clearly-marked verification dataset. UI
fixes: favicon, chip-rail clipping, sticky test CTA. ESLint replaced the
removed `next lint`.

**Phase 5 — Excel import.** `.xlsx` workbooks through the same pipeline as CSV,
via a dependency-free reader in `@adhyapak/core`. Multi-sheet picker, header
detection below title rows, a downloadable starter workbook, bilingual parse
errors. 20,000 rows parse and validate in ~1.2 s — measured, see
[IMPORTING.md](IMPORTING.md).

## Blocked on credentials

The live site still runs on bundled content. Everything needed is in place and
verified against Postgres 16; what is missing is a Supabase project and two
repository secrets. `docs/BACKEND-SETUP.md`, ten minutes.

## Next, in rough priority

1. **Per-question draft editing.** Today a draft can be published or archived,
   not corrected. Fixing a typo means re-importing.
2. **Import history screen.** Batches are recorded and queryable; nothing
   displays them.
3. **PDF import.** The pipeline takes plain rows, so a PDF extractor plugs in
   exactly where the CSV and `.xlsx` parsers do. Extraction quality is the hard
   part, not the wiring.
4. **Batch scheduling backend.** The one feature still served from bundled
   content on both branches.
5. **Bundle size.** The learner app is a single ~1.8 MB JS bundle; on a slow
   connection the first load is heavy.
