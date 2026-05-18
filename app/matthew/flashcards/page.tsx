'use client';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import TabBar from '../../components/TabBar';
import { supabase } from '../../../lib/supabase';

function Mountain() {
  return (
    <svg width="22" height="20" viewBox="0 0 60 56" fill="none">
      <path d="M4 52L22 10L40 52" stroke="#7B6FA0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M31 52L42 28L53 52" stroke="#7B6FA0" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="2" y1="52" x2="56" y2="52" stroke="#7B6FA0" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconFile({ c, size = 14 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M6 4h10l6 6v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <path d="M16 4v6h6" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconFolder({ c, size = 14 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M3 9a2 2 0 012-2h5l2 2h11a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

function IconEmptyFolder({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <path d="M4 11a2 2 0 012-2h6l3 3h14a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V11z" stroke="#C4C1D4" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <line x1="12" y1="20" x2="24" y2="20" stroke="#E8E5F0" strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="12" y1="24" x2="19" y2="24" stroke="#E8E5F0" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconCards({ c, size = 40 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="5" y="8" width="16" height="12" rx="2" stroke={c} strokeWidth="1.6" fill="none"/>
      <rect x="8" y="5" width="16" height="12" rx="2" stroke={c} strokeWidth="1.6" fill="#EDE9F7" strokeOpacity="0.7"/>
      <line x1="11" y1="11" x2="21" y2="11" stroke={c} strokeWidth="1.2" strokeOpacity="0.5"/>
    </svg>
  );
}

function IconStack({ c, size = 14 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="4" y="14" width="20" height="10" rx="2" stroke={c} strokeWidth="1.5" fill="none"/>
      <rect x="6" y="9"  width="16" height="8"  rx="2" stroke={c} strokeWidth="1.4" fill="none" opacity="0.6"/>
      <rect x="8" y="4"  width="12" height="8"  rx="2" stroke={c} strokeWidth="1.3" fill="none" opacity="0.35"/>
    </svg>
  );
}

function IconLightbulb({ c, size = 14 }: { c: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <path d="M14 4a8 8 0 016 13.2V19a2 2 0 01-2 2h-8a2 2 0 01-2-2v-1.8A8 8 0 0114 4z" stroke={c} strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
      <line x1="10" y1="22" x2="18" y2="22" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="11" y1="25" x2="17" y2="25" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
      <line x1="14" y1="8" x2="14" y2="13" stroke={c} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconDone({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="28" stroke="#7B6FA0" strokeWidth="2" fill="#EDE9F7"/>
      <path d="M20 33l8 8 16-16" stroke="#7B6FA0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

type Card        = { id?: string; front: string; back: string; front_image_url?: string | null; back_image_url?: string | null; };
type Deck        = { id: string; title: string; source_files: string | null; card_count: number; created_at: string; class_name?: string | null; folder_name?: string | null; folder_id?: string | null; };
type LibResource = { id: string; file_name: string; storage_url: string; folder_id: string; };
type LibFolder   = { id: string; name: string; class_id: string; resources: LibResource[]; };
type LibClass    = { id: string; name: string; folders: LibFolder[]; };

function requeue(q: Card[], idx: number, conf: number): Card[] {
  const card = q[idx];
  const rest = q.filter((_, i) => i !== idx);
  if (conf === 3) return rest;
  const pos = Math.min([3, 8, 18, 999][conf], rest.length);
  rest.splice(pos, 0, card);
  return rest;
}

const color = '#7B6FA0';
const light = '#EDE9F7';

function MatthewFlashcardsInner() {
  const searchParams = useSearchParams();
  const folderId   = searchParams.get('folderId');
  const folderName = searchParams.get('folderName');

  const [screen, setScreen] = useState<'decks' | 'generate' | 'study' | 'done' | 'deck-detail'>('decks');

  const [decks,        setDecks]        = useState<Deck[]>([]);
  const [decksLoading, setDecksLoading] = useState(true);
  const [activeDeck,   setActiveDeck]   = useState<Deck | null>(null);
  const [deckCards,    setDeckCards]    = useState<Card[]>([]);
  const [deckLoading,  setDeckLoading]  = useState(false);

  const [lightboxUrl,     setLightboxUrl]     = useState<string | null>(null);
  const [showAddCard,     setShowAddCard]     = useState(false);
  const [editCardId,      setEditCardId]      = useState<string | null>(null);
  const [newFront,        setNewFront]        = useState('');
  const [newBack,         setNewBack]         = useState('');
  const [frontImageFile,  setFrontImageFile]  = useState<File | null>(null);
  const [backImageFile,   setBackImageFile]   = useState<File | null>(null);
  const [frontImageUrl,   setFrontImageUrl]   = useState<string | null>(null);
  const [backImageUrl,    setBackImageUrl]    = useState<string | null>(null);
  const [cardSaving,      setCardSaving]      = useState(false);

  const [library,         setLibrary]         = useState<LibClass[]>([]);
  const [libLoading,      setLibLoading]       = useState(true);
  const [selectedIds,     setSelectedIds]      = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses]  = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders]  = useState<Set<string>>(new Set());
  const [newFiles,        setNewFiles]         = useState<File[]>([]);
  const [fileInputRef,    setFileInputRef]     = useState<HTMLInputElement | null>(null);

  const [topic,              setTopic]              = useState('');
  const [count,              setCount]              = useState(15);
  const [autoCount,          setAutoCount]          = useState(false);
  const [mode,               setMode]               = useState<'basic' | 'smart'>('smart');
  const [customInstructions, setCustomInstructions] = useState('');

  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [cards,       setCards]       = useState<Card[]>([]);
  const [queue,       setQueue]       = useState<Card[]>([]);
  const [qi,          setQi]          = useState(0);
  const [flipped,     setFlipped]     = useState(false);
  const [ratings,     setRatings]     = useState<Record<number, number>>({});
  const [deckName,    setDeckName]    = useState('');
  const [showSave,    setShowSave]    = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [savedDeckId,     setSavedDeckId]     = useState<string | null>(null);
  const [scheduleReview,  setScheduleReview]  = useState(false);

  useEffect(() => { loadDecks(); loadLibrary(); }, []);
  useEffect(() => { if (folderId) setScreen('generate'); }, [folderId]);

  const loadDecks = async () => {
    setDecksLoading(true);
    const { data } = await supabase.from('flashcard_decks').select('*').eq('student_id', 'matthew').order('created_at', { ascending: false });
    if (data) {
      const folderIds = data.map(d => d.folder_id).filter(Boolean);
      let folderMap: Record<string, { name: string; class_id: string }> = {};
      let classMap: Record<string, string> = {};
      if (folderIds.length > 0) {
        const { data: folders } = await supabase.from('exam_folders').select('id, name, class_id').in('id', folderIds);
        if (folders) {
          folders.forEach(f => { folderMap[f.id] = { name: f.name, class_id: f.class_id }; });
          const classIds = folders.map(f => f.class_id);
          const { data: classes } = await supabase.from('classes').select('id, name').in('id', classIds);
          if (classes) classes.forEach(c => { classMap[c.id] = c.name; });
        }
      }
      setDecks(data.map(d => ({
        ...d,
        folder_name: d.folder_id ? folderMap[d.folder_id]?.name : undefined,
        class_name:  d.folder_id ? classMap[folderMap[d.folder_id]?.class_id] : undefined,
      })));
    }
    setDecksLoading(false);
  };

  const loadLibrary = async () => {
    setLibLoading(true);
    const { data: classData } = await supabase.from('classes').select('id, name').eq('student_id', 'matthew').eq('is_active', true).order('created_at', { ascending: true });
    if (!classData || classData.length === 0) { setLibLoading(false); return; }
    const classIds = classData.map(c => c.id);
    const { data: folderData } = await supabase.from('exam_folders').select('id, name, class_id').in('class_id', classIds).order('exam_date', { ascending: true });
    const folderIds = (folderData || []).map(f => f.id);
    let resourceData: any[] = [];
    if (folderIds.length > 0) {
      const { data } = await supabase.from('resources').select('id, file_name, file_type, storage_url, folder_id').in('folder_id', folderIds).in('file_type', ['pdf', 'youtube', 'audio', 'image', 'pptx']).not('storage_url', 'is', null);
      resourceData = data || [];
    }
    const rByFolder: Record<string, LibResource[]> = {};
    resourceData.forEach(r => { if (!rByFolder[r.folder_id]) rByFolder[r.folder_id] = []; rByFolder[r.folder_id].push(r); });
    const fByClass: Record<string, LibFolder[]> = {};
    (folderData || []).forEach(f => { if (!fByClass[f.class_id]) fByClass[f.class_id] = []; fByClass[f.class_id].push({ ...f, resources: rByFolder[f.id] || [] }); });
    const lib = classData.map(c => ({ ...c, folders: (fByClass[c.id] || []).filter(f => f.resources.length > 0) })).filter(c => c.folders.length > 0);
    setLibrary(lib);
    if (folderId) {
      const folder = (folderData || []).find(f => f.id === folderId);
      if (folder) {
        setExpandedClasses(new Set([folder.class_id]));
        setExpandedFolders(new Set([folderId]));
        setSelectedIds(new Set((rByFolder[folderId] || []).map(r => r.id)));
        if (folderName) setTopic(folderName);
      }
    }
    setLibLoading(false);
  };

  const openDeck = async (deck: Deck) => {
    setActiveDeck(deck);
    setDeckLoading(true);
    setScreen('deck-detail');
    const { data } = await supabase.from('flashcard_cards').select('*').eq('deck_id', deck.id).order('position', { ascending: true });
    if (data) setDeckCards(data);
    setDeckLoading(false);
  };

  const studyDeck = (deck: Deck, cards: Card[]) => {
    setCards(cards); setQueue([...cards]);
    setQi(0); setFlipped(false); setRatings({});
    setSaved(true); setSavedDeckId(deck.id); setShowSave(false);
    setScreen('study');
  };

  const deleteDeck = async (deckId: string) => {
    await supabase.from('flashcard_decks').delete().eq('id', deckId);
    setDecks(prev => prev.filter(d => d.id !== deckId));
    if (activeDeck?.id === deckId) setScreen('decks');
  };

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxDim = 800;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas failed')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const uploadCardImage = async (file: File, cardId: string, side: 'front' | 'back'): Promise<string | null> => {
    try {
      const compressed = await compressImage(file);
      const base64 = compressed.split(',')[1];
      const byteArray = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      const path = `matthew/${cardId}_${side}.jpg`;
      const { error } = await supabase.storage.from('card-images').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) return null;
      const { data } = supabase.storage.from('card-images').getPublicUrl(path);
      return data.publicUrl;
    } catch { return null; }
  };

  const saveCard = async () => {
    if ((!newFront.trim() && !frontImageFile && !frontImageUrl) || (!newBack.trim() && !backImageFile && !backImageUrl) || !activeDeck) return;
    setCardSaving(true);
    if (editCardId) {
      let newFrontUrl = frontImageUrl;
      let newBackUrl  = backImageUrl;
      if (frontImageFile) newFrontUrl = await uploadCardImage(frontImageFile, editCardId, 'front');
      if (backImageFile)  newBackUrl  = await uploadCardImage(backImageFile,  editCardId, 'back');
      await supabase.from('flashcard_cards').update({ front: newFront.trim(), back: newBack.trim(), front_image_url: newFrontUrl, back_image_url: newBackUrl }).eq('id', editCardId);
      setDeckCards(prev => prev.map(c => c.id === editCardId ? { ...c, front: newFront.trim(), back: newBack.trim(), front_image_url: newFrontUrl, back_image_url: newBackUrl } : c));
    } else {
      const { data } = await supabase.from('flashcard_cards').insert({ deck_id: activeDeck.id, front: newFront.trim(), back: newBack.trim(), front_image_url: null, back_image_url: null, position: deckCards.length }).select().single();
      if (data) {
        let newFrontUrl = null;
        let newBackUrl  = null;
        if (frontImageFile) newFrontUrl = await uploadCardImage(frontImageFile, data.id, 'front');
        if (backImageFile)  newBackUrl  = await uploadCardImage(backImageFile,  data.id, 'back');
        if (newFrontUrl || newBackUrl) {
          await supabase.from('flashcard_cards').update({ front_image_url: newFrontUrl, back_image_url: newBackUrl }).eq('id', data.id);
        }
        setDeckCards(prev => [...prev, { ...data, front_image_url: newFrontUrl, back_image_url: newBackUrl }]);
        await supabase.from('flashcard_decks').update({ card_count: deckCards.length + 1 }).eq('id', activeDeck.id);
        setDecks(prev => prev.map(d => d.id === activeDeck.id ? { ...d, card_count: deckCards.length + 1 } : d));
      }
    }
    setNewFront(''); setNewBack(''); setFrontImageFile(null); setBackImageFile(null); setFrontImageUrl(null); setBackImageUrl(null); setEditCardId(null); setShowAddCard(false);
    setCardSaving(false);
  };

  const deleteCard = async (cardId: string) => {
    await supabase.from('flashcard_cards').delete().eq('id', cardId);
    const updated = deckCards.filter(c => c.id !== cardId);
    setDeckCards(updated);
    if (activeDeck) {
      await supabase.from('flashcard_decks').update({ card_count: updated.length }).eq('id', activeDeck.id);
      setDecks(prev => prev.map(d => d.id === activeDeck.id ? { ...d, card_count: updated.length } : d));
    }
  };

  const startEdit = (card: Card) => {
    setEditCardId(card.id || null);
    setNewFront(card.front);
    setNewBack(card.back);
    setFrontImageUrl(card.front_image_url || null);
    setBackImageUrl(card.back_image_url || null);
    setFrontImageFile(null);
    setBackImageFile(null);
    setShowAddCard(true);
  };

  const toggleResource = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleFolder   = (folder: LibFolder) => { const ids = folder.resources.map(r => r.id); const allSel = ids.length > 0 && ids.every(id => selectedIds.has(id)); setSelectedIds(prev => { const n = new Set(prev); allSel ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; }); };
  const toggleClass    = (cls: LibClass)    => { const ids = cls.folders.flatMap(f => f.resources.map(r => r.id)); const allSel = ids.length > 0 && ids.every(id => selectedIds.has(id)); setSelectedIds(prev => { const n = new Set(prev); allSel ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id)); return n; }); };
  const handleNewFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const selected = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf'); setNewFiles(prev => [...prev, ...selected]); e.target.value = ''; };

  const totalSelected = selectedIds.size + newFiles.length;
  const canGenerate   = totalSelected > 0 || topic.trim().length > 0;
  const countLabel    = autoCount ? 'Auto' : String(count);

  const generate = async () => {
    if (!canGenerate) return;
    setLoading(true); setError('');
    try {
      const allResources = library.flatMap(c => c.folders.flatMap(f => f.resources));
      const selectedResources = allResources.filter(r => selectedIds.has(r.id));

      // Fetch transcripts from selected folders
      const selectedFolderIds = [...new Set(selectedResources.map(r => r.folder_id))];
      let transcripts: { name: string; text: string }[] = [];
      if (selectedFolderIds.length > 0) {
        const { data: transcriptResources } = await supabase
          .from('resources')
          .select('file_name, transcript')
          .in('folder_id', selectedFolderIds)
          .not('transcript', 'is', null);
        if (transcriptResources) {
          transcripts = transcriptResources.map(r => ({ name: r.file_name, text: r.transcript }));
        }
      }

      const fetchedFiles: File[] = [];
      for (const r of selectedResources) {
        if (!r.storage_url) continue;
        try { const res = await fetch(r.storage_url); const blob = await res.blob(); fetchedFiles.push(new File([blob], r.file_name + '.pdf', { type: 'application/pdf' })); } catch { /* skip */ }
      }
      const allFiles = [...fetchedFiles, ...newFiles];
      const countPhrase = autoCount
        ? 'as many flashcards as needed to comprehensively cover all key concepts (determine the ideal number yourself)'
        : `${count} flashcards`;
      const baseInstruction = totalSelected > 1
        ? `You are Ascend, a test-prep assistant for Matthew, a pre-dental high school junior. Your goal is to help him get an A in THIS class. Analyze these ${allFiles.length} documents and identify the highest-yield concepts — topics that appear repeatedly, are emphasized, or are most likely to be tested. Generate ${countPhrase} focused strictly on these high-yield concepts. Do not go deeper than what the professor's materials cover.${topic.trim() ? ` Additional focus: ${topic.trim()}.` : ''}`
        : `You are Ascend, a test-prep assistant for Matthew, a pre-dental high school junior. Generate ${countPhrase}${topic.trim() ? ` focused on: ${topic.trim()}` : ' from the uploaded material'}. Focus only on the most testable concepts from what was actually taught. Do not expand beyond the scope of the provided material.`;
      const custom = customInstructions.trim() ? ` Additional instructions: ${customInstructions.trim()}` : '';
      const prompt = baseInstruction + custom + ' Return ONLY a JSON array with no markdown, no backticks, no explanation. Format: [{"front":"question","back":"answer"}]';
      let raw = '';
      if (allFiles.length > 0 || transcripts.length > 0) {
        const formData = new FormData();
        allFiles.forEach(f => formData.append('files', f));
        formData.append('student', 'matthew');
        formData.append('prompt', prompt);
        formData.append('type', 'flashcards');
        if (transcripts.length > 0) formData.append('transcripts', JSON.stringify(transcripts));
        const res = await fetch('/api/generate-study-guide', { method: 'POST', body: formData });
        const data = await res.json();
        raw = (data.studyGuide || data.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      } else {
        const res = await fetch('/api/generate-study-guide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, student: 'matthew', transcripts, type: 'flashcards' }) });
        const data = await res.json();
        raw = (data.studyGuide || data.content || '').replace(/```json/g, '').replace(/```/g, '').trim();
      }
      const parsed: Card[] = JSON.parse(raw);
      setCards(parsed); setQueue([...parsed]); setQi(0); setFlipped(false); setRatings({});
      setSaved(false); setSavedDeckId(null); setShowSave(true);
      if (!deckName) setDeckName(topic.trim() || (newFiles[0]?.name.replace('.pdf', '')) || 'New Deck');
      setScreen('study');
    } catch { setError('Could not generate flashcards. Please try again.'); }
    finally { setLoading(false); }
  };

  const saveDeck = async () => {
    if (!deckName.trim() || saved) return;
    setSaving(true);
    try {
      const { data: deck } = await supabase.from('flashcard_decks').insert({ student_id: 'matthew', title: deckName.trim(), card_count: cards.length, folder_id: folderId || null }).select().single();
      if (deck) {
        setSavedDeckId(deck.id);
        await supabase.from('flashcard_cards').insert(cards.map((c, i) => ({ deck_id: deck.id, front: c.front, back: c.back, position: i })));
        setDecks(prev => [deck, ...prev]);
        if (scheduleReview) {
          const today = new Date();
          const reviewDays = [1, 3, 7];
          const reviewTasks = reviewDays.map(d => {
            const due = new Date(today);
            due.setDate(today.getDate() + d);
            return { student_id: 'matthew', title: `Review: ${deckName.trim()} flashcards`, due_date: due.toISOString().split('T')[0], task_type: 'review', completed: false };
          });
          await supabase.from('tasks').insert(reviewTasks);
        }
        setSaved(true); setShowSave(false);
      }
    } catch { setError('Could not save deck.'); }
    finally { setSaving(false); }
  };

  const next    = () => { setFlipped(false); const isLast = mode === 'smart' ? qi + 1 >= queue.length : qi + 1 >= cards.length; if (isLast) { setScreen('done'); return; } setQi(i => i + 1); };
  const prev    = () => { if (qi > 0) { setQi(i => i - 1); setFlipped(false); } };
  const rate    = (conf: number) => { setRatings(r => ({ ...r, [qi]: conf })); if (mode === 'smart') { const nq = requeue(queue, qi, conf); if (nq.length === 0) { setScreen('done'); return; } setQueue(nq); setFlipped(false); } else { next(); } };
  const restart = () => { setQueue([...cards]); setQi(0); setFlipped(false); setRatings({}); setScreen('study'); };

  const curCard  = mode === 'smart' ? queue[qi] : cards[qi];
  const total    = mode === 'smart' ? queue.length : cards.length;
  const progress = total > 0 ? ((qi / total) * 100) : 0;
  const knewWell = Object.values(ratings).filter(r => r >= 2).length;
  const needWork = Object.values(ratings).filter(r => r < 2).length;

  useEffect(() => {
    if (screen !== 'study') return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setFlipped(f => !f); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); next(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); prev(); }
      if (e.key === '1') rate(0); if (e.key === '2') rate(1); if (e.key === '3') rate(2); if (e.key === '4') rate(3);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [screen, qi, flipped, queue, cards]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <nav style={{ height: 58, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #E8E5F0', position: 'sticky', top: 0, zIndex: 90 }}>
        <Link href="/matthew" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mountain />
          <span style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px' }}>Ascend</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: '#C4C1D4', letterSpacing: 1.5, textTransform: 'uppercase', fontStyle: 'italic', marginLeft: 4 }}>Forged in Focus</span>
        </Link>
      </nav>

      {/* ── DECKS SCREEN ── */}
      {screen === 'decks' && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Matthew</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px' }}>Flashcard Decks</div>
            </div>
            <button onClick={() => setScreen('generate')} style={{ padding: '10px 18px', borderRadius: 999, background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', border: 'none', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ New Deck</button>
          </div>

          {decksLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9E9BB0', fontSize: 13 }}>Loading decks...</div>
          ) : decks.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 18, padding: '48px 20px', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: 20, background: light, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IconCards c={color} size={40} />
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26', marginBottom: 8 }}>No decks yet</div>
              <div style={{ fontSize: 13, color: '#9E9BB0', marginBottom: 24 }}>Generate a deck from your uploaded materials to get started.</div>
              <button onClick={() => setScreen('generate')} style={{ padding: '12px 24px', borderRadius: 999, background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Generate First Deck</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {decks.map(deck => (
                <div key={deck.id} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '14px 16px', boxShadow: '0 1px 6px rgba(29,27,38,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div onClick={() => openDeck(deck)} style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 4, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{deck.title}</div>
                    {(deck.class_name || deck.folder_name) && (
                      <div style={{ fontSize: 10, fontWeight: 700, color, background: light, padding: '2px 7px', borderRadius: 999, display: 'inline-block', marginBottom: 4 }}>
                        {deck.class_name}{deck.folder_name ? ` · ${deck.folder_name}` : ''}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color, background: light, padding: '2px 6px', borderRadius: 999 }}>{deck.card_count} cards</span>
                      <span style={{ fontSize: 10, color: '#9E9BB0' }}>{formatDate(deck.created_at)}</span>
                    </div>
                  </div>
                  <button onClick={() => openDeck(deck)} style={{ width: '100%', padding: '8px', borderRadius: 10, background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', border: 'none', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Study</button>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ── DECK DETAIL SCREEN ── */}
      {screen === 'deck-detail' && activeDeck && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
          <button onClick={() => setScreen('decks')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6B6880', fontFamily: 'var(--font-jakarta)', marginBottom: 20, padding: 0 }}>← Decks</button>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.6px', marginBottom: 4 }}>{activeDeck.title}</div>
              <div style={{ fontSize: 12, color: '#9E9BB0' }}>{activeDeck.card_count} cards · Created {formatDate(activeDeck.created_at)}</div>
            </div>
            <button onClick={() => { if (confirm('Delete this deck?')) deleteDeck(activeDeck.id); }} style={{ fontSize: 11, fontWeight: 700, color: '#C47878', background: '#FDF2F2', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', flexShrink: 0, marginLeft: 12 }}>Delete</button>
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <button onClick={() => { if (deckCards.length > 0) studyDeck(activeDeck, deckCards); }} disabled={deckCards.length === 0} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: deckCards.length === 0 ? 0.4 : 1 }}>Study This Deck</button>
            <button onClick={() => { setShowAddCard(true); setEditCardId(null); setNewFront(''); setNewBack(''); }} style={{ padding: '13px 18px', borderRadius: 14, border: '1.5px solid #E8E5F0', background: '#FFFFFF', color, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ Add Card</button>
          </div>

          {deckLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9E9BB0', fontSize: 13 }}>Loading cards...</div>
          ) : deckCards.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '1.5px dashed #C4C1D4', borderRadius: 14, padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>No cards yet. Add your first card above.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deckCards.map((card, i) => (
                <div key={card.id || i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(29,27,38,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Q</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1D1B26', marginBottom: 8, lineHeight: 1.4 }}>{card.front}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color, marginBottom: 4 }}>A</div>
                      <div style={{ fontSize: 13, color: '#5A5078', lineHeight: 1.4 }}>{card.back}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => startEdit(card)} style={{ fontSize: 11, fontWeight: 700, color: '#9E9BB0', background: '#F3F1EC', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Edit</button>
                      <button onClick={() => { if (card.id) deleteCard(card.id); }} style={{ fontSize: 11, fontWeight: 700, color: '#C47878', background: '#FDF2F2', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add/Edit Card Modal — centered */}
          {showAddCard && (
            <div onClick={e => { if (e.target === e.currentTarget) { setShowAddCard(false); setEditCardId(null); setNewFront(''); setNewBack(''); setFrontImageFile(null); setBackImageFile(null); setFrontImageUrl(null); setBackImageUrl(null); }}} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <div style={{ background: '#FFFFFF', borderRadius: 22, padding: '28px 24px', width: '100%', maxWidth: 540, boxShadow: '0 8px 40px rgba(29,27,38,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#1D1B26', marginBottom: 16 }}>{editCardId ? 'Edit Card' : 'Add Card'}</div>

                {/* FRONT */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Front (Question)</label>
                  <textarea autoFocus value={newFront} onChange={e => setNewFront(e.target.value)} rows={2} placeholder="Enter the question or term..." style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' as const, marginBottom: 8 }} />
                  {frontImageUrl && (
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <img src={frontImageUrl} alt="Front" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 180 }} />
                      <button onClick={() => { setFrontImageUrl(null); setFrontImageFile(null); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(29,27,38,0.6)', border: 'none', borderRadius: 999, color: 'white', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  )}
                  {frontImageFile && !frontImageUrl && (
                    <div style={{ fontSize: 11, color, background: light, padding: '6px 10px', borderRadius: 8, marginBottom: 8 }}>📷 {frontImageFile.name}</div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#9E9BB0', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, border: '1.5px dashed #E8E5F0', background: '#FAFAF8' }}>
                    <svg width="14" height="14" viewBox="0 0 28 28" fill="none"><rect x="3" y="6" width="22" height="16" rx="2" stroke="#9E9BB0" strokeWidth="1.6" fill="none"/><circle cx="9" cy="12" r="2" stroke="#9E9BB0" strokeWidth="1.4" fill="none"/><path d="M3 20l6-5 4 4 3-3 6 5" stroke="#9E9BB0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Add image to front
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setFrontImageFile(f); setFrontImageUrl(URL.createObjectURL(f)); } e.target.value = ''; }} />
                  </label>
                </div>

                {/* BACK */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Back (Answer)</label>
                  <textarea value={newBack} onChange={e => setNewBack(e.target.value)} rows={2} placeholder="Enter the answer or definition..." style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' as const, marginBottom: 8 }} />
                  {backImageUrl && (
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <img src={backImageUrl} alt="Back" style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 180 }} />
                      <button onClick={() => { setBackImageUrl(null); setBackImageFile(null); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(29,27,38,0.6)', border: 'none', borderRadius: 999, color: 'white', width: 24, height: 24, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  )}
                  {backImageFile && !backImageUrl && (
                    <div style={{ fontSize: 11, color, background: light, padding: '6px 10px', borderRadius: 8, marginBottom: 8 }}>📷 {backImageFile.name}</div>
                  )}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#9E9BB0', cursor: 'pointer', padding: '6px 10px', borderRadius: 8, border: '1.5px dashed #E8E5F0', background: '#FAFAF8' }}>
                    <svg width="14" height="14" viewBox="0 0 28 28" fill="none"><rect x="3" y="6" width="22" height="16" rx="2" stroke="#9E9BB0" strokeWidth="1.6" fill="none"/><circle cx="9" cy="12" r="2" stroke="#9E9BB0" strokeWidth="1.4" fill="none"/><path d="M3 20l6-5 4 4 3-3 6 5" stroke="#9E9BB0" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Add image to back
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setBackImageFile(f); setBackImageUrl(URL.createObjectURL(f)); } e.target.value = ''; }} />
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setShowAddCard(false); setEditCardId(null); setNewFront(''); setNewBack(''); setFrontImageFile(null); setBackImageFile(null); setFrontImageUrl(null); setBackImageUrl(null); }} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#6B6880', fontFamily: 'var(--font-jakarta)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={saveCard} disabled={cardSaving} style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: cardSaving ? 0.7 : 1 }}>
                    {cardSaving ? 'Saving...' : editCardId ? 'Save Changes' : 'Add Card'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ── GENERATE SCREEN ── */}
      {screen === 'generate' && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '28px 20px 80px' }}>
          <button onClick={() => setScreen('decks')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#6B6880', fontFamily: 'var(--font-jakarta)', marginBottom: 20, padding: 0 }}>← Decks</button>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 4 }}>Matthew</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.8px', marginBottom: 4 }}>Generate Deck</div>
            <div style={{ fontSize: 13, color: '#9E9BB0' }}>Select materials from your library to generate a deck.</div>
          </div>

          <div style={{ background: '#F3F1EC', borderRadius: 12, padding: 3, display: 'flex', gap: 2, marginBottom: 20 }}>
            {(['smart', 'basic'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '9px', borderRadius: 9, border: 'none', fontFamily: 'var(--font-jakarta)', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: mode === m ? '#FFFFFF' : 'transparent', color: mode === m ? color : '#9E9BB0', boxShadow: mode === m ? '0 1px 4px rgba(29,27,38,0.08)' : 'none' }}>
                {m === 'smart' ? 'Smart Deck' : 'Basic Deck'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#9E9BB0', marginBottom: 20, textAlign: 'center' }}>
            {mode === 'smart' ? 'Adaptive — cards repeat until mastered' : 'Linear — card 1 to end, no algorithm'}
          </div>

          {/* Resource Library */}
          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', marginBottom: 2 }}>Select Resources</div>
                <div style={{ fontSize: 11, color: '#9E9BB0' }}>{totalSelected > 0 ? `${totalSelected} file${totalSelected !== 1 ? 's' : ''} selected` : 'Pick from your uploaded library'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {totalSelected > 0 && <button onClick={() => { setSelectedIds(new Set()); setNewFiles([]); }} style={{ padding: '6px 10px', borderRadius: 999, border: '1.5px solid #E8E5F0', background: 'transparent', color: '#9E9BB0', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Clear</button>}
                <input type="file" accept=".pdf" multiple ref={el => setFileInputRef(el)} onChange={handleNewFileInput} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef?.click()} style={{ padding: '6px 12px', borderRadius: 999, background: light, border: 'none', color, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>+ Upload</button>
              </div>
            </div>

            {newFiles.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {newFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: light, marginBottom: 4 }}>
                    <IconFile c={color} size={14} />
                    <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                    <button onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))} style={{ fontSize: 11, color: '#C4C1D4', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {libLoading ? (
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#9E9BB0', fontSize: 12 }}>Loading library...</div>
            ) : library.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', border: '2px dashed #E8E5F0', borderRadius: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><IconEmptyFolder size={32} /></div>
                <div style={{ fontSize: 12, color: '#9E9BB0' }}>No uploaded PDFs yet — upload files to your class folders first.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {library.map(cls => {
                  const clsIds     = cls.folders.flatMap(f => f.resources.map(r => r.id));
                  const clsAllSel  = clsIds.length > 0 && clsIds.every(id => selectedIds.has(id));
                  const clsSomeSel = clsIds.some(id => selectedIds.has(id));
                  const clsExp     = expandedClasses.has(cls.id);
                  return (
                    <div key={cls.id} style={{ border: '1.5px solid #E8E5F0', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#FAFAF8', cursor: 'pointer' }} onClick={() => setExpandedClasses(prev => { const n = new Set(prev); n.has(cls.id) ? n.delete(cls.id) : n.add(cls.id); return n; })}>
                        <span style={{ fontSize: 10, color: '#9E9BB0', width: 10 }}>{clsExp ? '▾' : '▸'}</span>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#1D1B26' }}>{cls.name}</span>
                        <button onClick={e => { e.stopPropagation(); toggleClass(cls); }} style={{ fontSize: 10, fontWeight: 700, color: clsAllSel || clsSomeSel ? color : '#9E9BB0', background: clsAllSel || clsSomeSel ? light : '#F3F1EC', border: 'none', borderRadius: 999, padding: '2px 8px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                          {clsAllSel ? 'Deselect' : 'Select all'}
                        </button>
                      </div>
                      {clsExp && (
                        <div style={{ padding: '0 12px 8px' }}>
                          {cls.folders.map(folder => {
                            const fIds     = folder.resources.map(r => r.id);
                            const fAllSel  = fIds.length > 0 && fIds.every(id => selectedIds.has(id));
                            const fSomeSel = fIds.some(id => selectedIds.has(id));
                            const fExp     = expandedFolders.has(folder.id);
                            return (
                              <div key={folder.id} style={{ marginTop: 6 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 7, background: '#F3F1EC', cursor: 'pointer', marginBottom: 3 }} onClick={() => setExpandedFolders(prev => { const n = new Set(prev); n.has(folder.id) ? n.delete(folder.id) : n.add(folder.id); return n; })}>
                                  <span style={{ fontSize: 9, color: '#9E9BB0', width: 8 }}>{fExp ? '▾' : '▸'}</span>
                                  <IconFolder c="#9E9BB0" size={12} />
                                  <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#1D1B26', marginLeft: 2 }}>{folder.name}</span>
                                  <span style={{ fontSize: 9, color: '#9E9BB0' }}>{folder.resources.length} PDF{folder.resources.length !== 1 ? 's' : ''}</span>
                                  <button onClick={e => { e.stopPropagation(); toggleFolder(folder); }} style={{ fontSize: 9, fontWeight: 700, color: fAllSel || fSomeSel ? color : '#9E9BB0', background: fAllSel || fSomeSel ? light : '#FFFFFF', border: `1px solid ${fAllSel || fSomeSel ? color : '#E8E5F0'}`, borderRadius: 999, padding: '2px 7px', cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>
                                    {fAllSel ? 'Deselect' : 'Select all'}
                                  </button>
                                </div>
                                {fExp && (
                                  <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {folder.resources.map(r => {
                                      const isSel = selectedIds.has(r.id);
                                      return (
                                        <div key={r.id} onClick={() => toggleResource(r.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${isSel ? color : '#E8E5F0'}`, background: isSel ? light : '#FFFFFF', cursor: 'pointer' }}>
                                          <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${isSel ? color : '#C4C1D4'}`, background: isSel ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {isSel && <span style={{ color: 'white', fontSize: 9 }}>✓</span>}
                                          </div>
                                          <IconFile c={isSel ? color : '#9E9BB0'} size={12} />
                                          <span style={{ fontSize: 11, fontWeight: isSel ? 700 : 400, color: isSel ? color : '#1D1B26', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: 2 }}>{r.file_name}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {totalSelected > 0 && (
              <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 9, background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconStack c="rgba(255,255,255,0.8)" size={14} />
                {totalSelected} file{totalSelected !== 1 ? 's' : ''} selected{totalSelected > 1 ? ' — Ascend will find common themes' : ''}
              </div>
            )}
          </div>

          <div style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 18, padding: '20px', marginBottom: 12, boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>
              {totalSelected > 0 ? 'Refine Focus (optional)' : 'Topic or Subject'}
            </label>
            <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && canGenerate && !loading) generate(); }} placeholder={totalSelected > 0 ? 'e.g. "Focus on enzymatic reactions"' : 'e.g. AP Biology - Cellular Respiration'} style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 14, color: '#1D1B26', background: '#FAFAF8', outline: 'none', marginBottom: 14 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 6, display: 'block' }}>Custom Instructions (optional)</label>
            <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} placeholder='e.g. "Emphasize definitions" or "Focus on mechanisms"' rows={2} style={{ width: '100%', padding: '11px 13px', border: '1.5px solid #E8E5F0', borderRadius: 10, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FAFAF8', outline: 'none', resize: 'vertical', lineHeight: 1.5, marginBottom: 14 }} />
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9E9BB0', marginBottom: 8, display: 'block' }}>Number of Cards</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => setAutoCount(true)}
                style={{ padding: '6px 16px', borderRadius: 999, border: `1.5px solid ${autoCount ? color : '#E8E5F0'}`, background: autoCount ? color : '#FAFAF8', color: autoCount ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}
              >
                Auto
              </button>
              {[10, 15, 20, 30].map(n => (
                <button key={n} onClick={() => { setCount(n); setAutoCount(false); }} style={{ padding: '6px 16px', borderRadius: 999, border: `1.5px solid ${!autoCount && count === n ? color : '#E8E5F0'}`, background: !autoCount && count === n ? color : '#FAFAF8', color: !autoCount && count === n ? 'white' : '#9E9BB0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>{n}</button>
              ))}
            </div>
            {autoCount && <div style={{ fontSize: 11, color: '#9E9BB0', marginTop: 8 }}>Ascend will decide the ideal number based on your material.</div>}
          </div>

          {error && <p style={{ fontSize: 13, color: '#C47878', marginBottom: 12 }}>{error}</p>}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ width: 32, height: 32, border: '2.5px solid #E8E5F0', borderTopColor: color, borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.75s linear infinite' }} />
              <div style={{ fontSize: 13, color: '#9E9BB0' }}>{totalSelected > 1 ? `Analyzing ${totalSelected} documents...` : 'Generating your deck...'}</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (
            <button onClick={generate} disabled={!canGenerate} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: canGenerate ? 1 : 0.4 }}>
              {canGenerate
                ? totalSelected > 1
                  ? `Generate ${autoCount ? 'Auto' : count} Cards from ${totalSelected} Files`
                  : `Generate ${autoCount ? 'Auto' : count} Cards`
                : 'Select resources or enter a topic'}
            </button>
          )}
        </main>
      )}

      {/* ── STUDY SCREEN ── */}
      {screen === 'study' && curCard && (
        <main style={{ maxWidth: 600, margin: '0 auto', padding: '20px 20px 80px' }}>
          {showSave && !saved && (
            <div style={{ background: light, border: `1.5px solid ${color}40`, borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Save this deck?</div>
              <input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="Deck name..." style={{ width: '100%', padding: '8px 11px', border: '1.5px solid #E8E5F0', borderRadius: 8, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FFFFFF', outline: 'none', marginBottom: 10 }} />
              <div onClick={() => setScheduleReview(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
                <div style={{ width: 36, height: 20, borderRadius: 999, background: scheduleReview ? color : '#E8E5F0', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: scheduleReview ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: scheduleReview ? color : '#9E9BB0' }}>Add to review schedule (Day +1, +3, +7)</span>
              </div>
              <button onClick={saveDeck} disabled={!deckName.trim() || saving} style={{ width: '100%', padding: '10px', borderRadius: 10, border: 'none', background: color, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !deckName.trim() ? 0.4 : 1 }}>
                {saving ? 'Saving...' : 'Save Deck'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <IconLightbulb c={color} size={13} />
                <span style={{ fontSize: 11, color, fontWeight: 600, opacity: 0.7 }}>Save to add, edit, or remove cards later</span>
              </div>
            </div>
          )}
          {saved && (
            <div style={{ background: '#EDF7F2', borderRadius: 12, padding: '10px 14px', marginBottom: 16, fontSize: 12, fontWeight: 700, color: '#5FAD8E' }}>
              ✅ Deck saved — find it in your deck library
            </div>
          )}
          {!saved && (
            <div style={{ background: '#EDE9F7', border: '1.5px solid #C4B8E8', borderRadius: 14, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: '#EDE9F7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <IconLightbulb c="#7B6FA0" size={16} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#7B6FA0', letterSpacing: 0.3, marginBottom: 3 }}>Did you know?</div>
                <div style={{ fontSize: 12, color: '#6B6880', lineHeight: 1.5 }}>Once saved, you can add new cards, edit any card's front or back, or remove cards — all from your deck library.</div>
              </div>
            </div>
          )}

          {mode === 'basic' && (
            <div style={{ height: 3, background: '#E8E5F0', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', background: color, width: `${progress}%`, transition: 'width 0.4s' }} />
            </div>
          )}
          {mode === 'smart' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: 1, textTransform: 'uppercase' }}>Smart</span>
              <div style={{ flex: 1, display: 'flex', gap: 2 }}>
                {Array.from({ length: Math.min(total, 20) }).map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < qi ? '#5FAD8E' : i === qi ? color : '#E8E5F0' }} />
                ))}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#9E9BB0' }}>{qi + 1}/{total}</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button onClick={prev} style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 16, color: '#9E9BB0' }}>{'<'}</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#9E9BB0' }}>{qi + 1} of {total}</span>
            <button onClick={next} style={{ width: 38, height: 38, borderRadius: '50%', border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontSize: 16, color: '#9E9BB0' }}>{'>'}</button>
          </div>

          <div onClick={() => setFlipped(f => !f)} style={{ width: '100%', perspective: 1400, cursor: 'pointer', marginBottom: 20 }}>
            <div style={{ position: 'relative', width: '100%', minHeight: 240, transformStyle: 'preserve-3d', transition: 'transform 0.35s', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
              <div style={{ position: 'absolute', width: '100%', minHeight: 240, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: '#FFFFFF', border: '1.5px solid #E8E5F0', boxShadow: '0 6px 28px rgba(29,27,38,0.08)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: '#C4C1D4', marginBottom: 16 }}>Question</div>
                {curCard.front_image_url && (
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <img src={curCard.front_image_url} alt="Front" onClick={e => { e.stopPropagation(); setLightboxUrl(curCard.front_image_url!); }} style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 10, cursor: 'zoom-in', display: 'block' }} />
                    <div onClick={e => { e.stopPropagation(); setLightboxUrl(curCard.front_image_url!); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(29,27,38,0.5)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                )}
                {curCard.front && <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, color: '#1D1B26' }}>{curCard.front}</div>}
                <div style={{ marginTop: 20, fontSize: 11, color: '#C4C1D4' }}>tap · left/right arrow to flip</div>
              </div>
              <div style={{ position: 'absolute', width: '100%', minHeight: 240, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', borderRadius: 20, padding: '36px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: light, border: `1.5px solid rgba(123,111,160,0.2)`, transform: 'rotateY(180deg)' }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color, opacity: 0.7, marginBottom: 16 }}>Answer</div>
                {curCard.back_image_url && (
                  <div style={{ position: 'relative', marginBottom: 12 }}>
                    <img src={curCard.back_image_url} alt="Back" onClick={e => { e.stopPropagation(); setLightboxUrl(curCard.back_image_url!); }} style={{ maxWidth: '100%', maxHeight: 160, objectFit: 'contain', borderRadius: 10, cursor: 'zoom-in', display: 'block' }} />
                    <div onClick={e => { e.stopPropagation(); setLightboxUrl(curCard.back_image_url!); }} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(29,27,38,0.5)', borderRadius: 6, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                )}
                {curCard.back && <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.5, color: '#5A5078' }}>{curCard.back}</div>}
              </div>
            </div>
          </div>

          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#C4C1D4', textAlign: 'center', marginBottom: 10 }}>How well did you know this?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {([["Didn't Know", '#C47878'], ['Almost', '#C8965A'], ['Got It', '#5FAD8E'], ['Cold!', color]] as const).map(([label, btnColor], i) => (
              <button key={i} onClick={() => rate(i)} style={{ padding: '12px 4px', borderRadius: 12, border: '1.5px solid #E8E5F0', background: '#FFFFFF', cursor: 'pointer', fontFamily: 'var(--font-jakarta)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: btnColor, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 9, color: '#C4C1D4' }}>press {i + 1}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
            {[['←/→', 'flip'], ['↑', 'next'], ['↓', 'back'], ['1-4', 'rate']].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#C4C1D4' }}>
                <span style={{ background: '#F3F1EC', border: '1px solid #E8E5F0', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace', fontSize: 9 }}>{key}</span>
                {label}
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ── DONE SCREEN ── */}
      {screen === 'done' && (
        <main style={{ maxWidth: 500, margin: '0 auto', padding: '40px 20px 80px', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <IconDone size={72} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1D1B26', letterSpacing: '-0.5px', marginBottom: 8 }}>Session Complete</div>
          <div style={{ fontSize: 14, color: '#9E9BB0', lineHeight: 1.6, marginBottom: 28 }}>You reviewed <strong>{Object.keys(ratings).length} cards</strong>.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, maxWidth: 340, margin: '0 auto 28px' }}>
            {[{ n: Object.keys(ratings).length, l: 'Reviewed', c: color }, { n: knewWell, l: 'Knew Well', c: '#5FAD8E' }, { n: needWork, l: 'Needs Work', c: '#C47878' }, { n: cards.length, l: 'Total Cards', c: '#C8965A' }].map((s, i) => (
              <div key={i} style={{ background: '#FFFFFF', border: '1.5px solid #E8E5F0', borderRadius: 16, padding: '16px', textAlign: 'center', boxShadow: '0 1px 6px rgba(29,27,38,0.06)' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: s.c, marginBottom: 4 }}>{s.n}</div>
                <div style={{ fontSize: 11, color: '#9E9BB0', fontWeight: 600 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {!saved && (
            <div style={{ background: light, borderRadius: 14, padding: '16px', marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8 }}>Save this deck to study again later</div>
              <input value={deckName} onChange={e => setDeckName(e.target.value)} placeholder="Deck name..." style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E8E5F0', borderRadius: 9, fontFamily: 'var(--font-jakarta)', fontSize: 13, color: '#1D1B26', background: '#FFFFFF', outline: 'none', marginBottom: 10 }} />
              <div onClick={() => setScheduleReview(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10 }}>
                <div style={{ width: 36, height: 20, borderRadius: 999, background: scheduleReview ? color : '#E8E5F0', transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 2, left: scheduleReview ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: scheduleReview ? color : '#9E9BB0' }}>Add to review schedule (Day +1, +3, +7)</span>
              </div>
              <button onClick={saveDeck} disabled={!deckName.trim() || saving} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: color, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-jakarta)', opacity: !deckName.trim() ? 0.4 : 1 }}>
                {saving ? 'Saving...' : 'Save Deck'}
              </button>
            </div>
          )}
          {saved && (
            <div style={{ background: '#EDF7F2', borderRadius: 12, padding: '12px 16px', marginBottom: 20, maxWidth: 340, margin: '0 auto 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#5FAD8E' }}>✅ Deck saved to your library</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, maxWidth: 340, margin: '0 auto' }}>
            <button onClick={restart} style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1.5px solid #E8E5F0', background: '#F3F1EC', color: '#6B6880', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>Study Again</button>
            <button onClick={() => setScreen('decks')} style={{ flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #7B6FA0, #5A5078)', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-jakarta)' }}>My Decks</button>
          </div>
        </main>
      )}

      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'zoom-out' }}>
          <img src={lightboxUrl} alt="Expanded" style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12 }} />
          <button onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 999, color: 'white', width: 36, height: 36, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>
      )}
      <TabBar student="matthew" />
    </div>
  );
}

export default function MatthewFlashcards() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>}>
      <MatthewFlashcardsInner />
    </Suspense>
  );
}