#!/bin/bash

# Färger för output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}🗄️  Renofine Database Setup${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Kopiera SQL till clipboard
cat supabase/complete_schema.sql | pbcopy

echo -e "${GREEN}✅ SQL-koden är nu kopierad till clipboard!${NC}"
echo ""
echo -e "${YELLOW}Följ dessa enkla steg:${NC}"
echo ""
echo "1. Öppnar Supabase Dashboard i webbläsaren..."
sleep 2
open "https://app.supabase.com/project/pfyxywuchbakuphxhgec/sql/new"

echo ""
echo "2. När Dashboard öppnas:"
echo "   - Klicka i SQL Editor-fältet"
echo "   - Tryck Cmd+V (SQL är redan kopierad!)"
echo "   - Klicka 'RUN' knappen"
echo ""
echo "3. Vänta ~10 sekunder medan tabellerna skapas"
echo ""
echo "4. Aktivera Email Authentication:"
sleep 2
open "https://app.supabase.com/project/pfyxywuchbakuphxhgec/auth/providers"

echo ""
echo "   - Aktivera 'Email' provider"
echo "   - Stäng av 'Confirm email' (för utveckling)"
echo "   - Klicka 'Save'"
echo ""
echo -e "${GREEN}5. Klart! Gå tillbaka till appen och registrera dig!${NC}"
echo ""
echo -e "${BLUE}================================================${NC}"
echo ""
echo "Din app körs på: http://localhost:5173"
echo ""
