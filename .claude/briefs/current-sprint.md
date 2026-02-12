# Sprint 2026-W07 (10-16 feb)

## Kontext

- **Aktiva användare:** ~50 beta-testare
- **Största feedback:** "Svårt att komma igång", "Appen känns komplex"
- **Nyligen lanserat:** Mobile bottom nav, HelpBot med quick prompts, Tips-sida
- **Teknisk status:** Inga kritiska buggar kända

## Mål denna sprint

Fokus: **Activation** — hjälp nya användare nå värde snabbare

## CEO-beslut (2026-02-09, uppdaterad)

**Kontext:** Fyra specialister har loggat 20 kritiska fynd. Med begränsade resurser (1 utvecklare + AI) och 50 beta-testare fokuserar vi på: (1) stoppa säkerhetsläcka, (2) lösa största användarfeedback.

| Prio | Område | Ansvarig | Status | Insats | Varför nu |
|------|--------|----------|--------|--------|-----------|
| **1** | Guidad onboarding efter signup | UX | Ej påbörjad | Medium | Största användarfeedback: "Svårt att komma igång". Activation före retention. |
| 2 | Tomma tillstånd med CTAs (Tasks, Purchases, Budget) | UX | Ej påbörjad | Liten | 1 dag/vy, hög effekt. Kompletterar onboarding. |
| 3 | Breadcrumbs / kontextnavigering | UX | Ej påbörjad | Liten | Hjälper användare orientera sig. |

**AVSKRIVET:** Pinterest-säkerhet — INTE en risk. Appen använder oEmbed (publikt API utan nyckel), inte OAuth. Filen `pinterest.ts` är död kod som aldrig anropas.

### Parkerat

| Område | Väntar på | Varför parkerat |
|--------|-----------|-----------------|
| **Fullt offline-stöd** | Aktiva fältanvändare (>10 st) | 2-3 veckors arbete. Ingen av 50 testare har specifikt klagat på offline. Vi måste först bevisa att folk tar sig förbi onboarding. |
| **Offline read-only (light)** | Sprint 2 (v.8-9) | Bra kompromiss från Platschefen. 3-5 dagars insats. Kommer direkt efter onboarding. |
| **UnifiedKonvaCanvas-refaktorering** | Löpande | 4892 rader, 10x över gräns. Viktigt men blockerar inte användare. Arbeta inkrementellt 30min/dag. |
| **Canvas snapping + live-mått** | >100 Canvas-användare | Arkitektens förslag korrekt, men 5+ dagars arbete för få användare. |
| **Elevation-förbättringar** | Fler Canvas-användare | Låg användning idag. |
| **Fliktomstrukturering (7→4)** | Kvalitativ user research | Stor insats (1 vecka), osäker effekt. Behöver intervjua användare först. |
| **History-prestanda (immer.js)** | Projekt med >500 shapes | 8-12h insats. Ingen har rapporterat lagg ännu. |
| **DB-index** | Prestandaproblem observeras | 2-4h insats. Ingen synlig långsamhet. |
| **Betalningsintegration** | 100+ aktiva användare | Pre-revenue, för tidigt. |

### Svar till Platschefen

**Fråga:** Ska offline-stöd prioriteras före onboarding?

**Svar:** Nej, men "offline read-only" är nästa sprint.

**Motivering:**
1. 0/50 testare har klagat specifikt på offline
2. 50/50 testare träffar onboarding — det är där vi tappar folk
3. Vi kan inte mäta värdet av fältfunktioner om ingen tar sig förbi "vad gör jag nu?"
4. Pinterest-säkerheten är en tickande bomb som måste fixas oavsett

**Kompromiss:** Offline read-only (casha ritningar + uppgiftslista) kommer i sprint 2 om onboarding-metrikerna förbättras. Det ger 80% av värdet med 20% av insatsen.

---

## Specialist-logg

### UX-Designer

**Datum:** 2026-02-09 (uppdaterad)

**Analys:** Djupgående onboarding-analys med mobil-optimering

---

## KOMPLETT ONBOARDING-ANALYS (MOBIL-FOKUS)

### Nuvarande flöde — steg för steg

```
STEG 1: WelcomeModal — Språkval
┌──────────────────────────────────────┐
│         Välj ditt språk              │
├──────────────────────────────────────┤
│ 🇬🇧 │ 🇸🇪 │ 🇩🇪 │ 🇫🇷 │ 🇪🇸 │  ← 5-kolumns grid
│ 🇵🇱 │ 🇺🇦 │ 🇷🇴 │ 🇱🇹 │ 🇪🇪 │  ← 10 språk totalt
├──────────────────────────────────────┤
│         [ Fortsätt ]                 │
└──────────────────────────────────────┘
      ↓
STEG 2: WelcomeModal — Användartyp
┌──────────────────────────────────────┐
│ ← Tillbaka                           │
│       Välkommen till Renomate        │
│    Vilken beskriver dig bäst?        │
├──────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐      │
│  │    🏠      │  │    🔧      │      │
│  │  Husägare  │  │ Entreprenör│      │
│  │  "Jag äger │  │ "Jag arb.. │      │
│  └────────────┘  └────────────┘      │
├──────────────────────────────────────┤
│         [ Fortsätt ]                 │
└──────────────────────────────────────┘
      ↓
STEG 3: Projects-sidan (efter onComplete)
┌──────────────────────────────────────┐
│ [Logo]              [Språk] [Profil] │
├──────────────────────────────────────┤
│ ┌ OnboardingChecklist ─────────────┐ │
│ │ ⎯⎯⎯⎯⎯⎯⎯●○○○○ 1/5 steg            │ │
│ │                                   │ │
│ │ ● Skapa ditt första projekt      │ │
│ │ ○ Öppna Space Planner            │ │
│ │ ○ Rita ett rum                   │ │
│ │ ○ Generera väggar (valfritt)     │ │
│ │ ○ Skapa uppgift kopplad till rum │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌ Demo-projekt (seedat) ────────────┐ │
│ │ 📖 DEMO — Utforska funktionerna   │ │
│ └───────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

### MOBIL-PROBLEM I NUVARANDE FLÖDE

| # | Problem | Komponent | Allvarlighet |
|---|---------|-----------|--------------|
| 1 | **5-kolumns grid är för trångt** | WelcomeModal steg 1 | KRITISK |
| 2 | **Ingen touch-anpassning av knappar** | WelcomeModal båda steg | HÖG |
| 3 | **OnboardingChecklist tar 40% av skärmen** | Projects.tsx | HÖG |
| 4 | **"Show me"-knappen leder till desktop-Canvas** | OnboardingChecklist | KRITISK |
| 5 | **Ingen "quick start" för mobil-användare** | WelcomeModal steg 2 | MEDIUM |

---

### PROBLEM 1: Språkval-grid oanvändbart på mobil

**Nuvarande kod (WelcomeModal.tsx:116):**
```tsx
<div className="grid grid-cols-5 gap-3 py-4">
```

**Resultat på 375px-skärm (iPhone SE):**
- Varje språkknapp blir ~56px bred
- Touch target under Apple's 44px minimum? Nej, men texten trunkeras
- Flaggorna "🇬🇧" syns, men "English" / "Svenska" blir mikroskopiska

**Lösning:**
```tsx
// Responsiv grid med större touch targets
<div className="grid grid-cols-2 sm:grid-cols-5 gap-3 py-4">
  {LANGUAGES.slice(0, 4).map(...)}  // Visa top 4 direkt
</div>
<Button variant="ghost" onClick={showAllLanguages}>
  + 6 fler språk
</Button>
```

---

### PROBLEM 2: Användartyp-kortens touch target

**Nuvarande (WelcomeModal.tsx:172-178):**
```tsx
<button className="p-6 rounded-xl ...">
  <div className="h-14 w-14 rounded-full ...">  // 56px ikon
  <div className="text-center">
    <p className="font-medium">{t(labelKey)}</p>
    <p className="text-sm ...">{t(descKey)}</p>  // Beskrivning syns knappt
  </div>
</button>
```

**Problem:**
- `p-6` = 24px padding — bra för desktop, slösar plats på mobil
- Beskrivningen (`descKey`) är för liten på 375px-skärm
- 2-kolumns grid tvingar sidoscroll om text är lång (t.ex. tyska)

**Lösning:**
```tsx
// Mobil: vertikal stack, Desktop: grid
<div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
  <button className="p-4 sm:p-6 flex items-center sm:flex-col gap-4 sm:gap-3">
```

---

### PROBLEM 3: OnboardingChecklist dominerar mobil-skärmen

**Nuvarande (OnboardingChecklist.tsx):**
- Card med header + progress bar + 5 expanderbara steg
- På 667px-hög skärm tar checklistan ~280px (42% av viewport)
- Projektkort hamnar "below the fold"

**Platschefens perspektiv:** En montör som öppnar appen på bygget vill se SITT projekt — inte en checklista hen redan har sett 10 gånger.

**Lösning:**
```tsx
// Kompakt mobilvy med expanderbar detalj
<Card className="mb-4 sm:mb-6">
  <CardHeader className="pb-2 sm:pb-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 sm:h-5 sm:w-5" />
        <span className="text-sm sm:text-base font-medium">
          {completedCount}/{totalSteps} steg klara
        </span>
      </div>
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" onClick={toggleExpand}>
          {expanded ? <ChevronUp /> : <ChevronDown />}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <Progress value={progressPercent} className="h-1.5 sm:h-2 mt-2" />
  </CardHeader>
  {expanded && (
    <CardContent className="pt-0">
      {/* Steg-lista */}
    </CardContent>
  )}
