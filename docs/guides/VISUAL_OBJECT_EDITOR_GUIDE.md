# 🎨 Visual Object Editor - Användarguide

## Översikt

**Visual Object Editor** är ett grafiskt redigeringsverktyg där du kan RITA och JUSTERA arkitektoniska objekt visuellt, istället för att skriva JSON-kod. Du ser objektet live medan du arbetar!

## 🚀 Snabbstart

### **Öppna Visual Editor**
```
1. Öppna Space Planner
2. Klicka Settings-ikonen (⚙️) under Objekt-sektionen
3. Välj ett objekt (t.ex. "Badkar")
4. Klicka "Redigera"
5. Klicka fliken "Visuell Editor" (istället för "JSON")
6. ✅ Nu ser du den visuella editorn!
```

## 🎨 Interface-Översikt

```
┌─────────────────────────────────────────────────────────────┐
│ [V] [─] [○] [□] [◯] │ [↶] [↷] [🗑] │ [-] 100% [+] [⟲]      │  ← Toolbar
├──────────────────────────────┬──────────────────────────────┤
│                              │  Formegenskaper              │
│                              │  ┌────────────────────────┐  │
│  CANVAS (Rita här)           │  │ Typ: circle            │  │
│  ┌────────────────────────┐  │  │ Center X: 250 mm       │  │
│  │  Grid 50mm × 50mm      │  │  │ Center Y: 400 mm       │  │
│  │  ┌───────────────────┐ │  │  │ Radie: 200 mm          │  │
│  │  │ Ditt objekt       │ │  │  │ ├──────────────────┤   │  │
│  │  │ ritas här...      │ │  │  │ Linjefärg: #000000     │  │
│  │  │                   │ │  │  │ Linjetjocklek: 2px     │  │
│  │  │  ●               │ │  │  │ Fyllnadsfärg: [Tom]    │  │
│  │  │                   │ │  │  │ Genomskinlighet: 100%  │  │
│  │  └───────────────────┘ │  │  └────────────────────────┘  │
│  └────────────────────────┘  │                              │
│  [0,0] Origo (röd prick)     │  (Ingen form markerad)       │
│  [---] Objektgränser (blå)   │                              │
│  [▦] Grid: 50mm              │                              │
└──────────────────────────────┴──────────────────────────────┘
│ V:Markera L:Linje C:Cirkel R:Rektangel E:Ellips Delete:Radera│ ← Hjälp
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Ritverktyg

### **1. Markera (V)**
**Funktion:** Markera och flytta befintliga former

**Användning:**
1. Klicka verktyget "Markera" (Move-ikon) eller tryck **V**
2. Klicka på en form för att markera den
3. Dra formen för att flytta den
4. Egenskaper visas i högerpanelen

**Tips:**
- Dubbel-klick för att redigera numeriska värden
- Använd högerpanelen för exakt positionering

### **2. Linje (L)**
**Funktion:** Rita raka linjer

**Användning:**
1. Klicka verktyget "Linje" (Minus-ikon) eller tryck **L**
2. Klicka på canvas där linjen ska börja
3. Dra till slutpunkten
4. Släpp musknappen
5. ✅ Linjen skapas!

**Exempel:**
```
Vägg:
Start: (0, 300)
Slut: (1000, 300)
→ Horisontell linje 1000mm lång
```

### **3. Cirkel (C)**
**Funktion:** Rita cirklar

**Användning:**
1. Klicka verktyget "Cirkel" (Circle-ikon) eller tryck **C**
2. Klicka på canvas där cirkelns centrum ska vara
3. Dra ut för att sätta radien
4. Släpp musknappen
5. ✅ Cirkeln skapas!

**Exempel:**
```
Eluttag:
Centrum: (100, 100)
Radie: 40mm
→ Cirkel med diameter 80mm
```

### **4. Rektangel (R)**
**Funktion:** Rita rektanglar

**Användning:**
1. Klicka verktyget "Rektangel" (Square-ikon) eller tryck **R**
2. Klicka på canvas där ett hörn ska vara
3. Dra till motsatt hörn
4. Släpp musknappen
5. ✅ Rektangeln skapas!

**Exempel:**
```
Badkar:
Övre vänstra: (0, 0)
Nedre högra: (1700, 700)
→ Rektangel 1700×700mm
```

### **5. Ellips (E)**
**Funktion:** Rita ellipser (ovaler)

**Användning:**
1. Klicka verktyget "Ellips" (Disc-ikon) eller tryck **E**
2. Klicka på canvas där ellipsens centrum ska vara
3. Dra ut för att sätta horisontell och vertikal radie
4. Släpp musknappen
5. ✅ Ellipsen skapas!

**Exempel:**
```
Handfat:
Centrum: (300, 250)
Radie X: 250mm (horisontell)
Radie Y: 200mm (vertikal)
→ Oval form
```

## ⚙️ Egenskapspanel (Höger)

När du markerar en form visas dess egenskaper i högerpanelen.

### **Positionsegenskaper**

#### **För Cirkel/Ellips:**
- **Center X (mm):** Horisontell position från origo
- **Center Y (mm):** Vertikal position från origo
- **Radie / Radie X / Radie Y (mm):** Storlek

#### **För Rektangel:**
- **X (mm):** Vänsterkant från origo
- **Y (mm):** Överkant från origo
- **Bredd (mm):** Horisontell storlek
- **Höjd (mm):** Vertikal storlek

#### **För Linje:**
- **Punkter:** Lista med koordinater
- Exempel: P1: (0, 0), P2: (100, 100)

### **Utseendeegenskaper**

#### **Linjefärg**
- Klicka på färgrutan för att välja färg
- Standard: Svart (#000000)
- Tips: Använd ljusare färger för detaljer

#### **Linjetjocklek (px)**
- Slider: 0.5px - 10px
- Standard: 2px
- Tips: 
  - Ytterväggar: 3-4px
  - Innerväggar: 2px
  - Detaljer: 1px

#### **Fyllnadsfärg**
- Välj färg för insidan av formen
- Knapp "Tom": Transparent fyllning
- Tips: Använd transparent för mest professionella ritningar

#### **Genomskinlighet**
- Slider: 0% (osynlig) - 100% (solid)
- Standard: 100%
- Tips: Använd 50% för detaljer som inte ska dominera

## 🎯 Praktiska Exempel

### **Exempel 1: Rita en Toalett (från scratch)**

#### **Steg 1: Skapa toalettskålen**
```
1. Välj "Ellips" (E)
2. Klicka centrum: (250, 400)
3. Dra ut: radiusX=200, radiusY=250
4. Markera ellipsen
5. Högerpanel: Sätt fyllnadsfärg till "Tom"
```

#### **Steg 2: Skapa cistern (vattenbehållare)**
```
1. Välj "Rektangel" (R)
2. Klicka: (100, 50)
3. Dra till: (400, 250)
4. Resultat: Rektangel 300×200mm
```

#### **Steg 3: Lägg till sits (detalj)**
```
1. Välj "Ellips" (E)
2. Centrum: (250, 350)
3. Radie X: 150, Radie Y: 180
4. Markera ellipsen
5. Sätt genomskinlighet: 50%
```

#### **Resultat:**
```
  ┌───────────┐  ← Cistern (rektangel)
  │           │
  └───────────┘
      ( )       ← Sits (ellips, 50% opacity)
     (   )      ← Skål (ellips)
