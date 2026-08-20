'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  fetchLearnerExamIds,
  fetchLearnerLevelIds,
  fetchLearnerSubjects,
  listExams,
  listLevelSubjects,
  listLevels,
  type Exam,
  type Level,
  type LevelSubject,
} from '@adhyapak/core';

/**
 * The one selection a preparation screen is about — "HTET TGT Science".
 *
 * Which level is read from `?level=`, not from a path segment, because the site
 * is a static export: a dynamic route would need every level prerendered at
 * build time, and the levels live in the database where a build cannot see
 * them. A query string costs nothing and stays correct when a level is added.
 *
 * Falls back to the learner's first level when the parameter is missing or
 * names a level they do not sit, so a stale bookmark lands somewhere real
 * rather than on an empty screen.
 */
export interface Selection {
  exam?: Exam;
  level: Level;
  subject?: LevelSubject;
}

export const useSelection = (): {
  selection: Selection | null;
  /** Every selection the learner has, for screens that let them pick one. */
  selections: Selection[];
  loading: boolean;
} => {
  const router = useRouter();
  const params = useSearchParams();
  const wanted = params.get('level');

  const [selection, setSelection] = useState<Selection | null>(null);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    void (async () => {
      const [examIds, levelIds, subjects, levels, exams] = await Promise.all([
        fetchLearnerExamIds(),
        fetchLearnerLevelIds(),
        fetchLearnerSubjects(),
        listLevels(),
        listExams(),
      ]);
      if (!live) return;

      // Nothing chosen: the chooser works out which question is outstanding.
      if (examIds.length === 0 || levelIds.length === 0) {
        router.replace('/onboarding/exams');
        return;
      }

      const mine = levels.filter((l) => levelIds.includes(l.id));
      const level = mine.find((l) => l.id === wanted) ?? mine[0];
      if (!level) {
        router.replace('/onboarding/level');
        return;
      }

      /*
       * Every level the learner sits, each with its own subject — the PYQ
       * screen offers these as a choice when there is more than one, because
       * "HTET TGT Science" and "HTET PGT Chemistry" are two different sets of
       * papers and picking silently for them would open the wrong one.
       */
      const offersByLevel = await Promise.all(
        mine.map(async (l) => {
          const pick = subjects.find((s) => s.levelId === l.id);
          if (!pick) return { level: l, subject: undefined as LevelSubject | undefined };
          const offers = await listLevelSubjects(l.id);
          return { level: l, subject: offers.find((o) => o.subjectId === pick.subjectId) };
        }),
      );
      if (!live) return;

      const mineExams = exams.filter((e) => examIds.includes(e.id));
      const all: Selection[] = offersByLevel.map((o, i) => ({
        // Pairing an exam to a level in order is a presentation choice, not a
        // claim — see the same note on the dashboard.
        exam: mineExams[i % Math.max(mineExams.length, 1)],
        level: o.level,
        subject: o.subject,
      }));

      setSelections(all);
      setSelection(all.find((s) => s.level.id === level.id) ?? all[0] ?? null);
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [router, wanted]);

  return { selection, selections, loading };
};

/** "HTET TGT Science" — the line every preparation screen is titled with. */
export const selectionTitle = (s: Selection, subjectName?: string): string =>
  [s.exam?.shortName, s.level.name, subjectName].filter(Boolean).join(' ');
