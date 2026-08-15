import type { ImportOptions } from './import';

/**
 * The labels the HTET source spreadsheets use, mapped to ids in this taxonomy.
 *
 * GENERATED FROM content/topic-map.json — do not edit by hand. Change the JSON,
 * which carries the reasoning behind each call, then run `npm run content:map`.
 * A test fails if this file and the JSON disagree.
 *
 * A label that is not here is not guessed at: it passes through unchanged and
 * the row is rejected naming the value, so a new topic in a future paper is a
 * visible failure rather than a question filed under the wrong heading.
 */
export const HTET_VALUE_ALIASES: NonNullable<ImportOptions['valueAliases']> = {
  level: {
    "PRT": "primary",
    "TGT": "upper-primary",
    "PGT": "senior-secondary",
  },
  subject: {
    "CDP": "cdp",
    "Child Development & Pedagogy": "cdp",
    "G.K. & Awareness": "haryana-gk",
  },
  topic: {
    "Assessment": "cdp-assessment",
    "CCE": "cdp-assessment",
    "Question Formulation": "cdp-assessment",
    "Concept of Development": "cdp-growth",
    "Principles of Development": "cdp-growth",
    "Heredity & Environment": "cdp-growth",
    "Child as Learner": "cdp-growth",
    "Piaget": "cdp-piaget",
    "Kohlberg": "cdp-piaget",
    "Vygotsky": "cdp-piaget",
    "Language & Thought": "cdp-piaget",
    "Learning Process": "cdp-learning",
    "Learning and Pedagogy": "cdp-learning",
    "Teaching & Learning": "cdp-learning",
    "Factors Contributing to Learning": "cdp-learning",
    "Child-Centered & Progressive Education": "cdp-learning",
    "Motivation & Learning": "cdp-motivation",
    "Intelligence": "cdp-intelligence",
    "Cognition & Emotions": "cdp-intelligence",
    "Inclusive Education": "cdp-inclusive",
    "Inclusive Education & Special Needs": "cdp-inclusive",
    "Children with Special Needs": "cdp-inclusive",
    "Special Learners": "cdp-inclusive",
    "Gender as Social Construct": "cdp-gender",
    "Socialization Processes": "cdp-gender",
    "Individual Differences": "cdp-gender",
    "Haryana related history": "hgk-history",
    "Geography": "hgk-geography",
    "Environment": "hgk-geography",
    "Civics": "hgk-polity",
    "Culture, Art, Traditions": "hgk-culture",
    "Literature": "hgk-culture",
    "Welfare Schemes of Haryana Government": "hgk-schemes",
    "Current affairs": "hgk-schemes",
  },
};

/** Every topic id the map can produce, for asserting they all exist. */
export const HTET_MAPPED_TOPIC_IDS: string[] = [
  "cdp-assessment",
  "cdp-gender",
  "cdp-growth",
  "cdp-inclusive",
  "cdp-intelligence",
  "cdp-learning",
  "cdp-motivation",
  "cdp-piaget",
  "hgk-culture",
  "hgk-geography",
  "hgk-history",
  "hgk-polity",
  "hgk-schemes"
];
