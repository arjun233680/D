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
      { id: 'cdp-growth', subjectId: 'cdp', name: { en: 'Growth & Development', hi: 'वृद्धि एवं विकास' }, weightage: 14 },
      { id: 'cdp-piaget', subjectId: 'cdp', name: { en: 'Piaget, Kohlberg & Vygotsky', hi: 'पियाजे, कोहलबर्ग एवं वाइगोत्स्की' }, weightage: 18 },
      { id: 'cdp-learning', subjectId: 'cdp', name: { en: 'Theories of Learning', hi: 'अधिगम के सिद्धांत' }, weightage: 12 },
      { id: 'cdp-inclusive', subjectId: 'cdp', name: { en: 'Inclusive Education & CWSN', hi: 'समावेशी शिक्षा एवं विशेष आवश्यकता वाले बालक' }, weightage: 11 },
      { id: 'cdp-motivation', subjectId: 'cdp', name: { en: 'Motivation & Personality', hi: 'अभिप्रेरणा एवं व्यक्तित्व' }, weightage: 9 },
      { id: 'cdp-assessment', subjectId: 'cdp', name: { en: 'Assessment & Evaluation (CCE)', hi: 'आकलन एवं मूल्यांकन (CCE)' }, weightage: 10 },
      { id: 'cdp-intelligence', subjectId: 'cdp', name: { en: 'Intelligence & Creativity', hi: 'बुद्धि एवं सृजनात्मकता' }, weightage: 8 },
      { id: 'cdp-rte', subjectId: 'cdp', name: { en: 'RTE Act, NEP & NCF', hi: 'RTE अधिनियम, NEP एवं NCF' }, weightage: 10 },
      { id: 'cdp-gender', subjectId: 'cdp', name: { en: 'Gender, Socialisation & Individual Differences', hi: 'लिंग, समाजीकरण एवं वैयक्तिक भिन्नता' }, weightage: 8 },
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
      { id: 'math-number', subjectId: 'math', name: { en: 'Number System', hi: 'संख्या पद्धति' }, weightage: 16 },
      { id: 'math-arith', subjectId: 'math', name: { en: 'Ratio, Percentage & Profit-Loss', hi: 'अनुपात, प्रतिशत एवं लाभ-हानि' }, weightage: 14 },
      { id: 'math-geometry', subjectId: 'math', name: { en: 'Geometry & Shapes', hi: 'ज्यामिति एवं आकृतियाँ' }, weightage: 13 },
      { id: 'math-mensuration', subjectId: 'math', name: { en: 'Mensuration', hi: 'क्षेत्रमिति' }, weightage: 11 },
      { id: 'math-algebra', subjectId: 'math', name: { en: 'Algebra', hi: 'बीजगणित' }, weightage: 10 },
      { id: 'math-data', subjectId: 'math', name: { en: 'Data Handling', hi: 'आँकड़ा प्रबंधन' }, weightage: 7 },
      { id: 'math-pedagogy', subjectId: 'math', name: { en: 'Mathematics Pedagogy', hi: 'गणित शिक्षाशास्त्र' }, weightage: 29 },
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
      { id: 'evs-family', subjectId: 'evs', name: { en: 'Family & Friends', hi: 'परिवार एवं मित्र' }, weightage: 18 },
      { id: 'evs-food', subjectId: 'evs', name: { en: 'Food & Nutrition', hi: 'भोजन एवं पोषण' }, weightage: 14 },
      { id: 'evs-shelter', subjectId: 'evs', name: { en: 'Shelter', hi: 'आवास' }, weightage: 9 },
      { id: 'evs-water', subjectId: 'evs', name: { en: 'Water', hi: 'पानी' }, weightage: 9 },
      { id: 'evs-travel', subjectId: 'evs', name: { en: 'Travel', hi: 'यात्रा' }, weightage: 8 },
      { id: 'evs-things', subjectId: 'evs', name: { en: 'Things We Make & Do', hi: 'हम चीज़ें कैसे बनाते हैं' }, weightage: 9 },
      { id: 'evs-pedagogy', subjectId: 'evs', name: { en: 'EVS Pedagogy', hi: 'EVS शिक्षाशास्त्र' }, weightage: 33 },
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
      { id: 'hindi-vyakaran', subjectId: 'hindi', name: { en: 'Grammar (Vyakaran)', hi: 'हिंदी व्याकरण' }, weightage: 22 },
      { id: 'hindi-apathit', subjectId: 'hindi', name: { en: 'Unseen Passage', hi: 'अपठित गद्यांश' }, weightage: 20 },
      { id: 'hindi-alankar', subjectId: 'hindi', name: { en: 'Alankar, Ras & Chhand', hi: 'अलंकार, रस एवं छंद' }, weightage: 12 },
      { id: 'hindi-shabd', subjectId: 'hindi', name: { en: 'Shabd Bhed & Sandhi', hi: 'शब्द भेद एवं संधि' }, weightage: 13 },
      { id: 'hindi-pedagogy', subjectId: 'hindi', name: { en: 'Hindi Language Pedagogy', hi: 'हिंदी भाषा शिक्षाशास्त्र' }, weightage: 33 },
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
      { id: 'eng-grammar', subjectId: 'english', name: { en: 'Grammar & Usage', hi: 'व्याकरण एवं प्रयोग' }, weightage: 24 },
      { id: 'eng-comprehension', subjectId: 'english', name: { en: 'Reading Comprehension', hi: 'गद्यांश बोध' }, weightage: 20 },
      { id: 'eng-vocab', subjectId: 'english', name: { en: 'Vocabulary', hi: 'शब्द भंडार' }, weightage: 14 },
      { id: 'eng-phonetics', subjectId: 'english', name: { en: 'Phonetics & Pronunciation', hi: 'ध्वनि विज्ञान एवं उच्चारण' }, weightage: 9 },
      { id: 'eng-pedagogy', subjectId: 'english', name: { en: 'English Pedagogy', hi: 'अंग्रेज़ी शिक्षाशास्त्र' }, weightage: 33 },
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
      { id: 'sci-living', subjectId: 'science', name: { en: 'The Living World', hi: 'सजीव जगत' }, weightage: 18 },
      { id: 'sci-matter', subjectId: 'science', name: { en: 'Matter & Materials', hi: 'पदार्थ एवं सामग्री' }, weightage: 15 },
      { id: 'sci-motion', subjectId: 'science', name: { en: 'Force, Motion & Energy', hi: 'बल, गति एवं ऊर्जा' }, weightage: 15 },
      { id: 'sci-natural', subjectId: 'science', name: { en: 'Natural Phenomena & Resources', hi: 'प्राकृतिक परिघटनाएँ एवं संसाधन' }, weightage: 14 },
      { id: 'sci-food-health', subjectId: 'science', name: { en: 'Food, Health & Hygiene', hi: 'भोजन, स्वास्थ्य एवं स्वच्छता' }, weightage: 9 },
      { id: 'sci-pedagogy', subjectId: 'science', name: { en: 'Science Pedagogy', hi: 'विज्ञान शिक्षाशास्त्र' }, weightage: 29 },
    ],
  },
  {
    id: 'maths-science',
    name: { en: 'Mathematics & Science', hi: 'गणित एवं विज्ञान' },
    icon: '🔬',
    color: '#0891B2',
    description: {
      en: "CTET Paper 2's 60-mark elective block for maths and science teachers. Classes 6-8 content with pedagogy.",
      hi: 'CTET पेपर 2 का गणित एवं विज्ञान शिक्षकों हेतु 60 अंकों का वैकल्पिक खंड। कक्षा 6-8 विषयवस्तु एवं शिक्षाशास्त्र।',
    },
    // Not a duplicate of `math`. Paper 1 Mathematics is the classes 1-5
    // syllabus; this is classes 6-8 mathematics *and* science, which CTET
    // publishes as one 60-mark subject and a candidate chooses whole.
    topics: [
      { id: 'ms-number', subjectId: 'maths-science', name: { en: 'Number System', hi: 'संख्या पद्धति' }, weightage: 8 },
      { id: 'ms-algebra', subjectId: 'maths-science', name: { en: 'Algebra', hi: 'बीजगणित' }, weightage: 8 },
      { id: 'ms-geometry', subjectId: 'maths-science', name: { en: 'Geometry', hi: 'ज्यामिति' }, weightage: 8 },
      { id: 'ms-mensuration', subjectId: 'maths-science', name: { en: 'Mensuration', hi: 'क्षेत्रमिति' }, weightage: 6 },
      { id: 'ms-data', subjectId: 'maths-science', name: { en: 'Data Handling', hi: 'आँकड़ा प्रबंधन' }, weightage: 5 },
      { id: 'ms-math-pedagogy', subjectId: 'maths-science', name: { en: 'Pedagogy of Mathematics', hi: 'गणित शिक्षाशास्त्र' }, weightage: 8 },
      { id: 'ms-food', subjectId: 'maths-science', name: { en: 'Food', hi: 'भोजन' }, weightage: 7 },
      { id: 'ms-materials', subjectId: 'maths-science', name: { en: 'Materials', hi: 'पदार्थ' }, weightage: 7 },
      { id: 'ms-living', subjectId: 'maths-science', name: { en: 'The World of the Living', hi: 'सजीव जगत' }, weightage: 8 },
      { id: 'ms-moving', subjectId: 'maths-science', name: { en: 'Moving Things, People and Ideas', hi: 'गतिमान वस्तुएँ, लोग एवं विचार' }, weightage: 7 },
      { id: 'ms-how-things-work', subjectId: 'maths-science', name: { en: 'How Things Work', hi: 'चीज़ें कैसे काम करती हैं' }, weightage: 7 },
      { id: 'ms-natural-phenomena', subjectId: 'maths-science', name: { en: 'Natural Phenomena', hi: 'प्राकृतिक परिघटनाएँ' }, weightage: 7 },
      { id: 'ms-natural-resources', subjectId: 'maths-science', name: { en: 'Natural Resources', hi: 'प्राकृतिक संसाधन' }, weightage: 6 },
      { id: 'ms-sci-pedagogy', subjectId: 'maths-science', name: { en: 'Pedagogy of Science', hi: 'विज्ञान शिक्षाशास्त्र' }, weightage: 8 },
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
      { id: 'sst-history', subjectId: 'sst', name: { en: 'History', hi: 'इतिहास' }, weightage: 24 },
      { id: 'sst-geography', subjectId: 'sst', name: { en: 'Geography', hi: 'भूगोल' }, weightage: 22 },
      { id: 'sst-civics', subjectId: 'sst', name: { en: 'Social & Political Life', hi: 'सामाजिक एवं राजनीतिक जीवन' }, weightage: 18 },
      { id: 'sst-economics', subjectId: 'sst', name: { en: 'Economics', hi: 'अर्थशास्त्र' }, weightage: 10 },
      { id: 'sst-pedagogy', subjectId: 'sst', name: { en: 'Social Studies Pedagogy', hi: 'सामाजिक अध्ययन शिक्षाशास्त्र' }, weightage: 26 },
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
      { id: 'sans-vyakaran', subjectId: 'sanskrit', name: { en: 'Sanskrit Grammar', hi: 'संस्कृत व्याकरण' }, weightage: 40 },
      { id: 'sans-sandhi', subjectId: 'sanskrit', name: { en: 'Sandhi & Samas', hi: 'संधि एवं समास' }, weightage: 25 },
      { id: 'sans-pedagogy', subjectId: 'sanskrit', name: { en: 'Sanskrit Pedagogy', hi: 'संस्कृत शिक्षाशास्त्र' }, weightage: 35 },
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
      { id: 'gk-static', subjectId: 'gk', name: { en: 'Static GK', hi: 'स्टैटिक जीके' }, weightage: 30 },
      { id: 'gk-polity', subjectId: 'gk', name: { en: 'Indian Polity', hi: 'भारतीय राजव्यवस्था' }, weightage: 22 },
      { id: 'gk-current', subjectId: 'gk', name: { en: 'Current Affairs', hi: 'समसामयिकी' }, weightage: 28 },
      { id: 'gk-state', subjectId: 'gk', name: { en: 'State GK (HR/UP/BR/RJ)', hi: 'राज्य जीके (HR/UP/BR/RJ)' }, weightage: 20 },
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
      { id: 'rea-series', subjectId: 'reasoning', name: { en: 'Series & Analogy', hi: 'श्रृंखला एवं सादृश्यता' }, weightage: 26 },
      { id: 'rea-coding', subjectId: 'reasoning', name: { en: 'Coding-Decoding', hi: 'कूट लेखन-डिकोडिंग' }, weightage: 20 },
      { id: 'rea-blood', subjectId: 'reasoning', name: { en: 'Blood Relations & Direction', hi: 'रक्त संबंध एवं दिशा ज्ञान' }, weightage: 18 },
      { id: 'rea-nonverbal', subjectId: 'reasoning', name: { en: 'Non-Verbal Reasoning', hi: 'अशाब्दिक तर्कशक्ति' }, weightage: 18 },
      { id: 'rea-syllogism', subjectId: 'reasoning', name: { en: 'Syllogism & Statements', hi: 'न्यायवाक्य एवं कथन' }, weightage: 18 },
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
      { id: 'comp-basics', subjectId: 'computer', name: { en: 'Computer Fundamentals', hi: 'कंप्यूटर की मूल बातें' }, weightage: 40 },
      { id: 'comp-ict', subjectId: 'computer', name: { en: 'ICT in Teaching', hi: 'शिक्षण में ICT' }, weightage: 35 },
      { id: 'comp-internet', subjectId: 'computer', name: { en: 'Internet & Digital Safety', hi: 'इंटरनेट एवं डिजिटल सुरक्षा' }, weightage: 25 },
    ],
  },

  /* ---------------------------------------------------------------------
   * Subjects below carry no `weightage`. It is a claim about how often a
   * topic has appeared in real papers, and no paper analysis has been done
   * for these yet. The topic lists themselves are syllabus areas, which are
   * published by the board.
   * ------------------------------------------------------------------ */
  {
    id: 'quantitative-aptitude',
    name: { en: 'Quantitative Aptitude', hi: 'संख्यात्मक अभियोग्यता' },
    icon: '🔢',
    color: '#0284C7',
    description: {
      en: 'The 10-mark aptitude block in every HTET paper. Distinct from Mathematics, which is a teaching subject.',
      hi: 'हर HTET पेपर का 10 अंकों का अभियोग्यता खंड। गणित से भिन्न, जो एक शिक्षण विषय है।',
    },
    topics: [
      { id: 'qa-number', subjectId: 'quantitative-aptitude', name: { en: 'Number System & Simplification', hi: 'संख्या पद्धति एवं सरलीकरण' } },
      { id: 'qa-percentage', subjectId: 'quantitative-aptitude', name: { en: 'Percentage, Ratio & Proportion', hi: 'प्रतिशत, अनुपात एवं समानुपात' } },
      { id: 'qa-profit', subjectId: 'quantitative-aptitude', name: { en: 'Profit, Loss & Interest', hi: 'लाभ, हानि एवं ब्याज' } },
      { id: 'qa-time', subjectId: 'quantitative-aptitude', name: { en: 'Time, Work, Speed & Distance', hi: 'समय, कार्य, चाल एवं दूरी' } },
      { id: 'qa-average', subjectId: 'quantitative-aptitude', name: { en: 'Average, Age & Partnership', hi: 'औसत, आयु एवं साझेदारी' } },
      { id: 'qa-mensuration', subjectId: 'quantitative-aptitude', name: { en: 'Mensuration', hi: 'क्षेत्रमिति' } },
      { id: 'qa-data', subjectId: 'quantitative-aptitude', name: { en: 'Data Interpretation', hi: 'आँकड़ा निर्वचन' } },
    ],
  },
  {
    id: 'haryana-gk',
    name: { en: 'Haryana General Knowledge', hi: 'हरियाणा सामान्य ज्ञान' },
    icon: '🌾',
    color: '#059669',
    description: {
      en: 'The 10-mark Haryana block that separates HTET from every other TET.',
      hi: '10 अंकों का हरियाणा खंड, जो HTET को अन्य सभी TET से अलग करता है।',
    },
    topics: [
      { id: 'hgk-history', subjectId: 'haryana-gk', name: { en: 'History of Haryana', hi: 'हरियाणा का इतिहास' } },
      { id: 'hgk-geography', subjectId: 'haryana-gk', name: { en: 'Geography, Rivers & Districts', hi: 'भूगोल, नदियाँ एवं ज़िले' } },
      { id: 'hgk-polity', subjectId: 'haryana-gk', name: { en: 'Haryana Polity & Administration', hi: 'हरियाणा राजव्यवस्था एवं प्रशासन' } },
      { id: 'hgk-economy', subjectId: 'haryana-gk', name: { en: 'Agriculture, Industry & Economy', hi: 'कृषि, उद्योग एवं अर्थव्यवस्था' } },
      { id: 'hgk-culture', subjectId: 'haryana-gk', name: { en: 'Art, Culture, Fairs & Festivals', hi: 'कला, संस्कृति, मेले एवं त्योहार' } },
      { id: 'hgk-sports', subjectId: 'haryana-gk', name: { en: 'Sports & Notable Personalities', hi: 'खेल एवं प्रमुख व्यक्तित्व' } },
      { id: 'hgk-schemes', subjectId: 'haryana-gk', name: { en: 'Government Schemes & Current Affairs', hi: 'सरकारी योजनाएँ एवं समसामयिकी' } },
    ],
  },
  {
    id: 'music',
    name: { en: 'Music', hi: 'संगीत' },
    icon: '🎵',
    color: '#DB2777',
    description: {
      en: 'Elective subject for HTET TGT and PGT.',
      hi: 'HTET TGT एवं PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'mus-swara', subjectId: 'music', name: { en: 'Swara, Raga & Taal', hi: 'स्वर, राग एवं ताल' } },
      { id: 'mus-vocal', subjectId: 'music', name: { en: 'Vocal Music & Gharanas', hi: 'गायन एवं घराने' } },
      { id: 'mus-instruments', subjectId: 'music', name: { en: 'Instruments & Classification', hi: 'वाद्य यंत्र एवं वर्गीकरण' } },
      { id: 'mus-history', subjectId: 'music', name: { en: 'History of Indian Music', hi: 'भारतीय संगीत का इतिहास' } },
      { id: 'mus-notation', subjectId: 'music', name: { en: 'Notation Systems', hi: 'स्वरलिपि पद्धतियाँ' } },
      { id: 'mus-pedagogy', subjectId: 'music', name: { en: 'Music Pedagogy', hi: 'संगीत शिक्षाशास्त्र' } },
    ],
  },
  {
    id: 'home-science',
    name: { en: 'Home Science', hi: 'गृह विज्ञान' },
    icon: '🏠',
    color: '#EA580C',
    description: {
      en: 'Elective subject for HTET TGT and PGT.',
      hi: 'HTET TGT एवं PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'hsc-nutrition', subjectId: 'home-science', name: { en: 'Food & Nutrition', hi: 'भोजन एवं पोषण' } },
      { id: 'hsc-child', subjectId: 'home-science', name: { en: 'Child Development & Family', hi: 'बाल विकास एवं परिवार' } },
      { id: 'hsc-textile', subjectId: 'home-science', name: { en: 'Textiles & Clothing', hi: 'वस्त्र एवं परिधान' } },
      { id: 'hsc-resource', subjectId: 'home-science', name: { en: 'Resource Management', hi: 'संसाधन प्रबंधन' } },
      { id: 'hsc-health', subjectId: 'home-science', name: { en: 'Health, Hygiene & First Aid', hi: 'स्वास्थ्य, स्वच्छता एवं प्राथमिक चिकित्सा' } },
      { id: 'hsc-pedagogy', subjectId: 'home-science', name: { en: 'Home Science Pedagogy', hi: 'गृह विज्ञान शिक्षाशास्त्र' } },
    ],
  },
  {
    id: 'art',
    name: { en: 'Art', hi: 'कला' },
    icon: '🎨',
    color: '#F59E0B',
    description: {
      en: 'Elective subject for HTET TGT.',
      hi: 'HTET TGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'art-elements', subjectId: 'art', name: { en: 'Elements & Principles of Design', hi: 'डिज़ाइन के तत्व एवं सिद्धांत' } },
      { id: 'art-drawing', subjectId: 'art', name: { en: 'Drawing & Painting Techniques', hi: 'रेखांकन एवं चित्रकला तकनीक' } },
      { id: 'art-indian', subjectId: 'art', name: { en: 'Indian Art & Folk Traditions', hi: 'भारतीय कला एवं लोक परंपराएँ' } },
      { id: 'art-colour', subjectId: 'art', name: { en: 'Colour Theory', hi: 'रंग सिद्धांत' } },
      { id: 'art-craft', subjectId: 'art', name: { en: 'Craft & Applied Art', hi: 'शिल्प एवं अनुप्रयुक्त कला' } },
      { id: 'art-pedagogy', subjectId: 'art', name: { en: 'Art Pedagogy', hi: 'कला शिक्षाशास्त्र' } },
    ],
  },
  {
    id: 'punjabi',
    name: { en: 'Punjabi', hi: 'पंजाबी' },
    icon: '🪔',
    color: '#CA8A04',
    description: {
      en: 'Language elective for HTET TGT and PGT.',
      hi: 'HTET TGT एवं PGT हेतु भाषा ऐच्छिक विषय।',
    },
    topics: [
      { id: 'pun-vyakaran', subjectId: 'punjabi', name: { en: 'Punjabi Grammar', hi: 'पंजाबी व्याकरण' } },
      { id: 'pun-literature', subjectId: 'punjabi', name: { en: 'Punjabi Literature', hi: 'पंजाबी साहित्य' } },
      { id: 'pun-gurmukhi', subjectId: 'punjabi', name: { en: 'Gurmukhi Script & Spelling', hi: 'गुरमुखी लिपि एवं वर्तनी' } },
      { id: 'pun-comprehension', subjectId: 'punjabi', name: { en: 'Comprehension & Composition', hi: 'बोध एवं रचना' } },
      { id: 'pun-pedagogy', subjectId: 'punjabi', name: { en: 'Language Pedagogy', hi: 'भाषा शिक्षाशास्त्र' } },
    ],
  },
  {
    id: 'physical-education',
    name: { en: 'Physical Education', hi: 'शारीरिक शिक्षा' },
    icon: '🏃',
    color: '#16A34A',
    description: {
      en: 'Elective subject for HTET TGT and PGT.',
      hi: 'HTET TGT एवं PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'pe-anatomy', subjectId: 'physical-education', name: { en: 'Anatomy & Physiology', hi: 'शरीर रचना एवं क्रिया विज्ञान' } },
      { id: 'pe-training', subjectId: 'physical-education', name: { en: 'Training Methods & Fitness', hi: 'प्रशिक्षण विधियाँ एवं फिटनेस' } },
      { id: 'pe-psychology', subjectId: 'physical-education', name: { en: 'Sports Psychology', hi: 'खेल मनोविज्ञान' } },
      { id: 'pe-rules', subjectId: 'physical-education', name: { en: 'Games, Rules & Officiating', hi: 'खेल, नियम एवं निर्णायन' } },
      { id: 'pe-health', subjectId: 'physical-education', name: { en: 'Health Education & Nutrition', hi: 'स्वास्थ्य शिक्षा एवं पोषण' } },
      { id: 'pe-pedagogy', subjectId: 'physical-education', name: { en: 'Physical Education Pedagogy', hi: 'शारीरिक शिक्षा शिक्षाशास्त्र' } },
    ],
  },
  {
    id: 'urdu',
    name: { en: 'Urdu', hi: 'उर्दू' },
    icon: '📜',
    color: '#7C3AED',
    description: {
      en: 'Language elective for HTET TGT and PGT.',
      hi: 'HTET TGT एवं PGT हेतु भाषा ऐच्छिक विषय।',
    },
    topics: [
      { id: 'urd-qawaid', subjectId: 'urdu', name: { en: 'Urdu Grammar (Qawaid)', hi: 'उर्दू व्याकरण (क़वाइद)' } },
      { id: 'urd-literature', subjectId: 'urdu', name: { en: 'Urdu Literature & Poets', hi: 'उर्दू साहित्य एवं शायर' } },
      { id: 'urd-script', subjectId: 'urdu', name: { en: 'Script & Spelling', hi: 'लिपि एवं इमला' } },
      { id: 'urd-comprehension', subjectId: 'urdu', name: { en: 'Comprehension & Composition', hi: 'बोध एवं रचना' } },
      { id: 'urd-pedagogy', subjectId: 'urdu', name: { en: 'Language Pedagogy', hi: 'भाषा शिक्षाशास्त्र' } },
    ],
  },
  {
    id: 'physics',
    name: { en: 'Physics', hi: 'भौतिक विज्ञान' },
    icon: '🧲',
    color: '#2563EB',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'phy-mechanics', subjectId: 'physics', name: { en: 'Mechanics', hi: 'यांत्रिकी' } },
      { id: 'phy-thermo', subjectId: 'physics', name: { en: 'Heat & Thermodynamics', hi: 'ऊष्मा एवं ऊष्मागतिकी' } },
      { id: 'phy-waves', subjectId: 'physics', name: { en: 'Waves & Oscillations', hi: 'तरंग एवं दोलन' } },
      { id: 'phy-optics', subjectId: 'physics', name: { en: 'Optics', hi: 'प्रकाशिकी' } },
      { id: 'phy-electro', subjectId: 'physics', name: { en: 'Electricity & Magnetism', hi: 'विद्युत एवं चुंबकत्व' } },
      { id: 'phy-modern', subjectId: 'physics', name: { en: 'Modern & Nuclear Physics', hi: 'आधुनिक एवं नाभिकीय भौतिकी' } },
    ],
  },
  {
    id: 'chemistry',
    name: { en: 'Chemistry', hi: 'रसायन विज्ञान' },
    icon: '⚗️',
    color: '#DC2626',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'chem-physical', subjectId: 'chemistry', name: { en: 'Physical Chemistry', hi: 'भौतिक रसायन' } },
      { id: 'chem-organic', subjectId: 'chemistry', name: { en: 'Organic Chemistry', hi: 'कार्बनिक रसायन' } },
      { id: 'chem-inorganic', subjectId: 'chemistry', name: { en: 'Inorganic Chemistry', hi: 'अकार्बनिक रसायन' } },
      { id: 'chem-periodic', subjectId: 'chemistry', name: { en: 'Periodic Table & Bonding', hi: 'आवर्त सारणी एवं आबंधन' } },
      { id: 'chem-analytical', subjectId: 'chemistry', name: { en: 'Analytical Chemistry', hi: 'विश्लेषणात्मक रसायन' } },
      { id: 'chem-environmental', subjectId: 'chemistry', name: { en: 'Environmental Chemistry', hi: 'पर्यावरणीय रसायन' } },
    ],
  },
  {
    id: 'biology',
    name: { en: 'Biology', hi: 'जीव विज्ञान' },
    icon: '🧬',
    color: '#15803D',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'bio-cell', subjectId: 'biology', name: { en: 'Cell Biology & Genetics', hi: 'कोशिका विज्ञान एवं आनुवंशिकी' } },
      { id: 'bio-plant', subjectId: 'biology', name: { en: 'Plant Physiology & Botany', hi: 'पादप कार्यिकी एवं वनस्पति विज्ञान' } },
      { id: 'bio-animal', subjectId: 'biology', name: { en: 'Animal Physiology & Zoology', hi: 'जंतु कार्यिकी एवं प्राणि विज्ञान' } },
      { id: 'bio-ecology', subjectId: 'biology', name: { en: 'Ecology & Environment', hi: 'पारिस्थितिकी एवं पर्यावरण' } },
      { id: 'bio-evolution', subjectId: 'biology', name: { en: 'Evolution & Biodiversity', hi: 'विकास एवं जैव विविधता' } },
      { id: 'bio-human', subjectId: 'biology', name: { en: 'Human Health & Disease', hi: 'मानव स्वास्थ्य एवं रोग' } },
    ],
  },
  {
    id: 'history',
    name: { en: 'History', hi: 'इतिहास' },
    icon: '🏛️',
    color: '#B45309',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'his-ancient', subjectId: 'history', name: { en: 'Ancient India', hi: 'प्राचीन भारत' } },
      { id: 'his-medieval', subjectId: 'history', name: { en: 'Medieval India', hi: 'मध्यकालीन भारत' } },
      { id: 'his-modern', subjectId: 'history', name: { en: 'Modern India & Freedom Struggle', hi: 'आधुनिक भारत एवं स्वतंत्रता संग्राम' } },
      { id: 'his-world', subjectId: 'history', name: { en: 'World History', hi: 'विश्व इतिहास' } },
      { id: 'his-post', subjectId: 'history', name: { en: 'Post-Independence India', hi: 'स्वतंत्रता के बाद का भारत' } },
      { id: 'his-historiography', subjectId: 'history', name: { en: 'Historiography & Sources', hi: 'इतिहास लेखन एवं स्रोत' } },
    ],
  },
  {
    id: 'geography',
    name: { en: 'Geography', hi: 'भूगोल' },
    icon: '🗺️',
    color: '#0D9488',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'geo-physical', subjectId: 'geography', name: { en: 'Physical Geography', hi: 'भौतिक भूगोल' } },
      { id: 'geo-india', subjectId: 'geography', name: { en: 'Geography of India', hi: 'भारत का भूगोल' } },
      { id: 'geo-human', subjectId: 'geography', name: { en: 'Human & Economic Geography', hi: 'मानव एवं आर्थिक भूगोल' } },
      { id: 'geo-climate', subjectId: 'geography', name: { en: 'Climatology & Oceanography', hi: 'जलवायु विज्ञान एवं समुद्र विज्ञान' } },
      { id: 'geo-maps', subjectId: 'geography', name: { en: 'Maps, Survey & Remote Sensing', hi: 'मानचित्र, सर्वेक्षण एवं सुदूर संवेदन' } },
      { id: 'geo-environment', subjectId: 'geography', name: { en: 'Environmental Geography', hi: 'पर्यावरणीय भूगोल' } },
    ],
  },
  {
    id: 'political-science',
    name: { en: 'Political Science', hi: 'राजनीति विज्ञान' },
    icon: '⚖️',
    color: '#4338CA',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'pol-theory', subjectId: 'political-science', name: { en: 'Political Theory & Thought', hi: 'राजनीतिक सिद्धांत एवं विचार' } },
      { id: 'pol-constitution', subjectId: 'political-science', name: { en: 'Indian Constitution', hi: 'भारतीय संविधान' } },
      { id: 'pol-government', subjectId: 'political-science', name: { en: 'Indian Government & Politics', hi: 'भारतीय शासन एवं राजनीति' } },
      { id: 'pol-comparative', subjectId: 'political-science', name: { en: 'Comparative Politics', hi: 'तुलनात्मक राजनीति' } },
      { id: 'pol-international', subjectId: 'political-science', name: { en: 'International Relations', hi: 'अंतर्राष्ट्रीय संबंध' } },
      { id: 'pol-administration', subjectId: 'political-science', name: { en: 'Public Administration', hi: 'लोक प्रशासन' } },
    ],
  },
  {
    id: 'economics',
    name: { en: 'Economics', hi: 'अर्थशास्त्र' },
    icon: '📈',
    color: '#0F766E',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'eco-micro', subjectId: 'economics', name: { en: 'Microeconomics', hi: 'व्यष्टि अर्थशास्त्र' } },
      { id: 'eco-macro', subjectId: 'economics', name: { en: 'Macroeconomics', hi: 'समष्टि अर्थशास्त्र' } },
      { id: 'eco-indian', subjectId: 'economics', name: { en: 'Indian Economy', hi: 'भारतीय अर्थव्यवस्था' } },
      { id: 'eco-statistics', subjectId: 'economics', name: { en: 'Statistics for Economics', hi: 'अर्थशास्त्र हेतु सांख्यिकी' } },
      { id: 'eco-money', subjectId: 'economics', name: { en: 'Money, Banking & Public Finance', hi: 'मुद्रा, बैंकिंग एवं लोक वित्त' } },
      { id: 'eco-development', subjectId: 'economics', name: { en: 'Development & International Trade', hi: 'विकास एवं अंतर्राष्ट्रीय व्यापार' } },
    ],
  },
  {
    id: 'sociology',
    name: { en: 'Sociology', hi: 'समाजशास्त्र' },
    icon: '👥',
    color: '#9333EA',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'soc-concepts', subjectId: 'sociology', name: { en: 'Basic Concepts & Thinkers', hi: 'मूल संकल्पनाएँ एवं विचारक' } },
      { id: 'soc-institutions', subjectId: 'sociology', name: { en: 'Social Institutions', hi: 'सामाजिक संस्थाएँ' } },
      { id: 'soc-stratification', subjectId: 'sociology', name: { en: 'Social Stratification & Change', hi: 'सामाजिक स्तरीकरण एवं परिवर्तन' } },
      { id: 'soc-indian', subjectId: 'sociology', name: { en: 'Indian Society', hi: 'भारतीय समाज' } },
      { id: 'soc-research', subjectId: 'sociology', name: { en: 'Research Methods', hi: 'अनुसंधान पद्धतियाँ' } },
      { id: 'soc-issues', subjectId: 'sociology', name: { en: 'Contemporary Social Issues', hi: 'समकालीन सामाजिक मुद्दे' } },
    ],
  },
  {
    id: 'psychology',
    name: { en: 'Psychology', hi: 'मनोविज्ञान' },
    icon: '🧩',
    color: '#BE185D',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'psy-foundations', subjectId: 'psychology', name: { en: 'Foundations & Schools of Psychology', hi: 'मनोविज्ञान की नींव एवं संप्रदाय' } },
      { id: 'psy-cognition', subjectId: 'psychology', name: { en: 'Learning, Memory & Cognition', hi: 'अधिगम, स्मृति एवं संज्ञान' } },
      { id: 'psy-personality', subjectId: 'psychology', name: { en: 'Personality & Intelligence', hi: 'व्यक्तित्व एवं बुद्धि' } },
      { id: 'psy-development', subjectId: 'psychology', name: { en: 'Developmental Psychology', hi: 'विकासात्मक मनोविज्ञान' } },
      { id: 'psy-social', subjectId: 'psychology', name: { en: 'Social Psychology', hi: 'सामाजिक मनोविज्ञान' } },
      { id: 'psy-methods', subjectId: 'psychology', name: { en: 'Statistics & Research Methods', hi: 'सांख्यिकी एवं अनुसंधान पद्धति' } },
    ],
  },
  {
    id: 'commerce',
    name: { en: 'Commerce', hi: 'वाणिज्य' },
    icon: '🧾',
    color: '#B91C1C',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'com-accounting', subjectId: 'commerce', name: { en: 'Financial Accounting', hi: 'वित्तीय लेखांकन' } },
      { id: 'com-business', subjectId: 'commerce', name: { en: 'Business Studies & Management', hi: 'व्यवसाय अध्ययन एवं प्रबंधन' } },
      { id: 'com-cost', subjectId: 'commerce', name: { en: 'Cost & Management Accounting', hi: 'लागत एवं प्रबंधन लेखांकन' } },
      { id: 'com-corporate', subjectId: 'commerce', name: { en: 'Company Law & Corporate Accounting', hi: 'कंपनी विधि एवं कॉर्पोरेट लेखांकन' } },
      { id: 'com-finance', subjectId: 'commerce', name: { en: 'Business Finance & Marketing', hi: 'व्यावसायिक वित्त एवं विपणन' } },
      { id: 'com-statistics', subjectId: 'commerce', name: { en: 'Business Statistics', hi: 'व्यावसायिक सांख्यिकी' } },
    ],
  },
  {
    id: 'computer-science',
    name: { en: 'Computer Science', hi: 'कंप्यूटर विज्ञान' },
    icon: '🖥️',
    color: '#1D4ED8',
    description: {
      en: 'Elective subject for HTET PGT. Distinct from Computer Literacy, which is the ICT block in recruitment papers.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय। कंप्यूटर साक्षरता से भिन्न, जो भर्ती पेपरों का ICT खंड है।',
    },
    topics: [
      { id: 'cs-fundamentals', subjectId: 'computer-science', name: { en: 'Computer Fundamentals & Architecture', hi: 'कंप्यूटर मूल बातें एवं संरचना' } },
      { id: 'cs-programming', subjectId: 'computer-science', name: { en: 'Programming & Data Structures', hi: 'प्रोग्रामिंग एवं डेटा संरचना' } },
      { id: 'cs-dbms', subjectId: 'computer-science', name: { en: 'Database Management Systems', hi: 'डेटाबेस प्रबंधन प्रणाली' } },
      { id: 'cs-os', subjectId: 'computer-science', name: { en: 'Operating Systems', hi: 'ऑपरेटिंग सिस्टम' } },
      { id: 'cs-networks', subjectId: 'computer-science', name: { en: 'Computer Networks & Internet', hi: 'कंप्यूटर नेटवर्क एवं इंटरनेट' } },
      { id: 'cs-web', subjectId: 'computer-science', name: { en: 'Web Technologies & Cyber Security', hi: 'वेब तकनीक एवं साइबर सुरक्षा' } },
    ],
  },
  {
    id: 'fine-arts',
    name: { en: 'Fine Arts', hi: 'ललित कला' },
    icon: '🖼️',
    color: '#D97706',
    description: {
      en: 'Elective subject for HTET PGT.',
      hi: 'HTET PGT हेतु ऐच्छिक विषय।',
    },
    topics: [
      { id: 'fa-history', subjectId: 'fine-arts', name: { en: 'History of Indian Art', hi: 'भारतीय कला का इतिहास' } },
      { id: 'fa-western', subjectId: 'fine-arts', name: { en: 'Western Art Movements', hi: 'पाश्चात्य कला आंदोलन' } },
      { id: 'fa-painting', subjectId: 'fine-arts', name: { en: 'Painting & Composition', hi: 'चित्रकला एवं संयोजन' } },
      { id: 'fa-sculpture', subjectId: 'fine-arts', name: { en: 'Sculpture & Graphics', hi: 'मूर्तिकला एवं ग्राफ़िक्स' } },
      { id: 'fa-aesthetics', subjectId: 'fine-arts', name: { en: 'Aesthetics & Art Appreciation', hi: 'सौंदर्यशास्त्र एवं कला मूल्यांकन' } },
      { id: 'fa-pedagogy', subjectId: 'fine-arts', name: { en: 'Fine Arts Pedagogy', hi: 'ललित कला शिक्षाशास्त्र' } },
    ],
  },
];

export const SUBJECT_BY_ID = new Map(SUBJECTS.map((s) => [s.id, s]));

export const ALL_TOPICS = SUBJECTS.flatMap((s) => s.topics);

export const TOPIC_BY_ID = new Map(ALL_TOPICS.map((t) => [t.id, t]));

export const getSubject = (id: string): Subject | undefined => SUBJECT_BY_ID.get(id);

export const getTopic = (id: string) => TOPIC_BY_ID.get(id);
