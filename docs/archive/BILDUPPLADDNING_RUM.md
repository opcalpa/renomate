# 📸 Bilduppladdning för Rum

## ✨ Ny Funktion

Du kan nu ladda upp bilder direkt i Rumsdetaljer-dialogen för att dokumentera varje rum med foton!

## 🎯 Var Finns Det?

```
1. Öppna ett projekt
2. Gå till Canvas/Floor Plan-läge
3. Dubbelklicka på ett rum (eller högerklicka → Detaljer)
4. Rumsdetaljer-dialog öppnas
5. Under "Rumsbeskrivning" finns nu "Bilder"-sektionen
```

## 📋 Layout i Rumsdetaljer

```
┌────────────────────────────────────┐
│ Rumsdetaljer                       │
├────────────────────────────────────┤
│ Rumsnamn *                         │
│ [Vardagsrum__________________]     │
│                                    │
│ Rumsbeskrivning                    │
│ [___________________________]      │
│ [___________________________]      │
│                                    │
│ 📸 Bilder                    3 bilder│ ← NYT!
│ ┌──────────────────────────┐      │
│ │ 📤 Klicka för att ladda   │      │
│ │    upp bilder             │      │
│ │ PNG, JPG, GIF upp till 10MB│      │
│ └──────────────────────────┘      │
│                                    │
│ [Bild 1] [Bild 2]                 │
│ [Bild 3] [Bild 4]                 │
│                                    │
│ Rumsfärg på ritning                │
│ [___________________________]      │
└────────────────────────────────────┘
```

## 🖼️ Funktioner

### 1. Ladda Upp Bilder
- **Klicka** på uppladdningsområdet
- **Välj** en eller flera bilder
- **Stödda format:** JPG, PNG, GIF, WebP
- **Max storlek:** 10MB per bild
- **Flera bilder:** Ja, välj flera samtidigt

### 2. Visa Bilder
- Bilder visas i ett rutnät (2 kolumner)
- Varje bild är 32px hög
- Scroll om fler än 4 bilder
- Bildnamn visas som caption

### 3. Ta Bort Bilder
- **Hover** över en bild
- **Klicka** på röda X-knappen som dyker upp
- Bekräfta borttagning
- Bilden tas bort permanent

## 💡 Användningsexempel

### Exempel 1: Dokumentera Befintligt Skick
```
1. Öppna rum: "Kök"
2. Ladda upp foton på:
   - Befintliga vitvaror
   - Skador/problem
   - Mätningar
   - Elsystem
3. Spara
```

### Exempel 2: Inspirationsbilder
```
1. Öppna rum: "Vardagsrum"
2. Ladda upp inspirationsbilder:
   - Färgschema
   - Möbellayout
   - Designidéer
3. Använd som referens vid renovering
```

### Exempel 3: Renoverings-Progress
```
1. Före renovering: Ladda upp "före"-bilder
2. Under renovering: Ladda upp progress-bilder
3. Efter renovering: Ladda upp "efter"-bilder
4. Perfekt dokumentation av hela projektet
```

## 🔧 Teknisk Implementation

### Database (photos table)
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY,
  linked_to_type TEXT, -- 'room', 'project', 'task'
  linked_to_id UUID,   -- rum-id
  url TEXT,            -- Supabase Storage URL
  caption TEXT,        -- Bildnamn/beskrivning
  uploaded_by_user_id UUID,
  created_at TIMESTAMP
)
```

### Storage (Supabase)
```
Bucket: room-photos
Structure: {room-id}/{timestamp}-{random}.{ext}
Example: abc123/1703001234567-x7k2m.jpg
```

### Policies
- ✅ Autentiserade användare kan ladda upp
- ✅ Alla kan se bilder (public bucket)
- ✅ Användare kan ta bort sina egna bilder

## 📸 UI-komponenter

### Uppladdningsområde
```jsx
<label for="photo-upload">
  📤 Klicka för att ladda upp bilder
  PNG, JPG, GIF upp till 10MB
</label>
<input type="file" accept="image/*" multiple />
```

### Bildrutnät
```jsx
<div className="grid grid-cols-2 gap-3">
  {photos.map(photo => (
    <div className="relative group">
      <img src={photo.url} />
      <button className="absolute top-2 right-2">
        ❌ Ta bort
      </button>
    </div>
  ))}
