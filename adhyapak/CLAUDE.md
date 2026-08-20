# Adhyapak project instructions

## Repository
- This is an npm workspace monorepo.
- `apps/web` is the Next.js web/PWA app.
- `apps/mobile` is the Expo/React Native app.
- `packages/core` contains shared TypeScript domain types, theme, data, and engines.
- `supabase` contains database migrations, policies, and seed/import scripts.

## Commands
- Install dependencies from the repository root: `npm install`
- Start web: `npm run dev:web` (default `http://localhost:3000`)
- Start mobile: `npm run dev:mobile`
- Build web: `npm run build`
- Typecheck all workspaces: `npm run typecheck`
- Lint all workspaces: `npm run lint`
- Test all workspaces: `npm run test`
- Verify content: `npm run content:verify`

## Development rules
- Prefer existing patterns and keep changes focused.
- Shared behavior used by web and mobile belongs in `packages/core` when platform APIs are not required.
- Preserve bilingual strings as `{ en: string; hi: string }`; do not add English-only user-facing copy.
- Keep design tokens in `packages/core/src/theme.ts` as the source of truth.
- Do not edit applied Supabase migrations; add a new migration for schema changes.
- Before finishing, run the narrowest relevant check, then `npm run typecheck` when shared code or types change.
- Do not commit changes unless explicitly requested.
