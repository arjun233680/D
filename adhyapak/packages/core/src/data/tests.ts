import type { Test, TestSection } from '../types';
import { QUESTIONS } from './questions';
import { getTopic } from './subjects';

/**
 * Tests are composed from the live question bank rather than hard-coded id
 * lists, so every question added to the bank automatically deepens the mocks.
 * `take` returns the first n ids for a subject, keeping composition deterministic.
 */
const take = (subjectId: string, n: number): string[] =>
  QUESTIONS.filter((q) => q.topicId !== undefined && getTopic(q.topicId)?.subjectId === subjectId)
    .slice(0, n)
    .map((q) => q.id);

const section = (id: string, en: string, hi: string, subjectId: string, n: number): TestSection => ({
  id,
  name: { en, hi },
  subjectId,
  questionIds: take(subjectId, n),
});

const STANDARD_INSTRUCTIONS = [
  { en: 'The timer starts the moment you begin and does not pause.', hi: 'टाइमर आरंभ करते ही चालू हो जाता है तथा रुकता नहीं है।' },
  { en: 'You may move between sections freely and change any answer before submitting.', hi: 'आप खंडों के बीच स्वतंत्र रूप से जा सकते हैं तथा सबमिट करने से पूर्व कोई भी उत्तर बदल सकते हैं।' },
  { en: 'Use "Mark for Review" to flag a question you want to return to.', hi: 'जिस प्रश्न पर लौटना हो उसे "समीक्षा हेतु चिह्नित करें" से चिह्नित करें।' },
  { en: 'The paper is submitted automatically when the time ends.', hi: 'समय समाप्त होते ही पेपर स्वतः सबमिट हो जाता है।' },
  { en: 'Switch between Hindi and English at any time — your answers are preserved.', hi: 'कभी भी हिंदी एवं अंग्रेज़ी के बीच बदलें — आपके उत्तर सुरक्षित रहेंगे।' },
];

