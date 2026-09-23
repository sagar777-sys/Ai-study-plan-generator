import { motion } from "framer-motion";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { WeekCard, prettyDate } from "@/components/PlanFolio";
import {
  DoubleRule,
  Eyebrow,
  LeaderRow,
  Mark,
  SectionHeading,
  Stamp,
  Gauge,
  capital,
} from "@/components/vintage";
import { buildAlmanacPlan, isoDateFromNow } from "@/lib/compose";
import { RULE_COUNT, infer } from "@/lib/fuzzy";
import { ArrowRight } from "lucide-react";

/* A real inference over a real brief — the specimen card below is not a mock-up. */
const SAMPLE_SUBJECT = "Organic Chemistry";
const sampleInputs = {
  subject: SAMPLE_SUBJECT,
  examDate: isoDateFromNow(35),
  hoursPerWeek: 7,
  priorKnowledge: 4,
  daysUntilExam: 35,
};
const sampleInference = infer({
  hoursPerWeek: sampleInputs.hoursPerWeek,
  daysUntilExam: sampleInputs.daysUntilExam,
  priorKnowledge: sampleInputs.priorKnowledge,
});
const sampleWeeks = buildAlmanacPlan(sampleInputs, sampleInference);

const rise = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.5 },
};

const STEPS = [
  {
    n: "I",
    title: "Fuzzify the brief",
    body: "Hours per week, days to the exam and prior knowledge are graded across overlapping terms — scarce/moderate/ample, urgent/near/distant, weak/working/strong. Nothing is reduced to a hard yes or no.",
  },
  {
    n: "II",
    title: "Fire the rule base",
    body: `${RULE_COUNT} hand-written linguistic rules combine the grades with min-implication; overlapping conclusions aggregate with max. Every rule that fires is shown, with its membership strength.`,
  },
  {
    n: "III",
    title: "Defuzzify & compose",
    body: "A centroid over each 0–100 universe yields crisp intensity, review cadence and sitting length. A language model receives that verdict and writes the weeks — session by session.",
  },
];

const CONTENTS = [
  { label: "Live inference preview, updated as you type", folio: "01" },
  { label: `A ${RULE_COUNT}-rule Mamdani engine, trace included`, folio: "02" },
  { label: "Language-model composition with a guaranteed engine fallback", folio: "03" },
  { label: "Weekly folios: sessions, minutes, checkpoints", folio: "04" },
  { label: "Every plan filed under your own account", folio: "05" },
  { label: "Email sign-in and nothing else", folio: "06" },
];

