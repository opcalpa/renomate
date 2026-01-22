# 🔧 Property Panel Fix - Missing Props

## Problem

När användaren försöker ändra tjockleken på en vägg och spara objektet:
- ❌ Konsolen visar: `Uncaught TypeError: onUpdateShape is not a function`
- ❌ Ändringar sparas inte
- ❌ PropertyPanel kan inte uppdatera shape

### **Root Cause:**

PropertyPanel renderades med **felaktiga props** i `UnifiedKonvaCanvas.tsx`:

**PropertyPanel förväntar sig (enligt interface):**
```typescript
interface PropertyPanelProps {
  shape: FloorMapShape;            // ✅
  projectId: string;                // ❌ SAKNADES
  onClose: () => void;              // ✅
  onUpdateShape: (shapeId, updates) => void;  // ❌ FEL NAMN
  pixelsPerMm: number;              // ❌ SAKNADES
}
```

**Men fick:**
```typescript
<PropertyPanel
  shape={propertyPanelShape}        // ✅
  // projectId SAKNADES!             // ❌
  onClose={() => {...}}             // ✅
  onUpdate={(updates) => {...}}     // ❌ FEL NAMN (ska vara onUpdateShape)
  // pixelsPerMm SAKNADES!           // ❌
/>
```

## Lösning

### **Fil:** `src/components/floormap/UnifiedKonvaCanvas.tsx`

**Före (felaktigt):**
```typescript
{showPropertyPanel && propertyPanelShape && (
  <PropertyPanel
    shape={propertyPanelShape}
    onClose={() => {
      setShowPropertyPanel(false);
      setPropertyPanelShape(null);
    }}
    onUpdate={(updates) => {  // ❌ FEL NAMN
      if (propertyPanelShape) {
        updateShape(propertyPanelShape.id, updates);
      }
    }}
    // ❌ projectId SAKNAS
    // ❌ pixelsPerMm SAKNAS
  />
)}
```

**Efter (korrekt):**
```typescript
{showPropertyPanel && propertyPanelShape && currentProjectId && (
  <PropertyPanel
    shape={propertyPanelShape}
    projectId={currentProjectId}           // ✅ TILLAGD
    pixelsPerMm={scaleSettings.pixelsPerMm}  // ✅ TILLAGD
    onClose={() => {
      setShowPropertyPanel(false);
      setPropertyPanelShape(null);
    }}
    onUpdateShape={(shapeId, updates) => {  // ✅ RÄTT NAMN
      updateShape(shapeId, updates);
      setPropertyPanelShape({ ...propertyPanelShape, ...updates });
    }}
  />
)}
```

## Ändringar

### **1. Lagt till `projectId` prop:**
```typescript
projectId={currentProjectId}
```
**Varför behövs den:**
- PropertyPanel behöver projectId för CommentsSection
- CommentsSection hämtar/sparar kommentarer för shapes i projektet

### **2. Lagt till `pixelsPerMm` prop:**
```typescript
pixelsPerMm={scaleSettings.pixelsPerMm}
```
**Varför behövs den:**
- PropertyPanel behöver konvertera mellan pixels och millimeter
- Används för att visa/redigera vägglängder, tjocklek, etc.
- Exempel: Wall length i meter = pixelLength / (pixelsPerMm * 1000)

### **3. Ändrat `onUpdate` till `onUpdateShape`:**
```typescript
// Före:
onUpdate={(updates) => {...}}

// Efter:
onUpdateShape={(shapeId, updates) => {...}}
```
**Varför:**
- PropertyPanel interface kräver `onUpdateShape`
- Callback behöver både `shapeId` och `updates`
- Konsistent naming i hela codebasen

