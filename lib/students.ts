// The three students in one place: roster details + automatic grade level.
// The graduation year (students.grad_year in the database) is the only thing that has to be right — the grade then
// advances on its own every school year, so nobody has to remember to edit it.

export type StudentId = 'matthew' | 'michael' | 'brynne';

export type StudentInfo = {
  id: StudentId;
  name: string;
  avatar: string;
  flip: boolean;        // the lion faces the wrong way unless flipped
  goal: string;         // short label on the login card
  program: string;      // where they're headed
  gradYear: number;     // high-school graduation year (used until the database value loads)
  color: string;        // accent colour
  light: string;        // soft tint of the accent
};

export const STUDENTS: StudentInfo[] = [
  { id: 'matthew', name: 'Matthew', avatar: '/eagle.png',  flip: false, goal: 'Future Dentist',   program: 'WVU School of Dentistry', gradYear: 2027, color: '#7B6FA0', light: '#EDE9F7' },
  { id: 'michael', name: 'Michael', avatar: '/lion.png',   flip: true,  goal: 'Future Physician', program: 'WVU School of Medicine',  gradYear: 2030, color: '#7B6FA0', light: '#EDE9F7' },
  { id: 'brynne',  name: 'Brynne',  avatar: '/dragon.png', flip: false, goal: 'Future Physician', program: 'WVU School of Medicine',  gradYear: 2033, color: '#E8956D', light: '#FFF3E8' },
];

const ORDINALS = ['th', 'st', 'nd', 'rd'];
export function ordinal(n: number): string {
  const v = n % 100;
  return n + (ORDINALS[(v - 20) % 10] || ORDINALS[v] || ORDINALS[0]);
}

// The school year rolls over on August 1st. Oct 2026 and Jun 2027 both belong to the school year that ends in 2027.
export function schoolYearEnd(now: Date = new Date()): number {
  return now.getMonth() >= 7 ? now.getFullYear() + 1 : now.getFullYear();
}

/** 12 = senior year of high school, 13 = college freshman, 9 = freshman year, 6 = sixth grade… */
export function gradeLevel(gradYear: number, now: Date = new Date()): number {
  return 12 - (gradYear - schoolYearEnd(now));
}

const HS_CLASS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];

/** "6th Grade", "Freshman · 9th Grade", "Senior · 12th Grade", "College Freshman", … */
export function gradeLabel(gradYear: number, now: Date = new Date()): string {
  const g = gradeLevel(gradYear, now);
  if (g < 0) return 'Pre-K';
  if (g === 0) return 'Kindergarten';
  if (g <= 8) return `${ordinal(g)} Grade`;
  if (g <= 12) return `${HS_CLASS[g - 9]} · ${ordinal(g)} Grade`;
  if (g <= 16) return `College ${HS_CLASS[g - 13]}`;
  return 'Graduate Student';
}

/** Short form for prompts and compact UI: "9th grade", "college sophomore". */
export function gradeShort(gradYear: number, now: Date = new Date()): string {
  const g = gradeLevel(gradYear, now);
  if (g <= 0) return g === 0 ? 'kindergarten' : 'pre-K';
  if (g <= 12) return `${ordinal(g)} grade`;
  if (g <= 16) return `college ${HS_CLASS[g - 13].toLowerCase()}`;
  return 'graduate student';
}

export const getStudent = (id: string): StudentInfo | undefined => STUDENTS.find(s => s.id === id);
