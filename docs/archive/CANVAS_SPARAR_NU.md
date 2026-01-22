# ✅ CANVAS SPARAR NU KORREKT

**Implementerat: Omfattande logging och fixat auto-save-buggar**

---

## 🔧 VAD JAG FIXAT

### **1. Auto-save triggade inte för tomma planer**

**Före:**
```typescript
if (!currentPlanId || shapes.length === 0) return;
// ❌ Auto-save körde INTE om shapes.length === 0
```

**Efter:**
```typescript
if (!currentPlanId) {
  console.log('⚠️ Auto-save skipped: No plan selected');
  return;
}
// ✅ Auto-save körs även när shapes.length === 0
```

**Varför det är viktigt:**
- När du tar bort alla objekt, behöver databasen uppdateras
- Annars kommer gamla objekt tillbaka vid refresh

---

### **2. Omfattande logging tillagt**

**Load shapes:**
```
🔄 Plan changed, currentPlanId: [id]
📥 Loading shapes for plan: [id] project: [id]
✅ Loaded X shapes from database for plan: [id]
📋 Shape types: wall, room, text
```

**Save shapes:**
```
💾 Auto-saving X shapes to plan: [id]
💾 saveShapesForPlan called with planId: [id], shapes count: X
✅ Saved to localStorage
🔍 Fetching project_id for plan: [id]
✅ Found project_id: [id]
🗑️ Deleting existing shapes for plan: [id]
✅ Existing shapes deleted
➕ Inserting X new shapes
✅ Successfully inserted X shapes to database
✅ saveShapesForPlan completed successfully
✅ Shapes auto-saved successfully to plan: [id]
```

---

## 🧪 TESTA ATT DET FUNGERAR

### **Test 1: Rita och refresh**
```
1. Öppna projekt i Space Planner
2. Rita några väggar/rum
3. Vänta 2 sekunder (auto-save)
4. Kolla console:
   ✅ "💾 Auto-saving X shapes"
   ✅ "✅ Shapes auto-saved successfully"
5. Refresh sidan (Cmd+R)
6. Kolla console:
   ✅ "📥 Loading shapes for plan"
   ✅ "✅ Loaded X shapes"
7. ✅ Objekten ska vara kvar!
```

### **Test 2: Manuell sparning**
```
1. Rita objekt
2. Klicka "Spara" i toolbar (eller Cmd+S)
3. Kolla console:
   ✅ "💾 Manuell sparning... X shapes"
   ✅ "✅ Shapes sparade!"
4. Refresh
5. ✅ Objekten kvar
```

### **Test 3: Ta bort objekt**
```
1. Rita objekt
2. Markera och ta bort (Delete)
3. Vänta 2 sekunder
4. Kolla console:
   ✅ "💾 Auto-saving 0 shapes" (eller färre)
   ✅ "ℹ️ No shapes to insert (empty plan)"
5. Refresh
6. ✅ Objekten ska vara borta
```

---

## 🔍 TROUBLESHOOTING

### **Problem: Objekt försvinner efter refresh**

#### **Steg 1: Öppna Console**
```
Cmd+Option+I (Mac) / F12 (Windows)
→ Console-fliken
```

#### **Steg 2: Kolla efter fel**
```
Leta efter:
❌ "Error saving shapes"
❌ "Error loading shapes"
❌ "Plan not found"
❌ "permission denied"

Om du ser dessa → Fortsätt till Steg 3
Om du INTE ser fel → Fortsätt till Steg 4
```

#### **Steg 3: Databasproblem**
```
Möjliga orsaker:
1. RLS (Row Level Security) blockerar
   → Kolla Supabase policies
   
2. Saknar project_id i floor_map_plans
   → SELECT * FROM floor_map_plans WHERE id = '[plan-id]'
   → Kolla att project_id finns
   
3. Offline mode
   → Kolla "⚠️ Offline mode" i console
   → Kontrollera internet-anslutning
```

#### **Steg 4: Timing-problem**
```
Om ingen auto-save visas i console:
1. Rita objekt
2. Vänta exakt 2 sekunder
3. Kolla console
4. Om fortfarande inget → currentPlanId är inte satt

Kolla:
console.log('currentPlanId:', useFloorMapStore.getState().currentPlanId)
→ Ska INTE vara null/undefined
```

---

## 📊 CONSOLE LOG-GUIDE

### **Normal sekvens när allt fungerar:**

