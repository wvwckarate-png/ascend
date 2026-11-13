'use client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { StudentInfo } from './students';
import { THEMES, themeVars, isThemeName, type ThemeName } from './theme';
import { supabase } from './supabase';

type Ctx = { student: StudentInfo; theme: ThemeName; setTheme: (t: ThemeName) => Promise<boolean> };
const StudentContext = createContext<Ctx | null>(null);

/**
 * Wraps every student page: says who the student is and sets their theme colours as CSS variables.
 * `initialTheme` is the student's saved choice (read on the server so there is no flash of the wrong colour).
 */
export function StudentShell({ student, initialTheme, children }: { student: StudentInfo; initialTheme?: string | null; children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(isThemeName(initialTheme) ? initialTheme : student.theme);

  // Applies instantly, then saves. If the save fails the colour stays for this visit and the caller is told.
  const setTheme = useCallback(async (t: ThemeName) => {
    setThemeState(t);
    const { error } = await supabase.from('students').update({ theme: t }).eq('id', student.id);
    if (error) console.error('Theme save failed:', error.message);
    return !error;
  }, [student.id]);

  const value = useMemo(() => ({ student, theme, setTheme }), [student, theme, setTheme]);
  return (
    <StudentContext.Provider value={value}>
      <div style={themeVars(THEMES[theme])}>{children}</div>
    </StudentContext.Provider>
  );
}

function useCtx(): Ctx {
  const c = useContext(StudentContext);
  if (!c) throw new Error('This hook must be used inside a student page');
  return c;
}

/** The student whose pages are being shown (from the URL: /matthew/… -> Matthew). */
export const useStudent = (): StudentInfo => useCtx().student;

/** The student's colour theme and a way to change it. */
export const useTheme = () => { const { theme, setTheme } = useCtx(); return { theme, setTheme }; };