</Card>
```

---

### PROBLEM 4: "Show me" leder till desktop-Canvas

**Nuvarande steg-länkar (OnboardingChecklist.tsx:47-61):**
```tsx
if (step.key === "drawRoom" && firstProjectId) {
  return `/projects/${firstProjectId}?tab=space-planner`;
}
```

**Problem:** Space Planner (Canvas) är INTE mobil-anpassad:
- Toolbar-ikoner för små för fingrar
- Pinch-zoom konkurrerar med canvas-pan
- Ingen "view only"-läge
- Rita rum med fingret = frustrerande

**Lösning — mobil-specifika steg:**

| Steg | Desktop-mål | Mobil-mål |
|------|-------------|-----------|
| `project` | Skapa projekt | **Samma** |
| `enterCanvas` | Space Planner | **Rum-lista** (ny vy) |
| `drawRoom` | Rita i Canvas | **Öppna Demo-projekt och visa befintliga rum** |
| `taskWithRoom` | Skapa task i Tasks-flik | **Samma, men med touch-optimerad dialog** |

```tsx
const getStepLink = (step: OnboardingStep): string | undefined => {
  const isMobile = window.innerWidth < 768;

  if (step.key === "enterCanvas" && firstProjectId) {
    return isMobile
      ? `/projects/${firstProjectId}?tab=overview#rooms`  // Scrolla till rum-sektion
      : `/projects/${firstProjectId}?tab=space-planner`;
  }
  // ...
};
```

---

### PROBLEM 5: Saknar "Quick Start" för mobilanvändare

**Insikt:** Husägare på mobil vill oftast:
1. Dokumentera befintligt tillstånd (ta foton)
2. Skapa enkla att-göra-listor
3. Bjuda in hantverkare

De vill INTE rita planlösningar med fingret.

**Förslag — ny steg 3 i WelcomeModal:**

```
STEG 3 (NY): Vad vill du göra först?
┌──────────────────────────────────────┐
│         Vad vill du göra först?      │
├──────────────────────────────────────┤
│ ┌───────────────────────────────────┐│
│ │ 📱 Dokumentera mitt hem           ││
│ │    Ta foton och skapa rum-lista   ││
│ └───────────────────────────────────┘│
│ ┌───────────────────────────────────┐│
│ │ ✏️ Rita planlösning               ││
│ │    Skapa 2D-ritning (desktop rec.)││
│ └───────────────────────────────────┘│
│ ┌───────────────────────────────────┐│
│ │ 🔍 Utforska Demo-projektet        ││
│ │    Se hur appen fungerar          ││
│ └───────────────────────────────────┘│
└──────────────────────────────────────┘
```

**Beroende på val:**
- "Dokumentera" → Skapa tomt projekt → Overview med kamera-prompt
- "Rita" → Skapa projekt → Space Planner (visa varning på mobil)
- "Utforska" → Öppna Demo-projekt

---

## IMPLEMENTERINGSPLAN — MOBIL-OPTIMERAD ONBOARDING

### Fas 1: Quick wins (1-2 dagar)

| # | Ändring | Fil | Insats |
|---|---------|-----|--------|
| 1 | Responsiv språkgrid (2-col på mobil) | WelcomeModal.tsx | 30 min |
| 2 | Komprimera OnboardingChecklist på mobil | OnboardingChecklist.tsx | 2h |
| 3 | Större touch targets på användartyp-kort | WelcomeModal.tsx | 1h |
| 4 | Dölja steg som kräver Canvas på mobil | OnboardingChecklist.tsx | 1h |

### Fas 2: Nytt steg 3 med intentionsval (2-3 dagar)

| # | Ändring | Fil | Insats |
|---|---------|-----|--------|
| 5 | Lägg till steg 3 i WelcomeModal | WelcomeModal.tsx | 4h |
| 6 | Hantera "Dokumentera"-flödet | Projects.tsx, useOnboarding.ts | 4h |
| 7 | Lägg till i18n-nycklar | en.json, sv.json | 1h |

### Fas 3: Mobil-specifik Canvas-alternativ (5+ dagar)

| # | Ändring | Fil | Insats |
|---|---------|-----|--------|
| 8 | "Field Mode" i Space Planner | Ny komponent | 3-5 dagar |
| 9 | Rum-lista som Canvas-alternativ på mobil | OverviewTab.tsx | 2 dagar |

---

## MÄTVÄRDEN FÖR FRAMGÅNG

| Metrik | Nuläge (uppskattning) | Mål |
|--------|----------------------|-----|
| Signup → First project (mobil) | ~30% | 60% |
| Signup → First project (desktop) | ~50% | 70% |
| Onboarding completion rate | ~15% | 40% |
| Demo-projekt öppnat | ~40% | 60% |

---

## DE 5 STÖRSTA UX-PROBLEMEN (ORIGINAL)

### 1. ONBOARDING SAKNAR TYDLIGT MÅL (Kritisk)

**Problem:** WelcomeModal frågar "Husägare eller Entreprenör?" men gör sedan ingenting med svaret. Användaren kastas direkt till en tom projektlista utan guidning. Demo-projektet seedas automatiskt men förklaras inte.

**Cognitive load:** Hög. Användaren ser 10 språk, 2 användartyper, sedan plötsligt en projektlista med ett mystiskt "Demo"-projekt.

```
Nuvarande flöde:
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Välj språk      │ --> │  Husägare/       │ --> │  Tom projektvy   │
│  (10 alternativ) │     │  Entreprenör     │     │  + Demo-projekt  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                         │
                                                    INGEN GUIDNING
                                                    "Vad gör jag nu?"
```

**Rekommenderat flöde:**
```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Välj språk      │ --> │  Vad vill du     │ --> │  Guidad första   │
│  (top 5 + mer)   │     │  göra först?     │     │  åtgärd          │
└──────────────────┘     │  - Skapa projekt │     └──────────────────┘
                         │  - Utforska demo │
                         │  - Bjud in team  │
                         └──────────────────┘
```

**Insats:** Medium (2-3 dagar)

---

### 2. PROJEKTDETALJSIDAN HAR FÖR MÅNGA FLIKAR (Kritisk)

**Problem:** 7 huvudflikar på desktop (Overview, Space Planner, Files, Tasks, Purchases, Budget, Team) + underflikar. På mobil döljs 4 flikar bakom "More"-menyn.

**Hicks lag:** Beslutstiden ökar logaritmiskt med antalet val. 7+ val = paralys.

```
Desktop navigation:
┌────────────────────────────────────────────────────────────────────┐
│ Overview │ Space Planner │ Files │ Tasks │ Purchases │ Budget │ Team │
└────────────────────────────────────────────────────────────────────┘
     │           │                                              │
     ▼           ▼                                              │
  +Feed      +Floor Plan                                        │
             +Rooms                                             │
                                                                │
Mobil:                                                          │
┌──────────────────────────────────────────────────────────┐    │
│ Overview │ Plans │ Tasks │ Purchases │ More (4 dolda)   │ <──┘
└──────────────────────────────────────────────────────────┘
```

**Förslag:** Gruppera logiskt:

| Nuvarande | Förslag |
|-----------|---------|
| Overview | **Hem** (dashboard + feed) |
| Space Planner + Files | **Planering** (rita + dokument) |
| Tasks + Purchases | **Arbete** (uppgifter + material) |
| Budget | Behåll |
| Team | Flytta till projektinställningar |

**Insats:** Stor (1 vecka) - kräver omstrukturering

---

### 3. TOMMA TILLSTÅND ÄR INTE HJÄLPSAMMA (Hög)

**Problem:** När användaren öppnar Tasks-fliken utan uppgifter visas troligen bara en tom lista. Samma för Purchases, Budget etc. Det finns ingen uppmaning till handling.

**Bra empty state-mönster:**
```
┌─────────────────────────────────────────────┐
│                                             │
│        [Illustration]                       │
│                                             │
│     Inga uppgifter ännu                     │
│                                             │
│  Skapa din första uppgift för att hålla    │
│  koll på vad som behöver göras.            │
│                                             │
│        [ + Skapa uppgift ]                  │
│                                             │
│  Tips: Du kan koppla uppgifter till rum    │
│  i din planritning för bättre överblick.   │
│                                             │
└─────────────────────────────────────────────┘
```

**Insats:** Liten (1 dag per vy, finns ~5-6 vyer)

---

### 4. MOBILUPPLEVELSEN I SPACE PLANNER (Kritisk för fältarbetare)

**Problem:** Space Planner är designad för desktop med toolbar, miniatyr, layers-panel. På mobil blir det oanvändbart för att:
- Touch targets är för små (verktygsikoner)
- Pinch-zoom konkurrerar med canvas-pan
- Ingen "view only"-läge för fältarbetare som bara vill se ritningen

**Platschefens användningsfall:**
- Se vilka rum hen ska arbeta i idag
- Läsa mått och anteckningar
- Markera uppgifter som klara

**Förslag:**
```
Mobil "Field Mode":
┌─────────────────────────────────────┐
│  < Tillbaka    Projekt X    [👁️]   │  <- Endast visa-läge
├─────────────────────────────────────┤
│                                     │
│        [Förenklad ritning]          │
│        - Endast rum synliga         │
│        - Tydliga rumsnamn           │
│        - Tap för att öppna rum      │
│                                     │
├─────────────────────────────────────┤
│  Kök  │  Badrum  │  Sovrum  │  ...  │  <- Rumlista som alternativ
└─────────────────────────────────────┘
```

**Insats:** Stor (1 vecka) - ny mobilvy för canvas

---

### 5. NAVIGATION SAKNAR BREADCRUMBS OCH KONTEXT (Medium)

**Problem:** Användaren vet inte alltid var de är. Exempel:
- I projektdetalj visas projektnamnet på mobil men inte på desktop
- Rum-dialogen öppnas som modal utan att visa vilket projekt man är i
- "Back"-knappen i Space Planner går till "previousTab" som kan vara förvirrande

**Förslag:**
```
Desktop header med breadcrumbs:
┌────────────────────────────────────────────────────────────┐
│ [Logo]  Mina projekt / Köksrenovering / Uppgifter         │
└────────────────────────────────────────────────────────────┘

Mobil header:
┌────────────────────────────────────────────────────────────┐
│ < Projekt    Köksrenovering    [⋮]                         │
└────────────────────────────────────────────────────────────┘
```

**Insats:** Liten (1-2 dagar)

---

## YTTERLIGARE OBSERVATIONER

### Positiva mönster (behåll):
- OnboardingChecklist med progress-bar är bra
- Demo-projekt med exempeldata hjälper förståelse
- Hotspots (WithHotspot) för att guida till viktiga funktioner
- MobileBottomNav med "More"-meny är standard och fungerar

### Mindre problem att åtgärda:
1. **Språkväljaren i WelcomeModal:** 10 språk i ett 5-kolumns grid är visuellt rörigt. Visa top 3-5 med "Fler språk"-knapp.
2. **Projektkortet:** Visar status som råtext ("active") utan översättning eller badge-styling.
3. **Header på desktop:** "Pro"-dropdown visas bara för professionals men tar plats. Bör vara sekundärt.
4. **Tasks-fliken:** Kanban + Table + Timeline på samma sida = överväldigande vid första besök.

---

## PRIORITERAD HANDLINGSPLAN

| Prio | Åtgärd | Insats | Effekt på activation |
|------|--------|--------|----------------------|
| 1 | Guidad onboarding efter signup | Medium | Hög |
| 2 | Tomma tillstånd med CTAs | Liten | Hög |
| 3 | Förenkla mobil-canvas till "view mode" | Stor | Hög för fältarbetare |
| 4 | Breadcrumbs/kontextnavigering | Liten | Medium |
| 5 | Gruppera flikar (långsiktigt) | Stor | Medium |

---

**Prioritet:** Kritisk (onboarding), Hög (empty states, mobil), Medium (navigation)
**Förslag:** Börja med #1 och #2 denna sprint - ger mest värde för minst insats
**Insats:** Liten-Medium för quick wins, Stor för canvas-mobil

---

### CTO

**Datum:** 2026-02-09

## KRITISK TEKNISK GRANSKNING - Renomate

Analyserade: Prestanda, Sakerhet, Skalbarhet, Teknikskuld, DX

---

### DE 5 STORSTA TEKNISKA RISKERNA

---

#### RISK 1: PINTEREST CLIENT SECRET EXPONERAS I FRONTEND (KRITISK SAKERHETSBRIST)

**Fil:** `src/services/pinterest.ts` rad 12-13, 102, 133

**Problem:** `VITE_PINTEREST_CLIENT_SECRET` läses i browser och skickas till Pinterest API. DevTools avslöjar hemligheten.

```typescript
// EXPONERAD HEMLIGHET!
const PINTEREST_CLIENT_SECRET = import.meta.env.VITE_PINTEREST_CLIENT_SECRET;
'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
```

**Paverkan:**
- Attackerare kan missbruka vart Pinterest-konto
- Bryter mot Pinterest API ToS
- Potentiell dataincident

**Prioritet:** KRITISK - atgarda OMEDELBART

**Forslag:**
1. IDAG: Dolj Pinterest-knappar i UI (5 min hotfix)
2. DENNA VECKA: Flytta OAuth till Edge Function `pinterest-oauth`
3. Ta bort `VITE_PINTEREST_CLIENT_SECRET` fran frontend

**Insats:** Medium (4-6h permanent fix)

---

#### RISK 2: UNIFIEDKONVACANVAS - 4892 RADER (10x OVER GRANS)

**Fil:** `src/components/floormap/UnifiedKonvaCanvas.tsx`

| Metrik | Varde | Grans (CLAUDE.md) | Overträdelse |
|--------|-------|-------------------|--------------|
| Rader | 4892 | 500 | 9.8x |
| useEffect | 13 | - | Komplex beroendehantering |
| any-typ | 74 | 0 | Bryter typsäkerhet |
| useState | ~50 | - | Enormt lokalt state |

**Nuvarande struktur:**
```
UnifiedKonvaCanvas.tsx (4892 rader)
├── Event handlers (mouse, keyboard, touch)
├── Drawing logic (wall, room, freehand, bezier)
├── Selection (single, multi, marquee, group)
├── Keyboard shortcuts
├── Template/symbol placement
├── Measurement tool
├── Context menu
├── CAD numeric input
└── Dialog triggers
```

**Prioritet:** Hog

**Forslag - stegvis extraktion:**
```
UnifiedKonvaCanvas.tsx (mal: ~800 rader)
├── hooks/
│   ├── useCanvasEventHandlers.ts
│   ├── useDrawingMode.ts
│   └── useSelection.ts
└── components/
    ├── CADNumericInput.tsx
    └── MeasurementOverlay.tsx
