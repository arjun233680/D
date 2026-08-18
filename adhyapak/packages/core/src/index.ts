/**
 * @adhyapak/core — the single source of truth shared by the web app and the
 * mobile app. Screens import from here and nowhere else, so swapping seed data
 * for a real API is a change in this package alone.
 */

export * from './types';

export * from './data/subjects';
export * from './data/exams';
export * from './data/educators';
export * from './data/questions';
export * from './data/videos';
export * from './data/notes';
export * from './data/batches';
export * from './data/tests';
export * from './data/feeds';

export * from './engine/test-engine';
export * from './engine/practice';
export * from './engine/pyq-filter';
export * from './engine/pyq-modes';
export * from './engine/solutions';
export * from './engine/format';
export * from './engine/briefing';

export * from './pdf';

// The content library: how content is stored, checked and imported. Screens use
// `Question`/`Note` from ./types; these shapes sit behind the repository.
export * from './content/types';
export * from './content/validation';
export * from './content/import';
export * from './content/duplicates';
export * from './content/xlsx';
export * from './content/htet-topic-map';

export { theme, examTheme } from './theme';
export type { Theme, ExamTheme } from './theme';

// Backend access. Screens call these instead of importing seed arrays directly
// once credentials are present; without them the same calls serve bundled content.
export * from './api/client';
// Authentication. The only module either app may use for supabase.auth.
export * from './api/auth';
export * from './api/repository';
export * from './api/attempt-sync';
