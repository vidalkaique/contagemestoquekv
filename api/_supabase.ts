import { createClient } from '@supabase/supabase-js';

if (!process.env.VITE_SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL não definida');
}

if (!process.env.VITE_SUPABASE_KEY) {
  throw new Error('VITE_SUPABASE_KEY não definida');
}

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
); 