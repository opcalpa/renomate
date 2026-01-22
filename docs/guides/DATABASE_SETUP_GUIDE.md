# 🗄️ Databas Setup Guide - VIKTIGT!

## ⚠️ Nuvarande Status

**Din databas är INTE komplett än!**

Du har:
- ❌ Ingen användarkoppling till projekt
- ❌ Inga tabeller för rooms, materials, purchase_requests, floor_plans
- ❌ Ingen autentisering setup

## 📋 Vad databasen kommer innehålla efter setup:

### Huvudtabeller:
1. **profiles** - Användarprofiler (skapas automatiskt vid registrering)
2. **projects** - Renoveringsprojekt (kopplade till användare)
3. **rooms** - Rum per projekt
4. **tasks** - Uppgifter per projekt/rum
5. **materials** - Material per uppgift
6. **purchase_requests** - Inköpsförfrågningar
7. **contractors** - Entreprenörer/hantverkare
8. **photos** - Bilder kopplade till projekt/rum/uppgifter
9. **notes** - Anteckningar
10. **project_shares** - Dela projekt med andra användare
11. **project_invitations** - Inbjudningar till projekt
12. **task_dependencies** - Beroenden mellan uppgifter
13. **floor_map_plans** - Sparade ritningar från floor planner

### Säkerhet:
- ✅ Row Level Security (RLS) aktiverad på alla tabeller
- ✅ Användare kan bara se sina egna projekt
- ✅ Delningsfunktion med rollbaserad åtkomst (viewer, editor, admin)
- ✅ Automatisk profil-skapning vid registrering

## 🚀 Steg för att sätta upp databasen

### Metod 1: Via Supabase Dashboard (Rekommenderat)

1. **Öppna Supabase Dashboard**
   - Gå till: https://app.supabase.com
   - Välj ditt projekt (eller skapa nytt)

2. **Gå till SQL Editor**
   - Klicka på "SQL Editor" i sidomenyn

3. **Kör migrations i ordning**
   
   Du har 23 migration-filer i `supabase/migrations/` som måste köras i ordning:

   **VIKTIGT: Kör dessa EN I TAGET i kronologisk ordning!**

   a) Kopiera innehållet från första filen:
   ```bash
   supabase/migrations/20251109162717_88442821-a08e-4354-8d92-2236ee602b3e.sql
   ```
   
   b) Klistra in i SQL Editor och klicka "Run"
   
   c) Upprepa för varje fil i ordning:
   - `20251109164357_...sql`
   - `20251109165031_...sql`
   - `20251109221637_...sql`
   - ... (fortsätt i ordning baserat på timestamp)

4. **Verifiera att tabellerna skapades**
   - Gå till "Table Editor" i Supabase
   - Du ska se alla 13 tabeller listade

### Metod 2: Via Supabase CLI (För avancerade användare)

Om du har Supabase CLI installerat:

```bash
cd /Users/calpa/Desktop/Renomate
supabase db push
```

### Metod 3: Kombinerad SQL (Enklast men riskabelt)

Om du vill köra allt på en gång (kan misslyckas om något går fel):

1. I SQL Editor, skapa en ny query
2. Kopiera innehållet från ALLA migration-filer i ordning
3. Kör hela scriptet

⚠️ **Varning**: Om någon del misslyckas måste du felsöka manuellt.

## ✅ Vad händer efter setup?

### 1. Automatisk Profil-skapning
När en ny användare registrerar sig via `/auth`:
- ✅ Användarkonto skapas i `auth.users`
- ✅ En profil skapas automatiskt i `profiles` tabellen
- ✅ Profilen kopplas till användarens auth.uid()

### 2. Data sparas per användare
- ✅ Projekt kopplas till `owner_id` (från profiles)
- ✅ Användare kan bara se sina egna projekt
- ✅ Delning möjlig via `project_shares` tabellen

### 3. Pub/Sub från vilken enhet som helst
- ✅ Logga in från mobil - se dina projekt
- ✅ Logga in från dator - samma projekt
- ✅ Ändringar synkas realtid via Supabase

## 🔑 Aktivera Authentication

Efter att databastabellerna är skapade:

1. **Gå till Authentication → Settings**
2. **Aktivera Email Provider:**
   - Email Authentication: ON
   - Confirm email: OFF (för utveckling) / ON (för produktion)

3. **Valfritt - Aktivera OAuth:**
   - Google
   - GitHub
   - Etc.

## 🧪 Testa att det fungerar

### Steg 1: Registrera en användare
1. Starta din app: http://localhost:5173
2. Gå till `/auth`
3. Registrera en ny användare

### Steg 2: Verifiera i Supabase
1. Gå till "Authentication → Users" i Supabase Dashboard
2. Du ska se din nya användare
3. Gå till "Table Editor → profiles"
4. Du ska se en profil med samma email

### Steg 3: Skapa ett projekt
1. Logga in i appen
2. Skapa ett nytt projekt
3. Gå till "Table Editor → projects" i Supabase
4. Du ska se ditt projekt med din `owner_id`

### Steg 4: Testa från annan enhet
1. Öppna appen från din telefon eller annan dator
2. Logga in med samma konto
3. Du ska se samma projekt!

## 📊 Databas Schema Overview

```
auth.users (Supabase managed)
  ↓
profiles (automatiskt skapad vid signup)
  ↓
projects (ägs av profile)
  ↓
├─ rooms
│  └─ tasks
│     ├─ materials
│     │  └─ purchase_requests
│     └─ photos
├─ project_shares (dela med andra användare)
├─ project_invitations (bjud in via email)
└─ floor_map_plans (sparade ritningar)
```

## 🐛 Troubleshooting

### Fel: "relation does not exist"
- Migrations har inte körts
- Kör migrations i rätt ordning

### Fel: "permission denied"
- RLS policies blockerar åtkomst
- Kontrollera att du är inloggad
- Kontrollera att projektet ägs av dig

### Användare kan inte se sina projekt
- Profil saknas i `profiles` tabellen
- Trigger för automatisk profil-skapning körs inte
- Kör migration igen

### Data sparas inte
- RLS policies blockerar INSERT
- Kontrollera att `auth.uid()` matchar `user_id` i profiles

## 📝 Nästa Steg Efter Setup

1. ✅ Kör alla migrations
2. ✅ Aktivera Email Authentication
3. ✅ Registrera en testanvändare
4. ✅ Testa skapa projekt
5. ✅ Testa logga in från annan enhet
6. ✅ Testa dela projekt med annan användare

## 🎉 När du är klar

Din app kommer ha:
- ✅ Fullständig användarhantering
- ✅ Projekt sparas i molnet
- ✅ Åtkomst från alla enheter
- ✅ Delningsfunktionalitet
- ✅ Säker datalagring med RLS
- ✅ Automatisk synkning

---

**Behöver du hjälp?** Läs SUPABASE_FORKLARING.md för mer info om Supabase.
