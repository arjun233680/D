import type { CurrentAffair, Doubt, User } from '../types';

export const CURRENT_AFFAIRS: CurrentAffair[] = [
  {
    id: 'ca-001',
    title: { en: 'NCTE releases revised norms for the 4-year ITEP programme', hi: 'NCTE ने 4 वर्षीय ITEP कार्यक्रम हेतु संशोधित मानदंड जारी किए' },
    summary: {
      en: 'The Integrated Teacher Education Programme is set to become the minimum qualification for school teaching by 2030 under NEP 2020. Expect questions on its duration, stages covered and entrance route.',
      hi: 'NEP 2020 के अंतर्गत एकीकृत शिक्षक शिक्षा कार्यक्रम 2030 तक विद्यालयी शिक्षण की न्यूनतम योग्यता बनने जा रहा है। इसकी अवधि, कवर की गई अवस्थाओं तथा प्रवेश मार्ग पर प्रश्न अपेक्षित हैं।',
    },
    date: '2026-08-11',
    tags: [{ en: 'Education Policy', hi: 'शिक्षा नीति' }],
    examIds: ['ctet', 'kvs', 'nvs', 'dsssb', 'htet', 'reet'],
  },
  {
    id: 'ca-002',
    title: { en: 'ASER-style survey reports gains in foundational numeracy', hi: 'ASER शैली सर्वेक्षण में आधारभूत संख्यात्मकता में सुधार' },
    summary: {
      en: 'Foundational Literacy and Numeracy under NIPUN Bharat continues to be a favourite source for pedagogy and policy questions across TET papers.',
      hi: 'निपुण भारत के अंतर्गत आधारभूत साक्षरता एवं संख्यात्मकता TET पेपरों में शिक्षाशास्त्र एवं नीति संबंधी प्रश्नों का प्रिय स्रोत बनी हुई है।',
    },
    date: '2026-08-09',
    tags: [{ en: 'NIPUN Bharat', hi: 'निपुण भारत' }, { en: 'FLN', hi: 'FLN' }],
    examIds: ['ctet', 'reet', 'uptet', 'bihartet', 'mptet'],
  },
  {
    id: 'ca-003',
    title: { en: 'CTET certificate validity confirmed as lifetime', hi: 'CTET प्रमाणपत्र की वैधता आजीवन पुष्ट' },
    summary: {
      en: 'The seven-year validity was extended to lifetime with retrospective effect from 2011. A direct one-mark question in several state TETs.',
      hi: 'सात वर्ष की वैधता को 2011 से पूर्वप्रभावी रूप से आजीवन कर दिया गया। कई राज्य TET में यह सीधा एक अंक का प्रश्न है।',
    },
    date: '2026-08-04',
    tags: [{ en: 'CTET', hi: 'CTET' }],
    examIds: ['ctet', 'htet', 'uptet'],
  },
  {
    id: 'ca-004',
    title: { en: 'PM SHRI schools expanded to more districts', hi: 'PM श्री विद्यालयों का और जिलों में विस्तार' },
    summary: {
      en: 'PM SHRI (PM Schools for Rising India) upgrades existing schools as exemplar NEP-aligned institutions. Scheme names and launch years are standard GK questions.',
      hi: 'PM श्री (PM Schools for Rising India) विद्यमान विद्यालयों को NEP आधारित आदर्श संस्थानों के रूप में उन्नत करता है। योजनाओं के नाम एवं आरंभ वर्ष सामान्य GK प्रश्न हैं।',
    },
    date: '2026-07-29',
    tags: [{ en: 'Schemes', hi: 'योजनाएँ' }],
    examIds: ['kvs', 'nvs', 'dsssb', 'emrs', 'hssc-tgt-pgt'],
  },
];

