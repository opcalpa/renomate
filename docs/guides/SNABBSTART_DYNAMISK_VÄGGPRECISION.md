# 🚀 Snabbstart: Dynamisk Väggprecision

## ✨ Vad Är Nytt?

Väggverktyget använder nu **automatisk precision** baserat på zoom! Rita korta väggar (ner till 1cm) genom att bara zooma in.

## ⚡ Hur Det Fungerar (10 sekunder)

```
1. Aktivera väggverktyg (W)
2. Zooma in (Cmd/Ctrl +) för finare precision
3. Zooma ut (Cmd/Ctrl -) för grövre precision
4. Rita vägg → Snappar till synlig grid automatiskt!
```

## 📐 Snabbreferens

| Vad | Zoom | Precision |
|-----|------|-----------|
| Långa väggar (2-5m) | 0.8-1.5x | 50cm grid |
| Korta väggar (25cm-1m) | 1.5-2.5x | 25cm grid |
| Detaljer (10-25cm) | 2.5-4.0x | 10cm grid |
| Precision (<10cm) | 4.0-10.0x | 5cm-2cm grid |
| Max precision (1cm) | >10.0x | 1cm grid |

## 🎯 Praktiska Exempel

### Rita 25cm Vägg
```
1. Väggverktyg (W)
2. Zooma till 1.5-2.5x
3. Precision: "25cm grid" (visas längst ner till vänster)
4. Rita → Snappar varje 25cm
✅ Perfekt!
```

### Rita 10cm Innervägg
```
1. Väggverktyg (W)
2. Zooma till 2.5-4.0x
3. Precision: "10cm grid"
4. Rita
✅ Exakt 10cm!
```

### Rita 2m Vägg
```
1. Väggverktyg (W)
2. Zooma till 0.8-1.5x
3. Precision: "50cm grid"
4. Rita 4 grid-enheter (4 × 50cm = 2m)
✅ Exakt 2m!
```

## 🔍 Precision-indikator

Längst ner till vänster när du använder väggverktyget:

```
┌──────────────────────────┐
│ 🎯 Väggprecision: 25cm grid│
│    Zooma för finare precision│
└──────────────────────────┘
```

Detta uppdateras automatiskt när du zoomar!

## 💡 Tips

### Tip 1: Kolla Precision Innan Du Ritar
```
Se till att precision-indikatorn visar rätt grid INNAN du börjar rita.
```

### Tip 2: Kombinera med Shift
```
Shift + Rita = Perfekt horisontell/vertikal linje
```

### Tip 3: Zooma Dynamiskt
```
- Zooma in för korta väggar
- Zooma ut för långa väggar
- Byt zoom under ritning för olika delar
```

## ⌨️ Tangentbordsgenvägar

```
W              → Väggverktyg
Cmd/Ctrl + +  → Zooma in (finare)
Cmd/Ctrl + -  → Zooma ut (grövre)
Shift         → Raka linjer
G              → Visa/dölj grid
```

## 🎨 Vad Har Ändrats?

### ❌ Tidigare
```
- Fast precision-toggle (1m eller 10cm)
- Svårt att rita korta väggar
- Måste växla manuellt
```

### ✅ Nu
```
- Automatisk dynamisk precision
- Zooma = ändra precision
- Ingen manuell toggle
- Rita från 5m ner till 1cm!
```

## ✅ Sammanfattning

**En regel att komma ihåg:**

> **Zooma in = Finare precision**  
> **Zooma ut = Grövre precision**

**Väggverktyget snappar ALLTID till den finaste synliga gridlinjen!**

---

**Testa nu:**
1. Aktivera väggverktyg (W)
2. Zooma in mycket (Cmd/Ctrl + flera gånger)
3. Rita en kort vägg
4. Kolla precision-indikatorn → "1cm grid" eller "2cm grid"
5. ✅ Du kan nu rita väggar med cm-precision!

**Refresha och börja rita!** 🎯
