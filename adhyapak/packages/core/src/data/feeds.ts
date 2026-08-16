import type { CurrentAffair, Doubt, User } from '../types';

export const CURRENT_AFFAIRS: CurrentAffair[] = [
  {
    id: 'ca-nipun-class5',
    title: {
      en: 'NIPUN Bharat set to be extended up to Class 5',
      hi: 'निपुण भारत मिशन कक्षा 5 तक बढ़ाए जाने की तैयारी',
    },
    summary: {
      en: 'The Education Ministry proposes extending the foundational literacy and numeracy mission — currently ending in 2026-27 — up to Class 5, so children who missed the early grades are covered. PARAKH is running the Foundational Learning Study 2026; the PARAKH Rashtriya Sarvekshan 2024 placed literacy and numeracy at about 60%. Expect questions on the mission timeline, PARAKH and the FLN goal.',
      hi: 'शिक्षा मंत्रालय आधारभूत साक्षरता एवं संख्यात्मकता मिशन — जो अभी 2026-27 में समाप्त हो रहा है — को कक्षा 5 तक बढ़ाने का प्रस्ताव कर रहा है, ताकि प्रारंभिक कक्षाएँ छूट जाने वाले बालक भी सम्मिलित हों। PARAKH आधारभूत अधिगम अध्ययन 2026 संचालित कर रहा है; PARAKH राष्ट्रीय सर्वेक्षण 2024 में साक्षरता एवं संख्यात्मकता लगभग 60% रही। मिशन की समय-सीमा, PARAKH तथा FLN लक्ष्य पर प्रश्न अपेक्षित हैं।',
    },
    date: '2026-08-06',
    tags: [{ en: 'NIPUN Bharat', hi: 'निपुण भारत' }, { en: 'FLN', hi: 'FLN' }],
    examIds: ['ctet', 'reet', 'uptet', 'bihartet', 'mptet', 'kvs', 'nvs'],
  },
  {
    id: 'ca-pmshri-budget',
    title: {
      en: 'PM SHRI gets Rs 7,500 crore; Samagra Shiksha Rs 42,100 crore',
      hi: 'PM श्री को ₹7,500 करोड़; समग्र शिक्षा को ₹42,100 करोड़',
    },
    summary: {
      en: 'The 2026-27 union budget earmarks Rs 7,500 crore for PM SHRI model schools and Rs 42,100 crore for Samagra Shiksha Abhiyan. PM SHRI is also set to expand into West Bengal, Tamil Nadu and Kerala. Scheme names, their ministries and allocations are standard General Awareness material for DSSSB, KVS and NVS.',
      hi: '2026-27 के केंद्रीय बजट में PM श्री आदर्श विद्यालयों हेतु ₹7,500 करोड़ तथा समग्र शिक्षा अभियान हेतु ₹42,100 करोड़ आवंटित। PM श्री का विस्तार पश्चिम बंगाल, तमिलनाडु एवं केरल तक होने जा रहा है। योजनाओं के नाम, मंत्रालय एवं आवंटन DSSSB, KVS तथा NVS के सामान्य ज्ञान खंड की सामान्य सामग्री हैं।',
    },
    date: '2026-08-01',
    tags: [{ en: 'Schemes', hi: 'योजनाएँ' }, { en: 'Budget', hi: 'बजट' }],
    examIds: ['dsssb', 'kvs', 'nvs', 'emrs', 'hssc-tgt-pgt', 'awes'],
  },
  {
    id: 'ca-ncf-npst',
    title: {
      en: 'NCF-SE 2023 rollout paired with National Professional Standards for Teachers',
      hi: 'NCF-SE 2023 क्रियान्वयन के साथ शिक्षकों हेतु राष्ट्रीय व्यावसायिक मानक',
    },
    summary: {
      en: 'Teacher orientation programmes on NEP 2020 and the National Curriculum Framework for School Education 2023 are running alongside the proposed National Professional Standards for Teachers (NPST) and a National Mentoring Mission. Continuous professional development has shifted from one-off workshops to structured online and hybrid training.',
      hi: 'NEP 2020 तथा राष्ट्रीय पाठ्यचर्या रूपरेखा (विद्यालयी शिक्षा) 2023 पर शिक्षक अभिविन्यास कार्यक्रम, प्रस्तावित राष्ट्रीय व्यावसायिक शिक्षक मानक (NPST) एवं राष्ट्रीय मेंटरिंग मिशन के साथ चल रहे हैं। सतत व्यावसायिक विकास अब एकबारगी कार्यशालाओं के स्थान पर संरचित ऑनलाइन एवं हाइब्रिड प्रशिक्षण बन गया है।',
    },
    date: '2026-07-28',
    tags: [{ en: 'NEP 2020', hi: 'NEP 2020' }, { en: 'NCF-SE', hi: 'NCF-SE' }],
    examIds: ['ctet', 'htet', 'uptet', 'reet', 'kvs', 'nvs', 'dsssb', 'emrs'],
  },
  {
    id: 'ca-ctet-sept',
    title: {
      en: 'CTET September 2026 held on 6 September across 132 cities',
      hi: 'CTET सितंबर 2026 परीक्षा 6 सितंबर को 132 शहरों में',
    },
    summary: {
      en: 'CBSE notified the cycle on 11 May 2026 with applications from 11 May to 10 June. Paper II runs 9:30 AM to 12:00 noon and Paper I from 2:30 to 5:00 PM, offline on OMR sheets. Qualifying marks stay at 90/150 for General and 82/150 for OBC, SC and ST.',
      hi: 'CBSE ने 11 मई 2026 को चक्र अधिसूचित किया, आवेदन 11 मई से 10 जून तक। पेपर II प्रातः 9:30 से 12:00 तथा पेपर I अपराह्न 2:30 से 5:00 बजे तक, OMR शीट पर ऑफ़लाइन। अर्हक अंक सामान्य हेतु 90/150 तथा OBC, SC एवं ST हेतु 82/150 यथावत।',
    },
    date: '2026-05-11',
    tags: [{ en: 'CTET', hi: 'CTET' }, { en: 'Exam dates', hi: 'परीक्षा तिथि' }],
    examIds: ['ctet'],
  },
  {
    id: 'ca-bpsc-tre4',
    title: {
      en: 'BPSC TRE 4.0 opens 32,388 teacher posts in Bihar',
      hi: 'BPSC TRE 4.0 में बिहार के 32,388 शिक्षक पद',
    },
    summary: {
      en: 'One of the largest teacher recruitment drives in Bihar\'s history, covering Classes 1-12. The examination is scheduled for 22-27 September 2026 with results expected in November. Each paper carries 150 questions for 150 marks in 2.5 hours across Language, General Studies and the subject.',
      hi: 'बिहार के इतिहास के सबसे बड़े शिक्षक भर्ती अभियानों में से एक, जो कक्षा 1-12 को कवर करता है। परीक्षा 22-27 सितंबर 2026 को निर्धारित है, परिणाम नवंबर में अपेक्षित। प्रत्येक पेपर में भाषा, सामान्य अध्ययन एवं विषय हेतु 2.5 घंटे में 150 अंकों के 150 प्रश्न।',
    },
    date: '2026-08-04',
    tags: [{ en: 'Recruitment', hi: 'भर्ती' }, { en: 'Bihar', hi: 'बिहार' }],
    examIds: ['bihartet', 'bihar-stet'],
  },
  {
    id: 'ca-haryana-drive',
    title: {
      en: 'Haryana announces 15,659 PRT, TGT and PGT posts',
      hi: 'हरियाणा में 15,659 PRT, TGT एवं PGT पद घोषित',
    },
    summary: {
      en: 'Recruitment runs through HSSC, HPSC and HKRN. The HSSC share is 8,394 TGT and PGT vacancies, with applications from 21 August to 21 September 2026 and a fee of Rs 500 for General and Rs 125 for reserved categories.',
      hi: 'भर्ती HSSC, HPSC एवं HKRN के माध्यम से होगी। HSSC का हिस्सा 8,394 TGT एवं PGT रिक्तियाँ हैं, आवेदन 21 अगस्त से 21 सितंबर 2026 तक तथा शुल्क सामान्य ₹500 एवं आरक्षित वर्ग ₹125।',
    },
    date: '2026-08-10',
    tags: [{ en: 'Recruitment', hi: 'भर्ती' }, { en: 'Haryana', hi: 'हरियाणा' }],
    examIds: ['htet', 'hssc-tgt-pgt'],
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
      },
    ],
  },
];

