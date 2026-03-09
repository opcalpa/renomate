# Sprint 2026-W11 (9 mars 2026)

## Kontext

- **Aktiva användare:** ~50 beta-testare
- **Senaste sprint-brief:** W10 (2 mars)
- **Migrationer:** Alla applicerade till remote (verifierat 2026-03-09)
- **Teknisk status:** Canvas refaktorerad. Guest mode live. Smart import, estimering, RFQ-flöde byggt.
- **Mål:** GO LIVE — prioritera blockerare för riktig launch.

## Vad som byggts sedan W08

| Område | Filer | Status |
|--------|-------|--------|
| **Fakturasystem** | CreateInvoice, ViewInvoice, invoiceService, InvoiceComments | Nytt, ej committad |
| **Offert-förbättringar** | Kommentarer, rabatter, delning, viewed_at-spårning, ShareQuoteDialog | Nytt, ej committad |
| **Unified Budget Table** | Hierarkiska sub-rader (material under arbeten), expand/collapse, inga dubbelräkningar | Nytt, ej committad |
| **Projektstatus-livscykel** | Status-driven CTAs, ProjectStatusCTA, statusövergångar | Committat |
| **Planeringsfas** | PlanningTaskList med inline scope builder, förenklade TaskEditDialog | Committat |
| **Kundvy** | CustomerViewTab, ClientInvoiceList | Nytt, ej committad |
| **Task-kostnadsestimering** | estimated_hours, hourly_rate, subcontractor_cost, material_estimate, markup_percent | Nytt, ej committad |
| **GuidedSetupWizard** | Förbättrad onboarding-wizard med steg-per-steg | Modifierad |
| **Kvittohantering** | QuickReceiptCaptureModal förbättringar | Modifierad |
| **Profilsida** | Betalfält (bank, Swish, org.nr) för fakturering | Modifierad |
| **Notifikationer** | Förbättrad NotificationBell + useNotifications | Modifierad |
| **Canvas-refaktorering** | UnifiedKonvaCanvas uppdelad i moduler, hooks, tools | Committat (80aae18) |
| **Budget-dashboard** | BudgetDashboard, BudgetTab förbättringar | Modifierad |

### 17 nya migrationer (EJ APPLICERADE)

```
20260219110000_add_task_cost_estimation_fields.sql
20260219120000_update_project_status_constraint.sql
20260219140000_add_comment_and_discount_to_quote_items.sql
20260219150000_add_related_quote_id_to_invitations.sql
20260220100000_allow_anon_read_invitation_by_token.sql
20260220110000_allow_invited_user_to_create_own_share.sql
20260220120000_add_viewed_at_to_quotes.sql
20260220200000_add_parent_task_id_to_tasks.sql
20260221100000_add_client_role_to_project_shares.sql
20260221110000_optimize_quote_comments_rls.sql
20260221120000_add_company_logo_to_profiles.sql
20260221130000_allow_project_members_update_quote_status.sql
20260221140000_quote_status_triggers_project_update.sql
20260221150000_add_is_ata_and_auto_budget_on_accept.sql
20260222100000_add_invoices.sql
20260222110000_add_payment_fields_to_profiles.sql
20260222120000_add_related_invoice_id_to_invitations.sql
20260222130000_invoice_comments_rls.sql
```

---

## CEO-analys (2026-03-02)

### Observation

Sedan W08 har det byggts **enormt mycket** — fakturor, offerter, budgethierarki, kundvy, planeringsfas, kostnadsestimering. Produkten har gått från "projektverktyg" till "affärssystem för renoveringsföretag."

Men: **inget har committats till main på 2 veckor** och **17 migrationer väntar**. Det innebär:
1. Risk för merge-konflikter och förlorat arbete
2. Remote-databasen är ur synk med koden
3. Ingen av de 50 beta-testarna ser de nya funktionerna

### Strategisk bedömning

**Positiv:** Offert → Faktura-flödet och kundvyn bygger direkt mot CRO:s ICP (små entreprenörer). Det här är exakt den funktionalitet som skiljer "leksak" från "verktyg jag betalar för."

**Varning:** Vi har breddat produkten snabbt utan att mäta om activation förbättrats. Riskerar att bygga fler features som ingen hittar.

**Canvas-refaktoreringen** (80aae18) är klar — det var W08:s prio 1. Bra.

### CEO-beslut W10

| Prio | Åtgärd | Varför |
|------|--------|--------|
| **1** | **Committa + pusha + applicera migrationer** | 17 migrationer och 4600 rader obevakat = risk. Applicera till remote NU. |
| **2** | **Stabilisera offert→faktura-flödet** | Kärnvärde för ICP. Gör klart, testa end-to-end. |
| **3** | **Instrumentera activation** | Vi vet inte om onboarding fungerar bättre nu. Lägg in event-tracking. |
| **4** | **History-prestanda (immer.js)** | Kvar från W08. Blockerar vid >500 shapes. |

