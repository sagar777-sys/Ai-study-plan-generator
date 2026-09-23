/**
 * Mamdani fuzzy inference for study briefs.
 *
 * Pipeline: fuzzify inputs -> fire rule base (min implication)
 *           -> aggregate per output term (max) -> defuzzify (centroid).
 *
 * The same function runs in the browser for the live inference preview and
 * inside the Convex action that composes the authoritative plan, so what the
 * user sees while dragging the sliders is exactly what gets filed.
 */

export type HoursTerm = "scarce" | "moderate" | "ample";
export type ExamTerm = "urgent" | "near" | "distant";
export type KnowledgeTerm = "weak" | "working" | "strong";
export type IntensityTerm = "gentle" | "steady" | "rigorous";
export type CadenceTerm = "rare" | "weekly" | "dense";
export type SessionTerm = "short" | "medium" | "long";

export interface FuzzyInputs {
  /** Study hours available per week (1..60). */
  hoursPerWeek: number;
  /** Days remaining until the exam (1..365). */
  daysUntilExam: number;
  /** Prior knowledge of the subject, 0 (brand new) .. 10 (confident). */
  priorKnowledge: number;
}

export interface TermReading {
  term: string;
  mu: number;
}

export interface OutputReading {
  /** Defuzzified crisp value on a 0..100 universe. */
  value: number;
  /** Linguistic label with the highest aggregate firing strength. */
  label: string;
  /** Firing strength of the winning label (0..1). */
  mu: number;
  /** Firing strength per output term — handy for a small breakdown. */
  terms: TermReading[];
}

export interface FiredRule {
  text: string;
  strength: number;
}

export interface Inference {
  hours: TermReading[];
  exam: TermReading[];
  knowledge: TermReading[];
  intensity: OutputReading;
  cadence: OutputReading;
  session: OutputReading;
  /** Suggested sitting length in minutes, derived from the session reading. */
  sessionMinutes: number;
  /** Rules that fired, strongest first. */
  rules: FiredRule[];
}

/* ------------------------------------------------------------------ */
/* Membership functions                                                */
/* ------------------------------------------------------------------ */

type MF = (x: number) => number;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const r1 = (x: number) => Math.round(x * 10) / 10;
const r3 = (x: number) => Math.round(x * 1000) / 1000;

/** Triangular MF; a === b gives a left shoulder, b === c a right shoulder. */
function tri(a: number, b: number, c: number): MF {
  return (x) => {
    if (x < a || x > c) return 0;
    if (x < b) return b === a ? 1 : (x - a) / (b - a);
    return c === b ? 1 : (c - x) / (c - b);
  };
}

/** Trapezoidal MF. */
function trap(a: number, b: number, c: number, d: number): MF {
  return (x) => {
    if (x < a || x > d) return 0;
    if (x < b) return b === a ? 1 : (x - a) / (b - a);
    if (x <= c) return 1;
    return d === c ? 1 : (d - x) / (d - c);
  };
}

/* Linguistic variables — fuzzification side */
const HOURS_MFS: Record<HoursTerm, MF> = {
  scarce: trap(0, 0, 2, 7),
  moderate: tri(4, 12, 20),
  ample: trap(15, 25, 60, 60),
};

const EXAM_MFS: Record<ExamTerm, MF> = {
  urgent: trap(0, 0, 7, 16),
  near: tri(10, 35, 70),
  distant: trap(50, 100, 365, 365),
};

const KNOWLEDGE_MFS: Record<KnowledgeTerm, MF> = {
  weak: trap(0, 0, 1.5, 4),
  working: tri(3, 5.5, 8),
  strong: trap(6.5, 8.5, 10, 10),
};

