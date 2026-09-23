/**
 * Generates docs/documentation.pdf — a print-ready documentation PDF for
 * The Study Almanac. Uses only Node built-ins: writes a raw PDF (A4, multi-page,
 * Times/Courier base-14 fonts, vintage palette). Run:  node docs/generate-pdf.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "documentation.pdf");

/* ------------------------------------------------------------------ */
/* Page & palette                                                      */
/* ------------------------------------------------------------------ */
const PW = 595.28, PH = 841.89; // A4 portrait (pt)
const ML = 58, MR = 58, MT = 64, MB = 66;
const CW = PW - ML - MR;

const INK = "0.200 0.153 0.102";
const MUTED = "0.427 0.365 0.271";
const PRIMARY = "0.541 0.200 0.141";
const GOLD = "0.659 0.510 0.235";
const RULE = "0.847 0.780 0.647";
const PAPER = "0.973 0.949 0.890";
const PAPER2 = "0.941 0.902 0.824";
const CARD = "0.984 0.969 0.925";

/* Base-14 fonts. width factor approximates Times metrics conservatively. */
const F = {
  roman: { key: "F1", wf: 1.0 },
  bold: { key: "F2", wf: 1.04 },
  italic: { key: "F3", wf: 0.99 },
  mono: { key: "F4", wf: 1.0 },
  monoBold: { key: "F5", wf: 1.0 },
};

/* ------------------------------------------------------------------ */
/* Text helpers                                                        */
/* ------------------------------------------------------------------ */
function san(s) {
  return String(s)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2248/g, "~")
    .replace(/\u00D7/g, "x")
    .replace(/\u03BC/g, "\u00B5") // Greek mu -> micro sign (Latin-1)
    .replace(/\u2264/g, "<=")
    .replace(/\u2265/g, ">=")
    .replace(/\u2208/g, "in")
    .replace(/\u2022/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\u0000-\u00FF]/g, "?");
}

function charW(c) {
  if (c === " ") return 0.25;
  if ("iljItf!|.,;:'`()[]{}".includes(c)) return 0.3;
  if ("mwMW@%" === c || "mwMW@".includes(c)) return 0.86;
  if (c >= "A" && c <= "Z") return 0.7;
  if (c >= "0" && c <= "9") return 0.52;
  if ("-+=/\\*#".includes(c)) return 0.55;
  if ("\u00B5\u00B7\u00B0".includes(c)) return 0.5;
  return 0.49;
}

function textWidth(s, font, size) {
  if (font === F.mono || font === F.monoBold) return s.length * size * 0.6;
  let w = 0;
  for (const c of s) w += charW(c);
  return w * size * font.wf;
}