### Parkerat (oförändrat)

| Område | Väntar på |
|--------|-----------|
| Fullt offline-stöd | >10 fältanvändare |
| Betalningsintegration (Stripe) | Activation >50% |
| Discover/retention-sida | Sprint 4+ |
| Enterprise-tier | 12-18 mån bort |

---

## Specialist-logg W10

### CTO

**Datum:** 2026-03-02

**Status sedan W08:**
- Canvas-refaktorering KLAR (80aae18) — UnifiedKonvaCanvas uppdelad i moduler/hooks/tools
- History-prestanda (immer.js) — EJ PÅBÖRJAD, kvarstår
- OfflineIndicator — EJ AKTIVERAD, kvarstår
- Pinterest-säkerhet — AVSKRIVET (oEmbed, ingen risk)

**Nya risker:**

| Risk | Allvarlighet | Beskrivning |
|------|-------------|-------------|
| **17 ej applicerade migrationer** | KRITISK | Koden refererar kolumner/tabeller som inte finns på remote. Deploy = krasch. |
| **43 filer uncommitted** | HÖG | 4600+ rader ändringar utan version control. En felaktig `git checkout` = allt borta. |
| **Fakturasystem utan RLS-verifiering** | HÖG | `invoices`-tabellen har RLS (migration 20260222130000) men policies bör granskas innan production. |
| **Supabase types.ts — 245 rader tillagda** | MEDIUM | Manuellt genererade typer riskerar att bli ur synk. Kör `supabase gen types`. |

**Positiva framsteg:**
- Unified table med gruppering löser dubbelräkningsproblemet korrekt
- TaskEditDialog sticky footer — bra UX-fix
- RLS på invoice_comments — rätt tänkt

**Rekommendation:**
1. `git add` + `git commit` IDAG
2. `supabase db push` för alla 17 migrationer
3. `supabase gen types typescript` för att synka types.ts
4. Granska invoice RLS-policies

**Insats:** Liten (1-2h för commit + push + verify)

---

### UX-Designer

**Datum:** 2026-03-02

**Status sedan W08:**
De stora UX-problemen från onboarding-analysen (W08) är delvis adresserade:

| Problem från W08 | Status nu |
|-------------------|-----------|
| Onboarding saknar tydligt mål | GuidedSetupWizard förbättrad |
| Tomma tillstånd utan CTA | Delvis löst (ProjectStatusCTA finns) |
| Projektsidan har för många flikar | OFÖRÄNDRAT |
| Mobil Space Planner | OFÖRÄNDRAT |
| Breadcrumbs/kontext | OFÖRÄNDRAT |

**Nya observationer:**

1. **Unified table med sub-rader** — Bra! Kundvagnsikonen som expand-toggle är kompakt och intuitiv. Dubbelräkningsproblemet löst. Men: testning behövs med riktiga data för att se om hierarkin är begriplig för husägare.

2. **TaskEditDialog sticky footer** — Korrekt fix. Viktigt mönster: alla dialoger med scrollbart innehåll bör ha sticky action-knappar.

3. **Kundvy (CustomerViewTab)** — Kritiskt viktigt! Husägaren behöver en förenklad vy. Måste granskas separat: är den tillräckligt enkel?

4. **Faktura/Offert-flöde** — Stor funktion för entreprenörer. UX-granskning behövs: är flödet skapa offert → skicka → kund godkänner → konvertera till projekt → fakturera intuitivt?

**Rekommendation:**
- Gör en UX-walkthrough av hela offert→faktura-flödet innan release
- Verifiera att CustomerViewTab fungerar för otekniska hemägare
- Säkerställ att alla nya dialoger har sticky footers

**Insats:** 1 dag UX-review

---

### Platschef

**Datum:** 2026-03-02

**Bedömning:** Appen rör sig åt rätt håll för fältanvändning.

| Mitt krav från W08 | Status |
|---------------------|--------|
| Offline-stöd | PARKERAT (CEO-beslut) |
| Snabborder FAB | INTE BYGGT |
| Terminologi-pass sv.json | DELVIS — nya nycklar tillagda men inte granskat byggjargong |
| Foto multi-koppling | INTE BYGGT |
| Mobilanpassad tidslinje | INTE BYGGT |

**Nytt som påverkar fältarbete:**

1. **Budget-hierarki med sub-rader** — BRA. Material under arbetsuppgifter gör det lättare att se vad som ingår i ett arbetsmoment. En montör kan se "Badrumsrenovering" och expandera för att se vilka inköp som hör dit.

