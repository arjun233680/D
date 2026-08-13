import type { Subject } from '../types';

/**
 * Subjects across every teaching-exam pattern we support.
 * Topic `weightage` is the historical share of questions, used for
 * "high yield" badges and the recommended-practice ordering.
 */
export const SUBJECTS: Subject[] = [
  {
    id: 'cdp',
    name: { en: 'Child Development & Pedagogy', hi: 'बाल विकास एवं शिक्षाशास्त्र' },
    icon: '🧠',
    color: '#7C3AED',
    description: {
      en: 'The scoring backbone of every TET. 30 marks in Paper 1 and Paper 2 alike.',
      hi: 'हर TET की सबसे स्कोरिंग यूनिट। पेपर 1 और पेपर 2 दोनों में 30 अंक।',
    },
    topics: [
      { id: 'cdp-growth', subjectId: 'cdp', name: { en: 'Growth & Development', hi: 'वृद्धि एवं विकास' }, weightage: 14, questionCount: 420 },
      { id: 'cdp-piaget', subjectId: 'cdp', name: { en: 'Piaget, Kohlberg & Vygotsky', hi: 'पियाजे, कोहलबर्ग एवं वाइगोत्स्की' }, weightage: 18, questionCount: 510 },
      { id: 'cdp-learning', subjectId: 'cdp', name: { en: 'Theories of Learning', hi: 'अधिगम के सिद्धांत' }, weightage: 12, questionCount: 380 },
      { id: 'cdp-inclusive', subjectId: 'cdp', name: { en: 'Inclusive Education & CWSN', hi: 'समावेशी शिक्षा एवं विशेष आवश्यकता वाले बालक' }, weightage: 11, questionCount: 340 },
      { id: 'cdp-motivation', subjectId: 'cdp', name: { en: 'Motivation & Personality', hi: 'अभिप्रेरणा एवं व्यक्तित्व' }, weightage: 9, questionCount: 260 },
      { id: 'cdp-assessment', subjectId: 'cdp', name: { en: 'Assessment & Evaluation (CCE)', hi: 'आकलन एवं मूल्यांकन (CCE)' }, weightage: 10, questionCount: 290 },
      { id: 'cdp-intelligence', subjectId: 'cdp', name: { en: 'Intelligence & Creativity', hi: 'बुद्धि एवं सृजनात्मकता' }, weightage: 8, questionCount: 240 },
      { id: 'cdp-rte', subjectId: 'cdp', name: { en: 'RTE Act, NEP & NCF', hi: 'RTE अधिनियम, NEP एवं NCF' }, weightage: 10, questionCount: 300 },
      { id: 'cdp-gender', subjectId: 'cdp', name: { en: 'Gender, Socialisation & Individual Differences', hi: 'लिंग, समाजीकरण एवं वैयक्तिक भिन्नता' }, weightage: 8, questionCount: 210 },
    ],
  },
  {
    id: 'math',
    name: { en: 'Mathematics', hi: 'गणित' },
    icon: '➗',
    color: '#0EA5E9',
    description: {
      en: 'Content plus pedagogy. Class 1-8 NCERT level with teaching-method questions.',
      hi: 'विषयवस्तु एवं शिक्षाशास्त्र। कक्षा 1-8 NCERT स्तर तथा शिक्षण विधि प्रश्न।',
    },
    topics: [
      { id: 'math-number', subjectId: 'math', name: { en: 'Number System', hi: 'संख्या पद्धति' }, weightage: 16, questionCount: 480 },
      { id: 'math-arith', subjectId: 'math', name: { en: 'Ratio, Percentage & Profit-Loss', hi: 'अनुपात, प्रतिशत एवं लाभ-हानि' }, weightage: 14, questionCount: 430 },
      { id: 'math-geometry', subjectId: 'math', name: { en: 'Geometry & Shapes', hi: 'ज्यामिति एवं आकृतियाँ' }, weightage: 13, questionCount: 390 },
      { id: 'math-mensuration', subjectId: 'math', name: { en: 'Mensuration', hi: 'क्षेत्रमिति' }, weightage: 11, questionCount: 320 },
      { id: 'math-algebra', subjectId: 'math', name: { en: 'Algebra', hi: 'बीजगणित' }, weightage: 10, questionCount: 300 },
      { id: 'math-data', subjectId: 'math', name: { en: 'Data Handling', hi: 'आँकड़ा प्रबंधन' }, weightage: 7, questionCount: 180 },
      { id: 'math-pedagogy', subjectId: 'math', name: { en: 'Mathematics Pedagogy', hi: 'गणित शिक्षाशास्त्र' }, weightage: 29, questionCount: 520 },
    ],
  },
  {
    id: 'evs',
    name: { en: 'Environmental Studies', hi: 'पर्यावरण अध्ययन' },
    icon: '🌿',
    color: '#16A34A',
    description: {
      en: 'Paper 1 only. Family, food, shelter, water, travel, things we make plus EVS pedagogy.',
      hi: 'केवल पेपर 1। परिवार, भोजन, आवास, पानी, यात्रा, वस्तुएँ तथा EVS शिक्षाशास्त्र।',
    },
    topics: [
      { id: 'evs-family', subjectId: 'evs', name: { en: 'Family & Friends', hi: 'परिवार एवं मित्र' }, weightage: 18, questionCount: 300 },
      { id: 'evs-food', subjectId: 'evs', name: { en: 'Food & Nutrition', hi: 'भोजन एवं पोषण' }, weightage: 14, questionCount: 280 },
      { id: 'evs-shelter', subjectId: 'evs', name: { en: 'Shelter', hi: 'आवास' }, weightage: 9, questionCount: 160 },
      { id: 'evs-water', subjectId: 'evs', name: { en: 'Water', hi: 'पानी' }, weightage: 9, questionCount: 170 },
      { id: 'evs-travel', subjectId: 'evs', name: { en: 'Travel', hi: 'यात्रा' }, weightage: 8, questionCount: 150 },
      { id: 'evs-things', subjectId: 'evs', name: { en: 'Things We Make & Do', hi: 'हम चीज़ें कैसे बनाते हैं' }, weightage: 9, questionCount: 140 },
      { id: 'evs-pedagogy', subjectId: 'evs', name: { en: 'EVS Pedagogy', hi: 'EVS शिक्षाशास्त्र' }, weightage: 33, questionCount: 420 },
    ],
  },
  {
    id: 'hindi',
    name: { en: 'Hindi (Language I)', hi: 'हिंदी (भाषा I)' },
    icon: '📖',
    color: '#F97316',
    description: {
      en: 'Comprehension, grammar and language pedagogy — the highest-scoring language paper.',
      hi: 'गद्यांश, व्याकरण एवं भाषा शिक्षाशास्त्र — सर्वाधिक स्कोरिंग भाषा पेपर।',
    },
    topics: [
      { id: 'hindi-vyakaran', subjectId: 'hindi', name: { en: 'Grammar (Vyakaran)', hi: 'हिंदी व्याकरण' }, weightage: 22, questionCount: 460 },
      { id: 'hindi-apathit', subjectId: 'hindi', name: { en: 'Unseen Passage', hi: 'अपठित गद्यांश' }, weightage: 20, questionCount: 300 },
      { id: 'hindi-alankar', subjectId: 'hindi', name: { en: 'Alankar, Ras & Chhand', hi: 'अलंकार, रस एवं छंद' }, weightage: 12, questionCount: 240 },
      { id: 'hindi-shabd', subjectId: 'hindi', name: { en: 'Shabd Bhed & Sandhi', hi: 'शब्द भेद एवं संधि' }, weightage: 13, questionCount: 260 },
      { id: 'hindi-pedagogy', subjectId: 'hindi', name: { en: 'Hindi Language Pedagogy', hi: 'हिंदी भाषा शिक्षाशास्त्र' }, weightage: 33, questionCount: 400 },
    ],
  },
  {
    id: 'english',
    name: { en: 'English (Language II)', hi: 'अंग्रेज़ी (भाषा II)' },
    icon: '🔤',
    color: '#DB2777',
    description: {
      en: 'Grammar, comprehension and the pedagogy of English language teaching.',
      hi: 'व्याकरण, गद्यांश एवं अंग्रेज़ी भाषा शिक्षण का शिक्षाशास्त्र।',
    },
    topics: [
      { id: 'eng-grammar', subjectId: 'english', name: { en: 'Grammar & Usage', hi: 'व्याकरण एवं प्रयोग' }, weightage: 24, questionCount: 440 },
      { id: 'eng-comprehension', subjectId: 'english', name: { en: 'Reading Comprehension', hi: 'गद्यांश बोध' }, weightage: 20, questionCount: 280 },
      { id: 'eng-vocab', subjectId: 'english', name: { en: 'Vocabulary', hi: 'शब्द भंडार' }, weightage: 14, questionCount: 250 },
      { id: 'eng-phonetics', subjectId: 'english', name: { en: 'Phonetics & Pronunciation', hi: 'ध्वनि विज्ञान एवं उच्चारण' }, weightage: 9, questionCount: 150 },
      { id: 'eng-pedagogy', subjectId: 'english', name: { en: 'English Pedagogy', hi: 'अंग्रेज़ी शिक्षाशास्त्र' }, weightage: 33, questionCount: 380 },
    ],
  },
  {
    id: 'science',
    name: { en: 'Science', hi: 'विज्ञान' },
    icon: '🔬',
    color: '#0D9488',
    description: {
      en: 'Paper 2 (Maths & Science stream). Class 6-8 NCERT with science pedagogy.',
      hi: 'पेपर 2 (गणित एवं विज्ञान)। कक्षा 6-8 NCERT तथा विज्ञान शिक्षाशास्त्र।',
    },
    topics: [
      { id: 'sci-living', subjectId: 'science', name: { en: 'The Living World', hi: 'सजीव जगत' }, weightage: 18, questionCount: 340 },
      { id: 'sci-matter', subjectId: 'science', name: { en: 'Matter & Materials', hi: 'पदार्थ एवं सामग्री' }, weightage: 15, questionCount: 300 },
      { id: 'sci-motion', subjectId: 'science', name: { en: 'Force, Motion & Energy', hi: 'बल, गति एवं ऊर्जा' }, weightage: 15, questionCount: 310 },
      { id: 'sci-natural', subjectId: 'science', name: { en: 'Natural Phenomena & Resources', hi: 'प्राकृतिक परिघटनाएँ एवं संसाधन' }, weightage: 14, questionCount: 260 },
      { id: 'sci-food-health', subjectId: 'science', name: { en: 'Food, Health & Hygiene', hi: 'भोजन, स्वास्थ्य एवं स्वच्छता' }, weightage: 9, questionCount: 190 },
      { id: 'sci-pedagogy', subjectId: 'science', name: { en: 'Science Pedagogy', hi: 'विज्ञान शिक्षाशास्त्र' }, weightage: 29, questionCount: 350 },
    ],
  },
  {
    id: 'sst',
    name: { en: 'Social Studies', hi: 'सामाजिक अध्ययन' },
    icon: '🗺️',
    color: '#B45309',
    description: {
      en: 'Paper 2 (SST stream). History, Geography, Civics, Economics and SST pedagogy.',
      hi: 'पेपर 2 (SST)। इतिहास, भूगोल, नागरिक शास्त्र, अर्थशास्त्र एवं SST शिक्षाशास्त्र।',
    },
    topics: [
      { id: 'sst-history', subjectId: 'sst', name: { en: 'History', hi: 'इतिहास' }, weightage: 24, questionCount: 420 },
      { id: 'sst-geography', subjectId: 'sst', name: { en: 'Geography', hi: 'भूगोल' }, weightage: 22, questionCount: 400 },
      { id: 'sst-civics', subjectId: 'sst', name: { en: 'Social & Political Life', hi: 'सामाजिक एवं राजनीतिक जीवन' }, weightage: 18, questionCount: 330 },
      { id: 'sst-economics', subjectId: 'sst', name: { en: 'Economics', hi: 'अर्थशास्त्र' }, weightage: 10, questionCount: 180 },
      { id: 'sst-pedagogy', subjectId: 'sst', name: { en: 'Social Studies Pedagogy', hi: 'सामाजिक अध्ययन शिक्षाशास्त्र' }, weightage: 26, questionCount: 300 },
    ],
  },
  {
    id: 'sanskrit',
    name: { en: 'Sanskrit', hi: 'संस्कृत' },
    icon: '🕉️',
    color: '#CA8A04',
    description: {
      en: 'Language option in UPTET, HTET, Bihar TET and most state TETs.',
      hi: 'UPTET, HTET, बिहार TET तथा अधिकांश राज्य TET में भाषा विकल्प।',
    },
    topics: [
      { id: 'sans-vyakaran', subjectId: 'sanskrit', name: { en: 'Sanskrit Grammar', hi: 'संस्कृत व्याकरण' }, weightage: 40, questionCount: 260 },
      { id: 'sans-sandhi', subjectId: 'sanskrit', name: { en: 'Sandhi & Samas', hi: 'संधि एवं समास' }, weightage: 25, questionCount: 190 },
      { id: 'sans-pedagogy', subjectId: 'sanskrit', name: { en: 'Sanskrit Pedagogy', hi: 'संस्कृत शिक्षाशास्त्र' }, weightage: 35, questionCount: 170 },
    ],
  },
  {
    id: 'gk',
    name: { en: 'General Awareness', hi: 'सामान्य ज्ञान' },
    icon: '🌍',
    color: '#DC2626',
    description: {
      en: 'DSSSB, KVS, NVS and HSSC recruitment papers. Static GK plus current affairs.',
      hi: 'DSSSB, KVS, NVS एवं HSSC भर्ती पेपर। स्टैटिक GK एवं करेंट अफेयर्स।',
    },
    topics: [
      { id: 'gk-static', subjectId: 'gk', name: { en: 'Static GK', hi: 'स्टैटिक जीके' }, weightage: 30, questionCount: 520 },
      { id: 'gk-polity', subjectId: 'gk', name: { en: 'Indian Polity', hi: 'भारतीय राजव्यवस्था' }, weightage: 22, questionCount: 340 },
      { id: 'gk-current', subjectId: 'gk', name: { en: 'Current Affairs', hi: 'समसामयिकी' }, weightage: 28, questionCount: 600 },
      { id: 'gk-state', subjectId: 'gk', name: { en: 'State GK (HR/UP/BR/RJ)', hi: 'राज्य जीके (HR/UP/BR/RJ)' }, weightage: 20, questionCount: 380 },
    ],
  },
  {
    id: 'reasoning',
    name: { en: 'Reasoning Ability', hi: 'तार्किक क्षमता' },
    icon: '🧩',
    color: '#4F46E5',
    description: {
      en: 'Verbal and non-verbal reasoning for DSSSB, KVS, NVS and HSSC papers.',
      hi: 'DSSSB, KVS, NVS एवं HSSC पेपर हेतु शाब्दिक एवं अशाब्दिक तर्कशक्ति।',
    },
    topics: [
      { id: 'rea-series', subjectId: 'reasoning', name: { en: 'Series & Analogy', hi: 'श्रृंखला एवं सादृश्यता' }, weightage: 26, questionCount: 400 },
      { id: 'rea-coding', subjectId: 'reasoning', name: { en: 'Coding-Decoding', hi: 'कूट लेखन-डिकोडिंग' }, weightage: 20, questionCount: 300 },
      { id: 'rea-blood', subjectId: 'reasoning', name: { en: 'Blood Relations & Direction', hi: 'रक्त संबंध एवं दिशा ज्ञान' }, weightage: 18, questionCount: 260 },
      { id: 'rea-nonverbal', subjectId: 'reasoning', name: { en: 'Non-Verbal Reasoning', hi: 'अशाब्दिक तर्कशक्ति' }, weightage: 18, questionCount: 240 },
      { id: 'rea-syllogism', subjectId: 'reasoning', name: { en: 'Syllogism & Statements', hi: 'न्यायवाक्य एवं कथन' }, weightage: 18, questionCount: 220 },
    ],
  },
  {
    id: 'computer',
    name: { en: 'Computer Literacy', hi: 'कंप्यूटर साक्षरता' },
    icon: '💻',
    color: '#0891B2',
    description: {
      en: 'ICT in education — asked in KVS, NVS, DSSSB and the NEP-aligned state papers.',
      hi: 'शिक्षा में ICT — KVS, NVS, DSSSB एवं NEP आधारित राज्य पेपर में पूछा जाता है।',
    },
    topics: [
      { id: 'comp-basics', subjectId: 'computer', name: { en: 'Computer Fundamentals', hi: 'कंप्यूटर की मूल बातें' }, weightage: 40, questionCount: 200 },
      { id: 'comp-ict', subjectId: 'computer', name: { en: 'ICT in Teaching', hi: 'शिक्षण में ICT' }, weightage: 35, questionCount: 160 },
      { id: 'comp-internet', subjectId: 'computer', name: { en: 'Internet & Digital Safety', hi: 'इंटरनेट एवं डिजिटल सुरक्षा' }, weightage: 25, questionCount: 120 },
    ],
  },
];

export const SUBJECT_BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));

export const ALL_TOPICS = SUBJECTS.flatMap((s) => s.topics);

export const TOPIC_BY_ID = new Map(ALL_TOPICS.map((t) => [t.id, t]));

export const getSubject = (id: string): Subject | undefined => SUBJECT_BY_ID.get(id);

export const getTopic = (id: string) => TOPIC_BY_ID.get(id);
