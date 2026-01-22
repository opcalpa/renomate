# ✅ Dimension Edit Feature - Justera Längd i PropertyPanel

## Datum: 2026-01-19

**Status: IMPLEMENTERAD** - Nu kan du redigera längden på väggar direkt i PropertyPanel!

---

## 🎯 Ny Funktion

### **Redigera Längd på Väggar**

När du klickar "Redigera" i PropertyPanel kan du nu också justera längden på väggar:

```typescript
// State för dimension-redigering
const [isEditingDimensions, setIsEditingDimensions] = useState(false);
const [editLengthM, setEditLengthM] = useState('0');

// När användaren klickar "Ändra längd"
<Button onClick={() => setIsEditingDimensions(true)}>
  Ändra längd
</Button>

// Input-fält för ny längd i meter
<Input
  type="number"
  step="0.001"
  value={editLengthM}
  onChange={(e) => setEditLengthM(e.target.value)}
  placeholder="3.450"
/>
```

---

## 📐 Hur Det Fungerar

### **1. Proportionell Skalning**

Väggen skalas proportionellt från startpunkten:

```typescript
const handleSaveDimensions = () => {
  // Hämta nuvarande längd
  const currentLengthPixels = Math.sqrt(dx * dx + dy * dy);
  const currentLengthM = currentLengthPixels / getPixelsPerMeter(pixelsPerMm);
  
  // Beräkna ny längd baserat på vinkeln
  const angle = Math.atan2(dy, dx);
  const newLengthPixels = newLengthM * getPixelsPerMeter(pixelsPerMm);
  
  // Beräkna ny slutpunkt (x2, y2) från startpunkt (x1, y1)
  const newX2 = coords.x1 + Math.cos(angle) * newLengthPixels;
  const newY2 = coords.y1 + Math.sin(angle) * newLengthPixels;
  
  // Uppdatera koordinater
  onUpdateShape(shape.id, {
    coordinates: { x1, y1, x2: newX2, y2: newY2 }
  });
};
```

### **2. Startpunkten Förblir Fast**

- ✅ `(x1, y1)` förblir oförändrad
- ✅ `(x2, y2)` beräknas baserat på ny längd och befintlig vinkel
- ✅ Väggen behåller sin riktning

### **3. Precision till 1mm**

Input-fältet använder `step="0.001"` vilket ger precision till 1mm:

```
3.450 m = 3450 mm  ✅
0.150 m = 150 mm   ✅
12.345 m = 12345 mm ✅
```

---

## 🎨 User Interface

### **FÖRE Redigering:**
```
┌─────────────────────────────────────┐
│ 📐 Dimensioner                      │
├─────────────────────────────────────┤
│ Längd (m):      3.45 m             │
│ Längd (cm):     345.0 cm           │
│ Längd (mm):     3450 mm            │
│ Tjocklek:       150 mm             │
│ Höjd:           2400 mm            │
└─────────────────────────────────────┘
```

### **EFTER att klicka "Redigera" → "Ändra längd":**
```
┌─────────────────────────────────────┐
│ 📐 Dimensioner    [Ändra längd ✏️] │
├─────────────────────────────────────┤
│ Längd (meter):                      │
│ ┌──────────────┬────┬────┐         │
│ │   3.450      │ OK │ X  │         │
│ └──────────────┴────┴────┘         │
│ 💡 Väggen skalas proportionellt    │
│    från startpunkten                │
├─────────────────────────────────────┤
│ Tjocklek:       150 mm             │
│ Höjd:           2400 mm            │
└─────────────────────────────────────┘
```

---

## 🔄 User Flow

### **Steg-för-steg:**

```
1. Dubbelklicka på en vägg
   ↓
2. PropertyPanel öppnas
   ↓
3. Klicka "Redigera" (top right)
   ↓
4. "Ändra längd" knapp visas under Dimensioner
   ↓
5. Klicka "Ändra längd"
   ↓
6. Input-fält visas med nuvarande längd (t.ex. 3.450)
   ↓
7. Skriv ny längd (t.ex. 4.500)
   ↓
8. Klicka "OK"
   ↓
9. ✅ Väggen skalas till 4.5m!
   ✅ Toast: "Längd uppdaterad till 4.50m!"
   ✅ PropertyPanel uppdateras med nya värden
```

### **Avbryt:**

```
1. Klicka "Ändra längd"
   ↓
2. Skriv ny längd
   ↓
3. Klicka "X" (cancel)
   ↓
4. ✅ Edit-läge stängs
   ✅ Ursprunglig längd återställs
   ✅ Ingen ändring på väggen
```

---

## 🧪 Testing

### Test 1: Redigera Längd
```bash
1. Rita en vägg (3.45m)
2. Dubbelklicka på väggen
3. Klicka "Redigera"
4. ✅ "Ändra längd" knapp visas
5. Klicka "Ändra längd"
6. ✅ Input-fält visas med "3.450"
7. Ändra till "5.000"
8. Klicka "OK"
9. ✅ Toast: "Längd uppdaterad till 5.00m!"
10. ✅ Väggen är nu 5m lång
11. ✅ PropertyPanel visar nya värden:
    - Längd (m): 5.00 m
    - Längd (cm): 500.0 cm
    - Längd (mm): 5000 mm
```