2. **Kvittohantering (QuickReceiptCaptureModal)** — Förbättrad. Montörer kan ta foto av kvitto direkt. Bra för fältrapportering.

3. **Kostnadsestimering på tasks** — Bra grund. Men fälten (estimated_hours, hourly_rate, markup_percent) är "kontorsspråk". En snickare tänker "3 dagars jobb" inte "24 timmar á 450 kr/h med 15% markup."

**Terminologiproblem kvarstår:**
- "Subcontractor cost" → borde vara "UE-kostnad" eller "Underentreprenör"
- "Material estimate" → "Materialkalkyl"
- "Markup percent" → "Påslag" eller "Pålägg"

**Rekommendation:** Gör ett terminologi-pass på de nya i18n-nycklarna. Insats: 2 timmar.

---

### Inredningsarkitekt

**Datum:** 2026-03-02

**Status:** Canvas-refaktoreringen (80aae18) är genomförd. Bra steg för underhållbarhet.

Mina 5 kritiska brister från W08:

| Brist | Status |
|-------|--------|
| Oprecis snapping | OFÖRÄNDRAD |
| Ingen live-mått vid ritning | OFÖRÄNDRAD |
| Smart objektplacering | OFÖRÄNDRAD |
| Elevation-vy isolerad | OFÖRÄNDRAD |
| Inga lager (layers) | OFÖRÄNDRAD |

**Kommentar:** Canvas-splitten var nödvändig teknisk skuld-hantering, men inga funktionella förbättringar av ritverktyget har skett. Det är OK att detta är parkerat — budgethantering och offertflöde har högre affärsvärde just nu. Men om Renomate ska attrahera proffs-användare (arkitekter, inredare) behöver snap + live-mått prioriteras i Q2.

**Rekommendation:** Parkera canvas-features till Q2. Fokusera nu på affärsflödet (offert→faktura).

---

### CRO (Chief Revenue Officer)

**Datum:** 2026-03-02

**Observation:** Produktutvecklingen har accelererat mot ICP:s kärnbehov (små entreprenörer). Offert→Faktura-flödet är den **mest kommersiellt kritiska funktionen** som byggts hittills.

**Revenue Readiness Ladder — uppdatering:**

```
STEG 5: SKALA                                    ○
STEG 4: OPTIMERA                                 ○
STEG 3: MONETARISERA                             ○
STEG 2: RETENTION                                ◐ (offert→faktura = retention-driver)
STEG 1: ACTIVATION  ◄── FORTFARANDE HÄR ──►      ◐ (GuidedSetup förbättrad)
STEG 0: PROBLEM-FIT                              ● (validerat)
```

**Nyckelinsikter:**

1. **Offert→Faktura = betalningsvilja-signal.** Ingen entreprenör betalar för ett "projektverktyg." Men ett system som hanterar offerter, spårar godkännanden, genererar fakturor? Det sparar dem 5+ timmar/vecka. DET betalar de för.

2. **Kundvy (CustomerViewTab) = viral loop i praktiken.** Varje offert som skickas till en husägare = en ny användare som ser Renomate. Om upplevelsen är bra: word-of-mouth. Om den är dålig: entreprenören slutar använda appen.

3. **Budget-hierarki löser "dubbelräkning" som blockerade trovärdighet.** En entreprenör som visar en felaktig budget för sin kund tappar förtroendet för verktyget omedelbart.

**Kommersiella frågor att besvara:**
- Hur många av de 50 beta-testarna har skickat en offert?
- Har någon konverterat offert→projekt→faktura end-to-end?
- Vad kostar det idag (tid/pengar) för en entreprenör att göra detta manuellt?

**Rekommendation:** Instrumentera offert→faktura-flödet. Mät completion rate. Detta är data som visar om vi närmar oss monetarisering.

---

### Firmaägare

**Datum:** 2026-03-02

**Reaktion:** Nu börjar det likna något! Offert + Faktura + Kundvy = det jag behöver varje dag.

| Mitt önskade flöde | Status |
|--------------------|--------|
| Ny kundförfrågan → Skapa lead | Finns (intake) |
| Platsbesök → Foton, skiss, Space Planner | Finns |
| Godkänd offert → Auto-konvertera till tasks | FINNS (createTasksFromQuote) |
| Projektgenomförande → Spåra, rapportera | Finns (tasks, budget, unified table) |
| Slutbesiktning → Faktura | **NYTT!** Fakturasystem byggt |

**Det som saknas för att jag ska använda det dagligen:**

1. **Offert → Faktura hela vägen** — Kan jag skapa en faktura baserad på godkänd offert med ett klick? Eller måste jag fylla i allt igen?