export default function Landing() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col"
    >
      {/* Masthead */}
      <header className="no-print sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <Mark className="size-7 text-primary" />
            <span className="font-display text-lg tracking-tight">The Study Almanac</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#method"
              className="eyebrow text-muted-foreground transition-colors hover:text-foreground"
            >
              The method
            </a>
            <a
              href="#contents"
              className="eyebrow text-muted-foreground transition-colors hover:text-foreground"
            >
              Contents
            </a>
            <a
              href="#specimen"
              className="eyebrow text-muted-foreground transition-colors hover:text-foreground"
            >
              Specimen
            </a>
          </nav>
          <Button asChild size="sm">
            <Link to="/auth?returnTo=%2Fdashboard">
              Open your ledger
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="foxing pointer-events-none absolute -top-28 -right-24 size-[440px]"
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-5 pt-14 pb-16 lg:grid-cols-[1.08fr,0.92fr] lg:pt-20">
          <div>
            <Eyebrow>No. 001 · Composed by machine intelligence</Eyebrow>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display mt-4 text-[clamp(2.5rem,6vw,4.25rem)] leading-[1.05] tracking-tight"
            >
              A study plan reasoned by <em className="text-primary italic">fuzzy logic</em>,
              written by a language model.
            </motion.h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Tell Almanac your subject, your date and the hours you can spare. Thirteen
              linguistic rules fuzzify the brief, weigh it and defuzzify a verdict — then the
              weeks are written session by session and filed under your name.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth?returnTo=%2Fdashboard">
                  Begin your ledger
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#method">Read the method</a>
              </Button>
            </div>
            <dl className="mt-9 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-5">
              <div>
                <dt className="eyebrow text-muted-foreground">Rules</dt>
                <dd className="font-ledger mt-1 text-2xl">{RULE_COUNT}</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">Inputs</dt>
                <dd className="font-ledger mt-1 text-2xl">3</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">Outputs</dt>
                <dd className="font-ledger mt-1 text-2xl">3</dd>
              </div>
            </dl>
          </div>

          {/* Live specimen of the inference engine */}
          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="h-fit rounded border border-border bg-card p-5 shadow-[6px_8px_0_rgba(61,47,31,0.08)]"
          >
            <div className="flex items-baseline justify-between gap-3">
              <Eyebrow>Specimen · live inference</Eyebrow>
              <span className="font-ledger text-[10px] text-muted-foreground">
                {sampleInputs.hoursPerWeek} h/wk · {sampleInputs.daysUntilExam} d · prior{" "}
                {sampleInputs.priorKnowledge}/10
              </span>
            </div>
            <DoubleRule className="mt-3" />
            <div className="mt-4 flex flex-col gap-4">
              <Gauge label="Intensity" reading={sampleInference.intensity} />
              <Gauge label="Review cadence" reading={sampleInference.cadence} />
              <Gauge label="Session length" reading={sampleInference.session} />
            </div>
            <div className="mt-5 border-t border-dashed border-border pt-3">
              <div className="flex items-baseline justify-between">
                <Eyebrow>Strongest rules</Eyebrow>
                <span className="font-ledger text-[10px] text-muted-foreground">
                  {sampleInference.rules.length} fired
                </span>
              </div>
              <ol className="mt-2 space-y-1.5">
                {sampleInference.rules.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="font-ledger text-[11px] leading-snug text-foreground/90">
                      {r.text}
                    </span>
                    <span className="font-ledger shrink-0 text-[10px] text-primary">
                      μ {r.strength.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="font-ledger mt-4 text-[10px] leading-relaxed text-muted-foreground">
              verdict: {capital(sampleInference.intensity.label)} intensity ·{" "}
              {capital(sampleInference.cadence.label)} review ·{" "}
              {sampleInference.sessionMinutes} min sittings — recomputed live in the app as you
              move the sliders.
            </p>
          </motion.aside>
        </div>
      </section>

      {/* The method */}
      <motion.section
        id="method"
        {...rise}
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-16"
      >
        <SectionHeading eyebrow="Chapter I · The method" title="How the inference works" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="border-t-2 border-foreground/80 pt-4">
              <div className="flex items-baseline gap-3">
                <span className="font-ledger text-sm text-primary">{s.n}</span>
                <h3 className="font-display text-xl tracking-tight">{s.title}</h3>
              </div>
              <p className="mt-2 text-[0.97rem] leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 overflow-x-auto rounded border border-border bg-card/80 p-4">
          <p className="font-ledger mb-2 text-[11px] text-muted-foreground">
            // rule base, as fired by the specimen brief
          </p>
          <div className="font-ledger space-y-1 text-[12px] leading-relaxed">
            {sampleInference.rules.slice(0, 4).map((r, i) => (
              <p key={i}>
                <span className="text-muted-foreground">rule[{i}]</span> {r.text}{" "}
                <span className="text-primary">μ={r.strength.toFixed(2)}</span>
              </p>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Contents */}
      <motion.section
        id="contents"
        {...rise}
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-5 pb-16"
      >
        <SectionHeading eyebrow="Chapter II · Contents" title="What the folio contains" />
        <div className="mt-6 grid gap-x-12 gap-y-3.5 md:grid-cols-2">
          {CONTENTS.map((row) => (
            <LeaderRow key={row.folio} label={row.label} folio={row.folio} />
          ))}
        </div>
      </motion.section>

      {/* Specimen week */}
      <motion.section
        id="specimen"
        {...rise}
        className="scroll-mt-20 border-y border-border bg-secondary/30"
      >
        <div className="mx-auto max-w-6xl px-5 py-16">
          <SectionHeading eyebrow="Chapter III · Specimen" title="A week as it is filed" />
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[0.85fr,1.15fr]">
            <div>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Every folio carries a number, a focus, the sittings themselves with minutes and
                kind, and one checkpoint to clear before the week is done. The specimen at the
                right was generated by the app&apos;s own engine from a seven-hour week and a
                date {sampleInputs.daysUntilExam} days out.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Stamp>{prettyDate(sampleInputs.examDate)}</Stamp>
                <span className="font-ledger text-[11px] text-muted-foreground">
                  ≈ {sampleInference.sessionMinutes} min per sitting
                </span>
              </div>
              <div className="mt-6">
                <Button asChild variant="outline">
                  <Link to="/auth?returnTo=%2Fdashboard">
                    Compose one for yourself
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
            <WeekCard week={sampleWeeks[0]} />
          </div>
        </div>
      </motion.section>

      {/* Call to action */}
      <motion.section {...rise} className="mx-auto w-full max-w-6xl px-5 py-16 text-center">
        <Eyebrow>Enquiries & enrolment</Eyebrow>
        <h2 className="font-display mt-3 text-[clamp(1.9rem,4vw,3rem)] leading-tight tracking-tight">
          Open your ledger.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Sign in with your email, fill the brief, and keep every folio you compose in your own
          archive.
        </p>
        <div className="mt-7 flex justify-center">
          <Button asChild size="lg">
            <Link to="/auth?returnTo=%2Fdashboard">
              Begin — it takes a minute
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </motion.section>

      {/* Colophon */}
      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Mark className="size-6 text-primary" />
            <span className="font-display tracking-tight">The Study Almanac</span>
          </div>
          <p className="font-ledger text-[11px] text-muted-foreground">
            Set in Playfair Display &amp; EB Garamond · {RULE_COUNT}-rule Mamdani engine · MMXXVI
          </p>
          <Link
            to="/auth?returnTo=%2Fdashboard"
            className="eyebrow text-primary transition-colors hover:underline"
          >
            Sign in →
          </Link>
        </div>
      </footer>
    </motion.div>
  );
}
