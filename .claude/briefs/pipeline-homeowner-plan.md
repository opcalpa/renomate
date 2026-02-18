# Plan: Anpassad Pipeline-vy för Hemägare vs Entreprenörer

## Sammanfattning

Sektionen "Mina offerter" ska visa olika innehåll beroende på användarens kontotyp (`onboarding_user_type`).

---

## Nuvarande Datamodell

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ENTREPRENÖR-FLÖDE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Entreprenör              customer_intake_requests              Hemägare    │
│  (creator_id) ─────────► ┌─────────────────────┐ ◄───────── (customer_email)│
│                          │ • id                │                            │
│                          │ • creator_id        │                            │
│                          │ • customer_email    │ ◄── Matchas mot profiles   │
│                          │ • status            │                            │
│                          │ • submitted_at      │                            │
│                          └──────────┬──────────┘                            │
│                                     │                                       │
│                                     │ intake_request_id                     │
│                                     ▼                                       │
│                          ┌─────────────────────┐                            │
│  Entreprenör             │      quotes         │              Hemägare      │
│  (creator_id) ─────────► │ • id                │ ◄───────── (client_id)     │
│                          │ • creator_id        │                            │
│                          │ • client_id         │ ◄── Länkas till profiles   │
│                          │ • status            │                            │
│                          │ • intake_request_id │                            │
│                          └─────────────────────┘                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Nyckelinsikt:** Hemägarens koppling sker via:
1. `customer_intake_requests.customer_email` = `profiles.email` (formulär skickade till dem)
2. `quotes.client_id` = `profiles.id` (offerter adresserade till dem)

---

## Föreslagen Arkitektur

### Komponentstruktur

```
src/components/pipeline/
├── LeadsPipelineSection.tsx      # Wrapper - väljer rätt vy baserat på userType
├── ContractorPipelineView.tsx    # Befintlig logik (refaktorerad)
├── HomeownerPipelineView.tsx     # NY
├── shared/
│   ├── PipelineCard.tsx          # Gemensam kort-komponent
│   └── QuotePreviewDialog.tsx    # Gemensam offertvisning
├── AllIntakeRequestsDialog.tsx   # Entreprenör: skickade formulär
├── AllQuotesDialog.tsx           # Entreprenör: skapade offerter
├── ReceivedFormsDialog.tsx       # NY: Hemägare: mottagna formulär
├── ReceivedQuotesDialog.tsx      # NY: Hemägare: mottagna offerter
└── types.ts
```

### Datahämtning

#### Befintligt: `useLeadsPipelineData.ts` (Entreprenör)
```typescript
// Hämtar där creator_id = current_profile_id
customer_intake_requests WHERE creator_id = me
quotes WHERE creator_id = me
```

#### Nytt: `useHomeownerPipelineData.ts`
```typescript
// Hämtar där mottagaren är den inloggade hemägaren
customer_intake_requests WHERE customer_email = my_email AND status IN ('pending', 'submitted')
quotes WHERE client_id = my_profile_id OR intake_request.customer_email = my_email
```

---

## UI-specifikation

### Entreprenör-vy (befintlig)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Mina offerter                    [⚡ Snabboffert] [📧 Skicka formulär]  │
│                                                                          │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  │
│  │ 📬 Förfrågningar   │  │ 📄 Offerter        │  │ ✓ Godkända         │  │
│  │    3               │  │    5               │  │   2                │  │
│  │ 2 väntar på svar   │  │ 2 utkast           │  │ 156 000 kr         │  │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Hemägare-vy (ny)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Mina förfrågningar                                                      │
│                                                                          │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  │
│  │ 📬 Att fylla i     │  │ 📄 Mottagna        │  │ ✓ Godkända         │  │
│  │    1               │  │    offerter        │  │   avtal            │  │
│  │ formulär           │  │    2               │  │   1                │  │
│  │                    │  │ 1 att granska      │  │                    │  │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘  │
│                                                                          │
│  Inga knappar för att skapa - hemägare är mottagare, inte avsändare     │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Statusflöde per Roll

### Intake Requests