```

**Insats:** Stor (2-3 veckor inkrementellt)

---

#### RISK 3: HISTORY MED JSON.PARSE/STRINGIFY - O(n) PER ANDRING

**Fil:** `src/components/floormap/store.ts` (26 forekomster)

**Problem:** Varje shape-andring deep-clonar HELA arrayen:
```typescript
newHistory.push(JSON.parse(JSON.stringify(newShapes)));
```

**Prestandatabell:**
| Shapes | Tid/edit | Upplevelse |
|--------|----------|------------|
| 100 | ~4ms | OK |
| 500 | ~20ms | Markbart lagg |
| 1000 | ~40ms | Frustrerande |
| 5000 | ~200ms | Oanvandbar |

**Prioritet:** Hog (blockerar skalning)

**Forslag:**
1. Implementera `immer.js` for strukturell delning
2. Throttla history till max 1/sekund
3. Begransa history till 50 steg

**Insats:** Medium (8-12h)

---

#### RISK 4: SAKNADE DATABAS-INDEX

**Observerade queries utan index:**
```typescript
// ProjectTimeline.tsx:162 - Hamtar ALLA dependencies
await supabase.from("task_dependencies").select("*")  // Ingen WHERE!
```

**Saknade/overifierade index:**
- `floor_map_shapes(plan_id)` - kritiskt
- `task_dependencies(task_id)`
- `comments(drawing_object_id)`

**Prioritet:** Medium

**Forslag:**
```sql
CREATE INDEX IF NOT EXISTS idx_floor_map_shapes_plan_id
  ON floor_map_shapes(plan_id);
```

**Insats:** Liten (2-4h)

---

#### RISK 5: STORA FILER - TEKNIKSKULD

| Fil | Rader | Atgard |
|-----|-------|--------|
| UnifiedKonvaCanvas.tsx | 4892 | Se Risk 2 |
| TasksTab.tsx | 2444 | Splitta |
| ElevationCanvas.tsx | 2214 | Extrahera hooks |
| store.ts | 1124 | Bryt ut history |
| ProjectTimeline.tsx | 1437 | Splitta |

**Prioritet:** Medium (lopande)

---

### POSITIVA OBSERVATIONER

| Omrade | Status |
|--------|--------|
| RLS pa alla tabeller | 19/19 tabeller |
| console.log i prod | Endast 4 st |
| Supabase-klient | Centraliserad |
| Shape-komponenter | Extraherade (4011 rader i shapes/) |

---

### PRIORITERAD HANDLINGSPLAN

| # | Risk | Prioritet | Insats | Nar |
|---|------|-----------|--------|-----|
| 1 | Pinterest Secret | KRITISK | 4-6h | DENNA VECKA |
| 2 | History-prestanda | Hog | 8-12h | Fore 500+ shapes |
| 3 | Canvas-split | Hog | 2-3v | Inkrementellt |
| 4 | DB-index | Medium | 2-4h | Nasta sprint |
| 5 | Ovriga filer | Medium | Lopande | Kontinuerligt |

---

### FRAGA TILL CEO

**Pinterest-sakerhet:** Pinterest ar "parkerat" men hemligheten lackes fortfarande.

**Rekommendation:**
1. IDAG: Dolj Pinterest-knappar i UI (5 min)
2. DENNA VECKA: Bygg Edge Function
3. Ta bort VITE_PINTEREST_CLIENT_SECRET

Ska jag genomfora steg 1 omedelbart?

---

### Inredningsarkitekt

**Datum:** 2026-02-09

**Analys:** Kritisk granskning av Space Planner (Canvas) ur arkitektperspektiv

Jag har granskat UnifiedKonvaCanvas (~2900 rader), store.ts, SymbolLibrary, objectLibraryDefinitions, ElevationCanvas, snapping-utilities och toolbar-komponenter. Nedan presenterar jag de **5 största bristerna** i ritverktyget:

---

## DE 5 KRITISKA BRISTERNA I SPACE PLANNER

### BRIST 1: OPRECIS OCH OFORUTSAGBAR SNAPPING (KRITISK)

**Nuläge vs. proffsverktyg:**

| Aspekt | Renomate | Revit/AutoCAD/SketchUp |
|--------|----------|------------------------|
| Snap-precision | 50-500mm automatiskt | Exakt till vald precision (1mm) |
| Visuella snap-indikatorer | SAKNAS | Endpoint, midpoint, perpendicular |
| Snap override | SAKNAS | Shift/Alt modifierare |
| Intelligent snap | Endast grid | Object snap, constraints |

**Problem i koden (UnifiedKonvaCanvas.tsx rad 266-289):**
```javascript
// getSnapSize() - Snap-storleken andras AUTOMATISKT:
zoom < 0.5 -> 1000mm
zoom < 1.0 -> 500mm
zoom < 2.0 -> 250mm
zoom >= 2.0 -> 50mm
```

**Konsekvens:** Användaren kan ALDRIG rita exakt 3450mm oavsett inställning.

**ASCII-illustration:**
```
Onskat (user satter 100mm snap):  Nuvarande (auto 500mm vid zoom 0.8):
┌──────────────────────────┐      ┌──────────────────────────┐
│ Vagg = 3450mm exakt      │      │ Vagg = 3500mm (avrundad) │
└──────────────────────────┘      └──────────────────────────┘
```

---

### BRIST 2: SAKNAD VISUELL FEEDBACK VID RITNING (HOG)

| Funktion | Renomate | Branschstandard |
|----------|----------|-----------------|
| Live dimension vid drag | NEJ | JA - alltid synlig |
| Vinkelvisning vid rotation | NEJ | JA |
| Referenslinjer (alignment) | NEJ | JA - automatiska |
| Tangent-input "3450 + Enter" | NEJ | JA |

**Varfor kritiskt for amator:** Husagaren vet inte om vaggen ar 3m eller 4m lang forrän de slapper musknappen och inspekterar objektet.

**Onskat beteende:**
```
         3450mm
    ┌─────────────────┐
    │    [muspekare]  │
    └─────────────────┘
          ↑
   Dynamisk matt-label som foljer musen
```

---

### BRIST 3: OBJEKTBIBLIOTEKET SAKNAR SMART PLACERING (MEDIUM-HOG)

**Nuvarande (objectLibraryDefinitions.ts):**
- Korrekta dimensioner (600mm diskho, 900mm dorr)
- wallSnap.ts finns MEN triggas inte konsekvent vid drag-and-drop
- Dorrar placeras UTANFOR vaggen, inte IN i den

**Onskat vs nuvarande:**
```
NUVARANDE (dorr bredvid vagg):    ONSKAT (dorr klipper vagg):
┌─────────────────────────┐       ┌─────────────────────────┐
│         Rum             │       │         Rum             │
│                         │       │                         │
└─────────────────────────┘       └─────────┤ 900 ├─────────┘
         [DORR]                             └─────┘
                                   850mm          2200mm
                                   └── auto-matt till horn