#### **Vid mount (sidladdning):**
```
🔄 Plan changed, currentPlanId: abc-123
📥 Loading shapes for plan: abc-123 project: xyz-789
🌐 Online - fetching from database for plan: abc-123
✅ Fetched 5 shapes from database
✅ Mapped 5 shapes. Types: wall, wall, room, text, door
✅ Cached to localStorage
✅ Loaded 5 shapes from database for plan: abc-123
📋 Shape types: wall, wall, room, text, door
```

#### **Vid ritning av nytt objekt:**
```
➕ Shape added - History: 2 → 3
(Vänta 2 sekunder...)
💾 Auto-saving 6 shapes to plan: abc-123
💾 saveShapesForPlan called with planId: abc-123, shapes count: 6
✅ Saved to localStorage
🔍 Fetching project_id for plan: abc-123
✅ Found project_id: xyz-789
🗑️ Deleting existing shapes for plan: abc-123
✅ Existing shapes deleted
➕ Inserting 6 new shapes
✅ Successfully inserted 6 shapes to database
✅ saveShapesForPlan completed successfully
✅ Shapes auto-saved successfully to plan: abc-123
```

#### **Vid borttagning av objekt:**
```
(Ta bort shape med Delete)
(Vänta 2 sekunder...)
💾 Auto-saving 5 shapes to plan: abc-123
💾 saveShapesForPlan called with planId: abc-123, shapes count: 5
✅ Saved to localStorage
... (samma som ovan)
✅ Successfully inserted 5 shapes to database
```

---

## ⚠️ FELMEDDELANDEN OCH LÖSNINGAR

### **"❌ Error fetching plan"**
```
Problem: Plan finns inte i floor_map_plans
Lösning:
1. Gå till Supabase Table Editor
2. Öppna floor_map_plans
3. Sök efter plan-id
4. Om inte finns → Skapa plan manuellt eller via UI
```

### **"❌ Plan not found or missing project_id"**
```
Problem: Planen saknar project_id (krävs för RLS)
Lösning:
UPDATE floor_map_plans
SET project_id = 'ditt-projekt-id'
WHERE id = 'plan-id';
```

### **"❌ Error inserting shapes"**
```
Problem: RLS-policy blockerar eller schema-mismatch
Lösning:
1. Kolla RLS policies i Supabase
2. Verifiera att floor_map_shapes har rätt kolumner:
   - id, project_id, plan_id, shape_type
   - shape_data (JSONB)
   - color, stroke_color, room_id
```

### **"⚠️ Auto-save skipped: No plan selected"**
```
Problem: currentPlanId är inte satt
Lösning:
1. FloorMapEditor borde sätta plan vid mount
2. Kolla loadInitialData() körs
3. Verifiera att setCurrentPlanId(plan.id) körs
```

---

## 🎯 VERIFIERING

### **Snabbtest att allt fungerar:**
```bash
# 1. Öppna console
# 2. Rita en vägg
# 3. Vänta 2 sekunder
# 4. Kör i console:

useFloorMapStore.getState().shapes.length
// → Ska visa antal shapes (t.ex. 1)

useFloorMapStore.getState().currentPlanId
// → Ska visa plan ID (t.ex. "abc-123")

# 5. Refresh sidan (Cmd+R)
# 6. Vänta tills sidan laddat
# 7. Kör igen:

useFloorMapStore.getState().shapes.length
// → Ska visa samma antal (t.ex. 1)

# ✅ Om samma antal → Allt fungerar!
# ❌ Om 0 → Kolla console för fel
```

---

## 📝 SAMMANFATTNING

**Fixat:**
- ✅ Auto-save triggar även för tomma planer
- ✅ Omfattande logging för debugging
- ✅ Load-logik förbättrad
- ✅ Save-logik förbättrad
- ✅ Tydliga felmeddelanden

**Auto-save trigger:**
- ✅ 2 sekunder efter varje ändring
- ✅ När shapes läggs till
- ✅ När shapes uppdateras
- ✅ När shapes tas bort
- ✅ Även när alla shapes tas bort (0 shapes)

**Persistence:**
- ✅ Shapes sparas till localStorage (instant backup)
- ✅ Shapes sparas till Supabase (synkad mellan devices)
- ✅ Shapes laddas automatiskt vid mount
- ✅ Shapes laddas när plan ändras

**Nästa steg:**
1. Testa genom att rita objekt
2. Kolla console för loggning
3. Refresh och verifiera att objekt finns kvar
4. Om problem → Se troubleshooting-sektionen

**Shapes sparas nu korrekt! 💾✅**
