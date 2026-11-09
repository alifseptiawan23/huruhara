import React, { useState } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { useCollaborationStore, selectIsReadOnly } from '../store/useCollaborationStore';
import {
  X,
  Layers,
  Plus,
  Pencil,
  Trash2,
  Check,
  Search,
  Database,
  ArrowRight,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SheetManagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    sheets,
    activeSheetId,
    setActiveSheet,
    addSheet,
    deleteSheet,
    renameSheet,
    diagramTitle,
  } = useDiagramStore();

  const isReadOnly = useCollaborationStore(selectIsReadOnly);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!isOpen) return null;

  const startEdit = (id: string, name: string) => {
    if (isReadOnly) return;
    setEditingId(id);
    setEditValue(name);
  };

  const finishEdit = () => {
    if (editingId && editValue.trim()) {
      renameSheet(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleSelectSheet = (id: string) => {
    setActiveSheet(id);
    onClose();
  };

  const handleAddSheet = () => {
    if (isReadOnly) return;
    addSheet();
  };

  const filteredSheets = sheets.filter((sh) =>
    sh.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTablesAllSheets = sheets.reduce((acc, sh) => acc + (sh.nodes?.length || 0), 0);
  const totalEdgesAllSheets = sheets.reduce((acc, sh) => acc + (sh.edges?.length || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-[#0d1117] border border-slate-700/80 rounded-t-2xl sm:rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-white/10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 shrink-0">
              <Layers size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">Daftar Sheet Proyek</h3>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                  {sheets.length} Sheet
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                Proyek: <strong className="text-slate-200">{diagramTitle}</strong> · {totalTablesAllSheets} tabel · {totalEdgesAllSheets} relasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
            title="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Bar (Shown when multiple sheets exist) */}
        {sheets.length > 2 && (
          <div className="px-4 sm:px-6 pt-3 pb-1">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama sheet..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* Sheet Cards List */}
        <div className="p-4 sm:p-6 space-y-2.5 overflow-y-auto flex-1">
          {filteredSheets.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              Tidak ada sheet dengan nama &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredSheets.map((sh, idx) => {
              const isActive = sh.id === activeSheetId;
              const isEditing = editingId === sh.id;
              const tableCount = sh.nodes?.length || 0;
              const edgeCount = sh.edges?.length || 0;

              return (
                <div
                  key={sh.id}
                  onClick={() => handleSelectSheet(sh.id)}
                  className={`flex items-center justify-between p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-indigo-950/50 border-indigo-500 text-white shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Index or Active Indicator Badge */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'
                      }`}
                    >
                      {isActive ? (
                        <Check size={14} className="animate-in zoom-in duration-150" />
                      ) : (
                        idx + 1
                      )}
                    </div>

                    {/* Sheet Details or Inline Rename */}
                    {isEditing ? (
                      <div
                        className="flex items-center gap-1.5 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={finishEdit}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') finishEdit();
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="bg-slate-950 border border-indigo-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none w-full font-semibold"
                        />
                        <button
                          onClick={finishEdit}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shrink-0 transition-colors"
                        >
                          Simpan
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-white truncate max-w-[200px]">
                            {sh.name}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Sedang Dibuka
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Database size={11} className="text-sky-400" />
                            {tableCount} Tabel
                          </span>
                          <span>•</span>
                          <span>{edgeCount} Relasi</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions (Rename, Delete, Switch) */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-2">
                      {!isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(sh.id, sh.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-indigo-900/30 transition-colors"
                          title="Ubah nama sheet"
                        >
                          <Pencil size={13} />
                        </button>
                      )}

                      {!isReadOnly && sheets.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                `Hapus sheet "${sh.name}" beserta ${tableCount} tabel di dalamnya?`
                              )
                            ) {
                              deleteSheet(sh.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Hapus sheet"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      {!isActive && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSheet(sh.id);
                          }}
                          className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-semibold transition-all ml-1"
                        >
                          <span>Buka</span>
                          <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Add Sheet Action */}
        {!isReadOnly && (
          <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/60">
            <button
              onClick={handleAddSheet}
              className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Tambah Sheet Baru ke Proyek</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
