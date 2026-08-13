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
export * from './engine/format';

export { theme } from './theme';

// Backend access. Screens call these instead of importing seed arrays directly
// once credentials are present; without them the same calls serve bundled content.
export * from './api/client';
export * from './api/repository';
