export interface ChangelogEntry {
  date: string;
  title: string;
  description: string;
  tags?: string[];
  demoPath?: string; // Path to demo project section, e.g. "/projects/DEMO_ID#arbeten"
}

/** Demo project ID for public links */
export const DEMO_PROJECT_PATH = "/projects/demo";

export const changelog: ChangelogEntry[] = [
  // ── 2026-04-01 ──
  {
    date: "2026-04-01",
    title: "Inspiration gallery per room on project overview",
    description: "See all room photos, Pinterest pins, and material images in one place. Tab between rooms for visual inspiration alongside your planning data. Perfect for sharing vision with clients.",
    tags: ["UX", "Design", "Planering"],
  },
  {
    date: "2026-04-01",
    title: "Group tasks by assignee",
    description: "New grouping option for tasks: see all work per person at a glance. Perfect for coordinating multiple contractors on the same project.",
    tags: ["Arbeten", "UX"],
  },
  {
    date: "2026-04-01",
    title: "Planned vs. actual margin in budget table",
    description: "Margin column now shows both actual margin % and the planned markup from the planning phase. Spot deviations early when actuals drift from your pricing assumptions.",
    tags: ["Budget", "Produktivitet"],
  },

  // ── 2026-03-31 ──
  {
    date: "2026-03-31",
    title: "Group any table by room, cost center, status, or vendor",
    description: "New grouping button (layers icon) in Budget, Tasks, and Purchases tables. Collapsible groups with item counts and subtotals. Like Excel grouping but prettier. Preference saved per project.",
    tags: ["Budget", "Arbeten", "Inköp", "UX"],
  },
  {
    date: "2026-03-31",
    title: "Richer project cards in grid view",
    description: "Project cards now show task progress bar, overdue count, recent comments, budget, and a visual placeholder when no cover image is set. Much more at-a-glance info without opening the project.",
    tags: ["UX", "Design"],
  },
  {
    date: "2026-03-31",
    title: "Dashboard overview across all projects",
    description: "Start page now shows aggregated stats when you have multiple projects: overdue tasks, recent comments, pending purchases, and total budget — all clickable to navigate directly.",
    tags: ["UX", "Produktivitet"],
  },
  {
    date: "2026-03-31",
    title: "Full i18n for onboarding & intake forms",
    description: "Room names, work types, builder dialogs, and form preview — all translated. No more Swedish strings leaking into English UI.",
    tags: ["i18n", "Onboarding"],
  },
  {
    date: "2026-03-31",
    title: "Onboarding starts with rooms, not paperwork",
    description: "New wizard order: pick rooms first, then work types and task mapping. Project name comes last with a smart auto-suggestion based on address + rooms.",
    tags: ["Onboarding", "UX"],
  },
  {
    date: "2026-03-31",
    title: "Smart ROT visibility per project country",
    description: "ROT tax deduction features now resolve per-project based on country field. Swedish projects show ROT, international projects don't. Users with mixed projects see ROT only where it applies.",
    tags: ["i18n", "ROT"],
  },

  // ── 2026-03-30 ──
  {
    date: "2026-03-30",
    title: "Omslagsbilder med zoom och repositionering",
    description: "Dubbelklicka projektets omslagsbild för att dra och zooma till perfekt fokuspunkt. Första projektbilden visas automatiskt som cover.",
    tags: ["UX", "Projektvy"],
  },
  {
    date: "2026-03-30",
    title: "Smartare filkategorier",
    description: "Kategori-kolumnen i Filer visar nu Offert, Faktura, Kvitto istället för generiskt \"Bild\" eller \"Dokument\". AI-klassificering används automatiskt.",
    tags: ["Filer", "AI"],
  },
  {
    date: "2026-03-30",
    title: "Budget-belopp låsta som standard",
    description: "Arbetskostnad och materialbudget visas som läsbar text — dubbelklicka för att redigera. Totalen beräknas automatiskt.",
    tags: ["Budget", "UX"],
  },
  {
    date: "2026-03-30",
    title: "Publik changelog-sida",
    description: "Ny /changelog-sida visar alla produktuppdateringar i en snygg tidslinje. Delbar på sociala medier utan inloggning.",
    tags: ["UX"],
  },

  // ── 2026-03-29 ──
  {
    date: "2026-03-29",
    title: "Bulk-markering av arbeten",
    description: "Markera flera arbeten i tabellvyn med checkboxar. Bulk-ändra status, prioritet, tilldelning, rum, datum och mer. Select all med ett klick.",
    tags: ["Arbeten", "Produktivitet"],
  },
  {
    date: "2026-03-29",
    title: "Nytt inköpsflöde mot materialbudget",
    description: "Tre val vid nytt inköp: Registrera kvitto, Registrera inköp, eller Inköpsförfrågan. Budgetposten behålls intakt — inköp aggregerar mot den.",
    tags: ["Inköp", "Budget"],
  },
  {
    date: "2026-03-29",
    title: "Vy-inställningar sparas mellan enheter",
    description: "Kanban/tabell-vy, kolumnval och sortering synkas nu till ditt konto. Byt dator — alla inställningar följer med.",
    tags: ["UX", "Synk"],
  },
  {
    date: "2026-03-29",
    title: "Design-lyft i hela appen",
    description: "Rundare kort, mjuka hover-animationer, tydligare typografi-hierarki och mer luft mellan sektioner.",
    tags: ["Design"],
  },
  {
    date: "2026-03-29",
    title: "ROT och ÄTA överförs automatiskt från offert",
    description: "Vid offertaktivering överförs ROT-belopp och ÄTA-flagga automatiskt till arbeten. Tilläggsofferter skapar ÄTA-märkta arbeten.",
    tags: ["Offert", "ROT"],
  },

  // ── 2026-03-27 ──
  {
    date: "2026-03-27",
    title: "Materialindikator i arbetslistvy",
    description: "Kundvagnsikon visas bredvid arbeten med materialbudget — hovra för att se beloppet utan att öppna kortet.",
    tags: ["Arbeten", "UX"],
  },
  {
    date: "2026-03-27",
    title: "Budgetsammanfattning i planeringsvy",
    description: "Sammanfattningsrutor för total budget, materialkostnader och ROT-avdrag visas i hemägarens planeringsvy.",
    tags: ["Budget", "Planering"],
  },
  {
    date: "2026-03-27",
    title: "Gruppering av arbeten per kostnadstyp",
    description: "Organisera arbeten efter kostnadscenter (rivning, el, målning, etc.) med expanderbara grupper och budgetsummor per grupp.",
    tags: ["Planering", "UX"],
  },

  // ── 2026-03-25 ──
  {
    date: "2026-03-25",
    title: "Omdesignad högerklicksmeny på ritning",
    description: "Menyn organiserad i undermenyer: Lagerordning, Ritverktyg, Lägg till. Kompaktare och lättare att navigera.",
    tags: ["Canvas", "Design"],
  },
  {
    date: "2026-03-25",
    title: "Filnavigering med piltangenter",
    description: "I filförhandsgranskningen kan du bläddra mellan filer med tangentbordets pilar utan att stänga.",
    tags: ["Filer", "UX"],
  },
  {
    date: "2026-03-25",
    title: "4x snabbare filklassificering",
    description: "Smart tolk hämtar nu filer server-side istället för via webbläsaren — klassificering går fyra gånger snabbare.",
    tags: ["Filer", "AI"],
  },
  {
    date: "2026-03-25",
    title: "Offertförhandsgranskning i importmodal",
    description: "Se det importerade dokumentet direkt i modalen innan du länkar priser och material till arbeten.",
    tags: ["Offert", "UX"],
  },
  {
    date: "2026-03-25",
    title: "Alla kolumner i expanderade mappar",
    description: "När du expanderar en mapp i filtabellen visas nu alla kolumner (leverantör, datum, belopp) även för filerna inuti.",
    tags: ["Filer", "UX"],
  },

  // ── 2026-03-23 ──
  {
    date: "2026-03-23",
    title: "Arbetarvy utan inloggning",
    description: "Skicka en unik länk till hantverkare. De ser arbetsinstruktioner, ritning och checklista direkt i mobilen — ingen registrering krävs.",
    tags: ["Team", "Mobil"],
  },
  {
    date: "2026-03-23",
    title: "Automatisk översättning av instruktioner",
    description: "Arbetsinstruktioner översätts automatiskt till engelska, arabiska och andra språk via AI.",
    tags: ["AI", "Team"],
  },
  {
    date: "2026-03-23",
    title: "AI-genererade arbetschecklister",
    description: "System skapar automatiskt checklister baserat på rumstyp och arbetstyp. Bocka av steg direkt i arbetarvyn.",
    tags: ["AI", "Planering"],
  },
  {
    date: "2026-03-23",
    title: "Smart tolk — batchklassificering",
    description: "Markera flera filer och låt AI klassificera alla på en gång som fakturor, kvitton, ritningar eller specifikationer.",
    tags: ["Filer", "AI"],
  },
  {
    date: "2026-03-23",
    title: "AI-driven offertimport",
    description: "Importera offertfiler. AI extraherar priser, material och ROT-info automatiskt och föreslår länkning till arbeten.",
    tags: ["Offert", "AI"],
  },
  {
    date: "2026-03-23",
    title: "Filförhandsgranskning inline",
    description: "Klicka på ett filnamn för att se PDF eller bild direkt i en popup utan att ladda ned filen.",
    tags: ["Filer", "UX"],
  },
  {
    date: "2026-03-23",
    title: "Fotouppladdning från arbetarvy",
    description: "Hantverkare kan ta bilder direkt från mobilen via arbetarvyn och ladda upp dem till projektets filer.",
    tags: ["Filer", "Mobil"],
  },

  // ── 2026-03-20 ──
  {
    date: "2026-03-20",
    title: "Anslutningsverktyg på ritningen",
    description: "Rita pilar och kopplingar mellan former — som Miro. Automatisk fästning vid närliggande former.",
    tags: ["Canvas", "Design"],
  },
  {
    date: "2026-03-20",
    title: "Textformatering direkt på ritningen",
    description: "Lägg till och formatera text (fet, kursiv, storlek) direkt på former med live-förhandsgranskning.",
    tags: ["Canvas", "Design"],
  },
  {
    date: "2026-03-20",
    title: "Intelligent batchöverföring av filer",
    description: "Dra och släpp mappar från skrivbordet. AI klassificerar varje fil automatiskt och föreslår rätt kategori.",
    tags: ["Filer", "AI"],
  },
  {
    date: "2026-03-20",
    title: "Automatisk fakturadata-extraktion",
    description: "AI läser fakturor och kvitton för att automatiskt fylla i datum, belopp och leverantörsinfo.",
    tags: ["AI", "Inköp"],
  },
  {
    date: "2026-03-20",
    title: "ROT-avdrag beräknat från fakturor",
    description: "Systemet beräknar ROT-avdrag automatiskt baserat på uppladdade fakturor enligt Skatteverkets regler.",
    tags: ["ROT", "Budget"],
  },
  {
    date: "2026-03-20",
    title: "Anpassningsbar filtabell",
    description: "Slå på och av kolumner i filtabellen: kategori, arbete, inköp, rum, fakturadatum, belopp och ROT.",
    tags: ["Filer", "UX"],
  },
  {
    date: "2026-03-20",
    title: "Mobil ritning med touch-verktyg",
    description: "Touch-optimerat verktygsfält för ritning på mobila enheter. Rita, zooma och panorera med fingrar.",
    tags: ["Mobil", "Canvas"],
  },

  // ── 2026-03-16 ──
  {
    date: "2026-03-16",
    title: "Renomate Junior — AI-assistent",
    description: "Chatbot med personlig avatar som ger projektreminders, svarar på frågor och hjälper dig navigera i appen.",
    tags: ["AI", "Produktivitet"],
  },
  {
    date: "2026-03-16",
    title: "Global sökning med Cmd+K",
    description: "Snabbsökning genom alla projekt, arbeten, material och rum. Grupperade resultat med tangentbordsnavigering.",
    tags: ["Sök", "Produktivitet"],
  },
  {
    date: "2026-03-16",
    title: "Emoji-reaktioner på kommentarer",
    description: "Reagera med emoji (👍, ❤️, 🔥) på projektkommentarer för snabb feedback utan att skriva ett svar.",
    tags: ["Team", "UX"],
  },
  {
    date: "2026-03-16",
    title: "Interaktiv tidslinje",
    description: "Visuell tidslinje med drag-och-släpp för arbeten. Se projektets hela tidplan i en responsiv vy.",
    tags: ["Tidslinje", "Planering"],
  },
  {
    date: "2026-03-16",
    title: "Arbetsberoenden",
    description: "Länka arbeten med beroenden — systemet förhindrar start av beroende uppgifter och hanterar kaskadändringar.",
    tags: ["Planering", "Produktivitet"],
  },
  {
    date: "2026-03-16",
    title: "Projektpåminnelser",
    description: "Automatiska påminnelser för deadlines, saknad budget och planering. Stäng av individuellt per projekt.",
    tags: ["Planering", "Produktivitet"],
  },
];
