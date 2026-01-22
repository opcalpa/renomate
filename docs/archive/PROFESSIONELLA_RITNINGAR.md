# 🏗️ Rita Professionella Planritningar

## Målsättning
Detta verktyg är byggt för att rita professionella arkitekt-ritningar i stil med byggdokument, inklusive:
- Exakta mått och skalor (1:20, 1:50, 1:100)
- Väggar med korrekt tjocklek (150mm, 200mm etc)
- Dörrar med svängradier
- Fönster och väggöppningar
- Rum med namn och måttangivelser
- Inredning och installationer

## 🎯 Skalor och Användningsområden

### 1:20 Skala (Architectural)
**Bäst för:** Detaljerade bygghandlingar, installationsritningar
- 1 pixel = 2mm i verkligheten
- Perfekt för exakta mått av kök, badrum, installationer
- Visar alla detaljer tydligt

### 1:50 Skala (Detailed)
**Bäst för:** Mindre lägenheter, rum-för-rum ritningar
- 1 pixel = 5mm i verkligheten
- Bra balans mellan översikt och detaljer

### 1:100 Skala (Standard)
**Bäst för:** Lägenheter, villor, mindre byggnader
- 1 pixel = 10mm i verkligheten
- Standard för de flesta bostadsritningar

### 1:500 Skala (Overview)
**Bäst för:** Stora byggnader, trädgårdsplanering
- 1 pixel = 50mm i verkligheten
- Översiktlig planering

## 📐 Workflow för Professionell Ritning

### Steg 1: Välj Rätt Skala
1. Klicka på **inställnings-ikonen** (⚙️) i toolbar
2. Under "Skala", välj:
   - **Architectural 1:20** för detaljerade bygghandlingar
   - **Standard 1:100** för vanliga planritningar

### Steg 2: Aktivera Grid och Snap
1. Klicka på **Grid-ikonen** (⊞) för att visa rutnätet
2. Klicka på **Magnet-ikonen** (🧲) för snap-to-grid

**Grid-storlekar per skala:**
- Vid 1:20: Grid visar 10cm, 25cm, 50cm, 1m
- Vid 1:100: Grid visar 50cm, 1m, 5m

### Steg 3: Rita Ytterväggar
1. Välj **Vägg-verktyget** (─)
2. Klicka för att starta väggen
3. Klicka igen för att avsluta
4. **Default väggtjocklek:** 150mm (ändras i PropertyPanel)

**Tips:**
- Använd Shift för perfekt horisontella/vertikala linjer
- Grid-snap hjälper dig rita exakta mått (tex 3000mm = 3m)

### Steg 4: Rita Innerväggar
1. Fortsätt med vägg-verktyget
2. För lättare innerväggar: Ändra tjocklek till 100mm i PropertyPanel
3. Alla väggar snäpper till rutnätet automatiskt

### Steg 5: Placera Dörrar
1. Välj **Dörr-verktyget** (🚪)
2. Klicka på väggen där dörren ska sitta
3. Dörren visar automatiskt:
   - Dörröppning (vit)
   - Svängradius (båge)
   - Default bredd: 800mm

**Vanliga dörrmått:**
- Vanlig dörr: 800mm
- Bred dörr: 900mm
- Dubbeldörr: 1200-1600mm

### Steg 6: Placera Fönster
1. Välj **Väggöppning-verktyget** (▭)
2. Klicka på väggen där fönstret ska sitta
3. Default bredd: 1200mm

### Steg 7: Markera Rum
1. Välj **Rum-verktyget** (⌂)
2. Dra en rektangel över rummet
3. Dubbelklicka för att namnge rummet
4. Välj färg för rummet (valfritt)

**Exempel:**
- VARDAGSRUM (vit/ljusgrå)
- KÖK (gul/beige)
- SOVRUM (ljusblå)
- BADRUM (ljusblå)
- HALL/KORRIDOR (ljusgrå)

### Steg 8: Lägg Till Inredning
1. Välj **Shapes-menyn** (☰)
2. Välj symbol:
   - **Fyrkant 2x2m** för stora möbler
   - **Cirkel ⌀2m** för runda bord
   - Anpassa storlek i PropertyPanel

