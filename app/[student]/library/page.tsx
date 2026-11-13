'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import TabBar from '../../components/TabBar';
import { supabase } from '../../../lib/supabase';
import { useStudent } from '../../../lib/studentContext';
import { FileCard, FileRow, MadeCard, PaperMark, AscendMark, UpArrow, PAPER, kindName, type MadeKind } from '../../components/ResourceLooks';
import { noteRecent, readRecent, type RecentItem } from '../../../lib/recent';
import { uploadResourceFile, resourceTypeOf } from '../../../lib/uploadResource';

// Library: every uploaded file and everything Ascend made, across all classes, in one searchable place.
type Folder = { id: string; name: string; class_id: string; className: string };
type Item = { key: string; id: string; made: boolean; kind: string; title: string; label?: string; meta: string; folderId: string | null; href: string; action: string; created: string; oldExam?: boolean; search: string };

const day = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

export default function LibraryPage() {
  const me = useStudent();
  const studentId = me.id;
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'class' | 'made'>('all');
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [moving, setMoving] = useState<string | null>(null);
  const [moveError, setMoveError] = useState('');
  const [dest, setDest] = useState('');
  const [dropping, setDropping] = useState(false);
  const [uploadNote, setUploadNote] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data: classData } = await supabase.from('classes').select('id, name').eq('student_id', studentId).eq('is_active', true).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
    const classes = Array.isArray(classData) ? classData : [];
    const classIds = classes.map(c => c.id);
    const { data: folderData } = classIds.length ? await supabase.from('exam_folders').select('id, name, class_id').in('class_id', classIds).order('exam_date', { ascending: true }) : { data: [] };
    const className = new Map(classes.map(c => [c.id, c.name]));
    const fl: Folder[] = (Array.isArray(folderData) ? folderData : []).map(f => ({ ...f, className: className.get(f.class_id) || '' }))
      .sort((a, b) => classIds.indexOf(a.class_id) - classIds.indexOf(b.class_id));
    const folderIds = fl.map(f => f.id);
    const [res, guides, decks, exams] = await Promise.all([
      folderIds.length ? supabase.from('resources').select('id, file_name, file_type, storage_url, created_at, is_old_exam, folder_id').in('folder_id', folderIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      supabase.from('study_guides').select('id, title, created_at, folder_id').eq('student_id', studentId).order('created_at', { ascending: false }),
      supabase.from('flashcard_decks').select('id, title, card_count, created_at, folder_id').eq('student_id', studentId).order('created_at', { ascending: false }),
      supabase.from('practice_exams').select('id, title, status, score, created_at, folder_id').eq('student_id', studentId).order('created_at', { ascending: false }),
    ]);
    const list = <T,>(r: { data: unknown }) => (Array.isArray(r.data) ? r.data as T[] : []);
    const all: Item[] = [
      ...list<{ id: string; file_name: string; file_type: string; storage_url: string | null; created_at: string; is_old_exam: boolean; folder_id: string }>(res).map(r => ({ key: 'file-' + r.id, id: r.id, made: false, kind: r.file_type, title: r.file_name, meta: `Uploaded ${day(r.created_at)}${r.is_old_exam ? ' · old exam' : ''}`, folderId: r.folder_id, href: r.storage_url || '', action: 'Open', created: r.created_at, oldExam: !!r.is_old_exam, search: `${r.file_name} ${kindName(r.file_type)} ${r.is_old_exam ? 'old exam' : ''}` })),
      ...list<{ id: string; title: string; created_at: string; folder_id: string | null }>(guides).map(g => ({ key: 'guide-' + g.id, id: g.id, made: true, kind: 'guide', title: g.title, meta: day(g.created_at), folderId: g.folder_id, href: `/${studentId}/study?guideId=${g.id}`, action: 'Open', created: g.created_at, search: `${g.title} study guide` })),
      ...list<{ id: string; title: string; card_count: number; created_at: string; folder_id: string | null }>(decks).map(d => ({ key: 'deck-' + d.id, id: d.id, made: true, kind: 'deck', title: d.title, label: `Flashcards · ${d.card_count}`, meta: day(d.created_at), folderId: d.folder_id, href: `/${studentId}/flashcards?deckId=${d.id}`, action: 'Study', created: d.created_at, search: `${d.title} flashcards deck` })),
      ...list<{ id: string; title: string; status: string; score: number | null; created_at: string; folder_id: string | null }>(exams).map(e => ({ key: 'exam-' + e.id, id: e.id, made: true, kind: 'exam', title: e.title, label: e.status === 'completed' ? `Practice exam · ${e.score ?? 0}%` : 'Practice exam · in progress', meta: day(e.created_at), folderId: e.folder_id, href: `/${studentId}/practice-exam?examId=${e.id}`, action: e.status === 'completed' ? 'Review' : 'Continue', created: e.created_at, search: `${e.title} practice exam` })),
    ];
    setFolders(fl); setItems(all); setLoading(false);
    setDest(d => d || fl[0]?.id || '');
  };
  useEffect(() => { load(); setRecent(readRecent(studentId)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [studentId]);

  const folderOf = useMemo(() => new Map(folders.map(f => [f.id, f])), [folders]);
  const shown = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter(i => (filter === 'all' || (filter === 'made') === i.made) && words.every(w => { const f = i.folderId ? folderOf.get(i.folderId) : null; return `${i.search} ${f?.name || ''} ${f?.className || ''}`.toLowerCase().includes(w); }));
  }, [items, query, filter, folderOf]);
  const groups = useMemo(() => {
    const out: { key: string; title: string; rows: Item[] }[] = [];
    for (const f of folders) { const rows = shown.filter(i => i.folderId === f.id); if (rows.length) out.push({ key: f.id, title: `${f.className} · ${f.name}`, rows }); }
    const loose = shown.filter(i => !i.folderId || !folderOf.has(i.folderId));
    if (loose.length) out.push({ key: 'none', title: 'Not filed under an exam', rows: loose });
    return out.map(g => ({ ...g, rows: [...g.rows].sort((a, b) => Number(a.made) - Number(b.made) || b.created.localeCompare(a.created)) }));   // uploads first, then what was made from them
  }, [shown, folders, folderOf]);
  const counts = { class: items.filter(i => !i.made).length, made: items.filter(i => i.made).length };

  const open = (i: Item | RecentItem, sub?: string) => {
    const item: RecentItem = 'sub' in i ? i : { key: i.key, made: i.made, kind: i.kind, title: i.title, sub: sub || '', href: i.href };
    if (!item.href) return;
    noteRecent(studentId, item); setRecent(readRecent(studentId));
    if (item.made) router.push(item.href); else window.open(item.href, '_blank', 'noopener');
  };
  const move = async (item: Item, to: string) => {
    setMoveError('');
    if (!to || to === item.folderId) { setMoving(null); return; }
    const { error } = await supabase.from('resources').update({ folder_id: to }).eq('id', item.id);
    if (error) { console.error('Move failed:', error.message); setMoveError('Couldn’t move that file. Please try again.'); return; }
    setItems(prev => prev.map(x => x.key === item.key ? { ...x, folderId: to } : x)); setMoving(null);
  };
  const upload = async (list: FileList | null) => {
    const files = [...(list || [])];
    if (files.length === 0 || busy) return;
    if (!dest) { setUploadNote('Add a class with an exam folder first, then upload into it.'); return; }
    setBusy(true); let done = 0; const failed: string[] = [];
    for (const file of files) {
      setUploadNote(`Uploading ${done + 1} of ${files.length}: ${file.name}`);
      if (!resourceTypeOf(file.name)) failed.push(`${file.name} (not a supported kind of file)`);
      else { try { await uploadResourceFile({ file, studentId, folderId: dest }); } catch (err) { failed.push(`${file.name} (${err instanceof Error ? err.message : 'failed'})`); } }
      done++;
    }
    const f = folderOf.get(dest);
    setUploadNote(failed.length ? `Added ${files.length - failed.length} of ${files.length}. Couldn’t add: ${failed.join('; ')}` : `Added ${files.length} file${files.length === 1 ? '' : 's'} to ${f ? `${f.className} · ${f.name}` : 'the folder'}.`);
    if (fileInput.current) fileInput.current.value = '';
    setBusy(false); load();
  };

  const tab = (key: 'all' | 'class' | 'made'): React.CSSProperties => {
    const on = filter === key;
    const base: React.CSSProperties = { fontSize: 11, fontWeight: 800, padding: '9px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: on || filter === 'all' ? 1 : 0.55 };
    if (key === 'all') return { ...base, opacity: 1, borderRadius: 999, padding: '9px 16px', border: '1.5px solid #1D1B26', background: on ? '#1D1B26' : 'transparent', color: on ? '#fff' : '#1D1B26' };
    if (key === 'class') return { ...base, borderRadius: '4px 12px 4px 4px', background: PAPER.sheet, border: `${on ? 2 : 1.5}px solid ${on ? PAPER.ink : PAPER.edge}`, color: PAPER.ink };
    return { ...base, borderRadius: 999, background: 'var(--accent-light)', border: `${on ? 2 : 1.5}px solid ${on ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 30%, white)'}`, color: 'var(--accent-dark)' };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 8, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href={`/${studentId}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="22" height="20" viewBox="0 0 60 56" fill="none" aria-hidden="true"><path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" /><path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" /><line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round" /></svg>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px 110px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Link href={`/${studentId}/classes`} style={{ fontSize: 12, fontWeight: 700, color: '#6B6880', textDecoration: 'none' }}>← Classes</Link>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>{me.name}</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', margin: 0 }}>Library</h1>
          </div>
          {!loading && <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: 'var(--accent-light)', color: 'var(--accent)' }}>{items.length} item{items.length === 1 ? '' : 's'}</span>}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: PAPER.ink, fontWeight: 600 }}><PaperMark size={22} /> Grey paper = from class</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--accent-dark)', fontWeight: 600 }}><AscendMark size={22} /> Your colour = made by Ascend</div>
        </div>

        <input aria-label="Search the library" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search files, guides, decks, exams"
          style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E8E5F0', borderRadius: 12, fontFamily: 'var(--font-jakarta)', fontSize: 16, color: '#1D1B26', background: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }} />
        <div role="radiogroup" aria-label="Show" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: 6 }}>
          <button role="radio" aria-checked={filter === 'all'} onClick={() => setFilter('all')} style={tab('all')}>All</button>
          <button role="radio" aria-checked={filter === 'class'} onClick={() => setFilter('class')} style={tab('class')}><UpArrow size={12} />From class · {counts.class}</button>
          <button role="radio" aria-checked={filter === 'made'} onClick={() => setFilter('made')} style={tab('made')}>Made by Ascend · {counts.made}</button>
        </div>

        {recent.length > 0 && !query.trim() && filter === 'all' && (
          <section aria-label="Recently opened" data-recent>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.2, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 8 }}>Recently opened</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2, alignItems: 'stretch' }}>
              {recent.map(r => r.made ? (
                <div key={r.key} data-kind="made" onClick={() => open(r)} style={{ flex: '0 0 150px', boxSizing: 'border-box', background: 'var(--accent-light)', border: '1.5px solid color-mix(in srgb, var(--accent) 30%, white)', borderRadius: 18, padding: 10, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <AscendMark size={30} />
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--accent)' }}>{r.kind === 'guide' ? 'Study guide' : r.kind === 'deck' ? 'Flashcards' : 'Practice exam'}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#1D1B26', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                  <div style={{ fontSize: 10, color: '#9E9BB0', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.sub}</div>
                </div>
              ) : (
                <div key={r.key} style={{ flex: '0 0 132px', minWidth: 0 }}><FileCard name={r.title} type={r.kind} meta={r.sub} corner="#FAFAF8" onOpen={() => open(r)} /></div>
              ))}
            </div>
          </section>
        )}

        {loading ? <div style={{ textAlign: 'center', padding: '40px 0', color: '#9E9BB0', fontSize: 13 }}>Loading your library…</div>
          : items.length === 0 ? (
            <div style={{ border: '1.5px dashed #C4C1D4', borderRadius: 18, padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26', marginBottom: 6 }}>Nothing here yet</div>
              <div style={{ fontSize: 13, color: '#9E9BB0', lineHeight: 1.5 }}>Upload what your professor gave you into an exam folder. Everything you upload, and everything Ascend makes from it, shows up here.</div>
            </div>
          ) : groups.length === 0 ? <div style={{ textAlign: 'center', padding: '28px 0', color: '#9E9BB0', fontSize: 13 }}>Nothing matches{query.trim() ? ` “${query.trim()}”` : ''}.</div>
          : groups.map(g => (
            <section key={g.key} data-group={g.title} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#6B6880', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}><span>{g.title}</span><span style={{ color: '#9E9BB0' }}>{g.rows.length}</span></div>
              {g.rows.map(i => i.made ? (
                <MadeCard key={i.key} compact kind={i.kind as MadeKind} label={i.label} title={i.title} note={i.meta} action={i.action} onOpen={() => open(i, g.title)} />
              ) : (
                <FileRow key={i.key} name={i.title} type={i.kind} meta={i.meta} onOpen={i.href ? () => open(i, g.title) : undefined}>
                  {moving === i.key ? (
                    <select aria-label={`Move ${i.title} to`} autoFocus defaultValue={i.folderId || ''} onChange={e => move(i, e.target.value)} onBlur={() => setMoving(null)} style={{ maxWidth: 150, fontSize: 12, padding: '6px 8px', borderRadius: 8, border: `1.5px solid ${PAPER.edge}`, background: PAPER.sheet, color: PAPER.ink, fontFamily: 'var(--font-jakarta)' }}>
                      {folders.map(f => <option key={f.id} value={f.id}>{f.className} · {f.name}</option>)}
                    </select>
                  ) : folders.length > 1 && (
                    <button onClick={() => { setMoving(i.key); setMoveError(''); }} aria-label={`Move ${i.title}`} style={{ fontSize: 10, fontWeight: 800, padding: '5px 10px', borderRadius: 6, border: 'none', background: PAPER.tile, color: PAPER.ink, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0 }}>Move</button>
                  )}
                </FileRow>
              ))}
            </section>
          ))}
        {moveError && <div role="alert" style={{ fontSize: 12, fontWeight: 600, color: '#C47878' }}>{moveError}</div>}

        {/* Add class files: several at once, or dropped from a computer */}
        {!loading && folders.length > 0 && filter !== 'made' && (
          <section aria-label="Add class files" data-dropzone onDragOver={e => { e.preventDefault(); setDropping(true); }} onDragLeave={() => setDropping(false)} onDrop={e => { e.preventDefault(); setDropping(false); upload(e.dataTransfer.files); }}
            style={{ border: `1.5px dashed ${dropping ? PAPER.ink : PAPER.edge}`, background: PAPER.shelf, borderRadius: '4px 16px 4px 4px', padding: 14, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: PAPER.ink }}>Add class files</div>
            <div style={{ fontSize: 11, color: '#6B6880', lineHeight: 1.5 }}>Choose where they go, then pick as many as you like (or drop them here from a computer). PDFs, slides, images and audio.</div>
            <select aria-label="Upload into" value={dest} onChange={e => setDest(e.target.value)} style={{ width: '100%', fontSize: 16, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${PAPER.edge}`, background: PAPER.sheet, color: '#1D1B26', fontFamily: 'var(--font-jakarta)' }}>
              {folders.map(f => <option key={f.id} value={f.id}>{f.className} · {f.name}</option>)}
            </select>
            <input ref={fileInput} type="file" multiple accept=".pdf,.pptx,.ppt,.mp3,.m4a,.wav,.ogg,.png,.jpg,.jpeg,.webp" onChange={e => upload(e.target.files)} style={{ display: 'none' }} />
            <button onClick={() => fileInput.current?.click()} disabled={busy} style={{ padding: '11px', borderRadius: 8, border: `1.5px solid ${PAPER.edge}`, background: PAPER.sheet, color: PAPER.ink, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: busy ? 0.6 : 1 }}>{busy ? 'Uploading…' : 'Choose files'}</button>
            {uploadNote && <div role="status" style={{ fontSize: 11, fontWeight: 700, color: /Couldn|first/.test(uploadNote) ? '#C47878' : PAPER.ink, lineHeight: 1.5 }}>{uploadNote}</div>}
            <div style={{ fontSize: 10, color: '#9E9BB0' }}>For a video link, or to mark an old exam while uploading, use + Upload inside the exam folder.</div>
          </section>
        )}
      </main>
      <TabBar student={studentId} />
    </div>
  );
}