export const TESTS: Test[] = [
  {
    id: 'test-ctet-p1-mock-1',
    title: { en: 'CTET Paper 1 — Full Mock Test 1', hi: 'CTET पेपर 1 — पूर्ण मॉक टेस्ट 1' },
    examId: 'ctet',
    paperId: 'ctet-p1',
    type: 'mock',
    durationMinutes: 45,
    marksPerQuestion: 1,
    negativeMarking: 0,
    access: 'free',
    instructions: STANDARD_INSTRUCTIONS,
    sections: [
      section('sec-cdp', 'Child Development & Pedagogy', 'बाल विकास एवं शिक्षाशास्त्र', 'cdp', 15),
      section('sec-hindi', 'Language I — Hindi', 'भाषा I — हिंदी', 'hindi', 6),
      section('sec-eng', 'Language II — English', 'भाषा II — अंग्रेज़ी', 'english', 6),
      section('sec-math', 'Mathematics', 'गणित', 'math', 10),
      section('sec-evs', 'Environmental Studies', 'पर्यावरण अध्ययन', 'evs', 8),
    ],
  },
  {
    id: 'test-ctet-p2-mock-1',
    title: { en: 'CTET Paper 2 — Maths & Science Mock 1', hi: 'CTET पेपर 2 — गणित एवं विज्ञान मॉक 1' },
    examId: 'ctet',
    paperId: 'ctet-p2-ms',
    type: 'mock',
    durationMinutes: 35,
    marksPerQuestion: 1,
    negativeMarking: 0,
    access: 'free',
    instructions: STANDARD_INSTRUCTIONS,
    sections: [
      section('sec-cdp', 'Child Development & Pedagogy', 'बाल विकास एवं शिक्षाशास्त्र', 'cdp', 10),
      section('sec-hindi', 'Language I — Hindi', 'भाषा I — हिंदी', 'hindi', 4),
      section('sec-eng', 'Language II — English', 'भाषा II — अंग्रेज़ी', 'english', 4),
      section('sec-math', 'Mathematics', 'गणित', 'math', 8),
      section('sec-sci', 'Science', 'विज्ञान', 'science', 6),
    ],
  },
  {
    id: 'test-cdp-sectional-1',
    title: { en: 'CDP Sectional Test — All Theorists', hi: 'CDP सेक्शनल टेस्ट — सभी सिद्धांतकार' },
    examId: 'ctet',
    type: 'sectional',
    durationMinutes: 15,
    marksPerQuestion: 1,
    negativeMarking: 0,
    access: 'free',
    instructions: STANDARD_INSTRUCTIONS,
    sections: [section('sec-cdp', 'Child Development & Pedagogy', 'बाल विकास एवं शिक्षाशास्त्र', 'cdp', 15)],
  },
  {
    id: 'test-reet-l1-mock-1',
    title: { en: 'REET Level 1 — Mock Test 1', hi: 'REET स्तर 1 — मॉक टेस्ट 1' },
    examId: 'reet',
    paperId: 'reet-l1',
    type: 'mock',
    durationMinutes: 40,
    marksPerQuestion: 1,
    negativeMarking: 0,
    access: 'free',
    instructions: STANDARD_INSTRUCTIONS,
    sections: [
      section('sec-cdp', 'Child Development & Pedagogy', 'बाल विकास एवं शिक्षाशास्त्र', 'cdp', 12),
      section('sec-hindi', 'Language I — Hindi', 'भाषा I — हिंदी', 'hindi', 6),
      section('sec-eng', 'Language II — English', 'भाषा II — अंग्रेज़ी', 'english', 5),
      section('sec-math', 'Mathematics', 'गणित', 'math', 8),
      section('sec-evs', 'Environmental Studies', 'पर्यावरण अध्ययन', 'evs', 8),
    ],
  },
  {
    id: 'test-htet-l1-mock-1',
    title: { en: 'HTET Level 1 — Mock Test 1', hi: 'HTET स्तर 1 — मॉक टेस्ट 1' },
    examId: 'htet',
    paperId: 'htet-l1',
    type: 'mock',
    durationMinutes: 40,
    marksPerQuestion: 1,
    negativeMarking: 0,
    access: 'free',
    instructions: STANDARD_INSTRUCTIONS,
    sections: [
      section('sec-cdp', 'Child Development & Pedagogy', 'बाल विकास एवं शिक्षाशास्त्र', 'cdp', 12),
      section('sec-lang', 'Languages — Hindi', 'भाषा — हिंदी', 'hindi', 5),
      section('sec-eng', 'Languages — English', 'भाषा — अंग्रेज़ी', 'english', 5),
      section('sec-gk', 'General Studies & Haryana GK', 'सामान्य अध्ययन एवं हरियाणा GK', 'gk', 4),
      section('sec-math', 'Mathematics', 'गणित', 'math', 8),
      section('sec-evs', 'Environmental Studies', 'पर्यावरण अध्ययन', 'evs', 6),
    ],
  },
  {
    id: 'test-uptet-p1-mock-1',
    title: { en: 'UPTET Primary — Mock Test 1', hi: 'UPTET प्राथमिक — मॉक टेस्ट 1' },
    examId: 'uptet',
    paperId: 'uptet-p1',
    type: 'mock',
    durationMinutes: 40,
    marksPerQuestion: 1,
    negativeMarking: 0,
    access: 'free',
    instructions: STANDARD_INSTRUCTIONS,
    sections: [
      section('sec-cdp', 'Child Development & Pedagogy', 'बाल विकास एवं शिक्षाशास्त्र', 'cdp', 12),
      section('sec-hindi', 'Language I — Hindi', 'भाषा I — हिंदी', 'hindi', 6),
      section('sec-eng', 'Language II — English', 'भाषा II — अंग्रेज़ी', 'english', 6),
      section('sec-math', 'Mathematics', 'गणित', 'math', 9),
      section('sec-evs', 'Environmental Studies', 'पर्यावरण अध्ययन', 'evs', 7),
    ],
  },
  {
    id: 'test-dsssb-prt-mock-1',
    title: { en: 'DSSSB PRT — Mock Test 1 (with negative marking)', hi: 'DSSSB PRT — मॉक टेस्ट 1 (ऋणात्मक अंकन सहित)' },
    examId: 'dsssb',
    paperId: 'dsssb-prt',
    type: 'mock',
    durationMinutes: 30,
    marksPerQuestion: 1,
    negativeMarking: 0.25,
    access: 'plus',
    instructions: [
      ...STANDARD_INSTRUCTIONS,
      { en: '0.25 marks are deducted for every wrong answer. Skipping costs nothing.', hi: 'प्रत्येक गलत उत्तर पर 0.25 अंक काटे जाते हैं। प्रश्न छोड़ने पर कोई हानि नहीं।' },
    ],
    sections: [
      section('sec-gk', 'General Awareness', 'सामान्य ज्ञान', 'gk', 4),
      section('sec-rea', 'General Intelligence & Reasoning', 'सामान्य बुद्धि एवं तर्कशक्ति', 'reasoning', 4),
      section('sec-math', 'Arithmetical Ability', 'अंकगणितीय योग्यता', 'math', 6),
      section('sec-hindi', 'Hindi Language', 'हिंदी भाषा', 'hindi', 4),
      section('sec-eng', 'English Language', 'अंग्रेज़ी भाषा', 'english', 4),
      section('sec-cdp', 'Teaching Methodology (Section B)', 'शिक्षण विधि (खंड B)', 'cdp', 10),
    ],
  },
  {
    id: 'test-kvs-prt-mock-1',
    title: { en: 'KVS PRT — Mock Test 1', hi: 'KVS PRT — मॉक टेस्ट 1' },
    examId: 'kvs',
    paperId: 'kvs-prt',
    type: 'mock',
    durationMinutes: 35,
    marksPerQuestion: 1,
    negativeMarking: 0,
    access: 'plus',
    instructions: STANDARD_INSTRUCTIONS,
    sections: [
      section('sec-eng', 'General English', 'सामान्य अंग्रेज़ी', 'english', 4),
      section('sec-hindi', 'General Hindi', 'सामान्य हिंदी', 'hindi', 4),
      section('sec-gk', 'General Knowledge & Current Affairs', 'सामान्य ज्ञान एवं समसामयिकी', 'gk', 4),
      section('sec-rea', 'Reasoning Ability', 'तर्कशक्ति', 'reasoning', 4),
      section('sec-comp', 'Computer Literacy', 'कंप्यूटर साक्षरता', 'computer', 3),
      section('sec-cdp', 'Pedagogy', 'शिक्षाशास्त्र', 'cdp', 8),
      section('sec-evs', 'Subject Concerned — EVS', 'संबंधित विषय — EVS', 'evs', 8),
    ],
  },
  {
    id: 'test-pyq-ctet-2023',
    title: { en: 'CTET Previous Year Paper — Solved', hi: 'CTET विगत वर्ष प्रश्नपत्र — हल सहित' },
    examId: 'ctet',
    paperId: 'ctet-p1',
    type: 'pyq',
    year: 2023,
    durationMinutes: 25,
    marksPerQuestion: 1,
    negativeMarking: 0,
    access: 'free',
    instructions: STANDARD_INSTRUCTIONS,
    sections: [
      {
        id: 'sec-pyq',
        name: { en: 'Previous Year Questions', hi: 'विगत वर्ष प्रश्न' },
        subjectId: 'cdp',
        questionIds: QUESTIONS.filter((q) => q.year !== undefined).map((q) => q.id),
      },
    ],
  },
  {
    id: 'test-daily-quiz',
    title: { en: "Today's Daily Quiz", hi: 'आज की दैनिक प्रश्नोत्तरी' },
    examId: 'ctet',
    type: 'daily-quiz',
    durationMinutes: 10,
    marksPerQuestion: 1,
    negativeMarking: 0,
    access: 'free',
    instructions: STANDARD_INSTRUCTIONS,
    sections: [
      {
        id: 'sec-daily',
        name: { en: 'Mixed — 10 questions', hi: 'मिश्रित — 10 प्रश्न' },
        subjectId: 'cdp',
        questionIds: [
          ...take('cdp', 3),
          ...take('math', 2),
          ...take('evs', 2),
          ...take('hindi', 1),
          ...take('english', 1),
          ...take('gk', 1),
        ],
      },
    ],
  },
];

export const TEST_BY_ID = new Map(TESTS.map((t) => [t.id, t]));
export const getTest = (id: string) => TEST_BY_ID.get(id);
export const testsByExam = (examId: string) => TESTS.filter((t) => t.examId === examId);
export const testsByType = (type: Test['type']) => TESTS.filter((t) => t.type === type);

/** Flat, section-ordered list of question ids for an attempt. */
export const testQuestionIds = (test: Test): string[] =>
  test.sections.flatMap((s) => s.questionIds);

export const testQuestionCount = (test: Test): number => testQuestionIds(test).length;

export const testMaxMarks = (test: Test): number => testQuestionCount(test) * test.marksPerQuestion;
