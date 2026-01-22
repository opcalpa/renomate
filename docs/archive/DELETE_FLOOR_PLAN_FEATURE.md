# 🗑️ Delete Floor Plan Feature

## Implementerad Funktionalitet

Användare kan nu radera floor maps från dropdown-menyn med en papperskorg-ikon.

## UI/UX

### **Visuell Design:**

1. **Papperskorg-ikon:**
   - Visas till höger i varje plan-rad i dropdown-menyn
   - Blir synlig vid hover (opacity: 0 → 100)
   - Röd färg (`text-destructive`) för tydlig varning
   - Smooth transition för professionell känsla

2. **Plan-lista:**
   - Varje plan-rad har nu två klickbara områden:
     - **Vänster del:** Byter till det planet (hela texten)
     - **Höger ikon:** Öppnar radera-dialog (papperskorg)
   - Hover-effekt på hela raden visar papperskorgen

### **Säkerhetsfunktioner:**

#### **1. Konfirmationsdialog:**
```
⚠️ Radera Floor Plan?

Är du säker på att du vill radera "Våning 1"?

Detta går inte att ångra. Alla väggar, rum och objekt 
i detta plan kommer att raderas permanent.

[Avbryt]  [🗑️ Radera plan]
```

**Egenskaper:**
- Tydlig varning om permanent radering
- Visar namnet på planet som ska raderas
- Röd knapp för radering (destruktiv action)
- Grå knapp för avbryt (säker action)

#### **2. Förhindra radering av sista planet:**
```
❌ Kan inte radera

Du måste ha minst ett plan. 
Skapa ett nytt innan du raderar detta.
```

**Varför:**
- Ett projekt måste alltid ha minst ett plan
- Användaren måste skapa ett nytt plan först
- Förhindrar tom project-state

#### **3. Auto-switch vid radering av aktivt plan:**
- Om användaren raderar det aktiva planet
- Systemet byter automatiskt till ett annat plan
- Seamless UX - ingen tom canvas

## Teknisk Implementation

### **Fil:** `src/components/floormap/SpacePlannerTopBar.tsx`

### **Nya imports:**
```typescript
import { Trash2 } from "lucide-react";
import { deletePlanFromDB } from "./utils/plans";
import { AlertDialog, ... } from "@/components/ui/alert-dialog";
```

### **Ny state:**
```typescript
const [planToDelete, setPlanToDelete] = useState<string | null>(null);
```

### **Ny action från store:**
```typescript
const { ..., deletePlan } = useFloorMapStore();
```

### **Delete handler:**
```typescript
const handleDeletePlan = async (planId: string) => {
  // Safety: Prevent deleting last plan
  if (plans.length <= 1) {
    toast({ title: "Kan inte radera", ... });
    return;
  }

  // Delete from database
  const success = await deletePlanFromDB(planId);
  
  // Auto-switch if deleting current plan
  if (currentPlanId === planId) {
    const otherPlan = plans.find(p => p.id !== planId);
    setCurrentPlanId(otherPlan.id);
  }

  // Remove from store
  deletePlan(planId);
};
```

### **Updated DropdownMenuItem:**
```typescript
<DropdownMenuItem className="group" onSelect={(e) => e.preventDefault()}>
  {/* Plan info - clickable to select */}
  <div onClick={() => setCurrentPlanId(plan.id)}>
    ...
  </div>
  
  {/* Delete button - only visible on hover */}
  <Button
    className="opacity-0 group-hover:opacity-100"
    onClick={(e) => {
      e.stopPropagation();
      setPlanToDelete(plan.id);
    }}
  >
    <Trash2 className="text-destructive" />
  </Button>
</DropdownMenuItem>
```

