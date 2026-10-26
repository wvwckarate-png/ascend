// Under a reviewed exam question: where the answer comes from in the student's own materials, and — when the professor's
// material looks mistaken or two sources disagree — a "double-check this" note.
export default function QuestionNotes({ source, flag }: { source?: string; flag?: string }) {
  if (!source && !flag) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
      {flag && (
        <div style={{ background: '#FFF8EC', border: '1.5px solid #C8965A55', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#B07A2E', marginBottom: 4 }}>Double-check this</div>
          <div style={{ fontSize: 12.5, color: '#6B5A3A', lineHeight: 1.6 }}>{flag}</div>
        </div>
      )}
      {source && (
        <div style={{ background: '#F3F1EC', borderRadius: 10, padding: '10px 14px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 4 }}>From your materials</div>
          <div style={{ fontSize: 12, color: '#6B6880', lineHeight: 1.6, fontStyle: 'italic' }}>“{source}”</div>
        </div>
      )}
    </div>
  );
}
