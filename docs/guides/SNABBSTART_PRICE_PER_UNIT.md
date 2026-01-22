# 🚀 Snabbstart: Price per Unit & Price Total

## ✨ Vad Är Nytt?

Purchase Orders har nu **Price per Unit** och **Price Total** (auto-beräknad)!

## 📊 Före vs Efter

### Före
```
Cost: $500  ❓ (Per styck eller totalt?)
```

### Efter
```
Price per Unit: $50 ✅ (Tydligt!)
Price Total: $500 ✅ (Auto-beräknad!)

Formula: 10 × $50 = $500
```

## ⚡ Setup (1 minut)

### Steg 1: Kör SQL (30 sekunder)
```bash
# Supabase Dashboard → SQL Editor
# Kör: supabase/add_price_per_unit_and_total.sql
```

### Steg 2: Refresha (10 sekunder)
```bash
# Refresha browsern (F5)
```

### Steg 3: Testa! (20 sekunder)
```
1. Öppna projekt → Tasks → Purchase Order
2. Klicka "Add Purchase Order"
3. Fyll i:
   - Material: Färg
   - Quantity: 10
   - Unit: liter
   - Price per Unit: 50
4. Se: "Price Total: $500.00" ✅
5. Spara!
```

## 💡 Hur Det Fungerar

### Formula

```
Price Total = Quantity × Price per Unit
```

### Exempel 1: Färg

```
Material: Vit Färg
Quantity: 10 liter
Price per Unit: $50/liter

→ Price Total: 10 × $50 = $500 ✅
```

### Exempel 2: Kakel

```
Material: Badrumskakel
Quantity: 50 m²
Price per Unit: $40/m²

→ Price Total: 50 × $40 = $2,000 ✅
```

### Exempel 3: Trä

```
Material: Trägolv
Quantity: 25 m²
Price per Unit: $120/m²

→ Price Total: 25 × $120 = $3,000 ✅
```

## 📍 Var Finns Det?

### I Purchase Orders Tabellen

```
┌────────────────────────────────────────────────────┐
│ Material │ Qty    │ Price/Unit │ Price Total │ ... │
├────────────────────────────────────────────────────┤
│ Färg     │ 10 lit │ $50.00     │ $500.00     │ ... │
│ Kakel    │ 50 m²  │ $40.00     │ $2,000.00   │ ... │
└────────────────────────────────────────────────────┘
```

### I Create/Edit Dialog

```
┌─────────────────────────────────┐
│ Quantity: [10___]               │
│ Price per Unit: [50.00___]      │
│                                 │
│ Price Total: $500.00 ✅         │ ← Live!
└─────────────────────────────────┘
```

## 🎯 Fördelar

### 1. Tydlighet
```
✅ Tydligt pris per enhet
✅ Tydligt totalpris
✅ Ingen förvirring
```

### 2. Auto-beräkning
```
✅ Ingen manuell kalkylering
✅ Inga fel
✅ Alltid korrekt
```

### 3. Jämförelse
```
LEVERANTÖR A: $52/liter
LEVERANTÖR B: $48/liter

→ Välj B, spara $40! ✅
```

### 4. Budget
```
Kök: 10 lit × $50 = $500
Vardagsrum: 8 lit × $50 = $400
Sovrum: 5 lit × $50 = $250

Total färg: $1,150 ✅
```

## 💻 UI Funktioner

### Live Beräkning

När du skriver uppdateras totalen direkt:

```
Quantity: [10______]  ← Skriv här
Price per Unit: [50.00______]  ← Eller här

→ Price Total: $500.00 ✅ (uppdateras direkt!)
```

### Tabell

```
Quantity     │ Price/Unit │ Price Total
─────────────┼────────────┼────────────
10 gallons   │ $50.00     │ $500.00 ✅
```

## 🧪 Testa Funktionen

### Test 1: Skapa Purchase Order
```
1. Material: Kakel
2. Quantity: 50
3. Unit: m²
4. Price per Unit: 40
5. Verifiera: Price Total = $2,000.00 ✅
6. Spara
7. Tabellen visar båda värden ✅
```

### Test 2: Ändra Kvantitet
```
Ursprunglig:
- Quantity: 10
- Price per Unit: $50
- Price Total: $500

Ändra Quantity till 15:
- New Price Total: $750 ✅ (auto!)
```

### Test 3: Ändra Pris
```
Ursprunglig:
- Quantity: 10
- Price per Unit: $50
- Price Total: $500

Ändra Price per Unit till $45:
- New Price Total: $450 ✅ (auto!)
```

## 📊 Exempel: Köksrenovering

```
KÖKSSKÅP:
Material: IKEA SEKTION
Quantity: 12 pieces
Price per Unit: $375
Price Total: $4,500 ✅

BÄNKSKIVA:
Material: Quartz
Quantity: 1 unit
Price per Unit: $2,500
Price Total: $2,500 ✅

KAKEL:
Material: Väggkakel
Quantity: 20 m²
Price per Unit: $40
Price Total: $800 ✅

TOTAL KÖK: $7,800
```

## 💾 Vad Har Ändrats?

### Databas
- ✅ `cost` → `price_per_unit` (omdöpt)
- ✅ `price_total` (ny, auto-beräknad)

### UI
- ✅ "Cost" → "Price per Unit"
- ✅ "Price Total" kolumn tillagd
- ✅ Live beräkning i formulär
- ✅ Uppdaterat alla vyer

### Filer
- ✅ `add_price_per_unit_and_total.sql` (ny)
- ✅ `MaterialsList.tsx` (uppdaterad)
- ✅ `PurchaseRequestsTab.tsx` (uppdaterad)
- ✅ `TaskSidePanel.tsx` (uppdaterad)
- ✅ `OverviewTab.tsx` (uppdaterad)
- ✅ `BudgetDashboard.tsx` (uppdaterad)
- ✅ `TaskDetailDialog.tsx` (uppdaterad)

## 🎓 Best Practices

### 1. Använd Rätt Enhet
```
✅ 10 liter × $50/liter = $500
✅ 50 m² × $40/m² = $2,000
❌ 10 × $50 = $500 (vad är enheten?)
```

### 2. Jämför Leverantörer
```
LEVERANTÖR A:
Kakel: $45/m²

LEVERANTÖR B:
Kakel: $40/m²

→ Välj B, spara $5/m² ✅
```

### 3. Planera Rum
```
BADRUM 1: 15 m² × $40 = $600
BADRUM 2: 12 m² × $40 = $480
KÖK: 20 m² × $40 = $800

Total kakel: $1,880
```

## ✅ Sammanfattning

**Ny Struktur:**
- Price per Unit (manuell)
- Price Total (auto-beräknad)

**Formula:**
```
Price Total = Quantity × Price per Unit
```

**Fördelar:**
- ✅ Tydlighet
- ✅ Auto-beräkning
- ✅ Lätt jämförelse
- ✅ Professionell struktur

**Setup:**
1. Kör SQL (30 sek)
2. Refresha (10 sek)
3. Använd direkt!

**Dokumentation:**
- `PURCHASE_ORDER_PRICE_PER_UNIT.md` - Detaljerad guide
- `SNABBSTART_PRICE_PER_UNIT.md` - Denna fil

---

**Professionell prisstruktur för purchase orders!** 💰✅

**Setup:** Kör `add_price_per_unit_and_total.sql` och refresha! 🚀
