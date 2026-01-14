import { createClient } from '@supabase/supabase-js'

// Hämta dessa värden från din Supabase-projektinställningar
// Du hittar dem på: https://app.supabase.com/project/_/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL eller Anon Key saknas. Kontrollera dina miljövariabler.')
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'OK' : 'SAKNAS')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'OK' : 'SAKNAS')
}

// Skapa client även om nycklar saknas (för att undvika crash)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
