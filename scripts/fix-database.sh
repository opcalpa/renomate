#!/bin/bash

echo "🔧 Fix Supabase Database RLS Policies for Rooms"
echo ""
echo "This script will help you fix the database permissions that prevent room creation."
echo ""
echo "📋 STEPS TO FIX:"
echo ""
echo "1. Open this URL in your browser:"
echo "   https://app.supabase.com/project/pfyxywuchbakuphxhgec/sql/new"
echo ""
echo "2. Copy and paste the SQL code from FIX_DATABASE_RLS.sql"
echo ""
echo "3. Click 'Run' to execute the SQL"
echo ""
echo "4. You should see: '✅ Rooms RLS policies updated!'"
echo ""
echo "5. Refresh your Space Planner app - room creation should now work!"
echo ""
echo "📄 SQL file location: ./FIX_DATABASE_RLS.sql"
echo ""

# Try to open the URL automatically (works on macOS)
if command -v open &> /dev/null; then
    echo "🌐 Opening Supabase SQL Editor automatically..."
    open "https://app.supabase.com/project/pfyxywuchbakuphxhgec/sql/new"
elif command -v xdg-open &> /dev/null; then
    echo "🌐 Opening Supabase SQL Editor automatically..."
    xdg-open "https://app.supabase.com/project/pfyxywuchbakuphxhgec/sql/new"
else
    echo "🌐 Please manually open the URL above in your browser"
fi

echo ""
echo "❓ Need help? The error was: 'new row violates row-level security policy for table rooms'"
echo "   This is a common Supabase security feature that needs to be configured."