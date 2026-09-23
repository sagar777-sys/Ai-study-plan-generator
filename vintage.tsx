import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { OutputReading } from "@/lib/fuzzy";
import { cn } from "@/lib/utils";

export function capital(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Small-caps archival label. Pair only with colours, never with size
 *  utilities — the class fixes its own size so the mono letterspacing stays
 *  consistent everywhere. */
export function Eyebrow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn("eyebrow text-muted-foreground", className)}>{children}</p>;
}

/** Double hairline rule, as on a printed title page. */
export function DoubleRule({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("rule-double", className)} />;
}

/** Table-of-contents row with dotted leaders. */
export function LeaderRow({
  label,
  folio,
  className,
}: {
  label: ReactNode;
  folio: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-3", className)}>
      <span className="text-[0.95rem] leading-snug">{label}</span>
      <span aria-hidden="true" className="leader" />
      <span className="font-ledger shrink-0 text-xs text-muted-foreground">{folio}</span>
    </div>
  );
}

/** Rotated archival stamp badge. */
export function Stamp({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("stamp", className)}>{children}</span>;
}

/** Almanac monogram — a ruled “A” in a double-margined plate. */
export function Mark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="43" height="43" rx="3" stroke="currentColor" strokeWidth="2.5" />
      <rect
        x="7"
        y="7"
        width="34"
        height="34"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.65"
      />
      <path
        d="M24 14 L33 35 M24 14 L15 35 M18.6 29.5 H29.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="13.4" r="2.4" fill="currentColor" />
    </svg>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="font-display mt-2 text-3xl leading-tight tracking-tight sm:text-4xl">
        {title}
      </h2>
      <DoubleRule className="mt-4" />
    </div>
  );
}

/** Ledger-style meter for one fuzzy output. */
export function Gauge({ label, reading }: { label: string; reading: OutputReading }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="eyebrow text-muted-foreground">{label}</span>
        <span className="font-ledger text-[11px]">
          <span className="text-foreground">{capital(reading.label)}</span>
          <span className="text-muted-foreground"> · μ {reading.mu.toFixed(2)}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full border border-border bg-muted">
        <motion.div
          className="h-full bg-primary/75"
          initial={{ width: 0 }}
          animate={{ width: `${reading.value}%` }}
          transition={{ type: "spring", stiffness: 110, damping: 18 }}
        />
      </div>
      <div className="font-ledger mt-1 flex flex-wrap justify-between gap-x-2 text-[10px] text-muted-foreground">
        <span>{reading.terms.map((t) => `${t.term} ${t.mu.toFixed(2)}`).join("  ")}</span>
        <span>{Math.round(reading.value)}/100</span>
      </div>
    </div>
  );
}
