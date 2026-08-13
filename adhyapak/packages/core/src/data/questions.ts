import type { Question, QuestionDifficulty } from '../types';

interface QuestionSeed {
  id: string;
  subjectId: string;
  topicId: string;
  examIds: string[];
  en: string;
  hi: string;
  /** Four options as [en, hi] pairs. */
  options: [string, string][];
  correctIndex: number;
  expEn: string;
  expHi: string;
  difficulty: QuestionDifficulty;
  pyq?: string;
  avgTime: number;
  accuracy: number;
}

const build = (s: QuestionSeed): Question => ({
  id: s.id,
  subjectId: s.subjectId,
  topicId: s.topicId,
  examIds: s.examIds,
  text: { en: s.en, hi: s.hi },
  options: s.options.map(([en, hi]) => ({ en, hi })),
  correctIndex: s.correctIndex,
  explanation: { en: s.expEn, hi: s.expHi },
  difficulty: s.difficulty,
  previousYear: s.pyq,
  avgTimeSeconds: s.avgTime,
  accuracy: s.accuracy,
});

const ALL_TET = ['ctet', 'htet', 'uptet', 'bihartet', 'reet', 'mptet', 'wbtet'];
const RECRUIT = ['dsssb', 'kvs', 'nvs', 'hssc-tgt-pgt', 'supertet', 'awes', 'emrs'];

