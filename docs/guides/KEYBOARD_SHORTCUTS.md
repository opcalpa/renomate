# ⌨️ Keyboard Shortcuts - Space Planner

Alla klassiska keyboard shortcuts är aktiverade och fungerar i Space Planner!

## 🎨 Redigering

| Shortcut | Mac | Windows | Funktion |
|----------|-----|---------|----------|
| **Ångra** | `Cmd+Z` | `Ctrl+Z` | Ångrar senaste ändringen |
| **Gör om** | `Cmd+Shift+Z` | `Ctrl+Y` | Gör om ångrad ändring |
| **Kopiera** | `Cmd+C` | `Ctrl+C` | Kopierar markerade objekt |
| **Klistra in** | `Cmd+V` | `Ctrl+V` | Klistrar in kopierade objekt (med offset) |
| **Duplicera** | `Cmd+D` | `Ctrl+D` | Duplicerar markerade objekt direkt |
| **Markera allt** | `Cmd+A` | `Ctrl+A` | Markerar alla objekt i ritningen |
| **Spara** | `Cmd+S` | `Ctrl+S` | Sparar ritningen manuellt |
| **Radera** | `Delete` / `Backspace` | `Delete` / `Backspace` | Raderar markerade objekt |

## 🧭 Navigation

| Shortcut | Funktion |
|----------|----------|
| **Space + Drag** | Panorera canvas (flytta runt i ritningen) |
| **Ctrl/Cmd + Scroll** | Zooma in/ut |
| **Two-finger Scroll** | Panorera canvas (touchpad) |
| **Pinch** | Zooma in/ut (touchpad/mobile) |

## 🛠️ Verktyg

| Shortcut | Funktion |
|----------|----------|
| **Escape** | Avbryter pågående operation och återgår till markör-verktyget |
| **Shift** | Håll inne för rotation i 45° steg (när du roterar objekt) |

## 📋 Funktionalitet

### **Kopiera & Klistra in**
- Fungerar med **alla objekttyper**: väggar, rum, text, symboler, etc.
- Inklistrade objekt placeras med 20px offset från originalet
- Kopierade objekt behålls i clipboard tills du kopierar något nytt

### **Ångra/Gör om**
- Obegränsad undo/redo historik under sessionen
- Fungerar för ALL redigering: skapa, radera, flytta, rotera, etc.
- Historiken sparas INTE mellan sessioner (rensar vid reload)

### **Markera allt**
- Markerar alla objekt på den aktiva ritningen
- Perfekt för att snabbt flytta eller kopiera hela ritningen

### **Duplicera**
- Snabbare än Cmd+C → Cmd+V
- Duplicerar direkt med offset
- Duplicerade objekt markeras automatiskt

## 🎯 Tips

1. **Cmd+C/V är perfekt för att flytta objekt mellan olika planer** - kopiera från en plan, byt till en annan, klistra in!

2. **Cmd+D för snabb duplicering** - använd detta istället för Cmd+C/V när du ska göra flera kopior på samma plan.

3. **Space + Drag = Pan** - håll inne Space och dra för att flytta runt i ritningen utan att välja verktyg.

4. **Escape = Återgå** - om du råkat välja fel verktyg, tryck Escape för att gå tillbaka till markören.

5. **Shift för precision** - håll Shift när du roterar objekt för att få 45° snapping.

## ⚠️ Viktigt att veta

- Shortcuts fungerar **INTE** när du skriver i textfält (Input/Textarea)
- Cmd+S sparar ritningen, men den sparas också automatiskt
- Undo/Redo fungerar ENDAST för den aktiva planen
- Clipboard är delad mellan alla planer i samma session

## 🐛 Troubleshooting

**Shortcuts fungerar inte?**
1. Kontrollera att du inte står i ett textfält
2. Kolla konsolen (F12) - du bör se `🎹 Keyboard shortcut detected:` när du trycker shortcuts
3. På Mac: använd **Cmd** (⌘), inte Ctrl
4. På Windows: använd **Ctrl**, inte Alt

**Undo/Redo verkar inte fungera?**
- Kolla att det finns något att ångra: konsolen visar `canUndo: true/false`
- Om den säger "at history start" finns inget att ångra
- Om den säger "at history end" finns inget att göra om

---

*Uppdaterad: 2026-01-21*
