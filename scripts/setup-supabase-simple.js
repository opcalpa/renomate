#!/usr/bin/env node

/**
 * Enklare script för att köra SQL mot Supabase
 * 
 * Användning:
 * node setup-supabase-simple.js
 * 
 * Du behöver ange din Service Role Key när scriptet frågar.
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Läs miljövariabler
const envFile = readFileSync(join(__dirname, '.env.local'), 'utf-8')
let supabaseUrl = ''
let serviceRoleKey = ''

envFile.split('\n').forEach(line => {
  const match = line.match(/^VITE_SUPABASE_URL=(.*)$/)
  if (match) {
    supabaseUrl = match[1].trim().replace(/^["']|["']$/g, '')
  }
})

if (!supabaseUrl) {
  console.error('❌ VITE_SUPABASE_URL saknas i .env.local')
  process.exit(1)
}

// Läs SQL-filen
const sqlFile = readFileSync(join(__dirname, 'supabase', 'schema.sql'), 'utf-8')

// Funktion för att fråga användaren
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise(resolve => rl.question(query, ans => {
    rl.close()
    resolve(ans)
  }))
}

async function setupDatabase() {
  console.log('🚀 Supabase Database Setup')
  console.log('')
  console.log('Detta script kommer köra SQL-koden för att skapa tabellerna.')
  console.log('')
  
  // Fråga efter Service Role Key
  if (!serviceRoleKey) {
    console.log('Du behöver din Service Role Key från Supabase Dashboard:')
    console.log('https://app.supabase.com/project/pfyxywuchbakuphxhgec/settings/api')
    console.log('')
    serviceRoleKey = await askQuestion('Klistra in din Service Role Key: ')
  }

  if (!serviceRoleKey) {
    console.error('❌ Service Role Key krävs')
    process.exit(1)
  }

  console.log('')
  console.log('📝 Kör SQL-kod...')
  console.log('')

  // Supabase har ingen direkt REST endpoint för att köra godtycklig SQL
  // Vi behöver använda Management API eller SQL Editor API
  // Det enklaste är att visa SQL-koden och be användaren köra den manuellt
  // ELLER använda Supabase CLI
  
  console.log('⚠️  Supabase REST API stöder inte direkt SQL-körning.')
  console.log('')
  console.log('💡 Alternativ:')
  console.log('')
  console.log('1. Installera Supabase CLI och kör:')
  console.log('   npm install -g supabase')
  console.log('   supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.pfyxywuchbakuphxhgec.supabase.co:5432/postgres"')
  console.log('')
  console.log('2. Eller kör SQL-koden manuellt i Supabase SQL Editor:')
  console.log('   https://app.supabase.com/project/pfyxywuchbakuphxhgec/sql/new')
  console.log('')
  console.log('SQL-koden finns i: supabase/schema.sql')
  console.log('')
  
  // Visa SQL-koden
  console.log('📄 SQL-kod att köra:')
  console.log('─'.repeat(60))
  console.log(sqlFile)
  console.log('─'.repeat(60))
}

setupDatabase()