```

---

### BRIST 4: ELEVATION-VYN ISOLERAD (MEDIUM)

**ElevationCanvas.tsx - vad som finns:**
- Vaggvisning i sidovy ✓
- Objekt kan placeras ✓
- wallRelative-positionering ✓

**Vad som SAKNAS:**

| Funktion | Status |
|----------|--------|
| Automatisk sektion fran plan | NEJ - manuellt val |
| Snittmarkering pa planritning | NEJ |
| Bidirektionell sync | BUGGY |
| Materialvisning | NEJ |

**Arkitektperspektiv:** I Revit genereras sektioner med ett klick. Har maste anvandaren navigera till rätt rum/vägg manuellt.

---

### BRIST 5: INGA LAGER (LAYERS) (MEDIUM)

**Saknas helt:**
- Layer-system (väggar, möbler, el, VVS)
- Låsa/dölja lager
- Linjetjocklek per objekttyp
- SS-EN ISO 7519 standardsymboler

**Konsekvens:** Vid utskrift blir allt samma tjocklek - oanvandbart for hantverkare.

**Onskat:**
```
Layers-panel:
┌──────────────────────────┐
│ [✓] [🔒] Vaggar      ═══ │
│ [✓] [ ] Dorrar/Fonster   │
│ [✓] [ ] Mobler       ─── │
│ [ ] [ ] El/VVS       ··· │ <- dold
└──────────────────────────┘
```

---

## SAMMANFATTNING

| # | Brist | Proffs drabbas? | Amator drabbas? |
|---|-------|-----------------|-----------------|
| 1 | Oforutsagbar snapping | JA - kritiskt | JA - forvirrande |
| 2 | Ingen live-matt | JA - produktivitet | JA - forstaelse |
| 3 | Ej smart objektplacering | JA - arbetsflode | JA - resultat |
| 4 | Elevation isolerad | NEJ - workaround | JA - forvirring |
| 5 | Inga lager | JA - utskrift | NEJ |

---

**Prioritet:** Hog (brister 1-2 blockerar effektivt arbete for alla)

**Forslag:**
1. **Sprint nu:** Snap-indikatorer (endpoint, midpoint, grid) + live-mattvisning
2. **Nästa sprint:** Tangent-input "3450 + Enter" for exakta matt
3. **Framtida:** Layer-system, förbättrad dörr/fönster-autosnap

**Insats:**
- Snap-indikatorer + live-matt: MEDIUM (4-5 dagar)
- Tangent-input: STOR (5+ dagar)
- Layer-system: STOR (10+ dagar)
- Smart door/window: MEDIUM (3-4 dagar)

---

### Platschef

**Datum:** 2026-02-09

**Analys:** Kritisk granskning av Renomate ur faltarbetares perspektiv. Identifierat 5 huvudsakliga hinder for daglig anvandning pa bygget:

| # | Hinder | Allvarlighet | Beskrivning |
|---|--------|--------------|-------------|
| 1 | **Inget offline-stod** | KRITISK | Appen kraver konstant internetanslutning. Ingen PWA/service worker finns. Pa bygget (kallare, betongvaggar, utomhus) tappar man ofta natet. En hantverkare som star i ett badrum och ska rapportera material far "vit skarm" om uppkopplingen forsvinner. |
| 2 | **For manga klick for materialrapportering** | HOG | Att lagga till en inkoopsorder kraver: Oppna projekt -> Inkop-flik -> Ny order -> Fylla i formular (7+ falt i avancerat lage). "Quick mode" ar battre men fortfarande for tungt. Jamfor med att skicka ett SMS: "Behover 20 st gipsskivor till kok". |
| 3 | **Terminologi inte 100% byggsvenska** | MEDIUM | Vissa termer stammer inte med hur man pratar pa bygget. Exempel: "Stakeholder" anvands i kod (borde vara "Intressent" eller bara "Person"). "Material requester" ar IT-jargong. "Purchase order" borde vara "Bestallning" eller "Inkopslista". |
| 4 | **Fotodokumentation kopplas inte automatiskt** | MEDIUM | Fotoflödet ar bra (kamera-knapp finns!), men bilden kopplas bara till en uppgift/rum - inte till bade rum OCH uppgift samtidigt. Jag vill ta en bild pa ett problem i koket, koppla till "Koksgolv" OCH till uppgiften "Lagg klinker". |
| 5 | **Tidslinjen svarlast pa mobil** | LAG | Gantt-vyn ar for liten pa telefon. Svar att se vilka uppgifter som overlappar. For en platschef som koordinerar 5 hantverkare ar detta viktigt. |

**Arbetsflode idag vs onskad:**

```
IDAG — Rapportera material:
  Hantverkare          App (6-8 klick + vanta pa natverk)
  -----------          ----------------------------------
  Ser att material  -> Oppna app
  tar slut             -> Vanta pa inloggning/laddning
                       -> Navigera till projekt
                       -> Oppna "Inkop"-fliken
                       -> Klicka "+ Ny order"
                       -> Fylla i: Namn, Antal, Enhet, (Rum)
                       -> Klicka "Skicka"
                       -> (Om natverk saknas: FEL, borja om)

ONSKAT — Snabbrapportering:
  Hantverkare          App (2 klick + fungerar offline)
  -----------          ---------------------------------
  Ser att material  -> Oppna app
  tar slut             -> FAB-knapp "Snabborder" (alltid synlig)
                       -> Rosta eller skriv: "20 gipsskivor kok"
                       -> Klar! (Synkas nar nat finns)
```

**Prioritet:** KRITISK — Utan offline-stod kan inte appen anvandas tillforlitligt pa ett svenskt bygge.

**Forslag (prioriterad lista):**

1. **Offline-first-arkitektur** — Implementera PWA med service worker. Koa API-anrop lokalt och synka nar nat finns. Visa tydlig indikator "Offline — synkas snart". *Insats: STOR (2-3 veckor)*

2. **Snabborder FAB** — Flytande knapp pa alla sidor for snabb materialrapportering. Max 3 falt: Vad + Antal + (valfritt) Rum. Rostinmatning som bonus. *Insats: MEDIUM (3-5 dagar)*

3. **Terminologi-pass** — Ga igenom sv.json och byt ut IT-termer mot byggsvenska. Ingen kodandring, bara oversattning. *Insats: LITEN (1 dag)*

4. **Foto till multipel koppling** — Tillat att en bild kopplas till bade rum och uppgift samtidigt. *Insats: MEDIUM (2-3 dagar)*

5. **Mobilanpassad tidslinje** — Lista-vy som alternativ till Gantt pa sma skarmar. *Insats: MEDIUM (3 dagar)*

**Insats totalt:** Om vi prioriterar #1 + #2 + #3 = ca 3 veckor for att gora appen anvandbar pa falt.

**Notering:** Appen har manga BRA funktioner for faltarbete: Kameraknapp direkt i fotogalleriet, Quick Mode for inkopsordrar, bra rollhantering. Men utan offline-stod faller allt. Det spelar ingen roll hur fin appen ar om den inte fungerar i kallaren.

---

### CRO (Chief Revenue Officer)

**Datum:** 2026-02-10

**Analys:** Första kommersiella genomlysning — ICP, pricing-arkitektur, go-to-market, revenue readiness

---

## KOMMERSIELL STRATEGI — RENOMATE

### Revenue Readiness: Steg 1 (Activation)

Produkten är **inte redo för monetarisering.** Och det är korrekt. De 50 beta-testarna kämpar med "Vad gör jag nu?" — activation är olöst. Utan activation: ingen retention, utan retention: ingen revenue.

**Men:** Allt som byggs NU måste designas med den framtida intäktsmodellen i bakhuvudet. Annars byggs en produkt folk älskar men aldrig betalar för.

```
Revenue Readiness Ladder — Renomate idag:

STEG 5: SKALA                                    ○ (långt bort)
STEG 4: OPTIMERA                                 ○
STEG 3: MONETARISERA                             ○
STEG 2: RETENTION                                ◐ (okänt — behöver data)
STEG 1: ACTIVATION  ◄── NI ÄR HÄR ──►           ◐ (pågående arbete)
STEG 0: PROBLEM-FIT                              ● (validerat — renoveringsprojekt = kaos)
```

---

### ICP-MATRIS (Ideal Customer Profile)

```
┌────────────────────────────────────────────────────────────────────┐
│                   RENOMATE ICP-MATRIS                               │
├──────────────┬────────────┬──────────────┬──────────────┬──────────┤
│ Segment      │ Pain (1-10)│ Betalvilja   │ Expansion    │ Viral    │
├──────────────┼────────────┼──────────────┼──────────────┼──────────┤
│ Husägare     │ 7          │ Låg (€5-15/m)│ Låg (1 proj) │ Låg      │
│ Hantverkare  │ 6          │ Låg-Med      │ Medium       │ HÖG ★   │
│ Sm. entrepren│ 9 ★        │ Medium-Hög   │ HÖG ★       │ HÖG ★   │
│  (1-10 pers) │            │ (€49-99/m)   │ (n projekt)  │          │
│ Arkitektbyrå │ 5          │ Hög          │ Hög          │ Medium   │
│ Fastighetsb. │ 8          │ Mycket hög   │ Mycket hög   │ Låg      │
└──────────────┴────────────┴──────────────┴──────────────┴──────────┘
```

**Beachhead market:** Små renoveringsföretag (1-10 anställda) i Sverige.

**Varför:**
1. Smärtan är daglig — jonglerar 3-8 projekt med WhatsApp/Excel
2. De betalar redan — till Bygglet, Fortnox, manuella timmar
3. Viral motor — 1 entreprenör → 5 husägare + 10 hantverkare = 15 nya ögon/mån
4. Expansion inbyggd — fler projekt = mer värde = naturlig uppgradering

---

### BRIDGE STRATEGY TILL NÄSTA SEGMENT

```
BEACHHEAD                    BRIDGE                      EXPANSION
─────────                    ──────                      ─────────
Sm. entreprenörer    ──►    Husägare (bjuds in)    ──►   Husägare signupar
(betalar)                   (gratis viewer)              själva (freemium)
        │
        └──►    Hantverkare (bjuds in)     ──►   Hantverkare vill ha
                (gratis collaborator)             eget konto (betalar)
                        │
                        └──►    Fastighetsbolag ser att
                                deras leverantörer redan
                                använder Renomate ──► Enterprise
```

---

### PRICING-ARKITEKTUR (designa NU, lansera SENARE)

```
┌─────────────────────────────────────────────────────────┐
│ FREE            │ PRO (€49/mån)   │ BUSINESS (€99/mån) │
├─────────────────┼─────────────────┼─────────────────────┤
│ 1 aktivt projekt│ 10 projekt      │ Obegränsade projekt │
│ 2 team-members  │ 10 team-members │ Obegränsat team     │
│ Grundritning    │ Avancerad canvas│ API + integrationer  │
│ Uppgifter       │ Budget-spårning │ Export (PDF/DWG)    │
│ Foton           │ Timeline/Gantt  │ Anpassad branding   │
│                 │ Offline read    │ Prioriterad support  │
├─────────────────┴─────────────────┴─────────────────────┤
│ Alla planer: Unlimited invited viewers (husägare)       │
│ ★ Invited viewers = viral motor, ALDRIG bakom paywall   │
└─────────────────────────────────────────────────────────┘
```

**Nyckelprincip:** Husägare (invited viewers) ska ALLTID vara gratis. De är tillväxtmotorn, inte intäktskällan.

---

### REVENUE LOOP

```
Husägare signupar gratis
       │
       ▼
Skapar projekt, bjuder in hantverkare ──► Hantverkaren ser värde
       │                                        │
       ▼                                        ▼
Uppgraderar till Pro (budget,                Hantverkaren signupar
 timeline, avancerade ritningar)              för eget konto
       │                                        │
       ▼                                        ▼
Projektet slutförs,                     Hantverkaren bjuder in
 husägaren rekommenderar                 SINA kunder (husägare)
       │                                        │
       └──────────── LOOP ◄─────────────────────┘
