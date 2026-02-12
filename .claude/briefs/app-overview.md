# Renomate — App Overview

## Vad är Renomate?

Renomate är en svensk SaaS-plattform för husägare och entreprenörer som planerar och genomför renoveringsprojekt. Målet är att vara "Notion för renovering" — ett ställe där allt samlas.

## Målgrupper

| Segment | Beskrivning | Behov |
|---------|-------------|-------|
| **Husägare (primär)** | Privatpersoner som renoverar sin bostad | Överblick, budgetkontroll, kommunikation med hantverkare |
| **Entreprenörer (sekundär)** | Hantverkare, platschefer, projektledare | Effektiv projekthantering, materialbeställning, dokumentation |
| **Bostadsrättsföreningar** | Styrelser som planerar stambyten etc. | Koordinering, beslutsstöd, medlemskommunikation |

## Kärnfunktioner

### 1. Projektöversikt (Overview)
- Dashboard med status, progress, budget
- Tidslinje (Gantt-liknande)
- Snabbåtkomst till alla delar

### 2. Space Planner (Canvas)
- 2D-ritverktyg för planlösningar
- Väggar med höjd, tjocklek, mått
- Rum som kan kopplas till uppgifter/material
- Elevation-vy (sidovy av väggar)
- Objektbibliotek (dörrar, fönster, möbler, el, VVS)
- Snapping, grid, måttsättning

### 3. Uppgiftshantering (Tasks)
- Kanban-liknande statusflöde
- Koppling till rum och material
- Tilldelning till teammedlemmar
- Checklistor
- Kommentarer med @-mentions
- Filkoppling

### 4. Inköpsordrar (Purchases)
- Materialbeställningar med status
- Koppling till uppgifter och rum
- Budget-tracking (beställt vs betalt)
- Leverantörslänkar

### 5. Budget
- Samlad vy över uppgifter och material
- Filtrering, sortering, sparade vyer
- Kolumnordning (drag & drop)
- Export (planerat)

### 6. Filer
- Uppladdning av dokument, ritningar, foton
- Mappstruktur
- AI-import från dokument (extrahera rum/uppgifter)
- AI-konvertering av planritningar
- Filkommentarer

### 7. Team
- Bjud in medlemmar via e-post
- Rollbaserad åtkomst (viewer, editor, admin, material_requester)
- Detaljerade behörigheter per funktion

### 8. Projektflöde (Feed)
- Alla kommentarer på ett ställe
- Aktivitetslogg (skapade/ändrade objekt)
- Filtrera: alla / kommentarer / aktivitet

### 9. HelpBot
- AI-assistent för renovering och apphjälp
- Quick prompts baserat på användartyp
- Svensk byggkompetens (bygglov, ROT, etc.)

### 10. Tips-sida
- FAQ om svenska byggregler
- Sökbar, kategoriserad
- Externa källhänvisningar

## Teknisk stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **UI:** shadcn/ui, Radix UI
- **State:** Zustand (global), React Query (server)
- **Canvas:** React-Konva / Konva.js
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **i18n:** i18next (10 språk, svenska primärt)

## Nuvarande status

- **Användare:** ~50 beta-testare
- **Stadie:** Pre-revenue, MVP
- **Största feedback:** "Svårt att komma igång", "Mycket funktioner men oklart var man börjar"
- **Starkaste funktioner:** Space Planner, Team-hantering
- **Svagaste funktioner:** Onboarding, Budget-vy (komplex)

## Konkurrenter

| Konkurrent | Styrka | Svaghet vs Renomate |
|------------|--------|---------------------|
| **Trello/Notion** | Flexibelt, välkänt | Ingen byggspecifik funktionalitet |
| **Buildertrend** | Komplett för proffs | Dyrt, komplext, USA-fokus |
| **Houzz** | Inspiration, hitta hantverkare | Inget projektverktyg |
| **Hemma-appen** | Svenska, enkelt | Begränsad funktionalitet |

## Differentierande faktorer

1. **Svensk byggkunskap inbyggd** — ROT, bygglov, BBR i HelpBot
2. **Visuellt först** — Space Planner som nav, inte bara listor
3. **Både husägare OCH hantverkare** — samma plattform
4. **AI-import** — dokument → uppgifter, ritning → canvas

## Kritiska frågor att besvara

1. Är appen för komplex för husägare?
2. Är appen för enkel för proffs?
3. Var tappar vi användare? (activation, retention)
4. Vad är "aha-ögonblicket" — när känner användaren värde?
5. Vad bör vi ta bort för att skapa fokus?
