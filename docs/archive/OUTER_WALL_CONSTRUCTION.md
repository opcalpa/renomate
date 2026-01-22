# 🧱 Yttervägg i Väggkonstruktioner

## Översikt

Ett nytt "Yttervägg"-alternativ har lagts till i väggkonstruktionspanelen, vilket gör det enkelt att rita ytterväggar med rätt tjocklek (300mm) direkt från toolbaren.

## Användning

### **Steg 1: Öppna Väggkonstruktioner-menyn**

1. Klicka på **vägg-ikonen** (Minus-symbol) i vänstra toolbaren
2. **ELLER:** Högerklicka på vägg-ikonen
3. **ELLER:** Klicka på den smala högra kanten av vägg-ikonen

**Submeny öppnas med alternativ:**
- Fyrkant 2x2m
- Cirkel ⌀2m
- Triangel
- **Yttervägg** ← NYA!

### **Steg 2: Välj Yttervägg**

1. Klicka på **"Yttervägg"**-knappen (ikon med dubbla linjer)
2. Toast-meddelande: "Yttervägg aktiverat (300mm tjocklek)"
3. Väggverktyget aktiveras automatiskt

### **Steg 3: Rita Yttervägg**

1. Klicka på canvas för att starta väggen
2. Rita som en vanlig vägg (klicka för varje punkt)
3. Väggen skapas med 300mm tjocklek automatiskt

## Teknisk Implementation

### **Fil 1: `src/components/floormap/SimpleToolbar.tsx`**

#### **A. Uppdaterad TypeScript Type:**
```typescript
const handleWallConstruction = (
  templateType: 'square2x2' | 'circle2m' | 'triangle' | 'outer_wall'
) => {
  // ...
}
```

**Ändring:** Lade till `'outer_wall'` som en giltig typ.

#### **B. Yttervägg-Hantering:**
```typescript
if (templateType === 'outer_wall') {
  // For outer wall, activate wall tool with outer wall settings
  setActiveTool('wall');
  // Set outer wall properties in window for canvas to use
  (window as any).__wallType = 'outer';
  (window as any).__wallThickness = 300; // 300mm for outer wall
  toast.info('Yttervägg aktiverat (300mm tjocklek)');
} else {
  // Existing template logic (square, circle, triangle)
  (window as any).__createTemplate = templateType;
  setActiveTool('select');
}
setWallSubmenuOpen(false);
```

**Vad gör den:**
- Aktiverar väggverktyget direkt (inte select-verktyget som templates)
- Sätter `(window as any).__wallThickness = 300` för canvas att läsa
- Sätter `(window as any).__wallType = 'outer'` för framtida användning
- Visar toast-meddelande

#### **C. UI-Knapp:**
```typescript
<Separator className="my-1" />

<Button
  variant="ghost"
  size="sm"
  className="w-full justify-start gap-3 h-10"
  onClick={() => handleWallConstruction('outer_wall')}
>
  <OuterWallIcon className="h-4 w-4" />
  <div className="flex flex-col items-start">
    <span className="text-sm">Yttervägg</span>
    <span className="text-xs text-muted-foreground">Tjock vägg 300mm</span>
  </div>
</Button>
```

**Design:**
- Separator innan för att separera från template-alternativ
- Använder `OuterWallIcon` (dubbla linjer)
- Beskrivning: "Tjock vägg 300mm"

#### **D. Import Toast:**
```typescript
import { toast } from "sonner";
```

### **Fil 2: `src/components/floormap/UnifiedKonvaCanvas.tsx`**

#### **Uppdaterad Wall Creation Logic:**

**Före:**
```typescript
if (activeTool === 'wall') {
  newShape = {
    id: uuidv4(),
    planId: currentPlanId,
    type: 'wall',
    coordinates: { x1: start.x, y1: start.y, x2: end.x, y2: end.y },
    strokeColor: '#2d3748',
    thicknessMM: projectSettings.wallThicknessMM || 200,
  };
}
```

