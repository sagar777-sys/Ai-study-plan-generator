import type { Inference } from "./fuzzy";

export type SessionKind = "study" | "practice" | "review" | "mock";

export const SESSION_KINDS: SessionKind[] = ["study", "practice", "review", "mock"];

export interface PlanSession {
  /** Weekday label, e.g. "Mon". */
  day: string;
  task: string;
  minutes: number;
  kind: SessionKind;
}

export interface PlanWeek {
  index: number;
  title: string;
  focus: string;
  sessions: PlanSession[];
  milestone: string;
}

export interface TraceLine {
  text: string;
  strength: number;
}

export interface FuzzyLabels {
  intensity: string;
  cadence: string;
  session: string;
}

/** The fuzzy verdict attached to every filed plan. */
export interface FuzzySummary {
  intensity: number;
  cadence: number;
  session: number;
  sessionMinutes: number;
  labels: FuzzyLabels;
  trace: TraceLine[];
}

export interface PlanInputs {
  subject: string;
  /** ISO date, yyyy-mm-dd. */
  examDate: string;
  hoursPerWeek: number;
  priorKnowledge: number;
  daysUntilExam: number;
  notes?: string;
}

export type ComposedBy = "llm" | "almanac";

/** Everything the folio display needs — matches the stored `plans` document. */
export interface PlanView {
  inputs: PlanInputs;
  fuzzy: FuzzySummary;
  weeks: PlanWeek[];
  composedBy: ComposedBy;
}

const cap = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/** Fold a live inference into the serialisable summary that gets filed. */
export function summarize(inf: Inference): FuzzySummary {
  return {
    intensity: inf.intensity.value,
    cadence: inf.cadence.value,
    session: inf.session.value,
    sessionMinutes: inf.sessionMinutes,
    labels: {
      intensity: inf.intensity.label,
      cadence: inf.cadence.label,
      session: inf.session.label,
    },
    trace: inf.rules.map((r) => ({ text: cap(r.text, 220), strength: r.strength })),
  };
}