### Test 2: Precision (1mm)
```bash
1. Rita en vägg
2. Dubbelklicka → Redigera → Ändra längd
3. Skriv "0.150" (150mm)
4. Klicka "OK"
5. ✅ Väggen är exakt 150mm
6. PropertyPanel visar:
   - Längd (m): 0.15 m
   - Längd (cm): 15.0 cm
   - Längd (mm): 150 mm
```

### Test 3: Bibehåll Vinkel
```bash
1. Rita en diagonal vägg (45° vinkel, 3m)
2. Dubbelklicka → Redigera → Ändra längd
3. Ändra till "6.000"
4. Klicka "OK"
5. ✅ Väggen är 6m
6. ✅ Vinkeln är fortfarande 45°
7. ✅ Startpunkt (x1, y1) oförändrad
```

### Test 4: Avbryt
```bash
1. Dubbelklicka på vägg → Redigera → Ändra längd
2. Skriv "99.999"
3. Klicka "X" (cancel)
4. ✅ Edit-läge stängs
5. ✅ Väggen oförändrad
6. ✅ Ursprunglig längd visas
```

### Test 5: Validering
```bash
1. Dubbelklicka → Redigera → Ändra längd
2. Skriv "0" (noll)
3. Klicka "OK"
4. ✅ Toast: "Ogiltig längd. Ange ett positivt tal."
5. ✅ Ingen ändring

6. Skriv "-5.0" (negativt tal)
7. Klicka "OK"
8. ✅ Toast: "Ogiltig längd. Ange ett positivt tal."
```

---

## 💻 Teknisk Implementation

### **State Management:**
```typescript
// Local state i PropertyPanel
const [isEditingDimensions, setIsEditingDimensions] = useState(false);
const [editLengthM, setEditLengthM] = useState('0');

// Initialize när shape ändras
useEffect(() => {
  if (shape.type === 'wall' || shape.type === 'line') {
    const lengthMeters = calculateLength();
    setEditLengthM(lengthMeters.toFixed(3));
  }
}, [shape.id]);
```

### **Beräkning:**
```typescript
// 1. Hämta nuvarande koordinater
const coords = shape.coordinates as any;
const dx = coords.x2 - coords.x1;
const dy = coords.y2 - coords.y1;

// 2. Beräkna vinkel
const angle = Math.atan2(dy, dx);

// 3. Konvertera ny längd till pixels
const newLengthPixels = newLengthM * getPixelsPerMeter(pixelsPerMm);

// 4. Beräkna ny slutpunkt
const newX2 = coords.x1 + Math.cos(angle) * newLengthPixels;
const newY2 = coords.y1 + Math.sin(angle) * newLengthPixels;

// 5. Uppdatera shape
onUpdateShape(shape.id, {
  coordinates: { x1: coords.x1, y1: coords.y1, x2: newX2, y2: newY2 }
});
```

### **UI Conditional Rendering:**
```typescript
{isEditingDimensions && (shape.type === 'wall' || shape.type === 'line') ? (
  // Show edit fields
  <div>
    <Label>Längd (meter):</Label>
    <Input value={editLengthM} onChange={...} />
    <Button onClick={handleSaveDimensions}>OK</Button>
    <Button onClick={() => setIsEditingDimensions(false)}>X</Button>
  </div>
) : (
  // Show readonly values
  displayValues.map(prop => (
    <div>{prop.label}: {prop.value}</div>
  ))
)}
```

---

## 🎯 Varför Denna Design?

### **1. Konsistent med Gamla Canvasen**
Gamla `ObjectPropertiesPanel` hade exakt samma funktion:
- ✅ "Ändra" knapp bredvid Dimensioner
- ✅ Input-fält för meter
- ✅ Proportionell skalning

### **2. Enkel att Använda**
- ✅ Klart visuellt var edit-knappen är
- ✅ Input-fält ersätter readonly-värden (tydligt feedback)
- ✅ OK/Cancel knappar bredvid input

### **3. Förhindrar Oavsiktliga Ändringar**
- ✅ Måste klicka "Redigera" först
- ✅ Sedan "Ändra längd"
- ✅ Två steg för att aktivera edit-läge

### **4. Precision**
- ✅ 3 decimaler (1mm precision)
- ✅ step="0.001" i input
- ✅ Validering av negativa/noll-värden

---

## 📁 Filer Uppdaterade

1. ✅ `src/components/floormap/PropertyPanel.tsx`
   - Added `isEditingDimensions` state
   - Added `editLengthM` state
   - Added `handleSaveDimensions()` function
   - Added conditional UI for dimension editing
   - Added validation
   - Added proportional scaling logic

---

## ✅ Sammanfattning

**PropertyPanel kan nu redigera vägg-längder exakt som gamla canvasen:**

| Feature | Status |
|---------|--------|
| Visa längd i m/cm/mm | ✅ |
| "Ändra längd" knapp | ✅ **ADDED** |
| Input-fält för meter | ✅ **ADDED** |
| Proportionell skalning | ✅ **ADDED** |
| Bibehåll vinkel | ✅ **ADDED** |
| 1mm precision | ✅ **ADDED** |
| Validering | ✅ **ADDED** |
| OK/Cancel knappar | ✅ **ADDED** |

**Nu kan du justera längden exakt som du ville! 🎉**
