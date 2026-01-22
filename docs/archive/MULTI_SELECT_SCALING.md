# 📐 MULTI-SELECT SCALING MED SHIFT

**Implementerat: Skala flera objekt samtidigt när Shift hålls nere**

---

## 🎯 FUNKTIONALITET

När flera objekt är markerade och du håller **Shift** nedtryckt:
- ✅ Alla markerade objekt skalas **tillsammans**
- ✅ **Aspect ratio** (proportioner) bibehålls
- ✅ Fungerar för **alla objekt-typer**

---

## ⌨️ HUR DET FUNGERAR

### **Steg 1: Markera flera objekt**
```
Metod 1: Box-selection
- Dra en ruta runt objekten

Metod 2: Shift+Click
- Klicka på första objektet
- Håll Shift och klicka på fler objekt

Metod 3: Ctrl/Cmd+A
- Markera alla objekt på canvas
```

### **Steg 2: Håll Shift + Dra storlek**
```
1. Se till att flera objekt är markerade (blå markering)
2. Håll Shift nedtryckt
3. Dra i något av corner-handles (hörnen)
4. ✅ Alla objekt skalas proportionellt tillsammans
```

---

## 🔧 TEKNISK IMPLEMENTATION

### **1. Transformer Configuration**

```typescript
<Transformer
  ref={transformerRef}
  keepRatio={isShiftPressed}           // ← Aspect ratio lock med Shift
  centeredScaling={false}              // ← Skala från anchor point
  ignoreStroke={false}                 // ← Inkludera stroke i beräkningar
  rotationSnaps={isShiftPressed ? [0, 45, 90, 135, 180, 225, 270, 315] : []}
  rotationSnapTolerance={isShiftPressed ? 10 : 0}
  // ... other props
/>
```

**Key Properties:**
- `keepRatio={isShiftPressed}`: När Shift hålls, bibehålls aspect ratio
- `isShiftPressed`: React state som trackar Shift-tangenten
- Multi-node support: Transformer attachar till alla markerade nodes

---

### **2. Shift Key Tracking**

```typescript
// State för att tracka Shift-tangenten
const [isShiftPressed, setIsShiftPressed] = useState(false);

// I keyboard event handler:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Shift' && !e.repeat && !isTyping) {
      setIsShiftPressed(true);
    }
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Shift') {
      setIsShiftPressed(false);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}, [/* dependencies */]);
```

---

### **3. Transform End Handler (För alla shape-typer)**

#### **Walls (Groups med Lines):**
```typescript
if (shape.type === 'wall' || shape.type === 'line') {
  const group = node as Konva.Group;
  const line = group.findOne('Line') as Konva.Line;
  
  if (line) {
    const points = line.points();
    const scaleX = group.scaleX();
    const scaleY = group.scaleY();
    const rotation = group.rotation();
    
    // Apply scale and rotation transformation
    // Calculate new coordinates with matrix transformation
    // Update shape in store
    updateShape(shapeId, { coordinates: { x1, y1, x2, y2 } });
    
    // Reset transform
    group.position({ x: 0, y: 0 });
    group.rotation(0);
    group.scaleX(1);
    group.scaleY(1);
  }
}
```

#### **Rooms (Polygons):**
```typescript
if (shape.type === 'room') {
  const group = node as Konva.Group;
  const coords = shape.coordinates as any;
  const points = coords.points || [];
  const scaleX = group.scaleX();
  const scaleY = group.scaleY();
  
  // Apply scale to all points
  const newPoints = points.map((p: { x: number; y: number }) => ({
    x: p.x * scaleX + x,
    y: p.y * scaleY + y
  }));
  
  updateShape(shapeId, { coordinates: { points: newPoints } });
  
  // Reset transform
  group.position({ x: 0, y: 0 });
  group.rotation(0);
  group.scaleX(1);
  group.scaleY(1);
}
```

