import { VIDEOS } from '@adhyapak/core';
import View from './View';

/**
 * Server wrapper for the static export.
 *
 * `generateStaticParams` cannot live in a client component, so the page that
 * enumerates the routes is separate from the one that renders them. The params
 * promise is handed straight through — the view is unchanged.
 */
export function generateStaticParams() {
  return VIDEOS.map((v) => ({ id: v.id }));
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <View params={params} />;
}