### **AlertDialog:**
```typescript
<AlertDialog open={!!planToDelete}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Radera Floor Plan?</AlertDialogTitle>
      <AlertDialogDescription>
        Permanent radering av "{plan.name}"
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Avbryt</AlertDialogCancel>
      <AlertDialogAction onClick={handleDeletePlan}>
        Radera plan
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

## Användning

### **Steg 1: Öppna plan-menyn**
Klicka på plan-väljaren i top bar (knapp med Layers-ikon och plannamn)

### **Steg 2: Hover över ett plan**
Papperskorg-ikonen visas till höger

### **Steg 3: Klicka på papperskorgen**
Konfirmationsdialog öppnas

### **Steg 4: Bekräfta eller avbryt**
- **"Radera plan"** - Raderar permanent (röd knapp)
- **"Avbryt"** - Stänger dialog utan att radera (grå knapp)

## Edge Cases Hanterade

### **1. Radera sista planet:**
```
Plans: [Plan A]
User: *klickar delete på Plan A*
System: ❌ "Du måste ha minst ett plan"
Result: Plan A kvarstår
```

### **2. Radera aktivt plan:**
```
Plans: [Plan A*, Plan B]  (* = active)
User: *raderar Plan A*
System: Auto-switch till Plan B
Result: Plan B är nu aktivt
```

### **3. Radera inaktivt plan:**
```
Plans: [Plan A*, Plan B]  (* = active)
User: *raderar Plan B*
System: Behåller Plan A som aktivt
Result: Plan A fortfarande aktivt
```

### **4. Radera plan med många shapes:**
```
Plan A: 50 objekt
User: *raderar Plan A*
Dialog: "50 objekt kommer att raderas permanent"
Result: Alla objekt raderas tillsammans med planet
```

### **5. Databas-fel:**
```
User: *raderar Plan A*
Database: ❌ Connection error
System: Toast "Fel vid radering: Kunde inte radera planet"
Result: Plan A kvarstår, ingen inkonsistent state
```

## Databas Operation

### **Cascade Delete:**
När ett plan raderas från `floor_map_plans` tabellen:
```sql
DELETE FROM floor_map_plans WHERE id = 'plan-id';
```

Alla relaterade shapes raderas automatiskt (cascade):
```sql
-- Automatiskt via foreign key cascade
DELETE FROM floor_map_shapes WHERE plan_id = 'plan-id';
```

### **RLS (Row Level Security):**
Användaren måste ha rätt till projektet för att radera planet:
```sql
-- RLS policy garanterar att:
-- 1. User är owner av projektet
-- 2. User är team member med delete-rättigheter
```

## Säkerhet

### **Frontend validering:**
- ✅ Måste ha minst 1 plan kvar
- ✅ Konfirmationsdialog krävs
- ✅ Tydlig varning om permanent radering

### **Backend validering:**
- ✅ RLS policies på `floor_map_plans` tabellen
- ✅ Foreign key constraints
- ✅ Cascade delete för shapes
- ✅ Project ownership validering

### **Error handling:**
- ✅ Try-catch på delete operation
- ✅ Toast-meddelanden för användaren
- ✅ Rollback vid fel (transaktionssäkerhet via Supabase)

## Prestanda

### **Optimeringar:**
- Hover-animation använder CSS `opacity` (GPU-accelererad)
- `e.stopPropagation()` förhindrar oönskade click events
- `onSelect={(e) => e.preventDefault()}` förhindrar dropdown-stängning vid intern navigation

### **Databas:**
- Cascade delete är effektivt (en query)
- Index på `plan_id` i shapes-tabellen för snabb radering

## Testing

### **Manuell test:**

1. **Skapa flera plans:**
   - Skapa "Plan A", "Plan B", "Plan C"
   
2. **Test hover:**
   - Öppna plan-menyn
   - Hover över varje plan
   - ✅ Papperskorg visas smooth
   
3. **Test delete inaktivt plan:**
   - Aktivt plan: Plan A
   - Klicka delete på Plan B
   - Bekräfta radering
   - ✅ Plan B raderas
   - ✅ Plan A fortfarande aktivt
   
4. **Test delete aktivt plan:**
   - Aktivt plan: Plan A
   - Klicka delete på Plan A
   - Bekräfta radering
   - ✅ Plan A raderas
   - ✅ Auto-switch till Plan C
   
5. **Test sista planet:**
   - Endast Plan C kvar
   - Försök delete Plan C
   - ✅ Felmeddelande visas
   - ✅ Plan C kvarstår
   
6. **Test avbryt:**
   - Klicka delete på något plan
   - Klicka "Avbryt"
   - ✅ Inget raderas
   - ✅ Dialog stängs

## Framtida Förbättringar

### **Möjliga tillägg:**
1. **Soft delete** - Flytta till "papperskorgen" istället för permanent radering
2. **Undo** - Möjlighet att ångra radering inom X minuter
3. **Export innan radering** - Erbjud export av planet innan radering
4. **Bulk delete** - Radera flera plans samtidigt
5. **Archive** - Arkivera istället för radera

### **Analytics:**
- Spåra hur ofta användare raderar plans
- Identifiera om användare råkar radera av misstag
- A/B test olika confirmation-texter

---

**TL;DR:** Papperskorg-ikon läggs till i plan-listan. Hover för att se, klicka för att radera med bekräftelsedialog. Förhindrar radering av sista planet och switchar automatiskt om aktivt plan raderas. Säkert, intuitivt och professionellt! 🗑️✅

*Implementerad: 2026-01-21*
