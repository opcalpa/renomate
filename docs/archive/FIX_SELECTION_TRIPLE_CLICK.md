# ✅ Fix: Objektmarkering & Trippelklick för Info-panel

## Datum: 2026-01-19

### Problem som fixades:

1. **❌ Musmarkören markerade inga objekt**
2. **❌ Dubbelklick öppnade info-panel (skulle vara trippelklick som i gamla canvasen)**

---

## ✅ Lösning 1: Objektmarkering fungerar igen

### Problem
Efter att vi implementerade "ignorera väggar när väggverktyget är aktivt", slutade ALL objektmarkering att fungera - även med markeringsverktyget.

### Orsak
```typescript
// TIDIGARE (FEL):
const handleSelect = () => {
  if (activeTool === 'select') {  // ← Krävde select-verktyget
    handleShapeClick(shape.id, shape.type);
  }
};
```

Detta gjorde att objekt **ENDAST** kunde markeras med select-verktyget aktivt, vilket inte är intuitivt.

### Fix
```typescript
// NU (RÄTT):
const handleSelect = () => {
  // Tillåt markering om vi INTE aktivt ritar med det verktyget
  const isDrawingThisType = (
    (activeTool === 'wall' && (shape.type === 'wall' || shape.type === 'line')) ||
    (activeTool === 'room' && shape.type === 'room') ||
    (activeTool === 'freehand' && shape.type === 'freehand')
  );
  
  if (!isDrawingThisType) {
    handleShapeClick(shape.id, shape.type);
  }
};
```

### Resultat
✅ **Du kan markera objekt när som helst** (utom när du aktivt ritar med det verktyget)
✅ **Rita vägg** → andra objekt går att markera, men inte befintliga väggar
✅ **Rita rum** → andra objekt går att markera, men inte befintliga rum
✅ **Intuitivt och flexibelt!**

---

## ✅ Lösning 2: Trippelklick för Info-panel (som gamla canvasen)

### Problem
Dubbelklick öppnade info-panelen, men i gamla canvasen användes **trippelklick** för detta.

### Ny Logik
```typescript
// Klick-detektion:
if (clickCount === 0) {
  // 1️⃣ FÖRSTA KLICK → Markera objekt
  setSelectedShapeId(shapeId);
  
} else if (clickCount === 1) {
  // 2️⃣ ANDRA KLICK → Håll markerad, vänta på tredje
  // (gör inget, bara vänta)
  
} else if (clickCount >= 2) {
  // 3️⃣ TRIPPELKLICK → Öppna info-panel! 🎉
  setSelectedRoomForDetail(shapeId);
  setIsRoomDetailOpen(true);
}
```

### Resultat
✅ **Ett klick** → Markera objekt
✅ **Två klick** → Fortfarande markerat (ingen händelse)
✅ **Tre klick** → Öppna objektinfo-panel till höger!

**Detta matchar exakt gamla canvasens beteende!**

---

## 🎯 Så här fungerar det nu:

### Markera Objekt
**Ett klick på vilket objekt som helst:**
- ✅ Väggar (när väggverktyget INTE är aktivt)
- ✅ Rum (när rumsverktyget INTE är aktivt)
- ✅ Rektanglar, cirklar, text
- ✅ Alla objekt går att markera nästan hela tiden!

**Undantag:**
- När du har **väggverktyget** aktivt → Kan INTE markera befintliga väggar (för att inte störa ritning)
- När du har **rumsverktyget** aktivt → Kan INTE markera befintliga rum
- Logiskt och intuitivt!

### Öppna Info-panel
**Trippelklick på vilket objekt som helst:**
1. **Ett klick** → Objektet markeras
2. **Två klick** → Objektet fortfarande markerat
3. **Tre klick** → Info-panelen öppnas till höger!

**Fungerar för:**
- ✅ Rum → Rumspanel med namn, beskrivning, area, kommentarer
- ✅ Väggar → Visar objektinfo (kan expanderas med väggpanel senare)
- ✅ Alla andra objekt → Visar info-panel

---

## 🔍 Tekniska Detaljer

### Smart Selektionslogik
```typescript
// Kontrollera om vi aktivt ritar med det verktyget
const isDrawingThisType = (
  (activeTool === 'wall' && shape.type === 'wall') ||
  (activeTool === 'room' && shape.type === 'room') ||
  (activeTool === 'freehand' && shape.type === 'freehand')
);

// Tillåt markering om vi INTE ritar med det verktyget
if (!isDrawingThisType) {
  handleShapeClick(shape.id, shape.type);
}
```

**Fördelar:**
- ✅ Enkel och logisk
- ✅ Flexibel för alla verktygstyper
- ✅ Lätt att utöka med fler verktyg

### Trippelklick-timer
```typescript
// 400ms timeout för att detektera klick-sekvenser
const timer = setTimeout(() => {
  setClickCount(0);
  setLastClickedShapeId(null);
}, 400);
```

**Varför 400ms?**
- Tillräckligt långt för att detektera trippelklick
- Tillräckligt kort för att kännas responsivt
- Matchar standardbeteende i de flesta UI-ramverk

---

## 📋 Användningsexempel

### Exempel 1: Rita väggar och markera rum
```
1. Välj väggverktyget
2. Rita några väggar (kan INTE markera befintliga väggar)
3. Klicka på ett rum → Rummet markeras! ✅
4. Trippelklicka på rummet → Redigera rumsnamn! ✅
```

### Exempel 2: Redigera flera objekt
```
1. Ett klick på vägg → Vägg markeras
2. Ctrl + Klick på rum → Lägg till rum i markering
3. Ctrl + Klick på text → Lägg till text i markering
4. Delete → Ta bort alla markerade objekt
```

### Exempel 3: Snabb info-åtkomst
```
1. Trippelklicka på rum → Info-panel öppnas
2. Ändra rumsnamn → "Vardagsrum"
3. Lägg till kommentar → "Byt golv"
4. Stäng panel → Fortsätt rita
```

---

## ✅ Sammanfattning

**Båda problemen är nu fixade:**

1. ✅ **Objektmarkering fungerar perfekt** → Kan markera nästan alla objekt, nästan hela tiden
2. ✅ **Trippelklick öppnar info-panel** → Matchar gamla canvasens beteende
3. ✅ **Intuitivt och logiskt** → Rita utan att störas, markera när du behöver
4. ✅ **Flexibelt system** → Lätt att utöka med fler verktyg och objekt

**Nu fungerar musmarkören stabilt och funktionellt, precis som det ska!** 🎉
