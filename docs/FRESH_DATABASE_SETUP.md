# Renomate — Nytt Supabase-projekt: Steg-för-steg

> Denna guide tar dig från ett helt nytt Supabase-projekt till en fullt fungerande Renomate-app med alla edge functions, auth, storage och demo-data.

---

## Förutsättningar

- Node.js 22+
- Supabase CLI (`npm install -g supabase`)
- Git-repot klonat och uppdaterat (`git pull`)

---

## Steg 1: Skapa nytt Supabase-projekt

1. Gå till https://supabase.com/dashboard
2. Klicka **New Project**
3. Välj organisation: `avnuizluzbcwowvhxesl`
4. Namn: `Renomate` (eller valfritt)
5. Region: **North EU (Stockholm)** (eu-north-1)
6. Generera och **spara ditt databaslösenord** — du behöver det för CLI
7. Vänta tills projektet är klart (~2 min)

---

## Steg 2: Kopiera nya nycklar

Från Dashboard → **Settings → API**, kopiera:

- **Project URL** → `VITE_SUPABASE_URL`
- **Anon public key** → `VITE_SUPABASE_ANON_KEY`
- **Service role key** → behövs i steg 6

Uppdatera `.env.local`:
```bash
VITE_SUPABASE_URL=https://NYTT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Steg 3: Länka projektet till CLI

```bash
npx supabase link --project-ref NYTT-REF
```

Du blir ombedd att ange databaslösenordet från steg 1.

---

## Steg 4: Kör alla migrationer

```bash
npx supabase db push
```

Detta kör alla 172+ migrationer i ordning. Tar ~1-2 minuter.
Alla tabeller, RLS-policies, funktioner och triggers skapas automatiskt.

**Verifiera:** Kolla att det inte kom några fel i outputen.

---

## Steg 5: Skapa storage buckets

Gå till Dashboard → **Storage** och skapa dessa buckets (om de inte redan skapats av migrationer):

| Bucket | Public | Syfte |
|--------|--------|-------|
| `project-files` | Nej | Projektfiler, foton, PDFer |
| `avatars` | Ja | Profilbilder |
| `intake-files` | Nej | Kundintag-bilagor |

De flesta buckets skapas automatiskt av migrationer. Kontrollera att de finns.

---

## Steg 6: Sätt edge function-hemligheter

```bash
npx supabase secrets set \
  OPENAI_API_KEY="sk-..." \
  RESEND_API_KEY="re_..."
```

> `SUPABASE_URL` och `SUPABASE_SERVICE_ROLE_KEY` sätts automatiskt av Supabase.

### Var hittar jag nycklarna?

| Hemlighet | Var | Kommentar |
|-----------|-----|-----------|
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys | Samma nyckel som innan |
| `RESEND_API_KEY` | https://resend.com/api-keys | Samma nyckel som innan |

---

## Steg 7: Deploya alla edge functions

```bash
npx supabase functions deploy
```

Detta deployar alla 15 edge functions:

| # | Funktion | Hemligheter | Beskrivning |
|---|----------|-------------|-------------|
| 1 | `ai-design` | OPENAI_API_KEY | AI-inredningsförslag |
| 2 | `extract-document-text` | OPENAI_API_KEY | OCR/textextraktion från PDF/bilder |
| 3 | `generate-quote-items` | OPENAI_API_KEY | AI-genererade offertposter |
| 4 | `help-bot` | OPENAI_API_KEY, SUPABASE_URL, SERVICE_ROLE | Hjälp-bot Q&A |
| 5 | `intake-upload` | SUPABASE_URL, SERVICE_ROLE | Filuppladdning för kundintag |
| 6 | `pinterest-oembed` | SUPABASE_URL, SERVICE_ROLE | Pinterest-pin metadata & bildproxy |
| 7 | `process-document` | OPENAI_API_KEY | Extrahera rum/uppgifter från dokument |
| 8 | `process-floorplan` | OPENAI_API_KEY | Analysera planritningar |
| 9 | `process-receipt` | OPENAI_API_KEY | Kvittoanalys med GPT-4 Vision |
| 10 | `send-feedback` | RESEND_API_KEY | Skicka feedback-email |
| 11 | `send-intake-email` | RESEND_API_KEY, SUPABASE_URL, SERVICE_ROLE | Skicka kundintag-länk |
| 12 | `send-invoice-email` | RESEND_API_KEY, SUPABASE_URL, SERVICE_ROLE | Skicka faktura-email |
| 13 | `send-project-invitation` | RESEND_API_KEY, SUPABASE_URL, SERVICE_ROLE | Projektinbjudningar (3 templates) |
| 14 | `send-quote-email` | RESEND_API_KEY, SUPABASE_URL, SERVICE_ROLE | Skicka offert-email |
| 15 | `translate-comments` | OPENAI_API_KEY | Översätt kommentarer |

---

## Steg 8: Konfigurera Auth-providers

### Google OAuth
1. Dashboard → **Authentication → Providers → Google**
2. Aktivera och klistra in:
   - **Client ID** och **Client Secret** från Google Cloud Console
3. I Google Cloud Console → OAuth-samtycke:
   - Lägg till redirect URI: `https://NYTT-REF.supabase.co/auth/v1/callback`

