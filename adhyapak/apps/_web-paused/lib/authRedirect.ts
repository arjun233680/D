/**
 * Where Supabase should send the browser back to after a provider sign-in.
 *
 * Two things have to be true at once, and getting either wrong breaks a
 * different environment:
 *
 *   The origin has to come from the running page, because this build is served
 *   from `localhost:3000` in development and from `arjun233680.github.io` in
 *   production, and a hard-coded one would send developers to the live site to
 *   finish signing in to their local copy.
 *
 *   The `basePath` has to be included, because Pages serves the website under
 *   `/D/web` rather than at the root. Returning to the bare origin lands on the
 *   Expo build — or on a 404 — carrying the sign-in code that was meant for here.
 *
 * `process.env.NEXT_PUBLIC_BASE_PATH` is written as that literal expression for
 * the same reason `api/client.ts` insists on it: Next substitutes the source
 * text at build time, so anything cleverer — a local, a destructure — leaves the
 * bundler nothing to match and silently yields an empty base path.
 *
 * Whatever this returns must also be listed in the project's Authentication →
 * URL Configuration allowlist, or Supabase discards it and falls back to the
 * Site URL, which looks like "sign-in works but always lands on the home page".
 */
export const authRedirectUrl = (): string => {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  // Trailing slash to match `trailingSlash: true` in next.config.ts: Pages
  // serves `/D/web/` as index.html, while `/D/web` is a redirect that some
  // providers will not follow with the query string intact.
  return `${window.location.origin}${basePath}/`;
};
