import { useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { InferenceLedger } from "@/components/InferenceLedger";
import { PlanFolio, prettyDate } from "@/components/PlanFolio";
import { StudyPlanForm, initialBrief, type Brief } from "@/components/StudyPlanForm";
import { DoubleRule, Eyebrow, Mark, Stamp } from "@/components/vintage";
import { daysUntil } from "@/lib/compose";
import { infer } from "@/lib/fuzzy";
import type { PlanView } from "@/lib/plan";
import { useAuth } from "@/hooks/use-auth";
import { FileText, Home, LogOut, X } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const compose = useAction(api.generatePlan.compose);
  const savePlan = useMutation(api.plans.savePlan);
  const removePlan = useMutation(api.plans.remove);
  const plans = useQuery(api.plans.listMine);

  const [brief, setBrief] = useState<Brief>(initialBrief);
  const [plan, setPlan] = useState<PlanView | null>(null);
  const [loading, setLoading] = useState(false);
  const folioRef = useRef<HTMLDivElement | null>(null);

  /* Live fuzzy preview — recomputes on every input change. */
  const inference = useMemo(
    () =>
      infer({
        hoursPerWeek: brief.hoursPerWeek,
        daysUntilExam: daysUntil(brief.examDate),
        priorKnowledge: brief.priorKnowledge,
      }),
    [brief.examDate, brief.hoursPerWeek, brief.priorKnowledge],
  );

  const scrollToFolio = () =>
    requestAnimationFrame(() =>
      folioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );

  async function handleCompose() {
    if (loading) return;
    if (!brief.subject.trim()) {
      toast.error("Name the subject you are studying first.");
      return;
    }
    setLoading(true);
    try {
      const result = await compose({
        subject: brief.subject,
        examDate: brief.examDate,
        hoursPerWeek: brief.hoursPerWeek,
        priorKnowledge: brief.priorKnowledge,
        notes: brief.notes.trim() || undefined,
      });
      setPlan(result);
      scrollToFolio();
      try {
        await savePlan(result);
        toast.success("Folio composed and filed.");
      } catch (err) {
        console.error(err);
        toast("Composed — but filing failed.", {
          description: "Your plan is shown below; try opening the archive again later.",
        });
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Composition failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function openFiled(p: Doc<"plans">) {
    setPlan({
      inputs: p.inputs,
      fuzzy: p.fuzzy,
      weeks: p.weeks,
      composedBy: p.composedBy,
    });
    scrollToFolio();
  }

  function confirmRemove(id: Id<"plans">) {
    toast("Withdraw this folio from the archive?", {
      action: {
        label: "Withdraw",
        onClick: async () => {
          try {
            await removePlan({ id });
            toast.success("Folio withdrawn.");
          } catch (err) {
            console.error(err);
            toast.error("Could not withdraw that folio.");
          }
        },
      },
      cancel: "Keep",
    });
  }

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Masthead */}
        <header className="no-print flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <Mark className="size-9 text-primary" />
            <div>
              <p className="font-display text-lg leading-none tracking-tight">
                The Study Almanac
              </p>
              <Eyebrow className="mt-1.5">
                Reading room · {user?.email ?? "signed in"}
              </Eyebrow>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")}>
              <Home />
              Home
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </header>

        {/* Intake + live inference */}
        <div className="no-print mt-6 grid gap-5 lg:grid-cols-2">
          <StudyPlanForm
            brief={brief}
            onBriefChange={setBrief}
            onCompose={handleCompose}
            loading={loading}
          />
          <InferenceLedger inference={inference} brief={brief} />
        </div>

        {/* Composed folio */}
        <div ref={folioRef} className="mt-9 scroll-mt-4">
          {plan ? (
            <div>
            <div className="no-print mb-3 flex items-baseline justify-between">
                <Eyebrow>Folio · freshly pressed</Eyebrow>
                <span className="font-ledger text-[11px] text-muted-foreground">
                  {new Date().toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <PlanFolio plan={plan} />
            </div>
          ) : (
            <div className="no-print rounded border border-dashed border-border px-6 py-12 text-center">
              <p className="font-display text-2xl">The folio press is idle</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Fill the brief above and compose — your plan will be pressed here and filed
                under your account for safekeeping.
              </p>
            </div>
          )}
        </div>

        {/* The archive */}
        <section className="no-print mt-12 pb-14">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl tracking-tight">The archive</h2>
            <span className="font-ledger text-xs text-muted-foreground">
              {plans === undefined
                ? "consulting the stacks…"
                : `${plans.length} ${plans.length === 1 ? "folio" : "folios"} on file`}
            </span>
          </div>
          <DoubleRule className="mt-3" />

          {plans !== undefined && plans.length === 0 && (
            <div className="mt-4 flex items-center gap-3 border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
              <FileText className="size-4 shrink-0" />
              Nothing filed yet — compose your first plan above and it will appear here.
            </div>
          )}

          {plans !== undefined && plans.length > 0 && (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((p) => (
                <li
                  key={p._id}
                  className="lift flex flex-col rounded border border-border bg-card p-4 shadow-[3px_4px_0_rgba(61,47,31,0.06)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display truncate text-lg leading-tight">
                        {p.inputs.subject}
                      </p>
                      <p className="font-ledger mt-1 text-[11px] text-muted-foreground">
                        {prettyDate(p.inputs.examDate)} · {p.weeks.length} wks ·{" "}
                        {p.inputs.hoursPerWeek} h/wk
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Withdraw ${p.inputs.subject}`}
                      onClick={() => confirmRemove(p._id)}
                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-dashed border-border/70 pt-3">
                    <Stamp className="text-[0.6rem]">
                      {p.composedBy === "llm" ? "LLM" : "Engine"}
                    </Stamp>
                    <Button variant="ghost" size="sm" onClick={() => openFiled(p)}>
                      Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