```

### **Exempel 2: Rita ett Eluttag**

#### **Steg 1: Yttre cirkel**
```
1. Välj "Cirkel" (C)
2. Centrum: (50, 50)
3. Radie: 40mm
4. Fyllnadsfärg: Tom
5. Linjetjocklek: 2px
```

#### **Steg 2: Vänster hål**
```
1. Välj "Cirkel" (C)
2. Centrum: (35, 50)
3. Radie: 8mm
4. Fyllnadsfärg: Svart (#000000)
```

#### **Steg 3: Höger hål**
```
1. Välj "Cirkel" (C)
2. Centrum: (65, 50)
3. Radie: 8mm
4. Fyllnadsfärg: Svart (#000000)
```

#### **Resultat:**
```
    ⚪  ← Yttre cirkel (40mm radie)
   ●  ●  ← Två hål (8mm radie, svarta)
```

### **Exempel 3: Rita en Spiraltrappa**

#### **Steg 1: Yttre cirkel**
```
1. Välj "Cirkel" (C)
2. Centrum: (600, 600) - Mitten av 1200×1200mm objekt
3. Radie: 550mm
4. Linjetjocklek: 3px
```

#### **Steg 2: Inre cirkel (trappöppning)**
```
1. Välj "Cirkel" (C)
2. Centrum: (600, 600)
3. Radie: 150mm
4. Linjetjocklek: 2px
```

#### **Steg 3: Trappsteg (linjer)**
```
1. Välj "Linje" (L)
2. Rita från centrum (600, 600) till kanten
3. Upprepa för varje trappsteg (8-12 linjer radiellt)
4. Linjetjocklek: 1px (detalj)
```

#### **Resultat:**
```
     ⚪  ← Yttre cirkel (diameter 1100mm)
    /│\   ← Trappsteg (8 linjer)
   ─┼─┼─
    \│/
     ⚫  ← Inre cirkel (hål, diameter 300mm)
```

## ⌨️ Keyboard Shortcuts

| Tangent | Funktion |
|---------|----------|
| **V** | Markera-verktyg |
| **L** | Linje-verktyg |
| **C** | Cirkel-verktyg |
| **R** | Rektangel-verktyg |
| **E** | Ellips-verktyg |
| **Delete / Backspace** | Radera markerad form |
| **Cmd+Z / Ctrl+Z** | Ångra |
| **Cmd+Shift+Z / Ctrl+Shift+Z** | Gör om |
| **Escape** | Avmarkera form |

## 📐 Canvas-Funktioner

### **Grid (Rutnät)**
- **Storlek:** 50mm × 50mm
- **Syfte:** Hjälper dig rita rakt och symmetriskt
- **Färg:** Ljusgrå (#e0e0e0)

### **Origo (0,0)**
- **Markör:** Röd prick
- **Position:** Övre vänstra hörnet
- **Syfte:** Referenspunkt för alla koordinater

### **Objektgränser**
- **Markör:** Blå streckad rektangel
- **Storlek:** Objektets defaultWidth × defaultHeight
- **Syfte:** Visar objektets bounding box

### **Zoom**
- **Knappar:** [-] [100%] [+]
- **Zoom ut:** Minska för översikt
- **Zoom in:** Öka för detaljer
- **Återställ:** Klicka på procent-talet eller [⟲]

## 🎨 Tips & Tricks

### **Tip 1: Börja med stora former**
Rita först de stora formerna (ytterkonturer), sen lägg till detaljer.

**Exempel (Badkar):**
```
1. Rita stor rektangel (ytterkant)
2. Rita inre rektangel (vattenytan)
3. Lägg till avlopp (liten cirkel)
```

### **Tip 2: Använd Grid för symmetri**
Utnyttja 50mm-rutnätet för att få symmetriska objekt.

**Exempel:**
```
Centrum på objekt: (500, 500) → Mitt på 1000×1000mm grid
```

### **Tip 3: Linjetjocklekar enligt standard**
```
3-4px: Ytterväggar, huvudkonturer
2px:   Innerväggar, standard objekt
1px:   Detaljer, hjälplinjer
```

### **Tip 4: Transparent fyllning för professionella ritningar**
Använd "Tom" fyllnadsfärg för mest arkitektoniska ritningar.

### **Tip 5: Spara ofta**
Klicka "Spara" regelbundet för att inte förlora ditt arbete.

### **Tip 6: Använd Undo liberalt**
Prova gärna! Du kan alltid ångra (Cmd+Z).

### **Tip 7: Duplicera för varianter**
Har du ett bra objekt? Duplicera det och gör varianter!

**Exempel:**
```
Toalett (Standard) → Duplicera → Toalett (Vägghängd)
(Ta bort cistern-rektangeln i kopian)
```

### **Tip 8: JSON-flik för finjustering**
Efter visuell redigering, byt till "JSON"-fliken för exakta värden.

## 🔄 Workflow: Visuell → JSON → Visuell

### **Scenario: Justera exakt koordinater**

**Steg 1: Rita visuellt**
```
1. Använd Visual Editor
2. Rita ungefärlig form
3. Spara
```

**Steg 2: Finjustera i JSON**
```
1. Byt till "JSON"-fliken
2. Hitta formen i JSON-arrayen
3. Ändra exakta värden:
   {
     "type": "circle",
     "x": 500.0,  ← Ändra till exakt 500
     "y": 500.0,
     "radius": 200.0
   }
```

**Steg 3: Verifiera visuellt**
```
1. Byt tillbaka till "Visuell Editor"
2. Se att ändringarna syns
3. Spara slutgiltiga versionen
```

## 🚨 Vanliga Misstag & Lösningar

### **Misstag 1: "Form hamnar utanför objektgränser"**
**Problem:** Du ritade en form utanför den blå streckade rektangeln.

**Lösning:**
1. Markera formen
2. Justera X/Y-koordinater i högerpanelen
3. ELLER: Ändra objektets defaultWidth/defaultHeight

### **Misstag 2: "Former syns inte"**
**Problem:** Formen har samma färg som bakgrunden.

**Lösning:**
1. Markera formen
2. Ändra linjefärg till svart (#000000)
3. Öka linjetjocklek till minst 2px

### **Misstag 3: "Kan inte markera form"**
**Problem:** Verktyget är inte satt till "Markera".

**Lösning:**
- Tryck **V** eller klicka "Markera"-verktyget (Move-ikon)

### **Misstag 4: "Zoom är för stor/liten"**
**Problem:** Canvas är för zoomad.

**Lösning:**
- Klicka **[⟲]** för att återställa zoom till 100%

### **Misstag 5: "Raderade fel form"**
**Problem:** Du raderade en form av misstag.

**Lösning:**
- Tryck **Cmd+Z** (Mac) eller **Ctrl+Z** (Windows) för att ångra

## 📊 Koordinatsystem

### **Origo och Axlar**
```
    Y (ökar nedåt)
    ↓
    0────────→ X (ökar åt höger)
    │
    │  Ditt objekt ritas här
    │  inom defaultWidth × defaultHeight
    │
```

### **Exempel på Koordinater**
```
Objekt: 1000×1000mm

(0, 0)           (1000, 0)
  ┌─────────────────┐
  │                 │
  │    (500, 500)   │ ← Centrum
  │        ●        │
  │                 │
  └─────────────────┘
(0, 1000)       (1000, 1000)
```

## 🎓 Övningsuppgifter

### **Övning 1: Rita en Enkel Lampa (5 min)**
```
Mål: Cirkel med linjer som strålar ut

1. Skapa nytt objekt: "Min Lampa"
2. Rita centrum-cirkel: (100, 100), radie 30mm
3. Rita 4 linjer ut från cirkeln:
   - Upp: (100, 70) → (100, 50)
   - Ner: (100, 130) → (100, 150)
   - Vänster: (70, 100) → (50, 100)
   - Höger: (130, 100) → (150, 100)
4. Spara
```

### **Övning 2: Rita en Diskmaskin (10 min)**
```
Mål: Rektangel med knappar

1. Skapa nytt objekt: "Diskmaskin"
2. Rita yttre rektangel: (0, 0) - (600, 600)
3. Rita lucka (inre rektangel): (50, 50) - (550, 550)
4. Rita knappar (små cirklar):
   - Knapp 1: (150, 300), radie 15mm
   - Knapp 2: (300, 300), radie 15mm
   - Knapp 3: (450, 300), radie 15mm
5. Spara
```

### **Övning 3: Anpassa Befintlig Toalett (5 min)**
```
Mål: Ändra storlek på standard-toalett

1. Öppna "Toalett (Standard)"
2. Redigera → Visuell Editor
3. Markera skål-ellipsen
4. Ändra radiusX: 200 → 180
5. Ändra radiusY: 250 → 230
6. Spara
→ Nu har du en mindre toalett!
```

## 🆘 Felsökning

### **Problem: "Visual Editor visas inte"**
**Orsak:** Tabs-komponenten kanske inte laddats.

**Lösning:**
1. Stäng och öppna dialogen igen
2. Hårdladda sidan (Cmd+Shift+R / Ctrl+Shift+R)

### **Problem: "Former försvinner när jag sparar"**
**Orsak:** Invalid JSON eller tomma shapes.

**Lösning:**
1. Byt till "JSON"-fliken
2. Kolla att shapes-arrayen inte är tom
3. Verifiera JSON-syntax (inga komma-fel)

### **Problem: "Kan inte flytta former"**
**Orsak:** Verktyget är inte "Markera".

**Lösning:**
- Tryck **V** för att aktivera Markera-verktyget

### **Problem: "Grid syns inte"**
**Orsak:** Zoom är för stor eller liten.

**Lösning:**
- Återställ zoom till 100% ([⟲]-knappen)

## 📖 Jämförelse: Visuell vs JSON

| Aspekt | Visuell Editor | JSON Editor |
|--------|----------------|-------------|
| **Lätt att lära** | ✅ Mycket enkelt | ⚠️ Kräver JSON-kunskap |
| **Snabbt för enkla former** | ✅ Mycket snabbt | ❌ Långsamt |
| **Exakta koordinater** | ⚠️ Ungefärligt | ✅ Exakt |
| **Symmetriska objekt** | ⚠️ Svårare | ✅ Enklare (copy-paste) |
| **Komplexa paths** | ❌ Ej stöd | ✅ Fullt stöd (SVG paths) |
| **Lärkkurva** | Låg | Medel-Hög |
| **Rekommenderas för** | Nybörjare, snabba skisser | Avancerade, exakta objekt |

**Bästa tillvägagångssätt:** Använd båda!
1. Rita snabbt i Visuell Editor
2. Finjustera i JSON Editor
3. Verifiera i Visuell Editor

## 🎉 Sammanfattning

### **Du har lärt dig:**
- ✅ Öppna Visual Object Editor
- ✅ Använda 5 ritverktyg (Markera, Linje, Cirkel, Rektangel, Ellips)
- ✅ Redigera formegenskaper (position, storlek, färg)
- ✅ Använda keyboard shortcuts
- ✅ Förstå koordinatsystemet
- ✅ Rita professionella objekt från scratch
- ✅ Växla mellan Visuell och JSON-redigering

### **Nästa steg:**
1. ✅ Öva på övningsuppgifterna
2. ✅ Anpassa befintliga objekt
3. ✅ Skapa egna custom objekt
4. ✅ Exportera och dela ditt bibliotek

---

**Lycka till med ditt objektbibliotek!** 🎨✨

*För mer information, se: `OBJECT_LIBRARY_SYSTEM.md`*
