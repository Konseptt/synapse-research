export interface PopularTopic {
  label: string;
  query: string;
  description?: string;
  category: TopicCategory;
  /** Everyday phrases that should map to this search */
  aliases?: string[];
}

export type TopicCategory =
  | "all"
  | "everyday"
  | "mental"
  | "body"
  | "food"
  | "kids"
  | "life";

export const TOPIC_CATEGORIES: { id: TopicCategory; label: string }[] = [
  { id: "all", label: "All topics" },
  { id: "everyday", label: "Everyday health" },
  { id: "mental", label: "Mind & mood" },
  { id: "body", label: "Body & fitness" },
  { id: "food", label: "Food & diet" },
  { id: "kids", label: "Kids & family" },
  { id: "life", label: "Sleep & habits" },
];

/** Everyday questions mapped to PubMed-friendly search terms. */
export const POPULAR_TOPICS: PopularTopic[] = [
  // Everyday
  {
    label: "Is coffee bad for you?",
    query: "coffee health benefits risks",
    description: "What studies say about daily coffee.",
    category: "everyday",
    aliases: ["coffee bad", "too much coffee", "caffeine health"],
  },
  {
    label: "Does sunscreen prevent cancer?",
    query: "sunscreen skin cancer prevention",
    description: "Sun protection and skin health.",
    category: "everyday",
    aliases: ["sunscreen safe", "spf cancer"],
  },
  {
    label: "Flu shot: worth it?",
    query: "influenza vaccine effectiveness",
    description: "How well flu vaccines work.",
    category: "everyday",
    aliases: ["flu vaccine", "should I get flu shot"],
  },
  {
    label: "Screen time & eyes",
    query: "screen time digital eye strain",
    description: "Phones, computers, and eye health.",
    category: "everyday",
    aliases: ["phone eyes hurt", "too much screen time"],
  },
  // Mental
  {
    label: "Anxiety: what helps?",
    query: "anxiety treatment therapy exercise",
    description: "Treatments people actually study.",
    category: "mental",
    aliases: ["help anxiety", "anxiety cure", "worried all the time"],
  },
  {
    label: "Depression & exercise",
    query: "exercise depression treatment",
    description: "Can working out improve mood?",
    category: "mental",
    aliases: ["exercise help depression", "walking depression"],
  },
  {
    label: "Does therapy work?",
    query: "psychotherapy depression anxiety efficacy",
    description: "Evidence for talk therapy.",
    category: "mental",
    aliases: ["therapy worth it", "counseling help"],
  },
  {
    label: "Meditation for stress",
    query: "mindfulness meditation stress reduction",
    description: "Calming practices backed by research.",
    category: "mental",
    aliases: ["meditation help stress", "mindfulness anxiety"],
  },
  {
    label: "ADHD in adults",
    query: "adult ADHD diagnosis treatment",
    description: "Focus and attention later in life.",
    category: "mental",
    aliases: ["adhd grown ups", "cant focus adult"],
  },
  // Body
  {
    label: "Back pain fixes",
    query: "low back pain treatment exercise",
    description: "What helps a sore back.",
    category: "body",
    aliases: ["back pain help", "lower back hurt", "back ache"],
  },
  {
    label: "Knee pain & running",
    query: "running knee pain prevention",
    description: "Running without wrecking your knees.",
    category: "body",
    aliases: ["knee hurts running", "runner knee"],
  },
  {
    label: "Weight loss medicines",
    query: "GLP-1 obesity weight loss treatment",
    description: "Newer prescription weight-loss drugs.",
    category: "body",
    aliases: ["ozempic weight loss", "wegovy", "weight loss injection"],
  },
  {
    label: "Heart-healthy diet",
    query: "mediterranean diet cardiovascular",
    description: "Food patterns linked to heart health.",
    category: "body",
    aliases: ["heart diet", "food for heart"],
  },
  {
    label: "High blood pressure",
    query: "hypertension lifestyle diet exercise",
    description: "Lowering blood pressure naturally.",
    category: "body",
    aliases: ["blood pressure high", "lower blood pressure"],
  },
  // Food
  {
    label: "Is sugar bad?",
    query: "sugar intake health metabolic",
    description: "Sugar and long-term health.",
    category: "food",
    aliases: ["too much sugar", "sugar health"],
  },
  {
    label: "Intermittent fasting",
    query: "intermittent fasting weight metabolic health",
    description: "Skipping meals: does it help?",
    category: "food",
    aliases: ["fasting diet", "16:8 fasting"],
  },
  {
    label: "Protein & muscle",
    query: "dietary protein muscle mass aging",
    description: "Protein for strength as you age.",
    category: "food",
    aliases: ["how much protein", "protein shakes"],
  },
  {
    label: "Gluten sensitivity",
    query: "gluten celiac non-celiac sensitivity",
    description: "Gluten issues beyond celiac disease.",
    category: "food",
    aliases: ["gluten free", "gluten intolerance"],
  },
  // Kids
  {
    label: "Childhood vaccines",
    query: "childhood vaccination safety efficacy",
    description: "Vaccine safety in children.",
    category: "kids",
    aliases: ["vaccines safe kids", "baby shots"],
  },
  {
    label: "Kids & screen time",
    query: "children screen time development",
    description: "Screens and child development.",
    category: "kids",
    aliases: ["ipad kids", "phone children"],
  },
  {
    label: "Breastfeeding benefits",
    query: "breastfeeding infant health benefits",
    description: "What research says about nursing.",
    category: "kids",
    aliases: ["breast milk vs formula"],
  },
  // Life
  {
    label: "Sleep & mood",
    query: "sleep deprivation depression anxiety",
    description: "How sleep affects how you feel.",
    category: "life",
    aliases: ["not enough sleep", "sleep mental health"],
  },
  {
    label: "Insomnia help",
    query: "insomnia treatment cognitive behavioral",
    description: "Falling and staying asleep.",
    category: "life",
    aliases: ["cant sleep", "trouble sleeping"],
  },
  {
    label: "Vitamin D",
    query: "vitamin D deficiency supplementation health",
    description: "Sun vitamin and supplements.",
    category: "life",
    aliases: ["vitamin d pills", "low vitamin d"],
  },
  {
    label: "Alcohol & health",
    query: "alcohol consumption health risks benefits",
    description: "Drinking and long-term health.",
    category: "life",
    aliases: ["wine good for you", "how much alcohol safe"],
  },
  {
    label: "Yoga for health",
    query: "yoga health benefits chronic pain",
    description: "Stretching, breathing, and wellness.",
    category: "life",
    aliases: ["yoga help back", "yoga stress"],
  },
];

export const SEARCH_PLACEHOLDERS = [
  "Is coffee bad for you?",
  "Does walking help depression?",
  "What helps back pain?",
  "Are flu shots worth it?",
  "Can meditation reduce stress?",
  "Is sugar unhealthy?",
];

export const EXAMPLE_QUESTIONS = [
  "In simple terms, what did this study find?",
  "Is this study trustworthy?",
  "Who was studied? Can I relate to them?",
  "What are the main risks or downsides mentioned?",
];

export const MULTI_PAPER_QUESTIONS = [
  "What do these studies agree on?",
  "Where do these studies disagree?",
  "What is the overall takeaway?",
  "Which study has the strongest evidence?",
];

export const MEDICAL_DISCLAIMER =
  "Synapse summarizes published research for learning. It is not medical advice. Talk to a doctor about your own health decisions.";