### **4. Förbättrad `onUpdateShape` implementation:**
```typescript
onUpdateShape={(shapeId, updates) => {
  updateShape(shapeId, updates);
  setPropertyPanelShape({ ...propertyPanelShape, ...updates });
}}
```
**Vad gör den:**
- Uppdaterar shape i store (`updateShape`)
- Uppdaterar lokal state så PropertyPanel ser nya värden direkt
- Förhindrar att PropertyPanel visar gamla värden efter save

### **5. Lagt till `currentProjectId` check:**
```typescript
{showPropertyPanel && propertyPanelShape && currentProjectId && (
  <PropertyPanel ... />
)}
```
**Varför:**
- Förhindrar rendering av PropertyPanel om projectId saknas
- PropertyPanel kräver projectId, så det är en required dependency

## Användarflöde (fixat)

### **Före fix:**
1. Dubbelklicka på vägg
2. PropertyPanel öppnas
3. Ändra tjocklek från 150mm till 200mm
4. Klicka "Spara"
5. ❌ `TypeError: onUpdateShape is not a function`
6. ❌ Ändringar sparas inte

### **Efter fix:**
1. Dubbelklicka på vägg
2. PropertyPanel öppnas
3. Ändra tjocklek från 150mm till 200mm
4. Klicka "Spara"
5. ✅ Shape uppdateras i store
6. ✅ PropertyPanel visar nya värdet
7. ✅ Toast: "Ändringar sparade!"

## PropertyPanel funktioner som nu fungerar

### **1. Namn & Anteckningar:**
```typescript
const handleSave = () => {
  onUpdateShape(shape.id, { 
    name: editName,
    notes: notes 
  });
  toast.success('Ändringar sparade!');
};
```
✅ **Fungerar nu!**

### **2. Auto-save anteckningar:**
```typescript
useEffect(() => {
  const timeoutId = setTimeout(() => {
    if (notes !== shape.notes) {
      onUpdateShape(shape.id, { notes });
      toast.success('Anteckningar sparade');
    }
  }, 1000);
  return () => clearTimeout(timeoutId);
}, [notes]);
```
✅ **Fungerar nu!** (sparar efter 1 sekund)

### **3. Dimensionsändringar (väggar):**
```typescript
// När användaren ändrar längd/tjocklek/höjd
onUpdateShape(shape.id, {
  coordinates: { x1, y1, x2, y2 },
  thicknessMM: newThickness,
  heightMM: newHeight
});
```
✅ **Fungerar nu!**

### **4. Kommentarer:**
```typescript
<CommentsSection
  projectId={projectId}  // ✅ Nu tillgänglig!
  drawingObjectId={shape.id}
/>
```
✅ **Fungerar nu!**

## Tekniska Detaljer

### **Props som PropertyPanel använder:**

#### **`projectId`:**
- **Typ:** `string`
- **Används av:** `CommentsSection`
- **Syfte:** Hämta/spara kommentarer för shapes

#### **`pixelsPerMm`:**
- **Typ:** `number`
- **Används av:** Dimension calculations
- **Exempel:** 
  ```typescript
  const lengthMeters = lengthPixels / (pixelsPerMm * 1000);
  const thicknessMM = shape.thicknessMM || 150;
  ```

#### **`onUpdateShape`:**
- **Typ:** `(shapeId: string, updates: Partial<FloorMapShape>) => void`
- **Anropas vid:**
  - Save button click (namn, notes)
  - Auto-save notes (efter 1s)
  - Dimension ändringar (längd, tjocklek, höjd)
- **Gör:** Uppdaterar shape i Zustand store

### **Shape updates:**
```typescript
// Store update
updateShape(shapeId, updates);

// Local state update (för direkt feedback)
setPropertyPanelShape({ 
  ...propertyPanelShape, 
  ...updates 
});
```

## Testing

### **Test 1: Ändra väggtjocklek**
1. Dubbelklicka på vägg
2. PropertyPanel öppnas
3. Klicka "Redigera dimensioner"
4. Ändra tjocklek: 150mm → 200mm
5. Klicka "Spara ändringar"
6. ✅ Förväntat: Toast "Ändringar sparade!"
7. ✅ Förväntat: Vägg uppdateras med ny tjocklek

