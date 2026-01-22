# 📊 SQL Migration Audit - Fullständig översikt

Detta dokument visar ALLA SQL-filer i projektet och vilka som är inkluderade i huvudmigrationen.

## ✅ VIKTIGASTE FILEN (KÖR DENNA!)

**`supabase/COMPLETE_DATABASE_UPDATE_2026.sql`**
- Detta är den enda filen du behöver köra
- Innehåller alla nödvändiga migrationer
- Idempotent (säker att köra flera gånger)
- Inkluderar verifiering och output

---

## 📁 Migrationer inkluderade i huvudfilen

Följande funktionalitet är inkluderad i `COMPLETE_DATABASE_UPDATE_2026.sql`:

### 1. ✅ Templates System
- **Källa:** `create_templates_table.sql` + `fix_templates_project_id.sql`
- **Status:** Inkluderad ✅
- **Vad det gör:** Skapar templates-tabellen för återanvändbara objektmallar

### 2. ✅ Room Material & Färger
- **Källa:** `add_room_material_fields.sql`, `add_room_color.sql`
- **Status:** Inkluderad ✅
- **Vad det gör:** Lägger till material, wall_color, ceiling_color, trim_color

### 3. ✅ Storage Bucket
- **Källa:** `create_comment_images_storage.sql`, `create_room_photos_storage.sql`
- **Status:** Inkluderad ✅
- **Vad det gör:** Skapar project-files bucket för bilder och PDF:er

### 4. ✅ Purchase Orders - Betald status
- **Källa:** `add_paid_status_purchase_orders.sql`
- **Status:** Inkluderad ✅
- **Vad det gör:** Lägger till `paid` boolean kolumn

### 5. ✅ Purchase Orders - Pris per enhet
- **Källa:** `add_price_per_unit_and_total.sql`
- **Status:** Inkluderad ✅
- **Vad det gör:** Lägger till `price_per_unit` och `total_price`

### 6. ✅ Purchase Orders - Assigned To
- **Källa:** `add_assigned_to_purchase_orders.sql`
- **Status:** Inkluderad ✅
- **Vad det gör:** Lägger till `assigned_to` för att tilldela beställningar

### 7. ✅ Materials - Description
- **Källa:** `add_description_to_materials_safe.sql`
- **Status:** Inkluderad ✅
- **Vad det gör:** Lägger till beskrivningsfält för material

### 8. ✅ Floor Map Shapes - Notes
- **Källa:** `add_notes_to_shapes_info.sql`
- **Status:** Inkluderad ✅
- **Vad det gör:** Lägger till anteckningar på canvas-objekt

---

## 📂 SQL-filer som INTE behöver köras

Dessa filer är antingen:
- ✅ Redan inkluderade i huvudfilen
- 🔧 Fix-scripts för specifika problem (redan lösta)
- 📦 Del av automatiska migrationer (i `migrations/`)

### Fix & Verification Scripts (Behöver inte köras manuellt)

| Fil | Status | Kommentar |
|-----|--------|-----------|
| `check_and_fix_floor_map_shapes.sql` | 🔧 Fix | För att kontrollera/fixa floor map shapes |
| `fix_template_permissions.sql` | ✅ Inkluderad | RLS policies för templates |
| `verify_floor_map_tables.sql` | 🔍 Verify | Verifieringsskript (kör vid behov) |
| `fix_projects_rls_select.sql` | 🔧 Fix | RLS för projects (kör vid RLS-problem) |
| `fix_floor_map_shapes_rls.sql` | 🔧 Fix | RLS för floor map shapes |
| `fix_rooms_rls.sql` | 🔧 Fix | RLS för rooms |
| `fix_materials_rls.sql` | 🔧 Fix | RLS för materials |
| `fix_materials_rls_assigned.sql` | 🔧 Fix | RLS för tilldelade material |
| `fix_materials_rls_owner.sql` | 🔧 Fix | RLS för material-ägare |
| `fix_materials_status.sql` | 🔧 Fix | Material status-fält |
| `fix_materials_status_values.sql` | 🔧 Fix | Material status-värden |
| `fix_materials_task_id.sql` | 🔧 Fix | Material task_id foreign key |
| `fix_project_invitations_columns.sql` | 🔧 Fix | Project invitations kolumner |
| `fix_project_invitations_rls.sql` | 🔧 Fix | Project invitations RLS |
| `fix_task_assignment_constraint.sql` | 🔧 Fix | Task assignment constraints |
| `fix_task_assignment_foreign_key.sql` | 🔧 Fix | Task assignment foreign keys |
| `fix_todo_status.sql` | 🔧 Fix | Todo status-fält |
| `fix_todo_status_v2.sql` | 🔧 Fix | Todo status v2 |
| `fix_todo_status_v3.sql` | 🔧 Fix | Todo status v3 |
| `update_materials_rls_for_own_edits.sql` | 🔧 Fix | Materials RLS för egna ändringar |
| `update_purchase_orders_permissions.sql` | 🔧 Fix | Purchase orders permissions |
| `update_rooms_schema.sql` | ✅ Inkluderad | Rooms schema-uppdateringar |
| `remove_materials_status_constraint.sql` | 🔧 Fix | Ta bort materials status constraint |
| `force_fix_materials_status.sql` | 🔧 Fix | Tvinga fix av materials status |

### Comments & Storage (Inkluderade i huvudfilen)

| Fil | Status | Kommentar |
|-----|--------|-----------|
| `create_comments_system.sql` | ✅ Inkluderad | Comments-system |
| `add_drawing_object_comments.sql` | ✅ Inkluderad | Kommentarer på ritningsobjekt |