2. **PDF-export av offert/faktura** — Mina kunder vill ha PDF i mejlen, inte en länk till en app.

3. **Bankgiro/Swish-info på fakturan** — Ser att profilsidan har betalfält nu. Bra! Men syns de på fakturan?

4. **ÄTA-hantering** — Budget-hierarkin är bra. Men ÄTA (ändrings- och tilläggsarbeten) behöver vara tydligt separerade. Kunden ska inte blanda ihop originaloffert med tillägg.

**Rekommendation:** Testa end-to-end: skapa offert → skicka till kund → kund godkänner → konvertera → jobba → fakturera. Var bryts flödet?

---

### Hemägare

**Datum:** 2026-03-02

**Perspektiv:** Jag har blivit inbjuden till ett renoveringsprojekt. Vad ser jag?

**Nytt sedan W08:**
- CustomerViewTab finns — en förenklad vy för mig
- Offerten kommer som delningslänk — jag kan se och godkänna
- Fakturan kan visas i appen

**Mina farhågor:**

1. **Är kundvyn verkligen enkel?** Jag vill se: foton, framsteg, nästa steg, kostnad. Inte: "tasks", "materials", "budget breakdown", "subcontractor cost."

2. **Offertgodkännande** — Kan jag godkänna med ett klick? Eller behöver jag skapa konto först? Varje extra steg = jag ringer hantverkaren istället.

3. **Fakturan** — Var betalar jag? Swish-nummer? Bankgiro? Jag vill inte leta.

4. **Begripligt språk** — "Purchase requests", "ordered amount", "payment status" — förstår inte. Behöver vanlig svenska: "Beställt", "Betalt", "Återstår."

**Rekommendation:** Testa kundvyn med någon som INTE är teknisk. Ge dem länken och se om de förstår utan hjälp.

---

### Community Manager

**Datum:** 2026-03-02

**Status:** Community-arbete har inte påbörjats (korrekt per CEO-beslut — parkerat till Sprint 4+).

**Observation:** Offert-delningsfunktionen är den första "sociala" funktionen i Renomate. Varje skickad offert = en touchpoint med en potentiell ny användare. Detta är grunden för den virala loopen.

**Rekommendation:** Säkerställ att den delade offert-/fakturavyn har:
- Renomate-branding (subtil, inte påträngande)
- "Powered by Renomate" footer med signup-länk
- Professionellt utseende som reflekterar väl på entreprenören

**Insats:** Liten (verifiera befintlig implementation)

---

## Frågor till CEO

### Nya frågor

1. **CTO (2026-03-02):** 17 migrationer väntar + 4600 rader uncommitted. Ska jag köra commit + push + `supabase db push` nu?

   **Rekommendation:** JA. Omedelbart. Risken för dataloss ökar varje dag.

2. **CRO (2026-03-02):** Ska vi instrumentera offert→faktura-flödet med event-tracking innan release? Det ger oss data för monetaiseringsbeslut.

   **Rekommendation:** JA, men minimal (5-10 events). Inte ett fullskaligt analytics-system.

3. **Firmaägare (2026-03-02):** Finns det end-to-end-test av offert→faktura-flödet? Ingen av oss har sett det fungera hela vägen.

   **Rekommendation:** Prioritera manuell testning innan commit.

4. **Platschef (2026-03-02):** De nya i18n-nycklarna för kostnadsestimering behöver terminologi-pass. Kan jag göra det? (2 timmars insats)

   **Rekommendation:** JA, gör det innan commit.

### Besvarade frågor (historik)

1. **Platschef (W08):** Offline-stöd → CEO: Parkerat
2. **CTO (W08):** Pinterest-säkerhet → CEO: AVSKRIVET (oEmbed)
3. **CRO + CM (W08):** Discover/retention → CEO: Parkerat till Sprint 4+
4. **CTO + CRO (W08):** Stripe → CEO: Godkänt som plattform, ingen dev förrän activation >50%

---

## Mätetal

| Metrik | W08 (uppskattning) | W10 (uppskattning) | Mål |
|--------|--------------------|--------------------|-----|
| Signup → Första projekt (mobil) | ~30% | ~35% | 50% |
| Signup → Första projekt (desktop) | ~50% | ~55% | 70% |
| Onboarding completion rate | ~15% | ~20% | 40% |
| Demo-projekt öppnat | ~40% | ~45% | 60% |
| Offert skickad | N/A | OKÄNT | Börja mäta! |
| Faktura skapad | N/A | 0 (ny funktion) | Börja mäta! |

**North Star W10:** Committa, applicera migrationer, stabilisera offert→faktura → börja mäta.

---
*Last Updated: 2026-03-02*
