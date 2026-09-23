import type { Inference } from "./fuzzy";
import type { PlanInputs, PlanSession, PlanWeek, SessionKind } from "./plan";

export const MS_PER_DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-time ISO date (yyyy-mm-dd) for `days` from today. */
export function isoDateFromNow(days: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days from today until the exam date (minimum 1). */
export function daysUntil(examDate: string, now = new Date()): number {
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(examDate);
  if (!parsed) return 30;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(Number(parsed[1]), Number(parsed[2]) - 1, Number(parsed[3]));
  if (Number.isNaN(target.getTime())) return 30;
  return Math.max(1, Math.round((target.getTime() - today.getTime()) / MS_PER_DAY));
}

/** Plan length in weeks, capped at sixteen folios. */
export function weekCount(days: number): number {
  return Math.min(16, Math.max(1, Math.ceil(days / 7)));
}

/**
 * Sessions per week: the fuzzy cadence sets the ambition, the hours actually
 * available set the ceiling.
 */
export function sessionsPerWeek(hoursPerWeek: number, inf: Inference): number {
  const perSessionHours = inf.sessionMinutes / 60;
  const capacity = Math.max(1, Math.min(7, Math.floor(hoursPerWeek / perSessionHours)));
  const cadenceCap =
    inf.cadence.label === "dense" ? 7 : inf.cadence.label === "weekly" ? 6 : 4;
  return Math.max(1, Math.min(capacity, cadenceCap));
}

const DAY_PATTERNS: Record<number, string[]> = {
  1: ["Sat"],
  2: ["Tue", "Sat"],
  3: ["Mon", "Wed", "Sat"],
  4: ["Mon", "Tue", "Thu", "Sat"],
  5: ["Mon", "Tue", "Thu", "Fri", "Sat"],
  6: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  7: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
};

type Phase = "foundation" | "build" | "taper";

function phaseOf(week: number, total: number): Phase {
  if (total === 1) return "build";
  const taperStart = total <= 3 ? total : total - Math.ceil(total * 0.2) + 1;
  if (week >= taperStart) return "taper";
  if (week <= Math.max(1, Math.floor(total * 0.3))) return "foundation";
  return "build";
}

const TITLES: Record<Phase, string[]> = {
  foundation: ["Ground the fundamentals", "Survey the territory", "Build the spine"],
  build: ["Drill the hard parts", "Turn knowledge into marks", "Raise the ceiling"],
  taper: ["Rehearse and sharpen", "Thin the notes, keep the marks", "Taper to race pace"],
};

const FOCUS: Record<Phase, ((s: string) => string)[]> = {
  foundation: [
    (s) => `Sketch a one-page map of ${s}, then fill its holes.`,
    (s) => `Read the core material in ${s} and log every unfamiliar term.`,
    (s) => `Get the basic vocabulary of ${s} into closed-book recall.`,
  ],
  build: [
    (s) => `Spend the week converting ${s} notes into answers under time.`,
    (s) => `Attack the subtopics of ${s} that currently cost you marks.`,
    (s) => `Practice first, reading second — ${s} is now a performance.`,
  ],
  taper: [
    (s) => `Rehearse ${s} in exam conditions; edit the notes down, not out.`,
    () => `Weak spots and past papers only — the learning is done, now bank it.`,
    () => `Hold the line: light recall, one rehearsal, early nights.`,
  ],
};

interface TaskDef {
  task: (s: string) => string;
  kind: SessionKind;
}

const TASKS: Record<Phase, TaskDef[]> = {
  foundation: [
    { task: (s) => `Read the opening section of ${s} and mark anything unfamiliar`, kind: "study" },
    { task: (s) => `Build a one-page outline of the fundamentals of ${s}`, kind: "study" },
    { task: (s) => `Definitions drill — write ${s} core terms from memory, then check`, kind: "review" },
    { task: (s) => `Attend one lesson on ${s}; collect every word you cannot define yet`, kind: "study" },
    { task: (s) => `Rebuild yesterday's ${s} notes from a blank page`, kind: "review" },
  ],
  build: [
    { task: (s) => `Timed practice set — 15 questions across ${s}`, kind: "practice" },
    { task: (s) => `Work your weakest ${s} subtopic until three examples go right`, kind: "practice" },
    { task: (s) => `Teach one ${s} concept aloud in five minutes; close the gaps you find`, kind: "study" },
    { task: () => `Past-paper section under exam conditions, then mark it yourself`, kind: "practice" },
    { task: (s) => `Spaced recall — last week's ${s}, closed-book`, kind: "review" },
  ],
  taper: [
    { task: (s) => `Full mixed rehearsal in ${s} — timed, exam conditions`, kind: "mock" },
    { task: (s) => `Error log pass — fix the five ${s} mistakes that keep repeating`, kind: "review" },
    { task: (s) => `Rapid recall sweep of ${s}: every headline idea in twenty minutes`, kind: "review" },
    { task: (s) => `Light pass over ${s} notes; retire anything you already know cold`, kind: "review" },
    { task: (s) => `One last timed set in ${s}, then stop for the day`, kind: "practice" },
  ],
};

const MILESTONES: Record<Phase, ((s: string) => string)[]> = {
  foundation: [
    (s) => `Summarise the fundamentals of ${s} in ten minutes, closed-book.`,
    () => `Twenty key terms recalled without notes.`,
  ],
  build: [
    (s) => `70% or better on a mixed ${s} set, timed.`,
    () => `The same mistake appears in your error log no more than twice.`,
  ],
  taper: [
    () => `One full rehearsal completed with time in hand.`,
    (s) => `${s} notes thinned to a single sheet per topic.`,
  ],
};

const OPENING_TASK = (s: string) => `Set up the error log and recall deck for ${s}`;

/**
 * The Almanac engine: a complete, deterministic plan built from the brief and
 * the fuzzy verdict. Used as the guaranteed fallback whenever no language-model
 * key is configured or the model's answer does not parse.
 */
export function buildAlmanacPlan(inputs: PlanInputs, inf: Inference): PlanWeek[] {
  const subject = inputs.subject.trim() || "your subject";
  const total = weekCount(inputs.daysUntilExam);
  const perWeek = sessionsPerWeek(inputs.hoursPerWeek, inf);
  const minutes = inf.sessionMinutes;
  const days = DAY_PATTERNS[perWeek] ?? DAY_PATTERNS[4];

  const weeks: PlanWeek[] = [];
  for (let w = 1; w <= total; w++) {
    const phase = phaseOf(w, total);
    const titlePool = TITLES[phase];
    const focusPool = FOCUS[phase];
    const milestonePool = MILESTONES[phase];
    const sessions: PlanSession[] = [];

    for (let s = 0; s < perWeek; s++) {
      if (w > 1 && s === 0) {
        sessions.push({
          day: days[s],
          task: `Spaced recall — last week's ${subject}, closed-book`,
          minutes,
          kind: "review",
        });
        continue;
      }
      if (w === 1 && s === 0) {
        sessions.push({ day: days[s], task: OPENING_TASK(subject), minutes, kind: "review" });
        continue;
      }
      const pool = TASKS[phase];
      const def = pool[(w * 3 + s) % pool.length];
      sessions.push({ day: days[s], task: def.task(subject), minutes, kind: def.kind });
    }

    /* The final sitting of the plan is always a full rehearsal. */
    if (w === total && phase === "taper" && sessions.length > 0) {
      const last = sessions[sessions.length - 1];
      last.task = `Full rehearsal — ${subject}, timed end to end`;
      last.kind = "mock";
    }

    weeks.push({
      index: w,
      title: titlePool[w % titlePool.length],
      focus: focusPool[w % focusPool.length](subject),
      sessions,
      milestone: milestonePool[w % milestonePool.length](subject),
    });
  }
  return weeks;
}

/** Scheduled study hours in a finished plan — shown honestly in the folio. */
export function scheduledHours(weeks: PlanWeek[]): number {
  let minutes = 0;
  for (const w of weeks) for (const s of w.sessions) minutes += s.minutes;
  return Math.round((minutes / 60) * 10) / 10;
}
