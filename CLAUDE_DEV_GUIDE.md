# Claude Code Dev Guide

A battle-tested guide for building production apps with Claude Code. Distilled from 3+ months of daily collaboration on a complex React + Supabase renovation management app (50k+ lines, 200+ commits).

Use this as a starting template for new projects — adapt to your stack.

---

## 1. Project Setup — CLAUDE.md

Every project needs a `CLAUDE.md` at the root. This is Claude's primary instruction file — it reads it at the start of every session.

**Must include:**
- Tech stack summary
- Project structure (`src/` tree)
- Coding conventions (naming, patterns, no-go's)
- Database conventions (RLS, migrations)
- i18n conventions
- Pre-commit checklist
- Deploy pipeline

**Key principle:** CLAUDE.md is the contract. If you want Claude to follow a rule consistently, it must be in CLAUDE.md.

```markdown
# Project Name — Instructions

## Tech Stack
- Core: React 18 + TypeScript, Vite, Tailwind CSS
- State: Zustand (global), React Query (server)
- Database: Supabase (PostgreSQL, auth, storage)
- UI: shadcn/ui, Radix UI

## Core Rules
- No `any` types — use `unknown`
- No console.log in production
- No dead code — delete, don't comment out
- Files under 500 lines — split if larger
- Swedish UI, English code/comments
```

---

## 2. Memory System — Persistent Context

Claude's memory (`~/.claude/projects/<path>/memory/`) is how context survives between sessions. Without it, every /clear loses everything.

### Memory types

| Type | When to save | Example |
|---|---|---|
| **user** | Role, preferences, expertise level | "Senior dev, prefers terse responses" |
| **feedback** | Corrections AND validations | "Don't mock DB in tests — prod divergence burned us" |
| **project** | Ongoing work, decisions, sprint context | "Merge freeze after Thursday for mobile release" |
| **reference** | Where to find things externally | "Bugs tracked in Linear project INGEST" |

### MEMORY.md index

`MEMORY.md` is the index file — one line per memory, under 200 lines. Claude reads this every session. Keep it clean.

```markdown
# Project Memory

## Architecture Patterns
- Dual-view pattern: BudgetTab has builder vs homeowner views
- RLS: use user_owns_project(), NEVER raw auth.uid()

## Key Decisions
- [project_budget_refactor.md](project_budget_refactor.md) — P&L hierarchy

## Feedback
- [feedback_rls_verification.md](feedback_rls_verification.md) — Always test both owner + shared user paths
```

### What NOT to save
- Code patterns derivable from reading the code
- Git history (`git log` is authoritative)
- Debugging solutions (the fix is in the commit)
- Ephemeral task details

### Memory hygiene
- Update stale memories — don't let them drift
- Mark completed features as BYGGT/DONE
- Remove memories for deleted features
- Keep MEMORY.md under 200 lines

---

## 3. Feature Map — Avoid Duplication

Maintain a `reference_app_feature_map.md` memory file that maps every tab, component, data flow, and edge function. Claude checks this BEFORE proposing new features to avoid building something that already exists.

```markdown
## Tab: Budget
- Component: BudgetTab.tsx (builder), HomeownerBudgetView.tsx (homeowner)
- Data: tasks + materials tables, joined by task_id
- Features: inline editing, P&L hierarchy, supplier autocomplete
- Edge functions: none
- Gating: isBuilder → full view, homeowner → summary cards + table
```

Also maintain a `reference_bug_fixes_log.md` — every fixed bug with root cause, fix, and verification. Check before shipping to avoid regressions.

---

## 4. Dual-Perspective Design

If your app has multiple user types (e.g. professional vs consumer), establish the pattern early:

```typescript
// ONE component, conditional rendering
const isBuilder = userType !== "homeowner";

// Homeowner sees simplified view
if (!isBuilder) return <HomeownerBudgetView />;

// Builder sees full table
return <BudgetTab />;
```

**Rules we learned:**
- Same data model, different presentation
- Hide internal jargon from consumers (e.g. "UE" → just "Arbete" for homeowners)
- Pricing visible to builders, hidden from homeowners in shared views
- Profile-level settings (rates, defaults) vs project-level data

---

## 5. Database Patterns (Supabase)

### Migration discipline
```sql
-- ALWAYS idempotent
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- ALWAYS include revert SQL as comment
-- REVERT: ALTER TABLE tasks DROP COLUMN IF EXISTS supplier_id;
```

### Push protocol
1. Write revert SQL FIRST
2. Push ONE migration at a time
3. Verify app works between pushes
4. Regenerate types: `supabase gen types typescript`
5. Run TypeScript check immediately

### RLS safety (CRITICAL — learned from production crash)
- **Never** create circular RLS dependencies (table A's policy queries table B, B queries A)
- `profiles` is dangerous — almost every table references it
- Test BOTH paths: owner via `projects.owner_id` + shared user via `project_shares`
- Always have SQL Editor open as backup when pushing RLS changes

### Auto-push rule
Run `supabase db push` immediately after creating migrations. Never leave unapplied migrations — code will reference columns that don't exist remotely.

---

## 6. i18n Strategy

```
en.json  ← Source of truth (all keys)
sv.json  ← Must stay in sync (primary UI language)
de/fr/es ← Best effort
```

**Rules:**
- No hardcoded UI strings — always `t('namespace.key')`
- DB values are English keys — translate at display time
- New keys: add to `en.json` first, then `sv.json`
- Use fallback pattern: `t('key', 'English fallback')`
- Use terminology users understand, not industry jargon (e.g. "Tillägg" not "ÄTA")

---

## 7. Inline Editing Pattern

Tables should support inline editing — click a cell to edit, not navigate to a full dialog.

| Cell type | Interaction |
|---|---|
| **Name/title** | Click → opens detail dialog/drawer |
| **Status** | Click → inline dropdown |
| **Amount/number** | Click → inline input, Enter to save |
| **Dropdown value** (room, category) | Click → inline select |
| **Autocomplete** (supplier, assignee) | Click → inline autocomplete with create |

```typescript
// Generic cell save handler
const handleCellSave = async (row, col, value) => {
  const fieldMap = row.type === "task" 
    ? { budget: "budget", paid: "paid_amount" }
    : { budget: "price_total", paid: "paid_amount" };
  
  await supabase.from(table).update({ [fieldMap[col]]: value }).eq("id", row.id);
  await refetch();
};
```

---

## 8. Drawer Pattern

Use Sheet/Drawer for detail views instead of full-page navigation. User stays on current page.

```tsx
// Profile opened in drawer from any page
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent side="right" className="w-full sm:max-w-lg">
    <ProfileContent />
  </SheetContent>
</Sheet>

// Task opened in drawer from timeline
<TaskEditDialog
  taskId={selectedTaskId}
  projectId={projectId}
  variant="sheet"  // "dialog" | "sheet"
/>
```

---

## 9. Table UX Checklist

Every data table should support:

- [ ] Column reorder (drag headers)
- [ ] Column show/hide (column picker + right-click → hide)
- [ ] Sort (click header, asc/desc/none)
- [ ] Compact mode toggle
- [ ] Search/filter
- [ ] Sticky first column + header
- [ ] Saved preferences (localStorage + server sync)
- [ ] Right-click context menu on headers
- [ ] Visual column separators
- [ ] Consistent font sizing

---

## 10. Commit & Deploy Cadence

### Commit rules
- Commit after every completed change — never batch unrelated work
- Never commit half-finished or unconfirmed work
- Descriptive messages: what + why, not just what

### Push rules
- Don't auto-push — commit frequently, push at natural breakpoints (1-3x/day)
- Push when user asks, or at session end
- Always verify before push: `tsc --noEmit` + `vite build`

### Pre-commit checklist
```bash
npx tsc --noEmit          # No type errors
npx vite build            # Builds successfully
# grep -r "console.log" src/  # No debug logs
```

---

## 11. Persona System

For strategic decisions, use AI personas that read a shared sprint brief and contribute their perspective:

| Persona | Focus |
|---|---|
| CEO | Prioritization, strategy |
| CTO | Architecture, security, performance |
| UX Designer | Layout, navigation, usability |
| Domain Expert | Industry terminology, workflows |

**Rules:**
- Personas analyze and recommend — they never write code
- All personas read the same sprint brief
- Escalate cross-cutting questions to CEO persona

---

## 12. Session Routines

### On "hej" / session start
1. Read memory (MEMORY.md + relevant topic files)
2. Check git status
3. Give status update on recent work
4. List pending tasks

### On "bye" / session end
1. Commit any uncommitted work
2. Update memory with new learnings
3. Note any pending migrations or deploys
4. Save sprint context for next session

### On feature completion
1. TypeScript check
2. Build check
3. Commit with descriptive message
4. Update memory if architectural decisions were made
5. Update feature map if new features added

---

## 13. A/B Testing New Designs

When redesigning existing UI, don't replace — add alongside:

1. Build new component in separate folder
2. Scope new CSS/tokens to a wrapper class
3. Add toggle in existing page to switch views
4. Test both side by side
5. Migrate when satisfied

---

## 14. Shared Component Patterns

When the same UI pattern appears in 3+ places, extract a shared component:

```
src/components/shared/
├── SupplierAutocomplete.tsx   ← Used in BudgetTab, TasksTab, PurchasesTab
├── AttachmentIndicator.tsx    ← Used in all tables
├── FilePreviewPopover.tsx     ← Used everywhere files are shown
└── MultiRoomSelect.tsx        ← Used in tasks, materials, rooms
```

**Rule:** If you're copying onClick/render logic from one table to another, extract it.

---

## 15. Destructive Change Protocol

For changes that can break production (RLS policies, schema changes, data migrations):

1. **Write revert SQL first** — before the migration
2. **Test locally** if possible (Docker + `supabase start`)
3. **Push one migration at a time**
4. **Verify between pushes** — check the app works
5. **Keep SQL Editor open** as emergency backup
6. **60-second rule** — if push succeeds but app crashes, revert within 60 seconds

---

## 16. Mobile-First Verification

After every UI change:
- Test at 375px width (iPhone SE)
- Check overflow (no horizontal scroll on body)
- Verify touch targets are 44px+
- Test drawer/dialog dismissal on mobile

---

## 17. Data Consistency Patterns

### Terminology lockdown
Pick user-facing terms early and enforce them everywhere:
- One word per concept (not "ÄTA" in code + "Tillägg" in UI)
- i18n keys match the user-facing term
- DB values are English, translated at display time

### Dual-counting prevention
When the same data appears in multiple views:
- Define ONE source of truth
- Other views derive, never duplicate
- Document which view is authoritative

---

## Quick Reference

```bash
# TypeScript check
npx tsc --noEmit

# Build
npx vite build

# Push migration
npx supabase db push

# Regenerate types after migration
npx supabase gen types typescript --project-id <ref> > src/integrations/supabase/types.ts

# Start dev server
npx vite --port 5173
```

---

*This guide is a living document. Update it as new patterns emerge.*
