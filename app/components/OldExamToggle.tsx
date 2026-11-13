'use client';

// "This is an old exam or quiz" switch shown when uploading. Old exams are the strongest signal of how a professor
// tests, so Ascend treats a file marked this way as the model for question style, difficulty and emphasis.
export default function OldExamToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div role="switch" aria-checked={value} tabIndex={0} onClick={() => onChange(!value)} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(!value); } }}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 12, border: `1.5px solid ${value ? 'var(--accent)' : '#E8E5F0'}`, background: value ? 'var(--accent-light)' : '#FAFAF8', cursor: 'pointer', marginBottom: 14 }}>
      <div style={{ width: 36, height: 20, borderRadius: 999, background: value ? 'var(--accent)' : '#E8E5F0', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
        <div style={{ position: 'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: value ? 'var(--accent)' : '#1D1B26' }}>This is an old exam or quiz</div>
        <div style={{ fontSize: 11, color: '#9E9BB0', lineHeight: 1.4 }}>Ascend will copy its question style and difficulty.</div>
      </div>
    </div>
  );
}