### Stakeholders & Teams (Äldre versioner)

| Fil | Status | Kommentar |
|-----|--------|-----------|
| `create_stakeholders.sql` | 🗂️ Gammal | Ersatt av team_members |
| `create_stakeholders_fixed.sql` | 🗂️ Gammal | Ersatt av team_members |
| `create_stakeholders_safe.sql` | 🗂️ Gammal | Ersatt av team_members |
| `migrate_stakeholders_to_team_members.sql` | 📦 Migration | Kör om du har gammal stakeholders-data |

### Granular Permissions

| Fil | Status | Kommentar |
|-----|--------|-----------|
| `add_granular_permissions.sql` | 🔧 Fix | Kör vid behov för finkorniga permissions |
| `add_teams_access_permission.sql` | 🔧 Fix | Teams access permissions |

### Budget Features

| Fil | Status | Kommentar |
|-----|--------|-----------|
| `add_exclude_from_budget.sql` | ✅ Inkluderad | Exclude from budget-funktionalitet |
| `add_multiple_cost_centers.sql` | 🔧 Fix | Flera kostnadställen (kör vid behov) |

### Complete Schema Files (Använd endast vid ny setup)

| Fil | Status | Kommentar |
|-----|--------|-----------|
| `complete_schema.sql` | 🏗️ Initial | För ny databas-setup |
| `complete_schema_fixed.sql` | 🏗️ Initial | För ny databas-setup (fixad) |
| `MEGA_FIX_ALL_COLUMNS.sql` | 🔧 Emergency | Kör endast vid stora databasproblems |
| `schema.sql` | 🏗️ Initial | Supabase-genererad schema |

### Consolidated Migration Files (Äldre versioner)

| Fil | Status | Kommentar |
|-----|--------|-----------|
| `RUN_ALL_PENDING_MIGRATIONS.sql` | 🗂️ Gammal | Ersatt av COMPLETE_DATABASE_UPDATE_2026.sql |

---

## 🗂️ Migrations-mappen (`supabase/migrations/`)

Dessa filer körs automatiskt av Supabase CLI när du gör `supabase db push`. De behöver INTE köras manuellt.

**22 migrations-filer** från november 2025:
- Dessa är redan körda i din databas
- De skapades under initial setup
- Inkluderar grundläggande schema för projects, tasks, materials, etc.

---

## 🎯 Sammanfattning - Vad ska du göra?

### ✅ KÖR DETTA:

1. **`supabase/COMPLETE_DATABASE_UPDATE_2026.sql`**
   - Enda filen du behöver köra manuellt
   - Innehåller ALLT du behöver för produktion

### 🔧 KÖR VID BEHOV (om du stöter på specifika problem):

- `fix_materials_rls.sql` - Om material inte sparas
- `fix_projects_rls_select.sql` - Om projekt inte visas
- `fix_rooms_rls.sql` - Om rum inte sparas
- `MEGA_FIX_ALL_COLUMNS.sql` - Vid stora databasproblems (använd med försiktighet!)

### ❌ KÖR INTE:

- Filer i `migrations/` - Hanteras automatiskt av Supabase
- `complete_schema.sql` - Endast för ny databas
- Äldre versioner av fix-scripts (v1, v2, v3)

---

## 🔍 Hur verifiera att allt är korrekt?

Kör dessa queries i Supabase SQL Editor för att kontrollera:

### 1. Kontrollera Templates-tabellen
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'templates'
ORDER BY ordinal_position;
```

✅ Förväntat resultat: 11 kolumner inklusive `project_id` (nullable)

### 2. Kontrollera Room-kolumner
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rooms'
AND column_name IN ('material', 'wall_color', 'ceiling_color', 'trim_color');
```

✅ Förväntat resultat: 4 rader

### 3. Kontrollera Storage Bucket
```sql
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'project-files';
```

✅ Förväntat resultat: 1 rad med public=true

### 4. Kontrollera Purchase Orders kolumner
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'purchase_orders'
AND column_name IN ('paid', 'price_per_unit', 'total_price', 'assigned_to');
```

✅ Förväntat resultat: 4 rader

---

## 📈 Produktionsklara funktioner efter migration

Efter att ha kört `COMPLETE_DATABASE_UPDATE_2026.sql` har du:

- ✅ **Templates-system** - Spara och återanvänd canvas-objekt
- ✅ **Rum material & färger** - Komplett färgsättning och material
- ✅ **Bilduppladdning** - Kommentarer och rum-foton
- ✅ **Purchase Orders** - Betald status, priser, tilldelning
- ✅ **Material management** - Beskrivningar och statuses
- ✅ **Canvas notes** - Anteckningar på ritningsobjekt
- ✅ **RLS Security** - Alla tabeller är säkrade
- ✅ **Performance** - Optimerade index

---

## 🚀 Production Deployment Checklist

Innan du går live:

- [ ] Kör `COMPLETE_DATABASE_UPDATE_2026.sql` i produktion
- [ ] Verifiera alla tabeller med SQL-queries ovan
- [ ] Testa kritiska funktioner (templates, rum, beställningar)
- [ ] Kontrollera RLS policies fungerar
- [ ] Sätt upp monitoring i Supabase Dashboard
- [ ] Verifiera backups är aktiverade
- [ ] Dokumentera custom SQL-ändringar
- [ ] Ha en rollback-plan klar

---

**Senast uppdaterad:** 2026-01-22
**Version:** 1.0
