# The Study Almanac

A web application that generates **personalized AI study plans** using fuzzy-logic reasoning and large language models. Sign up with an email, fill in a short brief (subject, exam date, hours per week, prior knowledge), watch the live fuzzy-inference preview update as you type, then compose a week-by-week plan that gets filed under your account.

Styled in a **vintage archival theme**: aged-parchment tones, sepia ink, serif hierarchy (Playfair Display / EB Garamond), mono "ledger" data, light paper grain, dotted-leader contents, folio numbers and stamps.

## Features

- **Email sign-in / sign-up** (six-digit email OTP via Convex Auth — one method, nothing else).
- **Live fuzzy-inference preview** — the inference ledger recomputes on every slider move:
  - *Fuzzification* of three inputs: hours/week (`scarce · moderate · ample`), days to exam (`urgent · near · distant`), prior knowledge (`weak · working · strong`).
  - A **13-rule Mamdani rule base** with min-implication, max aggregation, and **centroid defuzzification** over 0–100 universes.
  - Three crisp outputs: **intensity**, **review cadence**, **session length** — plus a full rule trace with membership strengths (μ).
- **AI plan composition** — a Convex action sends the brief plus the fuzzy verdict to an LLM that writes the weeks (titles, focus, sessions with day/minutes/kind, checkpoint milestones). It calls the platform AI integration (key injected at project creation — **works with no setup**), and can alternatively use any OpenAI-compatible endpoint via `OPENAI_*` env vars.
  - **Guaranteed fallback:** if no AI key is available, or the model times out / returns unparseable output, the deterministic **Almanac engine** composes a complete plan from the same fuzzy verdict. The app never fails open and has no placeholder states.
- **Filed archive** — every composed plan is saved (ownership-checked) and can be reopened or withdrawn later.
- **Print-friendly folios** — chrome is excluded from print; the plan itself prints cleanly.

## Pipeline

```
brief (subject, date, hours, knowledge)
        │
        ▼
  infer()  ·  src/lib/fuzzy.ts        ← runs in-browser (live) and in Convex (authoritative)
  fuzzify → 13 rules (min) → aggregate (max) → centroid → intensity / cadence / session
        │
        ▼
  generatePlan action · src/convex/generatePlan.ts
  ├─ platform AI integration (VLY_INTEGRATION_KEY) → LLM writes the weeks
  ├─ else OPENAI_API_KEY set → same LLM path via a direct OpenAI-compatible endpoint
  └─ otherwise / on error → buildAlmanacPlan() (src/lib/compose.ts)
        │
        ▼
  savePlan mutation → `plans` table → folio display + archive
```

## Quick start

Requirements: [Bun](https://bun.sh) (or npm), a Convex project (the template ships configured).

```bash
bun install          # install dependencies
bun convex dev       # start Convex + codegen, then in another terminal:
bun run dev          # start the Vite dev server
```

Open the printed local URL. The landing page is at `/`; sign-in is at `/auth`; the workspace is at `/dashboard` (protected).

### Environment / keys

| Variable | Where | Required | Purpose |
| --- | --- | --- | --- |
| `VITE_CONVEX_URL` | `.env.local` (already set by the platform) | yes | Convex client URL |
| `VLY_INTEGRATION_KEY` | set automatically at project creation | yes (pre-set) | Platform AI integration used for LLM plan composition |
| `OPENAI_API_KEY` | Convex deployment env (project **Keys/API keys** UI) | no | Optional: use your own OpenAI-compatible endpoint instead |
| `OPENAI_BASE_URL` | Convex deployment env | no | Any OpenAI-compatible endpoint (default `https://api.openai.com/v1`) |
| `OPENAI_MODEL` | Convex deployment env | no | Model id (default `gpt-4o-mini`) |

\* LLM composition works out of the box via the platform integration; if every AI path fails the app still works end-to-end — plans are composed by the deterministic Almanac engine and stamped accordingly.

> Keys are read server-side only, inside a `"use node"` Convex action via `process.env`. They are never exposed to the client.

## Scripts

```bash
bun run dev       # Vite dev server
bun run build     # typecheck + production build
bun run lint      # ESLint
bun run format    # Prettier
```

Typecheck / codegen checks used during development:

```bash
bun convex dev --once && bun tsc -b --noEmit
```

## Project structure

```
src/
  lib/
    fuzzy.ts        # Mamdani inference engine (membership fns, 13 rules, centroid)
    compose.ts      # Deterministic Almanac composer + date/week helpers
    plan.ts         # Shared plan types + summarize()
    validators.ts   # Convex validators mirroring the plan types
  convex/
    schema.ts       # auth tables + `plans` (indexed by user)
    plans.ts        # savePlan / listMine / remove (ownership enforced)
    generatePlan.ts # "use node" action: fuzzy verdict → LLM (or fallback) → weeks
  components/
    StudyPlanForm.tsx   # intake brief
    InferenceLedger.tsx # live fuzzification / gauges / rule trace
    PlanFolio.tsx       # folio header + week cards (print-friendly)
    vintage.tsx         # shared archival primitives (rules, stamps, gauges, mark)
  pages/
    Landing.tsx     # hero, method, contents, specimen, CTA
    Dashboard.tsx   # protected workspace: form + ledger + folio + archive
    Auth.tsx        # email OTP sign-in
index.html          # fonts + title
src/index.css       # vintage theme tokens + paper texture + archival utilities
```

## Deployment

1. **Backend:** `bun convex deploy` (pushes functions/schema; set `OPENAI_API_KEY` etc. in the deployment's environment variables if you want LLM composition).
2. **Frontend:** `bun run build` outputs `dist/` — host on any static provider, pointing `VITE_CONVEX_URL` at the deployed Convex deployment.
3. The hosted Freebuff preview of this project is the live demo — sign in at `/auth` and compose a plan at `/dashboard` immediately.

## Notes

- Only one authentication method is offered (email OTP), as specified for version 1.
- No proprietary libraries or secrets are embedded in this repository.