/* Output universes — all on a 0..100 axis */
const INTENSITY_SETS: Record<IntensityTerm, MF> = {
  gentle: tri(0, 0, 35),
  steady: tri(25, 50, 75),
  rigorous: tri(65, 100, 100),
};
const CADENCE_SETS: Record<CadenceTerm, MF> = {
  rare: tri(0, 0, 35),
  weekly: tri(25, 50, 75),
  dense: tri(65, 100, 100),
};
const SESSION_SETS: Record<SessionTerm, MF> = {
  short: tri(0, 0, 35),
  medium: tri(25, 50, 75),
  long: tri(65, 100, 100),
};

/* ------------------------------------------------------------------ */
/* Rule base                                                           */
/* ------------------------------------------------------------------ */

type When = Partial<{ hours: HoursTerm; exam: ExamTerm; knowledge: KnowledgeTerm }>;
type Then = Partial<{ intensity: IntensityTerm; cadence: CadenceTerm; session: SessionTerm }>;

interface Rule {
  when: When;
  then: Then;
}

/**
 * Thirteen hand-authored linguistic rules. Antecedents left out are wildcards
 * (degree 1); firing strength is the min over the stated antecedents.
 */
const RULES: Rule[] = [
  { when: { hours: "scarce" }, then: { intensity: "gentle", cadence: "rare", session: "short" } },
  { when: { hours: "ample" }, then: { intensity: "rigorous", cadence: "weekly", session: "long" } },
  { when: { exam: "urgent" }, then: { intensity: "steady", cadence: "dense", session: "short" } },
  { when: { exam: "distant" }, then: { intensity: "gentle", cadence: "rare", session: "medium" } },
  { when: { knowledge: "weak" }, then: { intensity: "steady", cadence: "weekly", session: "medium" } },
  { when: { knowledge: "strong" }, then: { intensity: "rigorous", cadence: "weekly", session: "long" } },
  {
    when: { hours: "moderate", exam: "urgent", knowledge: "weak" },
    then: { intensity: "gentle", cadence: "dense", session: "short" },
  },
  {
    when: { hours: "ample", knowledge: "strong" },
    then: { intensity: "rigorous", cadence: "dense", session: "long" },
  },
  {
    when: { hours: "ample", exam: "urgent" },
    then: { intensity: "rigorous", cadence: "dense", session: "short" },
  },
  {
    when: { hours: "moderate", exam: "near", knowledge: "working" },
    then: { intensity: "steady", cadence: "weekly", session: "medium" },
  },
  {
    when: { exam: "near", knowledge: "weak" },
    then: { intensity: "steady", cadence: "dense", session: "medium" },
  },
  {
    when: { knowledge: "working", exam: "distant" },
    then: { intensity: "gentle", cadence: "weekly", session: "long" },
  },
  {
    when: { hours: "moderate", exam: "distant", knowledge: "strong" },
    then: { intensity: "rigorous", cadence: "weekly", session: "long" },
  },
];

export const RULE_COUNT = RULES.length;

/* ------------------------------------------------------------------ */
/* Inference                                                           */
/* ------------------------------------------------------------------ */

function readings<T extends string>(mfs: Record<T, MF>, x: number): TermReading[] {
  return (Object.keys(mfs) as T[]).map((term) => ({ term, mu: r3(mfs[term](x)) }));
}

function degreesOf<T extends string>(mfs: Record<T, MF>, x: number): Record<T, number> {
  const out = {} as Record<T, number>;
  for (const term of Object.keys(mfs) as T[]) out[term] = mfs[term](x);
  return out;
}

function ruleText(rule: Rule): string {
  const ant: string[] = [];
  if (rule.when.hours) ant.push(`hours = ${rule.when.hours}`);
  if (rule.when.exam) ant.push(`exam = ${rule.when.exam}`);
  if (rule.when.knowledge) ant.push(`knowledge = ${rule.when.knowledge}`);
  const cons: string[] = [];
  if (rule.then.intensity) cons.push(`intensity = ${rule.then.intensity}`);
  if (rule.then.cadence) cons.push(`cadence = ${rule.then.cadence}`);
  if (rule.then.session) cons.push(`session = ${rule.then.session}`);
  return `IF ${ant.join(" AND ")} THEN ${cons.join(", ")}`;
}

