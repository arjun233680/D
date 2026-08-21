'use client';

import { useSyncExternalStore } from 'react';

/**
 * False on the server and during hydration, true once the page is live.
 *
 * The website is a static export: its HTML is generated once at build time and
 * then served for days. Anything rendered from the current clock therefore
 * differs between the two — the build's "now" is baked into the HTML, the
 * reader's "now" is whatever it is when they open the page — and React treats
 * that as a hydration failure, discards the server-rendered subtree and
 * re-renders it. The doubts feed did exactly this: "5 दिन पहले" in the HTML,
 * "12 दिन पहले" in the browser, error #418 into a console nobody watches.
 *
 * `useSyncExternalStore` is the API for precisely this — it takes a separate
 * server snapshot — so the divergence is declared rather than smuggled in
 * through an effect. It also keeps the store from ever changing: `subscribe`
 * registers nothing, because "mounted" happens once and never goes back.
 *
 * Only for values that genuinely depend on the current time. A date fixed in
 * the data does not need it — `formatDate` is deterministic and safe to render
 * on both sides.
 */
const subscribe = () => () => {};

export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
