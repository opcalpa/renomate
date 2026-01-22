# 🔄 Starta Om Dev-Servern

## Problem
Nya funktioner syns inte i webbläsaren trots att koden är uppdaterad.

## Lösning: Starta om servern

### Steg 1: Stoppa befintlig server
```bash
# I terminalen där servern körs:
Ctrl + C  (eller Cmd + C på Mac)
```

### Steg 2: Rensa cache och starta om
```bash
cd /Users/calpa/Desktop/Renomate

# Rensa node_modules cache (valfritt men rekommenderat)
rm -rf node_modules/.vite

# Starta dev-servern igen
npm run dev
```

### Steg 3: Tvinga uppdatera webbläsaren
1. Öppna webbläsaren
2. Tryck **Ctrl+Shift+R** (eller **Cmd+Shift+R** på Mac)
3. Detta laddar om sidan och rensar cache

---

## Snabb Verifiering Efter Omstart

### ✅ Kontrollera att du ser:

#### 1. Nya verktyg i vänstermenyn
```
Efter Wall-verktyget (minus-ikon) ska du se:
🚪 DoorOpen-ikon (Door tool)
🔲 RectangleHorizontal-ikon (Opening tool)
```

#### 2. Testa Undo/Redo
```
1. Rita en vägg
2. Tryck Ctrl+Z → Väggen ska försvinna
3. Tryck Ctrl+Y → Väggen ska komma tillbaka
```

#### 3. Testa Multi-select
```
1. Välj Select-verktyget
2. Dra över flera objekt
3. Du ska se en blå transparent box medan du drar
4. Släpp → Alla objekt inom boxen markeras
```

#### 4. Testa Ctrl+Klick
```
1. Klicka på objekt 1
2. Håll Ctrl + Klicka på objekt 2
3. Båda ska vara markerade
```

---

## Om det fortfarande inte fungerar

### Alternativ 1: Hårdare cache-rensning
```bash
# Stoppa servern (Ctrl+C)
cd /Users/calpa/Desktop/Renomate

# Ta bort alla caches
rm -rf node_modules/.vite
rm -rf dist
rm -rf .next

# Installera om dependencies (säkerställ att allt är synkat)
npm install

# Starta om
npm run dev
```

### Alternativ 2: Kontrollera TypeScript-kompilering
```bash
cd /Users/calpa/Desktop/Renomate
npx tsc --noEmit

# Om inga fel → allt är OK
# Om fel → vi behöver fixa dem
```

### Alternativ 3: Kolla console för fel
1. Öppna webbläsaren
2. Tryck F12 (öppna Developer Tools)
3. Gå till Console-fliken
4. Leta efter röda felmeddelanden
5. Om du ser fel, kopiera och skicka dem

---

## Vanliga Webbläsarcache-problem

### Chrome/Edge
```
1. Öppna Developer Tools (F12)
2. Högerklicka på reload-knappen
3. Välj "Empty Cache and Hard Reload"
```

### Firefox
```
1. Ctrl+Shift+Delete
2. Välj "Cached Web Content"
3. Klicka "Clear Now"
4. Tryck F5 för att ladda om
```

### Safari
```
1. Cmd+Option+E (töm cache)
2. Cmd+R (ladda om)
```

---

## Förväntade Funktioner Efter Omstart

### ✅ Du ska kunna:
1. **Se Door och Opening verktyg** i vänstermenyn
2. **Dra markeringsbox** (blå transparent) för multi-select
3. **Ctrl+Z/Y** för Undo/Redo
4. **Ctrl+Klick** för att lägga till objekt i markering
5. **Ctrl+A** för att markera alla objekt
6. **Scrolla horisontellt** över hela canvas

---

## Debug-checklist

Om funktionerna FORTFARANDE inte syns efter omstart:

### Check 1: Rätt fil öppnad?
```bash
# Kontrollera att du har rätt projekt
pwd
# Ska visa: /Users/calpa/Desktop/Renomate
```

### Check 2: Korrekt branch?
```bash
git status
# Kolla vilken branch du är på
```

### Check 3: Senaste koden?
```bash
# Se senaste ändringar
ls -la src/components/floormap/

# Kontrollera att Toolbar.tsx är nyligen ändrad
stat src/components/floormap/Toolbar.tsx
```

### Check 4: Port-konflikt?
```bash
# Om servern inte startar, kanske port 5173 är upptagen
lsof -i :5173

# Om upptagen, döda processen:
kill -9 [PID från kommandot ovan]

# Starta om servern
npm run dev
```

---

## Snabbkommando för Total Restart

Kör detta i terminalen för en komplett omstart:
```bash
cd /Users/calpa/Desktop/Renomate && \
killall node 2>/dev/null; \
rm -rf node_modules/.vite dist; \
npm run dev
```

---

## Support

Om ingenting fungerar efter dessa steg, ge mig:
1. Output från `npm run dev`
2. Console-fel från webbläsaren (F12)
3. Output från `npx tsc --noEmit`
4. Screenshot av vänstermenyn

Då kan jag felsöka vidare!
