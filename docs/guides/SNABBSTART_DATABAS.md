# ⚡ Snabbstart - Databas Setup (5 minuter)

## 🎯 Enklaste sättet att sätta upp databasen

### Steg 1: Öppna Supabase Dashboard
1. Gå till: https://app.supabase.com
2. Välj ditt projekt: **pfyxywuchbakuphxhgec**
3. Klicka på "SQL Editor" i sidomenyn

### Steg 2: Kör Complete Schema
1. I SQL Editor, klicka på "New Query"
2. Öppna filen: `supabase/complete_schema.sql`
3. Kopiera **ALLT** innehåll (1320 rader)
4. Klistra in i SQL Editor
5. Klicka **"Run"** (eller Cmd/Ctrl + Enter)
6. Vänta ~10 sekunder

### Steg 3: Aktivera Email Authentication
1. Gå till "Authentication" → "Settings"
2. Under "Email", sätt:
   - **Enable Email provider**: ✅ ON
   - **Confirm email**: ❌ OFF (för utveckling)
3. Klicka "Save"

### Steg 4: Verifiera
1. Gå till "Table Editor"
2. Du ska se dessa tabeller:
   - ✅ profiles
   - ✅ projects
   - ✅ rooms
   - ✅ tasks
   - ✅ materials
   - ✅ purchase_requests
   - ✅ contractors
   - ✅ photos
   - ✅ notes
   - ✅ project_shares
   - ✅ project_invitations
   - ✅ task_dependencies
   - ✅ floor_map_plans

## 🧪 Testa att det fungerar

### 1. Registrera dig
1. Öppna din app: http://localhost:5173
2. Klicka "Sign In" (eller gå till `/auth`)
3. Registrera med email och lösenord

### 2. Kolla i Supabase
1. Gå till "Authentication" → "Users"
2. Du ska se din nya användare!
3. Gå till "Table Editor" → "profiles"
4. Du ska se din profil (skapades automatiskt!)

### 3. Skapa ett projekt
1. I appen, klicka "Get Started"
2. Skapa ett nytt projekt
3. Lägg till rum och uppgifter
4. Gå till "Table Editor" → "projects" i Supabase
5. Du ska se ditt projekt!

## ✅ Nu fungerar det från alla enheter!

- ✅ Logga in från telefon → Samma projekt
- ✅ Logga in från annan dator → Samma projekt
- ✅ Ändringar synkas automatiskt
- ✅ Data sparas säkert i molnet

## 🔐 Säkerhet

- **Row Level Security (RLS)** är aktiverat
- Du kan bara se dina egna projekt
- Andra användare kan inte se din data
- Projekt kan delas med specifika användare via "Team Management"

## 📱 Vad du kan göra nu

- 🏗️ Skapa projekt och rum
- 📋 Lägga till uppgifter
- 💰 Hantera budget
- 📐 Rita floor plans
- 🛒 Skapa materiallista
- 👥 Bjuda in teammedlemmar
- 📊 Se projektframsteg

## 🐛 Problem?

### SQL-fel vid körning?
- Kolla att du kopierade HELA filen
- Försök köra migrations individuellt (se DATABASE_SETUP_GUIDE.md)

### Kan inte registrera användare?
- Kontrollera att Email Authentication är aktiverad
- Kolla Network tab i browser console

### Projekt sparas inte?
- Kontrollera att du är inloggad
- Kolla att tabellerna finns i Supabase
- Se att din profil finns i `profiles` tabellen

---

**Klart!** Nu har du en fungerande databas och kan använda appen från alla enheter! 🎉
