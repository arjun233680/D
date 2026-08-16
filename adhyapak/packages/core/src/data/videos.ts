import type { Video } from '../types';

/**
 * Demo sources point at Google's public sample bucket so the player is real
 * rather than mocked. Uploads made through the Educator Studio replace `src`
 * with an object URL of the same shape.
 */
const SAMPLE = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const SAMPLE_2 = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4';

/**
 * No bundled lessons.
 *
 * There were ten, and every one of them played a Big Buck Bunny or Elephants
 * Dream sample clip: the titles described classes that had never been taught,
 * attributed to educators who did not exist. A learner opening "Piaget in 12
 * minutes" got an animated rabbit.
 *
 * The list is empty rather than deleted because the shape is what real lessons
 * will arrive into — through the Studio, or from `videos` in Postgres.
 */
export const VIDEOS: Video[] = [];

export const VIDEO_BY_ID = new Map(VIDEOS.map((v) => [v.id, v]));
export const getVideo = (id: string) => VIDEO_BY_ID.get(id);
export const videosByExam = (examId: string) => VIDEOS.filter((v) => v.examIds.includes(examId));
export const videosBySubject = (subjectId: string) => VIDEOS.filter((v) => v.subjectId === subjectId);
export const liveVideos = () => VIDEOS.filter((v) => v.isLive);