| Status | Entreprenör ser | Hemägare ser |
|--------|-----------------|--------------|
| `pending` | "Väntar på svar" | "Att fylla i" (om ej besvarad) |
| `submitted` | "Kräver åtgärd" | "Inskickad" (väntar på offert) |
| `converted` | "Omvandlad till projekt" | - (visas inte) |
| `expired` | "Utgången" | "Utgången" |
| `cancelled` | "Avbruten" | - (visas inte) |

### Quotes

| Status | Entreprenör ser | Hemägare ser |
|--------|-----------------|--------------|
| `draft` | "Utkast" | - (visas ej) |
| `sent` | "Skickad" | "Att granska" |
| `accepted` | "Godkänd" | "Godkänd" |
| `rejected` | "Nekad" | "Nekad" |
| `expired` | "Utgången" | "Utgången" |

---

## Implementation i Faser

### Fas 1: Dölj för hemägare (snabb)
- Lägg till `userType` prop i `LeadsPipelineSection`
- Om `userType === "homeowner"` → returnera `null`
- Enkel fix som inte bryter något

### Fas 2: Infrastruktur (medel)
- Skapa `useHomeownerPipelineData.ts`
- Skapa `HomeownerPipelineView.tsx` (tom skall)
- Uppdatera `LeadsPipelineSection` att välja rätt vy

### Fas 3: Hemägare-vy (större)
- Implementera `ReceivedFormsDialog.tsx`
- Implementera `ReceivedQuotesDialog.tsx`
- Koppla formulär-länk till CustomerIntake-sidan
- Lägg till offertgransknings-UI

### Fas 4: Interaktioner (komplex)
- Offert-godkännande från hemägare-vyn
- Offert-nekande med motivering
- Kommunikation/kommentarer på offerter
- Notifikationer vid nya förfrågningar/offerter

---

## Databasändringar (ev. framtida)

### Nuvarande koppling (tillräcklig för fas 1-3)
- Ingen schemaändring krävs
- Använd email-matchning för intake_requests
- Använd client_id för quotes

### Framtida förbättring
```sql
-- Lägg till direkt profil-länk på intake_requests
ALTER TABLE customer_intake_requests
ADD COLUMN customer_profile_id UUID REFERENCES profiles(id);

-- Index för snabb sökning
CREATE INDEX idx_intake_customer_email ON customer_intake_requests(customer_email);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);
```

---

## i18n-nycklar

```json
{
  "pipeline": {
    "myQuotes": "Mina offerter",
    "myRequests": "Mina förfrågningar",
    "formsToFill": "Att fylla i",
    "receivedQuotes": "Mottagna offerter",
    "approvedContracts": "Godkända avtal",
    "toReview": "att granska",
    "submitted": "Inskickad",
    "awaitingQuote": "Väntar på offert"
  }
}
```

---

## Beslutspunkter

1. **Visa tomma kort?**
   - Alternativ A: Visa alltid alla tre kort (med 0)
   - Alternativ B: Dölj hela sektionen om inget finns
   - Rekommendation: Visa kort med 0, men med "Inga formulär ännu"-text

2. **Offert-granskning i app vs email?**
   - Nuvarande: Email-notis med länk till publikt offert-preview
   - Framtida: In-app granskning och godkännande
   - Rekommendation: Behåll email-flöde men lägg till in-app visning

3. **Notifikationer?**
   - Ska hemägare få toast/badge när ny offert kommer?
   - Rekommendation: Ja, men i senare fas

---

## Filberoenden

```
src/pages/Projects.tsx
└── LeadsPipelineSection
    ├── userType (från profile.onboarding_user_type)
    ├── ContractorPipelineView (om contractor)
    │   └── useLeadsPipelineData
    └── HomeownerPipelineView (om homeowner)
        └── useHomeownerPipelineData
```

---

## Rekommenderad Första Implementation

**Fas 1 nu:** Dölj sektionen för hemägare
- Minimal ändring
- Låter oss fokusera på annat först
- Hemägare får tydligare UI utan förvirrande element

**Fas 2-3 senare:** Full hemägare-vy
- När vi har fler aktiva entreprenörer som skickar offerter
- När vi har feedback från hemägare om behov

---

Vill du att jag implementerar Fas 1 nu?
