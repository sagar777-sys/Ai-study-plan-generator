import { motion } from "framer-motion";
import type { PlanSession, PlanView, PlanWeek, SessionKind } from "@/lib/plan";
import { capital } from "@/components/vintage";
import { DoubleRule, Eyebrow, Stamp } from "@/components/vintage";
import { scheduledHours } from "@/lib/compose";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<SessionKind, string> = {
  study: "border-chart-1/50 text-chart-1",
  practice: "border-primary/50 text-primary",
  review: "border-chart-2/50 text-chart-2",
  mock: "border-foreground/40 text-foreground",
};

export function KindChip({ kind }: { kind: PlanSession["kind"] }) {
  return (
    <span
      className={cn(
        "eyebrow shrink-0 border px-1.5 py-[1px] opacity-85",
        KIND_STYLE[kind],
      )}
    >
      {kind}
    </span>
  );
}

export function prettyDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

const weekMinutes = (week: PlanWeek) =>
  Math.round(week.sessions.reduce((sum, s) => sum + s.minutes, 0) / 6) / 10;

/** One week as a filed folio card. Reused by the landing-page specimen. */
export function WeekCard({ week, delay = 0 }: { week: PlanWeek; delay?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay }}
      className="lift rounded border border-border bg-card p-5 shadow-[3px_4px_0_rgba(61,47,31,0.06)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow text-muted-foreground">
          Folio {String(week.index).padStart(2, "0")}
        </span>
        <span className="font-ledger text-[10px] text-muted-foreground">
          {week.sessions.length} sittings · {weekMinutes(week)} h
        </span>
      </div>
      <h3 className="font-display mt-1.5 text-xl leading-snug tracking-tight">{week.title}</h3>
      <p className="mt-1 text-[0.95rem] leading-snug text-muted-foreground italic">{week.focus}</p>

      <ul className="mt-3.5 border-t border-dashed border-border/80">
        {week.sessions.map((s, i) => (
          <li
            key={`${week.index}-${i}`}
            className="flex items-baseline gap-3 border-b border-dashed border-border/60 py-2 last:border-0"
          >
            <span className="font-ledger w-8 shrink-0 text-[11px] text-muted-foreground">
              {s.day}
            </span>
            <span className="min-w-0 flex-1 text-sm leading-snug">{s.task}</span>
            <KindChip kind={s.kind} />
            <span className="font-ledger shrink-0 text-[11px] text-muted-foreground">
              {s.minutes}′
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm leading-snug">
        <span className="eyebrow mr-1.5 text-primary">Checkpoint</span>
        {week.milestone}
      </p>
    </motion.article>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="font-display mt-1 text-lg leading-none">{value}</p>
      <p className="font-ledger mt-1 text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export function PlanFolio({ plan }: { plan: PlanView }) {
  const { inputs, fuzzy, weeks, composedBy } = plan;
  const hours = scheduledHours(weeks);

  return (
    <article>
      <header className="relative overflow-hidden rounded border border-border bg-card p-6 shadow-[5px_6px_0_rgba(61,47,31,0.08)]">
        <div
          aria-hidden="true"
          className="foxing pointer-events-none absolute -top-16 -right-16 size-64 opacity-70"
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Eyebrow>Folio · Personal study plan</Eyebrow>
            <h2 className="font-display mt-1.5 text-3xl leading-tight tracking-tight sm:text-4xl">
              {inputs.subject}
            </h2>
            <p className="font-ledger mt-2 text-xs text-muted-foreground">
              Exam {prettyDate(inputs.examDate)} · {inputs.daysUntilExam} days ·{" "}
              {weeks.length} {weeks.length === 1 ? "week" : "weeks"} · ≈{hours} h scheduled of{" "}
              {inputs.hoursPerWeek * weeks.length} h budget
            </p>
            {inputs.notes && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground italic">
                “{inputs.notes}”
              </p>
            )}
          </div>
          <Stamp className="shrink-0">
            {composedBy === "llm" ? "Language model" : "Almanac engine"}
          </Stamp>
        </div>

        <DoubleRule className="relative mt-5" />

        <div className="relative mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="Intensity"
            value={capital(fuzzy.labels.intensity)}
            sub={`${Math.round(fuzzy.intensity)}/100`}
          />
          <Stat
            label="Cadence"
            value={capital(fuzzy.labels.cadence)}
            sub={`${Math.round(fuzzy.cadence)}/100`}
          />
          <Stat
            label="Sitting"
            value={`${fuzzy.sessionMinutes} min`}
            sub={`${fuzzy.labels.session} session`}
          />
          <Stat
            label="Budget"
            value={`${inputs.hoursPerWeek} h/wk`}
            sub={`prior ${inputs.priorKnowledge}/10`}
          />
        </div>
      </header>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {weeks.map((week, i) => (
          <WeekCard key={week.index} week={week} delay={Math.min(i, 5) * 0.05} />
        ))}
      </div>
    </article>
  );
}