```

---

### PRE-REVENUE PRIORITIES (NU)

| Prio | Åtgärd | Revenue impact | Varför nu |
|------|--------|---------------|-----------|
| **1** | **Fixa activation (onboarding)** | Ingen direkt, men ALLT bygger på detta | Utan activation: ingen retention → ingen revenue |
| **2** | **Bygg invite-loopen** — trivialt att bjuda in team | Viral coefficient >1.0 = organisk tillväxt | Varje inbjuden = potentiell betalande kund. CAC=0-kanal |
| **3** | **Instrumentera usage** — tracka features, frekvens, segment | Data för pricing-beslut | Utan data = gissning om var paywall ska sitta |

### KILL LIST (lockande men fel timing)

- **Betalplan nu** — 50 testare som inte klarar onboarding. Att ta betalt = döda dem.
- **Enterprise/Fastighetsbolag** — 12-18 mån bort. Kräver SSO, audit trail, SLA.
- **Marketplace (hantverkare ↔ husägare)** — Tvåsidig marknad = annan affär. Parkera.
- **Fortnox-integration** — Bra bridge till betalvilja, men Sprint 5+.

---

### LÄRDOMAR FRÅN MARKNADSLEDARE

**Procore** ($2B+ ARR): Började med midsegmentet (medelstora byggföretag). Expanderade sedan uppåt OCH nedåt. Renomate → börja med den lilla entreprenören.

**PlanGrid** (förvärvat $875M): Vann genom enkelhet — fältarbetare öppnade ritningar på iPad utan utbildning. Platschefen har rätt: den som vinner hantverkarens telefon vinner marknaden.

**Figma**: Gratis tier + invite = nuclear viral loop. Renomate har samma möjlighet: entreprenör → husägare → granne som renoverar.

---

### MÄTVÄRDEN ATT TRACKA (pre-revenue)

| Metrik | Varför | Mål v.12 |
|--------|--------|----------|
| Activation rate (signup → projekt) | Grundförutsättning | >50% |
| Invite rate (projekt med >1 medlem) | Viral motor | >30% |
| Weekly retention (återkommer 7d) | Sticky = betalvilja | >40% |
| Feature depth (≥3 features/projekt) | Engagemang | >25% |
| Viral coefficient (inbjudna → signup) | Organisk tillväxt | >0.3 |

**Monetariserings-trigger:** När activation >50% OCH weekly retention >40% → soft-launch betalplan mot små entreprenörer.

---

### PRODUKTMOGNAD VS. REVENUE READINESS — CHECKLISTA

Denna checklista används för att mäta om produkten är redo för varje steg i Revenue Readiness Ladder:

#### Steg 0: Problem-Fit ✅ KLART

- [x] Identifierat kärnproblem (renoveringsprojekt = kaos)
- [x] Byggt MVP med kärnfunktioner (projekt, uppgifter, ritning, budget)
- [x] Fått bekräftelse från riktiga användare (50 beta-testare)

#### Steg 1: Activation ◐ PÅGÅENDE

- [ ] Ny användare förstår vad appen gör inom 60 sekunder
- [ ] Signup → första projekt: >50% completion rate
- [ ] Demo-projekt guidar effektivt (inte förvirrar)
- [ ] Mobil onboarding fungerar (40%+ av trafiken)
- [ ] Empty states driver handling (inte "tom sida")
- **Status:** UX har designat lösning, implementering ej påbörjad

#### Steg 2: Retention ○ NÄSTA

- [ ] Användare återkommer inom 7 dagar: >40%
- [ ] Notifikationer/påminnelser driver återbesök
- [ ] Invite-loop: >30% av projekt har >1 medlem
- [ ] Minst 3 features används aktivt per projekt
- [ ] "Jag kan inte sluta använda det" — kvalitativ feedback
- **Förutsättning:** Activation måste vara löst först

#### Steg 3: Monetarisera ○ EJ PÅBÖRJAT

- [ ] Usage data visar tydlig Free/Pro-gräns
- [ ] 10+ användare har sagt "jag skulle betala för detta"
- [ ] Pricing-sida byggd (även om den inte är live)
- [ ] Stripe/betalningsintegration klar
- [ ] Upgrade-flow i appen (free → pro)
- **Förutsättning:** Retention >40% weekly

#### Steg 4: Optimera ○ LÅNGT BORT

- [ ] NRR >110% (expansion revenue)
- [ ] Churn <5% monthly
- [ ] Pricing A/B-testade
- [ ] Onboarding → betalt: <14 dagar median

#### Steg 5: Skala ○ LÅNGT BORT

- [ ] Nordisk expansion (NO, DK, FI)
- [ ] Partner/channel-strategi
- [ ] Enterprise-tier
- [ ] 1000+ betalande kunder

---

**Prioritet:** Hög — kommersiell riktning måste styra produktbeslut redan nu
**Förslag:** Alla personas bör referera till Revenue Readiness Ladder vid prioriteringsbeslut
**Insats:** Ingen kodutveckling — strategiskt ramverk

---

## Frågor till CEO

<!-- Specialists: Lägg till frågor här som kräver prioriteringsbeslut -->

### Besvarade frågor

1. **Platschef (2026-02-09):** Offline-stöd är kritiskt för fältanvändning men kräver 2-3 veckors arbete. Ska vi prioritera detta före onboarding-flödet?

   **CEO-svar (2026-02-09):** Nej, men "offline read-only" planeras för sprint 2. Se "Svar till Platschefen" ovan.

2. **CTO (2026-02-09):** Pinterest-hemligheten läcker. Ska jag dölja knapparna omedelbart?

   **CEO-svar (2026-02-09):** JA. Gör hotfixen NU (5 min: dölj Pinterest-knappar i UI). Bygg sedan Edge Function denna vecka. Ta bort VITE_PINTEREST_CLIENT_SECRET från frontend.

### Öppna frågor

1. **CRO + CM (2026-02-12):** Strategisk retention page ("Discover"-flik) — viktig långsiktigt för att hålla användare engagerade mellan projektuppgifter. API-integrationsmöjligheter kartlagda (Boverket, SMHI, Pinterest, eventuellt Hemnet/Booli via partnerskap). **Rekommendation:** Parkera till Sprint 4+ (efter activation >50%, retention >40%). Om vi vill börja nu: minimal MVP med RSS + Tips + väder = 1 vecka. **Beslut önskas:** Parkera eller påbörja minimal version?

---

## Nästa sprint-kandidater (Sprint 2, v.8-9)

| # | Område | Insats | Förutsättning |
|---|--------|--------|---------------|
| 1 | Offline read-only (casha ritningar + uppgifter) | 3-5 dagar | Onboarding klar |
| 2 | Snabborder FAB (flytande knapp för materialrapport) | 3-5 dagar | - |
| 3 | Breadcrumbs + kontextnavigering | 1-2 dagar | - |
| 4 | Terminologi-pass (byggsvenska i sv.json) | 1 dag | - |
| 5 | History-prestanda (immer.js) | 8-12h | Projekt med >500 shapes |

**Längre fram (sprint 3+):**
- Fullt offline-stöd med skriv-kö
- Canvas snapping + live-mått
- Layer-system i Space Planner
- Mobilanpassad tidslinje
- Offert → Projekt automatisk konvertering

---

## Användarsegment (uppdaterad 2026-02-12)

### Tre distinkta användarprofiler

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FIRMAÄGAREN                                       │
│                   (Småentreprenör, 1-10 anställda)                          │
│                                                                             │
│   Primär enhet: Desktop (offert/planering) + Mobil (fält)                   │
│   Skapar: Projekt, Offerter, Timeline                                       │
│   Bjuder in: Husägare (som kund) + Fältarbetare (som team)                  │
│   Betalar: JA — Pro/Business-plan (€49-99/mån)                              │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────────────────────────┐
│       HUSÄGAREN          │   │              FÄLTARBETAREN                   │
│   (Privatperson)         │   │    (Hantverkare, underentreprenör)           │
│                          │   │                                              │
│   Primär enhet: Desktop  │   │   Primär enhet: Mobil                        │
│   + Mobil (följa upp)    │   │                                              │
│                          │   │                                              │
│   Skapar: Kommentarer,   │   │   Skapar: Foton, statusuppdateringar,        │
│   godkännanden, foton    │   │   materialrapporter                          │
│                          │   │                                              │
│   Betalar: NEJ (invited) │   │   Betalar: NEJ (invited) → Kanske senare    │
│   eller Free tier        │   │   om hen vill ha eget konto                  │
└──────────────────────────┘   └──────────────────────────────────────────────┘
```

### Husägarens två roller

**VIKTIGT:** Husägaren kan ha två helt olika upplevelser beroende på kontext:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HUSÄGARE SOM PROJEKTÄGARE                           │
│                        (DIY / Egen projektledning)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│   • Skapar eget projekt via WelcomeModal                                    │
│   • Full access: rita, skapa uppgifter, bjuda in hantverkare                │
│   • Kan uppgradera till Pro för fler funktioner                             │
│   • Onboarding: "Skapa projekt" → Rita rum → Lägg till uppgifter            │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         HUSÄGARE SOM KUND/BESTÄLLARE                        │
│                      (Inbjuden av entreprenör)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│   • Bjuds in via offert eller direkt till projekt                           │
│   • Begränsad access (view) men SKA KUNNA DELTA AKTIVT:                     │
│     ✓ Kommentera på uppgifter, rum, foton                                   │
│     ✓ Tagga projektledare (@mentions)                                       │
│     ✓ Ladda upp bilder (inspirationsbilder, problem, önskemål)              │
│     ✓ Godkänna/avvisa ändringar                                             │
│     ✓ Se framsteg och timeline                                              │
│   • Onboarding: "Du har blivit inbjuden" → Översikt → Kommentera            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Designprincip:** Även med "view"-access ska plattformen bjuda in till **dialog och samarbete**. En kund som känner sig delaktig är en nöjd kund som rekommenderar vidare.

**Vad som finns idag:**
- ✅ Kommentarer på uppgifter (`CommentsSection`)
- ✅ @mentions (fungerar i kommentarer)
- ✅ Bilduppladdning i kommentarer
- ⚠️ Kommentarer på rum — behöver verifieras
- ⚠️ Kommentarer på ritningsobjekt (shapes) — `drawing_object_id` finns i DB

**Vad som kan förbättras:**
- Tydligare CTA för kunder att kommentera ("Har du frågor? Skriv här")
- Notifikationer när projektledaren svarar
- "Godkänn ändring"-knapp på ändringsförslag

### Onboarding per segment

| Segment | Ingång | Onboarding-fokus | Kritiska första minuter |
|---------|--------|------------------|------------------------|
| **Firmaägaren** | Signup (organisk/referral) | Skapa offert → bjud in kund | Offert-verktyget |
| **Husägaren (projektägare)** | Signup (organisk) | Skapa projekt → lägg till rum → uppgifter | WelcomeModal → Demo |
| **Husägaren (inbjuden kund)** | Invitation-länk | Förstå projektstatus → **börja kommunicera** | Projekt-översikt + kommentar-CTA |
| **Fältarbetaren** | Invitation-länk | Se uppgifter → ta foto → rapportera | Mobil tasks-vy |

**Nyckelinsikt för inbjudna husägare:** De ska inte känna sig som passiva observatörer. Även med view-access ska de uppmuntras att:
- Ställa frågor via kommentarer
- Ladda upp inspirationsbilder eller foton på problem
- Tagga projektledaren för snabbt svar
- Godkänna ändringar och milstolpar

---

### Firmaägare (Specialist-logg)

**Datum:** 2026-02-12

**Analys:** Första granskning av Renomate ur småföretagarperspektiv

**Vad som FINNS:**
- ✅ Komplett offert-funktionalitet (CreateQuote, ViewQuote)
- ✅ ROT-avdrag i offerter
- ✅ Kund kan acceptera/avvisa offert digitalt
- ✅ Inbjudningssystem med granulära roller
- ✅ Fältarbetare kan se tilldelade uppgifter

