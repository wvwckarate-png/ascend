'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { StudentInfo } from './students';
import { THEMES, themeVars, isThemeName, type ThemeName } from './theme';
import { supabase } from './supabase';
import { accountState, homeFor, installApiAuth } from './supabaseAuth';

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

  // The door: these pages open only for this student, or for a parent. Anyone else is sent to sign in (or to their own pages).
  const [door, setDoor] = useState<'checking' | 'open' | 'unreachable'>('checking');
  const knock = useCallback(async () => {
    installApiAuth();
    const who = await accountState();
    if (who.status === 'unreachable') { setDoor('unreachable'); return; }
    if (who.status === 'signed-out') { window.location.replace('/login'); return; }
    if (who.account.needsPassword) { window.location.replace('/welcome'); return; }
    if (who.account.role !== 'parent' && who.account.studentId !== student.id) { window.location.replace(homeFor(who.account)); return; }
    setDoor('open');
  }, [student.id]);
  useEffect(() => { knock(); }, [knock]);

  const value = useMemo(() => ({ student, theme, setTheme }), [student, theme, setTheme]);
  return (
    <StudentContext.Provider value={value}>
      <div style={themeVars(THEMES[theme])}>
        {door === 'open' ? children : (
          <div data-door={door} style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
            {door === 'unreachable' && (
              <>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26' }}>Can&apos;t reach Ascend right now</div>
                <div style={{ fontSize: 13, color: '#9E9BB0' }}>Check your connection, then try again.</div>
                <button onClick={() => { setDoor('checking'); knock(); }} style={{ padding: '11px 24px', borderRadius: 999, border: 'none', background: 'var(--accent)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Try again</button>
              </>
            )}
          </div>
        )}
      </div>
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
