# 🎯 Dynamisk Väggprecision - Rita Korta Väggar med Precision

## ✨ Ny Förbättring

Väggverktyget använder nu **automatisk dynamisk precision** baserat på zoom-nivå! Du kan rita väggar med exakt precision på **alla synliga gridlines**, från 5 meter ner till 1 centimeter.

## 🎨 Tidigare vs Nu

### ❌ TIDIGARE
```
Problem:
- Fast precision (1m eller 10cm toggle)
- Svårt att rita korta väggar (<1m)
- Måste manuellt växla precision
- Begränsad flexibilitet

Exempel:
- Vill rita 25cm vägg
- Precision satt på 1m
- Kan bara snappa till 1m intervall
- Omöjligt att rita exakt 25cm
```

### ✅ NU
```
Lösning:
- Automatisk dynamisk precision
- Följer synliga gridlines
- Zooma = finare precision
- Ingen manuell toggle

Exempel:
- Vill rita 25cm vägg
- Zooma in till zoom 1.5-2.5x
- Grid visar 25cm linjer
- Väggverktyg snappar till 25cm
- ✅ Perfekt precision!
```

## 📐 Precision per Zoom-nivå

| Zoom | Synlig Grid | Väggsnap | Användning |
|------|-------------|----------|------------|
| < 0.4 | 5m | **5m** | Byggnad, översikt |
| 0.4-0.8 | 5m + 1m | **1m** | Våningsplan |
| 0.8-1.5 | 1m + 50cm | **50cm** | Lägenhet/hus |
| 1.5-2.5 | 1m + 25cm | **25cm** | Rumslayout |
| 2.5-4.0 | 50cm + 10cm | **10cm** | Möblering |
| 4.0-6.0 | 25cm + 5cm | **5cm** | Detaljarbete |
| 6.0-10.0 | 10cm + 2cm | **2cm** | Precision |
| > 10.0 | 5cm + 1cm | **1cm** | Max precision |

## 🎯 Hur Det Fungerar

### Princip
**Väggverktyget snappar ALLTID till den finaste synliga gridlinjen**

### Zoom-baserad Precision
```
1. Välj väggverktyg (W)
2. Kolla vänster nedre hörnet: "🎯 Väggprecision: X grid"
3. Zooma för att ändra precision:
   - Zooma ut → Grövre grid (5m, 1m, 50cm)
   - Zooma in → Finare grid (25cm, 10cm, 5cm, 2cm, 1cm)
4. Rita vägg → Snappar till aktuell grid automatiskt
```

## 🛠️ Praktiska Exempel

### Exempel 1: Rita 25cm Vägg (Dörröppning)

**Scenario:** Du vill rita en kort vägg bredvid en dörr, exakt 25cm bred.

```
1. Aktivera väggverktyg (W)
2. Zooma till 1.5-2.5x zoom
3. Kolla precision-indikator: "25cm grid"
4. Klicka startpunkt
5. Flytta 1 grid-enhet (25cm)
6. Klicka slutpunkt
✅ Exakt 25cm vägg ritad!
```

### Exempel 2: Rita 10cm Vägg (Innervägg)

**Scenario:** Du vill rita en tunn innervägg, 10cm tjock.

```
1. Aktivera väggverktyg
2. Zooma till 2.5-4.0x zoom
3. Kolla precision: "10cm grid"
4. Rita vägg
5. Flytta 1 grid-enhet (10cm)
✅ Exakt 10cm vägg!
```

### Exempel 3: Rita 5cm Detalj

**Scenario:** Du vill rita en liten vägg-detalj, 5cm.

```
1. Zooma till 4.0-6.0x zoom
2. Precision: "5cm grid"
3. Rita
✅ 5cm precision!
```

### Exempel 4: Rita 2m Vägg (Normal Rum)

**Scenario:** Du vill rita en normal vägg, 2 meter.

```
1. Zooma till 0.8-1.5x zoom
2. Precision: "50cm grid"
3. Flytta 4 grid-enheter (4 × 50cm = 2m)
✅ Exakt 2m vägg!

Alternativt:
1. Zooma till 0.4-0.8x zoom
2. Precision: "1m grid"
3. Flytta 2 grid-enheter (2 × 1m = 2m)
✅ Samma resultat!
```

## 🎨 UI-indikator

När du använder väggverktyget visas aktuell precision längst ner till vänster:

```
┌─────────────────────────────┐
│ 🎯 Väggprecision: 25cm grid │
│    Zooma för finare precision│
└─────────────────────────────┘
```

Detta uppdateras **automatiskt** när du zoomar.

## 📊 Jämförelse: Grid-nivåer

### Zoom < 1.5x (Översikt)
```
Grid synlig: 1m + 50cm
Väggsnap: 50cm

Kan rita:
✅ 50cm väggar
✅ 1m väggar
✅ 1.5m väggar
✅ 2m väggar
❌ 25cm väggar (för grovt)
```

### Zoom 1.5-2.5x (Detalj)
```
Grid synlig: 1m + 25cm
Väggsnap: 25cm

Kan rita:
✅ 25cm väggar ← NYT!
✅ 50cm väggar
✅ 75cm väggar
✅ 1m väggar
✅ Alla multiplar av 25cm
```

