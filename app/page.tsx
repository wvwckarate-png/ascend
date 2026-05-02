import Link from 'next/link';

const students = [
  {
    id: 'matthew',
    name: 'Matthew',
    grade: '11th Grade',
    focus: 'Pre-Dental · AP Track',
    emoji: '📚',
    color: '#5C5278',
  },
  {
    id: 'michael',
    name: 'Michael',
    grade: '9th Grade',
    focus: 'Pre-Med · Foundation',
    emoji: '🔬',
    color: '#7B6FA0',
  },
  {
    id: 'brynne',
    name: 'Brynne',
    grade: '5th Grade',
    focus: 'Future Physician 🐉',
    emoji: '⭐',
    color: '#C4A882',
  },
  {
    id: 'parent',
    name: 'Gregory',
    grade: 'Parent',
    focus: 'Dashboard & Overview',
    emoji: '👨‍👧‍👦',
    color: '#6B6B68',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="mb-12 text-center">
        <h1 className="text-5xl mb-3" style={{ color: 'var(--purple-dark)' }}>
          Ascend
        </h1>
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
          Who's studying today?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
        {students.map((student) => (
          <Link key={student.id} href={`/${student.id}`}>
            <div
              className="flex items-center gap-5 p-5 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                style={{ background: student.color + '18' }}
              >
                {student.emoji}
              </div>
              <div>
                <div className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {student.name}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {student.grade} · {student.focus}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}