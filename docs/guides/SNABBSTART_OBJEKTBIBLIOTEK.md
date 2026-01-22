# 🚀 Snabbstart: Redigerbart Objektbibliotek

## Öppna Objektbiblioteket

1. Öppna **Space Planner**
2. I vänstra toolbaren, scrolla till **"Objekt"**-sektionen
3. Klicka på **kugghjuls-ikonen** (Settings) under objektbiblioteket

**Eller:**
- Klicka direkt på objektbibliotek-knappen (den med Sparkles-ikonen)
- Klicka sedan på Settings-ikonen bredvid

## Snabbtester

### **Test 1: Rita en Cirkel (30 sekunder) - VISUELL EDITOR**

1. Öppna Objektbibliotek
2. Klicka **"Skapa nytt"**
3. Namn: **"Min Lampa"**
4. Klicka **"Redigera"** → Fliken **"Visuell Editor"**
5. Klicka verktyget **"Cirkel"** (eller tryck **C**)
6. Klicka på canvas (centrum) och dra ut (radie)
7. Klicka **"Spara"**
8. ✅ Du har skapat ditt första objekt visuellt!

### **Test 2: Redigera Eluttag (1 minut) - VISUELL EDITOR**

1. Öppna Objektbibliotek
2. Sök: **"eluttag"**
3. Klicka på **"Eluttag (Standard)"**
4. Klicka **"Redigera"** → Fliken **"Visuell Editor"**
5. Klicka på den yttre cirkeln för att markera den
6. I högerpanelen: Ändra **"Linjetjocklek"** från 2 till 4
7. Klicka **"Spara"**
8. ✅ Alla framtida eluttag har nu tjockare linjer!

### **Test 2: Skapa Eget Objekt (2 minuter)**

1. Öppna Objektbibliotek
2. Klicka **"Skapa nytt"**
3. Redigera:
   - **Namn:** "Min Lampa"
   - **Ikon:** 💡
   - **Kategori:** electrical
   - **Beskrivning:** "Speciallampa för projektet"
4. Klicka **"Spara"**
5. ✅ Nu finns "Min Lampa" i biblioteket!

### **Test 3: Export & Import (1 minut)**

1. Skapa 1-2 custom objekt
2. Klicka **"Exportera"**
3. JSON-fil laddas ner
4. Klicka **"Återställ till standard"** (bekräfta)
5. Custom objekt försvinner
6. Klicka **"Importera"**
7. Välj den exporterade filen
8. ✅ Custom objekt återkommer!

## JSON-Exempel för Nybörjare

### **Enkel Cirkel (Lampa):**
```json
[
  {
    "type": "circle",
    "x": 50,
    "y": 50,
    "radius": 40,
    "stroke": "#000000",
    "strokeWidth": 2
  }
]
```

### **Rektangel (Bord):**
```json
[
  {
    "type": "rect",
    "x": 0,
    "y": 0,
    "width": 1000,
    "height": 600,
    "stroke": "#000000",
    "strokeWidth": 2
  }
]
```

### **Linje (Vägg):**
```json
[
  {
    "type": "line",
    "points": [0, 0, 1000, 0],
    "stroke": "#000000",
    "strokeWidth": 3
  }
]
```

### **Ellips (Handfat):**
```json
[
  {
    "type": "ellipse",
    "x": 300,
    "y": 250,
    "radiusX": 250,
    "radiusY": 200,
    "stroke": "#000000",
    "strokeWidth": 2
  }
]
```

## Vanliga Frågor

**Q: Kan jag radera default-objekt?**
A: Nej, men du kan duplicera och anpassa dem, sedan använda din version.

**Q: Sparas mina ändringar?**
A: Ja! De sparas i localStorage och finns kvar mellan sessioner.

**Q: Kan jag dela mitt bibliotek med kollegor?**
A: Ja! Exportera till JSON-fil och dela filen. De importerar den.

**Q: Hur ångrar jag ändringar?**
A: Klicka "Återställ till standard" för att återställa alla objekt.

**Q: Vad betyder "Anpassad" badge?**
A: Det betyder att objektet är en custom version (inte default).

**Q: Kan jag ändra standard-objekten?**
A: Inte direkt, men redigering skapar en custom version som överskriver default.

## Tips & Tricks

### **Tip 1: Duplicera innan redigering**
Vill du experimentera? Duplicera objektet först, sen redigera kopian!

### **Tip 2: Använd taggar**
Lägg till många taggar för enklare sökning: `wc, toalett, toilet, bathroom, sanitär`

### **Tip 3: Exportera regelbundet**
Backup din custom library en gång i månaden!

### **Tip 4: Start enkelt**
Börja med att ändra strokeWidth och färger innan du ändrar hela former.

### **Tip 5: Koordinatsystem**
- `x=0, y=0` är top-left
- Positiv x = höger
- Positiv y = ner
- Alla mått i millimeter (mm)

## Keyboard Shortcuts

| Shortcut | Funktion |
|----------|----------|
| **Cmd/Ctrl + S** | Spara objekt (i edit-läge) |
| **Escape** | Stäng dialog |
| **Tab** | Nästa fält |
| **Cmd/Ctrl + F** | Fokusera sök-fält |

## Nästa Steg

1. ✅ Testa de 3 snabbtesterna ovan
2. ✅ Redigera 1 befintligt objekt
3. ✅ Skapa 1 nytt objekt
4. ✅ Exportera ditt bibliotek (backup)
5. ✅ Läs full dokumentation: `OBJECT_LIBRARY_SYSTEM.md`

---

**Behöver hjälp?**
- Full dokumentation: `/OBJECT_LIBRARY_SYSTEM.md`
- Exempel på objekt: Se `objectLibraryDefinitions.ts`
- JSON-struktur: Se `ObjectShape` interface i `objectLibraryDefinitions.ts`

*Lycka till!* 🎉📦
