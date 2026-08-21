import { Suspense } from 'react';
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
  return SUBJECTS.map((s) => ({ subjectId: s.id }));
}

export default function Page({ params }: { params: Promise<{ subjectId: string }> }) {
  // The view reads `?all=1` with useSearchParams, which needs a Suspense
  // boundary in an exported build.
  return (
    <Suspense fallback={null}>
      <View params={params} />
    </Suspense>
  );
}