**Vanliga objekt och mått:**
- Köksbänk: 600mm djup
- Diskmaskin: 600x600mm
- Tvättmaskin: 600x600mm
- Torktumlare: 600x600mm
- Badkar: 700x1700mm
- Dusch: 900x900mm eller 800x800mm
- Toalett: 400x700mm
- Handfat: 500-600mm bredd

### Steg 9: Lägg Till Text och Mått
1. Välj **Text-verktyget** (T)
2. Klicka där texten ska vara
3. Skriv rumsnamn, måttangivelser, noteringar

**Exempel:**
```
VARDAGSRUM
3590 x 4200

KÖK
2080 x 3800
```

### Steg 10: Lägg Till Dimensionslinjer
1. Använd **Linje-verktyget** för måttlinjer
2. Lägg till **Text** med måttet
3. Vanlig notation: `3590` (millimeter)

### Steg 11: Spara
1. Tryck **Save** i toolbar (eller Cmd/Ctrl+S)
2. Verifiera i Console: `✅ Successfully inserted X shapes to database`

## 🎨 Färgkodning (Svensk Standard)

### Rumstyper
- **Vardagsrum:** Vit eller ljusgrå (`rgba(240, 240, 240, 0.3)`)
- **Kök:** Gul/beige (`rgba(255, 243, 205, 0.4)`)
- **Sovrum:** Ljusblå (`rgba(220, 237, 255, 0.4)`)
- **Badrum:** Ljusblå/turkos (`rgba(200, 235, 255, 0.4)`)
- **Hall/Korridor:** Ljusgrå (`rgba(245, 245, 245, 0.3)`)
- **Förråd/Teknik:** Mörkgrå (`rgba(200, 200, 200, 0.4)`)

### Väggar
- **Yttervägg:** Svart eller mörkgrå, 150-200mm tjock
- **Bärande innervägg:** Svart, 150mm
- **Icke-bärande vägg:** Grå, 100mm

## 📏 Vanliga Mått (Svenska Byggnormer)

### Väggtjocklekar
- **Yttervägg:** 200mm (äldre), 150mm (nyare)
- **Bärande innervägg:** 150mm
- **Icke-bärande vägg:** 100mm
- **Badrumsvägg:** 150mm (för installationer)

### Takhöjd
- **Standard:** 2400-2500mm
- **Äldre byggnader:** 2700-3000mm
- **Nyproduktion:** 2600mm

### Dörrmått
- **Vanlig innerdörr:** 800 x 2000mm
- **Bred dörr:** 900 x 2000mm
- **Ytterdörr:** 900-1000 x 2100mm
- **Skjutdörr:** 1200-1600mm

### Fönstermått
- **Litet fönster:** 600-900mm bredd
- **Standard fönster:** 1200-1400mm
- **Stort fönster:** 1800-2400mm
- **Balkongdörr:** 900 x 2100mm

### Kök
- **Köksbänk djup:** 600mm (standard)
- **Köksbänk höjd:** 900mm
- **Diskmaskin:** 600 x 600mm
- **Spis:** 600 x 600mm
- **Kylskåp:** 600mm bredd
- **Arbetsgång:** Minst 1200mm (helst 1400mm)

### Badrum
- **Badkar:** 700 x 1700mm (standard)
- **Dusch:** 800 x 800mm (minimum), 900 x 900mm (standard)
- **Toalett:** 400 x 700mm (+ 200mm framför)
- **Handfat:** 500-600mm bredd
- **Rörläggning:** Minst 1200 x 1200mm fritt utrymme

## ⌨️ Tangentbordsgenvägar

### Verktyg
- **V** → Select/Markera
- **W** → Vägg
- **D** → Dörr
- **R** → Rum
- **E** → Sudd
- **T** → Text
- **G** → Visa/dölj Grid
- **Space** → Pan (håll nere och dra)

### Redigering
- **Cmd/Ctrl + S** → Spara
- **Cmd/Ctrl + Z** → Ångra
- **Cmd/Ctrl + Shift + Z** → Gör om
- **Cmd/Ctrl + C** → Kopiera
- **Cmd/Ctrl + V** → Klistra in
- **Cmd/Ctrl + D** → Duplicera
- **Delete/Backspace** → Ta bort

### Navigation
- **Cmd/Ctrl + +** → Zooma in
- **Cmd/Ctrl + -** → Zooma ut
- **Cmd/Ctrl + 0** → Återställ zoom
- **Mushjul** → Zooma in/ut
- **Mellanklick + dra** → Pan