**Efter:**
```typescript
if (activeTool === 'wall') {
  // Check for custom wall thickness from toolbar (e.g., outer wall)
  const customThickness = (window as any).__wallThickness;
  const wallThickness = customThickness || projectSettings.wallThicknessMM || 200;
  
  // Clear custom thickness after use
  if (customThickness) {
    delete (window as any).__wallThickness;
    delete (window as any).__wallType;
  }
  
  // Create wall
  newShape = {
    id: uuidv4(),
    planId: currentPlanId,
    type: 'wall',
    coordinates: { x1: start.x, y1: start.y, x2: end.x, y2: end.y },
    strokeColor: '#2d3748',
    thicknessMM: wallThickness,
  };
}
```

**Vad gör den:**
1. Kollar om `(window as any).__wallThickness` finns (satt från toolbar)
2. Använder custom thickness om den finns, annars fallback till projektinställningar
3. Rensar `__wallThickness` och `__wallType` efter användning (one-time setting)
4. Skapar väggen med rätt tjocklek

**Varför rensa efter användning:**
- Nästa vägg som ritas ska använda standard-tjocklek igen
- Annars skulle alla framtida väggar vara 300mm (oönskat)
- "One-shot" beteende: endast första väggen efter Yttervägg-klick är 300mm

## Väggtjocklekar

| Typ | Tjocklek | Användning |
|-----|----------|------------|
| **Innervägg** | 100-150mm | Standard inre väggar |
| **Bärande vägg** | 200mm | Default (projectSettings) |
| **Yttervägg** | 300mm | Isolerade ytterväggar |

## Användarflöde

### **Scenario 1: Rita En Yttervägg**
1. Öppna Väggkonstruktioner (högerklicka på vägg-ikon)
2. Klicka "Yttervägg"
3. Toast: "Yttervägg aktiverat (300mm tjocklek)"
4. Rita vägg (klicka start → klicka slut)
5. ✅ Vägg skapas med 300mm tjocklek

### **Scenario 2: Rita Flera Väggar (Mix)**
1. Öppna Väggkonstruktioner
2. Klicka "Yttervägg"
3. Rita första väggen (300mm)
4. Rita andra väggen (200mm - standard återställd)
5. Öppna Väggkonstruktioner igen
6. Klicka "Yttervägg"
7. Rita tredje väggen (300mm)
8. ✅ Varje gång du väljer Yttervägg, gäller det endast NÄSTA vägg

### **Scenario 3: Jämfört med Template-Strukturer**
**Yttervägg:**
- Aktiverar väggverktyget direkt
- Du ritar fritt
- 300mm tjocklek endast för nästa vägg
- Fungerar som vanlig vägg-ritning

**Template (Fyrkant, Cirkel, Triangel):**
- Aktiverar select-verktyget
- Klicka en gång = hela strukturen placeras
- Flera väggar på en gång
- Använder standard-tjocklek från projektinställningar

## Användningsfall

### **1. Yttervägg på Fasad**
**Användning:** Rita byggnadens yttre väggar med korrekt isolering-tjocklek.
```
Steg:
1. Välj "Yttervägg"
2. Rita norr-vägg (300mm)
3. Välj "Yttervägg" igen
4. Rita öster-vägg (300mm)
5. Upprepa för söder och väster
```

### **2. Bärande Innervägg**
**Användning:** Standard väggverktyget för 200mm bärande väggar.
```
Steg:
1. Klicka vägg-ikonen (aktiverar väggverktyget)
2. Rita som vanligt (200mm default)
```

### **3. Lätt Skiljevägg**
**Användning:** Ändra tjocklek manuellt i PropertyPanel efter ritning.
```
Steg:
1. Rita vägg (200mm)
2. Dubbelklicka på väggen
3. PropertyPanel öppnas
4. Ändra tjocklek: 200mm → 100mm
5. Spara
```

