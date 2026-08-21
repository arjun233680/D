# Adhyapak project instructions

## Repository
- This is an npm workspace monorepo.
- `apps/mobile` is the Expo/React Native app. It is the product; work happens here.
- `apps/_web-paused` is the Next.js web app, paused. Not a workspace, not in the
  deploy, not in any check — `npm install` does not even fetch its dependencies.
  Leave it alone unless the pause is being lifted.

  Resuming it is two edits: rename the folder back to `apps/web`, and add it to
  `workspaces` in the root `package.json`. Its own ten column-mapping tests come
  back with it; they cover `lib/importPipeline.ts`, which is web-only code, and
  they are not running today.

  Because it is out of the checks, a change to `packages/core` can break it
  without anything saying so. Expect that on the day it is resumed, and typecheck
  it first thing.
- `packages/core` contains shared TypeScript domain types, theme, data, and engines.
- `supabase` contains database migrations, policies, and seed/import scripts.

## Commands
- Install dependencies from the repository root: `npm install`
- Start the app: `npm run dev:mobile` (Metro on `http://localhost:8081`)
- Look at it phone-shaped: `npm run preview` (`http://localhost:8090`) — the app
  is responsive, so a desktop browser window shows a phone-width column, and
  this frames it at a real handset size with a device picker.
- Screenshot and measure every screen: `npm run screens` — drives Chrome over
  the DevTools protocol at a true handset viewport and reports any document
  wider than the screen or tap target under 40pt. See the file header for why
  `--window-size` cannot do this.
- `npm run dev:web` and `npm run build` are gone. They pointed at the paused app
  and would now fail to resolve a workspace that is not there.
- Typecheck all workspaces: `npm run typecheck`
- Lint all workspaces: `npm run lint`
- Test all workspaces: `npm run test`
- Verify content: `npm run content:verify`

## Seeing screens behind the login gate
Everything past sign-in is scoped to a signed-in learner, and row-level security
answers "nothing" without a session. `EXPO_PUBLIC_DEV_PREVIEW=1` in
`apps/mobile/.env` opens the gate and `lib/learner.ts` stands in the three
onboarding answers. Only those three — all content still comes from the database
over the anon key, and nothing is written. `.env` is git-ignored, so the flag
cannot reach the live build.

## Development rules
- Prefer existing patterns and keep changes focused.
- Look at a screen before calling it done. Every visual bug in this app so far
  was invisible in the source and obvious in a screenshot — icons that could not
  take their colour, a grid that silently collapsed to one column, an arrow that
  had disappeared from every button. `npm run screens` exists for this.
- Shared behavior used by web and mobile belongs in `packages/core` when platform APIs are not required.
- Preserve bilingual strings as `{ en: string; hi: string }`; do not add English-only user-facing copy.
- Keep design tokens in `packages/core/src/theme.ts` as the source of truth.
- Do not edit applied Supabase migrations; add a new migration for schema changes.
- Before finishing, run the narrowest relevant check, then `npm run typecheck` when shared code or types change.
- Do not commit changes unless explicitly requested.
