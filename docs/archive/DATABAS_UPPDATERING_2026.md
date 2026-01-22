# 🚀 Databas Uppdatering 2026 - Snabbguide

## ❗️ VIKTIGT - KÖR DETTA EN GÅNG

För att säkerställa att din Supabase-databas är helt uppdaterad och redo för produktion, följ dessa steg:

## 📋 Steg 1: Kör Huvudmigrationen

1. Öppna [Supabase SQL Editor](https://app.supabase.com/project/pfyxywuchbakuphxhgec/sql/new)
2. Öppna filen `supabase/COMPLETE_DATABASE_UPDATE_2026.sql` i din editor
3. Kopiera HELA innehållet
4. Klistra in i Supabase SQL Editor
5. Klicka på **"Run"** (eller tryck Ctrl+Enter / Cmd+Enter)

### ✅ Vad detta gör:

- ✅ **Templates-tabellen** - För att spara återanvändbara objektmallar på canvas
- ✅ **Room material & färger** - Fält för material, väggfärg, takfärg, lister
- ✅ **Storage bucket** - För att ladda upp bilder och filer
- ✅ **Purchase Orders** - Betald-status, pris per enhet, total pris, tilldelad till
- ✅ **Materials** - Beskrivningsfält
- ✅ **Floor map shapes** - Anteckningar på objekt

## 📊 Steg 2: Verifiera

Efter att du kört SQL-skriptet, kolla output-panelen i Supabase. Du ska se:

```
🚀 STARTING COMPLETE DATABASE UPDATE
✅ Templates table configured
✅ Rooms table: 4 material/color columns
✅ Storage bucket: project-files EXISTS
✅ Purchase orders: 4 new columns
✅ DATABASE UPDATE COMPLETE!
🚀 Ready for production!
```

## 🧪 Steg 3: Testa funktionaliteten

1. **Testa Templates:**
   - Öppna Space Planner
   - Markera några objekt på canvas
   - Klicka på "Spara som mall"
   - Ge mallen ett namn och spara
   - ✅ Ska fungera utan fel nu!

2. **Testa Rum:**
   - Skapa ett rum
   - Dubbelklicka på rummet
   - Lägg till material och färger
   - ✅ Ska sparas korrekt

3. **Testa Bilduppladdning:**
   - Gå till en kommentar
   - Ladda upp en bild
   - ✅ Ska fungera

## 📝 Vilka filer har skapats/ändrats:

### SQL-filer (i `supabase/`):
- ✅ `COMPLETE_DATABASE_UPDATE_2026.sql` - **KÖR DENNA!**
- ✅ `fix_templates_project_id.sql` - (inkluderad i huvudfilen)

### Kod-filer:
- ✅ `src/components/floormap/SaveTemplateDialog.tsx` - Fixad att inte använda project_id

## 🔒 Säkerhet

Alla SQL-skript inkluderar:
- ✅ Row Level Security (RLS) policies
- ✅ Permissions för authenticated users
- ✅ Foreign key constraints
- ✅ Proper indexes för prestanda

## 🚨 Om något går fel

Om du får fel när du kör SQL-skriptet:

1. **Kolla output-meddelandet** - Det visar exakt vad som gick fel
2. **Ta en skärmdump** och skicka till mig
3. **Fortsätt inte** - vissa migrationer kan vara beroende av andra

### Vanliga fel och lösningar:

**Fel:** "relation already exists"
- ✅ **Lösning:** Ignorera - det betyder att tabellen redan finns

**Fel:** "permission denied"
- ❌ **Lösning:** Se till att du är inloggad med rätt konto i Supabase Dashboard

**Fel:** "foreign key constraint"
- ❌ **Lösning:** Kontakta mig - det kan vara ett dataproblem

## 📦 Production Readiness Checklist

När du är redo att gå live, kontrollera:

- [ ] ✅ SQL-migrationen är körd i Supabase
- [ ] ✅ Alla features fungerar lokalt
- [ ] ✅ Inga fel i browser console
- [ ] ✅ Alla RLS policies är aktiverade
- [ ] ✅ Storage bucket har rätt permissions
- [ ] ✅ Environment variables är korrekt konfigurerade
- [ ] ✅ Git repository är clean (inga .env filer committade)

## 🎯 Nästa steg efter migration

1. **Testa grundligt** - Gå igenom alla features
2. **Backup** - Supabase tar automatiska backups, men kolla att det fungerar
3. **Performance** - Övervaka query-prestanda i Supabase Dashboard
4. **Monitoring** - Sätt upp Supabase alerts för errors

## 💡 Tips

- **Kom ihåg:** Denna SQL-fil är idempotent (säker att köra flera gånger)
- **Om du uppdaterar:** Du kan köra samma fil igen utan problem
- **För framtida migrationer:** Lägg till i samma fil eller skapa nya versionade filer

---

## 📞 Support

Om du stöter på problem:
1. Kolla error logs i Supabase Dashboard
2. Verifiera att tabeller existerar: `SELECT * FROM public.templates LIMIT 1;`
3. Kontakta mig med detaljer om felet
