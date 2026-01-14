import { createClient } from '@supabase/supabase-js'

// Hämta dessa värden från din Supabase-projektinställningar
// Du hittar dem på: https://app.supabase.com/project/_/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

// Validera att URL:en är korrekt
const isValidUrl = supabaseUrl && (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'))

if (!isValidUrl || !supabaseAnonKey) {
  console.error('⚠️ Supabase konfiguration saknas eller är ogiltig!')
  console.error('VITE_SUPABASE_URL:', supabaseUrl || 'SAKNAS')
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'OK' : 'SAKNAS')
  console.error('Kontrollera att miljövariablerna är korrekt konfigurerade i Vercel.')
}

// Skapa client endast om både URL och key finns och är giltiga
let supabase = null
if (isValidUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('Fel vid skapande av Supabase client:', error)
  }
} else {
  // Skapa en dummy client för att undvika crash, men den kommer inte fungera
  console.warn('Supabase client skapas inte - appen kommer använda localStorage fallback')
}

export { supabase }
