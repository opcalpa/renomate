# GitHub Pages Setup - Steg för steg

## Steg 1: Skapa GitHub Repository

1. Gå till [GitHub](https://github.com/new)
2. Repository name: `renomate` (eller valfritt namn)
3. Välj **Public** (för gratis GitHub Pages)
4. **INTE** kryssa i "Initialize with README" (vi har redan filer)
5. Klicka på **Create repository**

## Steg 2: Initiera Git och Pusha Koden

Öppna terminalen i projektmappen och kör:

```bash
# Initiera git
git init

# Lägg till alla filer
git add .

# Skapa första commit
git commit -m "Initial commit: Hemrenovering Projektledare med Supabase"

# Lägg till remote repository (ersätt DITT-ANVÄNDARNAMN och DITT-REPO-NAMN)
git remote add origin https://github.com/DITT-ANVÄNDARNAMN/DITT-REPO-NAMN.git

# Pusha till GitHub
git branch -M main
git push -u origin main
```

## Steg 3: Aktivera GitHub Pages

1. Gå till ditt repository på GitHub
2. Klicka på **Settings** (överst i repot)
3. Scrolla ner till **Pages** i vänstermenyn
4. Under **Source**, välj **GitHub Actions**
5. Spara ändringar

## Steg 4: Lägg till Supabase Secrets (Viktigt!)

För att appen ska fungera på GitHub Pages behöver du lägga till dina Supabase-uppgifter:

1. Gå till **Settings** → **Secrets and variables** → **Actions**
2. Klicka på **New repository secret**
3. Lägg till två secrets:

   **Secret 1:**
   - Name: `VITE_SUPABASE_URL`
   - Value: Din Supabase Project URL (t.ex. `https://xxxxx.supabase.co`)

   **Secret 2:**
   - Name: `VITE_SUPABASE_ANON_KEY`
   - Value: Din Supabase Anon Key

4. Klicka på **Add secret** för båda

## Steg 5: Uppdatera Repository Name i Vite Config

Om ditt repository heter något annat än `renomate`, uppdatera `vite.config.js`:

```js
base: process.env.NODE_ENV === 'production' ? '/DITT-REPO-NAMN/' : '/',
```

## Steg 6: Vänta på Deployment

1. Efter att du pushat koden kommer GitHub Actions automatiskt att:
   - Bygga din app
   - Deploya den till GitHub Pages
   
2. Detta tar vanligtvis 1-2 minuter

3. Du kan se status under **Actions**-fliken i ditt repository

4. När det är klart hittar du din app på:
   `https://DITT-ANVÄNDARNAMN.github.io/DITT-REPO-NAMN/`

## Automatisk Deployment

Varje gång du pushar till `main`-branchen kommer appen automatiskt att:
- Byggas om
- Deployas till GitHub Pages

Du behöver inte göra något manuellt!

## Felsökning

### Appen visar 404
- Kontrollera att repository-namnet i `vite.config.js` stämmer
- Vänta några minuter efter första deployment

### Supabase fungerar inte
- Kontrollera att secrets är korrekt namngivna (exakt som ovan)
- Kontrollera att Supabase-URL och Key är korrekta

### Build misslyckas
- Kontrollera **Actions**-fliken för felmeddelanden
- Se till att alla dependencies är installerade lokalt först

## Alternativ: Vercel eller Netlify

Om GitHub Pages inte fungerar bra kan du också använda:
- **Vercel**: Automatisk deployment från GitHub, gratis
- **Netlify**: Enkelt drag-and-drop eller GitHub-integration

Båda är enklare att sätta upp än GitHub Pages men GitHub Pages är helt gratis och integrerat med GitHub!
