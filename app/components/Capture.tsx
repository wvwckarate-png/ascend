'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { uploadResourceFile } from '../../lib/uploadResource';
import { localDateStr } from '../../lib/dates';
import OldExamToggle from './OldExamToggle';
import { PAPER, PaperMark } from './ResourceLooks';

// Fast capture of class material, straight into an exam folder:
//   photo  — snap the whiteboard, a handout or a graded exam (several shots in one go); the text is read for the AI.
//   record — record the lecture in the app; it is transcribed after saving.
// Both produce ordinary "From class" files, so this is drawn in the grey-paper look.
type Folder = { id: string; label: string; exam_date: string | null };
type Saved = { id: string; file_name: string; file_type: string; storage_url: string | null; created_at: string; is_old_exam?: boolean; folder_id: string };
const MAX_AUDIO = 24 * 1024 * 1024;   // the transcriber takes up to 25 MB
const stamp = () => new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const button: React.CSSProperties = { padding: '12px', borderRadius: 10, border: `1.5px solid ${PAPER.edge}`, background: PAPER.sheet, color: PAPER.ink, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' };
const primary = (off: boolean): React.CSSProperties => ({ ...button, background: PAPER.ink, borderColor: PAPER.ink, color: '#fff', opacity: off ? 0.5 : 1 });
const field: React.CSSProperties = { width: '100%', fontSize: 16, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${PAPER.edge}`, background: PAPER.sheet, color: '#1D1B26', fontFamily: 'var(--font-jakarta)', boxSizing: 'border-box' };

export default function Capture({ studentId, mode, folderId, onClose, onSaved }: { studentId: string; mode: 'photo' | 'record'; folderId?: string; onClose: () => void; onSaved?: (rows: Saved[]) => void }) {
  const [folders, setFolders] = useState<Folder[] | null>(null);
  const [dest, setDest] = useState(folderId || '');
  const [oldExam, setOldExam] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  // photo
  const [shots, setShots] = useState<{ file: File; url: string }[]>([]);
  const camera = useRef<HTMLInputElement>(null);
  // record
  const [phase, setPhase] = useState<'idle' | 'recording' | 'ready'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [clip, setClip] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [cutShort, setCutShort] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const bytes = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: classes } = await supabase.from('classes').select('id, name').eq('student_id', studentId).eq('is_active', true).order('sort_order', { ascending: true, nullsFirst: false });
      const classList = Array.isArray(classes) ? classes : [];
      const { data: rows } = classList.length ? await supabase.from('exam_folders').select('id, name, exam_date, class_id').in('class_id', classList.map(c => c.id)) : { data: [] };
      const nameOf = new Map(classList.map(c => [c.id, c.name]));
      const list: Folder[] = (Array.isArray(rows) ? rows : []).map(f => ({ id: f.id, label: `${nameOf.get(f.class_id) || ''} · ${f.name}`, exam_date: f.exam_date }));
      // Default to the next exam coming up: that is almost always what today's lecture is for.
      const today = localDateStr(new Date());
      const upcoming = list.filter(f => f.exam_date && f.exam_date >= today).sort((a, b) => a.exam_date!.localeCompare(b.exam_date!));
      setFolders(list);
      setDest(d => (d && list.some(f => f.id === d) ? d : upcoming[0]?.id || list[0]?.id || ''));
    })();
  }, [studentId]);

  useEffect(() => { if (phase !== 'recording') return; const t = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(t); }, [phase]);
  // Leaving the sheet always lets go of the microphone and the screen lock.
  const release = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; wake.current?.release().catch(() => {}); wake.current = null; };
  useEffect(() => () => { try { if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop(); } catch {} release(); }, []);
  const shotUrls = useMemo(() => shots.map(s => s.url), [shots]);
  useEffect(() => () => { shotUrls.forEach(u => URL.revokeObjectURL(u)); }, [shotUrls]);

  const addShots = (list: FileList | null) => {
    const files = [...(list || [])].filter(f => f.type.startsWith('image/') || /\.(png|jpe?g|webp|heic)$/i.test(f.name));
    if (files.length) setShots(prev => [...prev, ...files.map(file => ({ file, url: URL.createObjectURL(file) }))]);
    if (camera.current) camera.current.value = '';
  };

  const startRecording = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('This browser can’t record audio. You can still record with your phone’s voice memo app and upload the file.'); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: true } });
      stream.current = s;
      const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
      const rec = new MediaRecorder(s, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });   // speech quality: about an hour and a half fits
      chunks.current = []; bytes.current = 0; setCutShort(false);
      rec.ondataavailable = e => { if (!e.data.size) return; chunks.current.push(e.data); bytes.current += e.data.size; if (bytes.current > MAX_AUDIO && rec.state === 'recording') { setCutShort(true); rec.stop(); } };
      rec.onstop = () => {
        const mime = rec.mimeType || type || 'audio/webm';
        const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
        const title = `Lecture recording ${stamp()}`;
        setClip(new File(chunks.current, `${title}.${ext}`, { type: mime })); setName(title); setPhase('ready'); release();
      };
      rec.start(5000); recorder.current = rec; setSeconds(0); setPhase('recording');
      try { wake.current = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null; } catch { /* the screen may dim; recording continues while Ascend stays open */ }
    } catch (e) {
      release();
      setError((e as Error).name === 'NotAllowedError' ? 'Ascend isn’t allowed to use the microphone. Allow it in your browser settings and try again.' : 'Couldn’t start recording. Check that a microphone is available.');
    }
  };
  const stopRecording = () => { if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop(); };

  const save = async () => {
    if (!dest || busy) return;
    setError('');
    const todo: { file: File; name?: string }[] = mode === 'photo'
      ? shots.map((s, i) => ({ file: s.file, name: `Photo ${stamp()}${shots.length > 1 ? ` (${i + 1})` : ''}` }))
      : clip ? [{ file: clip, name: name.trim() || undefined }] : [];
    if (todo.length === 0) return;
    const rows: Saved[] = []; const failed: string[] = [];
    for (let i = 0; i < todo.length; i++) {
      setBusy(mode === 'photo' ? `Saving ${i + 1} of ${todo.length}…` : 'Saving and transcribing… this can take a minute');
      try { rows.push(await uploadResourceFile({ file: todo[i].file, studentId, folderId: dest, name: todo[i].name, oldExam })); }
      catch (e) { failed.push(e instanceof Error ? e.message : 'failed'); }
    }
    setBusy('');
    if (rows.length) { onSaved?.(rows); window.dispatchEvent(new Event('ascend:data-changed')); }
    if (failed.length) { setError(`${failed.length} of ${todo.length} couldn’t be saved (${failed[0]}). ${rows.length ? 'The rest were saved.' : 'Nothing was saved; try again.'}`); if (rows.length && mode === 'photo') setShots([]); return; }
    const where = folders?.find(f => f.id === dest)?.label || 'the folder';
    setDone(mode === 'photo' ? `Saved ${rows.length} photo${rows.length === 1 ? '' : 's'} to ${where}.` : `Saved to ${where}.`);
    setTimeout(onClose, 1300);
  };

  const close = () => { if (phase === 'recording' && !confirm('Stop and discard this recording?')) return; onClose(); };
  const ready = mode === 'photo' ? shots.length > 0 : phase === 'ready' && !!clip;

  return (
    <div data-capture={mode} onClick={e => { if (e.target === e.currentTarget && !busy) close(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: PAPER.shelf, borderRadius: '6px 26px 6px 6px', padding: '20px 18px 22px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(29,27,38,0.18)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PaperMark />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26' }}>{mode === 'photo' ? 'Snap class material' : 'Record the lecture'}</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: PAPER.ink }}>{mode === 'photo' ? 'Whiteboard, handout or graded exam. The text is read for you.' : 'Saved as a class file and written out as text.'}</div>
          </div>
          <button aria-label="Close" onClick={close} disabled={!!busy} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: PAPER.sheet, color: PAPER.ink, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>✕</button>
        </div>

        {folders === null ? <div style={{ fontSize: 12, color: '#9E9BB0' }}>Loading your exams…</div> : folders.length === 0 ? (
          <div style={{ fontSize: 13, color: '#6B6880', lineHeight: 1.5, background: PAPER.sheet, borderRadius: 8, padding: 12 }}>Add a class with an exam folder first; that is where this will be filed.</div>
        ) : done ? <div role="status" style={{ fontSize: 14, fontWeight: 800, color: '#3F8A6C', background: '#EDF7F2', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>{done}</div> : (
          <>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: PAPER.ink }}>File it under
              <select aria-label="File it under" value={dest} onChange={e => setDest(e.target.value)} disabled={!!busy} style={{ ...field, marginTop: 6, textTransform: 'none', letterSpacing: 0, fontWeight: 600 }}>
                {folders.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </label>

            {mode === 'photo' ? (
              <>
                <input ref={camera} type="file" accept="image/*" capture="environment" multiple onChange={e => addShots(e.target.files)} style={{ display: 'none' }} />
                {shots.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8 }}>
                    {shots.map((s, i) => (
                      <div key={s.url} style={{ position: 'relative', aspectRatio: '1', borderRadius: 4, overflow: 'hidden', border: `1.5px solid ${PAPER.edge}`, background: PAPER.tile }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.url} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button aria-label={`Remove photo ${i + 1}`} onClick={() => setShots(prev => prev.filter(x => x.url !== s.url))} disabled={!!busy} style={{ position: 'absolute', top: 3, right: 3, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(29,27,38,0.7)', color: '#fff', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={() => camera.current?.click()} disabled={!!busy} style={button}>{shots.length ? 'Take another' : 'Take a photo'}</button>
                <OldExamToggle value={oldExam} onChange={setOldExam} />
              </>
            ) : (
              <>
                <div data-recorder={phase} style={{ background: PAPER.sheet, border: `1.5px solid ${PAPER.edge}`, borderRadius: 10, padding: '18px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 34, fontWeight: 800, color: '#1D1B26', fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>{clock(seconds)}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: phase === 'recording' ? '#C47878' : PAPER.ink, marginTop: 2 }}>
                    {phase === 'recording' ? '● Recording. Keep Ascend open and the phone near the speaker.' : phase === 'ready' ? (cutShort ? 'Stopped at the size limit (about an hour and a half). Save this part, then start another.' : 'Recorded. Name it and save.') : 'Up to about an hour and a half per recording.'}
                  </div>
                </div>
                {phase === 'idle' && <button onClick={startRecording} style={primary(false)}>Start recording</button>}
                {phase === 'recording' && <button onClick={stopRecording} style={{ ...button, background: '#C47878', borderColor: '#C47878', color: '#fff' }}>Stop</button>}
                {phase === 'ready' && (
                  <>
                    <input aria-label="Recording name" value={name} onChange={e => setName(e.target.value)} disabled={!!busy} style={field} />
                    <button onClick={() => { setClip(null); setPhase('idle'); setSeconds(0); }} disabled={!!busy} style={button}>Discard and record again</button>
                  </>
                )}
              </>
            )}

            {error && <div role="alert" style={{ fontSize: 12, fontWeight: 600, color: '#C47878', lineHeight: 1.5 }}>{error}</div>}
            {busy && <div role="status" style={{ fontSize: 12, fontWeight: 700, color: PAPER.ink }}>{busy}</div>}
            {ready && <button onClick={save} disabled={!!busy || !dest} style={primary(!!busy || !dest)}>{busy ? 'Saving…' : mode === 'photo' ? `Save ${shots.length} photo${shots.length === 1 ? '' : 's'}` : 'Save recording'}</button>}
          </>
        )}
      </div>
    </div>
  );
}
