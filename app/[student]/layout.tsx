import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { getStudent } from '../../lib/students';
import { StudentShell } from '../../lib/studentContext';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

// One set of pages for every student. The first URL segment says whose pages these are.
// Rendered per request so the student's saved colour theme is in the very first paint.
export const dynamic = 'force-dynamic';

async function savedTheme(id: string): Promise<string | null> {
  try {
    const { data } = await supabaseAdmin.from('students').select('theme').eq('id', id).maybeSingle();
    return (data as { theme?: string | null } | null)?.theme ?? null;
  } catch {
    return null;   // fall back to the roster's default theme
  }
}

export default async function StudentLayout({ children, params }: { children: ReactNode; params: Promise<{ student: string }> }) {
  const { student } = await params;
  const info = getStudent(student);
  if (!info) notFound();
  return <StudentShell student={info} initialTheme={await savedTheme(info.id)}>{children}</StudentShell>;
}
