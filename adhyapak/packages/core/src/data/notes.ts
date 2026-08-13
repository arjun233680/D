import type { Note } from '../types';

/**
 * Notes carry real readable content in `sections` so the in-app reader works
 * offline. `fileUrl` is optional — set it when a PDF is uploaded.
 */
export const NOTES: Note[] = [
  {
    id: 'note-cdp-01',
    title: { en: 'Piaget — One Page Revision', hi: 'पियाजे — एक पृष्ठ पुनरावृत्ति' },
    subjectId: 'cdp',
    topicId: 'cdp-piaget',
    examIds: ['ctet', 'htet', 'uptet', 'reet', 'bihartet', 'kvs', 'nvs', 'dsssb'],
    educatorId: 'edu-anjali',
    pages: 6,
    downloads: 184000,
    updatedAt: '2026-08-04',
    access: 'free',
    language: 'both',
    tags: [
      { en: 'High yield', hi: 'अति महत्वपूर्ण' },
      { en: 'PYQ backed', hi: 'PYQ आधारित' },
    ],
    sections: [
      {
        heading: { en: 'The four stages', hi: 'चार अवस्थाएँ' },
        body: {
          en: 'Piaget held that cognitive development moves through four invariant stages. The order never changes; only the age of arrival varies between children.',
          hi: 'पियाजे के अनुसार संज्ञानात्मक विकास चार अपरिवर्तनीय अवस्थाओं से होकर गुजरता है। क्रम कभी नहीं बदलता; केवल पहुँचने की आयु बालकों में भिन्न होती है।',
        },
        bullets: [
          { en: 'Sensorimotor (0-2 yrs) — object permanence develops', hi: 'संवेदी-पेशीय (0-2 वर्ष) — वस्तु स्थायित्व विकसित होता है' },
          { en: 'Pre-operational (2-7 yrs) — egocentrism, animism, no conservation', hi: 'पूर्व-संक्रियात्मक (2-7 वर्ष) — अहंकेंद्रितता, जीववाद, संरक्षण नहीं' },
          { en: 'Concrete operational (7-11 yrs) — conservation, seriation, classification', hi: 'मूर्त संक्रियात्मक (7-11 वर्ष) — संरक्षण, क्रमबद्धता, वर्गीकरण' },
          { en: 'Formal operational (11+ yrs) — abstract and hypothetical reasoning', hi: 'औपचारिक संक्रियात्मक (11+ वर्ष) — अमूर्त एवं परिकल्पनात्मक चिंतन' },
        ],
        callout: {
          en: 'Exam trick: if the question mentions an age, convert it to the stage first. Two-thirds of Piaget questions are solved at that step.',
          hi: 'परीक्षा ट्रिक: यदि प्रश्न में आयु दी हो तो पहले उसे अवस्था में बदलें। पियाजे के दो-तिहाई प्रश्न इसी चरण पर हल हो जाते हैं।',
        },
      },
      {
        heading: { en: 'Key terms that decide the answer', hi: 'उत्तर तय करने वाले मुख्य शब्द' },
        body: {
          en: 'Schema is the mental structure. Assimilation fits new information into an existing schema; accommodation changes the schema to fit new information; equilibration is the balance between the two that drives development forward.',
          hi: 'स्कीमा मानसिक संरचना है। आत्मसातीकरण नई सूचना को विद्यमान स्कीमा में समायोजित करता है; समायोजन स्कीमा को नई सूचना के अनुरूप बदलता है; संतुलनीकरण दोनों के बीच वह संतुलन है जो विकास को आगे बढ़ाता है।',
        },
        callout: {
          en: 'A child calling every four-legged animal "dog" is assimilation. Learning that a cat is different is accommodation.',
          hi: 'हर चार पैर वाले जानवर को "कुत्ता" कहना आत्मसातीकरण है। बिल्ली अलग है यह सीखना समायोजन है।',
        },
      },
      {
        heading: { en: 'What CBSE actually asks', hi: 'CBSE वास्तव में क्या पूछता है' },
        body: {
          en: 'Across recent CTET papers the pattern is stable: one age-to-stage question, one conservation or egocentrism scenario, and one application question asking what a teacher should do. Learn the classroom implication of each stage, not only its name.',
          hi: 'हाल के CTET पेपरों में पैटर्न स्थिर है: एक आयु-से-अवस्था प्रश्न, एक संरक्षण या अहंकेंद्रितता की स्थिति, तथा एक अनुप्रयोग प्रश्न कि शिक्षक को क्या करना चाहिए। प्रत्येक अवस्था का कक्षागत निहितार्थ सीखें, केवल नाम नहीं।',
        },
      },
    ],
  },
  {
    id: 'note-cdp-02',
    title: { en: 'RTE Act 2009 — Every Section That Gets Asked', hi: 'RTE अधिनियम 2009 — पूछे जाने वाले सभी अनुभाग' },
    subjectId: 'cdp',
    topicId: 'cdp-rte',
    examIds: ['ctet', 'htet', 'uptet', 'reet', 'bihartet', 'dsssb', 'kvs'],
    educatorId: 'edu-anjali',
    pages: 8,
    downloads: 156000,
    updatedAt: '2026-08-07',
    access: 'free',
    language: 'both',
    tags: [{ en: 'Law', hi: 'विधि' }, { en: 'Guaranteed questions', hi: 'निश्चित प्रश्न' }],
    sections: [
      {
        heading: { en: 'The basics', hi: 'मूल बातें' },
        body: {
          en: 'The Right of Children to Free and Compulsory Education Act was passed in 2009 and came into force on 1 April 2010, giving effect to Article 21-A inserted by the 86th Amendment (2002).',
          hi: 'निःशुल्क एवं अनिवार्य बाल शिक्षा का अधिकार अधिनियम 2009 में पारित हुआ तथा 1 अप्रैल 2010 से लागू हुआ, जिसने 86वें संशोधन (2002) द्वारा जोड़े गए अनुच्छेद 21-क को प्रभावी किया।',
        },
        bullets: [
          { en: 'Age group: 6 to 14 years (Classes 1 to 8)', hi: 'आयु वर्ग: 6 से 14 वर्ष (कक्षा 1 से 8)' },
          { en: '25% seats in private schools for disadvantaged groups (Sec 12)', hi: 'निजी विद्यालयों में वंचित वर्ग हेतु 25% सीटें (धारा 12)' },
          { en: 'No detention, no board exam till Class 8 (as originally enacted)', hi: 'कक्षा 8 तक कोई अनुत्तीर्णता एवं बोर्ड परीक्षा नहीं (मूल रूप में)' },
          { en: 'No physical punishment or mental harassment (Sec 17)', hi: 'शारीरिक दंड अथवा मानसिक उत्पीड़न निषिद्ध (धारा 17)' },
          { en: 'No screening procedure or capitation fee (Sec 13)', hi: 'कोई स्क्रीनिंग प्रक्रिया अथवा कैपिटेशन शुल्क नहीं (धारा 13)' },
        ],
        callout: {
          en: 'Pupil-Teacher Ratio: 30:1 for Classes 1-5 and 35:1 for Classes 6-8. This number is asked almost every cycle.',
          hi: 'छात्र-शिक्षक अनुपात: कक्षा 1-5 हेतु 30:1 तथा कक्षा 6-8 हेतु 35:1। यह संख्या लगभग हर सत्र में पूछी जाती है।',
        },
      },
      {
        heading: { en: 'School Management Committee', hi: 'विद्यालय प्रबंधन समिति' },
        body: {
          en: 'Every government and aided school must constitute an SMC. At least 75% of members are parents or guardians, and at least 50% of members are women. The SMC monitors the school\'s working and prepares the School Development Plan.',
          hi: 'प्रत्येक सरकारी एवं सहायता प्राप्त विद्यालय को SMC गठित करनी होती है। कम से कम 75% सदस्य अभिभावक होते हैं तथा कम से कम 50% सदस्य महिलाएँ होती हैं। SMC विद्यालय के कार्य की निगरानी करती है तथा विद्यालय विकास योजना बनाती है।',
        },
      },
    ],
  },
  {
    id: 'note-math-01',
    title: { en: 'Number System — Formula & Shortcut Sheet', hi: 'संख्या पद्धति — सूत्र एवं शॉर्टकट पत्र' },
    subjectId: 'math',
    topicId: 'math-number',
    examIds: ['ctet', 'uptet', 'reet', 'htet', 'supertet', 'dsssb', 'kvs'],
    educatorId: 'edu-rakesh',
    pages: 12,
    downloads: 212000,
    updatedAt: '2026-08-03',
    access: 'free',
    language: 'both',
    tags: [{ en: 'Formula sheet', hi: 'सूत्र पत्र' }],
    sections: [
      {
        heading: { en: 'Divisibility rules worth memorising', hi: 'याद रखने योग्य विभाज्यता नियम' },
        body: {
          en: 'These four cover almost every divisibility question asked at the primary and upper-primary level.',
          hi: 'ये चार नियम प्राथमिक एवं उच्च प्राथमिक स्तर के लगभग सभी विभाज्यता प्रश्नों को कवर करते हैं।',
        },
        bullets: [
          { en: 'By 3 — digit sum divisible by 3', hi: '3 से — अंकों का योग 3 से विभाज्य हो' },
          { en: 'By 4 — last two digits divisible by 4', hi: '4 से — अंतिम दो अंक 4 से विभाज्य हों' },
          { en: 'By 8 — last three digits divisible by 8', hi: '8 से — अंतिम तीन अंक 8 से विभाज्य हों' },
          { en: 'By 11 — difference of alternate digit sums is 0 or a multiple of 11', hi: '11 से — एकांतर अंकों के योगों का अंतर 0 अथवा 11 का गुणज हो' },
        ],
      },
      {
        heading: { en: 'HCF and LCM', hi: 'HCF एवं LCM' },
        body: {
          en: 'For any two numbers, HCF × LCM = product of the numbers. Use prime factorisation for LCM (highest power of each prime) and for HCF (lowest power of each common prime).',
          hi: 'किन्हीं दो संख्याओं हेतु, HCF × LCM = संख्याओं का गुणनफल। LCM हेतु अभाज्य गुणनखंडन में प्रत्येक अभाज्य की उच्चतम घात तथा HCF हेतु प्रत्येक उभयनिष्ठ अभाज्य की न्यूनतम घात लें।',
        },
        callout: {
          en: 'If a question gives HCF, LCM and one number, the fourth value is always one division away.',
          hi: 'यदि प्रश्न में HCF, LCM तथा एक संख्या दी हो, तो चौथा मान सदैव एक भाग की दूरी पर होता है।',
        },
      },
    ],
  },
  {
    id: 'note-evs-01',
    title: { en: 'EVS Theme-wise Notes (All 6 Themes)', hi: 'EVS थीमवार नोट्स (सभी 6 थीम)' },
    subjectId: 'evs',
    topicId: 'evs-pedagogy',
    examIds: ['ctet', 'uptet', 'reet', 'htet', 'bihartet', 'kvs', 'nvs'],
    educatorId: 'edu-priya',
    pages: 24,
    downloads: 198000,
    updatedAt: '2026-08-09',
    access: 'plus',
    language: 'both',
    tags: [{ en: 'Complete syllabus', hi: 'पूर्ण पाठ्यक्रम' }],
    sections: [
      {
        heading: { en: 'How the syllabus is organised', hi: 'पाठ्यक्रम का संगठन' },
        body: {
          en: 'CTET organises EVS into six themes rather than subjects: Family and Friends, Food, Shelter, Water, Travel, and Things We Make and Do. Roughly one third of the paper is pedagogy.',
          hi: 'CTET, EVS को विषयों के बजाय छह थीम में बाँटता है: परिवार एवं मित्र, भोजन, आवास, पानी, यात्रा तथा हम चीज़ें कैसे बनाते हैं। लगभग एक तिहाई पेपर शिक्षाशास्त्र होता है।',
        },
      },
      {
        heading: { en: 'The pedagogy rule that answers most questions', hi: 'वह शिक्षाशास्त्र नियम जो अधिकांश प्रश्नों का उत्तर देता है' },
        body: {
          en: 'When an EVS pedagogy question offers four options, the correct one almost always involves the child observing, exploring, discussing or surveying their own surroundings. Options built on memorisation, dictation or completing the textbook are distractors.',
          hi: 'जब EVS शिक्षाशास्त्र प्रश्न में चार विकल्प हों, तो सही विकल्प प्रायः वही होता है जिसमें बालक अपने परिवेश का प्रेक्षण, खोज, चर्चा या सर्वेक्षण करता है। रटने, लिखवाने या पाठ्यपुस्तक पूरी करने वाले विकल्प भ्रामक होते हैं।',
        },
        callout: {
          en: 'This single rule reliably converts 6-8 marks in Paper 1.',
          hi: 'यही एक नियम पेपर 1 में 6-8 अंक निश्चित रूप से दिलाता है।',
        },
      },
    ],
  },
  {
    id: 'note-hindi-01',
    title: { en: 'Alankar Chart with Examples', hi: 'उदाहरण सहित अलंकार चार्ट' },
    subjectId: 'hindi',
    topicId: 'hindi-alankar',
    examIds: ['ctet', 'uptet', 'reet', 'htet', 'bihartet', 'supertet'],
    educatorId: 'edu-sunita',
    pages: 5,
    downloads: 241000,
    updatedAt: '2026-07-31',
    access: 'free',
    language: 'hi',
    tags: [{ en: 'Chart', hi: 'चार्ट' }, { en: 'Revision', hi: 'पुनरावृत्ति' }],
    sections: [
      {
        heading: { en: 'Shabdalankar', hi: 'शब्दालंकार' },
        body: {
          en: 'Based on sound. Anupras repeats a consonant, Yamak repeats a word in different senses, and Shlesh uses one word carrying two meanings at once.',
          hi: 'ध्वनि पर आधारित। अनुप्रास में व्यंजन की आवृत्ति, यमक में एक शब्द भिन्न अर्थों में तथा श्लेष में एक ही शब्द एक साथ दो अर्थ देता है।',
        },
        bullets: [
          { en: 'Anupras: "चारु चंद्र की चंचल किरणें"', hi: 'अनुप्रास: "चारु चंद्र की चंचल किरणें"' },
          { en: 'Yamak: "कनक कनक ते सौ गुनी"', hi: 'यमक: "कनक कनक ते सौ गुनी"' },
          { en: 'Shlesh: "रहिमन पानी राखिये"', hi: 'श्लेष: "रहिमन पानी राखिये"' },
        ],
      },
      {
        heading: { en: 'Arthalankar', hi: 'अर्थालंकार' },
        body: {
          en: 'Based on meaning. Upma compares with a connecting word (सा, सम, जैसा); Rupak asserts identity without one; Utpreksha imagines one thing as another using मानो/जनु.',
          hi: 'अर्थ पर आधारित। उपमा में वाचक शब्द (सा, सम, जैसा) से तुलना होती है; रूपक में बिना वाचक अभेद आरोप होता है; उत्प्रेक्षा में मानो/जनु से एक वस्तु में दूसरी की संभावना की जाती है।',
        },
        callout: {
          en: 'Spot the connecting word first: present means Upma, absent with identity means Rupak, मानो/जनु means Utpreksha.',
          hi: 'पहले वाचक शब्द देखें: उपस्थित हो तो उपमा, अनुपस्थित एवं अभेद हो तो रूपक, मानो/जनु हो तो उत्प्रेक्षा।',
        },
      },
    ],
  },
  {
    id: 'note-eng-01',
    title: { en: 'English Grammar Rules for TET', hi: 'TET हेतु अंग्रेज़ी व्याकरण नियम' },
    subjectId: 'english',
    topicId: 'eng-grammar',
    examIds: ['ctet', 'kvs', 'nvs', 'dsssb', 'htet', 'uptet'],
    educatorId: 'edu-imran',
    pages: 10,
    downloads: 132000,
    updatedAt: '2026-08-06',
    access: 'free',
    language: 'both',
    tags: [{ en: 'Grammar', hi: 'व्याकरण' }],
    sections: [
      {
        heading: { en: 'Since vs For', hi: 'Since बनाम For' },
        body: {
          en: '"Since" takes a point in time — since 2019, since Monday, since morning. "For" takes a duration — for five years, for two hours. Both usually pair with the perfect tenses.',
          hi: '"Since" समय-बिंदु लेता है — since 2019, since Monday, since morning। "For" अवधि लेता है — for five years, for two hours। दोनों प्रायः perfect tense के साथ आते हैं।',
        },
      },
      {
        heading: { en: 'Conditionals at a glance', hi: 'Conditionals एक दृष्टि में' },
        body: {
          en: 'Zero: If + present, present (general truth). First: If + present, will + verb (likely future). Second: If + past, would + verb (unreal present). Third: If + had + V3, would have + V3 (unreal past).',
          hi: 'Zero: If + present, present (सामान्य सत्य)। First: If + present, will + verb (संभावित भविष्य)। Second: If + past, would + verb (काल्पनिक वर्तमान)। Third: If + had + V3, would have + V3 (काल्पनिक भूत)।',
        },
      },
    ],
  },
  {
    id: 'note-gk-01',
    title: { en: 'NEP 2020 — Complete Summary for Teaching Exams', hi: 'NEP 2020 — शिक्षक परीक्षाओं हेतु पूर्ण सारांश' },
    subjectId: 'gk',
    topicId: 'gk-polity',
    examIds: ['ctet', 'kvs', 'nvs', 'dsssb', 'htet', 'reet', 'hssc-tgt-pgt', 'emrs'],
    educatorId: 'edu-manoj',
    pages: 14,
    downloads: 267000,
    updatedAt: '2026-08-10',
    access: 'free',
    language: 'both',
    tags: [{ en: 'Must read', hi: 'अवश्य पढ़ें' }, { en: 'Policy', hi: 'नीति' }],
    sections: [
      {
        heading: { en: 'The 5+3+3+4 structure', hi: '5+3+3+4 संरचना' },
        body: {
          en: 'NEP 2020 replaced the 10+2 structure with a curricular design mapped to developmental stages rather than to school grades alone.',
          hi: 'NEP 2020 ने 10+2 संरचना के स्थान पर ऐसी पाठ्यचर्या संरचना दी जो केवल कक्षाओं के बजाय विकासात्मक अवस्थाओं से जुड़ी है।',
        },
        bullets: [
          { en: 'Foundational: 5 years (3 pre-school + Classes 1-2), ages 3-8', hi: 'आधारभूत: 5 वर्ष (3 वर्ष पूर्व-विद्यालय + कक्षा 1-2), आयु 3-8' },
          { en: 'Preparatory: 3 years (Classes 3-5), ages 8-11', hi: 'तैयारी: 3 वर्ष (कक्षा 3-5), आयु 8-11' },
          { en: 'Middle: 3 years (Classes 6-8), ages 11-14', hi: 'मध्य: 3 वर्ष (कक्षा 6-8), आयु 11-14' },
          { en: 'Secondary: 4 years (Classes 9-12), ages 14-18', hi: 'माध्यमिक: 4 वर्ष (कक्षा 9-12), आयु 14-18' },
        ],
        callout: {
          en: 'Remember the ages, not just the years — questions are usually framed on the age band.',
          hi: 'केवल वर्ष नहीं, आयु भी याद रखें — प्रश्न प्रायः आयु वर्ग पर बनते हैं।',
        },
      },
      {
        heading: { en: 'Points asked repeatedly', hi: 'बार-बार पूछे जाने वाले बिंदु' },
        body: {
          en: 'NEP targets 6% of GDP for education, mother tongue as medium at least till Class 5 (preferably Class 8), a 4-year integrated B.Ed as the minimum teaching qualification by 2030, and NCTE-framed NPST professional standards.',
          hi: 'NEP शिक्षा हेतु GDP का 6% लक्ष्य, कम से कम कक्षा 5 (यथासंभव कक्षा 8) तक मातृभाषा माध्यम, 2030 तक न्यूनतम शिक्षक योग्यता के रूप में 4 वर्षीय एकीकृत B.Ed तथा NCTE द्वारा निर्मित NPST व्यावसायिक मानक निर्धारित करती है।',
        },
      },
    ],
  },
  {
    id: 'note-sst-01',
    title: { en: 'Constitutional Amendments Related to Education', hi: 'शिक्षा से संबंधित संवैधानिक संशोधन' },
    subjectId: 'sst',
    topicId: 'sst-civics',
    examIds: ['dsssb', 'kvs', 'nvs', 'hssc-tgt-pgt', 'ctet', 'emrs', 'htet'],
    educatorId: 'edu-manoj',
    pages: 7,
    downloads: 98000,
    updatedAt: '2026-08-11',
    access: 'free',
    language: 'both',
    tags: [{ en: 'Polity', hi: 'राजव्यवस्था' }],
    sections: [
      {
        heading: { en: 'The four amendments that matter', hi: 'चार महत्वपूर्ण संशोधन' },
        body: {
          en: 'Education questions in teaching exams cluster around these four amendments. Learn the number, the year and the change together.',
          hi: 'शिक्षक परीक्षाओं में शिक्षा संबंधी प्रश्न इन्हीं चार संशोधनों के इर्द-गिर्द रहते हैं। संख्या, वर्ष एवं परिवर्तन एक साथ याद करें।',
        },
        bullets: [
          { en: '42nd (1976) — education moved to the Concurrent List; Fundamental Duties added', hi: '42वाँ (1976) — शिक्षा समवर्ती सूची में; मूल कर्तव्य जोड़े गए' },
          { en: '73rd & 74th (1992) — panchayats and municipalities given a role in schooling', hi: '73वाँ एवं 74वाँ (1992) — पंचायतों एवं नगरपालिकाओं को विद्यालयी भूमिका' },
          { en: '86th (2002) — Article 21-A made elementary education a fundamental right', hi: '86वाँ (2002) — अनुच्छेद 21-क ने प्रारंभिक शिक्षा को मूल अधिकार बनाया' },
          { en: '93rd (2005) — reservation in private unaided educational institutions', hi: '93वाँ (2005) — निजी गैर-सहायता प्राप्त शिक्षण संस्थानों में आरक्षण' },
        ],
      },
    ],
  },
];

export const NOTE_BY_ID = new Map(NOTES.map((n) => [n.id, n]));
export const getNote = (id: string) => NOTE_BY_ID.get(id);
export const notesByExam = (examId: string) => NOTES.filter((n) => n.examIds.includes(examId));
export const notesBySubject = (subjectId: string) => NOTES.filter((n) => n.subjectId === subjectId);
