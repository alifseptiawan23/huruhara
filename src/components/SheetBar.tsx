import React, { useState } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { Plus, X, Layers, Pencil, Check, Trash2 } from 'lucide-react';

export const SheetBar: React.FC = () => {
  const { sheets, activeSheetId, addSheet, deleteSheet, renameSheet, setActiveSheet } = useDiagramStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const finishEdit = () => {
    if (editingId && editValue.trim()) {
      renameSheet(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      <div className="bg-[#0d1117] border-t border-slate-800/90 flex items-center px-2 sm:px-3 py-1 sm:py-1.5 gap-1.5 select-none overflow-x-auto no-scrollbar scroll-smooth shrink-0 min-h-[44px] pb-[max(env(safe-area-inset-bottom,0px),4px)] z-30">
        {/* Sheet Manager Button (Quick Sheet List on Mobile) */}
        <button
          onClick={() => setIsManagerOpen(true)}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-indigo-400 hover:text-indigo-300 text-xs font-semibold shrink-0 transition-all cursor-pointer active:scale-95"
          title="Kelola & Daftar Semua Sheet"
        >
          <Layers size={14} className="text-indigo-400" />
          <span className="hidden xs:inline text-[11px]">Sheet</span>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-1.5 py-0.2 rounded border border-indigo-500/30">
            {sheets.length}
          </span>
        </button>

        <div className="h-4 w-px bg-slate-800 shrink-0 mx-0.5" />

        {/* Horizontal Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          {sheets.map((sheet) => {
            const isActive = sheet.id === activeSheetId;
            const isEditing = editingId === sheet.id;

            return (
              <div
                key={sheet.id}
                onClick={() => setActiveSheet(sheet.id)}
                onDoubleClick={() => startEdit(sheet.id, sheet.name)}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-indigo-950/70 border-indigo-500/80 text-white font-bold shadow-md shadow-indigo-950/50 ring-1 ring-indigo-500/30'
                    : 'bg-slate-900/80 border-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                )}

                {isEditing ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={finishEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') finishEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="bg-slate-950 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-28 font-medium"
                    />
                    <button
                      onClick={finishEdit}
                      className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px]"
                      title="Simpan nama"
                    >
                      <Check size={11} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="max-w-[140px] sm:max-w-[180px] truncate">{sheet.name}</span>
                    {/* Node count pill */}
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-950/50 px-1 rounded border border-slate-800">
                      {sheet.nodes.length}
                    </span>
                  </>
                )}

                {/* Mobile & Touch Edit (Pencil) Button for Active Sheet */}
                {isActive && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(sheet.id, sheet.name);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-indigo-900/50 transition-colors ml-0.5"
                    title="Ubah nama sheet (tap untuk edit)"
                  >
                    <Pencil size={11} />
                  </button>
                )}

                {/* Close/Delete button – only when active and more than 1 sheet */}
                {isActive && sheets.length > 1 && !isEditing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Hapus sheet "${sheet.name}" beserta ${sheet.nodes.length} tabel di dalamnya?`)) {
                        deleteSheet(sheet.id);
                      }
                    }}
                    className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Hapus sheet ini"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Sheet Button */}
        <button
          onClick={addSheet}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-300 transition-all text-xs font-semibold shrink-0 cursor-pointer active:scale-95 ml-0.5"
          title="Tambah sheet baru"
        >
          <Plus size={13} className="text-indigo-400" />
          <span className="hidden sm:inline">Sheet Baru</span>
        </button>
      </div>

      {/* Mobile Sheet Manager Modal (Opens when tapping the Sheet icon) */}
      {isManagerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setIsManagerOpen(false)}
        >
          <div
            className="bg-[#0d1117] border border-slate-700/80 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl overflow-hidden ring-1 ring-white/10 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Layers size={15} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Daftar Sheet Skema</h3>
                  <p className="text-[10px] text-slate-400">Pilih, ubah nama, atau tambah sheet baru</p>
                </div>
              </div>
              <button
                onClick={() => setIsManagerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content List */}
            <div className="p-4 space-y-2 overflow-y-auto flex-1">
              {sheets.map((sh, idx) => {
                const isActive = sh.id === activeSheetId;
                const isEditing = editingId === sh.id;

                return (
                  <div
                    key={sh.id}
                    onClick={() => {
                      setActiveSheet(sh.id);
                      setIsManagerOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-950/50 border-indigo-500/80 text-white shadow-sm ring-1 ring-indigo-500/40'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                          isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={finishEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') finishEdit();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="bg-slate-950 border border-indigo-500 rounded px-2 py-1 text-xs text-white focus:outline-none w-full font-medium"
                          />
                          <button
                            onClick={finishEdit}
                            className="p-1.5 rounded bg-indigo-600 text-white"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white truncate">{sh.name}</span>
                            {isActive && (
                              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-500/30">
                                Aktif
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {sh.nodes.length} tabel · {sh.edges.length} relasi
                          </div>
                        </div>
                      )}
                    </div>

                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(sh.id, sh.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="Ubah nama"
                        >
                          <Pencil size={13} />
                        </button>
                        {sheets.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Hapus sheet "${sh.name}" beserta isinya?`)) {
                                deleteSheet(sh.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Hapus sheet"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Action */}
            <div className="p-3 border-t border-slate-800 bg-slate-900/60">
              <button
                onClick={() => {
                  addSheet();
                  setIsManagerOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer active:scale-95"
              >
                <Plus size={14} />
                <span>Tambah Sheet Baru</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