/**
 * Where a learner starts before they are anyone: no account, no goal, nothing
 * practised.
 *
 * This replaces a `DEMO_USER` that shipped as the initial state of both apps
 * and was not a placeholder in any meaningful sense. It was named Arjun, it
 * carried a real person's email address into a public repository, and it
 * claimed a twelve-day streak, two bookmarks, two saved notes and an enrolment
 * in a CTET batch. A first-time install opened on somebody else's progress —
 * `currentStreak` counts consecutive days ending today, so the flame even went
 * out on its own a day later, which read as a streak the learner had broken.
 *
 * Nothing here is invented. The empty strings and empty arrays are the true
 * answers for somebody who has not signed in: `goalExamId` is blank rather than
 * 'ctet' because having no goal is what routes them to the picker, and
 * `joinedAt` is blank because they have not joined.
 *
 * The signed-in learner is assembled by `getCurrentUser()` from Postgres. This
 * value is only ever the signed-out one.
 */
export const GUEST_USER: User = {
  id: '',
  name: '',
  avatar: '🧑‍🎓',
  role: 'learner',
  goalExamId: '',
  language: 'hi',
  joinedAt: '',
  streakDays: 0,
  activeDates: [],
  subscription: 'free',
  signedIn: false,
  onboarded: false,
  bookmarkedQuestionIds: [],
  savedNoteIds: [],
  enrolledBatchIds: [],
};
