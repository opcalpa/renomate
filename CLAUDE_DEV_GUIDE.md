# Claude Code Dev Guide

A battle-tested guide for building production apps with Claude Code. Distilled from 3+ months of daily collaboration on a complex full-stack app (50k+ lines, 200+ commits).

**Part 1** is universal — works for any project.
**Part 2** has opt-in modules for specific app types.

---

# Part 1: Core (Every Project)

---

## 1. Project Setup — CLAUDE.md

Every project needs a `CLAUDE.md` at the root. This is Claude's primary instruction file — it reads it at the start of every session.

**Must include:**
- Tech stack summary
- Project structure (`src/` tree)
- Coding conventions (naming, patterns, no-go's)
- Pre-commit checklist
- Deploy pipeline

**Add if relevant:**
- Database conventions (migrations, auth patterns)
- i18n conventions
- API patterns

**Key principle:** CLAUDE.md is the contract. If you want Claude to follow a rule consistently, it must be in CLAUDE.md.

```markdown
# Project Name — Instructions

## Tech Stack
- Core: [framework] + TypeScript
- State: [state management]
- Backend: [database/API layer]
- UI: [component library]

## Core Rules
- No `any` types — use `unknown`
- No console.log in production
- No dead code — delete, don't comment out
- Files under 500 lines — split if larger
```

---

## 2. Memory System — Persistent Context

Claude's memory (`~/.claude/projects/<path>/memory/`) is how context survives between sessions. Without it, every /clear loses everything.

### The 3 core files

Instead of sprawling sprint files and scattered project notes, maintain **3 status files** that are always current:

| File | Purpose | Updated when |
|---|---|---|
| `current-status.md` | What we're working on NOW + next up + recently done | **Hello** (read) + **Bye** (write) |
| `shiplog.md` | Compact changelog — one line per shipped feature | **Bye** (append) |
| `backlog.md` | All planned features, prioritized, with links to detail files | When priorities change |

```markdown
# current-status.md example

## In progress
### User onboarding redesign
New 3-step wizard replacing old form. Design spec in Figma.
**Details:** [project_onboarding_redesign.md](project_onboarding_redesign.md)

## Recently shipped
- **Search & filters** (2026-04-17) — full-text search, saved filters
- **Notification system** (2026-04-15) — in-app + email digests

## Next up
1. Role-based permissions audit
2. Performance optimization (list views)
```

**Hello reads `current-status.md` — nothing else.** This is the single source of truth. Detail files exist for deep dives but aren't read at session start.

### Supporting file types

| Type | When to save | Example |
|---|---|---|
| **feedback** | Corrections AND validations of approach | "Don't mock DB in tests — prod divergence burned us" |
| **project** | Detail file for a specific feature (linked from backlog/status) | Planning doc for onboarding redesign |
| **reference** | Where to find things externally | "Bugs tracked in Linear project INGEST" |
| **user** | Role, preferences, expertise level | "Senior dev, prefers terse responses" |

### MEMORY.md index

`MEMORY.md` is the index — one line per memory, under 200 lines. Organized by category:

```markdown
# Project Memory

## Status (READ AT HELLO)
- [current-status.md](current-status.md) — Current work, next up, recently done
- [shiplog.md](shiplog.md) — Delivery history
- [backlog.md](backlog.md) — Planned features, prioritized

## Routines
- [feedback_hello.md](feedback_hello.md) — Hello: read current-status.md
- [feedback_bye.md](feedback_bye.md) — Bye: update current-status.md + shiplog

## User Preferences
- [feedback_testing.md](feedback_testing.md) — Always test both auth paths

## Active Work (details)
- [project_onboarding.md](project_onboarding.md) — Onboarding redesign

## System Knowledge
- [reference_feature_map.md](reference_feature_map.md) — Full feature map
- [reference_bug_log.md](reference_bug_log.md) — Fixed bugs with root cause
```

### What NOT to save in memory
- Code patterns derivable from reading the code
- Git history (`git log` is authoritative)
- Debugging solutions (the fix is in the commit)
- Ephemeral task details

### Memory hygiene
- **Completed features** → condense to one line in `shiplog.md`, delete the detail file
- **Stale sprint files** → same treatment. Never accumulate sprint files.
- **Backlog items** → live in `backlog.md` with links to detail files. When done, move to shiplog.
- Keep MEMORY.md under 200 lines — it's an index, not a journal

---

## 3. Feature Map — Avoid Duplication

Maintain a `reference_feature_map.md` memory file that maps every screen, component, data flow, and API endpoint. Claude checks this BEFORE proposing new features to avoid building something that already exists.

```markdown
## Screen: Dashboard
- Component: Dashboard.tsx
- Data: projects query + activity feed
- Features: stat cards, project list, recent activity
- API: GET /projects, GET /activity
- Gating: admin → full view, member → own projects only
```

Also maintain a `reference_bug_log.md` — every fixed bug with root cause, fix, and verification. Check before shipping to avoid regressions.

---

## 4. Session Routines

### On hello / session start
1. Read `current-status.md` — this is the ONLY file needed for context
2. Read `git log --oneline -5` for recent commits
3. Give short summary: what's in progress, what's next
4. Ask what we're working on today

**Do NOT** read all memory files, sprint files, or MEMORY.md at hello. `current-status.md` has everything.

### On bye / session end
1. Check for uncommitted/unpushed work — warn if any
2. **Update `current-status.md`:**
   - Move finished work to "Recently shipped" (keep max 3-5 items)
   - Update "In progress" with current state
   - Update "Next up" if priorities changed
   - Update the date at the top
3. **Append `shiplog.md`** — one line per shipped feature under today's date
4. **Update `backlog.md`** if items were completed or added
5. Delete/update stale memory files if session work invalidated them

**Key principle:** If `current-status.md` isn't updated at bye, the next hello will miss context. This is the most important routine.

### On feature completion
1. Type check / lint
2. Build check
3. Commit with descriptive message
4. Update feature map if new features added
5. Move to next task (don't wait for bye to update status)

---

## 5. Commit & Deploy Cadence

### Commit rules
- Commit after every completed change — never batch unrelated work
- Never commit half-finished or unconfirmed work
- Descriptive messages: what + why, not just what

### Push rules
- Don't auto-push — commit frequently, push at natural breakpoints (1-3x/day)
- Push when user asks, or at session end
- Always verify before push: type check + build

### Pre-commit checklist
```bash
npx tsc --noEmit          # No type errors (TypeScript)
npx vite build            # Builds successfully (adapt to your bundler)
```

---

## 6. A/B Testing New Designs

When redesigning existing UI, don't replace — add alongside:

1. Build new component in separate folder
2. Scope new CSS/tokens to a wrapper class (don't pollute global styles)
3. Add toggle in existing page to switch views
4. Test both side by side
5. Migrate when satisfied, then delete old version

---

## 7. Mobile-First Verification

After every UI change:
- Test at 375px width (iPhone SE)
- Check overflow (no horizontal scroll on body)
- Verify touch targets are 44px+
- Test drawer/dialog dismissal on mobile

---

## 8. Destructive Change Protocol

For changes that can break production (schema changes, data migrations, auth policy changes, infra config):

1. **Write rollback plan first** — before making the change
2. **Test locally** if possible
3. **Apply changes incrementally** — one at a time, not batched
4. **Verify between steps** — check the app works
5. **Have a fast revert path** — know exactly how to undo within 60 seconds
6. **Keep admin tools open** as emergency backup (DB console, deploy dashboard, etc.)

---

## 9. Persona System

For strategic decisions, use AI personas that read a shared brief and contribute their perspective:

| Persona | Focus |
|---|---|
| CEO | Prioritization, strategy, trade-offs |
| CTO | Architecture, security, performance |
| UX Designer | Layout, navigation, usability |
| Domain Expert | Industry terminology, workflows |

**Rules:**
- Personas analyze and recommend — they never write code
- All personas read the same brief
- Escalate cross-cutting questions to CEO persona

---

## 10. Data Consistency Patterns

### Terminology lockdown
Pick user-facing terms early and enforce them everywhere:
- One word per concept — don't use different terms in code vs UI
- If using i18n, keys should match the canonical term
- DB values are English keys, translated at display time

### Single source of truth
When the same data appears in multiple views:
- Define ONE authoritative source
- Other views derive, never duplicate
- Document which view is authoritative

---

# Part 2: Opt-in Modules

Pick the modules that match your app type.

---

## Module A: Multi-Role Platforms

*For apps where different user types see different things (admin/member, pro/consumer, seller/buyer, teacher/student).*

### Pattern: Dual-perspective rendering

```typescript
// ONE component, conditional rendering based on role
const isPro = userRole !== "consumer";

// Consumer sees simplified view
if (!isPro) return <ConsumerDashboard />;

// Pro sees full admin table
return <ProDashboard />;
```

### Rules
- Same data model, different presentation layers
- Hide internal/professional jargon from consumer-facing views
- Sensitive data (pricing, margins, internal notes) gated by role — never just hidden with CSS
- Profile-level settings (defaults, rates) vs project/workspace-level data
- Test every screen as each role — easy to miss a CTA that shouldn't be visible
- Maintain a role-access matrix in your feature map:

```markdown
| Feature       | Admin | Pro  | Consumer | Guest |
|---------------|-------|------|----------|-------|
| Dashboard     | full  | full | summary  | none  |
| Billing       | edit  | view | own only | none  |
| Team          | manage| view | none     | none  |
| Settings      | all   | own  | own      | none  |
```

---

## Module B: Supabase / PostgreSQL

*For apps using Supabase as backend (auth, database, storage, edge functions).*

### Migration discipline
```sql
-- ALWAYS idempotent
ALTER TABLE items ADD COLUMN IF NOT EXISTS category TEXT;

-- ALWAYS include revert SQL as comment
-- REVERT: ALTER TABLE items DROP COLUMN IF EXISTS category;
```

### Push protocol
1. Write revert SQL FIRST
2. Push ONE migration at a time
3. Verify app works between pushes
4. Regenerate types: `supabase gen types typescript`
5. Run TypeScript check immediately

### RLS safety (learned from production crash)
- **Never** create circular RLS dependencies (table A's policy queries table B, B queries A)
- Auth tables (profiles/users) are dangerous — almost every table references them in RLS
- Test BOTH paths: direct owner access + shared/invited user access
- Always have SQL Editor open as backup when pushing RLS changes

### Auto-push rule
Run `supabase db push` immediately after creating migrations. Never leave unapplied migrations — code will reference columns that don't exist remotely.

### Storage path verification
When uploading to Supabase storage, always verify the upload path matches existing RLS policies before writing upload code.

---

## Module C: i18n / Multi-Language

*For apps supporting multiple languages.*

### File structure
```
src/i18n/locales/
├── en.json   ← Source of truth (all keys live here first)
├── [primary].json  ← Primary UI language (must stay in sync)
├── [other].json    ← Best effort
```

### Rules
- No hardcoded UI strings — always `t('namespace.key')`
- DB values are English keys — translate at display time
- New keys: add to source-of-truth locale first, then primary
- Use fallback pattern: `t('key', 'English fallback')`
- Use terminology users understand, not industry jargon

---

## Module D: Data-Heavy Table Apps

*For apps where the core UX is tables with lots of data (project management, CRMs, admin panels, spreadsheet-like tools).*

### Table UX checklist

Every data table should support:
- [ ] Column reorder (drag headers)
- [ ] Column show/hide (column picker + right-click → hide)
- [ ] Sort (click header, asc/desc/none)
- [ ] Compact mode toggle
- [ ] Search/filter
- [ ] Sticky first column + header
- [ ] Saved preferences (localStorage + server sync)
- [ ] Right-click context menu on headers
- [ ] Consistent font sizing

### Inline editing pattern

Tables should support inline editing — click a cell to edit, not navigate to a full dialog.

| Cell type | Interaction |
|---|---|
| **Name/title** | Click → opens detail dialog/drawer |
| **Status** | Click → inline dropdown |
| **Amount/number** | Click → inline input, Enter to save |
| **Dropdown value** | Click → inline select |
| **Autocomplete** | Click → inline autocomplete with create-new option |

### Drawer pattern for detail views

Use Sheet/Drawer instead of full-page navigation. User stays in context.

```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent side="right" className="w-full sm:max-w-lg">
    <DetailView item={selectedItem} />
  </SheetContent>
</Sheet>
```

### Shared component extraction

When the same UI pattern appears in 3+ places, extract it:

```
src/components/shared/
├── AutocompleteInput.tsx   ← Used across multiple tables
├── AttachmentIndicator.tsx ← Used in all list views
├── FilePreviewPopover.tsx  ← Used everywhere files are shown
└── StatusBadge.tsx         ← Used in tables, cards, detail views
```

**Rule:** If you're copying render logic between tables, extract it.

---

## Quick Reference

```bash
# TypeScript check
npx tsc --noEmit

# Build (adapt to your bundler)
npx vite build

# Start dev server
npx vite --port 5173
```

Add project-specific commands here (migration push, type generation, deploy, etc.).

---

*This guide is a living document. Update it as new patterns emerge.*
