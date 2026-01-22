# 🚀 Snabbstart Guide

## Steg 1: Installera beroenden

```bash
npm install
```

## Steg 2: Konfigurera Supabase (Valfritt men rekommenderat)

### 2a. Skapa Supabase-projekt
1. Gå till [supabase.com](https://app.supabase.com) och skapa konto/projekt
2. Vänta tills projektet är klart (~2 minuter)

### 2b. Skapa databastabeller
1. I Supabase Dashboard → SQL Editor
2. Kopiera innehållet från `supabase/schema.sql`
3. Kör SQL-koden

### 2c. Hämta API-nycklar
1. Gå till Project Settings → API
2. Kopiera:
   - Project URL
   - anon public key

### 2d. Skapa .env-fil
Skapa en fil som heter `.env` i projektroten:

```env
VITE_SUPABASE_URL=https://ditt-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=ditt-anon-key
```

**OBS:** Om du hoppar över Supabase kommer appen att fungera med localStorage istället!

## Steg 3: Starta utvecklingsservern

```bash
npm run dev
```

Öppna webbläsaren på den URL som visas (vanligtvis http://localhost:5173)

## Steg 4: Publicera på GitHub (Valfritt)

Se [GITHUB_SETUP.md](./GITHUB_SETUP.md) för detaljerade instruktioner.

**Kort version:**
1. Skapa repository på GitHub
2. Pusha koden
3. Aktivera GitHub Pages
4. Lägg till Supabase secrets
5. Klart! 🎉

## Vad händer härnäst?

- ✅ Appen fungerar lokalt
- ✅ Data sparas i Supabase (eller localStorage)
- ✅ Du kan deploya till GitHub Pages när du vill

## Behöver du hjälp?

- **Vad är Supabase?** → Läs [SUPABASE_FORKLARING.md](./SUPABASE_FORKLARING.md)
- **Hur deployar jag?** → Läs [GITHUB_SETUP.md](./GITHUB_SETUP.md)
- **Tekniska detaljer?** → Läs [README.md](./README.md)
