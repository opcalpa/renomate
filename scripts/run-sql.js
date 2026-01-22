#!/usr/bin/env node

/**
 * Kör SQL direkt mot Supabase via Management API
 * 
 * Användning:
 * 1. Lägg till din Service Role Key i .env.local:
 *    SUPABASE_SERVICE_ROLE_KEY=din-service-role-key
 * 
 * 2. Kör: node run-sql.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Läs miljövariabler
const envFile = readFileSync(join(__dirname, '.env.local'), 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    let value = match[2].trim().replace(/^["']|["']$/g, '')
    envVars[key] = value
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://pfyxywuchbakuphxhgec.supabase.co'
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY saknas i .env.local')
  console.error('')
  console.error('Lägg till i .env.local:')
  console.error('SUPABASE_SERVICE_ROLE_KEY=din-service-role-key')
  console.error('')
  console.error('Du hittar den på:')
  console.error('https://app.supabase.com/project/pfyxywuchbakuphxhgec/settings/api')
  console.error('(Scrolla ner till "service_role" key)')
  process.exit(1)
}

// Läs SQL-filen
const sqlFile = readFileSync(join(__dirname, 'supabase', 'schema.sql'), 'utf-8')

async function runSQL() {
  console.log('🚀 Kör SQL mot Supabase...')
  console.log('')

  // Supabase Management API endpoint för att köra SQL
  // Vi använder PostgREST API med service role key
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  
  if (!projectRef) {
    console.error('❌ Kunde inte extrahera project reference från URL')
    process.exit(1)
  }

  // Supabase har en REST API för att köra SQL via Management API
  // Men det enklaste är att använda Supabase Dashboard SQL Editor
  // eller installera Supabase CLI
  
  console.log('⚠️  Supabase REST API stöder inte direkt SQL-körning.')
  console.log('')
  console.log('💡 Det enklaste sättet är att:')
  console.log('')
  console.log('1. Gå till Supabase SQL Editor:')
  console.log(`   https://app.supabase.com/project/${projectRef}/sql/new`)
  console.log('')
  console.log('2. Kopiera SQL-koden från: supabase/schema.sql')
  console.log('')
  console.log('3. Klistra in och klicka "Run"')
  console.log('')
  console.log('📄 SQL-kod att köra:')
  console.log('─'.repeat(70))
  console.log(sqlFile)
  console.log('─'.repeat(70))
  console.log('')
  console.log('Eller installera Supabase CLI:')
  console.log('  npm install -g supabase')
  console.log('')
}

runSQL()
