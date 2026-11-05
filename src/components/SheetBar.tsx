import React, { useState } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { Plus, X, Layers } from 'lucide-react';

export const SheetBar: React.FC = () => {
  const { sheets, activeSheetId, addSheet, deleteSheet, renameSheet, setActiveSheet } = useDiagramStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
    <div className="h-10 bg-[#0d1117] border-t border-slate-800/80 flex items-center px-2 gap-1 select-none overflow-x-auto">
      {/* Sheet Icon */}
      <Layers size={13} className="text-slate-600 mr-1 shrink-0" />

      {/* Tabs */}
      {sheets.map((sheet) => {
        const isActive = sheet.id === activeSheetId;
        const isEditing = editingId === sheet.id;

        return (
          <div
            key={sheet.id}
            onClick={() => setActiveSheet(sheet.id)}
            onDoubleClick={() => startEdit(sheet.id, sheet.name)}
            className={`group flex items-center gap-1.5 px-3 py-1 rounded-t-lg border-b-2 text-xs font-medium cursor-pointer transition-all shrink-0 ${
              isActive
                ? 'bg-slate-800 border-indigo-500 text-white'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/60'
            }`}
          >
            {isEditing ? (
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={finishEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') finishEdit();
                  if (e.key === 'Escape') setEditingId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-b border-indigo-400 focus:outline-none w-24 text-white"
              />
            ) : (
              <span className="max-w-[120px] truncate">{sheet.name}</span>
            )}

            {/* Close button – only when active and more than 1 sheet */}
            {isActive && sheets.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSheet(sheet.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 ml-0.5 transition-opacity"
              >
                <X size={11} />
              </button>
            )}
          </div>
        );
      })}

      {/* Add Sheet */}
      <button
        onClick={addSheet}
        className="flex items-center gap-1 px-2 py-1 rounded text-slate-600 hover:text-indigo-400 hover:bg-slate-800/60 transition-colors text-xs"
        title="Tambah sheet baru"
      >
        <Plus size={13} />
        <span>New Sheet</span>
      </button>

      {/* Right: Sheet count */}
      <div className="ml-auto text-[10px] text-slate-700 font-mono shrink-0 pr-2">
        {sheets.length} sheet{sheets.length > 1 ? 's' : ''}
      </div>
    </div>
  );
};
