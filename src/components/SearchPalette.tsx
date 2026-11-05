import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDiagramStore, selectActiveSheet } from '../store/useDiagramStore';
import { Search, Table, X, Hash } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFocusTable: (tableId: string) => void;
}

export const SearchPalette: React.FC<Props> = ({ isOpen, onClose, onFocusTable }) => {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeSheet = useDiagramStore(selectActiveSheet);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) {
      return activeSheet.nodes.map((n) => ({
        id: n.id,
        tableName: n.data.name,
        matchedColumn: null as string | null,
        columnCount: n.data.columns.length,
        color: n.data.color,
      }));
    }

    const matches = [];
    for (const node of activeSheet.nodes) {
      if (node.data.name.toLowerCase().includes(q)) {
        matches.push({ id: node.id, tableName: node.data.name, matchedColumn: null, columnCount: node.data.columns.length, color: node.data.color });
      } else {
        for (const col of node.data.columns) {
          if (col.name.toLowerCase().includes(q)) {
            matches.push({ id: node.id, tableName: node.data.name, matchedColumn: col.name, columnCount: node.data.columns.length, color: node.data.color });
            break;
          }
        }
      }
    }
    return matches;
  }, [query, activeSheet.nodes]);

  const safeIdx = Math.min(cursor, results.length - 1);

  const handleSelect = (id: string) => {
    onFocusTable(id);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && results[safeIdx]) handleSelect(results[safeIdx].id);
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 sm:pt-24 p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#0d1117] border border-slate-700/70 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-white/5">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Cari tabel atau kolom..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] font-mono text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Tidak ada tabel yang cocok
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.id}-${i}`}
                onClick={() => handleSelect(r.id)}
                onMouseEnter={() => setCursor(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === safeIdx ? 'bg-indigo-600/20' : 'hover:bg-slate-800/60'
                }`}
              >
                {/* Color dot */}
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Table size={12} className="text-slate-500 shrink-0" />
                    <span className="text-sm font-medium text-white font-mono truncate">{r.tableName}</span>
                    {r.matchedColumn && (
                      <>
                        <Hash size={11} className="text-slate-600" />
                        <span className="text-xs text-indigo-400 font-mono">{r.matchedColumn}</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 ml-4">{r.columnCount} kolom</div>
                </div>

                {i === safeIdx && (
                  <kbd className="text-[10px] font-mono text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">↵</kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-800 flex items-center gap-4 text-[11px] text-slate-600">
          <span><kbd className="bg-slate-800 px-1 rounded">↑↓</kbd> navigasi</span>
          <span><kbd className="bg-slate-800 px-1 rounded">↵</kbd> pilih & fokus</span>
          <span className="ml-auto font-mono">{results.length} table{results.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};

