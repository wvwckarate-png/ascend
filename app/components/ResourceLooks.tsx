'use client';
import type { CSSProperties, ReactNode } from 'react';

// The one visual rule for files and saved resources, used everywhere they appear:
//   FROM CLASS (uploaded)  = grey paper: a square sheet with a folded corner, grey ink, never coloured.
//   MADE BY ASCEND         = the student's theme colour: rounded, filled, always carrying the mountain mark.
// Shape differs as well as colour, so the two can't be confused in any theme.

export const PAPER = { sheet: '#FFFFFF', edge: '#D8D5CC', shelf: '#EFEDE7', ink: '#5E5C57', tile: '#E9E7E0' };
const accent = 'var(--accent)', accentLight = 'var(--accent-light)', accentDark = 'var(--accent-dark)';
const accentMid = 'color-mix(in srgb, var(--accent) 30%, white)';
const font = 'var(--font-jakarta)';
const clip: CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };

export function MountainGlyph({ size = 18, c = '#fff' }: { size?: number; c?: string }) {
  return <svg width={size} height={size * 0.93} viewBox="0 0 60 56" fill="none" aria-hidden="true"><path d="M4 50L22 12L40 50" stroke={c} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" /><path d="M31 50L42 28L53 50" stroke={c} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
export function UpArrow({ size = 16, c = PAPER.ink }: { size?: number; c?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 19V6M6.5 11.5L12 6l5.5 5.5" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
export const PaperMark = ({ size = 34 }: { size?: number }) => <span style={{ width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: PAPER.sheet, border: `1.5px solid ${PAPER.edge}`, borderRadius: '4px 11px 4px 4px', boxSizing: 'border-box' }}><UpArrow size={size * 0.47} /></span>;
export const AscendMark = ({ size = 34 }: { size?: number }) => <span style={{ width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: accent, borderRadius: '50%' }}><MountainGlyph size={size * 0.52} /></span>;

/** A shelf: the grey one holds only uploads, the coloured one only what Ascend made. */
export function Shelf({ kind, title, sub, action, children }: { kind: 'class' | 'made'; title: string; sub: string; action?: ReactNode; children: ReactNode }) {
  const made = kind === 'made';
  return (
    <section data-shelf={kind} aria-label={title} style={{ background: made ? accentLight : PAPER.shelf, borderRadius: 20, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {made ? <AscendMark /> : <PaperMark />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#1D1B26', lineHeight: 1.2 }}>{title}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: made ? accentDark : PAPER.ink }}>{sub}</div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
export const paperButton: CSSProperties = { fontSize: 11, fontWeight: 800, padding: '7px 12px', borderRadius: 8, background: PAPER.sheet, border: `1.5px solid ${PAPER.edge}`, color: PAPER.ink, cursor: 'pointer', fontFamily: font, flexShrink: 0 };
export const madeButton: CSSProperties = { fontSize: 11, fontWeight: 800, padding: '8px 13px', borderRadius: 999, background: accent, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: font, flexShrink: 0, textDecoration: 'none' };

export const KIND_NAMES: Record<string, string> = { pdf: 'PDF', pptx: 'Slides', audio: 'Audio', image: 'Image', youtube: 'Video', link: 'Link', docx: 'Doc' };
const SHORT: Record<string, string> = { pptx: 'PPT', audio: 'AUD', image: 'IMG', youtube: 'VID', link: 'URL' };
export const kindName = (t: string) => KIND_NAMES[t] || (t || 'File').toUpperCase().slice(0, 5);

function Tile({ type, oldExam, small }: { type: string; oldExam?: boolean; small?: boolean }) {
  const bars = type === 'audio';
  return (
    <div style={{ height: small ? 30 : 54, width: small ? 30 : undefined, flexShrink: 0, borderRadius: 3, background: PAPER.tile, display: 'flex', alignItems: small ? 'center' : 'flex-end', justifyContent: small ? 'center' : 'space-between', padding: small ? 0 : 6, boxSizing: 'border-box', position: 'relative', overflow: 'hidden' }}>
      {!small && (bars
        ? <div style={{ position: 'absolute', inset: '9px 22px auto 8px', height: 20, display: 'flex', alignItems: 'center', gap: 3 }}>{[30, 70, 100, 55, 85, 40, 65, 25].map((h, i) => <b key={i} style={{ flex: 1, height: `${h}%`, background: 'rgba(94,92,87,0.32)', borderRadius: 2, display: 'block' }} />)}</div>
        : <div style={{ position: 'absolute', inset: '8px 22px auto 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>{[62, 84, 45].map((w, i) => <b key={i} style={{ width: `${w}%`, height: 3, background: 'rgba(94,92,87,0.28)', borderRadius: 2, display: 'block' }} />)}</div>)}
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: small ? 0 : 0.8, textTransform: 'uppercase', padding: small ? 0 : '2px 6px', borderRadius: 3, background: small ? 'transparent' : PAPER.sheet, color: PAPER.ink }}>{small ? (SHORT[type] || kindName(type).slice(0, 3)) : kindName(type)}</span>
      {!small && oldExam && <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999, background: PAPER.ink, color: '#fff' }}>Old exam</span>}
    </div>
  );
}

/** An uploaded file, as a sheet of paper. `corner` is the colour behind the card (so the folded corner looks cut away). */
export function FileCard({ name, type, meta, oldExam, usage, corner = PAPER.shelf, onOpen, children }: { name: string; type: string; meta: string; oldExam?: boolean; usage?: { text: string; unused?: boolean } | null; corner?: string; onOpen?: () => void; children?: ReactNode }) {
  return (
    <div data-file-card data-kind="class" style={{ background: PAPER.sheet, border: `1.5px solid ${PAPER.edge}`, borderRadius: '4px 16px 4px 4px', padding: 9, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, position: 'relative' }}>
      <span aria-hidden style={{ position: 'absolute', top: -1.5, right: -1.5, width: 16, height: 16, background: `linear-gradient(225deg, ${corner} 50%, ${PAPER.edge} 50%)`, borderBottomLeftRadius: 5 }} />
      <div onClick={onOpen} style={{ cursor: onOpen ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        <Tile type={type} oldExam={oldExam} />
        <div title={name} style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26', lineHeight: 1.25, ...clip }}>{name}</div>
        <div style={{ fontSize: 10, color: '#9E9BB0', fontWeight: 600, ...clip }}>{meta}</div>
        {usage && <div style={{ fontSize: 10, fontWeight: 700, color: usage.unused ? '#C8965A' : PAPER.ink }}>{usage.text}</div>}
      </div>
      {children}
    </div>
  );
}

/** An uploaded file as a list row (Library). */
export function FileRow({ name, type, meta, children, onOpen }: { name: string; type: string; meta: string; children?: ReactNode; onOpen?: () => void }) {
  return (
    <div data-file-row data-kind="class" style={{ background: PAPER.sheet, border: `1.5px solid ${PAPER.edge}`, borderRadius: '4px 14px 4px 4px', padding: '9px 11px', display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
      <Tile type={type} small />
      <div onClick={onOpen} style={{ flex: 1, minWidth: 0, cursor: onOpen ? 'pointer' : 'default' }}>
        <div title={name} style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26', ...clip }}>{name}</div>
        <div style={{ fontSize: 10, color: '#9E9BB0', fontWeight: 600, ...clip }}>{meta}</div>
      </div>
      {children}
    </div>
  );
}

export type MadeKind = 'guide' | 'deck' | 'exam';
export const MADE_NAMES: Record<MadeKind, string> = { guide: 'Study guide', deck: 'Flashcards', exam: 'Practice exam' };

/** Something Ascend made (study guide, deck, practice exam). `from` = names of the uploaded files it was built from. */
export function MadeCard({ kind, label, title, from, note, action, onOpen, compact, children }: { kind: MadeKind; label?: string; title: string; from?: string[]; note?: string; action: string; onOpen: () => void; compact?: boolean; children?: ReactNode }) {
  return (
    <div data-made-card={kind} data-kind="made" style={{ background: compact ? accentLight : '#FFFFFF', border: `1.5px solid ${accentMid}`, borderRadius: compact ? 999 : 18, padding: compact ? '7px 9px' : '10px 12px 10px 10px', display: 'flex', gap: compact ? 9 : 11, alignItems: 'center', minWidth: 0 }}>
      <AscendMark size={compact ? 30 : 40} />
      <div onClick={onOpen} style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: accent, ...clip }}>{label || MADE_NAMES[kind]}</span>
        <div title={title} style={{ fontSize: compact ? 12 : 13, fontWeight: 800, color: '#1D1B26', ...clip }}>{title}</div>
        {(from?.length || note) && (
          <div style={{ fontSize: 10, color: '#9E9BB0', fontWeight: 600, ...clip }}>
            {from && from.length > 0 && <>from {from.map((f, i) => <span key={i}>{i > 0 ? ' + ' : ''}<b style={{ color: PAPER.ink, fontWeight: 700 }}>{f}</b></span>)}</>}
            {from && from.length > 0 && note ? ' · ' : ''}{note}
          </div>
        )}
      </div>
      {children}
      <button onClick={onOpen} style={madeButton}>{action}</button>
    </div>
  );
}

/** Small "this was made by Ascend" header for cards on the saved-resource list pages. */
export function MadeTag({ kind, extra }: { kind: MadeKind; extra?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <AscendMark size={24} />
      <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: accent }}>{MADE_NAMES[kind]}{extra ? ` · ${extra}` : ''}</span>
    </div>
  );
}
/** Card frame for something Ascend made (rounded, edged in the theme colour). */
export const madeCardFrame: CSSProperties = { background: '#FFFFFF', border: `1.5px solid ${accentMid}`, borderRadius: 20, padding: '12px 14px 14px', boxShadow: '0 1px 6px rgba(29,27,38,0.05)', display: 'flex', flexDirection: 'column', gap: 10 };
/** Row frame for an uploaded file inside a picker (grey paper; darker when chosen). */
export const paperPick = (chosen: boolean): CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: '3px 12px 3px 3px', border: `1.5px solid ${chosen ? PAPER.ink : PAPER.edge}`, background: chosen ? PAPER.tile : PAPER.sheet, cursor: 'pointer' });
