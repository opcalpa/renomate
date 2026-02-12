# Analytics Events Implementation Guide

## Översikt

PostHog är integrerat och redo att användas. Events skickas endast om `VITE_POSTHOG_KEY` är konfigurerad.

**Aktivera:**
```bash
# Skapa konto på posthog.com (välj EU region för GDPR)
# Kopiera Project API Key

# Lägg till i .env:
VITE_POSTHOG_KEY=phc_xxxxxxxxxxxxx

# Lägg till i Cloudflare Pages Environment Variables för produktion
```

---

## Implementerade Events ✅

| Event | Fil | Trigger |
|-------|-----|---------|
| `onboarding_started` | WelcomeModal.tsx | Modal öppnas |
| `onboarding_step_completed` | WelcomeModal.tsx | Språk/användartyp valt |
| `onboarding_completed` | WelcomeModal.tsx | Quick start valt |
| `project_created` | Projects.tsx | Nytt projekt sparat |
| `task_created` | TasksTab.tsx | Ny uppgift skapad |
| `receipt_analyzed` | QuickReceiptCaptureModal.tsx | AI analyserar kvitto |
| `receipt_captured` | QuickReceiptCaptureModal.tsx | Kvitto sparat |
| User identified | useAuthSession.ts | Inloggning |
| User reset | useAuthSession.ts | Utloggning |

---

## Rekommenderade Events att Lägga Till

### Hög Prioritet (Activation Funnel)

| Event | Fil | Var | Properties |
|-------|-----|-----|------------|
| `onboarding_checklist_step_clicked` | OnboardingChecklist.tsx | När "Show me" klickas | `{ step, had_link }` |
| `onboarding_dismissed` | OnboardingChecklist.tsx | När checklistan stängs | `{ completed_steps, total_steps }` |
| `demo_project_opened` | Projects.tsx / ProjectDetail.tsx | När demo-projekt öppnas | `{ first_time }` |
| `room_created` | RoomsList.tsx eller store.ts | Nytt rum via lista | `{ method: 'list' \| 'canvas' }` |
| `room_drawn` | UnifiedKonvaCanvas.tsx | Rum ritat på canvas | `{ tool: 'rectangle' \| 'polygon', area_sqm }` |

### Medium Prioritet (Engagement)

| Event | Fil | Var | Properties |
|-------|-----|-----|------------|
| `canvas_opened` | FloorMapEditor.tsx | Space Planner öppnas | `{ has_shapes, shape_count }` |
| `canvas_tool_used` | UnifiedKonvaCanvas.tsx | Verktyg väljs | `{ tool }` |
| `canvas_shape_created` | store.ts (addShape) | Ny shape skapad | `{ type, tool }` |
| `canvas_view_changed` | SpacePlannerTopBar.tsx | Floor/Elevation/3D | `{ view }` |
| `room_details_viewed` | PropertyPanel.tsx | Rum-panel öppnas | `{ has_description, has_tasks }` |
| `room_details_updated` | useRoomForm.ts | Rum sparas | `{ fields_filled }` |
| `tab_viewed` | ProjectDetail.tsx | Tab byts | `{ tab, project_type }` |
| `file_uploaded` | EntityPhotoGallery.tsx | Fil laddas upp | `{ type: 'photo' \| 'document', entity_type }` |
| `comment_added` | CommentsSection.tsx | Kommentar sparas | `{ entity_type, has_mention }` |

### Lägre Prioritet (Features)

| Event | Fil | Var | Properties |
|-------|-----|-----|------------|
| `team_member_invited` | TeamManagement.tsx | Inbjudan skickas | `{ role }` |
| `quote_created` | CreateQuote.tsx | Offert skapad | `{ has_rot, item_count }` |
| `quote_sent` | ViewQuote.tsx | Offert skickad | - |
| `quote_accepted` | ViewQuote.tsx | Kund accepterar | - |
| `purchase_order_created` | PurchaseRequestsTab.tsx | Inköp skapad | `{ has_room, quick_mode }` |
| `help_bot_opened` | HelpBot.tsx | HelpBot öppnas | - |
| `feedback_submitted` | Feedback.tsx | Feedback skickas | `{ type }` |

---

## Hur Man Lägger Till Ett Event

### 1. Importera analytics

```typescript
import { analytics, AnalyticsEvents } from "@/lib/analytics";
```

### 2. Anropa capture

```typescript
// Med fördefinierat event
analytics.capture(AnalyticsEvents.PROJECT_CREATED, {
  has_description: Boolean(description),
  project_type: type,
});

// Med custom event (för nya events)
analytics.capture("custom_event_name", {
  property: "value",
});
```

### 3. Vanliga properties att inkludera

```typescript
// Booleans för "har användaren fyllt i X?"
has_description: Boolean(description),
has_room: Boolean(roomId),

// Kategorier/typer
project_type: "renovation",
tool: "wall",
view: "elevation",

// Counts (anonymiserade)
item_count: items.length,
fields_filled: countFilledFields(formData),

// Undvik PII (personuppgifter)!
// ALDRIG: email, name, phone, address
```

---

## PostHog Dashboard Tips

### Skapa Funnels

```
Onboarding Funnel:
1. onboarding_started
2. onboarding_step_completed (step=language)
3. onboarding_step_completed (step=user_type)
4. onboarding_completed
5. project_created
```

### Retention Analysis

```
First event: project_created
Return event: task_created OR room_drawn
```

### Feature Adoption

```
Group by: user_type (homeowner vs contractor)
Events: canvas_opened, receipt_captured, quote_created
```

---

## GDPR-Checklista

- [x] EU datacenter (eu.i.posthog.com)
- [x] Respekterar Do Not Track
- [x] Inga PII i events
- [x] Session recording maskar inputs
- [ ] Lägg till cookie consent banner (rekommenderas)
- [ ] Uppdatera Privacy Policy

---

## Debugging

```typescript
// I development, logga events till console
if (!import.meta.env.PROD) {
  console.log("[Analytics]", event, properties);
}

// PostHog debug mode (i browser console)
posthog.debug();
```

---

## Nästa Steg

1. **Nu:** Skapa PostHog-konto → Lägg till `VITE_POSTHOG_KEY`
2. **Denna vecka:** Lägg till events för onboarding-checklistan
3. **Nästa vecka:** Skapa funnels i PostHog dashboard
4. **Löpande:** Lägg till events för nya features

---

*Senast uppdaterad: 2026-02-12*
