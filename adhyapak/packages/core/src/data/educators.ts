import type { Educator } from '../types';

/**
 * `avatar` is an emoji rather than a remote image so both apps render
 * identically with zero network dependency. Swap for a URL when a CDN exists.
 */
export const EDUCATORS: Educator[] = [
  {
    id: 'edu-anjali',
    name: 'Anjali Verma',
    avatar: '👩‍🏫',
    headline: { en: 'CDP & Pedagogy — 9 years', hi: 'CDP एवं शिक्षाशास्त्र — 9 वर्ष' },
    subjects: ['cdp'],
    experienceYears: 9,
    languages: ['hi', 'en'],
    bio: {
      en: 'M.Ed from Jamia Millia Islamia. Known for turning Piaget and Vygotsky into one-line memory hooks that survive exam pressure.',
      hi: 'जामिया मिल्लिया इस्लामिया से M.Ed। पियाजे एवं वाइगोत्स्की को ऐसे एक-पंक्ति स्मृति सूत्रों में बदलने हेतु प्रसिद्ध जो परीक्षा के दबाव में भी याद रहते हैं।',
    },
  },
  {
    id: 'edu-rakesh',
    name: 'Rakesh Yadav',
    avatar: '👨‍🏫',
    headline: { en: 'Maths & Maths Pedagogy — 12 years', hi: 'गणित एवं गणित शिक्षाशास्त्र — 12 वर्ष' },
    subjects: ['math'],
    experienceYears: 12,
    languages: ['hi'],
    bio: {
      en: 'Teaches Class 1-8 maths the way NCERT intends it — concept first, shortcut second. 12 years across CTET, UPTET and Super TET batches.',
      hi: 'कक्षा 1-8 गणित को NCERT की मंशा के अनुसार पढ़ाते हैं — पहले अवधारणा, फिर शॉर्टकट। CTET, UPTET एवं सुपर TET बैचों का 12 वर्ष का अनुभव।',
    },
  },
  {
    id: 'edu-priya',
    name: 'Priya Sharma',
    avatar: '👩‍🎓',
    headline: { en: 'EVS & Science Pedagogy — 7 years', hi: 'EVS एवं विज्ञान शिक्षाशास्त्र — 7 वर्ष' },
    subjects: ['evs', 'science'],
    experienceYears: 7,
    languages: ['hi', 'en'],
    bio: {
      en: 'Ex-KV teacher. Her EVS classes work backwards from the NCERT chapter to the exact question CBSE has asked six times.',
      hi: 'पूर्व KV शिक्षिका। उनकी EVS कक्षाएँ NCERT अध्याय से आरंभ होकर ठीक उसी प्रश्न तक पहुँचती हैं जो CBSE छह बार पूछ चुका है।',
    },
  },
  {
    id: 'edu-imran',
    name: 'Imran Khan',
    avatar: '🧑‍🏫',
    headline: { en: 'English Language & Pedagogy — 10 years', hi: 'अंग्रेज़ी भाषा एवं शिक्षाशास्त्र — 10 वर्ष' },
    subjects: ['english'],
    experienceYears: 10,
    languages: ['en', 'hi'],
    bio: {
      en: 'Trains Hindi-medium aspirants to score 27+ in Language II without memorising a single grammar rule out of context.',
      hi: 'हिंदी माध्यम के अभ्यर्थियों को बिना संदर्भहीन व्याकरण रटे भाषा II में 27+ अंक लाने का प्रशिक्षण देते हैं।',
    },
  },
  {
    id: 'edu-sunita',
    name: 'Sunita Rathore',
    avatar: '👩‍💼',
    headline: { en: 'Hindi Vyakaran & Pedagogy — 14 years', hi: 'हिंदी व्याकरण एवं शिक्षाशास्त्र — 14 वर्ष' },
    subjects: ['hindi', 'sanskrit'],
    experienceYears: 14,
    languages: ['hi'],
    bio: {
      en: 'The most-followed Hindi educator for REET and UPTET. Alankar and Ras in her classes are pattern recognition, not memorisation.',
      hi: 'REET एवं UPTET हेतु सर्वाधिक फॉलो की जाने वाली हिंदी शिक्षिका। उनकी कक्षाओं में अलंकार एवं रस रटने के बजाय पैटर्न पहचान बन जाते हैं।',
    },
  },
  {
    id: 'edu-manoj',
    name: 'Manoj Tiwari',
    avatar: '👨‍💼',
    headline: { en: 'SST & State GK — 11 years', hi: 'सामाजिक अध्ययन एवं राज्य GK — 11 वर्ष' },
    subjects: ['sst', 'gk'],
    experienceYears: 11,
    languages: ['hi', 'en'],
    bio: {
      en: 'Covers Haryana, UP, Bihar and Rajasthan state GK separately, because a national syllabus never gets you the state cut-off.',
      hi: 'हरियाणा, UP, बिहार एवं राजस्थान राज्य GK अलग-अलग पढ़ाते हैं, क्योंकि राष्ट्रीय पाठ्यक्रम से राज्य का कट-ऑफ कभी पार नहीं होता।',
    },
  },
  {
    id: 'edu-neha',
    name: 'Neha Bansal',
    avatar: '👩‍🔬',
    headline: { en: 'Reasoning & Computer Literacy — 6 years', hi: 'तर्कशक्ति एवं कंप्यूटर साक्षरता — 6 वर्ष' },
    subjects: ['reasoning', 'computer'],
    experienceYears: 6,
    languages: ['en', 'hi'],
    bio: {
      en: 'Specialises in the DSSSB and KVS general sections — the 70 marks most aspirants leave on the table.',
      hi: 'DSSSB एवं KVS के सामान्य खंडों में विशेषज्ञ — वही 70 अंक जिन्हें अधिकांश अभ्यर्थी छोड़ देते हैं।',
    },
  },
];

export const EDUCATOR_BY_ID = new Map(EDUCATORS.map((e) => [e.id, e]));
export const getEducator = (id: string) => EDUCATOR_BY_ID.get(id);
