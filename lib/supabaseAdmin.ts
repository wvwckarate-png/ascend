import { createClient } from '@supabase/supabase-js';
import { STUDENTS } from './students';

// Server-only client using the service-role key. Import this from API routes only — never from a client component.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

// Who counts as a student comes from the one roster (lib/students.ts).
export const isStudentId = (v: unknown): v is string => typeof v === 'string' && STUDENTS.some(s => s.id === v);
