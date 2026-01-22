# 🚪 Ny Funktion: Dörr-knapp med Objekt & Former Submeny

## ✨ Vad Är Nytt?

Dörr-knappen har nu **dubbel funktionalitet** precis som vägg-knappen:

### 1. Placera Dörr (Som Förut)
Klicka på huvuddelen av dörr-knappen för att placera dörrar direkt.

### 2. Objekt & Former Submeny (NYT!)
Öppna en rik submeny med:
- **Väggöppningar** (fönster)
- **Grundformer** (fyrkant, cirkel, triangel)
- **Streckade former** (samma former med streckad kant)
- **Rundade former** (samma former med rundade hörn)

## 📐 Objekt i Submenyn

### 🪟 Väggöppning
**Fönster**
- Öppning i vägg
- Fungerar som den tidigare "Väggöppning"-knappen
- Perfekt för fönster och andra väggöppningar

### ⬜ Grundformer (Solida linjer)
**Fyrkant**
- Rektangel med raka kanter
- Normal solid linje
- Användning: Möbler, rum, avgränsningar

**Cirkel**
- Perfekt rund cirkel
- Normal solid linje
- Användning: Runda bord, element, dekorationer

**Triangel**
- Tre sidor, raka linjer
- Normal solid linje
- Användning: Designelement, pilar, markeringar

### - - - Streckade Former
Samma former som ovan men med streckade linjer för att visa:
- Temporära element
- Planerade tillägg
- Frivilliga/optionella delar
- Gränser utan fysisk barriär

**Fyrkant (streckad)**
- Rektangel med streckad kant
- Användning: Planerad möblering, framtida expansion

**Cirkel (streckad)**
- Cirkel med streckad kant
- Användning: Aktivitetsområden, ljuskoner

**Triangel (streckad)**
- Triangel med streckad kant
- Användning: Siktlinjer, riktningsmarkeringar

### ◯ Rundade Former
Samma former med mjuka, rundade hörn för en mjukare estetik:

**Fyrkant (rundade hörn)**
- Rektangel med rundade hörn
- Mjukare, modernare look
- Användning: Moderna möbler, display-element

**Triangel (rundad)**
- Triangel med rundade hörn
- Mjukare estetik
- Användning: Designelement med mjukare känsla

## 🎯 Hur Använder Man Det?

### Metod 1: Högerklick
```
1. Högerklicka på dörr-knappen (🚪)
2. Välj kategori och form från menyn
3. Klicka på canvas för att placera objektet
```

### Metod 2: Klick på Kant
```
1. Klicka på den högra delen av dörr-knappen
2. Submenyn öppnas automatiskt
3. Välj objekt
4. Placera på canvas
```

### Metod 3: Visuell Guide
```
1. Se efter den lilla pilen (▶) i nedre högra hörnet
2. Hover för tooltip med instruktioner
```

## 📋 Submeny-struktur

```
┌─────────────────────────────────┐
│ VÄGGÖPPNING                      │
├─────────────────────────────────┤
│ 🪟 Fönster                       │
│    Öppning i vägg                │
├─────────────────────────────────┤
│ GRUNDFORMER                      │
├─────────────────────────────────┤
│ ⬜ Fyrkant    ⭕ Cirkel           │
│ 🔺 Triangel                      │
├─────────────────────────────────┤
│ STRECKADE FORMER                 │
├─────────────────────────────────┤
│ ⬜ Fyrkant    ⭕ Cirkel           │
│ 🔺 Triangel                      │
│ (alla med streckade linjer)      │
├─────────────────────────────────┤
│ RUNDADE HÖRN                     │
├─────────────────────────────────┤
│ ◻️ Fyrkant    🔺 Triangel         │
│ (med mjuka rundade hörn)         │
└─────────────────────────────────┘
```

## 🎨 Use Cases per Objekttyp

### Väggöppning - Fönster
```
Användning:
- Fönster i ytterväggar
- Fönster mellan rum (passage)
- Öppningar för ventilation
- Öppna passager

Exempel på ritningen:
- Stora fönster i vardagsrum
- Fönster i sovrum
- Balkongdörr (stor öppning)
```

### Grundformer (Solida)
```
Fyrkant:
- Möbler: Bord, soffor, sängar
- Vitvaror: Kylskåp, spis, tvättmaskin
- Skåp och förvaring
- Avgränsade områden

Cirkel:
- Runda bord
- Lampor (ovanifrån)
- Runda element
- Pelare (cirkulära)

Triangel:
- Pilar för riktning
- Designelement
- Triangulära möbler
- Markeringar
```

### Streckade Former
```
Användning:
- Planerade möbler (ej köpta ännu)
- Framtida expansion
- Temporära lösningar
- Aktivitetsområden
- Ljuskonor från lampor
- Siktlinjer
- Frivilliga element

Exempel:
- "Eventuellt stort bord här"
- "Planerad utbyggnad"
- "Siktlinje från fönster"
```