## 🔧 Professionella Tips

### 1. Börja med Ytterväggar
Rita alltid ytterväggar först för att få rätt proportioner.

### 2. Använd Grid-Snap
Grid-snap säkerställer att alla mått stämmer och att väggar möts perfekt.

### 3. Kontrollera Mått Löpande
Zooma in (Cmd +) för att verifiera att mått är korrekta.

### 4. Organisera i Lager
- **Lager 1:** Väggar och struktur
- **Lager 2:** Dörrar och fönster
- **Lager 3:** Inredning
- **Lager 4:** Text och mått

### 5. Spara Ofta
Tryck Cmd/Ctrl+S efter varje större ändring.

### 6. Använd Rätt Skala från Början
Det är lättare att rita i rätt skala från start än att skala om efteråt.

### 7. Dokumentera
Lägg till text med information:
- Rumsytor (m²)
- Rumsmått (längd x bredd)
- Speciella anmärkningar

### 8. Färgkoda Konsekvent
Använd samma färger för samma rumstyper i hela projektet.

## 📊 Exempel: Rita en Lägenhet (1:100)

### 1. Setup
```
Skala: Standard 1:100
Grid: 50cm + 1m
Snap: ON
```

### 2. Yttervägg
```
Rita rektangel: 10m x 8m (= 10000mm x 8000mm)
Väggtjocklek: 150mm
```

### 3. Innerväggar
```
Dela upp i:
- Vardagsrum (25m²)
- Sovrum (15m²)
- Kök (12m²)
- Badrum (6m²)
- Hall (8m²)

Väggtjocklek innerväggar: 100mm
```

### 4. Öppningar
```
Ytterdörr: 900mm
Innerdörrar: 800mm
Fönster: 1200-1400mm
```

### 5. Inredning
```
Kök: Bänkar 600mm djup
Badrum: Dusch 900x900mm, handfat, toalett
```

### 6. Text
```
Lägg till rumsnamn
Lägg till måttangivelser på väggar
```

## 🎓 Jämförelse: Ditt Verktyg vs AutoCAD/Revit

| Funktion | Detta Verktyg | AutoCAD/Revit |
|----------|---------------|---------------|
| Grundläggande planritning | ✅ | ✅ |
| Exakta mått | ✅ | ✅ |
| Väggar med tjocklek | ✅ | ✅ |
| Dörrar och fönster | ✅ | ✅ |
| Rumsmarkeringar | ✅ | ✅ |
| Web-baserat | ✅ | ❌ |
| Gratis | ✅ | ❌ |
| 3D-modellering | ⚠️ Grundläggande | ✅ Avancerad |
| BIM-integration | ❌ | ✅ |
| Samarbete i realtid | ✅ | ⚠️ |

## 🚀 Framtida Förbättringar

För att nå **exakt** samma nivå som professionella ritningar:

### Kort sikt (1-2 veckor)
- [ ] Dimensionslinjer med pilar
- [ ] Automatisk area-beräkning
- [ ] Fler symboler (köksutrustning, badrum)
- [ ] Titelblocк-mall
- [ ] PDF-export med skala

### Medellång sikt (1-2 månader)
- [ ] Vägglager (olika typer av väggar)
- [ ] Möbel-bibliotek
- [ ] Materialbibliotek
- [ ] Sektionsritningar
- [ ] Fasadritningar

### Lång sikt (3-6 månader)
- [ ] 3D-visualisering
- [ ] Materiallistor
- [ ] Kostnadskalkylering
- [ ] BIM-export

## ✅ Nuvarande Status

Ditt verktyg kan **idag** rita professionella planritningar på samma nivå som ritningen du visade. De viktigaste funktionerna finns:

✅ Exakta mått och skalor
✅ Professionellt rutnät
✅ Väggar med korrekt tjocklek
✅ Dörrar med svängradier
✅ Fönster och öppningar
✅ Rum med namn och färger
✅ Text-etiketter
✅ Zoom och precision

**Nästa steg:** Öva på att rita! Börja med en enkel lägenhet och bygg upp din vana.

## 🆘 Hjälp och Support

Om något inte fungerar:
1. Öppna Developer Console (F12)
2. Rita och spara
3. Leta efter fel-meddelanden
4. Kolla `FIXA_SPARNING.md` för troubleshooting
