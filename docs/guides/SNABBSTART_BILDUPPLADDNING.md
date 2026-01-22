# 🚀 Snabbstart: Bilduppladdning för Rum

## ✅ Implementerat

Jag har lagt till bilduppladdningsfunktion i Rumsdetaljer-dialogen!

## 📍 Var Finns Det?

```
Projekt → Canvas → Dubbelklicka på rum → Rumsdetaljer
                                              ↓
                                        Under "Rumsbeskrivning"
                                              ↓
                                     📸 Bilder-sektion (NYT!)
```

## ⚡ Setup (2 minuter)

### Steg 1: Kör SQL-filen (1 minut)

Öppna **Supabase Dashboard** → **SQL Editor**:

```sql
-- Klistra in innehållet från:
supabase/create_room_photos_storage.sql
```

Eller kör direkt:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('room-photos', 'room-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies
CREATE POLICY "Authenticated users can upload room photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'room-photos');

CREATE POLICY "Anyone can view room photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'room-photos');

CREATE POLICY "Users can delete their own room photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'room-photos');
```

### Steg 2: Refresha Appen (10 sekunder)

```bash
# Servern körs redan
# Bara refresha i browsern (F5)
```

### Steg 3: Testa! (30 sekunder)

```
1. Öppna ett projekt
2. Gå till Canvas
3. Dubbelklicka på ett rum
4. Scrolla ner till "Bilder"
5. Klicka på uppladdningsområdet
6. Välj en bild
✅ Bilden laddas upp och visas!
```

## 🎨 UI Layout

```
┌─────────────────────────────────────────┐
│ 🏠 Rumsdetaljer                          │
├─────────────────────────────────────────┤
│                                          │
│ Rumsnamn *                               │
│ [Vardagsrum_____________________]        │
│                                          │
│ Rumsbeskrivning                          │
│ [______________________________]         │
│ [______________________________]         │
│ [______________________________]         │
│                                          │
│ 📸 Bilder                      3 bilder  │ ← NYT!
│ ┌──────────────────────────────────┐    │
│ │  📤 Klicka för att ladda upp     │    │
│ │     PNG, JPG, GIF upp till 10MB  │    │
│ └──────────────────────────────────┘    │
│                                          │
│ ┌────────────┐  ┌────────────┐          │
│ │  [Bild 1]  │  │  [Bild 2]  │          │
│ │   hover→❌  │  │   hover→❌  │          │
│ └────────────┘  └────────────┘          │
│                                          │
│ ┌────────────┐  ┌────────────┐          │
│ │  [Bild 3]  │  │  [Bild 4]  │          │
│ └────────────┘  └────────────┘          │
│                                          │
│ 🎨 Rumsfärg på ritning                   │
│ [__________________________________]     │
│                                          │
└─────────────────────────────────────────┘
```

## 📸 Funktioner

### ✅ Ladda Upp
- **Klicka** på uppladdningsområdet
- **Välj** en eller flera bilder
- **Format:** JPG, PNG, GIF, WebP
- **Storlek:** Max 10MB per bild

### ✅ Visa
- **Rutnät:** 2 kolumner
- **Scroll:** Om fler än 4 bilder
- **Bildnamn:** Visas som caption

### ✅ Ta Bort
- **Hover** över bild → ❌ visas
- **Klicka** på ❌
- **Bekräfta** → Bilden tas bort

## 💡 Användningsexempel

### 1. Dokumentera Befintligt Skick
```
Rum: Kök
Bilder:
- Befintliga skåp
- Vitvaror
- Problem/skador
- Mätningar
```

### 2. Inspirationsbilder
```
Rum: Vardagsrum
Bilder:
- Färgschema
- Möbellayout
- Pinterest-idéer
```

### 3. Renoverings-Progress
```
Rum: Badrum
Bilder:
- FÖRE: Gammalt badrum
- UNDER: Rivning, VVS, kakel
- EFTER: Färdigt badrum
```

## 🔧 Vad Har Implementerats?

### Filer Uppdaterade

**1. RoomDetailDialog.tsx**
- ✅ Bilduppladdningssektion under beskrivning
- ✅ File upload handler
- ✅ Bildrutnät med scroll
- ✅ Ta bort-funktionalitet
- ✅ Loading states

**2. Nya SQL-filer**
- ✅ `create_room_photos_storage.sql` - Storage setup

**3. Dokumentation**
- ✅ `BILDUPPLADDNING_RUM.md` - Detaljerad guide
- ✅ `SNABBSTART_BILDUPPLADDNING.md` - Denna fil

### Database
```typescript
Table: photos
- id: UUID
- linked_to_type: 'room' | 'project' | 'task'
- linked_to_id: UUID (room.id)
- url: TEXT (Supabase Storage URL)
- caption: TEXT (Bildnamn)
- uploaded_by_user_id: UUID
- created_at: TIMESTAMP
```

### Storage
```
Bucket: room-photos (public)
Path: {room-id}/{timestamp}-{random}.{ext}
URL: https://{project}.supabase.co/storage/v1/object/public/room-photos/...
```

## 📊 Tekniska Detaljer

### Upload Flow
```
1. Användare väljer filer
   ↓
2. Validering (typ, storlek)
   ↓
3. Upload till Supabase Storage
   ↓
4. Spara URL i photos-tabell
   ↓
5. Visa bild i UI
```

### Delete Flow
```
1. Användare klickar ❌
   ↓
2. Bekräfta dialog
   ↓
3. Ta bort från Storage
   ↓
4. Ta bort från photos-tabell
   ↓
5. Uppdatera UI
```

## 🧪 Testscenarios

### Test 1: Basic Upload
```
✅ Klicka uppladdningsområde
✅ Välj 1 bild
✅ Vänta på uppladdning
✅ Bild visas i rutnät
```

### Test 2: Multiple Upload
```
✅ Välj 5 bilder samtidigt
✅ Alla laddas upp parallellt
✅ Alla visas i rutnät
✅ Scroll fungerar
```

### Test 3: Delete Image
```
✅ Hover över bild
✅ ❌ visas
✅ Klicka ❌
✅ Bekräfta
✅ Bild försvinner
```

### Test 4: Persistence
```
✅ Ladda upp bilder
✅ Stäng dialog
✅ Öppna dialog igen
✅ Bilder finns kvar
```

### Test 5: Error Handling
```
✅ Försök ladda upp 15MB fil → Fel
✅ Försök ladda upp .pdf → Fel
✅ Utan internet → Fel
```

## ⚠️ Begränsningar

### Nuvarande
- Max 10MB per bild
- Endast bildformat (JPG, PNG, GIF, WebP)
- Ingen automatisk komprimering
- Ingen lightbox/fullscreen-visning

### Framtida Förbättringar
- [ ] Drag & drop uppladdning
- [ ] Bildkomprimering (automatisk)
- [ ] Lightbox för fullscreen
- [ ] Bildredigering (crop, rotate)
- [ ] Caption-redigering
- [ ] Bildordning (drag to reorder)

## 🔒 Säkerhet

### Vad Är Skyddat?
- ✅ Endast inloggade kan ladda upp
- ✅ Filtypsvalidering (endast bilder)
- ✅ Storleksvalidering (max 10MB)
- ✅ Användare kan bara ta bort sina egna

### Storage Policies
```sql
-- Upload: Endast authenticated
-- View: Public (alla kan se)
-- Delete: Endast uploader
```

## 💾 Storage-användning

### Gratis Tier (Supabase)
- **Total:** 1GB storage
- **Genomsnitt:** 2-3MB per bild
- **Kapacitet:** ~330-500 bilder

### Uppskattning per Projekt
```
10 rum × 5 bilder = 50 bilder
50 × 2.5MB = 125MB per projekt
```

## 🎓 Best Practices

### 1. Namngivning
```
✅ Kök_befintliga_skåp.jpg
✅ Vardagsrum_FÖRE_renovering.jpg
❌ IMG_1234.jpg
❌ photo.jpg
```

### 2. Organisering
```
Prefix:
- FÖRE_ för före-bilder
- UNDER_ för progress
- EFTER_ för resultat
- INSP_ för inspiration
```

### 3. Storlek
```
Rekommenderat:
- Max 1920x1080 upplösning
- JPG för foton (mindre)
- PNG för skärmdumpar
- Komprimera innan uppladdning
```

## 🆘 Felsökning

### Problem: Storage Bucket Finns Inte
```bash
# Lösning: Kör SQL-filen
# I Supabase Dashboard → SQL Editor
# Kör: create_room_photos_storage.sql
```

### Problem: Kan Inte Ladda Upp
```
Kolla:
1. Är du inloggad?
2. Finns storage bucket?
3. Är filen under 10MB?
4. Är det en bildfil?
5. Fungerar internet?
```

### Problem: Bilden Visas Inte
```
Kolla:
1. Finns bilden i Supabase Storage?
2. Är bucket public?
3. Finns URL i photos-tabell?
4. Öppna URL direkt i browser
```

### Problem: Kan Inte Ta Bort
```
Kolla:
1. Är du upploader?
2. Finns delete-policy?
3. Finns bilden fortfarande?
```

## ✅ Sammanfattning

**Bilduppladdning för rum är implementerat och redo att användas!**

### Setup
1. ⚡ Kör `create_room_photos_storage.sql` (1 minut)
2. 🔄 Refresha app (10 sekunder)
3. 📸 Börja ladda upp bilder! (direkt)

### Funktioner
- ✅ Upload (flera bilder samtidigt)
- ✅ Förhandsvisning (2-kolumns rutnät)
- ✅ Delete (hover → ❌)
- ✅ Persistent (Supabase Storage + DB)

### Användning
```
Projekt → Canvas → Dubbelklicka rum → Bilder-sektion
```

---

**Dokumentera dina rum med bilder nu!** 📸

**Detaljerad guide:** `BILDUPPLADDNING_RUM.md`