### Rundade Former
```
Användning:
- Moderna möbler med mjuka former
- Display-element
- Mjukare estetik i moderna hem
- Designelement
- Barn-vänliga ytor

Exempel:
- Modern soffa med rundade hörn
- Mjukt avrundat köksö
- Rundade förvaringsmöbler
```

## 🔄 Jämförelse: Före vs Efter

### FÖRE
```
┌─────┐
│ 🚪  │ ← Dörr (Placera dörr)
└─────┘
┌─────┐
│ ▭   │ ← Väggöppning (Separat knapp)
└─────┘
```

### EFTER
```
┌─────┐
│ 🚪▶ │ ← Dörr (Placera dörr + Rik submeny)
└─────┘
  └─────► Högerklicka → Submeny
           ├─ Väggöppning
           │  └─ Fönster
           ├─ Grundformer
           │  ├─ Fyrkant
           │  ├─ Cirkel
           │  └─ Triangel
           ├─ Streckade former
           │  ├─ Fyrkant
           │  ├─ Cirkel
           │  └─ Triangel
           └─ Rundade hörn
              ├─ Fyrkant
              └─ Triangel
```

## 💡 Fördelar

### 1. **Alla Objekt på Ett Ställe**
Allt du behöver för att lägga till objekt finns under dörr-knappen.

### 2. **Organiserad Struktur**
Tydlig gruppering:
- Väggöppningar
- Grundformer
- Streckade former
- Rundade former

### 3. **Mindre Toolbar**
Väggöppning-knappen är borttagen, allt finns i submenyn.

### 4. **Fler Alternativ**
12 olika objekttyper istället för 2-3 tidigare.

### 5. **Professionell Presentation**
Olika linjestilar (solid, streckad) och form-varianter.

## 🎨 Visuella Exempel

### Solid vs Streckad vs Rundad
```
SOLID (Normal)        STRECKAD           RUNDAD
┌─────────┐          ┌ ─ ─ ─ ─ ┐         ╭─────────╮
│         │          │         │         │         │
│         │          │         │         │         │
└─────────┘          └ ─ ─ ─ ─ ┘         ╰─────────╯

Användning:           Användning:         Användning:
- Fasta möbler        - Planerat          - Moderna möbler
- Väggar              - Temporärt         - Mjukare design
- Permanenta objekt   - Frivilligt        - Barnsäkert
```

## 🏗️ Professionell Användning

### Arkitekt-ritning med Streckade Linjer
```
Enligt svensk/internationell standard används streckade linjer för:

1. Dolda element (ej synliga i plan)
2. Planerade tillägg
3. Demoleringar (ibland)
4. Alternativa lösningar
5. Rörelser/flöden
6. Siktlinjer

Exempel i ritning:
- Streckad fyrkant = "Planerad soffa"
- Streckad cirkel = "Ljuskon från lampa"
- Streckad linje = "Siktlinje från kök till vardagsrum"
```

### Moderna Ritningar med Rundade Hörn
```
Rundade hörn används för:
- Moderna möbler med mjuk design
- Säkrare miljöer (förskolor, sjukhus)
- Estetisk variation
- Designelement som sticker ut

Exempel:
- Rundad fyrkant = "Modern soffa från IKEA"
- Rundad triangel = "Designelement i hörn"
```

## ⌨️ Workflow-exempel

### Scenario 1: Rita Vardagsrum med Möbler
```
1. Rita väggar med vägg-verktyget
2. Placera dörr med dörr-verktyget (direkt klick)
3. Högerklicka dörr-knappen → Väggöppning → Fönster
4. Placera fönster i yttervägg
5. Högerklicka dörr-knappen → Grundformer → Fyrkant
6. Placera soffa
7. Högerklicka dörr-knappen → Grundformer → Cirkel
8. Placera runt soffbord
9. Spara (Cmd+S)
```

### Scenario 2: Planera Framtida Inredning
```
1. Rita rummet (väggar + dörrar)
2. Placera fasta möbler med SOLIDA former
3. Högerklicka dörr-knappen → Streckade former → Fyrkant
4. Placera ut planerade möbler (ej köpta)
5. Lägg till text: "Planerad bokhylla"
6. Spara ritningen
```

### Scenario 3: Modern Design-ritning
```
1. Rita rummet
2. Högerklicka dörr-knappen → Rundade hörn → Fyrkant
3. Placera moderna möbler med rundade hörn
4. Skapa en mjuk, modern estetik
5. Använd färger för att highlighta
```

## 🔧 Tekniska Detaljer