</div>
```

## ⚙️ Setup (Kör En Gång)

För att aktivera bilduppladdning, kör denna SQL i Supabase Dashboard:

```bash
# I Supabase Dashboard → SQL Editor
# Kör: supabase/create_room_photos_storage.sql
```

Detta skapar:
1. Storage bucket `room-photos`
2. Policies för uppladdning
3. Policies för visning
4. Policies för borttagning

## 🧪 Testa Funktionen

### Test 1: Ladda Upp En Bild
```
1. Öppna rumsdetaljer
2. Klicka på uppladdningsområdet
3. Välj en bild
4. Vänta på uppladdning
✅ Bilden ska visas i rutnätet
```

### Test 2: Ladda Upp Flera Bilder
```
1. Klicka på uppladdningsområdet
2. Välj flera bilder (Cmd/Ctrl + klick)
3. Vänta på uppladdning
✅ Alla bilder ska visas
```

### Test 3: Ta Bort Bild
```
1. Hover över en bild
2. Klicka på röda X
3. Bekräfta
✅ Bilden ska försvinna
```

### Test 4: Refresh & Persistence
```
1. Ladda upp bilder
2. Stäng dialog
3. Öppna dialog igen
✅ Bilderna ska fortfarande vara där
```

## 🎨 Visuell Design

### Uppladdningsområde
- **Normal:** Grå streckad kant
- **Hover:** Blå kant, ljusblå bakgrund
- **Uploading:** Grå, spinner, "Laddar upp..."
- **Storlek:** Full bredd, 24px hög

### Bildrutnät
- **Kolumner:** 2 (responsivt)
- **Gap:** 12px mellan bilder
- **Bildhöjd:** 128px (object-fit: cover)
- **Border:** Grå, rundade hörn
- **Scroll:** Max 192px höjd, scroll om fler

### Ta Bort-knapp
- **Position:** Övre högra hörnet
- **Färg:** Röd bakgrund, vit ikon
- **Beteende:** Döljs, visas vid hover
- **Animation:** Smooth opacity transition

## 📊 Bildoptimering

### Rekommendationer
- **Format:** JPG för foton, PNG för skärmdumpar
- **Storlek:** Max 10MB (systemgräns)
- **Upplösning:** 1920x1080 eller lägre rekommenderas
- **Komprimering:** Komprimera innan uppladdning för snabbare laddning

### Framtida Förbättringar
- [ ] Automatisk bildkomprimering
- [ ] Bildredigering (crop, rotate)
- [ ] Fullscreen-visning (lightbox)
- [ ] Drag & drop uppladdning
- [ ] Bildordning (drag to reorder)
- [ ] Bildtext/caption-redigering

## 🔒 Säkerhet

### Vad Är Säkrat?
- ✅ Endast autentiserade användare kan ladda upp
- ✅ Filtypsvalidering (endast bilder)
- ✅ Storleksvalidering (max 10MB)
- ✅ Användare kan bara ta bort sina egna bilder

### Vad Kan Förbättras?
- [ ] Virus-scanning av uppladdade filer
- [ ] Bildformat-konvertering (till WebP)
- [ ] Automatisk thumbnail-generering
- [ ] Watermarking (valfritt)

## 💾 Storage-användning

### Uppskattning
```
Genomsnittlig bild: 2-3MB
10 bilder per rum: 20-30MB
100 rum: 2-3GB total

Supabase gratis tier: 1GB storage
Behov för större projekt: Uppgradering krävs
```

## 📝 Best Practices

### 1. Organisera Bilder Logiskt
```
Före-bilder: Prefix med "FÖRE_"
Under: Prefix med "PROGRESS_"
Efter: Prefix med "EFTER_"
```

### 2. Använd Beskrivande Namn
```
❌ IMG_1234.jpg
✅ Kök_befintliga_skåp.jpg
✅ Vardagsrum_färg_inspiration.jpg
```

### 3. Ta Bort Gamla Bilder
```
- Rensa ut gamla progress-bilder
- Behåll endast relevanta bilder
- Spara storage-utrymme
```

### 4. Backup
```
- Ladda ner viktiga bilder lokalt
- Supabase-backup (automatisk)
- Export av projekt med bilder
```

## 🆘 Felsökning

### Problem: "Kunde inte ladda upp"
**Orsak:** Nätverksproblem eller storage-bucket saknas

**Lösning:**
1. Kolla internet-anslutning
2. Kör `create_room_photos_storage.sql` i Supabase
3. Verifiera att bucket `room-photos` finns

### Problem: "Bilden är för stor"
**Orsak:** Bild över 10MB

**Lösning:**
1. Komprimera bilden (t.ex. TinyPNG.com)
2. Minska upplösning
3. Konvertera till JPG (mindre än PNG)

### Problem: Bilden visas inte
**Orsak:** Storage policy saknas eller bild borttagen

**Lösning:**
1. Kolla att bilden finns i Supabase Storage
2. Verifiera storage policies
3. Testa att öppna URL direkt i browser

### Problem: Kan inte ta bort bild
**Orsak:** Felaktig policy eller inte ägare

**Lösning:**
1. Endast användaren som laddade upp kan ta bort
2. Admin kan ta bort via Supabase Dashboard
3. Kolla `uploaded_by_user_id` i database

## ✅ Sammanfattning

**Bilduppladdning för rum är nu aktivt!**

### Funktioner:
- ✅ Ladda upp flera bilder samtidigt
- ✅ Förhandsvisning i rutnät
- ✅ Ta bort bilder
- ✅ Persistent lagring i Supabase
- ✅ Bildnamn som caption

### Användningsområden:
- 📸 Dokumentera befintligt skick
- 🎨 Spara inspirationsbilder
- 📊 Följa renoverings-progress
- 📝 Referensmaterial för hantverkare

### Setup:
1. Kör `create_room_photos_storage.sql` (en gång)
2. Öppna rumsdetaljer
3. Börja ladda upp bilder!

---

**Dokumentera dina rum med bilder nu!** 📸🏠
