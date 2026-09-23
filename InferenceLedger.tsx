import type { Brief } from "@/components/StudyPlanForm";
import { DoubleRule, Eyebrow, Gauge, capital } from "@/components/vintage";
import { sessionsPerWeek } from "@/lib/compose";
import type { Inference, TermReading } from "@/lib/fuzzy";
import { RULE_COUNT } from "@/lib/fuzzy";

function ChipRow({ label, readings }: { label: string; readings: TermReading[] }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-dashed border-border/70 py-2 last:border-0">
      <span className="eyebrow shrink-0 text-muted-foreground">{label}</span>
      <span className="flex flex-wrap justify-end gap-1.5">
        {readings.map((r) => (
          <span
            key={r.term}
            className={
              r.mu > 0.01
                ? "font-ledger border border-primary/50 bg-primary/10 px-1.5 py-[1px] text-[10px] text-primary"
                : "font-ledger border border-border/60 px-1.5 py-[1px] text-[10px] text-muted-foreground/60"
            }
          >
            {r.term} {r.mu.toFixed(2)}
          </span>
        ))}
      </span>
    </div>
  );
}

export function InferenceLedger({ inference, brief }: { inference: Inference; brief: Brief }) {
  const perWeek = sessionsPerWeek(brief.hoursPerWeek, inference);

  return (
    <section className="flex h-full flex-col rounded-lg border border-border bg-card p-6 shadow-[4px_5px_0_rgba(61,47,31,0.07)]">
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>Folio II · Inference ledger</Eyebrow>
        <span className="font-ledger text-[10px] text-muted-foreground">live</span>
      </div>
      <h2 className="font-display mt-1.5 text-2xl font-semibold tracking-tight">
        What the rules make of you
      </h2>
      <p className="font-ledger text-[11px] text-muted-foreground">
        mamdani · min-implication → max aggregation → centroid · {RULE_COUNT} rules
      </p>

      <DoubleRule className="mt-4" />

      {/* Fuzzification */}
      <div className="mt-3">
        <Eyebrow className="mb-1">I · Fuzzification</Eyebrow>
        <ChipRow label="hours" readings={inference.hours} />
        <ChipRow label="exam" readings={inference.exam} />
        <ChipRow label="knowledge" readings={inference.knowledge} />
      </div>

      {/* Outputs */}
      <div className="mt-5 flex flex-col gap-4">
        <Eyebrow>II · Defuzzified verdict</Eyebrow>
        <Gauge label="Intensity" reading={inference.intensity} />
        <Gauge label="Review cadence" reading={inference.cadence} />
        <Gauge label="Session length" reading={inference.session} />
      </div>

      <div className="mt-4 flex items-center justify-between border border-dashed border-border bg-secondary/40 px-3 py-2.5">
        <span className="eyebrow text-muted-foreground">Sitting</span>
        <span className="font-ledger text-sm">
          ≈ {inference.sessionMinutes} min × {perWeek} / week
        </span>
      </div>

      {/* Rule trace */}
      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between">
          <Eyebrow>III · Rule trace</Eyebrow>
          <span className="font-ledger text-[10px] text-muted-foreground">
            {inference.rules.length} fired
          </span>
        </div>
        <ol className="mt-2 max-h-56 min-h-24 flex-1 space-y-2 overflow-y-auto pr-1">
          {inference.rules.length === 0 && (
            <li className="font-ledger text-[11px] text-muted-foreground">
              no rule fired — nudge a slider
            </li>
          )}
          {inference.rules.map((r, i) => (
            <li key={`${i}-${r.text}`} className="border-l-2 border-primary/45 pl-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-ledger text-[11px] leading-snug break-words text-foreground/90">
                  {r.text}
                </span>
                <span className="font-ledger shrink-0 text-[10px] text-primary">
                  μ {r.strength.toFixed(2)}
                </span>
              </div>
            </li>
          ))}
        </ol>
        <p className="font-ledger mt-2 text-[10px] text-muted-foreground">
          verdict: {capital(inference.intensity.label)} intensity ·{" "}
          {capital(inference.cadence.label)} review · {capital(inference.session.label)} sittings
        </p>
      </div>
    </section>
  );
}
