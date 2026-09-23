"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { infer } from "../lib/fuzzy";
import { buildAlmanacPlan, daysUntil, weekCount } from "../lib/compose";
import type { PlanInputs, PlanSession, PlanWeek, SessionKind } from "../lib/plan";
import { SESSION_KINDS } from "../lib/plan";
import { summarize } from "../lib/plan";
import { vly } from "../lib/vly-integrations";

const MAX_WEEKS = 16;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/* ------------------------------------------------------------------ */
/* Language-model composition                                          */
/* ------------------------------------------------------------------ */

function extractJson(raw: string): unknown {
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) throw new Error("No JSON object found.");
  return JSON.parse(text.slice(first, last + 1));
}

function asString(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asKind(value: unknown): SessionKind {
  return SESSION_KINDS.includes(value as SessionKind) ? (value as SessionKind) : "study";
}

/** Defensive structural pass over whatever the model produced. */
function sanitiseWeeks(raw: unknown, expectedWeeks: number, minutes: number): PlanWeek[] | null {
  if (!Array.isArray(raw) || raw.length !== expectedWeeks || raw.length === 0) return null;
  if (raw.length > MAX_WEEKS) return null;

  const weeks: PlanWeek[] = [];
  const rows: unknown[] = raw;
  for (let i = 0; i < rows.length; i++) {
    const w = rows[i];
    if (w === null || typeof w !== "object") return null;
    const row = w as Record<string, unknown>;
    if (!Array.isArray(row.sessions) || row.sessions.length === 0 || row.sessions.length > 7) {
      return null;
    }

    const sessions: PlanSession[] = [];
    for (const s of row.sessions) {
      if (s === null || typeof s !== "object") return null;
      const sess = s as Record<string, unknown>;
      const task = asString(sess.task, "", 240);
      if (!task) return null;
      sessions.push({
        day: asString(sess.day, "Mon", 16),
        task,
        minutes: Math.round(clamp(asNumber(sess.minutes, minutes), 10, 180)),
        kind: asKind(sess.kind),
      });
    }

    weeks.push({
      index: i + 1,
      title: asString(row.title, `Week ${i + 1}`, 90),
      focus: asString(row.focus, "", 280),
      sessions,
      milestone: asString(row.milestone, "", 280),
    });
  }
  return weeks;
}

interface LlmArgs {
  inputs: PlanInputs;
  intensity: string;
  cadenceLabel: string;
  sessionLabel: string;
  sessionMinutes: number;
  weeks: number;
  perWeek: number;
}

async function composeWithLlm(args: LlmArgs): Promise<PlanWeek[] | null> {
  const { inputs } = args;

  const system = [
    "You are The Study Almanac, an exacting study planner.",
    "You write week-by-week study plans as JSON and nothing else — no prose, no markdown fences.",
    "Vary the wording so no two weeks read alike; be concrete about what the learner actually does.",
    "Every week needs a title, a one-sentence focus, sessions, and a single checkpoint milestone.",
    'Session kinds must be one of: "study", "practice", "review", "mock".',
    "Use weekday labels like Mon, Tue, Wed, Thu, Fri, Sat, Sun.",
  ].join(" ");

  const user = [
    `Compose exactly ${args.weeks} weekly folios for this brief:`,
    `Subject: ${inputs.subject}`,
    `Exam in ${inputs.daysUntilExam} days (${inputs.examDate}); budget ${inputs.hoursPerWeek} hours per week.`,
    `Prior knowledge ${inputs.priorKnowledge}/10.`,
    inputs.notes ? `Learner notes: ${inputs.notes}` : "",
    `Fuzzy verdict from the rule base: intensity ${args.intensity}, review cadence ${args.cadenceLabel}, sitting length ${args.sessionLabel} (~${args.sessionMinutes} minutes).`,
    `Each week must contain exactly ${args.perWeek} sessions of about ${args.sessionMinutes} minutes; the final week must end with a full rehearsal.`,
    'Respond with JSON of the shape {"weeks": [{"index": 1, "title": "...", "focus": "...", "sessions": [{"day": "Mon", "task": "...", "minutes": 45, "kind": "study"}], "milestone": "..."}]}.',
  ]
    .filter(Boolean)
    .join("\n");

  const content = await requestCompletion(system, user);
  if (!content) return null;
  try {
    const parsed = extractJson(content) as { weeks?: unknown };
    return sanitiseWeeks(parsed.weeks, args.weeks, args.sessionMinutes);
  } catch {
    return null;
  }
}

/**
 * Ask for one chat completion. The platform AI integration (key injected at
 * project creation) is tried first so LLM composition works with no setup;
 * a directly configured OpenAI-compatible endpoint is the second chance.
 * Returns null when neither yields content — the caller falls back.
 */
async function requestCompletion(system: string, user: string): Promise<string | null> {
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const messages = [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];

  if (process.env.VLY_INTEGRATION_KEY) {
    try {
      const res = await vly.ai.completion(
        { model, messages, temperature: 0.7, maxTokens: 4096 },
        { timeout: 25_000, retries: 1 },
      );
      const content = res.data?.choices?.[0]?.message?.content;
      if (content) return content;
    } catch {
      /* fall through to the direct endpoint */
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, temperature: 0.7, messages }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Action                                                              */
/* ------------------------------------------------------------------ */

/**
 * Compose a personalised study plan: fuzzy inference decides intensity,
 * cadence and sitting length; a language model writes the weeks when a key is
 * configured, otherwise the deterministic Almanac engine does. Never fails
 * open — a missing or misbehaving model simply falls back.
 */
export const compose = action({
  args: {
    subject: v.string(),
    examDate: v.string(),
    hoursPerWeek: v.number(),
    priorKnowledge: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<import("../lib/plan").PlanView> => {
    const subject = args.subject.trim().slice(0, 120);
    if (!subject) throw new Error("Give your subject a name.");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(args.examDate)) {
      throw new Error("Exam date must be a valid date.");
    }
    const days = daysUntil(args.examDate);
    if (days < 1) throw new Error("The exam date is in the past.");

    const inputs: PlanInputs = {
      subject,
      examDate: args.examDate,
      hoursPerWeek: clamp(Math.round(args.hoursPerWeek), 1, 60),
      priorKnowledge: clamp(Math.round(args.priorKnowledge * 10) / 10, 0, 10),
      daysUntilExam: days,
      ...(args.notes && args.notes.trim() ? { notes: args.notes.trim().slice(0, 600) } : {}),
    };

    const inference = infer({
      hoursPerWeek: inputs.hoursPerWeek,
      daysUntilExam: inputs.daysUntilExam,
      priorKnowledge: inputs.priorKnowledge,
    });

    const expectedWeeks = weekCount(inputs.daysUntilExam);
    const perWeek = Math.max(
      1,
      Math.min(
        7,
        Math.floor(inputs.hoursPerWeek / (inference.sessionMinutes / 60)),
      ),
    );

    const llmWeeks = await composeWithLlm({
      inputs,
      intensity: inference.intensity.label,
      cadenceLabel: inference.cadence.label,
      sessionLabel: inference.session.label,
      sessionMinutes: inference.sessionMinutes,
      weeks: expectedWeeks,
      perWeek,
    });

    const composedBy = llmWeeks ? "llm" : "almanac";
    const weeks = llmWeeks ?? buildAlmanacPlan(inputs, inference);

    return {
      inputs,
      fuzzy: summarize(inference),
      weeks,
      composedBy,
    };
  },
});