#### **Rectangles:**
```typescript
if (shape.type === 'rectangle' || shape.type === 'door' || shape.type === 'opening') {
  const rect = node as Konva.Rect;
  const scaleX = rect.scaleX();
  const scaleY = rect.scaleY();
  
  updateShape(shapeId, {
    coordinates: {
      left: x,
      top: y,
      width: Math.max(5, rect.width() * scaleX),
      height: Math.max(5, rect.height() * scaleY),
    }
  });
  
  rect.scaleX(1);
  rect.scaleY(1);
}
```

#### **Circles:**
```typescript
if (shape.type === 'circle') {
  const circle = node as Konva.Circle;
  const scale = circle.scaleX(); // Uniform scaling
  
  updateShape(shapeId, {
    coordinates: {
      cx: x,
      cy: y,
      radius: circle.radius() * scale,
    }
  });
  
  circle.scaleX(1);
  circle.scaleY(1);
}
```

#### **Text (Font size scaling):**
```typescript
if (shape.type === 'text') {
  const text = node as Konva.Text;
  const scaleX = text.scaleX();
  const scaleY = text.scaleY();
  
  // Scale affects font size
  const currentFontSize = shape.metadata?.lengthMM || 16;
  const newFontSize = Math.max(8, currentFontSize * Math.max(scaleX, scaleY));
  
  updateShape(shapeId, {
    coordinates: { x, y },
    rotation: text.rotation(),
    metadata: { ...shape.metadata, lengthMM: newFontSize }
  });
  
  text.scaleX(1);
  text.scaleY(1);
}
```

#### **Freehand/Polygons:**
```typescript
if (shape.type === 'freehand' || shape.type === 'polygon') {
  const line = node as Konva.Line;
  const scaleX = line.scaleX();
  const scaleY = line.scaleY();
  
  const coords = shape.coordinates as any;
  const points = coords.points || [];
  
  // Apply scale to all points
  const newPoints = points.map((p: { x: number; y: number }) => ({
    x: p.x * scaleX + x,
    y: p.y * scaleY + y
  }));
  
  updateShape(shapeId, { coordinates: { points: newPoints } });
  
  line.position({ x: 0, y: 0 });
  line.scaleX(1);
  line.scaleY(1);
}
```

---

## 🧪 TESTNING

### **Test 1: Skala väggar tillsammans**
```bash
1. Skapa en Shape (Fyrkant 2x2m = 4 väggar)
2. Markera alla väggar (Cmd/Ctrl + A)
   ✅ "4 objekt markerade"
3. Håll Shift nedtryckt
4. Dra i ett corner-handle
   ✅ Alla 4 väggar skalas proportionellt
   ✅ Fyrkanten förblir kvadratisk (aspect ratio bibehålls)
   ✅ Väggmått uppdateras korrekt
```

### **Test 2: Skala rum och väggar**
```bash
1. Rita några väggar och skapa ett rum
2. Markera både väggar och rum (box-selection)
   ✅ "X objekt markerade"
3. Håll Shift
4. Dra i corner-handle
   ✅ Alla väggar och rum skalas tillsammans
   ✅ Proportioner bibehålls
```

### **Test 3: Skala olika objekt-typer**
```bash
1. Skapa:
   - Väggar (walls)
   - Rum (rooms)
   - Text (text)
   - Cirkel-shape (8 väggar)
2. Markera alla (Cmd/Ctrl + A)
3. Håll Shift
4. Skala med corner-handle
   ✅ Alla objekt skalas tillsammans
   ✅ Text blir större/mindre (font size)
   ✅ Cirkeln förblir rund
   ✅ Rum behåller sin form
```

### **Test 4: UTAN Shift (fri skalning)**
```bash
1. Markera flera objekt
2. Dra i corner-handle UTAN Shift
   ✅ Objekt kan skalas fritt (stretch)
   ✅ Aspect ratio följer inte handle-draggning
```

### **Test 5: Rotation + Scaling**
```bash
1. Markera flera objekt
2. Rotera gruppen (Shift för 45° snap)
3. Håll Shift och skala
   ✅ Objekt roteras OCH skalas tillsammans
   ✅ Proportioner bibehålls
```