export const DOUBTS: Doubt[] = [
  {
    id: 'doubt-001',
    askedBy: 'Kavita M.',
    avatar: '🙋‍♀️',
    subjectId: 'cdp',
    question: {
      en: 'In conservation tasks, is it egocentrism or centration that stops a 5-year-old from answering correctly?',
      hi: 'संरक्षण कार्यों में 5 वर्ष के बालक को सही उत्तर देने से अहंकेंद्रितता रोकती है या केंद्रीकरण?',
    },
    askedAt: '2026-08-12T09:20:00+05:30',
    upvotes: 148,
    answers: [
      {
        id: 'ans-001',
        by: 'Anjali Verma',
        isEducator: true,
        body: {
          en: 'Centration. The child focuses on one dimension — usually the height of the glass — and ignores width. Egocentrism is the inability to take another person\'s viewpoint, tested by the three-mountain task, not the conservation task.',
          hi: 'केंद्रीकरण। बालक एक ही आयाम पर ध्यान देता है — प्रायः गिलास की ऊँचाई — तथा चौड़ाई की उपेक्षा करता है। अहंकेंद्रितता दूसरे के दृष्टिकोण को न समझ पाना है, जिसकी जाँच त्रि-पर्वत कार्य से होती है, संरक्षण कार्य से नहीं।',
        },
        answeredAt: '2026-08-12T10:05:00+05:30',
        upvotes: 213,
      },
    ],
  },
  {
    id: 'doubt-002',
    askedBy: 'Rohit S.',
    avatar: '🙋‍♂️',
    subjectId: 'math',
    question: {
      en: 'For DSSSB, should I attempt every question given the 0.25 negative marking?',
      hi: 'DSSSB में 0.25 ऋणात्मक अंकन को देखते हुए क्या मुझे हर प्रश्न करना चाहिए?',
    },
    askedAt: '2026-08-11T18:40:00+05:30',
    upvotes: 96,
    answers: [
      {
        id: 'ans-002',
        by: 'Neha Bansal',
        isEducator: true,
        body: {
          en: 'Attempt when you can eliminate at least two options — then the expected value is positive. A blind guess across four options loses marks on average. Pure guessing is the single biggest score leak in DSSSB.',
          hi: 'जब आप कम से कम दो विकल्प हटा सकें तभी प्रयास करें — तब अपेक्षित मान धनात्मक होता है। चार विकल्पों में अंधा अनुमान औसतन अंक घटाता है। DSSSB में शुद्ध अनुमान ही सबसे बड़ा स्कोर नुकसान है।',
        },
        answeredAt: '2026-08-11T20:15:00+05:30',
        upvotes: 174,
      },
    ],
  },
  {
    id: 'doubt-003',
    askedBy: 'Sneha P.',
    avatar: '👩‍🎓',
    subjectId: 'evs',
    question: {
      en: 'How much of EVS is pedagogy in CTET Paper 1?',
      hi: 'CTET पेपर 1 में EVS का कितना भाग शिक्षाशास्त्र होता है?',
    },
    askedAt: '2026-08-10T14:10:00+05:30',
    upvotes: 71,
    answers: [
      {
        id: 'ans-003',
        by: 'Priya Sharma',
        isEducator: true,
        body: {
          en: 'Roughly 10 of the 30 questions are pedagogy — concept, scope, approaches, activities, experimentation, CCE and teaching material. It is the most predictable third of the section.',
          hi: 'लगभग 30 में से 10 प्रश्न शिक्षाशास्त्र के होते हैं — अवधारणा, क्षेत्र, उपागम, गतिविधियाँ, प्रयोग, CCE तथा शिक्षण सामग्री। यह खंड का सर्वाधिक पूर्वानुमेय एक-तिहाई भाग है।',
        },
        answeredAt: '2026-08-10T15:30:00+05:30',
        upvotes: 118,
      },
    ],
  },
];

/** The signed-in demo learner. Replace with the authenticated user when a backend exists. */
export const DEMO_USER: User = {
  id: 'user-demo',
  name: 'Arjun',
  avatar: '🧑‍🎓',
  role: 'learner',
  email: 'creativelearningk12@gmail.com',
  goalExamId: 'ctet',
  targetPaperId: 'ctet-p1',
  language: 'hi',
  state: 'Haryana',
  joinedAt: '2026-06-01',
  streakDays: 12,
  activeDates: [
    '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06',
    '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11',
    '2026-08-12', '2026-08-13',
  ],
  subscription: 'free',
  bookmarkedQuestionIds: ['q-cdp-007', 'q-math-007'],
  savedNoteIds: ['note-cdp-01', 'note-gk-01'],
  enrolledBatchIds: ['batch-ctet-p1-foundation'],
};
