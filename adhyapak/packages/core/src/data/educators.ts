import type { Educator } from '../types';

/**
 * `avatar` is an emoji rather than a remote image so both apps render
 * identically with zero network dependency. Swap for a URL when a CDN exists.
 */
/**
 * No bundled educators.
 *
 * Anjali Verma, Rakesh Yadav and five others were invented — names, faces,
 * degrees from real universities, and bios describing how they teach. They were
 * shown to learners as the people behind the lessons.
 *
 * A real educator arrives by signing up and being given the role in `profiles`;
 * the Studio attributes uploads to whoever is signed in.
 */
export const EDUCATORS: Educator[] = [];

export const EDUCATOR_BY_ID = new Map(EDUCATORS.map((e) => [e.id, e]));
export const getEducator = (id: string) => EDUCATOR_BY_ID.get(id);
