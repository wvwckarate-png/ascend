import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { STUDENTS, getStudent } from '../../lib/students';
import { StudentShell } from '../../lib/studentContext';

// One set of pages for every student. The first URL segment says whose pages these are.
export function generateStaticParams() {
  return STUDENTS.map(s => ({ student: s.id }));
}

export default async function StudentLayout({ children, params }: { children: ReactNode; params: Promise<{ student: string }> }) {
  const { student } = await params;
  const info = getStudent(student);
  if (!info) notFound();
  return <StudentShell student={info}>{children}</StudentShell>;
}