---

## 📊 SUPPORTED OPERATIONS

### **Med flera objekt markerade + Shift:**

| Operation | Utan Shift | Med Shift | Resultat |
|-----------|------------|-----------|----------|
| **Skala** | Fri stretch | Proportionell | ✅ Aspect ratio lock |
| **Rotera** | Fri rotation | 45° snap | ✅ Exakta vinklar |
| **Flytta** | Normal | Normal | ✅ Snap-to-grid (om aktiverat) |

---

## 🎨 USE CASES

### **Arkitektonisk design:**
```
1. Skapa standard rumslayout
2. Markera alla väggar + möbler
3. Shift + Skala för att anpassa till olika storlekar
4. Proportioner bibehålls → konsekvent design
```

### **Snabb iterering:**
```
1. Designa ett rum (3x4m)
2. Copy/Paste (Ctrl/Cmd + C, V)
3. Shift + Skala till 4x5m
4. Alla element (väggar, dörrar, fönster) skalas proportionellt
```

### **Symmetriska layouts:**
```
1. Skapa symmetrisk design (t.ex. cirkel-rum)
2. Shift + Skala för att ändra storlek
3. Cirkeln förblir perfekt rund
4. Triangel förblir liksidig
```

---

## 💡 PRO TIPS

### **Shift-beteende:**
```
✅ Shift + Corner-handle → Proportionell skalning
✅ Shift + Rotate-handle → 45° rotation snap
✅ Shift + Click → Multi-selection
❌ UTAN Shift → Fri transformation
```

### **Kombination med andra features:**
```
1. Ctrl/Cmd + A → Markera allt
2. Shift + Skala → Skala hela projektet proportionellt
3. Ctrl/Cmd + S → Spara
```

### **Grid Snap:**
```
• Grid snap påverkar position, INTE storlek
• Shift påverkar skalning/rotation
• Båda kan användas samtidigt för exakt positionering
```

---

## 🔍 TEKNISKA DETALJER

### **Konva Transformer Properties:**
- `keepRatio`: Boolean för aspect ratio lock
- `nodes()`: Array av Konva nodes att transformera
- `scaleX()`, `scaleY()`: Get/set scale på node
- `rotation()`: Get/set rotation på node
- Reset transform: Sätt scale till 1, position till 0 efter update

### **Transformation Matrix:**
För walls med rotation:
```typescript
// Apply scale
scaledX = x * scaleX
scaledY = y * scaleY

// Apply rotation
rad = rotation * π / 180
cos = Math.cos(rad)
sin = Math.sin(rad)
rotatedX = scaledX * cos - scaledY * sin
rotatedY = scaledX * sin + scaledY * cos

// Apply translation
finalX = rotatedX + translateX
finalY = rotatedY + translateY
```

---

## 🎉 SAMMANFATTNING

**Implementerat:**
- ✅ `keepRatio={isShiftPressed}` på Transformer
- ✅ Shift key tracking (keydown/keyup)
- ✅ Scale-hantering för alla shape-typer:
  - Walls (med rotation)
  - Rooms (polygon points)
  - Rectangles (width/height)
  - Circles (radius)
  - Text (fontSize)
  - Freehand/Polygons (points)
- ✅ Multi-node transformation
- ✅ Transform reset efter update

**Resultat:**
- **Håll Shift** → Proportionell skalning av alla markerade objekt
- **Släpp Shift** → Fri skalning (stretch)
- **Fungerar för alla objekt-typer** → Konsekvent beteende
- **Kombination med rotation** → Shift ger 45° snap
- **Professional workflow** → Som Figma, Sketch, etc.

**Testa nu:**
1. Markera flera objekt (box-selection eller Ctrl/Cmd+A)
2. Håll Shift nedtryckt
3. Dra i ett corner-handle
4. **Alla objekt skalas proportionellt! 📐**