### **Test 2: Ändra namn**
1. Dubbelklicka på objekt
2. PropertyPanel öppnas
3. Klicka edit-ikon
4. Ändra namn: "Vägg 1" → "Yttervä

gg Norr"
5. Klicka "Spara"
6. ✅ Förväntat: Toast "Ändringar sparade!"
7. ✅ Förväntat: Namn uppdateras

### **Test 3: Auto-save anteckningar**
1. Dubbelklicka på objekt
2. PropertyPanel öppnas
3. Klicka i "Anteckningar" fält
4. Skriv: "Behöver isoleras extra"
5. Vänta 1 sekund
6. ✅ Förväntat: Toast "Anteckningar sparade"
7. ✅ Förväntat: Anteckningar sparas automatiskt

### **Test 4: Lägg till kommentar**
1. Dubbelklicka på objekt
2. PropertyPanel öppnas
3. Scrolla ner till CommentsSection
4. Skriv kommentar: "Diskutera med arkitekt"
5. Klicka "Skicka"
6. ✅ Förväntat: Kommentar sparas
7. ✅ Förväntat: Visas i listan

## Edge Cases

### **1. PropertyPanel öppnas utan currentProjectId:**
```typescript
// Före fix: PropertyPanel försöker rendera utan projectId
// Efter fix: Renderas inte alls
{showPropertyPanel && propertyPanelShape && currentProjectId && (
  <PropertyPanel ... />
)}
```
✅ **Förhindrat!**

### **2. Shape uppdateras medan PropertyPanel är öppen:**
```typescript
onUpdateShape={(shapeId, updates) => {
  updateShape(shapeId, updates);
  // Uppdatera även lokal state
  setPropertyPanelShape({ ...propertyPanelShape, ...updates });
}}
```
✅ **Hanterat!** PropertyPanel visar nya värden direkt

### **3. Användaren stänger PropertyPanel mitt i edit:**
```typescript
onClose={() => {
  setShowPropertyPanel(false);
  setPropertyPanelShape(null);  // Rensa state
}}
```
✅ **Hanterat!** State rensas korrekt

## Tidigare vs Nuvarande

| Aspekt | Före Fix | Efter Fix |
|--------|----------|-----------|
| **onUpdateShape** | ❌ Saknas (använder onUpdate) | ✅ Korrekt namn |
| **projectId** | ❌ Saknas | ✅ Tillgänglig |
| **pixelsPerMm** | ❌ Saknas | ✅ Tillgänglig |
| **Spara namn** | ❌ TypeError | ✅ Fungerar |
| **Spara tjocklek** | ❌ TypeError | ✅ Fungerar |
| **Auto-save notes** | ❌ TypeError | ✅ Fungerar |
| **Kommentarer** | ❌ Saknar projectId | ✅ Fungerar |
| **Dimension calc** | ❌ Saknar pixelsPerMm | ✅ Fungerar |

## Relaterade Filer

- ✅ `src/components/floormap/UnifiedKonvaCanvas.tsx` - Fixed PropertyPanel rendering
- ✅ `src/components/floormap/PropertyPanel.tsx` - Interface och implementation (oförändrad)
- ✅ `src/components/comments/CommentsSection.tsx` - Använder projectId prop

---

**TL;DR:** PropertyPanel fick fel props från UnifiedKonvaCanvas. Fixade genom att:
1. Ändra `onUpdate` → `onUpdateShape` 
2. Lägga till `projectId={currentProjectId}`
3. Lägga till `pixelsPerMm={scaleSettings.pixelsPerMm}`
4. Förbättra onUpdateShape callback
5. Lägga till currentProjectId check

Nu fungerar all redigering i PropertyPanel! 🎉🔧

*Fixat: 2026-01-21*
