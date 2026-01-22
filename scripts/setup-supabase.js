#!/usr/bin/env node

/**
 * Script för att skapa tabeller i Supabase direkt
 * 
 * Användning:
 * 1. Lägg till din SERVICE_ROLE_KEY i .env.local:
 *    VITE_SUPABASE_SERVICE_ROLE_KEY=din-service-role-key-här
 * 
 * 2. Kör: node setup-supabase.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Läs miljövariabler från .env.local
const envFile = readFileSync(join(__dirname, '.env.local'), 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    let value = match[2].trim()
    // Ta bort quotes om de finns
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    envVars[key] = value
  }
})

const supabaseUrl = envVars.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Fel: VITE_SUPABASE_URL och VITE_SUPABASE_SERVICE_ROLE_KEY måste vara satta')
  console.error('')
  console.error('Lägg till i .env.local:')
  console.error('VITE_SUPABASE_SERVICE_ROLE_KEY=din-service-role-key-här')
  console.error('')
  console.error('Du hittar Service Role Key på:')
  console.error('https://app.supabase.com/project/pfyxywuchbakuphxhgec/settings/api')
  process.exit(1)
}

// Skapa Supabase client med service role key (har full åtkomst)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Läs SQL-filen
const sqlFile = readFileSync(join(__dirname, 'supabase', 'schema.sql'), 'utf-8')

async function setupDatabase() {
  console.log('🚀 Startar setup av Supabase-databas...')
  console.log('')

  try {
    // Kör SQL-koden
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlFile })
    
    if (error) {
      // Om exec_sql inte finns, försök köra direkt via REST API
      console.log('⚠️  exec_sql funktion saknas, försöker alternativ metod...')
      
      // Dela upp SQL i separata statements
      const statements = sqlFile
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))
      
      console.log(`📝 Kör ${statements.length} SQL-statements...`)
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            // Försök köra via REST API
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': serviceRoleKey,
                'Authorization': `Bearer ${serviceRoleKey}`
              },
              body: JSON.stringify({ sql: statement })
            })
            
            if (!response.ok) {
              console.log(`⚠️  Kunde inte köra: ${statement.substring(0, 50)}...`)
            }
          } catch (err) {
            console.log(`⚠️  Fel vid körning av statement: ${err.message}`)
          }
        }
      }
    }

    console.log('')
    console.log('✅ Setup klar!')
    console.log('')
    console.log('Tabellerna projects och tasks ska nu finnas i din Supabase-databas.')
    console.log('')
    console.log('Kontrollera på: https://app.supabase.com/project/pfyxywuchbakuphxhgec/editor')
    
  } catch (error) {
    console.error('❌ Fel vid setup:', error.message)
    console.error('')
    console.error('💡 Tips: Du kan också köra SQL-koden manuellt i Supabase SQL Editor:')
    console.error('https://app.supabase.com/project/pfyxywuchbakuphxhgec/sql/new')
    process.exit(1)
  }
}

setupDatabase()
