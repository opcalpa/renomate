# 🎨 ANPASSAD RUMSFÄRG - RUMSDETALJER

**Implementerat: Ändra färg på rum från Rumsdetaljer-dialogen**

---

## 🎯 FUNKTIONALITET

När du öppnar Rumsdetaljer kan du nu:
- ✅ **Välja färg** för rumsfyllningen med färgväljare
- ✅ **Automatisk kantfärg** - mörkare version av vald färg (70% mörkare)
- ✅ **Live preview** - se båda färgerna innan du sparar
- ✅ **Spara till databas** - färgen sparas permanent
- ✅ **Direkt uppdatering** - rummet på canvas uppdateras omedelbart

---

## 🎨 VISUELL DESIGN

### **Färgschema:**
```
Rumsfyllning (Fill):
- Vald färg med 20% opacity (transparent)
- rgba(R, G, B, 0.2)
- T.ex: Blå = rgba(59, 130, 246, 0.2)

Rumskantlinje (Stroke):
- 70% mörkare än fyllningsfärg
- 80% opacity
- rgba(R*0.7, G*0.7, B*0.7, 0.8)
- T.ex: Blå kant = rgba(41, 91, 172, 0.8)
```

### **Exempel:**
```
Vald färg: #3b82f6 (Blå)
→ Fyllning: rgba(59, 130, 246, 0.2)   [Ljusblå, transparent]
→ Kantlinje: rgba(41, 91, 172, 0.8)    [Mörkare blå, solid]

Vald färg: #10b981 (Grön)
→ Fyllning: rgba(16, 185, 129, 0.2)   [Ljusgrön, transparent]
→ Kantlinje: rgba(11, 130, 90, 0.8)    [Mörkare grön, solid]

Vald färg: #f59e0b (Orange)
→ Fyllning: rgba(245, 158, 11, 0.2)   [Ljusorange, transparent]
→ Kantlinje: rgba(171, 111, 8, 0.8)    [Mörkare orange, solid]
```

---

## 🛠️ HUR DET FUNGERAR

### **Steg 1: Öppna Rumsdetaljer**
```
1. Dubbelklicka på ett rum på canvas
   ELLER
2. Klicka på rum i rumlistan och välj "Redigera"
   
✅ Rumsdetaljer-dialogen öppnas
```

### **Steg 2: Välj färg**
```
1. Hitta "Rumsfärg på ritning" sektionen
2. Klicka på färgväljaren (färgad ruta till vänster)
3. Välj önskad färg från färgpalett
   ✅ Live preview visas omedelbart:
      - Översta rutan = Fyllningsfärg
      - Understa rutan = Kantlinjefärg (mörkare)
```

### **Steg 3: Spara**
```
1. Klicka "Spara ändringar"
2. ✅ Toast: "Rum uppdaterat!"
3. ✅ Rummet på canvas uppdateras direkt med ny färg
4. ✅ Kantlinjen blir automatiskt mörkare
```

---

## 🧪 TESTA NU

### **Test 1: Ändra färg på ett rum**
```
1. Dubbelklicka på ett rum
2. Klicka på färgväljaren
3. Välj en ny färg (t.ex. grön)
   ✅ Live preview visar:
      - Ljusgrön fyllning
      - Mörkgrön kantlinje
4. Klicka "Spara ändringar"
5. ✅ Rummet på canvas blir grönt!
```

### **Test 2: Olika färger för olika rum**
```
1. Kök → Orange (#f59e0b)
2. Sovrum → Blå (#3b82f6)
3. Badrum → Ljusblå (#06b6d4)
4. Vardagsrum → Grön (#10b981)
   
✅ Varje rum har sin egen färg
✅ Lätt att se skillnad på rummen
```

### **Test 3: Mörkare kantlinje**
```
1. Välj ljus färg (t.ex. gul #fbbf24)
2. Se preview:
   - Fyllning: Ljusgul, transparent
   - Kantlinje: Mörkare gul, solid
3. Spara
   ✅ Kantlinjen är tydligt mörkare än fyllningen
   ✅ God kontrast och läsbarhet
```

---

## 🔧 TEKNISK IMPLEMENTATION

### **1. RoomDetailDialog - Färgväljare UI**

