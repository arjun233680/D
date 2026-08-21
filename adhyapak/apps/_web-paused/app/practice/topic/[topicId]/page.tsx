import { SUBJECTS } from '@adhyapak/core';
import View from './View';

/**
 * Server wrapper for the static export.
 *
 * `generateStaticParams` cannot live in a client component, so the page that
 * enumerates the routes is separate from the one that renders them. The params
 * promise is handed straight through — the view is unchanged.
 */
export function generateStaticParams() {
  return SUBJECTS.flatMap((s) => s.topics.map((t) => ({ topicId: t.id })));
}

export default function Page({ params }: { params: Promise<{ topicId: string }> }) {
  return <View params={params} />;
}
