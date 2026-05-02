import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rbvklkigxwithxsdvjpq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('Supabase key starts with:', supabaseAnonKey?.slice(0, 15));

export const supabase = createClient(supabaseUrl, supabaseAnonKey);