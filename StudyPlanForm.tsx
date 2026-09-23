import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { DoubleRule, Eyebrow } from "@/components/vintage";
import { daysUntil, isoDateFromNow, weekCount } from "@/lib/compose";
import { Loader2 } from "lucide-react";

export interface Brief {
  subject: string;
  examDate: string;
  hoursPerWeek: number;
  priorKnowledge: number;
  notes: string;
}

export function initialBrief(): Brief {
  return {
    subject: "",
    examDate: isoDateFromNow(45),
    hoursPerWeek: 8,
    priorKnowledge: 4,
    notes: "",
  };
}

const KNOWLEDGE_LABELS = ["Brand new", "Sparse", "Shaky", "Some", "Patchy", "Workable", "Solid", "Good", "Strong", "Nearly there", "Confident"];

export function StudyPlanForm({
  brief,
  onBriefChange,
  onCompose,
  loading,
}: {
  brief: Brief;
  onBriefChange: (next: Brief) => void;
  onCompose: () => void;
  loading: boolean;
}) {
  const patch = (part: Partial<Brief>) => onBriefChange({ ...brief, ...part });

  const days = daysUntil(brief.examDate);
  const weeks = weekCount(days);

  return (
    <Card className="gap-0 rounded-lg border-border bg-card py-0 shadow-[4px_5px_0_rgba(61,47,31,0.07)]">
      <CardHeader className="px-6 pt-6 pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>Form A · The brief</Eyebrow>
          <span className="font-ledger text-[10px] text-muted-foreground">intake</span>
        </div>
        <CardTitle className="font-display mt-1.5 text-2xl font-semibold tracking-tight">
          State your case
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          The inference ledger beside this form updates as you fill it in.
        </p>
      </CardHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCompose();
        }}
      >
        <CardContent className="flex flex-col gap-5 px-6 pb-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="subject" className="eyebrow text-muted-foreground">
              Subject
            </Label>
            <Input
              id="subject"
              name="subject"
              value={brief.subject}
              onChange={(e) => patch({ subject: e.target.value })}
              placeholder="Organic Chemistry, Constitutional Law, React hooks…"
              maxLength={120}
              disabled={loading}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="examDate" className="eyebrow text-muted-foreground">
              Examination date
            </Label>
            <Input
              id="examDate"
              name="examDate"
              type="date"
              value={brief.examDate}
              min={isoDateFromNow(1)}
              onChange={(e) => patch({ examDate: e.target.value })}
              disabled={loading}
              required
            />
            <p className="font-ledger text-[11px] text-muted-foreground">
              {days} {days === 1 ? "day" : "days"} out · {weeks}{" "}
              {weeks === 1 ? "folio" : "folios"} of runway
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="hours" className="eyebrow text-muted-foreground">
                Hours per week
              </Label>
              <span className="font-ledger text-xs">{brief.hoursPerWeek} h</span>
            </div>
            <Slider
              id="hours"
              value={[brief.hoursPerWeek]}
              min={1}
              max={40}
              step={1}
              disabled={loading}
              onValueChange={([v]) => patch({ hoursPerWeek: v })}
            />
            <div className="font-ledger flex justify-between text-[10px] text-muted-foreground">
              <span>1 h</span>
              <span>40 h</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="knowledge" className="eyebrow text-muted-foreground">
                Prior knowledge
              </Label>
              <span className="font-ledger text-xs">
                {brief.priorKnowledge}/10 · {KNOWLEDGE_LABELS[brief.priorKnowledge]}
              </span>
            </div>
            <Slider
              id="knowledge"
              value={[brief.priorKnowledge]}
              min={0}
              max={10}
              step={1}
              disabled={loading}
              onValueChange={([v]) => patch({ priorKnowledge: v })}
            />
            <div className="font-ledger flex justify-between text-[10px] text-muted-foreground">
              <span>never seen it</span>
              <span>exam ready</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="eyebrow text-muted-foreground">
              Marginalia <span className="normal-case tracking-normal">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={brief.notes}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Weak topics, timetable constraints, the textbook you're using…"
              maxLength={600}
              rows={3}
              disabled={loading}
            />
          </div>

          <DoubleRule />

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Composing your folio…
              </>
            ) : (
              <>Compose my folio</>
            )}
          </Button>
          <p className="font-ledger -mt-2 text-center text-[11px] text-muted-foreground">
            fuzzy inference → {loading ? "language model writing weeks…" : "ready when you are"}
          </p>
        </CardContent>
      </form>
    </Card>
  );
}