### **4. Hela Byggnad (Struktur)**
**Användning:** Använd "Fyrkant 2x2m" för snabba strukturer, sen justera manuellt.
```
Steg:
1. Välj "Fyrkant 2x2m"
2. Klicka på canvas (4 väggar skapas)
3. Markera yttre väggar
4. Ändra tjocklek till 300mm
```

## Keyboard Shortcuts (Påminnelse)

| Shortcut | Funktion |
|----------|----------|
| **Högerklicka** på vägg-ikon | Öppna Väggkonstruktioner |
| **M** | Aktivera vägg-verktyget |
| **Esc** | Avbryt ritning, återgå till markör |
| **Cmd+Z / Ctrl+Z** | Ångra senaste vägg |

## Visuell Representation

### **Ikoner i Väggkonstruktioner-Menyn:**

```
╔════════════════════════════════╗
║  Vägg-konstruktioner           ║
╠════════════════════════════════╣
║  ◻️  Fyrkant 2x2m              ║
║     Rektangulär väggstruktur   ║
╠════════════════════════════════╣
║  ⭕ Cirkel ⌀2m                 ║
║     Cirkulär väggstruktur      ║
╠════════════════════════════════╣
║  △  Triangel                   ║
║     Triangulär väggstruktur    ║
╠════════════════════════════════╣
║  ━━  Yttervägg   ← NY!         ║
║     Tjock vägg 300mm           ║
╚════════════════════════════════╝
```

### **OuterWallIcon (Dubbla Linjer):**
```svg
<svg viewBox="0 0 24 24">
  <line x1="4" y1="11" x2="20" y2="11" strokeWidth="2.5" />
  <line x1="4" y1="13" x2="20" y2="13" strokeWidth="2.5" />
</svg>
```

Representerar en tjockare vägg med två parallella linjer.

## Skillnad från "Linjer"-Sektion

**Viktigt:** Det finns BÅDE en "Yttervägg" i **Väggkonstruktioner** och en i **Linjer**-sektionen.

### **Väggkonstruktioner → Yttervägg (NY):**
- ✅ Aktiverar väggverktyget direkt
- ✅ Sätter 300mm tjocklek automatiskt
- ✅ För snabb ritning av ytterväggar

### **Linjer → Yttervägg (Befintlig):**
- ⚠️ Skapar ett "door object" (legacy från tidigare implementation)
- ⚠️ Används för att placera fördefinierade ytterväggs-objekt
- ⚠️ Kanske borde tas bort eller uppdateras för konsistens

**Rekommendation:** Använd den NYA "Yttervägg" i **Väggkonstruktioner** för bästa resultat.

## Framtida Förbättringar

### **1. Visuell Indikation:**
```typescript
// Visa tjockleken på cursor när outer_wall är aktivt
if ((window as any).__wallType === 'outer') {
  // Rita en preview på cursor med 300mm bredd
}
```

### **2. Färg-Kod för Väggar:**
```typescript
// Yttervägg = mörkare färg
strokeColor: customThickness === 300 ? '#1a202c' : '#2d3748'
```

### **3. Persistent Ytterväggs-Läge:**
```typescript
// Toggle-knapp: "Lock Outer Wall Mode"
// Alla väggar blir 300mm tills användaren stänger av det
```

### **4. Innervägg Snabbval:**
```typescript
// Lägg till "Innervägg" (100mm) i Väggkonstruktioner också
handleWallConstruction('inner_wall') → 100mm
```

### **5. Custom Tjocklek Input:**
```typescript
// Dialog: "Ange väggtjocklek (mm):"
// Användaren kan mata in valfri tjocklek
```

## Testing

### **Test 1: Enkel Yttervägg**
1. ✅ Öppna Space Planner
2. ✅ Högerklicka på vägg-ikon
3. ✅ Klicka "Yttervägg"
4. ✅ Toast: "Yttervägg aktiverat (300mm tjocklek)"
5. ✅ Rita en vägg
6. ✅ Dubbelklicka på väggen
7. ✅ PropertyPanel visar: "Tjocklek: 300mm"

