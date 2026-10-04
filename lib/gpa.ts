// Shared GPA logic for every student's Classes page.

export type GPAClass = {
  id: string;
  name: string;
  class_level: string | null;
  credit_hours: number | null;
  is_bcpm: boolean;
  is_science: boolean;
  grade_only: boolean;
  letter_grade: string | null;
  grading_schema: Record<string, number> | null;
};

export type GPAGrade = { class_id: string; category: string; score: number; max_score: number };

export type GPAFilter = 'all' | 'science' | 'bcpm';

export const LETTER_GRADES = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

const LETTER_POINTS: Record<string, number> = {
  'A': 4.0, 'A-': 3.7, 'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7, 'D+': 1.3, 'D': 1.0, 'D-': 0.7, 'F': 0.0,
};

export function isBCPMName(name: string): boolean {
  const n = name.toLowerCase();
  return /\bbio(?!graph)/.test(n) || n.includes('chem') || n.includes('physics') ||
         n.includes('math') || n.includes('algebra') || n.includes('calculus') ||
         n.includes('trig') || n.includes('statistic') || n.includes('anatomy') ||
         n.includes('physiology') || n.includes('genetics') || n.includes('microbio') ||
         n.includes('organic');
}

// AP / high-school level classes are tracked but never counted toward the college GPA.
export function isExcludedLevel(level: string | null | undefined): boolean {
  const l = (level || '').toLowerCase();
  return /\bap\b/.test(l) || l.includes('high school');
}

export function percentToGPA(pct: number): number {
  if (pct >= 93) return 4.0; if (pct >= 90) return 3.7; if (pct >= 87) return 3.3;
  if (pct >= 83) return 3.0; if (pct >= 80) return 2.7; if (pct >= 77) return 2.3;
  if (pct >= 73) return 2.0; if (pct >= 70) return 1.7; if (pct >= 60) return 1.0;
  return 0.0;
}

export function letterToGPA(letter: string | null | undefined): number | null {
  return LETTER_POINTS[(letter || '').trim()] ?? null;
}

const pctOf = (g: GPAGrade) => (g.score / g.max_score) * 100;

export function classGPAPoints(cls: GPAClass, grades: GPAGrade[]): number | null {
  if (cls.grade_only) return letterToGPA(cls.letter_grade);

  // Ignore malformed rows (a zero max_score would produce Infinity/NaN).
  const classGrades = grades.filter(g => g.class_id === cls.id && g.max_score > 0);
  if (classGrades.length === 0) return null;

  let pct: number;
  if (cls.grading_schema && Object.keys(cls.grading_schema).length > 0) {
    let totalWeight = 0;
    let weightedSum = 0;
    for (const [cat, weight] of Object.entries(cls.grading_schema)) {
      const catGrades = classGrades.filter(g => g.category.toLowerCase() === cat.toLowerCase());
      if (catGrades.length === 0) continue;
      const avg = catGrades.reduce((sum, g) => sum + pctOf(g), 0) / catGrades.length;
      weightedSum += avg * (weight / 100);
      totalWeight += weight;
    }
    if (totalWeight === 0) return null;
    pct = weightedSum / (totalWeight / 100);
  } else {
    pct = classGrades.reduce((sum, g) => sum + pctOf(g), 0) / classGrades.length;
  }
  return percentToGPA(pct);
}

export function computeGPA(classes: GPAClass[], grades: GPAGrade[], filter: GPAFilter): { gpa: number | null; count: number } {
  let totalCredits = 0;
  let weightedPoints = 0;
  let count = 0;

  for (const cls of classes) {
    if (isExcludedLevel(cls.class_level)) continue;
    if (filter === 'bcpm' && !cls.is_bcpm) continue;
    if (filter === 'science' && !cls.is_bcpm && !cls.is_science) continue;

    const pts = classGPAPoints(cls, grades);
    if (pts === null) continue;
    const credits = cls.credit_hours || 3;
    totalCredits += credits;
    weightedPoints += pts * credits;
    count++;
  }

  if (totalCredits === 0) return { gpa: null, count: 0 };
  return { gpa: Math.round((weightedPoints / totalCredits) * 100) / 100, count };
}

export function gpaColor(gpa: number | null): string {
  if (gpa === null) return '#C4C1D4';
  if (gpa >= 3.5) return '#5FAD8E';
  if (gpa >= 3.0) return '#7B6FA0';
  if (gpa >= 2.5) return '#C8965A';
  return '#C47878';
}