### Zoom 2.5-4.0x (Precision)
```
Grid synlig: 50cm + 10cm
Väggsnap: 10cm

Kan rita:
✅ 10cm väggar ← NYT!
✅ 20cm väggar
✅ 30cm väggar
✅ Alla multiplar av 10cm
```

### Zoom > 10x (Max Precision)
```
Grid synlig: 5cm + 1cm
Väggsnap: 1cm

Kan rita:
✅ 1cm väggar ← MAX PRECISION!
✅ 2cm väggar
✅ 5cm väggar
✅ Alla multiplar av 1cm
```

## 🎓 Tips & Tricks

### Tip 1: Zooma för Precision
```
Problem: Vill rita 15cm vägg
Lösning:
1. Zooma till 2.5-4.0x (10cm grid)
2. ELLER zooma till 4.0-6.0x (5cm grid)
3. Rita 15cm (1.5 grid-enheter @ 10cm ELLER 3 grid-enheter @ 5cm)
```

### Tip 2: Använd Shift för Raka Linjer
```
Shift + Rita = Perfekt horisontell/vertikal linje
Kombinera med zoom för perfekt precision
```

### Tip 3: Kolla Precision-indikatorn
```
Innan du börjar rita:
1. Kolla "🎯 Väggprecision: X grid"
2. Om för grovt → Zooma in
3. Om för fint → Zooma ut
4. När rätt precision → Rita!
```

### Tip 4: Kedjeritning
```
Rita flera väggar i följd:
1. Rita vägg 1
2. Klicka slutpunkt
3. Börja direkt från slutpunkten
4. Rita nästa vägg
5. Perfekt precision på alla väggar!
```

## 🔄 Arbetsflöde

### Standard Rumritning (2-5m väggar)
```
1. Zooma: 0.8-1.5x
2. Precision: 50cm grid
3. Rita ytterväggar
4. Rita innerväggar
✅ Snabbt och effektivt
```

### Detaljerad Ritning (25cm-1m element)
```
1. Zooma: 1.5-2.5x
2. Precision: 25cm grid
3. Rita korta väggar
4. Rita dörröppningar
5. Rita detaljer
✅ Exakt precision
```

### Precision-arbete (<25cm element)
```
1. Zooma: 4.0-10.0x
2. Precision: 2cm-5cm grid
3. Rita små detaljer
4. Rita exakta mått
✅ Cm-precision
```

## 🎯 Vanliga Mått

### Svenska Standardmått

**Väggtjocklekar:**
- Yttervägg: 20cm, 15cm (Zooma till 2.5-4.0x → 10cm grid)
- Innervägg: 10cm (Zooma till 2.5-4.0x → 10cm grid)
- Lätt skiljevägg: 7cm (Zooma till 4.0-6.0x → 5cm grid)

**Dörröppningar:**
- Dörr: 80cm bred (Zooma till 0.8-1.5x → 50cm grid, 1.6 enheter)
- Bred dörr: 90cm (Zooma till 1.5-2.5x → 25cm grid, 3.6 enheter)
- Dubbeldörr: 160cm (Zooma till 0.8-1.5x → 50cm grid, 3.2 enheter)

**Rum:**
- Litet rum: 2m × 2m (Zooma till 0.8-1.5x → 50cm grid)
- Standard rum: 3m × 4m (Zooma till 0.8-1.5x → 50cm grid)
- Stort rum: 5m × 6m (Zooma till 0.4-0.8x → 1m grid)

## ⌨️ Tangentbordsgenvägar

```
W              → Aktivera väggverktyg
Cmd/Ctrl + +  → Zooma in (finare precision)
Cmd/Ctrl + -  → Zooma ut (grövre precision)
Shift + Rita  → Perfekt horisontell/vertikal
G              → Visa/dölj grid
Esc            → Avbryt väggritning
```

## 🔍 Felsökning

### Problem: Vägg snappar för grovt
**Symtom:** Kan inte rita korta väggar

**Lösning:**
```
1. Zooma in (Cmd/Ctrl +)
2. Kolla precision-indikator
3. När rätt precision → Rita
```

### Problem: Vägg snappar för fint
**Symtom:** Svårt att rita långa väggar, för många grid-linjer

**Lösning:**
```
1. Zooma ut (Cmd/Ctrl -)
2. Grövre grid = snabbare ritning
3. När rätt precision → Rita
```

### Problem: Vill rita exakt 17cm vägg
**Symtom:** 17cm är inte jämnt delbart med grid

**Lösning:**
```
Alternativ 1:
- Zooma till 1cm grid (zoom > 10x)
- Rita 17 grid-enheter

Alternativ 2:
- Rita ungefärligt
- Använd PropertyPanel för exakt mått
```

## ✅ Sammanfattning

**Tidigare:**
- Fast precision (1m eller 10cm toggle)
- Svårt att rita korta väggar
- Måste manuellt växla

**Nu:**
- ✅ Automatisk dynamisk precision
- ✅ Följer synliga gridlines
- ✅ Zooma = ändra precision
- ✅ Ingen manuell toggle
- ✅ Rita från 5m ner till 1cm
- ✅ Perfekt precision på alla zoom-nivåer

**Hur Använda:**
1. Aktivera väggverktyg (W)
2. Zooma till önskad precision
3. Kolla precision-indikator
4. Rita med perfekt snap!

---

**Rita exakta väggar med valfri precision genom att bara zooma!** 🎯📐