**Vad som SAKNAS (prioriterat):**

| Prio | Funktion | Varför kritiskt | Insats |
|------|----------|-----------------|--------|
| **1** | **Offert → Projekt konvertering** | 30 min manuellt arbete per projekt | Medium (3-5 dagar) |
| **2** | **Kund-dashboard (förenklad vy)** | Kunden ringer "hur går det?" | Medium (3-5 dagar) |
| **3** | **Demo-banner i projekt** | Nya användare förstår inte att det är demo | Liten (2h) |
| **4** | Lead-hantering (CRM-light) | Tappar förfrågningar i mail-kaos | Stor (1-2 veckor) |

**Prioritet:** Hög — Firmaägaren är den virala motorn (1 firma → 5 kunder → 10 fältarbetare)

**Förslag:** Bygg "Offert → Projekt med ett klick" i Sprint 2-3

**Insats:** Medium för offert-konvertering, Liten för demo-banner

---

### Hemägare (Oteknisk privatperson)

**Datum:** 2026-02-10

**Analys:** Fail-test av hela appen ur en oteknisk hemägares perspektiv — två flöden testade:
1. **Inbjudan:** Bli inbjuden till ett projekt av min byggfirma
2. **Eget projekt:** Signupa själv och försöka skapa ett projekt

---

## HEMÄGARENS FAIL-TEST — FULLSTÄNDIG RAPPORT

*Jag heter Anna, 42 år. Jag har köpt en 2:a på Söder som behöver nytt kök och badrum. Min byggfirma "Pers Bygg" ska göra jobbet. Per sa att jag kan "följa renoveringen i en app". Jag laddar ner... vad nu?*

---

### TEST 1: INBJUDEN TILL PROJEKT (80% av hemägare)

#### Steg 1: Jag får ett mail ✅ OK

```
"Hej Anna! Per från Pers Bygg har bjudit in dig till
projekt Köksrenovering Södermalm. Klicka här för att
följa med i processen."

[ Öppna mitt projekt ]
```

**Känsla:** Bra! Jag förstår vad det handlar om. Mailet visar projektnamn, min roll och vilka delar jag har tillgång till.

**Betyg: 7/10** — Begripligt, men lite formellt. Hade velat se "Per" med bild, inte bara text.

---

#### Steg 2: Jag klickar på länken ⚠️ STOPP

Jag hamnar på en sida som säger att jag måste **skapa konto eller logga in**.

**Min reaktion:** *"Måste jag skapa ÄNNU ETT konto? Jag har redan 40 lösenord..."*

Jag skapar ett konto. Email, lösenord. OK.

**Men sen:** Jag hamnar på... **InvitationResponse-sidan** som visar:
- Projektnamn ✓
- Min roll: "Client" ✓
- Behörigheter: "Timeline: view, Tasks: view, Space Planner: view..."

**Min reaktion:** *"Vad är 'Space Planner'? Vad är 'Timeline view'? Varför ser jag en behörighetslista som ser ut som IT-inställningar?"*

**Betyg: 4/10** — Teknisk jargong. Jag vill bara se mitt kök.

---

#### Steg 3: Jag accepterar inbjudan och landar i projektet ❌ FÖRVIRRING

Jag klickar "Acceptera" och hamnar på... **samma projektsida som alla andra**.

```
┌─────────────────────────────────────────────────────────────┐
│ Overview │ Space Planner (Beta) │ Files │ Tasks │ Purchases │ Budget │ Team │
└─────────────────────────────────────────────────────────────┘
```

**Min reaktion:** *"Sju flikar? Vad är 'Space Planner (Beta)'? Vad är 'Purchases'? Varför står det 'Beta' — är appen inte färdig?"*

**Ingen välkomsttext.** Ingen "Hej Anna, här kan du följa din renovering." Ingen guide. Bara en projektvy med pulskort som visar "0 of 0 tasks completed".

**Dessutom:** Jag ser **OnboardingChecklist** som säger:
- "Skapa ditt första projekt"
- "Öppna Space Planner"
- "Rita ett rum"

**Min reaktion:** *"Jag SKA inte skapa projekt? Per bjöd ju in mig? Varför vill appen att JAG ska rita rum? Det är Pers jobb!"*

**KRITISKT FYND:** Inbjudna användare får exakt samma onboarding som nya användare som signupar själva. Ingen anpassning. Checklistan är helt irrelevant för en inbjuden hemägare.

**Betyg: 2/10** — Jag vet inte vad jag ska göra. Appen pratar till fel person.

---

#### Steg 4: Jag försöker hitta bilder ❌ SVÅRT

Per sa att han skulle lägga upp bilder. Jag letar...

- "Overview" — Ser pulskort med siffror. Inga bilder.
- "Files" — Jag hittar fliken. Ser en lista med filnamn och datum. Inte bilder — **filnamn**. "IMG_2847.jpg", "IMG_2848.jpg".

**Min reaktion:** *"Vilken bild är vad? Jag vill se SENASTE bilderna stort, inte en fillista. Det här ser ut som en mapp på datorn."*

**Vad jag önskade:** En "Senaste bilderna"-sektion direkt på översikten. Stort. Med datum och beskrivning.

**Betyg: 3/10** — Bilder finns tekniskt, men upplevelsen är som en filhanterare, inte Instagram.

---

#### Steg 5: Jag försöker skriva en fråga till Per ⚠️ OKLART

Jag vill fråga "Hej Per, hur ser det ut med kaklet till badrummet?"

**Var skriver jag det?**

- Jag hittar ingen tydlig "Skriv till Per"-knapp på översikten
- Feed-fliken? Den ligger bakom "More"-menyn på mobil
- Kommentarer finns på uppgifter — men jag måste **först hitta rätt uppgift**, klicka på den, scrolla ner till "Comments"

**Min reaktion:** *"I WhatsApp skriver jag ett meddelande. Här måste jag navigera runt och hitta rätt ställe att kommentera. Det här är inte en konversation — det är ett ärendesystem."*

**KRITISKT FYND:** Det finns inget sätt att bara "prata med Per" — all kommunikation är kopplad till specifika objekt (uppgifter, material, filer). För en hemägare som bara vill ställa en fråga är det som att behöva skapa ett ärende hos kundtjänst.

**Betyg: 2/10** — Kommunikation finns men den är gömd och objektbunden.

---

#### Steg 6: Jag vill se hur det går med budgeten ⚠️ ÖVERVÄLDIGANDE

Jag klickar på "Budget"-fliken.

**Jag ser:**
- "Totalbudget", "Beställt belopp", "Betalt", "Återstår"
- En tabell med kolumner: Namn, Typ, Budget, Beställt, Betalt, Återstår, Status
- "Kostnadsställe" som filter

**Min reaktion:** *"Kostnadsställe? Beställt belopp? Det här ser ut som Fortnox. Jag ville bara veta: hur mycket av mina 200 000 kr har vi använt?"*

**Vad jag önskade:**

```
┌──────────────────────────────────────────┐
│  💰 Budget                                │
│                                           │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░ 135 000 kr     │
│  av 200 000 kr                            │
│                                           │
│  Kök:    95 000 kr                        │
│  Badrum:  40 000 kr                       │
│  Övrigt:      0 kr                        │
│                                           │
│  65 000 kr kvar                           │
└──────────────────────────────────────────┘
```

**Betyg: 3/10** — Informationen finns men presentationen är för en bokförare.

---

#### Steg 7: Mobilupplevelsen ❌ PROBLEM

Jag öppnar appen på telefonen (90% av min användning).

**Bottennavigeringen visar:** Overview, Plans, Tasks, Purchases

**Min reaktion:** *"Plans? Jag vill se bilder och prata med Per — inte ritningar. Varför är 'Plans' här men inte 'Bilder'?"*

- "Files" (bilder) ligger bakom "More"-menyn → **3 klick bort**
- "Feed" (kommunikation) ligger bakom "More"-menyn → **3 klick bort**
- "Budget" ligger bakom "More"-menyn → **3 klick bort**

De tre saker jag använder mest (bilder, kommunikation, budget) är alla gömda.

**Notifikationer:** Bara i appen. Ingen push, ingen SMS. Per lägger upp bilder → jag vet inte om det förrän jag råkar öppna appen och ser klockan.

**Betyg: 3/10** — Mobil-navet är byggt för projektledaren, inte för mig.

---

### SAMMANFATTNING TEST 1: INBJUDEN TILL PROJEKT

| Steg | Vad som händer | Betyg | Fail? |
|------|---------------|-------|-------|
| Få mail | Bra, begripligt | 7/10 | |
| Skapa konto | Ytterligare ett konto... | 5/10 | |
| Invitation-sida | Teknisk behörighetslista | 4/10 | ⚠️ |
| Landa i projekt | Fel onboarding, 7 flikar, ingen guide | 2/10 | ❌ |
| Hitta bilder | Fillista, inte bildgalleri | 3/10 | ❌ |
| Skriva till Per | Gömd, objektbunden | 2/10 | ❌ |
| Se budget | Bokföringstabell | 3/10 | ❌ |
| Mobil | Fel saker i navbaren | 3/10 | ❌ |

**Totalbetyg flöde 1: 3/10**
**Prognos:** Jag stänger appen efter 2 minuter och ringer Per istället.

---

### TEST 2: EGET PROJEKT (20% av hemägare)

#### Steg 1: Signup + WelcomeModal ✅ BÄTTRE

Jag signupar. WelcomeModal öppnas.

- **Steg 1 — Språkval:** 4 språk visas tydligt med flaggor. Jag klickar 🇸🇪 Svenska. OK!
- **Steg 2 — Användartyp:** "Husägare" med ikon och kort beskrivning. Jag klickar. OK!
- **Steg 3 — Vad vill du göra?** Tre alternativ:
  - "Skapa nytt projekt"
  - "Importera från dokument"
  - "Utforska först"

**Min reaktion:** *"'Importera från dokument'? Vilket dokument? Jag har inget dokument. 'Utforska först' — ja, det kanske?"*

Jag klickar "Utforska först".

**Betyg: 6/10** — Språk och typ funkar bra. Tredje steget lite oklart men "Utforska" är ett bra säkert val.

---

#### Steg 2: Demo-projektet ⚠️ HALVBRA

Jag hamnar i ett demo-projekt med 4 rum, uppgifter och material.

**Bra:** Jag ser hur det KAN se ut med data. Rum, uppgifter, bilder.

**Dåligt:**
- Jag förstår inte att det är ett DEMO. Ingen tydlig "Det här är ett exempel"-banner.
- Projektet heter "Apartment Renovation" — på engelska? (om jag valt svenska)
- Jag vågar inte klicka på saker — tänk om jag förstör demon?

**Betyg: 5/10** — Bra idé, otydlig exekvering.

---

#### Steg 3: Skapa eget projekt ⚠️ OKLART

Jag går tillbaka till projektsidan och klickar "+ Nytt projekt".

