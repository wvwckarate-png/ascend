'use client';
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
];

export default function ParentDashboard() {
  return (
    <main className="min-h-screen px-6 py-12 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <Link href="/" className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          ← Back
        </Link>
        <div
          className="text-xs font-medium px-3 py-1 rounded-full"
          style={{ background: 'var(--purple-light)', color: 'var(--purple-dark)' }}
        >
          Parent View
        </div>
      </div>

      <h1 className="text-4xl mb-1" style={{ color: 'var(--purple-dark)' }}>
        Welcome, Gregory.
      </h1>
      <p className="mb-10" style={{ color: 'var(--text-secondary)' }}>
        Here's how your students are doing.
      </p>

      <div className="grid grid-cols-1 gap-4">
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
              <div className="flex-1">
                <div className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                  {student.name}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {student.grade} · {student.focus}
                </div>
              </div>
              <div className="text-sm" style={{ color: 'var(--purple)' }}>
                View →
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div
        className="rounded-2xl p-6 mt-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-xl mb-3" style={{ color: 'var(--text-primary)' }}>
          Recent Activity
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Study activity across all three students will appear here.
        </p>
      </div>
    </main>
  );
}