function hardSplit(line, font, size, width) {
  if (textWidth(line, font, size) <= width) return [line];
  const out = [];
  let cur = "";
  for (const ch of line) {
    if (textWidth(cur + ch, font, size) > width && cur) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function wrap(text, font, size, width) {
  const out = [];
  for (const para of String(text).split("\n")) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (textWidth(t, font, size) <= width) cur = t;
      else {
        if (cur) out.push(...hardSplit(cur, font, size, width));
        cur = w;
      }
    }
    if (cur) out.push(...hardSplit(cur, font, size, width));
  }
  return out.length ? out : [""];
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/* ------------------------------------------------------------------ */
/* Page assembly                                                       */
/* ------------------------------------------------------------------ */
const pages = [];
let cur = [];
let y = 0;

function newPage() {
  if (cur.length) pages.push(cur);
  cur = [`bg ${PAPER} rg 0 0 ${PW} ${PH} re f`];
  y = PH - MT;
}
function ensure(h) {
  if (y - h < MB) newPage();
}
function flush() {
  if (cur.length) pages.push(cur);
  cur = [];
}

function txt(x, yy, s, font, size, color) {
  cur.push(
    `BT ${color} rg /${font.key} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${yy.toFixed(2)} Tm (${esc(san(s))}) Tj ET`,
  );
}
function rect(x, yy, w, h, color) {
  cur.push(`${color} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
}
function rectS(x, yy, w, h, color, lw = 0.8) {
  cur.push(`${color} RG ${lw} lw ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
}
function hRule(yy, w, color = RULE, lw = 0.8) {
  cur.push(`${color} RG ${lw} lw ${ML} ${yy.toFixed(2)} ${(ML + w).toFixed(2)} ${yy.toFixed(2)} m S`);
}
function doubleRule(yy, w) {
  hRule(yy + 2.4, w, RULE, 1.1);
  hRule(yy, w, RULE, 0.6);
}

/* ------------------------------------------------------------------ */
/* Block renderers                                                     */
/* ------------------------------------------------------------------ */
const LEAD = 1.45;

function para(text, { font = F.roman, size = 10.6, color = INK, indent = 0, hanging = 0, before = 0, after = 6, width = CW } = {}) {
  const lh = size * LEAD;
  if (before) {
    ensure(before);
    y -= before;
  }
  const lines = wrap(san(text), font, size, width - indent);
  for (let i = 0; i < lines.length; i++) {
    ensure(lh);
    const x = ML + indent + (i > 0 && hanging ? hanging - indent : 0);
    txt(x, y - size * 0.9, lines[i], font, size, color);
    y -= lh;
  }
  y -= after;
}

function heading(level, num, text) {
  if (level === 1) {
    ensure(72);
    y -= 6;
    txt(ML, y - 30, text, F.bold, 30, INK);
    y -= 42;
    y -= 4;
    doubleRule(y, CW);
    y -= 16;
    return;
  }
  ensure(56);
  y -= 24;
  doubleRule(y + 14, CW);
  if (num) {
    txt(ML, y - 4, num, F.monoBold, 11, PRIMARY);
    txt(ML + 34, y - 5, text, F.bold, 17, INK);
  } else {
    txt(ML, y - 5, text, F.bold, 17, INK);
  }
  y -= 22;
}

function eyebrow(text) {
  ensure(24);
  y -= 4;
  txt(ML, y - 8, String(text).toUpperCase(), F.mono, 8.5, MUTED);
  y -= 16;
}

function stamp(text) {
  // simple banner block instead of rotated stamp (PDF-safe)
  const w = textWidth(String(text).toUpperCase(), F.mono, 8.5) + 22;
  ensure(28);
  rectS(ML, y - 20, w, 19, PRIMARY, 1.2);
  txt(ML + 11, y - 14, String(text).toUpperCase(), F.mono, 8.5, PRIMARY);
  y -= 30;
}

function bullets(items, { size = 10.4, color = INK } = {}) {
  const lh = size * LEAD;
  for (const it of items) {
    const bulletBold = /^\*\*(.+?)\*\*\s*/.exec(it);
    const text = bulletBold ? bulletBold[1] + " " + it.replace(/^\*\*(.+?)\*\*\s*/, "") : it;
    const font = bulletBold ? F.bold : F.roman;
    const lines = wrap(san(text), font, size, CW - 26);
    for (let i = 0; i < lines.length; i++) {
      ensure(lh);
      if (i === 0) {
        rect(ML + 6, y - size * 0.62, 3.2, 3.2, GOLD);
      }
      txt(ML + 20, y - size * 0.9, lines[i], i === 0 ? font : F.roman, size, color);
      y -= lh;
    }
    y -= 3;
  }
  y -= 4;
}

function codeBlock(lines) {
  const size = 8.6;
  const lh = size * 1.5;
  const pad = 10;
  const rendered = [];
  for (const l of lines) {
    const s = san(l);
    const maxChars = Math.max(20, Math.floor((CW - pad * 2) / (size * 0.6)));
    if (s.length <= maxChars) rendered.push(s);
    else {
      let rest = s;
      while (rest.length > maxChars) {
        rendered.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      rendered.push(rest);
    }
  }
  const h = rendered.length * lh + pad * 2;
  ensure(h + 6);
  const top = y;
  rect(ML, top - h, CW, h, PAPER2);
  rectS(ML, top - h, CW, h, RULE, 0.8);
  let yy = top - pad;
  for (const l of rendered) {
    txt(ML + pad, yy - size, l, F.mono, size, INK);
    yy -= lh;
  }
  y = top - h - 12;
}

function kvTable(rows, weights = [0.34, 0.66], { size = 9.6 } = {}) {
  const pad = 6;
  const lh = size * 1.38;
  const widths = weights.map((w) => w * CW);
  const xAt = (i) => ML + widths.slice(0, i).reduce((a, b) => a + b, 0);

  const drawRow = (cells, isHead, forceTop) => {
    const wrapped = cells.map((c, i) => wrap(san(c), isHead ? F.monoBold : F.roman, size, widths[i] - pad * 2));
    const rowH = Math.max(...wrapped.map((w) => w.length)) * lh + pad * 2;
    if (forceTop || y - rowH < MB) {
      newPage();
      if (!isHead && headerCache) drawRow(headerCache, true, true);
    }
    const top = y;
    rect(ML, top - rowH, CW, rowH, isHead ? PAPER2 : CARD);
    for (let i = 0; i < cells.length; i++) {
      const x = xAt(i);
      let yy = top - pad;
      for (const line of wrapped[i]) {
        txt(x + pad, yy - size * 0.92, line, isHead ? F.monoBold : (i === 0 ? F.mono : F.roman), size, isHead ? INK : i === 0 ? PRIMARY : INK);
        yy -= lh;
      }
    }
    // borders
    rectS(ML, top - rowH, CW, rowH, RULE, 0.7);
    for (let i = 1; i < cells.length; i++) {
      const x = xAt(i);
      cur.push(`${RULE} RG 0.7 lw ${x.toFixed(2)} ${(top - rowH).toFixed(2)} ${x.toFixed(2)} ${top.toFixed(2)} m S`);
    }
    y = top - rowH;
  };

  const headerCache = rows.length > 1 && rows[0].__head ? rows[0] : null;
  for (const r of rows) {
    if (r.__head) drawRow(r, true);
    else drawRow(r, false);
    y -= 4;
  }
  y -= 6;
}
function headRow(cells) {
  cells.__head = true;
  return cells;
}

function spacer(h = 8) {
  ensure(h);
  y -= h;
}

function callout(text) {
  const size = 10.2;
  const lh = size * 1.45;
  const lines = wrap(san(text), F.italic, size, CW - 30);
  const h = lines.length * lh + 18;
  ensure(h + 4);
  const top = y;
  rect(ML, top - h, 3, h, GOLD);
  rect(ML + 3, top - h, CW - 3, h, "0.957 0.925 0.855");
  let yy = top - 12;
  for (const l of lines) {
    txt(ML + 16, yy - size * 0.9, l, F.italic, size, INK);
    yy -= lh;
  }
  y = top - h - 12;
}

function warn(text) {
  const size = 10.2;
  const lh = size * 1.45;
  const lines = wrap(san(text), F.roman, size, CW - 30);
  const h = lines.length * lh + 18;
  ensure(h + 4);
  const top = y;
  rect(ML, top - h, 3, h, PRIMARY);
  rect(ML + 3, top - h, CW - 3, h, "0.949 0.898 0.867");
  let yy = top - 12;
  for (const l of lines) {
    txt(ML + 16, yy - size * 0.9, l, F.roman, size, INK);
    yy -= lh;
  }
  y = top - h - 12;
}

/* ------------------------------------------------------------------ */
/* Document content                                                    */
/* ------------------------------------------------------------------ */
newPage();

eyebrow("Documentation - Version 1.0");
heading(1, null, "The Study Almanac");
para("A web application that generates personalized AI study plans using fuzzy-logic reasoning and large language models - wrapped in a vintage archival interface.", {
  font: F.italic,
  size: 13,
  color: MUTED,
  after: 10,
});
para("STACK: REACT 19 / VITE / TYPESCRIPT / TAILWIND CSS 4 / CONVEX (DB + AUTH + ACTIONS) / BUN     SEPTEMBER 2026", {
  font: F.mono,
  size: 8.5,
  color: MUTED,
  after: 6,
});
stamp("Vintage edition");
doubleRule(y, CW);
y -= 6;

heading(2, "01", "Overview");
para("The Study Almanac lets a user sign up with an email, fill a short study brief (subject, exam date, hours per week, prior knowledge), watch a live fuzzy-inference preview as they type, and compose a week-by-week study plan that is filed under their own account.");
para("Two engines cooperate: a 13-rule Mamdani fuzzy-logic system decides intensity, review cadence and sitting length from the brief, and a large language model writes the actual week-by-week sessions from that verdict. If the model is unavailable or its answer cannot be parsed, a deterministic composer produces a complete plan from the same fuzzy verdict - the app never fails open.");

heading(2, "02", "Features");
bullets([
  "**Email sign-in only.** Six-digit email OTP via Convex Auth. One method, exactly as specified for version 1.",
  "**Live fuzzy inference.** Fuzzification chips, three defuzzified gauges, sitting estimate, and a full rule trace with membership strengths (mu) - recomputed on every slider move.",
  "**AI plan composition.** A Convex node action sends the brief plus the fuzzy verdict to an LLM, which writes titles, focus lines, sessions (day / minutes / kind) and checkpoint milestones.",
  "**Guaranteed fallback.** If no AI key exists or the model misbehaves, the deterministic Almanac engine composes the plan from the same verdict. No placeholder states.",
  "**Filed archive.** Every plan is saved with ownership checks; reopen or withdraw past folios at any time.",
  "**Print-friendly folios.** Navigation chrome is excluded from print; a plan prints cleanly as a study document.",
]);

heading(2, "03", "Architecture and pipeline");
codeBlock([
  "brief (subject, date, hours, knowledge)",
  "     |",
  "     v",
  "  infer()  .  src/lib/fuzzy.ts     <- runs in-browser (live) and in Convex",
  "  fuzzify -> 13 rules (min) -> aggregate (max) -> centroid -> 3 outputs",
  "     |",
  "     v",
  "  generatePlan action . src/convex/generatePlan.ts",
  "  +- platform AI integration (auto-configured key) -> LLM writes the weeks",
  "  +- else OPENAI_API_KEY / OPENAI_BASE_URL set -> direct compatible request",
  "  +- otherwise / on error -> buildAlmanacPlan()  (src/lib/compose.ts)",
  "     |",
  "     v",
  "  savePlan mutation -> `plans` table -> folio display + archive",
]);
kvTable([
  headRow(["Layer", "Technology"]),
  ["Frontend", "React 19, Vite 7, TypeScript, Tailwind CSS 4, shadcn/ui, Framer Motion, React Router"],
  ["Backend and database", "Convex - schema, reactive queries, mutations, \"use node\" actions"],
  ["Authentication", "Convex Auth with an email OTP provider (six-digit code, 15-minute expiry)"],
  ["Reasoning", "Mamdani fuzzy inference (src/lib/fuzzy.ts) + LLM composition with deterministic fallback"],
  ["Tooling", "Bun package manager, ESLint, Prettier"],
]);

heading(2, "04", "The fuzzy-logic engine");
para("Inputs are fuzzified with triangular and trapezoidal membership functions, fired through 13 hand-written linguistic rules using min-implication, aggregated with max, and defuzzified by centroid over 0-100 universes.");
kvTable([
  headRow(["Input", "Linguistic terms"]),
  ["Hours per week (1-60)", "scarce  /  moderate  /  ample"],
  ["Days until exam (1-365)", "urgent  /  near  /  distant"],
  ["Prior knowledge (0-10)", "weak  /  working  /  strong"],
]);
kvTable([
  headRow(["Output (0-100 universe)", "Linguistic terms"]),
  ["Intensity", "gentle  /  steady  /  rigorous"],
  ["Review cadence", "rare  /  weekly  /  dense"],
  ["Session length", "short  /  medium  /  long  ->  crisp minutes (20-90)"],
]);
para("Example rule:  IF hours = moderate AND exam = near AND knowledge = working THEN intensity = steady, cadence = weekly, session = medium.");
para("The exact same infer() function runs in the browser for the live preview and inside the Convex action for the authoritative plan, so what the user sees while dragging the sliders is exactly what gets filed.");

heading(2, "05", "AI composition and fallback");
bullets([
  "The compose action builds a strict JSON prompt: exact week count, session count, session minutes, and the fuzzy verdict.",
  "The model's response is structurally sanitised: exact week count, sessions-per-week bounds, minutes clamped to 10-180, session kinds whitelisted to study / practice / review / mock, string length caps.",
  "Any failure (no key, timeout, unparseable JSON) falls back to the deterministic engine; the folio is stamped \"LLM\" or \"Almanac engine\" accordingly.",
  "Keys are read server-side only, inside the \"use node\" action via process.env - they are never shipped to the client.",
]);
codeBlock([
  "LLM path tried in order:",
  "  1. platform AI integration (VLY_INTEGRATION_KEY, pre-configured)",
  "  2. direct OpenAI-compatible endpoint (OPENAI_API_KEY + optional",
  "     OPENAI_BASE_URL / OPENAI_MODEL, default gpt-4o-mini)",
  "  3. deterministic Almanac engine (foundation -> build -> taper phases,",
  "     final sitting always a full rehearsal)",
]);

heading(2, "06", "Authentication");
bullets([
  "Email OTP only (six-digit key, 15-minute validity) via Convex Auth - the sole sign-in method in version 1.",
  "Signed-out visitors hitting a protected route see an explanation and are sent to /auth?returnTo=...; after sign-in they return to the intended page.",
  "/dashboard is wrapped in RequireAuth; sign-in redirects to /dashboard.",
  "Plan mutations enforce ownership server-side: savePlan, listMine and remove all resolve the signed-in user's ID.",
]);

heading(2, "07", "Data model");
codeBlock([
  "plans",
  "  userId       Id<\"users\">       (index: by_user)",
  "  inputs       { subject, examDate, hoursPerWeek, priorKnowledge,",
  "                 daysUntilExam, notes? }",
  "  fuzzy        { intensity, cadence, session, sessionMinutes,",
  "                 labels{intensity,cadence,session}, trace[{text,strength}] }",
  "  weeks[]      { index, title, focus,",
  "                 sessions[{ day, task, minutes, kind }], milestone }",
  "  composedBy   \"llm\" | \"almanac\"",
  "  createdAt    number",
  "",
  "users  (Convex Auth)  name?, image?, email?, emailVerificationTime?,",
  "                      isAnonymous?, role?        (index: email)",
]);

heading(2, "08", "Local setup");
para("Requirements: Bun (https://bun.sh) and a Convex project - the template ships configured.");
codeBlock([
  "bun install          # install dependencies",
  "bun convex dev       # start Convex + codegen, then in another terminal:",
  "bun run dev          # start the Vite dev server",
]);
para("Routes:   /  landing page     /auth  sign-in     /dashboard  protected workspace.");

heading(2, "09", "Environment variables");
kvTable(
  [
    headRow(["Variable", "Where", "Req.", "Purpose"]),
    ["VITE_CONVEX_URL", ".env.local (platform-set)", "yes", "Convex client URL"],
    ["VLY_INTEGRATION_KEY", "set at project creation", "yes", "Platform AI integration for LLM composition"],
    ["OPENAI_API_KEY", "Convex deployment env", "no", "Optional own OpenAI-compatible endpoint"],
    ["OPENAI_BASE_URL", "Convex deployment env", "no", "Custom base URL (default api.openai.com/v1)"],
    ["OPENAI_MODEL", "Convex deployment env", "no", "Model id (default gpt-4o-mini)"],
  ],
  [0.27, 0.27, 0.09, 0.37],
);
callout("LLM composition works out of the box via the platform integration. If every AI path fails the app still works end-to-end - plans are composed by the deterministic Almanac engine and stamped accordingly.");

heading(2, "10", "Deployment");
bullets([
  "**Backend:** bun convex deploy pushes functions and schema; set any optional OPENAI_* variables in the deployment environment.",
  "**Frontend:** bun run build outputs dist/ - host on any static provider (Render, Netlify, Vercel, GitHub Pages) with VITE_CONVEX_URL pointing at the deployed Convex deployment. Configure an SPA rewrite of all routes to /index.html.",
  "**Live demo:** the hosted Freebuff preview of this project is the live demo - sign in at /auth and compose a plan at /dashboard immediately.",
]);
warn("Streamlit Community Cloud and Hugging Face Spaces host Python / Streamlit / Gradio apps and cannot run this Vite + Convex stack. The correct free hosts are the built-in live preview (demo) and Render / Netlify / Vercel-style static hosts (production), with Convex as the backend.");

heading(2, "11", "Scripts and checks");
kvTable([
  headRow(["Command", "Purpose"]),
  ["bun run dev", "Vite dev server"],
  ["bun run build", "Typecheck + production build -> dist/"],
  ["bun run lint", "ESLint"],
  ["bun run format", "Prettier"],
  ["bun convex dev --once && bun tsc -b --noEmit", "Convex codegen + TypeScript typecheck"],
]);

heading(2, "12", "Project structure");
codeBlock([
  "src/",
  "  lib/",
  "    fuzzy.ts         # Mamdani engine (MFs, 13 rules, centroid)",
  "    compose.ts       # Deterministic Almanac composer + date helpers",
  "    plan.ts          # Shared plan types + summarize()",
  "    validators.ts    # Convex validators mirroring the plan types",
  "  convex/",
  "    schema.ts        # auth tables + plans (indexed by user)",
  "    plans.ts         # savePlan / listMine / remove (ownership enforced)",
  "    generatePlan.ts  # \"use node\" action: verdict -> LLM or fallback",
  "  components/",
  "    StudyPlanForm.tsx     # intake brief",
  "    InferenceLedger.tsx   # live fuzzification / gauges / rule trace",
  "    PlanFolio.tsx         # folio header + week cards (print-friendly)",
  "    vintage.tsx           # archival primitives (rules, stamps, gauges)",
  "    RequireAuth.tsx       # protected-route wrapper with returnTo",
  "  pages/",
  "    Landing.tsx      # hero, method, contents, specimen, CTA",
  "    Dashboard.tsx    # protected workspace: form + ledger + archive",
  "    Auth.tsx         # email OTP sign-in",
  "index.html           # fonts + title",
  "src/index.css        # vintage theme tokens + paper grain",
  "README.md            # full setup / deployment instructions",
  "docs/documentation.html   # print-ready HTML documentation",
  "docs/documentation.pdf    # this document",
]);

heading(2, "13", "Deliverables and links");
kvTable([
  headRow(["Deliverable", "Location"]),
  ["Complete source code", "This repository - export via the Freebuff / Vly project UI (version control is managed by the platform)"],
  ["GitHub repository", "github.com/sagar777-sys - create the repo, then push this source (see README)"],
  ["Live demo link", "The hosted Freebuff preview of this project - publish via freebuff.com/project/<name>?publish=true for a stable URL"],
  ["Documentation PDF", "docs/documentation.pdf (this file). Regenerate with: node docs/generate-pdf.mjs"],
  ["Documentation source", "docs/documentation.html - open in a browser and use Print / Save as PDF"],
  ["Setup instructions", "README.md and sections 08-10 of this document"],
]);
warn("Security note: never share account passwords in chat or commit them to a repository. Rotate any credential that has been exposed, store secrets in a password manager, and enable two-factor authentication. No proprietary libraries, keys, or secrets are embedded in this repository.");

flush();

/* ------------------------------------------------------------------ */
/* Footers                                                             */
/* ------------------------------------------------------------------ */
pages.forEach((p, i) => {
  const yy = MB - 34;
  p.push(`${RULE} RG 0.8 lw ${ML} ${yy + 16} ${ML + CW} ${yy + 16} m S`);
  p.push(
    `BT ${MUTED} rg /F4 7.5 Tf 1 0 0 1 ${ML} ${yy} Tm (${esc("THE STUDY ALMANAC - DOCUMENTATION - V1.0")}) Tj ET`,
  );
  const label = `PAGE ${i + 1} / ${pages.length}`;
  const wpx = textWidth(label, F.mono, 7.5);
  p.push(
    `BT ${MUTED} rg /F4 7.5 Tf 1 0 0 1 ${(ML + CW - wpx).toFixed(2)} ${yy} Tm (${esc(label)}) Tj ET`,
  );
});

/* ------------------------------------------------------------------ */
/* PDF writer                                                          */
/* ------------------------------------------------------------------ */
const objects = [];
const add = (body) => {
  objects.push(body);
  return objects.length;
};

const fontDefs = [
  ["F1", "/Times-Roman"],
  ["F2", "/Times-Bold"],
  ["F3", "/Times-Italic"],
  ["F4", "/Courier"],
  ["F5", "/Courier-Bold"],
];

// reserve ids: 1 catalog, 2 pages, 3..7 fonts, then page/content pairs
add("<< /Type /Catalog /Pages 2 0 R >>"); // 1
const pageIds = [];
const fontIds = fontDefs.map(([key, base]) => {
  const id = add(`<< /Type /Font /Subtype /Type1 /BaseFont ${base} /Encoding /WinAnsiEncoding >>`);
  return [key, id];
});
const kids = [];
for (const p of pages) {
  const content = p.join("\n");
  const cid = add(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
  const pid = add(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << ${fontDefs
      .map(([key], i) => `/${key} ${3 + i} 0 R`)
      .join(" ")} >> >> /Contents ${cid} 0 R >>`,
  );
  kids.push(`${pid} 0 R`);
  pageIds.push(pid);
}
// Pages object must be id 2 -> push now (after fonts which took 3..7)
objects.splice(1, 0, `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${kids.length} >>`);
// NOTE: splicing shifts every id after 2 by +1; fix references accordingly.
// Easier path: rebuild with correct order instead of splicing.

// The splice above invalidated ids >= 2. Rebuild deterministically:
function buildPdf() {
  const objs = [];
  const pushObj = (body) => {
    objs.push(body);
    return objs.length;
  };

  const catalogId = pushObj("PLACEHOLDER_CATALOG"); // 1
  const pagesId = pushObj("PLACEHOLDER_PAGES"); // 2
  const fontIdMap = fontDefs.map(([key, base]) => [key, pushObj(`<< /Type /Font /Subtype /Type1 /BaseFont ${base} /Encoding /WinAnsiEncoding >>`)]);

  const kidsReal = [];
  for (const p of pages) {
    const content = p.join("\n");
    const cid = pushObj(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    const pid = pushObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << ${fontIdMap
        .map(([key, id]) => `/${key} ${id} 0 R`)
        .join(" ")} >> >> /Contents ${cid} 0 R >>`,
    );
    kidsReal.push(`${pid} 0 R`);
  }

  objs[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kidsReal.join(" ")}] /Count ${kidsReal.length} >>`;

  let out = "%PDF-1.4\n%\u00E2\u00E3\u00CF\u00D3\n";
  const offsets = [];
  objs.forEach((body, i) => {
    offsets.push(Buffer.byteLength(out, "latin1"));
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefPos = Buffer.byteLength(out, "latin1");
  out += `xref\n0 ${objs.length + 1}\n`;
  out += "0000000000 65535 f \n";
  for (const off of offsets) out += `${String(off).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return out;
}

const pdf = buildPdf();
writeFileSync(OUT, pdf, "latin1");
console.log(`Wrote ${OUT} (${pages.length} pages, ${Buffer.byteLength(pdf, "latin1")} bytes)`);