```typescript
// State för färg
const [color, setColor] = useState("rgba(59, 130, 246, 0.2)");

// Load från databas
useEffect(() => {
  if (room) {
    setColor(room.color || "rgba(59, 130, 246, 0.2)");
  }
}, [room]);

// Konvertera hex till rgba
const hexToRgba = (hex: string, alpha: number = 0.2): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
};

// Skapa mörkare kantfärg
const getDarkerColor = (rgbaColor: string): string => {
  const match = rgbaColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    const r = Math.floor(parseInt(match[1]) * 0.7);  // 70% mörkare
    const g = Math.floor(parseInt(match[2]) * 0.7);
    const b = Math.floor(parseInt(match[3]) * 0.7);
    return `rgba(${r}, ${g}, ${b}, 0.8)`;  // 80% opacity
  }
  return rgbaColor;
};
```

### **2. Färgväljare UI**

```tsx
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Palette className="h-4 w-4 text-gray-600" />
    <Label htmlFor="room-color">Rumsfärg på ritning</Label>
  </div>
  
  <div className="flex gap-3 items-center">
    {/* Color picker input */}
    <Input
      type="color"
      value={color.startsWith('#') ? color : '#3b82f6'}
      onChange={(e) => setColor(hexToRgba(e.target.value, 0.2))}
      className="w-20 h-10 cursor-pointer"
    />
    
    {/* Live preview */}
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded border-2"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm">Fyllning</span>
      </div>
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded border-2"
          style={{ backgroundColor: getDarkerColor(color) }}
        />
        <span className="text-sm">Kantlinje (mörkare)</span>
      </div>
    </div>
  </div>
</div>
```

### **3. Spara till databas**

```typescript
const handleSave = async () => {
  // Update rooms table
  await supabase
    .from("rooms")
    .update({
      name: name.trim(),
      description: description.trim() || null,
      color: color,  // ← Ny färg
    })
    .eq("id", room.id);

  // Update floor_map_shapes table (canvas shape)
  await supabase
    .from("floor_map_shapes")
    .update({
      color: color,
      stroke_color: getDarkerColor(color),  // ← Mörkare kantfärg
    })
    .eq("room_id", room.id);
};
```

### **4. RoomShape - Rendering på canvas**

```typescript
<Line
  points={flatPoints}
  closed
  fill={shape.color || 'rgba(59, 130, 246, 0.2)'}
  stroke={isSelected 
    ? '#3b82f6'  // Blå när markerat
    : (shape.strokeColor || 'rgba(41, 91, 172, 0.8)')  // Mörkare när ej markerat
  }
  strokeWidth={isSelected ? 3 : 2}
/>
```

### **5. Ladda färg från databas**

```typescript
// I UnifiedKonvaCanvas.tsx
const { data: rooms } = await supabase
  .from('rooms')
  .select('id, name, color')  // ← Ladda färg
  .in('id', roomIds);

const shapesWithRoomData = loadedShapes.map(shape => {
  if (shape.type === 'room' && shape.roomId) {
    const room = rooms.find(r => r.id === shape.roomId);
    if (room) {
      return {
        ...shape,
        name: room.name,
        color: room.color || 'rgba(59, 130, 246, 0.2)',
        strokeColor: getDarkerColor(room.color)  // Beräkna kantfärg
      };
    }
  }
  return shape;
});
```

---

## 💾 DATABAS SCHEMA

### **SQL Migration:**
```sql
-- Add color column to rooms table
ALTER TABLE rooms ADD COLUMN color TEXT DEFAULT 'rgba(59, 130, 246, 0.2)';
COMMENT ON COLUMN rooms.color IS 'RGBA color string for room fill on canvas';

-- Add color columns to floor_map_shapes table
ALTER TABLE floor_map_shapes ADD COLUMN color TEXT;
ALTER TABLE floor_map_shapes ADD COLUMN stroke_color TEXT;

COMMENT ON COLUMN floor_map_shapes.color IS 'Fill color for shapes on canvas';
COMMENT ON COLUMN floor_map_shapes.stroke_color IS 'Stroke/border color for shapes';
```

### **Kör migration:**
```bash
# Via Supabase SQL Editor
# Klistra in innehållet från supabase/add_room_color.sql
# Eller via CLI:
supabase db push
```

---

## 🎨 ANVÄNDNINGSFALL

### **1. Funktionell kategorisering**
```
Våtutrymmen → Blå:
- Badrum: #06b6d4 (Cyan)
- Toalett: #3b82f6 (Blå)
- Tvättstuga: #0ea5e9 (Ljusblå)

Sovrum → Lila/Rosa:
- Sovrum 1: #a855f7 (Lila)
- Sovrum 2: #ec4899 (Rosa)
- Gästrum: #d946ef (Magenta)

Gemensamma utrymmen → Grön:
- Vardagsrum: #10b981 (Grön)
- Kök: #84cc16 (Lime)
- Matsal: #22c55e (Ljusgrön)

Arbetsområden → Orange:
- Kontor: #f59e0b (Orange)
- Hobbyrum: #fb923c (Ljusorange)
```

