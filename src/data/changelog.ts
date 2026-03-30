export interface ChangelogEntry {
  date: string;
  title: string;
  description: string;
  tags?: string[];
}

export const changelog: ChangelogEntry[] = [
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
    description: "Rundare kort, mjuka hover-animationer, tydligare typografi-hierarki och mer luft mellan sektioner. Inspirerat av moderna designprinciper.",
    tags: ["Design"],
  },
  {
    date: "2026-03-29",
    title: "ROT och ÄTA överförs från offert",
    description: "Vid offertaktivering överförs nu ROT-belopp och ÄTA-flagga automatiskt till arbeten. Tilläggsofferter skapar ÄTA-märkta arbeten.",
    tags: ["Offert", "ROT"],
  },
  {
    date: "2026-03-27",
    title: "Materialindikator i arbetslistvy",
    description: "Kundvagnsikon visas bredvid arbeten med materialbudget — hovra för att se beloppet utan att öppna kortet.",
    tags: ["Arbeten", "UX"],
  },
  {
    date: "2026-03-27",
    title: "Budgetsammanfattning och kategorigruppering",
    description: "Hemägarens planeringsvy visar nu budgetboxar och kan gruppera arbeten per kostnadscenter med hopfällbara sektioner.",
    tags: ["Planering", "Budget"],
  },
];