### Email Auth
Redan aktiverat som default. Inget extra behövs.

---

## Steg 9: Konfigurera email-domän i Resend

Om du byter Supabase-URL behöver inte Resend ändras — den använder `hello@letsrenomate.com` som avsändare oavsett Supabase-projekt.

**Kontrollera:** https://resend.com/domains — `letsrenomate.com` ska vara verifierad.

---

## Steg 10: Uppdatera DNS/domän (om custom domain)

Om du använder custom domain (`app.letsrenomate.com`):

1. Dashboard → **Settings → Custom Domains**
2. Lägg till `app.letsrenomate.com`
3. Uppdatera DNS (Cloudflare/din DNS-provider):
   - CNAME: `app` → det nya Supabase-projektets URL

**OBS:** CORS-allowlisten i edge functions pekar redan på `app.letsrenomate.com` och `letsrenomate.com` — ingen kodändring behövs.

---

## Steg 11: Uppdatera GitHub Actions (deploy)

Filen `.github/workflows/deploy.yml` använder secrets. Uppdatera i GitHub:

1. Gå till repo → **Settings → Secrets and variables → Actions**
2. Uppdatera:
   - `VITE_SUPABASE_URL` → nya URL:en
   - `VITE_SUPABASE_ANON_KEY` → nya anon-nyckeln

---

## Steg 12: Skapa demo-data

Registrera ett konto i appen, sedan:

1. Skapa ett nytt projekt
2. Lägg till rum och uppgifter
3. (Valfritt) Kör demo-seed SQL:er om sådana finns i `supabase/migrations/`

---

## Steg 13: Verifiera

Checklista:

- [ ] Kan logga in (email + Google)
- [ ] Kan skapa projekt
- [ ] Kan lägga till rum och uppgifter
- [ ] Kan ladda upp filer/bilder
- [ ] Profilbild fungerar (avatars bucket)
- [ ] Help-bot svarar (edge function + OpenAI)
- [ ] Kan skicka projektinbjudan (Resend)
- [ ] Canvas/ritverktyg fungerar
- [ ] Inga 500-fel i konsolen

---

## Externa tjänster — Sammanfattning

| Tjänst | Ändra vid nytt projekt? | Var |
|--------|------------------------|-----|
| **Supabase** | ✅ JA | .env.local + GitHub Secrets |
| **OpenAI** | ❌ Samma nyckel | Supabase Secrets |
| **Resend** | ❌ Samma nyckel | Supabase Secrets |
| **Sentry** | ❌ Samma DSN | .env.local (redan korrekt) |
| **PostHog** | ❌ Samma nyckel | .env.local (kommenterad) |
| **Google OAuth** | ⚠️ Uppdatera redirect URI | Google Cloud Console |
| **Pinterest** | ⚠️ Uppdatera redirect URI | Pinterest Developer |
| **Cloudflare/DNS** | ⚠️ Om custom domain | DNS-provider |
| **GitHub Actions** | ✅ JA | Repo → Settings → Secrets |

---

## Tidsuppskattning

| Steg | Tid |
|------|-----|
| Skapa projekt + kopiera nycklar | 5 min |
| Länka + kör migrationer | 3 min |
| Sätt secrets + deploy functions | 5 min |
| Konfigurera auth providers | 10 min |
| DNS/domän (om applicable) | 15 min |
| Verifiera allt fungerar | 10 min |
| **Totalt** | **~45 min** |
