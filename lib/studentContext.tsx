'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { StudentInfo } from './students';
import { THEMES, themeVars } from './theme';

const StudentContext = createContext<StudentInfo | null>(null);

/** Wraps every student page: provides who the student is and sets their theme colours as CSS variables. */
export function StudentShell({ student, children }: { student: StudentInfo; children: ReactNode }) {
  return (
    <StudentContext.Provider value={student}>
      <div style={themeVars(THEMES[student.theme])}>{children}</div>
    </StudentContext.Provider>
  );
}

/** The student whose pages are being shown (from the URL: /matthew/… -> Matthew). */
export function useStudent(): StudentInfo {
  const s = useContext(StudentContext);
  if (!s) throw new Error('useStudent() must be used inside a student page');
  return s;
}