**Steg 1 — Formulär:**
- Projektnamn (obligatoriskt) — "Köksreno Söder"
- Adress (valfritt) — OK
- Postnummer + Stad (valfritt) — OK
- Beskrivning (valfritt) — Hmm, vad ska jag skriva?

**Steg 2 — Detaljer:**
- Projekttyp — "Köksrenovering" — bra!
- Startdatum — OK
- Totalbudget — "0 kr" ← *"Vad ska jag skriva? Med eller utan ROT? Inkl moms?"*

**Min reaktion:** Budget-fältet utan förklaring gör mig osäker. Jag skriver "200000" och hoppas.

Projektet skapas. Jag hamnar på Overview.

**Betyg: 5/10** — Formuläret är OK men budget-fältet behöver kontexthjälp.

---

#### Steg 4: OnboardingChecklist ❌ FEL FOKUS

Nu ser jag checklistan:
1. "Skapa ditt första projekt" ✅
2. "Öppna Space Planner"
3. "Rita ditt första rum"
4. "Generera väggar (valfritt)"
5. "Skapa uppgift kopplad till rum"

**Min reaktion:** *"Space Planner? Rita rum? Generera VÄGGAR? Jag vill inte rita — jag vill skapa en enkel att-göra-lista! 'Riv gamla köket', 'Dra ny el', 'Sätt kakel'. Varför vill appen att jag ska bli arkitekt?"*

**KRITISKT FYND:** Onboarding-stegen förutsätter att alla användare vill använda ritverktyget. En hemägare som bara vill ha koll på sin renovering tvingas igenom ett CAD-liknande flöde.

**Betyg: 2/10** — Checklistan pratar till en inredningsarkitekt, inte till mig.

---

#### Steg 5: Bjuda in min byggfirma ⚠️ SVÅRT ATT HITTA

Jag vill bjuda in Per. Var gör jag det?

- Jag klickar runt. "Team"-fliken? Jag ser den — sjunde fliken till höger.
- På mobil: gömd bakom "More"
- Jag hittar "Bjud in teammedlem" och fyller i Pers email

**Rollval:** "Contractor", "Project Manager", "Client", "Viewer"

**Min reaktion:** *"Per är min byggfirma — är han 'Contractor' eller 'Project Manager'? Vad är skillnaden? Och varför heter det 'Contractor' på engelska?"*

**Betyg: 4/10** — Funktionen finns men terminologin och placeringen gör det svårt.

---

### SAMMANFATTNING TEST 2: EGET PROJEKT

| Steg | Vad som händer | Betyg | Fail? |
|------|---------------|-------|-------|
| WelcomeModal | Bra val, tredje steget lite oklart | 6/10 | |
| Demo-projekt | Bra idé, dålig förklaring | 5/10 | ⚠️ |
| Skapa projekt | OK formulär, budget oklart | 5/10 | ⚠️ |
| Onboarding-steg | Fokuserar på ritverktyg, inte mina behov | 2/10 | ❌ |
| Bjuda in team | Svårt att hitta, engelska roller | 4/10 | ⚠️ |

**Totalbetyg flöde 2: 4/10**
**Prognos:** Jag skapar ett projekt men ger upp vid "Rita ditt första rum". Appen står oanvänd.

---

## DE 10 VÄRSTA PROBLEMEN FÖR HEMÄGAREN

| # | Problem | Allvarlighet | Flöde | Lösning (kort) |
|---|---------|-------------|-------|-----------------|
| **1** | **Ingen anpassad onboarding för inbjudna** — får "skapa projekt"-guide trots att de bjudits in | KRITISK | Inbjudan | Detektera inbjudan → visa "Välkommen till ditt projekt" istället |
| **2** | **Kommunikation är objektbunden** — ingen enkel "prata med Per"-funktion | KRITISK | Båda | Lägg till en projektchatt/meddelandefunktion eller synlig kommentar-CTA på översikten |
| **3** | **Bilder gömda i fillista** — ingen "senaste bilder"-sektion på översikt | HÖG | Båda | Visa bildkarusell direkt på Overview |
| **4** | **Mobil-nav byggt för projektledare** — bilder, chat, budget gömda bakom "More" | HÖG | Båda | Anpassa navbaren per roll: hemägare ser Översikt, Bilder, Chat, Budget |
| **5** | **Onboarding förutsätter ritintresse** — alla steg handlar om Space Planner | HÖG | Eget | Skapa hemägar-specifik onboarding: "Lägg till rum" → "Skapa uppgift" → "Bjud in team" |
| **6** | **Budget-vy är bokföring** — "Kostnadsställe", "Beställt belopp" | HÖG | Båda | Förenklad budget-vy för hemägare: stapeldiagram + "X kr av Y kr" |
| **7** | **Ingen push/SMS-notis** — hemägaren vet inte när Per lägger upp bilder | HÖG | Inbjudan | Implementera push + email-notis vid viktiga händelser |
| **8** | **7 flikar med facktermer** — "Space Planner (Beta)", "Purchases" | MEDIUM | Båda | Byt namn: "Ritning", "Material". Dölj orelevanta flikar per roll |
| **9** | **Invitation-sidan visar behörighetstabell** — "Timeline: view, Tasks: view..." | MEDIUM | Inbjudan | Visa istället: "Du kan följa framsteg, se bilder och skriva kommentarer" |
| **10** | **Demo-projekt oklart** — ingen banner, engelskt namn | MEDIUM | Eget | Tydlig "DEMO"-markering + lokaliserat projektnamn |

---

## VAD SOM FAKTISKT FUNKAR BRA

Jag vill inte bara klaga. Det finns saker som funkar:

| Funktion | Min kommentar |
|----------|---------------|
| ✅ Inbjudnings-mailet | Tydligt, visar vem som bjöd in och projektnamn |
| ✅ WelcomeModal steg 1-2 | Språk + användartyp fungerar smidigt |
| ✅ Touch targets i mobil-nav | Tillräckligt stora knappar (48px) — jag träffar rätt |
| ✅ Demo-projektet (konceptet) | Bra att man kan se hur det ser ut med data |
| ✅ Rollsystemet | Granulära behörigheter finns — rätt info för rätt person |
| ✅ Kommentarer med @mentions | När jag väl HITTAR kommentarfunktionen funkar den |
| ✅ Pulskort på Overview | Snygga, färgkodade — ger snabb överblick |

---

## HEMÄGARENS ÖNSKELISTA (om jag fick välja)

### 1. En vy som är "min" — Kund-Dashboard

```
┌─────────────────────────────────────────────────┐
│  Köksreno Söder                      Per 📱     │
├─────────────────────────────────────────────────┤
│                                                  │
│  🟢 Det går framåt!                              │
│  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 4 av 8 klart            │
│  Beräknat klart: 15 mars                        │
│                                                  │
│  📸 Idag (3 nya bilder)                          │
│  ┌────┐ ┌────┐ ┌────┐                           │
│  │    │ │    │ │    │  "Nytt golv i köket!"     │
│  └────┘ └────┘ └────┘                           │
│                                                  │
│  💬 Per skrev 14:32:                             │
│  "Kaklet har kommit! Vill du kika?"             │
│  ┌─────────────────────────────┐                │
│  │ Svara Per...                │  📎  📷  Skicka │
│  └─────────────────────────────┘                │
│                                                  │
│  💰 Budget: 135 000 av 200 000 kr               │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░ 65 000 kr kvar            │
│                                                  │
│  ⏭️ Nästa: Sätta kakel i badrum (startar mån)   │
│                                                  │
│  ❓ Väntar på ditt svar:                         │
│  "Vilken fog vill du ha — vit eller grå?"       │
│  [ Vit ] [ Grå ] [ Skriv eget svar ]            │
└─────────────────────────────────────────────────┘
```

### 2. Mobil-nav anpassad för mig

```
Nuvarande:  Översikt │ Plans │ Tasks │ Purchases │ More
Önskat:     Översikt │ Bilder │ Chat │ Budget │ Mer
```

### 3. Push-notis som faktiskt når mig

```
📱 Notis på telefonen:
"Per har lagt upp 3 nya bilder från köket"
"Per frågar: Vilken fog vill du ha — vit eller grå?"
"Ny faktura: Kakel badrum — 12 500 kr"
```

---

**Prioritet:** KRITISK — hemägaren avgör om byggfirman (den betalande kunden) fortsätter använda appen

**Förslag till CEO:**
1. **(Sprint nu):** Detektera inbjudna användare → visa anpassad välkomstvy istället för standard-onboarding
2. **(Sprint nu):** Lägg till bildkarusell + enkel kommentar-CTA direkt på Overview
3. **(Sprint 2):** Kund-Dashboard — förenklad vy per roll (client/viewer)
4. **(Sprint 2):** Roll-baserad mobil-nav (hemägare ser bilder+chat+budget, inte plans+tasks+purchases)
5. **(Sprint 3):** Push-notiser för viktiga händelser

**Insats:**
- Inbjudnings-anpassning: Liten (1-2 dagar)
- Bildkarusell på Overview: Liten (1 dag)
- Kund-Dashboard: Medium (3-5 dagar)
- Roll-baserad nav: Medium (2-3 dagar)
- Push-notiser: Stor (1-2 veckor)

---

### Community Manager (CM)

**Datum:** 2026-02-12

**Analys:** Strategisk retention page — "Discover"-koncept för att hålla användare engagerade mellan projektuppgifter

---

## RETENTION PAGE — GEMENSAM ANALYS (CRO + CM)

### Bakgrund

CEO:s idé: Skapa en inspirationssida som håller användare (husägare + proffs) engagerade även när de inte har aktiva projektuppgifter. Potentiellt via API-integrationer, RSS-feeds, och personaliserat innehåll.

### Timing-bedömning

```
Revenue Readiness: STEG 2 (RETENTION)
Nuvarande fas:     STEG 1 (ACTIVATION) — ej klart

⚠️ VARNING: 50 testare kämpar med "Vad gör jag nu?"
   Retention-features FÖRE activation = optimera något ingen använder.
```

| Tidpunkt | CRO-bedömning | CM-bedömning |
|----------|---------------|--------------|
| Nu (Sprint 1) | ❌ Fokus activation | ❌ Fokus activation |
| Sprint 2-3 | ⚠️ OK som experiment | ⚠️ Seed content first |
| Sprint 4+ | ✅ Om retention >40% | ✅ Om UGC börjar flöda |

### Strategisk risk/möjlighet

| Aspekt | Bedömning |
|--------|-----------|
| **Konkurrenter** | Houzz, Pinterest, Hemnet dominerar generisk inspiration |
| **Differentiering** | Låg om generisk — HÖG om kopplad till användarens projekt |
| **Viral potential** | Medium — "kolla denna artikeln" kan delas |
| **Revenue impact** | Indirekt — retention → uppgradering till Pro |

### Rätt vs Fel approach

```
❌ FEL: Generisk inspirationssida
   → Houzz/Pinterest gör det bättre
   → Ingen anledning att stanna på Renomate

✅ RÄTT: Kontextuell inspiration kopplad till projekt
   → "Du renoverar kök? Här är 5 projekt med liknande budget"
   → "Din badrumsrenovering är 60% klar — så här kan det se ut färdigt"
   → Data från Renomate = unikt, kan inte kopieras
```

