import React, { useEffect, useState } from 'react';
import { supabase, type DiagramRecord } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { X, Folder, Plus, Trash2, Clock, Check, Loader2, Database, Crown, Users } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

const getDismissedCollabIds = (userId: string): string[] => {
  try {
    const raw = localStorage.getItem(`dismissed_collab_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const addDismissedCollabId = (userId: string, diagramId: string) => {
  try {
    const current = getDismissedCollabIds(userId);
    if (!current.includes(diagramId)) {
      localStorage.setItem(`dismissed_collab_${userId}`, JSON.stringify([...current, diagramId]));
    }
  } catch {}
};

const removeDismissedCollabId = (userId: string, diagramId: string) => {
  try {
    const current = getDismissedCollabIds(userId);
    localStorage.setItem(`dismissed_collab_${userId}`, JSON.stringify(current.filter((id) => id !== diagramId)));
  } catch {}
};

export const MyDiagramsModal: React.FC<Props> = ({ isOpen, onClose, onOpenAuth }) => {
  const { user } = useAuthStore();
  const { diagramId, loadCloudDiagram, newDiagram } = useDiagramStore();

  const [diagrams, setDiagrams] = useState<DiagramRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'mine' | 'collab'>('all');

  const fetchDiagrams = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('diagrams')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      const dismissed = getDismissedCollabIds(user.id);
      const visible = (data || []).filter((d) => d.user_id === user.id || !dismissed.includes(d.id));
      setDiagrams(visible);
    } catch (err) {
      console.error('Error fetching diagrams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchDiagrams();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSelect = (diag: DiagramRecord) => {
    if (user && diag.user_id !== user.id) {
      removeDismissedCollabId(user.id, diag.id);
    }
    loadCloudDiagram(diag.id, diag.title, diag.sheets, diag.active_sheet_id);
    useCollaborationStore.getState().initSession(diag.id, user);
    onClose();
  };

  const handleNew = () => {
    newDiagram();
    onClose();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Yakin ingin menghapus diagram ini secara permanen dari cloud?')) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('diagrams').delete().eq('id', id);
      if (error) throw error;
      setDiagrams((prev) => prev.filter((d) => d.id !== id));
      if (diagramId === id) {
        newDiagram();
      }
    } catch (err) {
      console.error('Error deleting diagram:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRemoveCollab = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm(
        `Hapus proyek kolaborasi "${title}" dari daftar Anda?\n\n(Proyek asli milik pembuat tidak akan terhapus dari cloud, hanya disingkirkan dari daftar Anda agar tidak menumpuk)`
      )
    ) {
      return;
    }
    if (user) {
      addDismissedCollabId(user.id, id);
    }
    setDiagrams((prev) => prev.filter((d) => d.id !== id));
    if (diagramId === id) {
      newDiagram();
    }
  };

  const myCount = diagrams.filter((d) => d.user_id === user?.id).length;
  const collabCount = diagrams.filter((d) => d.user_id !== user?.id).length;

  const filteredDiagrams = diagrams.filter((d) => {
    if (filterTab === 'mine') return d.user_id === user?.id;
    if (filterTab === 'collab') return d.user_id !== user?.id;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0d1117] border border-slate-700/70 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden ring-1 ring-white/5 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-md">
              <Folder size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Diagram Saya</h2>
              <p className="text-[11px] text-slate-400">Diagram yang tersimpan di cloud Supabase</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {!user ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Database size={22} />
              </div>
              <h3 className="text-sm font-semibold text-white">Login Diperlukan</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Silakan masuk atau buat akun terlebih dahulu untuk menyimpan dan membuka diagram di cloud.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all"
              >
                Masuk / Daftar
              </button>
            </div>
          ) : loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="animate-spin text-indigo-500" size={24} />
              <span className="text-xs">Memuat diagram...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all ${
                    filterTab === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Semua ({diagrams.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('mine')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    filterTab === 'mine'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Crown size={12} className={filterTab === 'mine' ? 'text-white' : 'text-amber-400'} />
                  <span>Milik Saya ({myCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('collab')}
                  className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    filterTab === 'collab'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Users size={12} className={filterTab === 'collab' ? 'text-white' : 'text-indigo-400'} />
                  <span>Kolaborasi ({collabCount})</span>
                </button>
              </div>

              <button
                onClick={handleNew}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-700 hover:border-indigo-500/80 bg-slate-900/40 hover:bg-indigo-600/10 text-slate-300 hover:text-white transition-all text-xs font-semibold group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 group-hover:bg-indigo-600 flex items-center justify-center text-slate-400 group-hover:text-white transition-colors">
                  <Plus size={16} />
                </div>
                <span>Buat Diagram Baru (Blank Schema)</span>
              </button>

              {filteredDiagrams.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  {filterTab === 'collab'
                    ? 'Belum ada proyek kolaborasi yang Anda ikuti.'
                    : filterTab === 'mine'
                    ? 'Belum ada diagram yang Anda buat.'
                    : 'Belum ada diagram yang tersimpan. Klik tombol Simpan di toolbar untuk menyimpan proyek Anda!'}
                </div>
              ) : (
                filteredDiagrams.map((d) => {
                  const isCurrent = d.id === diagramId;
                  const isOwner = d.user_id === user.id;
                  const ownerName =
                    (Array.isArray(d.sheets) && (d.sheets[0] as any)?.projectSettings?.ownerName) ||
                    (isOwner ? 'Anda' : 'Kolaborator');
                  const dateStr = new Date(d.updated_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const sheetCount = Array.isArray(d.sheets) ? d.sheets.length : 1;
                  const tableCount = Array.isArray(d.sheets)
                    ? d.sheets.reduce((acc: number, s: any) => acc + (s.nodes?.length || 0), 0)
                    : 0;

                  return (
                    <div
                      key={d.id}
                      onClick={() => handleSelect(d)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-indigo-950/40 border-indigo-500/80 text-white shadow-md'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <Database size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-white truncate max-w-[200px]">{d.title}</span>
                            {isCurrent && (
                              <span className="flex items-center gap-1 text-[10px] font-mono text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded border border-indigo-500/30">
                                <Check size={10} /> Aktif
                              </span>
                            )}
                            {isOwner ? (
                              <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                <Crown size={10} /> Milik Saya
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-medium text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                <Users size={10} /> Oleh: {ownerName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Clock size={11} /> {dateStr}
                            </span>
                            <span>•</span>
                            <span>
                              {sheetCount} sheet · {tableCount} tabel
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 ml-2">
                        {isOwner ? (
                          <button
                            onClick={(e) => handleDelete(d.id, e)}
                            disabled={deletingId === d.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Hapus proyek permanen dari cloud"
                          >
                            {deletingId === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleRemoveCollab(d.id, d.title, e)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Hapus proyek kolaborasi ini dari daftar Anda agar tidak menumpuk"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