type Alphas<K extends string> = Record<K, number>;

function zeroAlphas<K extends string>(keys: readonly K[]): Alphas<K> {
  const out = {} as Alphas<K>;
  for (const k of keys) out[k] = 0;
  return out;
}

/** Max-aggregate clipped sets, then centroid defuzzification over 0..100. */
function defuzzify<K extends string>(
  sets: Record<K, MF>,
  alphas: Alphas<K>,
  fallbackLabel: string,
): OutputReading {
  const keys = Object.keys(sets) as K[];
  let num = 0;
  let den = 0;
  for (let x = 0; x <= 100 + 1e-9; x += 0.5) {
    let mu = 0;
    for (const term of keys) {
      const alpha = alphas[term];
      if (alpha <= 0) continue;
      const clipped = Math.min(alpha, sets[term](x));
      if (clipped > mu) mu = clipped;
    }
    num += x * mu;
    den += mu;
  }
  const value = den === 0 ? 50 : num / den;

  let label = fallbackLabel;
  let best = 0;
  for (const term of keys) {
    if (alphas[term] > best) {
      best = alphas[term];
      label = term;
    }
  }
  return {
    value: r1(value),
    label,
    mu: r3(best),
    terms: keys.map((term) => ({ term, mu: r3(alphas[term]) })),
  };
}

export function infer(input: FuzzyInputs): Inference {
  const hoursX = clamp(input.hoursPerWeek, 0, 60);
  const examX = clamp(input.daysUntilExam, 1, 365);
  const knowX = clamp(input.priorKnowledge, 0, 10);

  const hoursMu = degreesOf(HOURS_MFS, hoursX);
  const examMu = degreesOf(EXAM_MFS, examX);
  const knowMu = degreesOf(KNOWLEDGE_MFS, knowX);

  const intensityAlphas = zeroAlphas(Object.keys(INTENSITY_SETS) as IntensityTerm[]);
  const cadenceAlphas = zeroAlphas(Object.keys(CADENCE_SETS) as CadenceTerm[]);
  const sessionAlphas = zeroAlphas(Object.keys(SESSION_SETS) as SessionTerm[]);

  const fired: FiredRule[] = [];

  for (const rule of RULES) {
    const strengths: number[] = [];
    if (rule.when.hours) strengths.push(hoursMu[rule.when.hours]);
    if (rule.when.exam) strengths.push(examMu[rule.when.exam]);
    if (rule.when.knowledge) strengths.push(knowMu[rule.when.knowledge]);
    if (strengths.length === 0) continue;

    const strength = Math.min(...strengths);
    if (strength <= 0.001) continue;

    if (rule.then.intensity) {
      const t = rule.then.intensity;
      intensityAlphas[t] = Math.max(intensityAlphas[t], strength);
    }
    if (rule.then.cadence) {
      const t = rule.then.cadence;
      cadenceAlphas[t] = Math.max(cadenceAlphas[t], strength);
    }
    if (rule.then.session) {
      const t = rule.then.session;
      sessionAlphas[t] = Math.max(sessionAlphas[t], strength);
    }
    fired.push({ text: ruleText(rule), strength: r3(strength) });
  }

  fired.sort((a, b) => b.strength - a.strength);

  const intensity = defuzzify(INTENSITY_SETS, intensityAlphas, "steady");
  const cadence = defuzzify(CADENCE_SETS, cadenceAlphas, "weekly");
  const session = defuzzify(SESSION_SETS, sessionAlphas, "medium");

  const sessionMinutes = clamp(Math.round((20 + (session.value / 100) * 70) / 5) * 5, 20, 90);

  return {
    hours: readings(HOURS_MFS, hoursX),
    exam: readings(EXAM_MFS, examX),
    knowledge: readings(KNOWLEDGE_MFS, knowX),
    intensity,
    cadence,
    session,
    sessionMinutes,
    rules: fired,
  };
}
