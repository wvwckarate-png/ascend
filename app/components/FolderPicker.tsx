'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

type Folder = { id: string; name: string; class_id: string; };
type Class  = { id: string; name: string; folders: Folder[]; };

interface FolderPickerProps {
  studentId: string;
  currentFolderId?: string | null;
  onSelect: (folderId: string | null, folderName: string, className: string) => void;
  onClose: () => void;
  accentColor?: string;
}

export default function FolderPicker({ studentId, currentFolderId, onSelect, onClose, accentColor = '#7B6FA0' }: FolderPickerProps) {
  const [classes,  setClasses]  = useState<Class[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      if (!classData) { setLoading(false); return; }
      const classIds = classData.map(c => c.id);
      const { data: folderData } = await supabase
        .from('exam_folders')
        .select('id, name, class_id')
        .in('class_id', classIds)
        .order('exam_date', { ascending: true });
      const fByClass: Record<string, Folder[]> = {};
      (folderData || []).forEach(f => {
        if (!fByClass[f.class_id]) fByClass[f.class_id] = [];
        fByClass[f.class_id].push(f);
      });
      setClasses(classData.map(c => ({ ...c, folders: fByClass[c.id] || [] })).filter(c => c.folders.length > 0));
      setLoading(false);
    };
    load();
  }, [studentId]);

  const light = accentColor === '#E8956D' ? '#FFF3E8' : '#EDE9F7';

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(29,27,38,0.5)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 22, width: '100%', maxWidth: 500, maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(29,27,38,0.18)' }}>
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #F3F1EC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1D1B26' }}>Move to Folder</div>
          <button onClick={onClose} style={{ background: '#F3F1EC', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 28 28" fill="none"><path d="M6 6l16 16M22 6L6 22" stroke="#9E9BB0" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px 24px' }}>
          <div onClick={() => onSelect(null, '', '')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${!currentFolderId ? accentColor : '#E8E5F0'}`, background: !currentFolderId ? light : '#FAFAF8', cursor: 'pointer', marginBottom: 8 }}>
            <svg width="16" height="16" viewBox="0 0 28 28" fill="none"><rect x="3" y="6" width="22" height="18" rx="2" stroke="#9E9BB0" strokeWidth="1.6" fill="none"/><line x1="3" y1="11" x2="25" y2="11" stroke="#9E9BB0" strokeWidth="1.4"/></svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: !currentFolderId ? accentColor : '#9E9BB0' }}>No folder (unfiled)</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9E9BB0', fontSize: 13 }}>Loading...</div>
          ) : classes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#9E9BB0', fontSize: 13 }}>No folders found. Create exam folders in your class binder first.</div>
          ) : (
            classes.map(cls => (
              <div key={cls.id} style={{ marginBottom: 8 }}>
                <div onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(cls.id) ? n.delete(cls.id) : n.add(cls.id); return n; })} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: '#F3F1EC', cursor: 'pointer', marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: '#9E9BB0' }}>{expanded.has(cls.id) ? '▾' : '▸'}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1D1B26', flex: 1 }}>{cls.name}</span>
                  <span style={{ fontSize: 10, color: '#9E9BB0' }}>{cls.folders.length} folder{cls.folders.length !== 1 ? 's' : ''}</span>
                </div>
                {expanded.has(cls.id) && (
                  <div style={{ paddingLeft: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {cls.folders.map(folder => {
                      const isSelected = currentFolderId === folder.id;
                      return (
                        <div key={folder.id} onClick={() => onSelect(folder.id, folder.name, cls.name)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${isSelected ? accentColor : '#E8E5F0'}`, background: isSelected ? light : '#FFFFFF', cursor: 'pointer' }}>
                          <svg width="13" height="13" viewBox="0 0 28 28" fill="none"><path d="M3 9a2 2 0 012-2h5l2 2h11a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke={isSelected ? accentColor : '#9E9BB0'} strokeWidth="1.6" strokeLinejoin="round" fill="none"/></svg>
                          <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? accentColor : '#1D1B26', flex: 1 }}>{folder.name}</span>
                          {isSelected && (
                            <svg width="14" height="14" viewBox="0 0 28 28" fill="none"><path d="M5 14l7 7 11-11" stroke={accentColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}