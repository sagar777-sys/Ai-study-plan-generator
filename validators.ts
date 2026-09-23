import { v } from "convex/values";

/**
 * Convex validators shared by the schema, the plan mutations and the generate
 * action. Living next to the TypeScript plan types keeps the two in step.
 */
export const sessionKindValidator = v.union(
  v.literal("study"),
  v.literal("practice"),
  v.literal("review"),
  v.literal("mock"),
);

export const composedByValidator = v.union(v.literal("llm"), v.literal("almanac"));

export const planInputsValidator = v.object({
  subject: v.string(),
  examDate: v.string(),
  hoursPerWeek: v.number(),
  priorKnowledge: v.number(),
  daysUntilExam: v.number(),
  notes: v.optional(v.string()),
});

export const fuzzySummaryValidator = v.object({
  intensity: v.number(),
  cadence: v.number(),
  session: v.number(),
  sessionMinutes: v.number(),
  labels: v.object({
    intensity: v.string(),
    cadence: v.string(),
    session: v.string(),
  }),
  trace: v.array(
    v.object({
      text: v.string(),
      strength: v.number(),
    }),
  ),
});

export const planSessionValidator = v.object({
  day: v.string(),
  task: v.string(),
  minutes: v.number(),
  kind: sessionKindValidator,
});

export const planWeekValidator = v.object({
  index: v.number(),
  title: v.string(),
  focus: v.string(),
  sessions: v.array(planSessionValidator),
  milestone: v.string(),
});