const SEEDS: QuestionSeed[] = [
  /* ----------------------------------------------------------------- CDP */
  {
    id: 'q-cdp-001',
    subjectId: 'cdp',
    topicId: 'cdp-piaget',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'According to Piaget, a child between 7 and 11 years of age is in which stage of cognitive development?',
    hi: 'पियाजे के अनुसार 7 से 11 वर्ष आयु का बालक संज्ञानात्मक विकास की किस अवस्था में होता है?',
    options: [
      ['Sensorimotor stage', 'संवेदी-पेशीय अवस्था'],
      ['Pre-operational stage', 'पूर्व-संक्रियात्मक अवस्था'],
      ['Concrete operational stage', 'मूर्त संक्रियात्मक अवस्था'],
      ['Formal operational stage', 'औपचारिक संक्रियात्मक अवस्था'],
    ],
    correctIndex: 2,
    expEn:
      'Piaget places 7-11 years in the concrete operational stage. The child can now reason logically about concrete objects, and masters conservation, seriation and classification — but abstract hypothetical thinking arrives only in the formal operational stage (11+).',
    expHi:
      'पियाजे 7-11 वर्ष को मूर्त संक्रियात्मक अवस्था में रखते हैं। इस अवस्था में बालक मूर्त वस्तुओं पर तार्किक चिंतन कर लेता है तथा संरक्षण, क्रमबद्धता एवं वर्गीकरण सीख जाता है — किंतु अमूर्त एवं परिकल्पनात्मक चिंतन औपचारिक संक्रियात्मक अवस्था (11+) में ही आता है।',
    difficulty: 'easy',
    pyq: 'CTET Dec 2022 Paper 1',
    avgTime: 32,
    accuracy: 0.78,
  },
  {
    id: 'q-cdp-002',
    subjectId: 'cdp',
    topicId: 'cdp-piaget',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The concept of the "Zone of Proximal Development" was given by:',
    hi: '"निकटस्थ विकास का क्षेत्र" (ZPD) की संकल्पना किसने दी?',
    options: [
      ['Jean Piaget', 'जीन पियाजे'],
      ['Lev Vygotsky', 'लेव वाइगोत्स्की'],
      ['Jerome Bruner', 'जेरोम ब्रूनर'],
      ['Erik Erikson', 'एरिक एरिक्सन'],
    ],
    correctIndex: 1,
    expEn:
      'Vygotsky defined the ZPD as the gap between what a learner can do alone and what they can do with guidance from a more knowledgeable other. Scaffolding — the term Bruner later coined — is the support given inside this zone.',
    expHi:
      'वाइगोत्स्की ने ZPD को उस अंतर के रूप में परिभाषित किया जो बालक स्वयं कर सकता है तथा जो वह किसी अधिक जानकार व्यक्ति के मार्गदर्शन में कर सकता है, उनके बीच होता है। स्कैफोल्डिंग — यह शब्द बाद में ब्रूनर ने दिया — इसी क्षेत्र में दिया गया सहारा है।',
    difficulty: 'easy',
    pyq: 'CTET Jan 2024 Paper 2',
    avgTime: 25,
    accuracy: 0.84,
  },
  {
    id: 'q-cdp-003',
    subjectId: 'cdp',
    topicId: 'cdp-growth',
    examIds: ALL_TET,
    en: 'Development proceeds from the head towards the feet. This principle is known as:',
    hi: 'विकास सिर से पैरों की ओर होता है। यह सिद्धांत कहलाता है:',
    options: [
      ['Proximodistal principle', 'निकट-दूर का सिद्धांत'],
      ['Cephalocaudal principle', 'मस्तकाधोमुखी सिद्धांत'],
      ['Principle of continuity', 'निरंतरता का सिद्धांत'],
      ['Principle of individual differences', 'वैयक्तिक भिन्नता का सिद्धांत'],
    ],
    correctIndex: 1,
    expEn:
      'Cephalocaudal ("head to tail") development explains why an infant gains head control before sitting and sits before walking. The proximodistal principle is the complementary one: development moves from the centre of the body outwards to the limbs.',
    expHi:
      'मस्तकाधोमुखी ("सिर से पूँछ की ओर") विकास बताता है कि शिशु बैठने से पहले सिर पर नियंत्रण तथा चलने से पहले बैठना क्यों सीखता है। निकट-दूर सिद्धांत इसका पूरक है: विकास शरीर के केंद्र से बाहर की ओर अंगों तक बढ़ता है।',
    difficulty: 'easy',
    avgTime: 28,
    accuracy: 0.81,
  },
  {
    id: 'q-cdp-004',
    subjectId: 'cdp',
    topicId: 'cdp-rte',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The Right to Education Act, 2009 provides free and compulsory education to children of which age group?',
    hi: 'शिक्षा का अधिकार अधिनियम, 2009 किस आयु वर्ग के बालकों को निःशुल्क एवं अनिवार्य शिक्षा प्रदान करता है?',
    options: [
      ['3 to 12 years', '3 से 12 वर्ष'],
      ['6 to 14 years', '6 से 14 वर्ष'],
      ['6 to 18 years', '6 से 18 वर्ष'],
      ['5 to 15 years', '5 से 15 वर्ष'],
    ],
    correctIndex: 1,
    expEn:
      'Article 21-A and the RTE Act, 2009 guarantee free and compulsory education from 6 to 14 years — that is, elementary education, Classes 1 to 8. The Act came into force on 1 April 2010.',
    expHi:
      'अनुच्छेद 21-क तथा RTE अधिनियम, 2009 के अंतर्गत 6 से 14 वर्ष तक निःशुल्क एवं अनिवार्य शिक्षा की गारंटी है — अर्थात् प्रारंभिक शिक्षा, कक्षा 1 से 8 तक। यह अधिनियम 1 अप्रैल 2010 से लागू हुआ।',
    difficulty: 'easy',
    pyq: 'UPTET 2021 Paper 1',
    avgTime: 22,
    accuracy: 0.89,
  },
  {
    id: 'q-cdp-005',
    subjectId: 'cdp',
    topicId: 'cdp-assessment',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Assessment which is carried out during the teaching-learning process to improve learning is called:',
    hi: 'अधिगम को बेहतर बनाने हेतु शिक्षण-अधिगम प्रक्रिया के दौरान किया जाने वाला आकलन कहलाता है:',
    options: [
      ['Summative assessment', 'योगात्मक आकलन'],
      ['Formative assessment', 'रचनात्मक आकलन'],
      ['Diagnostic assessment', 'निदानात्मक आकलन'],
      ['Norm-referenced assessment', 'मानक-संदर्भित आकलन'],
    ],
    correctIndex: 1,
    expEn:
      'Formative assessment — assessment FOR learning — runs alongside teaching and feeds back into it. Summative assessment (assessment OF learning) happens at the end of a unit or term and mainly certifies achievement.',
    expHi:
      'रचनात्मक आकलन — अधिगम के लिए आकलन — शिक्षण के साथ-साथ चलता है और उसी में फीडबैक देता है। योगात्मक आकलन (अधिगम का आकलन) इकाई या सत्र के अंत में होता है और मुख्यतः उपलब्धि प्रमाणित करता है।',
    difficulty: 'medium',
    pyq: 'CTET Jul 2023 Paper 1',
    avgTime: 35,
    accuracy: 0.71,
  },
  {
    id: 'q-cdp-006',
    subjectId: 'cdp',
    topicId: 'cdp-intelligence',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The theory of Multiple Intelligences was propounded by:',
    hi: 'बहु-बुद्धि सिद्धांत का प्रतिपादन किसने किया?',
    options: [
      ['Charles Spearman', 'चार्ल्स स्पीयरमैन'],
      ['Howard Gardner', 'हावर्ड गार्डनर'],
      ['Robert Sternberg', 'रॉबर्ट स्टर्नबर्ग'],
      ['L. L. Thurstone', 'एल. एल. थर्स्टन'],
    ],
    correctIndex: 1,
    expEn:
      'Howard Gardner (1983) argued intelligence is not one general factor but several relatively independent intelligences — linguistic, logical-mathematical, spatial, musical, bodily-kinaesthetic, interpersonal, intrapersonal and naturalistic. Sternberg gave the Triarchic theory; Spearman gave the two-factor (g and s) theory.',
    expHi:
      'हावर्ड गार्डनर (1983) ने तर्क दिया कि बुद्धि एक सामान्य कारक नहीं बल्कि कई अपेक्षाकृत स्वतंत्र बुद्धियाँ हैं — भाषिक, तार्किक-गणितीय, स्थानिक, संगीतात्मक, शारीरिक-गतिक, अंतर्वैयक्तिक, अंतःवैयक्तिक तथा प्रकृतिवादी। स्टर्नबर्ग ने त्रितंत्र सिद्धांत तथा स्पीयरमैन ने द्विकारक (g एवं s) सिद्धांत दिया।',
    difficulty: 'easy',
    pyq: 'REET 2022 Level 2',
    avgTime: 26,
    accuracy: 0.83,
  },
  {
    id: 'q-cdp-007',
    subjectId: 'cdp',
    topicId: 'cdp-inclusive',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'A child in your class consistently reverses letters like b/d and reads very slowly despite normal intelligence. This is most likely:',
    hi: 'आपकी कक्षा का एक बालक सामान्य बुद्धि होने के बावजूद b/d जैसे अक्षरों को उलट देता है तथा बहुत धीमा पढ़ता है। यह सर्वाधिक संभावित रूप से है:',
    options: [
      ['Dyscalculia', 'डिस्कैल्कुलिया'],
      ['Dysgraphia', 'डिस्ग्राफिया'],
      ['Dyslexia', 'डिस्लेक्सिया'],
      ['Dyspraxia', 'डिस्प्रैक्सिया'],
    ],
    correctIndex: 2,
    expEn:
      'Dyslexia is a specific learning disability in reading — letter reversal, slow decoding and poor spelling with intelligence intact. Dyscalculia affects number work, dysgraphia affects writing, and dyspraxia affects motor coordination. The teacher\'s response should be remediation and accommodation, never labelling the child as lazy.',
    expHi:
      'डिस्लेक्सिया पठन से संबंधित विशिष्ट अधिगम अक्षमता है — अक्षरों का उलटाव, धीमा डिकोडिंग तथा कमजोर वर्तनी, जबकि बुद्धि सामान्य रहती है। डिस्कैल्कुलिया गणित को, डिस्ग्राफिया लेखन को तथा डिस्प्रैक्सिया गत्यात्मक समन्वय को प्रभावित करता है। शिक्षक की प्रतिक्रिया उपचारात्मक शिक्षण एवं सुविधा होनी चाहिए, बालक को आलसी कहना नहीं।',
    difficulty: 'medium',
    pyq: 'CTET Dec 2021 Paper 2',
    avgTime: 38,
    accuracy: 0.74,
  },
  {
    id: 'q-cdp-008',
    subjectId: 'cdp',
    topicId: 'cdp-learning',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Operant conditioning, based on reinforcement of voluntary behaviour, was given by:',
    hi: 'ऐच्छिक व्यवहार के पुनर्बलन पर आधारित क्रिया-प्रसूत अनुबंधन किसने दिया?',
    options: [
      ['Ivan Pavlov', 'इवान पावलव'],
      ['B. F. Skinner', 'बी. एफ. स्किनर'],
      ['E. L. Thorndike', 'ई. एल. थार्नडाइक'],
      ['Wolfgang Kohler', 'वोल्फगैंग कोहलर'],
    ],
    correctIndex: 1,
    expEn:
      'Skinner\'s operant conditioning works on consequences: behaviour followed by reinforcement is repeated. Pavlov gave classical conditioning (involuntary responses), Thorndike gave trial-and-error learning, and Kohler gave learning by insight.',
    expHi:
      'स्किनर का क्रिया-प्रसूत अनुबंधन परिणामों पर आधारित है: जिस व्यवहार के बाद पुनर्बलन मिलता है, वह दोहराया जाता है। पावलव ने शास्त्रीय अनुबंधन (अनैच्छिक अनुक्रियाएँ), थार्नडाइक ने प्रयास एवं त्रुटि अधिगम तथा कोहलर ने अंतर्दृष्टि द्वारा अधिगम दिया।',
    difficulty: 'easy',
    avgTime: 24,
    accuracy: 0.86,
  },
  {
    id: 'q-cdp-009',
    subjectId: 'cdp',
    topicId: 'cdp-learning',
    examIds: ALL_TET,
    en: 'Learning by insight was demonstrated through experiments on chimpanzees by:',
    hi: 'चिंपैंजी पर किए गए प्रयोगों द्वारा अंतर्दृष्टि द्वारा अधिगम को किसने प्रदर्शित किया?',
    options: [
      ['Wolfgang Kohler', 'वोल्फगैंग कोहलर'],
      ['Kurt Lewin', 'कर्ट लेविन'],
      ['Albert Bandura', 'अल्बर्ट बंडूरा'],
      ['Jerome Bruner', 'जेरोम ब्रूनर'],
    ],
    correctIndex: 0,
    expEn:
      'Kohler\'s Gestalt experiments with the chimpanzee Sultan showed sudden restructuring of the problem field — the "aha" moment — rather than gradual trial and error. Bandura is associated with social/observational learning.',
    expHi:
      'कोहलर के गेस्टाल्ट प्रयोगों में चिंपैंजी सुल्तान ने समस्या-क्षेत्र का अचानक पुनर्गठन दिखाया — "अहा" क्षण — न कि क्रमिक प्रयास एवं त्रुटि। बंडूरा सामाजिक/प्रेक्षणात्मक अधिगम से संबंधित हैं।',
    difficulty: 'medium',
    avgTime: 30,
    accuracy: 0.72,
  },
  {
    id: 'q-cdp-010',
    subjectId: 'cdp',
    topicId: 'cdp-rte',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'NCF 2005 is primarily built on which view of learning?',
    hi: 'NCF 2005 मुख्यतः अधिगम की किस दृष्टि पर आधारित है?',
    options: [
      ['Behaviourist — learning as habit formation', 'व्यवहारवादी — अधिगम आदत निर्माण के रूप में'],
      ['Constructivist — learners construct knowledge', 'रचनावादी — शिक्षार्थी ज्ञान का निर्माण करते हैं'],
      ['Transmission — teacher transfers knowledge', 'संचरणवादी — शिक्षक ज्ञान हस्तांतरित करता है'],
      ['Maturationist — wait for readiness', 'परिपक्वतावादी — तत्परता की प्रतीक्षा'],
    ],
    correctIndex: 1,
    expEn:
      'NCF 2005 rests on constructivism: knowledge is constructed by the learner from experience, so the classroom must connect learning to life outside school, move away from rote methods and treat the textbook as one resource among many.',
    expHi:
      'NCF 2005 रचनावाद पर आधारित है: ज्ञान का निर्माण शिक्षार्थी अपने अनुभव से करता है, अतः कक्षा को विद्यालय के बाहर के जीवन से जोड़ना चाहिए, रटंत विधियों से दूर जाना चाहिए तथा पाठ्यपुस्तक को अनेक संसाधनों में से एक मानना चाहिए।',
    difficulty: 'medium',
    pyq: 'CTET Jan 2024 Paper 1',
    avgTime: 40,
    accuracy: 0.68,
  },
  {
    id: 'q-cdp-011',
    subjectId: 'cdp',
    topicId: 'cdp-motivation',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'A student studies because she genuinely enjoys understanding the subject. This is an example of:',
    hi: 'एक छात्रा इसलिए पढ़ती है क्योंकि उसे विषय समझने में वास्तविक आनंद आता है। यह उदाहरण है:',
    options: [
      ['Extrinsic motivation', 'बाह्य अभिप्रेरणा'],
      ['Intrinsic motivation', 'आंतरिक अभिप्रेरणा'],
      ['Negative reinforcement', 'नकारात्मक पुनर्बलन'],
      ['Achievement anxiety', 'उपलब्धि चिंता'],
    ],
    correctIndex: 1,
    expEn:
      'Intrinsic motivation comes from within — curiosity, interest, the satisfaction of mastery. Extrinsic motivation depends on external rewards such as marks, prizes or praise, and research shows over-reliance on it can weaken intrinsic interest.',
    expHi:
      'आंतरिक अभिप्रेरणा भीतर से आती है — जिज्ञासा, रुचि, निपुणता का संतोष। बाह्य अभिप्रेरणा अंक, पुरस्कार या प्रशंसा जैसे बाहरी प्रोत्साहनों पर निर्भर है, तथा शोध बताते हैं कि इस पर अत्यधिक निर्भरता आंतरिक रुचि को कमजोर कर सकती है।',
    difficulty: 'easy',
    avgTime: 23,
    accuracy: 0.88,
  },
  {
    id: 'q-cdp-012',
    subjectId: 'cdp',
    topicId: 'cdp-gender',
    examIds: ALL_TET,
    en: 'Which of the following is the primary agency of socialisation for a young child?',
    hi: 'निम्नलिखित में से कौन छोटे बालक के समाजीकरण की प्राथमिक अभिकरण है?',
    options: [
      ['School', 'विद्यालय'],
      ['Peer group', 'सहपाठी समूह'],
      ['Family', 'परिवार'],
      ['Mass media', 'जनसंचार माध्यम'],
    ],
    correctIndex: 2,
    expEn:
      'The family is the primary agency — first, most intimate and most sustained. School, peer group and media are secondary agencies whose influence grows as the child moves outward from home.',
    expHi:
      'परिवार प्राथमिक अभिकरण है — सर्वप्रथम, सर्वाधिक निकट एवं सर्वाधिक निरंतर। विद्यालय, सहपाठी समूह एवं मीडिया द्वितीयक अभिकरण हैं जिनका प्रभाव बालक के घर से बाहर बढ़ने के साथ बढ़ता है।',
    difficulty: 'easy',
    avgTime: 20,
    accuracy: 0.9,
  },
  {
    id: 'q-cdp-013',
    subjectId: 'cdp',
    topicId: 'cdp-intelligence',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'If a child\'s mental age is 12 years and chronological age is 10 years, the IQ is:',
    hi: 'यदि किसी बालक की मानसिक आयु 12 वर्ष तथा वास्तविक आयु 10 वर्ष है, तो बुद्धि लब्धि (IQ) होगी:',
    options: [
      ['83', '83'],
      ['100', '100'],
      ['120', '120'],
      ['144', '144'],
    ],
    correctIndex: 2,
    expEn: 'IQ = (Mental Age ÷ Chronological Age) × 100 = (12 ÷ 10) × 100 = 120. The formula is Stern\'s ratio IQ, popularised by Terman in the Stanford-Binet scale.',
    expHi:
      'IQ = (मानसिक आयु ÷ वास्तविक आयु) × 100 = (12 ÷ 10) × 100 = 120। यह सूत्र स्टर्न का अनुपात IQ है, जिसे टर्मन ने स्टैनफोर्ड-बिने मापनी में प्रचलित किया।',
    difficulty: 'easy',
    pyq: 'HTET 2021 Level 1',
    avgTime: 33,
    accuracy: 0.8,
  },
  {
    id: 'q-cdp-014',
    subjectId: 'cdp',
    topicId: 'cdp-learning',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'A teacher gives a challenging project and steps back, offering help only when the group gets stuck. This teaching strategy is best described as:',
    hi: 'एक शिक्षक चुनौतीपूर्ण परियोजना देकर पीछे हट जाता है तथा समूह के अटकने पर ही सहायता देता है। यह शिक्षण रणनीति सर्वोत्तम रूप से कहलाती है:',
    options: [
      ['Rote drilling', 'रटंत अभ्यास'],
      ['Scaffolding', 'स्कैफोल्डिंग (पाड़ लगाना)'],
      ['Lecturing', 'व्याख्यान विधि'],
      ['Streaming by ability', 'योग्यता के आधार पर वर्गीकरण'],
    ],
    correctIndex: 1,
    expEn:
      'Scaffolding is temporary, responsive support inside the Zone of Proximal Development, withdrawn as competence grows. It is exactly what this teacher is doing — the support is contingent on need, not given upfront.',
    expHi:
      'स्कैफोल्डिंग निकटस्थ विकास क्षेत्र में दिया गया अस्थायी एवं आवश्यकतानुसार सहारा है, जो योग्यता बढ़ने पर हटा लिया जाता है। यह शिक्षक ठीक यही कर रहा है — सहायता आवश्यकता पर आधारित है, पहले से दी गई नहीं।',
    difficulty: 'medium',
    avgTime: 42,
    accuracy: 0.7,
  },
  {
    id: 'q-cdp-015',
    subjectId: 'cdp',
    topicId: 'cdp-assessment',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Errors made by children in the classroom should be viewed by a teacher as:',
    hi: 'कक्षा में बालकों द्वारा की गई त्रुटियों को शिक्षक द्वारा किस रूप में देखा जाना चाहिए?',
    options: [
      ['Proof of carelessness to be punished', 'लापरवाही का प्रमाण जिसे दंडित किया जाए'],
      ['A window into the child\'s thinking', 'बालक की सोच में झाँकने की खिड़की'],
      ['A reason to lower expectations', 'अपेक्षाएँ घटाने का कारण'],
      ['Something to be ignored entirely', 'पूर्णतः अनदेखा करने योग्य बात'],
    ],
    correctIndex: 1,
    expEn:
      'Constructivist pedagogy treats errors as data. An error reveals the rule the child is actually using, which is what the teacher must address. This idea underlies error analysis in maths and language pedagogy questions alike.',
    expHi:
      'रचनावादी शिक्षाशास्त्र त्रुटियों को आँकड़ा मानता है। त्रुटि उस नियम को उजागर करती है जिसे बालक वास्तव में प्रयोग कर रहा है, और शिक्षक को उसी पर कार्य करना है। यही विचार गणित तथा भाषा शिक्षाशास्त्र दोनों के त्रुटि विश्लेषण का आधार है।',
    difficulty: 'easy',
    pyq: 'CTET Jul 2023 Paper 2',
    avgTime: 30,
    accuracy: 0.85,
  },

  /* ---------------------------------------------------------------- MATH */
  {
    id: 'q-math-001',
    subjectId: 'math',
    topicId: 'math-number',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'What is the smallest prime number?',
    hi: 'सबसे छोटी अभाज्य संख्या कौन-सी है?',
    options: [
      ['0', '0'],
      ['1', '1'],
      ['2', '2'],
      ['3', '3'],
    ],
    correctIndex: 2,
    expEn:
      '2 is the smallest prime and the only even prime. 1 is not prime because a prime must have exactly two distinct factors — 1 has only one.',
    expHi:
      '2 सबसे छोटी अभाज्य संख्या तथा एकमात्र सम अभाज्य संख्या है। 1 अभाज्य नहीं है क्योंकि अभाज्य संख्या के ठीक दो भिन्न गुणनखंड होने चाहिए — 1 का केवल एक है।',
    difficulty: 'easy',
    avgTime: 15,
    accuracy: 0.92,
  },
  {
    id: 'q-math-002',
    subjectId: 'math',
    topicId: 'math-number',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The LCM of 12, 15 and 20 is:',
    hi: '12, 15 तथा 20 का लघुत्तम समापवर्त्य (LCM) है:',
    options: [
      ['30', '30'],
      ['60', '60'],
      ['120', '120'],
      ['180', '180'],
    ],
    correctIndex: 1,
    expEn:
      '12 = 2²×3, 15 = 3×5, 20 = 2²×5. Take the highest power of each prime: 2²×3×5 = 60. Check: 60 is divisible by 12, 15 and 20.',
    expHi:
      '12 = 2²×3, 15 = 3×5, 20 = 2²×5। प्रत्येक अभाज्य की उच्चतम घात लें: 2²×3×5 = 60। जाँच: 60, 12, 15 तथा 20 तीनों से विभाज्य है।',
    difficulty: 'easy',
    pyq: 'CTET Dec 2022 Paper 1',
    avgTime: 45,
    accuracy: 0.79,
  },
  {
    id: 'q-math-003',
    subjectId: 'math',
    topicId: 'math-number',
    examIds: ALL_TET,
    en: 'The value of 3/4 + 5/6 is:',
    hi: '3/4 + 5/6 का मान है:',
    options: [
      ['8/10', '8/10'],
      ['19/12', '19/12'],
      ['15/24', '15/24'],
      ['4/5', '4/5'],
    ],
    correctIndex: 1,
    expEn: 'LCM of 4 and 6 is 12. So 3/4 = 9/12 and 5/6 = 10/12. Adding: 9/12 + 10/12 = 19/12 (or 1 7/12).',
    expHi: '4 तथा 6 का LCM 12 है। अतः 3/4 = 9/12 तथा 5/6 = 10/12। जोड़ने पर: 9/12 + 10/12 = 19/12 (अथवा 1 7/12)।',
    difficulty: 'easy',
    avgTime: 50,
    accuracy: 0.76,
  },
  {
    id: 'q-math-004',
    subjectId: 'math',
    topicId: 'math-mensuration',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The area of a rectangle is 96 sq cm and its length is 12 cm. Its perimeter is:',
    hi: 'एक आयत का क्षेत्रफल 96 वर्ग सेमी तथा लंबाई 12 सेमी है। इसका परिमाप है:',
    options: [
      ['40 cm', '40 सेमी'],
      ['44 cm', '44 सेमी'],
      ['48 cm', '48 सेमी'],
      ['56 cm', '56 सेमी'],
    ],
    correctIndex: 0,
    expEn: 'Breadth = Area ÷ Length = 96 ÷ 12 = 8 cm. Perimeter = 2(l + b) = 2(12 + 8) = 2 × 20 = 40 cm.',
    expHi: 'चौड़ाई = क्षेत्रफल ÷ लंबाई = 96 ÷ 12 = 8 सेमी। परिमाप = 2(ल + चौ) = 2(12 + 8) = 2 × 20 = 40 सेमी।',
    difficulty: 'medium',
    pyq: 'REET 2022 Level 1',
    avgTime: 55,
    accuracy: 0.73,
  },
  {
    id: 'q-math-005',
    subjectId: 'math',
    topicId: 'math-arith',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'A shopkeeper buys an item for ₹800 and sells it for ₹920. His profit percentage is:',
    hi: 'एक दुकानदार ₹800 में वस्तु खरीदकर ₹920 में बेचता है। उसका लाभ प्रतिशत है:',
    options: [
      ['12%', '12%'],
      ['15%', '15%'],
      ['18%', '18%'],
      ['20%', '20%'],
    ],
    correctIndex: 1,
    expEn: 'Profit = 920 − 800 = ₹120. Profit % = (Profit ÷ Cost Price) × 100 = (120 ÷ 800) × 100 = 15%.',
    expHi: 'लाभ = 920 − 800 = ₹120। लाभ % = (लाभ ÷ क्रय मूल्य) × 100 = (120 ÷ 800) × 100 = 15%।',
    difficulty: 'easy',
    avgTime: 48,
    accuracy: 0.81,
  },
  {
    id: 'q-math-006',
    subjectId: 'math',
    topicId: 'math-number',
    examIds: ALL_TET,
    en: 'In the number 5,74,832, the place value of 4 is:',
    hi: 'संख्या 5,74,832 में 4 का स्थानीय मान है:',
    options: [
      ['4', '4'],
      ['400', '400'],
      ['4,000', '4,000'],
      ['40,000', '40,000'],
    ],
    correctIndex: 2,
    expEn:
      'Reading 5,74,832 from the right: 2 (ones), 3 (tens), 8 (hundreds), 4 (thousands), 7 (ten thousands), 5 (lakhs). So 4 sits in the thousands place — place value 4,000. Its face value remains 4.',
    expHi:
      '5,74,832 को दाएँ से पढ़ें: 2 (इकाई), 3 (दहाई), 8 (सैकड़ा), 4 (हजार), 7 (दस हजार), 5 (लाख)। अतः 4 हजार के स्थान पर है — स्थानीय मान 4,000। इसका अंकित मान 4 ही रहेगा।',
    difficulty: 'easy',
    avgTime: 38,
    accuracy: 0.84,
  },
  {
    id: 'q-math-007',
    subjectId: 'math',
    topicId: 'math-pedagogy',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'According to the Van Hiele model, the first level of learning geometry is:',
    hi: 'वान हील मॉडल के अनुसार ज्यामिति अधिगम का प्रथम स्तर है:',
    options: [
      ['Visualisation', 'दृश्यीकरण'],
      ['Analysis', 'विश्लेषण'],
      ['Informal deduction', 'अनौपचारिक निगमन'],
      ['Formal deduction', 'औपचारिक निगमन'],
    ],
    correctIndex: 0,
    expEn:
      'Van Hiele levels run: visualisation (recognising shapes by appearance) → analysis (noticing properties) → informal deduction (relating properties) → formal deduction (proof) → rigour. A primary child works mostly at level 0-1, which is why geometry must start with handling and seeing shapes, not definitions.',
    expHi:
      'वान हील स्तर हैं: दृश्यीकरण (आकृति को देखकर पहचानना) → विश्लेषण (गुणों को पहचानना) → अनौपचारिक निगमन (गुणों को जोड़ना) → औपचारिक निगमन (उपपत्ति) → कठोरता। प्राथमिक स्तर का बालक प्रायः स्तर 0-1 पर होता है, इसीलिए ज्यामिति परिभाषाओं से नहीं, आकृतियों को देखने-छूने से आरंभ होनी चाहिए।',
    difficulty: 'hard',
    pyq: 'CTET Jan 2024 Paper 1',
    avgTime: 55,
    accuracy: 0.52,
  },
  {
    id: 'q-math-008',
    subjectId: 'math',
    topicId: 'math-pedagogy',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'A child writes 25 + 17 = 312 by adding digits column-wise without carrying. The teacher should:',
    hi: 'एक बालक हासिल लिए बिना स्तंभवार अंक जोड़कर 25 + 17 = 312 लिखता है। शिक्षक को चाहिए:',
    options: [
      ['Mark it wrong and move on', 'गलत अंकित कर आगे बढ़ जाना'],
      ['Make the child rewrite the sum ten times', 'बालक से यह जोड़ दस बार लिखवाना'],
      ['Use bundles of ten sticks to rebuild the idea of carrying', 'हासिल की अवधारणा को दस-दस की गड्डियों से पुनः बनाना'],
      ['Tell the child maths is not their strength', 'बालक से कहना कि गणित उसका विषय नहीं है'],
    ],
    correctIndex: 2,
    expEn:
      'The error is conceptual, not careless — the child has not internalised place value and regrouping. Concrete material (bundles of ten, base-ten blocks) rebuilds the idea. Repetition without understanding, or discouragement, addresses neither the cause nor the child.',
    expHi:
      'त्रुटि वैचारिक है, लापरवाही नहीं — बालक ने स्थानीय मान एवं पुनर्समूहन को आत्मसात नहीं किया। मूर्त सामग्री (दस-दस की गड्डियाँ, बेस-टेन ब्लॉक) अवधारणा को पुनः बनाती है। बिना समझ की पुनरावृत्ति अथवा हतोत्साहन न कारण का समाधान करते हैं न बालक का।',
    difficulty: 'medium',
    avgTime: 45,
    accuracy: 0.87,
  },
  {
    id: 'q-math-009',
    subjectId: 'math',
    topicId: 'math-geometry',
    examIds: ALL_TET,
    en: 'How many lines of symmetry does an equilateral triangle have?',
    hi: 'एक समबाहु त्रिभुज में सममित रेखाओं की संख्या कितनी होती है?',
    options: [
      ['1', '1'],
      ['2', '2'],
      ['3', '3'],
      ['Infinite', 'अनंत'],
    ],
    correctIndex: 2,
    expEn:
      'An equilateral triangle has 3 lines of symmetry — one from each vertex to the midpoint of the opposite side. A square has 4, a circle has infinitely many, and a scalene triangle has none.',
    expHi:
      'समबाहु त्रिभुज में 3 सममित रेखाएँ होती हैं — प्रत्येक शीर्ष से सम्मुख भुजा के मध्य बिंदु तक एक। वर्ग में 4, वृत्त में अनंत तथा विषमबाहु त्रिभुज में एक भी नहीं होती।',
    difficulty: 'easy',
    avgTime: 30,
    accuracy: 0.82,
  },
  {
    id: 'q-math-010',
    subjectId: 'math',
    topicId: 'math-arith',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'If 5 pens cost ₹75, how much will 13 pens cost?',
    hi: 'यदि 5 पेन का मूल्य ₹75 है, तो 13 पेन का मूल्य कितना होगा?',
    options: [
      ['₹165', '₹165'],
      ['₹185', '₹185'],
      ['₹195', '₹195'],
      ['₹205', '₹205'],
    ],
    correctIndex: 2,
    expEn: 'Unit price = 75 ÷ 5 = ₹15 per pen. For 13 pens: 15 × 13 = ₹195. This is the unitary method, a Class 5-6 staple.',
    expHi: 'एक पेन का मूल्य = 75 ÷ 5 = ₹15। 13 पेन हेतु: 15 × 13 = ₹195। यह ऐकिक नियम है, जो कक्षा 5-6 का मूल विषय है।',
    difficulty: 'easy',
    avgTime: 35,
    accuracy: 0.88,
  },

  /* ----------------------------------------------------------------- EVS */
  {
    id: 'q-evs-001',
    subjectId: 'evs',
    topicId: 'evs-food',
    examIds: ALL_TET,
    en: 'Which of the following is the richest natural source of Vitamin C?',
    hi: 'निम्नलिखित में से कौन विटामिन C का सर्वाधिक समृद्ध प्राकृतिक स्रोत है?',
    options: [
      ['Milk', 'दूध'],
      ['Amla (Indian gooseberry)', 'आँवला'],
      ['Rice', 'चावल'],
      ['Groundnut', 'मूँगफली'],
    ],
    correctIndex: 1,
    expEn:
      'Amla has among the highest Vitamin C content of any common Indian food. Deficiency of Vitamin C causes scurvy — bleeding gums and slow wound healing.',
    expHi:
      'आँवले में किसी भी सामान्य भारतीय खाद्य पदार्थ की तुलना में सर्वाधिक विटामिन C होता है। विटामिन C की कमी से स्कर्वी होता है — मसूड़ों से रक्तस्राव तथा घाव का धीरे भरना।',
    difficulty: 'easy',
    avgTime: 20,
    accuracy: 0.9,
  },
  {
    id: 'q-evs-002',
    subjectId: 'evs',
    topicId: 'evs-pedagogy',
    examIds: ALL_TET,
    en: 'The primary aim of teaching EVS at the primary stage is to:',
    hi: 'प्राथमिक स्तर पर EVS शिक्षण का मुख्य उद्देश्य है:',
    options: [
      ['Prepare children for Class 6 Science', 'बालकों को कक्षा 6 विज्ञान हेतु तैयार करना'],
      ['Help children explore and connect with their immediate environment', 'बालकों को अपने निकट पर्यावरण से जोड़ना एवं उसकी खोज कराना'],
      ['Complete the textbook within the session', 'सत्र में पाठ्यपुस्तक पूरी करना'],
      ['Teach scientific terminology early', 'वैज्ञानिक शब्दावली शीघ्र सिखाना'],
    ],
    correctIndex: 1,
    expEn:
      'EVS at the primary stage is an integrated subject built around the child\'s own surroundings — family, food, water, shelter, travel. Exploration, observation and questioning matter more than terminology, which comes later.',
    expHi:
      'प्राथमिक स्तर पर EVS एक एकीकृत विषय है जो बालक के अपने परिवेश — परिवार, भोजन, पानी, आवास, यात्रा — के इर्द-गिर्द बनता है। खोज, प्रेक्षण एवं प्रश्न पूछना शब्दावली से अधिक महत्वपूर्ण हैं, जो बाद में आती है।',
    difficulty: 'medium',
    pyq: 'CTET Dec 2022 Paper 1',
    avgTime: 40,
    accuracy: 0.79,
  },
  {
    id: 'q-evs-003',
    subjectId: 'evs',
    topicId: 'evs-water',
    examIds: ALL_TET,
    en: 'Stepwells locally called "baoli" or "bawadi" are traditional water structures mainly found in:',
    hi: 'स्थानीय रूप से "बावली" अथवा "बावड़ी" कहलाने वाली सीढ़ीदार जल संरचनाएँ मुख्यतः कहाँ मिलती हैं?',
    options: [
      ['Kerala and Tamil Nadu', 'केरल तथा तमिलनाडु'],
      ['Rajasthan and Gujarat', 'राजस्थान तथा गुजरात'],
      ['Assam and Meghalaya', 'असम तथा मेघालय'],
      ['Punjab and Himachal', 'पंजाब तथा हिमाचल'],
    ],
    correctIndex: 1,
    expEn:
      'Baolis are a water-harvesting response to arid climates and are concentrated in Rajasthan and Gujarat — Rani ki Vav in Patan and Chand Baori in Abhaneri being the best known. The CTET EVS syllabus covers them under the "Water" theme.',
    expHi:
      'बावड़ियाँ शुष्क जलवायु में जल संचयन की प्रतिक्रिया हैं तथा राजस्थान एवं गुजरात में केंद्रित हैं — पाटन की रानी की वाव तथा आभानेरी की चाँद बावड़ी सर्वाधिक प्रसिद्ध हैं। CTET EVS पाठ्यक्रम में ये "पानी" विषय के अंतर्गत आती हैं।',
    difficulty: 'medium',
    pyq: 'CTET Jul 2023 Paper 1',
    avgTime: 35,
    accuracy: 0.66,
  },
  {
    id: 'q-evs-004',
    subjectId: 'evs',
    topicId: 'evs-travel',
    examIds: ALL_TET,
    en: 'The famous "toy train" that is a UNESCO World Heritage Site runs in:',
    hi: 'यूनेस्को विश्व धरोहर स्थल घोषित प्रसिद्ध "टॉय ट्रेन" कहाँ चलती है?',
    options: [
      ['Shimla and Darjeeling', 'शिमला तथा दार्जिलिंग'],
      ['Ooty and Munnar', 'ऊटी तथा मुन्नार'],
      ['Nainital and Mussoorie', 'नैनीताल तथा मसूरी'],
      ['Gangtok and Shillong', 'गंगटोक तथा शिलांग'],
    ],
    correctIndex: 0,
    expEn:
      'The Mountain Railways of India — the Darjeeling Himalayan Railway, the Kalka-Shimla Railway and the Nilgiri Mountain Railway — are UNESCO World Heritage Sites. Darjeeling and Shimla are the pair named in NCERT EVS.',
    expHi:
      'भारत की पर्वतीय रेलवे — दार्जिलिंग हिमालयन रेलवे, कालका-शिमला रेलवे तथा नीलगिरि माउंटेन रेलवे — यूनेस्को विश्व धरोहर स्थल हैं। NCERT EVS में दार्जिलिंग तथा शिमला का उल्लेख है।',
    difficulty: 'easy',
    avgTime: 28,
    accuracy: 0.75,
  },
  {
    id: 'q-evs-005',
    subjectId: 'evs',
    topicId: 'evs-family',
    examIds: ALL_TET,
    en: 'In a family, your mother\'s brother\'s daughter is your:',
    hi: 'परिवार में आपकी माता के भाई की पुत्री आपकी क्या लगेगी?',
    options: [
      ['Sister', 'बहन'],
      ['Cousin', 'चचेरी/ममेरी बहन'],
      ['Aunt', 'मौसी'],
      ['Niece', 'भांजी'],
    ],
    correctIndex: 1,
    expEn:
      'Mother\'s brother is the maternal uncle (mama); his daughter is your cousin — in Hindi kinship, mameri behen. Relationship questions of this type appear in both EVS and reasoning sections.',
    expHi:
      'माता का भाई मामा होता है; उसकी पुत्री आपकी ममेरी बहन अर्थात् कज़िन हुई। इस प्रकार के संबंध-प्रश्न EVS तथा तर्कशक्ति दोनों खंडों में आते हैं।',
    difficulty: 'easy',
    avgTime: 25,
    accuracy: 0.83,
  },
  {
    id: 'q-evs-006',
    subjectId: 'evs',
    topicId: 'evs-food',
    examIds: ALL_TET,
    en: 'Which animal is known as the "ship of the desert"?',
    hi: 'किस पशु को "रेगिस्तान का जहाज" कहा जाता है?',
    options: [
      ['Horse', 'घोड़ा'],
      ['Camel', 'ऊँट'],
      ['Donkey', 'गधा'],
      ['Yak', 'याक'],
    ],
    correctIndex: 1,
    expEn:
      'The camel stores fat in its hump, tolerates large water loss and has broad padded feet for sand — adaptations that make it the desert\'s transport animal. The yak plays the same role in cold high altitudes.',
    expHi:
      'ऊँट अपने कूबड़ में वसा संचित करता है, अधिक जल हानि सह लेता है तथा उसके चौड़े गद्दीदार पैर रेत के लिए उपयुक्त होते हैं — यही अनुकूलन उसे मरुस्थल का वाहन बनाते हैं। ठंडे उच्च पर्वतीय क्षेत्रों में याक यही भूमिका निभाता है।',
    difficulty: 'easy',
    avgTime: 15,
    accuracy: 0.95,
  },
  {
    id: 'q-evs-007',
    subjectId: 'evs',
    topicId: 'evs-pedagogy',
    examIds: ALL_TET,
    en: 'The most appropriate way to assess EVS learning at the primary stage is:',
    hi: 'प्राथमिक स्तर पर EVS अधिगम के आकलन का सर्वाधिक उपयुक्त तरीका है:',
    options: [
      ['A written test of definitions', 'परिभाषाओं की लिखित परीक्षा'],
      ['Observation of children during activities, surveys and discussions', 'गतिविधियों, सर्वेक्षणों एवं चर्चाओं के दौरान बालकों का प्रेक्षण'],
      ['Ranking children by marks', 'अंकों के आधार पर बालकों की श्रेणी बनाना'],
      ['Counting how many chapters were finished', 'कितने अध्याय पूरे हुए, इसकी गणना'],
    ],
    correctIndex: 1,
    expEn:
      'EVS is assessed continuously and comprehensively through observation, projects, surveys, group work and portfolios. Written tests of definitions test recall, not the exploration and reasoning EVS is meant to develop.',
    expHi:
      'EVS का आकलन प्रेक्षण, परियोजना, सर्वेक्षण, समूह कार्य एवं पोर्टफोलियो द्वारा सतत एवं व्यापक रूप से होता है। परिभाषाओं की लिखित परीक्षा केवल स्मरण जाँचती है, वह खोज एवं तर्क नहीं जिसे EVS विकसित करना चाहता है।',
    difficulty: 'medium',
    avgTime: 38,
    accuracy: 0.82,
  },
  {
    id: 'q-evs-008',
    subjectId: 'evs',
    topicId: 'evs-shelter',
    examIds: ALL_TET,
    en: 'Houses on stilts are commonly built in regions that face:',
    hi: 'खंभों पर बने घर सामान्यतः किन क्षेत्रों में बनाए जाते हैं?',
    options: [
      ['Frequent flooding or heavy rainfall', 'बार-बार बाढ़ अथवा भारी वर्षा वाले'],
      ['Extreme cold', 'अत्यधिक ठंड वाले'],
      ['Desert heat', 'मरुस्थलीय गर्मी वाले'],
      ['Frequent earthquakes only', 'केवल भूकंप-प्रवण'],
    ],
    correctIndex: 0,
    expEn:
      'Stilt houses keep the living floor above flood water and damp ground, which is why they appear in Assam, coastal Kerala and the north-east. Shelter in EVS is always taught as a response to local climate and material.',
    expHi:
      'खंभों पर बने घर रहने की मंजिल को बाढ़ के पानी तथा नम भूमि से ऊपर रखते हैं, इसीलिए ये असम, तटीय केरल तथा पूर्वोत्तर में मिलते हैं। EVS में आवास सदैव स्थानीय जलवायु एवं सामग्री की प्रतिक्रिया के रूप में पढ़ाया जाता है।',
    difficulty: 'easy',
    avgTime: 30,
    accuracy: 0.86,
  },

  /* --------------------------------------------------------------- HINDI */
  {
    id: 'q-hin-001',
    subjectId: 'hindi',
    topicId: 'hindi-vyakaran',
    examIds: ALL_TET,
    en: 'Identify the correct sandhi-viched of "विद्यालय".',
    hi: '"विद्यालय" का सही संधि-विच्छेद पहचानिए।',
    options: [
      ['विद्या + लय', 'विद्या + लय'],
      ['विद्य + आलय', 'विद्य + आलय'],
      ['विद्या + आलय', 'विद्या + आलय'],
      ['विद् + यालय', 'विद् + यालय'],
    ],
    correctIndex: 2,
    expEn:
      'विद्या + आलय = विद्यालय. Two similar vowels (आ + आ) combine into a long आ — this is दीर्घ संधि, a sub-type of स्वर संधि.',
    expHi:
      'विद्या + आलय = विद्यालय। दो सजातीय स्वर (आ + आ) मिलकर दीर्घ आ बनाते हैं — यह दीर्घ संधि है, जो स्वर संधि का उपभेद है।',
    difficulty: 'easy',
    pyq: 'UPTET 2021 Paper 1',
    avgTime: 30,
    accuracy: 0.8,
  },
  {
    id: 'q-hin-002',
    subjectId: 'hindi',
    topicId: 'hindi-alankar',
    examIds: ALL_TET,
    en: 'In the line "चारु चंद्र की चंचल किरणें", which alankar is used?',
    hi: '"चारु चंद्र की चंचल किरणें" पंक्ति में कौन-सा अलंकार है?',
    options: [
      ['उपमा अलंकार', 'उपमा अलंकार'],
      ['अनुप्रास अलंकार', 'अनुप्रास अलंकार'],
      ['रूपक अलंकार', 'रूपक अलंकार'],
      ['यमक अलंकार', 'यमक अलंकार'],
    ],
    correctIndex: 1,
    expEn:
      'The repeated "च" sound at the start of चारु, चंद्र and चंचल is अनुप्रास (alliteration). उपमा compares two things with a connecting word, रूपक identifies them, and यमक repeats a word with different meanings.',
    expHi:
      'चारु, चंद्र तथा चंचल के आरंभ में "च" वर्ण की आवृत्ति अनुप्रास अलंकार है। उपमा में उपमेय-उपमान की तुलना वाचक शब्द से होती है, रूपक में अभेद आरोप होता है तथा यमक में एक शब्द भिन्न अर्थों में दोहराया जाता है।',
    difficulty: 'medium',
    avgTime: 35,
    accuracy: 0.71,
  },
  {
    id: 'q-hin-003',
    subjectId: 'hindi',
    topicId: 'hindi-shabd',
    examIds: ALL_TET,
    en: 'The tatsam form of the tadbhav word "आग" is:',
    hi: '"आग" (तद्भव) शब्द का तत्सम रूप है:',
    options: [
      ['अनल', 'अनल'],
      ['अग्नि', 'अग्नि'],
      ['ज्वाला', 'ज्वाला'],
      ['पावक', 'पावक'],
    ],
    correctIndex: 1,
    expEn:
      'आग derives directly from Sanskrit अग्नि, so अग्नि is its tatsam form. अनल and पावक are synonyms of fire, not the source word of आग.',
    expHi:
      'आग शब्द सीधे संस्कृत अग्नि से विकसित हुआ है, अतः अग्नि इसका तत्सम रूप है। अनल तथा पावक अग्नि के पर्यायवाची हैं, आग के मूल शब्द नहीं।',
    difficulty: 'easy',
    avgTime: 25,
    accuracy: 0.84,
  },
  {
    id: 'q-hin-004',
    subjectId: 'hindi',
    topicId: 'hindi-vyakaran',
    examIds: ALL_TET,
    en: 'The muhavara "नौ दो ग्यारह होना" means:',
    hi: 'मुहावरे "नौ दो ग्यारह होना" का अर्थ है:',
    options: [
      ['बहुत धन कमाना', 'बहुत धन कमाना'],
      ['भाग जाना', 'भाग जाना'],
      ['गिनती करना', 'गिनती करना'],
      ['झगड़ा करना', 'झगड़ा करना'],
    ],
    correctIndex: 1,
    expEn: '"नौ दो ग्यारह होना" means to run away or flee. Idioms carry figurative, not literal, meaning — a point often tested in pedagogy questions too.',
    expHi:
      '"नौ दो ग्यारह होना" का अर्थ है भाग जाना। मुहावरे लाक्षणिक अर्थ देते हैं, शाब्दिक नहीं — यही बात शिक्षाशास्त्र के प्रश्नों में भी पूछी जाती है।',
    difficulty: 'easy',
    avgTime: 20,
    accuracy: 0.89,
  },
  {
    id: 'q-hin-005',
    subjectId: 'hindi',
    topicId: 'hindi-pedagogy',
    examIds: ALL_TET,
    en: 'According to language pedagogy, the most effective way to develop a child\'s vocabulary is:',
    hi: 'भाषा शिक्षाशास्त्र के अनुसार बालक की शब्द-संपदा विकसित करने का सर्वाधिक प्रभावी तरीका है:',
    options: [
      ['शब्दार्थ रटवाना', 'शब्दार्थ रटवाना'],
      ['सार्थक संदर्भ में भाषा का प्रयोग कराना', 'सार्थक संदर्भ में भाषा का प्रयोग कराना'],
      ['प्रतिदिन श्रुतलेख कराना', 'प्रतिदिन श्रुतलेख कराना'],
      ['शब्दकोश याद कराना', 'शब्दकोश याद कराना'],
    ],
    correctIndex: 1,
    expEn:
      'Vocabulary grows through meaningful use — reading, listening, conversation and writing in real contexts. Isolated word lists produce recognition without usage, which is why NCF places language learning inside communication.',
    expHi:
      'शब्द-संपदा सार्थक प्रयोग से बढ़ती है — वास्तविक संदर्भों में पढ़ना, सुनना, बातचीत तथा लेखन। पृथक शब्द-सूचियाँ केवल पहचान देती हैं, प्रयोग नहीं, इसीलिए NCF भाषा अधिगम को संप्रेषण के भीतर रखता है।',
    difficulty: 'medium',
    pyq: 'CTET Dec 2022 Paper 1',
    avgTime: 40,
    accuracy: 0.83,
  },
  {
    id: 'q-hin-006',
    subjectId: 'hindi',
    topicId: 'hindi-vyakaran',
    examIds: ALL_TET,
    en: 'How many vowels (स्वर) are there in the Hindi Devanagari alphabet as conventionally taught?',
    hi: 'हिंदी देवनागरी वर्णमाला में परंपरागत रूप से कितने स्वर माने जाते हैं?',
    options: [
      ['10', '10'],
      ['11', '11'],
      ['13', '13'],
      ['16', '16'],
    ],
    correctIndex: 1,
    expEn:
      'Conventionally 11 vowels are counted: अ, आ, इ, ई, उ, ऊ, ऋ, ए, ऐ, ओ, औ. Adding अं and अः (which are अयोगवाह, not true vowels) gives the figure 13 that some books quote.',
    expHi:
      'परंपरागत रूप से 11 स्वर गिने जाते हैं: अ, आ, इ, ई, उ, ऊ, ऋ, ए, ऐ, ओ, औ। अं तथा अः (जो अयोगवाह हैं, वास्तविक स्वर नहीं) जोड़ने पर कुछ पुस्तकों में दी गई संख्या 13 बनती है।',
    difficulty: 'medium',
    avgTime: 28,
    accuracy: 0.64,
  },

  /* ------------------------------------------------------------- ENGLISH */
  {
    id: 'q-eng-001',
    subjectId: 'english',
    topicId: 'eng-grammar',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Choose the correct sentence:',
    hi: 'सही वाक्य चुनिए:',
    options: [
      ['She has been teaching since five years.', 'She has been teaching since five years.'],
      ['She has been teaching for five years.', 'She has been teaching for five years.'],
      ['She is teaching since five years.', 'She is teaching since five years.'],
      ['She teaches since five years.', 'She teaches since five years.'],
    ],
    correctIndex: 1,
    expEn:
      '"For" is used with a period of time (five years); "since" is used with a point in time (2019, Monday). The present perfect continuous — has been teaching — is required for an action starting in the past and still going on.',
    expHi:
      '"For" का प्रयोग समय-अवधि (five years) के साथ तथा "since" का प्रयोग समय-बिंदु (2019, Monday) के साथ होता है। भूतकाल में आरंभ होकर अब तक जारी क्रिया हेतु present perfect continuous — has been teaching — आवश्यक है।',
    difficulty: 'easy',
    avgTime: 30,
    accuracy: 0.79,
  },
  {
    id: 'q-eng-002',
    subjectId: 'english',
    topicId: 'eng-vocab',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Choose the word most nearly opposite in meaning to "ABUNDANT":',
    hi: '"ABUNDANT" के लगभग विपरीतार्थक शब्द का चयन कीजिए:',
    options: [
      ['Plentiful', 'Plentiful'],
      ['Scarce', 'Scarce'],
      ['Ample', 'Ample'],
      ['Copious', 'Copious'],
    ],
    correctIndex: 1,
    expEn:
      'Abundant means existing in large quantity. Scarce — insufficient, hard to find — is its antonym. Plentiful, ample and copious are all synonyms of abundant.',
    expHi:
      'Abundant का अर्थ है प्रचुर मात्रा में विद्यमान। Scarce — अपर्याप्त, दुर्लभ — इसका विलोम है। Plentiful, ample तथा copious तीनों abundant के पर्यायवाची हैं।',
    difficulty: 'easy',
    avgTime: 22,
    accuracy: 0.85,
  },
  {
    id: 'q-eng-003',
    subjectId: 'english',
    topicId: 'eng-grammar',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Identify the part of speech of the underlined word: "She sings *beautifully*."',
    hi: 'रेखांकित शब्द का पदभेद पहचानिए: "She sings *beautifully*."',
    options: [
      ['Adjective', 'विशेषण (Adjective)'],
      ['Adverb', 'क्रियाविशेषण (Adverb)'],
      ['Noun', 'संज्ञा (Noun)'],
      ['Preposition', 'संबंधसूचक (Preposition)'],
    ],
    correctIndex: 1,
    expEn:
      '"Beautifully" modifies the verb "sings" — telling us how she sings — so it is an adverb of manner. "Beautiful" would be the adjective form, modifying a noun.',
    expHi:
      '"Beautifully" क्रिया "sings" को संशोधित करता है — यह बताता है कि वह कैसे गाती है — अतः यह रीतिवाचक क्रियाविशेषण है। "Beautiful" विशेषण रूप होगा, जो संज्ञा को संशोधित करता है।',
    difficulty: 'easy',
    avgTime: 25,
    accuracy: 0.87,
  },
  {
    id: 'q-eng-004',
    subjectId: 'english',
    topicId: 'eng-pedagogy',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The best approach to teach grammar to young learners is:',
    hi: 'छोटे शिक्षार्थियों को व्याकरण पढ़ाने का सर्वोत्तम उपागम है:',
    options: [
      ['Deductive — state the rule, then drill it', 'निगमनात्मक — नियम बताकर अभ्यास कराना'],
      ['Inductive — let learners notice patterns in meaningful language', 'आगमनात्मक — शिक्षार्थियों को सार्थक भाषा में पैटर्न पहचानने देना'],
      ['Translation of every rule into the mother tongue', 'प्रत्येक नियम का मातृभाषा में अनुवाद'],
      ['Memorising grammar tables weekly', 'साप्ताहिक व्याकरण तालिकाएँ याद कराना'],
    ],
    correctIndex: 1,
    expEn:
      'Communicative language teaching favours the inductive route: learners meet language in use, notice the pattern, and the rule is formalised afterwards. Rules stated first and drilled out of context produce knowledge about the language rather than the ability to use it.',
    expHi:
      'संप्रेषणात्मक भाषा शिक्षण आगमनात्मक मार्ग को प्राथमिकता देता है: शिक्षार्थी भाषा को प्रयोग में देखते हैं, पैटर्न पहचानते हैं तथा नियम बाद में औपचारिक होता है। पहले नियम बताकर संदर्भहीन अभ्यास कराने से भाषा के "बारे में" ज्ञान बनता है, भाषा प्रयोग की क्षमता नहीं।',
    difficulty: 'medium',
    pyq: 'CTET Jan 2024 Paper 2',
    avgTime: 42,
    accuracy: 0.76,
  },
  {
    id: 'q-eng-005',
    subjectId: 'english',
    topicId: 'eng-grammar',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Fill in the blank: "If I ___ the answer, I would tell you."',
    hi: 'रिक्त स्थान भरिए: "If I ___ the answer, I would tell you."',
    options: [
      ['know', 'know'],
      ['knew', 'knew'],
      ['have known', 'have known'],
      ['will know', 'will know'],
    ],
    correctIndex: 1,
    expEn:
      'This is a second conditional — an unreal present situation. The pattern is: If + past simple, would + base verb. Hence "If I knew the answer, I would tell you."',
    expHi:
      'यह second conditional है — वर्तमान की काल्पनिक स्थिति। संरचना है: If + past simple, would + मूल क्रिया। अतः "If I knew the answer, I would tell you."',
    difficulty: 'medium',
    avgTime: 30,
    accuracy: 0.72,
  },
  {
    id: 'q-eng-006',
    subjectId: 'english',
    topicId: 'eng-phonetics',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The sounds /p/, /b/, /m/ are produced at which place of articulation?',
    hi: '/p/, /b/, /m/ ध्वनियाँ किस उच्चारण स्थान से उत्पन्न होती हैं?',
    options: [
      ['Bilabial', 'द्वयोष्ठ्य (Bilabial)'],
      ['Dental', 'दंत्य (Dental)'],
      ['Velar', 'कंठ्य (Velar)'],
      ['Glottal', 'स्वरयंत्रीय (Glottal)'],
    ],
    correctIndex: 0,
    expEn:
      '/p/, /b/ and /m/ are made by bringing both lips together — bilabial sounds. /t/, /d/ are alveolar/dental; /k/, /g/ are velar; /h/ is glottal.',
    expHi:
      '/p/, /b/ तथा /m/ दोनों ओष्ठों को मिलाकर बनती हैं — द्वयोष्ठ्य ध्वनियाँ। /t/, /d/ वर्त्स्य/दंत्य; /k/, /g/ कंठ्य तथा /h/ स्वरयंत्रीय है।',
    difficulty: 'hard',
    avgTime: 38,
    accuracy: 0.55,
  },

  /* ------------------------------------------------------------- SCIENCE */
  {
    id: 'q-sci-001',
    subjectId: 'science',
    topicId: 'sci-living',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Which part of the plant carries out photosynthesis?',
    hi: 'पौधे का कौन-सा भाग प्रकाश संश्लेषण करता है?',
    options: [
      ['Root', 'जड़'],
      ['Stem', 'तना'],
      ['Leaf', 'पत्ती'],
      ['Flower', 'फूल'],
    ],
    correctIndex: 2,
    expEn:
      'Leaves contain chloroplasts with chlorophyll, and stomata for gas exchange, making them the primary site of photosynthesis: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ in the presence of sunlight.',
    expHi:
      'पत्तियों में क्लोरोफिल युक्त हरितलवक तथा गैस विनिमय हेतु रंध्र होते हैं, अतः वे प्रकाश संश्लेषण का मुख्य स्थल हैं: सूर्य प्रकाश की उपस्थिति में 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂।',
    difficulty: 'easy',
    avgTime: 18,
    accuracy: 0.93,
  },
  {
    id: 'q-sci-002',
    subjectId: 'science',
    topicId: 'sci-motion',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The SI unit of force is:',
    hi: 'बल का SI मात्रक है:',
    options: [
      ['Joule', 'जूल'],
      ['Newton', 'न्यूटन'],
      ['Watt', 'वाट'],
      ['Pascal', 'पास्कल'],
    ],
    correctIndex: 1,
    expEn:
      'Force is measured in newtons (N), where 1 N = 1 kg·m/s². Joule is energy, watt is power and pascal is pressure.',
    expHi:
      'बल का मात्रक न्यूटन (N) है, जहाँ 1 N = 1 किग्रा·मी/से²। जूल ऊर्जा का, वाट शक्ति का तथा पास्कल दाब का मात्रक है।',
    difficulty: 'easy',
    avgTime: 20,
    accuracy: 0.9,
  },
  {
    id: 'q-sci-003',
    subjectId: 'science',
    topicId: 'sci-matter',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Which of the following is a chemical change?',
    hi: 'निम्नलिखित में से कौन रासायनिक परिवर्तन है?',
    options: [
      ['Melting of ice', 'बर्फ का पिघलना'],
      ['Rusting of iron', 'लोहे में जंग लगना'],
      ['Dissolving sugar in water', 'चीनी का पानी में घुलना'],
      ['Breaking of glass', 'काँच का टूटना'],
    ],
    correctIndex: 1,
    expEn:
      'Rusting forms a new substance — hydrated iron oxide — and is irreversible, so it is a chemical change. Melting, dissolving and breaking alter only physical state or form; the substance stays the same.',
    expHi:
      'जंग लगने पर नया पदार्थ — जलयोजित आयरन ऑक्साइड — बनता है तथा यह अनुत्क्रमणीय है, अतः यह रासायनिक परिवर्तन है। पिघलना, घुलना एवं टूटना केवल भौतिक अवस्था या रूप बदलते हैं; पदार्थ वही रहता है।',
    difficulty: 'easy',
    pyq: 'CTET Dec 2021 Paper 2',
    avgTime: 28,
    accuracy: 0.87,
  },
  {
    id: 'q-sci-004',
    subjectId: 'science',
    topicId: 'sci-food-health',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Deficiency of which vitamin causes night blindness?',
    hi: 'किस विटामिन की कमी से रतौंधी होती है?',
    options: [
      ['Vitamin A', 'विटामिन A'],
      ['Vitamin B12', 'विटामिन B12'],
      ['Vitamin C', 'विटामिन C'],
      ['Vitamin D', 'विटामिन D'],
    ],
    correctIndex: 0,
    expEn:
      'Vitamin A (retinol) is needed for rhodopsin in the retina; deficiency causes night blindness and, if severe, xerophthalmia. Carrots, papaya and green leafy vegetables are good sources.',
    expHi:
      'विटामिन A (रेटिनॉल) रेटिना में रोडोप्सिन हेतु आवश्यक है; इसकी कमी से रतौंधी तथा गंभीर स्थिति में जीरोफ्थैल्मिया होता है। गाजर, पपीता तथा हरी पत्तेदार सब्जियाँ अच्छे स्रोत हैं।',
    difficulty: 'easy',
    avgTime: 18,
    accuracy: 0.91,
  },
  {
    id: 'q-sci-005',
    subjectId: 'science',
    topicId: 'sci-pedagogy',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The best way to teach the concept of "evaporation" to Class 6 students is:',
    hi: 'कक्षा 6 के विद्यार्थियों को "वाष्पीकरण" की अवधारणा पढ़ाने का सर्वोत्तम तरीका है:',
    options: [
      ['Dictating the definition and making them memorise it', 'परिभाषा लिखवाकर याद कराना'],
      ['Letting them observe wet cloth drying and design a simple experiment', 'गीले कपड़े को सूखते देखने देना तथा सरल प्रयोग रचवाना'],
      ['Showing only the textbook diagram', 'केवल पाठ्यपुस्तक का चित्र दिखाना'],
      ['Asking them to write the definition ten times', 'परिभाषा दस बार लिखवाना'],
    ],
    correctIndex: 1,
    expEn:
      'Science pedagogy at the upper primary stage is inquiry-based: observe a familiar phenomenon, ask a question, predict, test and explain. Definitions come after the experience, not instead of it.',
    expHi:
      'उच्च प्राथमिक स्तर पर विज्ञान शिक्षाशास्त्र अन्वेषण आधारित है: परिचित घटना का प्रेक्षण, प्रश्न, पूर्वानुमान, परीक्षण तथा व्याख्या। परिभाषाएँ अनुभव के बाद आती हैं, उसके स्थान पर नहीं।',
    difficulty: 'medium',
    avgTime: 38,
    accuracy: 0.88,
  },
  {
    id: 'q-sci-006',
    subjectId: 'science',
    topicId: 'sci-natural',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Which gas is most responsible for the greenhouse effect being intensified by human activity?',
    hi: 'मानवीय गतिविधियों द्वारा ग्रीनहाउस प्रभाव को तीव्र करने हेतु सर्वाधिक उत्तरदायी गैस कौन-सी है?',
    options: [
      ['Oxygen', 'ऑक्सीजन'],
      ['Nitrogen', 'नाइट्रोजन'],
      ['Carbon dioxide', 'कार्बन डाइऑक्साइड'],
      ['Helium', 'हीलियम'],
    ],
    correctIndex: 2,
    expEn:
      'Carbon dioxide from burning fossil fuels is the largest human contribution to the enhanced greenhouse effect. Methane and nitrous oxide are stronger per molecule but far less abundant.',
    expHi:
      'जीवाश्म ईंधन जलाने से निकली कार्बन डाइऑक्साइड बढ़े हुए ग्रीनहाउस प्रभाव में मानव का सबसे बड़ा योगदान है। मीथेन तथा नाइट्रस ऑक्साइड प्रति अणु अधिक प्रभावी हैं किंतु मात्रा में बहुत कम।',
    difficulty: 'easy',
    avgTime: 25,
    accuracy: 0.89,
  },

  /* ----------------------------------------------------------------- SST */
  {
    id: 'q-sst-001',
    subjectId: 'sst',
    topicId: 'sst-civics',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The Fundamental Duties were added to the Indian Constitution by which amendment?',
    hi: 'भारतीय संविधान में मूल कर्तव्य किस संशोधन द्वारा जोड़े गए?',
    options: [
      ['42nd Amendment, 1976', '42वाँ संशोधन, 1976'],
      ['44th Amendment, 1978', '44वाँ संशोधन, 1978'],
      ['73rd Amendment, 1992', '73वाँ संशोधन, 1992'],
      ['86th Amendment, 2002', '86वाँ संशोधन, 2002'],
    ],
    correctIndex: 0,
    expEn:
      'The 42nd Amendment (1976) inserted Part IVA, Article 51A, listing ten Fundamental Duties on the recommendation of the Swaran Singh Committee. An eleventh duty — providing education to children aged 6-14 — was added by the 86th Amendment (2002).',
    expHi:
      '42वें संशोधन (1976) ने स्वर्ण सिंह समिति की संस्तुति पर भाग IVक, अनुच्छेद 51क जोड़कर दस मूल कर्तव्य सूचीबद्ध किए। ग्यारहवाँ कर्तव्य — 6-14 वर्ष के बालकों को शिक्षा देना — 86वें संशोधन (2002) द्वारा जोड़ा गया।',
    difficulty: 'medium',
    pyq: 'DSSSB TGT 2023',
    avgTime: 35,
    accuracy: 0.68,
  },
  {
    id: 'q-sst-002',
    subjectId: 'sst',
    topicId: 'sst-history',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The Dandi March of 1930 was launched by Mahatma Gandhi against:',
    hi: '1930 का दांडी मार्च महात्मा गांधी ने किसके विरुद्ध आरंभ किया था?',
    options: [
      ['The Rowlatt Act', 'रौलेट अधिनियम'],
      ['The salt tax', 'नमक कर'],
      ['The partition of Bengal', 'बंगाल विभाजन'],
      ['The Simon Commission', 'साइमन कमीशन'],
    ],
    correctIndex: 1,
    expEn:
      'Gandhi walked 240 miles from Sabarmati to Dandi (12 March - 6 April 1930) and broke the salt law by making salt from seawater, launching the Civil Disobedience Movement.',
    expHi:
      'गांधीजी ने साबरमती से दांडी तक 240 मील (12 मार्च - 6 अप्रैल 1930) पैदल यात्रा कर समुद्री जल से नमक बनाकर नमक कानून तोड़ा तथा सविनय अवज्ञा आंदोलन आरंभ किया।',
    difficulty: 'easy',
    avgTime: 25,
    accuracy: 0.9,
  },
  {
    id: 'q-sst-003',
    subjectId: 'sst',
    topicId: 'sst-geography',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The Tropic of Cancer passes through how many Indian states?',
    hi: 'कर्क रेखा भारत के कितने राज्यों से होकर गुजरती है?',
    options: [
      ['6', '6'],
      ['7', '7'],
      ['8', '8'],
      ['9', '9'],
    ],
    correctIndex: 2,
    expEn:
      'The Tropic of Cancer (23°30′N) passes through 8 states: Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura and Mizoram.',
    expHi:
      'कर्क रेखा (23°30′ उत्तर) 8 राज्यों से गुजरती है: गुजरात, राजस्थान, मध्य प्रदेश, छत्तीसगढ़, झारखंड, पश्चिम बंगाल, त्रिपुरा तथा मिजोरम।',
    difficulty: 'medium',
    avgTime: 30,
    accuracy: 0.7,
  },
  {
    id: 'q-sst-004',
    subjectId: 'sst',
    topicId: 'sst-civics',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'Who is the constitutional head of the Indian State?',
    hi: 'भारतीय राज्य का संवैधानिक प्रमुख कौन होता है?',
    options: [
      ['The Prime Minister', 'प्रधानमंत्री'],
      ['The President', 'राष्ट्रपति'],
      ['The Chief Justice of India', 'भारत के मुख्य न्यायाधीश'],
      ['The Speaker of Lok Sabha', 'लोकसभा अध्यक्ष'],
    ],
    correctIndex: 1,
    expEn:
      'The President is the constitutional (nominal) head of the Indian Union under Article 52-53, while real executive power rests with the Council of Ministers headed by the Prime Minister.',
    expHi:
      'अनुच्छेद 52-53 के अंतर्गत राष्ट्रपति भारतीय संघ का संवैधानिक (नाममात्र) प्रमुख होता है, जबकि वास्तविक कार्यपालिका शक्ति प्रधानमंत्री की अध्यक्षता वाली मंत्रिपरिषद में निहित है।',
    difficulty: 'easy',
    avgTime: 20,
    accuracy: 0.92,
  },
  {
    id: 'q-sst-005',
    subjectId: 'sst',
    topicId: 'sst-pedagogy',
    examIds: [...ALL_TET, ...RECRUIT],
    en: 'The most appropriate way to teach "local self-government" in Class 7 is:',
    hi: 'कक्षा 7 में "स्थानीय स्वशासन" पढ़ाने का सर्वाधिक उपयुक्त तरीका है:',
    options: [
      ['Dictating notes on the 73rd Amendment', '73वें संशोधन पर नोट्स लिखवाना'],
      ['Organising a mock gram sabha in the classroom', 'कक्षा में मॉक ग्राम सभा आयोजित करना'],
      ['Asking children to memorise the panchayat structure', 'पंचायत संरचना रटवाना'],
      ['Showing a single chart and moving on', 'एक चार्ट दिखाकर आगे बढ़ जाना'],
    ],
    correctIndex: 1,
    expEn:
      'Social Studies pedagogy asks for participation and enquiry — role play, mock bodies, local field visits and interviews. A mock gram sabha turns an abstract structure into an experience the child can reason about.',
    expHi:
      'सामाजिक अध्ययन शिक्षाशास्त्र सहभागिता एवं अन्वेषण चाहता है — भूमिका निर्वाह, मॉक निकाय, स्थानीय भ्रमण एवं साक्षात्कार। मॉक ग्राम सभा अमूर्त संरचना को ऐसे अनुभव में बदल देती है जिस पर बालक तर्क कर सके।',
    difficulty: 'medium',
    avgTime: 40,
    accuracy: 0.85,
  },

  /* ------------------------------------------------------------------ GK */
  {
    id: 'q-gk-001',
    subjectId: 'gk',
    topicId: 'gk-polity',
    examIds: RECRUIT,
    en: 'National Education Policy (NEP) 2020 replaced the earlier policy of which year?',
    hi: 'राष्ट्रीय शिक्षा नीति (NEP) 2020 ने किस वर्ष की पूर्ववर्ती नीति का स्थान लिया?',
    options: [
      ['1968', '1968'],
      ['1986 (modified 1992)', '1986 (1992 में संशोधित)'],
      ['2005', '2005'],
      ['2009', '2009'],
    ],
    correctIndex: 1,
    expEn:
      'NEP 2020 replaced the National Policy on Education 1986, as modified in 1992. It introduced the 5+3+3+4 curricular structure and set a target of 6% of GDP for education spending.',
    expHi:
      'NEP 2020 ने 1986 की राष्ट्रीय शिक्षा नीति (1992 में संशोधित) का स्थान लिया। इसने 5+3+3+4 पाठ्यचर्या संरचना दी तथा शिक्षा व्यय हेतु GDP का 6% लक्ष्य निर्धारित किया।',
    difficulty: 'easy',
    pyq: 'KVS PRT 2023',
    avgTime: 25,
    accuracy: 0.86,
  },
  {
    id: 'q-gk-002',
    subjectId: 'gk',
    topicId: 'gk-state',
    examIds: ['htet', 'hssc-tgt-pgt'],
    en: 'Which is the largest district of Haryana by area?',
    hi: 'क्षेत्रफल की दृष्टि से हरियाणा का सबसे बड़ा जिला कौन-सा है?',
    options: [
      ['Hisar', 'हिसार'],
      ['Sirsa', 'सिरसा'],
      ['Bhiwani', 'भिवानी'],
      ['Gurugram', 'गुरुग्राम'],
    ],
    correctIndex: 1,
    expEn:
      'Sirsa is Haryana\'s largest district by area (about 4,277 sq km). Bhiwani was the largest before Charkhi Dadri was carved out of it in 2016. Haryana GK carries 25% weight in HSSC papers.',
    expHi:
      'क्षेत्रफल की दृष्टि से सिरसा हरियाणा का सबसे बड़ा जिला है (लगभग 4,277 वर्ग किमी)। 2016 में चरखी दादरी अलग होने से पूर्व भिवानी सबसे बड़ा था। HSSC पेपरों में हरियाणा GK का 25% भार होता है।',
    difficulty: 'medium',
    avgTime: 25,
    accuracy: 0.62,
  },
  {
    id: 'q-gk-003',
    subjectId: 'gk',
    topicId: 'gk-static',
    examIds: RECRUIT,
    en: 'National Education Day is observed in India on:',
    hi: 'भारत में राष्ट्रीय शिक्षा दिवस कब मनाया जाता है?',
    options: [
      ['5 September', '5 सितंबर'],
      ['11 November', '11 नवंबर'],
      ['14 November', '14 नवंबर'],
      ['26 November', '26 नवंबर'],
    ],
    correctIndex: 1,
    expEn:
      'National Education Day is 11 November, the birth anniversary of Maulana Abul Kalam Azad, independent India\'s first Education Minister. 5 September is Teachers\' Day (Dr Radhakrishnan\'s birthday).',
    expHi:
      'राष्ट्रीय शिक्षा दिवस 11 नवंबर को स्वतंत्र भारत के प्रथम शिक्षा मंत्री मौलाना अबुल कलाम आज़ाद की जयंती पर मनाया जाता है। 5 सितंबर शिक्षक दिवस (डॉ. राधाकृष्णन का जन्मदिन) है।',
    difficulty: 'easy',
    avgTime: 20,
    accuracy: 0.81,
  },
  {
    id: 'q-gk-004',
    subjectId: 'gk',
    topicId: 'gk-polity',
    examIds: RECRUIT,
    en: 'Education was moved from the State List to the Concurrent List by which amendment?',
    hi: 'शिक्षा को राज्य सूची से समवर्ती सूची में किस संशोधन द्वारा स्थानांतरित किया गया?',
    options: [
      ['42nd Amendment, 1976', '42वाँ संशोधन, 1976'],
      ['44th Amendment, 1978', '44वाँ संशोधन, 1978'],
      ['52nd Amendment, 1985', '52वाँ संशोधन, 1985'],
      ['86th Amendment, 2002', '86वाँ संशोधन, 2002'],
    ],
    correctIndex: 0,
    expEn:
      'The 42nd Amendment (1976) shifted education to the Concurrent List, which is why both the Centre and the States now legislate on it. The 86th Amendment made elementary education a fundamental right.',
    expHi:
      '42वें संशोधन (1976) ने शिक्षा को समवर्ती सूची में स्थानांतरित किया, इसीलिए अब केंद्र एवं राज्य दोनों इस पर विधि बना सकते हैं। 86वें संशोधन ने प्रारंभिक शिक्षा को मूल अधिकार बनाया।',
    difficulty: 'medium',
    pyq: 'DSSSB PRT 2022',
    avgTime: 30,
    accuracy: 0.64,
  },

  /* ----------------------------------------------------------- REASONING */
  {
    id: 'q-rea-001',
    subjectId: 'reasoning',
    topicId: 'rea-series',
    examIds: RECRUIT,
    en: 'Find the next term: 3, 6, 11, 18, 27, ?',
    hi: 'अगला पद ज्ञात कीजिए: 3, 6, 11, 18, 27, ?',
    options: [
      ['36', '36'],
      ['38', '38'],
      ['40', '40'],
      ['42', '42'],
    ],
    correctIndex: 1,
    expEn:
      'Differences are 3, 5, 7, 9 — consecutive odd numbers. The next difference is 11, so 27 + 11 = 38.',
    expHi:
      'अंतर हैं 3, 5, 7, 9 — क्रमागत विषम संख्याएँ। अगला अंतर 11 होगा, अतः 27 + 11 = 38।',
    difficulty: 'medium',
    avgTime: 45,
    accuracy: 0.74,
  },
  {
    id: 'q-rea-002',
    subjectId: 'reasoning',
    topicId: 'rea-coding',
    examIds: RECRUIT,
    en: 'If TEACHER is coded as UFBDIFS, then SCHOOL will be coded as:',
    hi: 'यदि TEACHER को UFBDIFS लिखा जाए, तो SCHOOL को लिखा जाएगा:',
    options: [
      ['TDIPPM', 'TDIPPM'],
      ['TDJPPM', 'TDJPPM'],
      ['SDIPPM', 'SDIPPM'],
      ['TDIPPN', 'TDIPPN'],
    ],
    correctIndex: 0,
    expEn:
      'Each letter moves one step forward: T→U, E→F, A→B, C→D, H→I, E→F, R→S. Applying the same to SCHOOL: S→T, C→D, H→I, O→P, O→P, L→M = TDIPPM.',
    expHi:
      'प्रत्येक अक्षर एक स्थान आगे बढ़ता है: T→U, E→F, A→B, C→D, H→I, E→F, R→S। यही नियम SCHOOL पर लगाने पर: S→T, C→D, H→I, O→P, O→P, L→M = TDIPPM।',
    difficulty: 'easy',
    avgTime: 40,
    accuracy: 0.83,
  },
  {
    id: 'q-rea-003',
    subjectId: 'reasoning',
    topicId: 'rea-blood',
    examIds: RECRUIT,
    en: 'Pointing to a photograph, Ravi said, "She is the daughter of my grandfather\'s only son." How is she related to Ravi?',
    hi: 'एक तस्वीर की ओर संकेत करते हुए रवि ने कहा, "यह मेरे दादा के इकलौते पुत्र की पुत्री है।" वह रवि की क्या लगती है?',
    options: [
      ['Cousin', 'चचेरी बहन'],
      ['Sister', 'बहन'],
      ['Aunt', 'बुआ'],
      ['Niece', 'भतीजी'],
    ],
    correctIndex: 1,
    expEn:
      'Grandfather\'s only son is Ravi\'s own father. The father\'s daughter is therefore Ravi\'s sister.',
    expHi:
      'दादा का इकलौता पुत्र स्वयं रवि के पिता हैं। अतः पिता की पुत्री रवि की बहन हुई।',
    difficulty: 'easy',
    avgTime: 35,
    accuracy: 0.8,
  },
  {
    id: 'q-rea-004',
    subjectId: 'reasoning',
    topicId: 'rea-syllogism',
    examIds: RECRUIT,
    en: 'Statements: All teachers are graduates. Some graduates are researchers. Which conclusion follows?',
    hi: 'कथन: सभी शिक्षक स्नातक हैं। कुछ स्नातक शोधकर्ता हैं। कौन-सा निष्कर्ष निकलता है?',
    options: [
      ['All teachers are researchers', 'सभी शिक्षक शोधकर्ता हैं'],
      ['Some teachers are researchers', 'कुछ शिक्षक शोधकर्ता हैं'],
      ['No teacher is a researcher', 'कोई शिक्षक शोधकर्ता नहीं है'],
      ['Neither conclusion necessarily follows', 'कोई भी निष्कर्ष आवश्यक रूप से नहीं निकलता'],
    ],
    correctIndex: 3,
    expEn:
      'The researchers among graduates may lie entirely outside the teacher subset, so neither "some teachers are researchers" nor "no teacher is a researcher" is guaranteed. In syllogism, a possibility is not a conclusion.',
    expHi:
      'स्नातकों में जो शोधकर्ता हैं वे पूर्णतः शिक्षक उपसमुच्चय के बाहर हो सकते हैं, अतः न "कुछ शिक्षक शोधकर्ता हैं" और न ही "कोई शिक्षक शोधकर्ता नहीं" निश्चित है। न्यायवाक्य में संभावना निष्कर्ष नहीं होती।',
    difficulty: 'hard',
    avgTime: 55,
    accuracy: 0.51,
  },

  /* ------------------------------------------------------------ COMPUTER */
  {
    id: 'q-comp-001',
    subjectId: 'computer',
    topicId: 'comp-basics',
    examIds: RECRUIT,
    en: 'Which of the following is an input device?',
    hi: 'निम्नलिखित में से कौन एक निवेश (input) युक्ति है?',
    options: [
      ['Monitor', 'मॉनिटर'],
      ['Printer', 'प्रिंटर'],
      ['Scanner', 'स्कैनर'],
      ['Speaker', 'स्पीकर'],
    ],
    correctIndex: 2,
    expEn:
      'A scanner feeds data into the computer, making it an input device. Monitor, printer and speaker all deliver output from the computer to the user.',
    expHi:
      'स्कैनर कंप्यूटर में डेटा भेजता है, अतः यह निवेश युक्ति है। मॉनिटर, प्रिंटर तथा स्पीकर तीनों कंप्यूटर से उपयोगकर्ता तक निर्गत (output) पहुँचाते हैं।',
    difficulty: 'easy',
    avgTime: 15,
    accuracy: 0.94,
  },
  {
    id: 'q-comp-002',
    subjectId: 'computer',
    topicId: 'comp-ict',
    examIds: RECRUIT,
    en: 'DIKSHA, launched by the Ministry of Education, is primarily a:',
    hi: 'शिक्षा मंत्रालय द्वारा आरंभ दीक्षा (DIKSHA) मुख्यतः क्या है?',
    options: [
      ['Digital platform for school education content and teacher training', 'विद्यालयी शिक्षा सामग्री एवं शिक्षक प्रशिक्षण हेतु डिजिटल मंच'],
      ['Student scholarship scheme', 'छात्र छात्रवृत्ति योजना'],
      ['School building programme', 'विद्यालय भवन कार्यक्रम'],
      ['Mid-day meal scheme', 'मध्याह्न भोजन योजना'],
    ],
    correctIndex: 0,
    expEn:
      'DIKSHA (Digital Infrastructure for Knowledge Sharing) hosts e-content, QR-coded textbooks and teacher training modules such as NISHTHA. Questions on national ed-tech initiatives are common in KVS and NVS computer sections.',
    expHi:
      'दीक्षा (Digital Infrastructure for Knowledge Sharing) पर ई-सामग्री, QR कोड युक्त पाठ्यपुस्तकें तथा निष्ठा जैसे शिक्षक प्रशिक्षण मॉड्यूल उपलब्ध हैं। राष्ट्रीय एड-टेक पहलों पर प्रश्न KVS तथा NVS के कंप्यूटर खंड में सामान्य हैं।',
    difficulty: 'easy',
    avgTime: 25,
    accuracy: 0.84,
  },
  {
    id: 'q-comp-003',
    subjectId: 'computer',
    topicId: 'comp-basics',
    examIds: RECRUIT,
    en: '1 Gigabyte (GB) is equal to:',
    hi: '1 गीगाबाइट (GB) बराबर होता है:',
    options: [
      ['1024 Kilobytes', '1024 किलोबाइट'],
      ['1024 Megabytes', '1024 मेगाबाइट'],
      ['1024 Terabytes', '1024 टेराबाइट'],
      ['1000 Bytes', '1000 बाइट'],
    ],
    correctIndex: 1,
    expEn: 'The binary progression is: 1 KB = 1024 bytes, 1 MB = 1024 KB, 1 GB = 1024 MB, 1 TB = 1024 GB.',
    expHi: 'द्विआधारी क्रम है: 1 KB = 1024 बाइट, 1 MB = 1024 KB, 1 GB = 1024 MB, 1 TB = 1024 GB।',
    difficulty: 'easy',
    avgTime: 18,
    accuracy: 0.9,
  },
];

export const QUESTIONS: Question[] = SEEDS.map(build);

export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export const getQuestion = (id: string) => QUESTION_BY_ID.get(id);

export const getQuestions = (ids: string[]): Question[] =>
  ids.map((id) => QUESTION_BY_ID.get(id)).filter((q): q is Question => Boolean(q));

export const questionsBySubject = (subjectId: string) =>
  QUESTIONS.filter((q) => q.subjectId === subjectId);

export const questionsByTopic = (topicId: string) =>
  QUESTIONS.filter((q) => q.topicId === topicId);

export const questionsByExam = (examId: string) =>
  QUESTIONS.filter((q) => q.examIds.includes(examId));

export const previousYearQuestions = () => QUESTIONS.filter((q) => Boolean(q.previousYear));
