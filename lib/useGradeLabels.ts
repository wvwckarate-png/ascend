'use client';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { STUDENTS, gradeLabel } from './students';
import { useMounted } from './useMounted';

// id -> "Freshman · 9th Grade" etc. for every student, from the graduation year stored in the database
// (falls back to the roster default if it can't be loaded). Empty until mounted so server HTML never mismatches.
export function useGradeLabels(): Record<string, string> {
  const mounted = useMounted();
  const [years, setYears] = useState<Record<string, number>>({});

  useEffect(() => {
    let off = false;
    supabase.from('students').select('id, grad_year').then(({ data }) => {
      if (off || !data) return;
      setYears(Object.fromEntries(data.filter(r => r.grad_year).map(r => [r.id, Number(r.grad_year)])));
    });
    return () => { off = true; };
  }, []);

  const labels: Record<string, string> = {};
  for (const s of STUDENTS) labels[s.id] = mounted ? gradeLabel(years[s.id] ?? s.gradYear) : '';
  return labels;
}
