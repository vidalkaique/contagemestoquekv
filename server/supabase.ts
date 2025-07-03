import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL não definida');
}

if (!process.env.SUPABASE_KEY) {
  throw new Error('SUPABASE_KEY não definida');
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
); 