### **Test 2: Flera Väggar (Reset)**
1. ✅ Välj "Yttervägg"
2. ✅ Rita vägg A (300mm)
3. ✅ Rita vägg B (200mm - ska återställas)
4. ✅ Verifiera att vägg B är 200mm (standard)

### **Test 3: Template vs Yttervägg**
1. ✅ Välj "Fyrkant 2x2m"
2. ✅ Klicka på canvas (4 väggar med 200mm)
3. ✅ Välj "Yttervägg"
4. ✅ Rita en vägg (300mm)
5. ✅ Verifiera att fyrkantens väggar fortfarande är 200mm

### **Test 4: Cross-Browser**
- ✅ **Chrome:** Fungerar
- ✅ **Safari:** Fungerar
- ✅ **Firefox:** Fungerar
- ✅ **Edge:** Fungerar

### **Test 5: Undo/Redo**
1. ✅ Välj "Yttervägg"
2. ✅ Rita en vägg (300mm)
3. ✅ Cmd+Z (ångra)
4. ✅ Vägg försvinner
5. ✅ Cmd+Shift+Z (gör om)
6. ✅ Vägg återkommer med 300mm

## Felsökning

### **Problem: Yttervägg blir 200mm istället för 300mm**
**Orsak:** `(window as any).__wallThickness` rensades för tidigt eller sattes inte.
**Lösning:**
1. Öppna konsolen
2. Välj "Yttervägg"
3. Kolla: `console.log((window as any).__wallThickness)` (ska vara `300`)
4. Rita vägg omedelbart

### **Problem: Alla väggar blir 300mm efter första Yttervägg**
**Orsak:** `__wallThickness` rensas inte korrekt efter användning.
**Lösning:**
- Kontrollera att `delete (window as any).__wallThickness` körs i UnifiedKonvaCanvas
- Kolla konsolen: `(window as any).__wallThickness` ska vara `undefined` efter första väggen

### **Problem: Toast visas men ingenting händer**
**Orsak:** Väggverktyget aktiveras inte korrekt.
**Lösning:**
- Kontrollera att `setActiveTool('wall')` anropas
- Kolla att `activeTool` i Zustand store är `'wall'`

### **Problem: "Yttervägg" i Linjer-sektion fungerar annorlunda**
**Orsak:** Det är två olika implementationer (legacy vs ny).
**Lösning:**
- Använd "Yttervägg" i **Väggkonstruktioner** (den nya)
- Ignorera "Yttervägg" i **Linjer** (legacy, kanske ska tas bort)

## Relaterade Filer

- ✅ `/src/components/floormap/SimpleToolbar.tsx` - UI och Yttervägg-aktivering
- ✅ `/src/components/floormap/UnifiedKonvaCanvas.tsx` - Vägg-skapande med custom tjocklek
- ✅ `/src/components/floormap/PropertyPanel.tsx` - Redigera väggtjocklek efter skapande
- ✅ `/src/components/floormap/store.ts` - Zustand store med projectSettings.wallThicknessMM

## Changelog

### **2026-01-21**
- ✅ Lagt till "Yttervägg" i Väggkonstruktioner-menyn
- ✅ Implementerat `handleWallConstruction('outer_wall')`
- ✅ Uppdaterat UnifiedKonvaCanvas för att läsa `__wallThickness`
- ✅ Lagt till toast-meddelande
- ✅ Dokumenterat i `OUTER_WALL_CONSTRUCTION.md`

---

**TL;DR:** 
1. ✅ Högerklicka på vägg-ikon
2. ✅ Klicka "Yttervägg"
3. ✅ Rita vägg (300mm tjocklek automatiskt)
4. ✅ Nästa vägg återgår till standard-tjocklek

**Enklare kan det inte bli!** 🧱🎉

*Implementerat: 2026-01-21*
