import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL não definida')
if (!supabaseKey) throw new Error('VITE_SUPABASE_KEY não definida')

export const supabase = createClient(supabaseUrl, supabaseKey) 