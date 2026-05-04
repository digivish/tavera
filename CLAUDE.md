## Project: Tavera (Supplier Risk Intelligence)
**Context:** MVP development for a food safety monitoring platform.

## Tech Stack
- **Frontend:** React (Vite), Tailwind CSS, Headless UI.
- **Backend/API:** Python (FastAPI).
- **Database:** PostgreSQL (self-hosted Ubuntu server).
- **AI/LLM:** Deepseek-v4-pro for data extraction and UI conversion.

## Project Structure & Design Handoff
This project follows a strict **Design-to-Code** pipeline. Refer to `DESIGN.md` for the authoritative mapping of UI components.

- `/design`: Root directory for all Stitch UI exports.
  - `/[page-name]`: Individual folder per application view.
    - `screen.png`: High-fidelity visual reference.
    - `code.html`: Fully working HTML/Tailwind skeleton.
- `/src/pages`: Destination for converted React components.

## Conversion Protocol (Stitch HTML -> React)
When converting files from the `/design` folder:
1. **Visual Alignment:** Analyze `screen.png` to ensure layout, spacing, and typography match the intended UX.
2. **Componentization:** Break the `code.html` into reusable React atoms and molecules. 
3. **Logic Injection:** Replace static text with props and state hooks (e.g., mapping supplier scores to progress bars).
4. **Tailwind Purge:** Ensure all styles from the HTML are migrated using Tailwind utility classes.

## Core Logic & Data Flow
1. **Mapping Engine:** Resolve names/numbered companies via **OrgBook BC API**.
2. **Scoring Engine:** Aggregate records from **DataBC** and **Fraser Health API**.
3. **Alert Pipeline:** Daily cron check against "User Monitored List."

## Coding Standards
- **Component Architecture:** Functional components, Atomic design.
- **Type Safety:** Strict TypeScript for all government data models.
- **Naming Conventions:** `HealthAuthority`, `InfractionType`, `EntityMapping`.

## Guidelines for AI Agents
- **Fuzzy Matching:** Implement robust matching for "Ltd" vs "Limited."
- **Data Integrity:** Accuracy of safety scores is a legal priority over UI aesthetics.
- **Rate Limiting:** Implement caching for all government API calls.

## Core Principles
- Simplicity First: Make every change as simple as possible. Impact minimal code.\
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.\
- Minimal Impact: Only touch what's necessary. No side effects with new bugs.

## Planning Docs
- `PLAN.md`: Full implementation plan (architecture, decisions, phases, test contract).
- `TODOS.md`: Deferred work, priorities, and dependencies.

## gstack
Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.
Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /review, /ship, /browse, /qa, /qa-only, /design-review,
/setup-browser-cookies, /retro, /debug, /document-release.
