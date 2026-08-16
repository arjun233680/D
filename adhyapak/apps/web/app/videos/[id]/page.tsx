import { VIDEOS } from '@adhyapak/core';
import View from './View';

/**
 * Server wrapper for the static export.
 *
 * `generateStaticParams` cannot live in a client component, so the page that
 * enumerates the routes is separate from the one that renders them. The params
 * promise is handed straight through — the view is unchanged.
 */

/**
 * With `output: export`, a dynamic route whose `generateStaticParams` returns an
 * empty array fails the build outright — and the bundled videos are gone, so it
 * returns exactly that. One placeholder id keeps the route in the build; the
 * view renders its not-found state for it, as it does for any id it cannot
 * resolve, so nothing reachable points at it.
 *
 * This is also why videos that exist only in Postgres get no prerendered
 * detail page: the params are collected at build time from the bundle. That is
 * a property of the static export, not of this route.
 */
export function generateStaticParams() {
  const ids = VIDEOS.map((v) => ({ id: v.id }));
  return ids.length ? ids : [{ id: 'none' }];
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <View params={params} />;
}