### **2. Prioritetsnivåer**
```
Hög prioritet renovering → Röd:
- Badrum att renovera: #ef4444 (Röd)

Medium prioritet → Gul:
- Kök att uppdatera: #fbbf24 (Gul)

Låg prioritet → Grön:
- Vardagsrum OK: #10b981 (Grön)

Klart renoverade → Blå:
- Sovrum klart: #3b82f6 (Blå)
```

### **3. Visuell zoning**
```
Privata zoner → Mörka toner:
- Sovrum: #6366f1 (Indigo)
- Badrum: #8b5cf6 (Lila)

Sociala zoner → Ljusa toner:
- Vardagsrum: #10b981 (Grön)
- Kök: #f59e0b (Orange)

Tekniska utrymmen → Neutrala:
- Förråd: #64748b (Grå)
- Teknikrum: #475569 (Mörkgrå)
```

---

## 💡 TIPS & TRICKS

### **Färgharmoni:**
```
Använd färgscheman:
- Komplementära färger (motsatta på färghjulet)
- Analoga färger (närliggande på färghjulet)
- Triadiska färger (tre jämnt fördelade)
- Monokromatisk (olika nyanser av samma färg)
```

### **Tillgänglighet:**
```
Se till att:
- Kantlinjen är mörkare än fyllningen (redan implementerat)
- Använd tillräcklig kontrast mot bakgrund
- Undvik endast färgkodning (lägg till text/ikoner)
- Testa färgblindhetsvänlighet
```

### **Professionell look:**
```
Standard färgpalett:
- Blå (#3b82f6): Våtutrymmen
- Grön (#10b981): Gemensamma utrymmen
- Orange (#f59e0b): Kök/matsal
- Lila (#a855f7): Sovrum
- Grå (#64748b): Förråd/teknik
```

---

## 🐛 FELSÖKNING

### **Problem: Färg sparas inte**
```
Lösning:
1. Kontrollera att databas-migrationen är körd
2. Se console för fel-meddelanden
3. Verifiera RLS-policies för rooms och floor_map_shapes
```

### **Problem: Kantlinje för ljus/mörk**
```
Lösning:
Justera getDarkerColor() funktionen:
- För ljusare kantlinje: * 0.8 istället för * 0.7
- För mörkare kantlinje: * 0.6 istället för * 0.7
```

### **Problem: Färg visas inte på canvas**
```
Lösning:
1. Hard refresh (Cmd+Shift+R)
2. Kontrollera att shape.color laddas från databas
3. Se console.log för loaded shapes
4. Verifiera loadShapesForPlan() mappning
```

---

## 📊 SAMMANFATTNING

**Implementerat:**
- ✅ Färgväljare i RoomDetailDialog
- ✅ Live preview av fyllning och kantlinje
- ✅ Automatisk mörkare kantlinje (70% mörkare)
- ✅ Spara till både rooms och floor_map_shapes
- ✅ Ladda färg från databas
- ✅ Direkt uppdatering på canvas
- ✅ Databas-migration (add_room_color.sql)

**Användarflöde:**
1. Dubbelklicka på rum
2. Välj färg med färgväljare
3. Se live preview
4. Spara
5. **Rummet uppdateras direkt! 🎨**

**Fördelar:**
- 🎨 Visuell kategorisering av rum
- 📊 Bättre översikt över projekt
- 🏗️ Funktionell gruppering
- ⚡ Snabb identifiering
- ✅ Professionell presentation

**Tekniska detaljer:**
- Färg: rgba(R, G, B, 0.2) - 20% opacity
- Kantlinje: rgba(R*0.7, G*0.7, B*0.7, 0.8) - 70% mörkare, 80% opacity
- Sparas i: rooms.color och floor_map_shapes.color/stroke_color

**Dokumentation:**
- ✅ `ROOM_COLOR_CUSTOMIZATION.md` - Fullständig guide
- ✅ `supabase/add_room_color.sql` - Databas-migration

**Testa genom att:**
1. Öppna Rumsdetaljer
2. Hitta "Rumsfärg på ritning"
3. Välj en färg
4. Se live preview
5. Spara
6. **Rummet får ny färg på canvas! 🌈**