### Content Mix-strategi

```
┌──────────────┬───────────────────┬───────────────┬──────────────┐
│ Typ          │ Källa             │ Teknik        │ Status       │
├──────────────┼───────────────────┼───────────────┼──────────────┤
│ CURATED      │ RSS/API           │ Auto-ingest   │ Planerat     │
│ CREATED      │ Tips-sidan        │ i18n          │ ✅ KLAR      │
│ COMMUNITY    │ Renomate-projekt  │ Opt-in UGC    │ Behöver data │
└──────────────┴───────────────────┴───────────────┴──────────────┘
```

---

## API/RSS INTEGRATIONS-ROADMAP (Research 2026-02-12)

### Tier 1: Myndigheter & Officiella källor (Hög prioritet, bevisad tillgänglighet)

| Källa | API/Teknik | Innehåll | Insats | Status | Länk |
|-------|------------|----------|--------|--------|------|
| **Boverket** | ✅ Officiellt API | Byggregler, BBR, författningar | 1d | Tillgänglig via Lantmäteriet | [Info](https://www.lantmateriet.se/sv/smartare-samhallsbyggnadsprocess/) |
| **Skatteverket** | RSS/Nyhetsbrev | ROT/RUT-uppdateringar | 2h | Publik | [Nyheter](https://www.skatteverket.se) |
| **Konsumentverket** | RSS | Konsumenträtt, hantverkarregler | 2h | Publik | [Hallå Konsument](https://www.hallakonsument.se) |
| **SMHI** | ✅ Öppen API | Väder, prognoser | 4h | Gratis, öppen | [API](https://opendata.smhi.se/apidocs/) |

### Tier 2: Gratis bildbanker (Bekräftad tillgänglighet)

| Källa | API/Teknik | Innehåll | Insats | Licens | Länk |
|-------|------------|----------|--------|--------|------|
| **Unsplash** | ✅ Gratis API | 50,000+ renoverings-/inredningsbilder | 4h | Gratis, ingen attribution | [Developers](https://unsplash.com/developers) |
| **Pinterest** | ✅ oEmbed | Inspirationsboards | ✅ FINNS | Publik | Redan integrerat |
| **Pexels** | ✅ Gratis API | Interiör-/renovationsbilder | 4h | Gratis | [API](https://www.pexels.com/api/) |

### Tier 3: Fastighet & Marknad (Kräver partnerskap)

| Källa | API/Teknik | Innehåll | Insats | Tillgänglighet | Kontakt |
|-------|------------|----------|--------|----------------|---------|
| **Hemnet** | BostadsAPI | Bostadspriser, listings | - | ❌ Endast mäklare (kontrakt krävs) | [Integration](https://integration.hemnet.se) |
| **Booli Pro** | Prenumeration | Prisstatistik, analysverktyg | - | 💰 Betald tjänst | pro@booli.se |
| **Lantmäteriet** | API | Fastighetsdata, kartor | 2v | Licensavtal krävs | [Geodata](https://www.lantmateriet.se) |

### Tier 4: Produktkataloger (Inofficiella, instabila)

| Källa | API/Teknik | Innehåll | Insats | Risk | Notering |
|-------|------------|----------|--------|------|----------|
| **IKEA** | ⚠️ Inofficiell | Produkter, priser, 3D-modeller | 1v | ⚠️ Kan sluta fungera | [GitHub](https://github.com/vrslev/ikea-api-client) |
| **Bauhaus/Hornbach** | Scraping | Byggmaterial, priser | - | ⚠️ ToS-brott | Ej rekommenderat |

### Tier 5: Inspiration & Livsstil (Varierad tillgänglighet)

| Källa | API/Teknik | Innehåll | Insats | Status | Notering |
|-------|------------|----------|--------|--------|----------|
| **Houzz** | ❌ Ingen API | Home design inspiration | - | Stängd | Endast browsing |
| **Trendenser** | RSS | Svensk inredningsblogg | 2h | Publik | [Blog](https://trendenser.se) |
| **My Scandinavian Home** | RSS | Nordisk inspiration | 2h | Publik | [Blog](https://www.myscandinavianhome.com) |
| **Residence Magazine** | RSS | Svenska inredningstrender | 2h | Osäker | Kolla tillgänglighet |
| **Dezeen** | RSS | Arkitektur/design (internationell) | 2h | Publik | [RSS](https://www.dezeen.com/rss/) |

### Tier 6: Branschspecifikt (Framtida research)

| Källa | Potentiell nytta | Notering |
|-------|------------------|----------|
| **Byggföretagen** | Branschnyheter för proffs | Kolla RSS |
| **Villaägarna** | Tips för husägare | Kolla RSS |
| **Bostadsrätterna** | BRF-specifikt | Kolla RSS |
| **Svensk Byggtjänst** | Produktinformation | Kommersiell |

---

## API-PRIORITERING FÖR MVP

### Fas 1: Gratis & Bevisat (Sprint 4-5, ~2 dagar)

```
┌──────────────────────────────────────────────────────────────────┐
│ SMHI Väder API ──► "Torrt imorgon — bra för utomhusarbete"      │
│ Unsplash API ───► Inspirationsbilder per rumstyp                │
│ Pinterest oEmbed ► Redan integrerat ✅                           │
│ Boverket RSS ───► Automatiska byggregelsnyheter                 │
└──────────────────────────────────────────────────────────────────┘
```

### Fas 2: Personalisering (Sprint 6-7, ~1 vecka)

```
┌──────────────────────────────────────────────────────────────────┐
│ Boverket API ───► Visa relevanta regler per projekttyp          │
│ Skatteverket ───► ROT-kalkylator kopplad till projekt           │
│ Inredningsbloggar RSS ► Trendande innehåll                      │
└──────────────────────────────────────────────────────────────────┘
```

### Fas 3: Partnerskap (Sprint 8+, kräver affärskontakt)

```
┌──────────────────────────────────────────────────────────────────┐
│ Booli Pro ─────► Prisstatistik per område (kontakta pro@booli)  │
│ Hemnet ────────► Bostadsinspiration (mäklarpartnerskap?)        │
│ IKEA (inofficiell) ► Produktförslag per rum (riskabelt)         │
└──────────────────────────────────────────────────────────────────┘
```

---

## TEKNISK IMPLEMENTATION (skiss)

```typescript
// src/services/discover/feeds.ts

export const FEED_SOURCES = {
  // Tier 1 — Officiella
  boverket: {
    type: 'api',
    url: 'https://api.boverket.se/...',  // Verifiera endpoint
    refresh: '24h',
    tags: ['regler', 'byggnormer']
  },
  smhi: {
    type: 'api',
    url: 'https://opendata-download-metfcst.smhi.se/api/...',
    refresh: '3h',
    personalize: (user) => user.project?.address?.coords
  },

  // Tier 2 — Bilder
  unsplash: {
    type: 'api',
    url: 'https://api.unsplash.com/search/photos',
    queries: ['kitchen renovation', 'bathroom design', 'scandinavian interior'],
    refresh: '12h'
  },

  // Tier 5 — RSS
  trendenser: {
    type: 'rss',
    url: 'https://trendenser.se/feed/',
    refresh: '6h',
    tags: ['inspiration', 'trender']
  },
  dezeen: {
    type: 'rss',
    url: 'https://www.dezeen.com/interiors/feed/',
    refresh: '6h',
    tags: ['arkitektur', 'design']
  }
};

// Personalisering baserat på användarens projekt
export const getPersonalizedFeed = async (user: User) => {
  const project = user.activeProject;

  return {
    weather: await fetchSMHI(project?.address),
    inspiration: await fetchUnsplash(project?.rooms.map(r => r.type)),
    news: await fetchBoverketNews(project?.type),
    blogs: await fetchRSSFeeds(['trendenser', 'dezeen'])
  };
};
```

---

## DRÖMSCENARIO: "Discover"-fliken (Sprint 4+)

```
┌─────────────────────────────────────────────────────────────────┐
│  📖 Discover                                    Stockholm 🌤️ 3°│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🏷️ FÖR DITT PROJEKT: Köksreno Söder                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 📸 5 köksrenoveringar med liknande budget (120-180k)        ││
│  │    från Renomate-community                                  ││
│  │ 💡 "ROT-taket höjt — du kan spara 7 500 kr extra"          ││
│  │ 🔧 "Komplettera ditt kök med dessa IKEA-lösningar"         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  📰 NYHETER DENNA VECKA                                          │
│  • Boverket: Nya regler för våtutrymmen från 1 juli             │
│  • Skatteverket: Så fungerar ROT-avdraget 2026                  │
│  • Konsumentverket: Dina rättigheter vid försenat arbete        │
│                                                                  │
│  🌤️ VÄDER I STOCKHOLM (din projektadress)                       │
│  "Torrt nästa vecka — bra för utomhusarbeten"                   │
│  "Solnedgång 17:42 — planera dagsljusarbeten"                   │
│                                                                  │
│  📐 INSPIRATION FRÅN NÄTET                                       │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐                                    │
│  │ 📌 │ │ 📌 │ │ 📌 │ │ 📌 │  ← Pinterest: "kök skandinavisk"  │
│  └────┘ └────┘ └────┘ └────┘                                    │
│                                                                  │
│  🏠 DITT OMRÅDE: Södermalm                                       │
│  "Genomsnittspris kök i området: 145 000 kr"                    │
│  "Din budget är 8% under genomsnitt — smart!"                   │
│                                                                  │
│  🎯 POPULÄRT PÅ RENOMATE                                         │
│  • 23 nya badrum skapade denna vecka                            │
│  • Trending rumstyp: Tvättstuga (+15%)                          │
│  • Nytt: AI-import av planlösning från PDF                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🌟 DELA DITT PROJEKT                                        ││
│  │ Visa andra hur din renovering går — få feedback!            ││
│  │ [ Publicera före/efter-bilder ]                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## MINIMAL VIABLE RETENTION (om vi börjar nu)

**Insats:** ~1 vecka

| # | Komponent | Källa | Insats |
|---|-----------|-------|--------|
| 1 | Boverket/Skatteverket RSS | Myndigheter | 4h |
| 2 | Tips-sidan | ✅ Finns | 0h |
| 3 | Väder-widget | SMHI | 4h |
| 4 | Pinterest oEmbed | Befintlig integration | 2h |
| 5 | "Liknande projekt" | Demo-projektet | 4h |
| 6 | CTA för icke-inloggade | Egen | 2h |

**Vad vi INTE bygger nu:**
- Full personalisering (kräver data)
- UGC showcase (kräver användare)
- Hemnet/Booli-integration (kräver partnerskap)
- Forum/diskussioner (för tidigt)

---

**Prioritet:** Parkerad (Sprint 4+)
**Förslag:** Logga API-listan som framtida roadmap. Börja med Tier 1 (myndighets-RSS) som "free wins" när activation är löst.
**Insats:** Minimal nu (logga plan), 1 vecka för MVP senare
