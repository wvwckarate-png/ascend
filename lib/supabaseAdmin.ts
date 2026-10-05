import { createClient } from '@supabase/supabase-js';

// Server-only client using the service-role key. Import this from API routes only — never from a client component.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export const STUDENT_IDS = ['matthew', 'michael', 'brynne'] as const;
export type StudentId = typeof STUDENT_IDS[number];
export const isStudentId = (v: unknown): v is StudentId => typeof v === 'string' && (STUDENT_IDS as readonly string[]).includes(v);
