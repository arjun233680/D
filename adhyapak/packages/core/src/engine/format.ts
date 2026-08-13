import type { Bilingual, Lang } from '../types';

/** Indian numbering: 4.8L, 2.4Cr — how every Indian ed-tech app shows counts. */
export const formatCount = (n: number): string => {
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 1)}Cr`;
  if (n >= 100_000) return `${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)}L`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(n);
};

/** mm:ss, or h:mm:ss past an hour — used by the exam timer. */
export const formatClock = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (v: number) => String(v).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/** "1h 24m" / "45m" / "50s" — for durations shown in cards. */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
};

export const formatDate = (iso: string, lang: Lang): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/** "2 days ago" / "2 दिन पहले" for feeds and doubts. */
export const timeAgo = (iso: string, lang: Lang, now: Date = new Date()): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Math.max(0, now.getTime() - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return lang === 'hi' ? 'अभी' : 'just now';
  if (mins < 60) return lang === 'hi' ? `${mins} मिनट पहले` : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === 'hi' ? `${hrs} घंटे पहले` : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return lang === 'hi' ? `${days} दिन पहले` : `${days}d ago`;
  const months = Math.floor(days / 30);
  return lang === 'hi' ? `${months} माह पहले` : `${months}mo ago`;
};

export const t = (text: Bilingual, lang: Lang): string => text[lang] || text.en;

/** Static UI strings. Screens never hard-code a user-facing word. */
export const UI = {
  appName: { en: 'Adhyapak', hi: 'अध्यापक' },
  tagline: {
    en: 'India\'s dedicated app for teaching exams',
    hi: 'शिक्षक भर्ती परीक्षाओं हेतु भारत का समर्पित ऐप',
  },
  home: { en: 'Home', hi: 'होम' },
  explore: { en: 'Explore', hi: 'खोजें' },
  batches: { en: 'Batches', hi: 'बैच' },
  practice: { en: 'Practice', hi: 'अभ्यास' },
  tests: { en: 'Test Series', hi: 'टेस्ट सीरीज़' },
  notes: { en: 'Notes', hi: 'नोट्स' },
  videos: { en: 'Videos', hi: 'वीडियो' },
  profile: { en: 'Profile', hi: 'प्रोफ़ाइल' },
  studio: { en: 'Educator Studio', hi: 'एजुकेटर स्टूडियो' },
  startTest: { en: 'Start Test', hi: 'टेस्ट आरंभ करें' },
  resumeTest: { en: 'Resume Test', hi: 'टेस्ट जारी रखें' },
  submit: { en: 'Submit Test', hi: 'टेस्ट सबमिट करें' },
  next: { en: 'Save & Next', hi: 'सहेजें एवं अगला' },
  previous: { en: 'Previous', hi: 'पिछला' },
  markReview: { en: 'Mark for Review', hi: 'समीक्षा हेतु चिह्नित करें' },
  clear: { en: 'Clear Response', hi: 'उत्तर हटाएँ' },
  answered: { en: 'Answered', hi: 'उत्तरित' },
  notAnswered: { en: 'Not Answered', hi: 'अनुत्तरित' },
  notVisited: { en: 'Not Visited', hi: 'नहीं देखा' },
  marked: { en: 'Marked', hi: 'चिह्नित' },
  answeredMarked: { en: 'Answered & Marked', hi: 'उत्तरित एवं चिह्नित' },
  score: { en: 'Score', hi: 'स्कोर' },
  rank: { en: 'Rank', hi: 'रैंक' },
  accuracy: { en: 'Accuracy', hi: 'शुद्धता' },
  percentile: { en: 'Percentile', hi: 'पर्सेंटाइल' },
  correct: { en: 'Correct', hi: 'सही' },
  incorrect: { en: 'Incorrect', hi: 'गलत' },
  skipped: { en: 'Skipped', hi: 'छोड़े गए' },
  qualified: { en: 'Qualified', hi: 'उत्तीर्ण' },
  notQualified: { en: 'Not Qualified', hi: 'अनुत्तीर्ण' },
  solution: { en: 'Solution', hi: 'हल' },
  explanation: { en: 'Explanation', hi: 'व्याख्या' },
  viewSolutions: { en: 'View Solutions', hi: 'हल देखें' },
  reattempt: { en: 'Reattempt', hi: 'पुनः प्रयास' },
  free: { en: 'Free', hi: 'निःशुल्क' },
  plus: { en: 'Plus', hi: 'प्लस' },
  iconic: { en: 'Iconic', hi: 'आइकॉनिक' },
  live: { en: 'LIVE', hi: 'लाइव' },
  enroll: { en: 'Enrol Now', hi: 'अभी नामांकन करें' },
  enrolled: { en: 'Enrolled', hi: 'नामांकित' },
  streak: { en: 'day streak', hi: 'दिन की श्रृंखला' },
  changeGoal: { en: 'Change Goal', hi: 'लक्ष्य बदलें' },
  selectGoal: { en: 'Select your exam goal', hi: 'अपना परीक्षा लक्ष्य चुनें' },
  upload: { en: 'Upload', hi: 'अपलोड करें' },
  bookmark: { en: 'Bookmark', hi: 'बुकमार्क' },
  download: { en: 'Download', hi: 'डाउनलोड' },
  search: { en: 'Search exams, notes, topics…', hi: 'परीक्षा, नोट्स, विषय खोजें…' },
} as const satisfies Record<string, Bilingual>;