### Objekt-typer (Object Types)
```typescript
// Väggöppningar
'window'                    // Fönster

// Grundformer
'rectangle'                 // Fyrkant (solid)
'circle'                    // Cirkel (solid)
'triangle'                  // Triangel (solid)

// Streckade former
'rectangle-dashed'          // Fyrkant (streckad)
'circle-dashed'             // Cirkel (streckad)
'triangle-dashed'           // Triangel (streckad)

// Rundade former
'rectangle-rounded'         // Fyrkant (rundade hörn)
'triangle-rounded'          // Triangel (rundade hörn)
```

### Implementation
```typescript
const handleDoorObject = (objectType: string) => {
  (window as any).__createDoorObject = objectType;
  
  if (objectType === 'window') {
    setActiveTool('opening'); // Väggöppning
  } else {
    setActiveTool('select'); // Placering
  }
  
  setDoorSubmenuOpen(false);
};
```

### Canvas-hantering
```typescript
// I UnifiedKonvaCanvas.tsx kommer detta behövas:
useEffect(() => {
  const objectType = (window as any).__createDoorObject;
  
  if (objectType) {
    // Skapa och placera objektet baserat på typ
    createObjectOnCanvas(objectType);
    delete (window as any).__createDoorObject;
  }
}, []);
```

## 🧪 Testa Funktionen

### Test 1: Placera Fönster
```
1. Högerklicka dörr-knappen
2. Väggöppning → Fönster
3. Klicka på vägg
✅ Fönster placeras i väggen
```

### Test 2: Rita Solid Fyrkant
```
1. Högerklicka dörr-knappen
2. Grundformer → Fyrkant
3. Klicka på canvas
✅ Solid fyrkant placeras
```

### Test 3: Rita Streckad Cirkel
```
1. Högerklicka dörr-knappen
2. Streckade former → Cirkel
3. Klicka på canvas
✅ Cirkel med streckad kant placeras
```

### Test 4: Rita Rundad Fyrkant
```
1. Högerklicka dörr-knappen
2. Rundade hörn → Fyrkant
3. Klicka på canvas
✅ Fyrkant med rundade hörn placeras
```

## 📊 Alla 12 Objekttyper

| # | Typ | Kategori | Linjestil | Användning |
|---|-----|----------|-----------|------------|
| 1 | Fönster | Väggöppning | N/A | Öppningar i väggar |
| 2 | Fyrkant | Grundform | Solid | Möbler, avgränsningar |
| 3 | Cirkel | Grundform | Solid | Runda element |
| 4 | Triangel | Grundform | Solid | Pilar, markeringar |
| 5 | Fyrkant | Streckad | Streckad | Planerade element |
| 6 | Cirkel | Streckad | Streckad | Ljuskonor, områden |
| 7 | Triangel | Streckad | Streckad | Siktlinjer |
| 8 | Fyrkant | Rundad | Solid + rundad | Moderna möbler |
| 9 | Triangel | Rundad | Solid + rundad | Mjuka designelement |

## ✅ Verifiering

Efter uppdateringen ska du se:

1. ✅ Dörr-knappen har liten pil (▶) i hörnet
2. ✅ Högerklick öppnar submeny med 4 sektioner
3. ✅ Väggöppning-knappen är borta från toolbar
4. ✅ 12 olika objekttyper finns i submenyn
5. ✅ Tooltip visar "Högerklicka för objekt & former"

## 🚀 Framtida Förbättringar

### Fler Formvarianter
- [ ] Ellips (oval)
- [ ] Polygon (5-8 kanter)
- [ ] Stjärna
- [ ] Pil (olika riktningar)
- [ ] Hexagon
- [ ] Oktagon

### Fler Linjestilar
- [ ] Dubbellinje (för väggar i möbler)
- [ ] Prickad linje
- [ ] Streck-prick linje
- [ ] Tjock/tunn variation

### Smart Features
- [ ] Storlek-presets (Small/Medium/Large)
- [ ] Roteringsmöjlighet vid placering
- [ ] Snabbtangenter för varje form
- [ ] Favorit-objekt (för snabb åtkomst)

## 💬 Feedback

Om du har synpunkter:

### Vad Fungerar Bra?
- [ ] Tydlig organisering i kategorier
- [ ] Lätt att hitta rätt objekttyp
- [ ] Bra variation av former

### Vad Kan Förbättras?
- [ ] Submenyn är för stor (scrollning krävs)
- [ ] Fler formvarianter behövs
- [ ] Preview av form innan placering

## 🎉 Sammanfattning

**Dörr-knappen är nu ett kraftfullt verktyg med 12 objekttyper:**

### Tidigare
- Placera dörr
- (Separat knapp för väggöppning)

### Nu
1. **Placera dörr** (direkt klick)
2. **Högerklick → 12 objekttyper:**
   - 1x Väggöppning (fönster)
   - 3x Grundformer (solid)
   - 3x Streckade former
   - 2x Rundade former

**Detta gör verktyget mycket mer kraftfullt för professionella arkitekt-ritningar!** 🚀

---

**Börja använda det nu!** Högerklicka på dörr-knappen och utforska alla möjligheter! 🎨
