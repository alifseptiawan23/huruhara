import React, { useState, useEffect } from 'react';
import { useDiagramStore, selectActiveSheet } from '../store/useDiagramStore';
import { generateSql } from '../utils/sqlGenerator';
import { parseSqlDdl } from '../utils/sqlParser';
import type { SqlDialect } from '../utils/sqlGenerator';
import { X, RefreshCw, Upload, Code2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export const SplitViewPanel: React.FC<Props> = ({ onClose }) => {
  const activeSheet = useDiagramStore(selectActiveSheet);
  const setDiagram = useDiagramStore((s) => s.setDiagram);
  const [dialect, setDialect] = useState<SqlDialect>('postgresql');
  const [text, setText] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Sync from canvas → text (whenever nodes/edges change and user hasn't edited)
  useEffect(() => {
    if (!isDirty) {
      setText(generateSql(activeSheet.nodes, activeSheet.edges, dialect));
    }
  }, [activeSheet.nodes, activeSheet.edges, dialect, isDirty]);

  const handleRefresh = () => {
    setText(generateSql(activeSheet.nodes, activeSheet.edges, dialect));
    setIsDirty(false);
    setApplyError(null);
  };

  const handleApply = () => {
    try {
      const { nodes, edges } = parseSqlDdl(text);
      if (nodes.length === 0) { setApplyError('Tidak ada CREATE TABLE yang valid.'); return; }
      setDiagram(nodes, edges);
      setIsDirty(false);
      setApplyError(null);
    } catch (err: unknown) {
      setApplyError(err instanceof Error ? err.message : 'Parse error');
    }
  };

  const lineCount = text.split('\n').length;

  return (
    <div className="fixed inset-0 z-40 md:relative md:inset-auto md:w-[420px] shrink-0 flex flex-col bg-[#0d1117] border-l border-slate-800 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-indigo-400" />
          <span className="text-xs font-semibold text-white">SQL Schema Editor</span>
          {isDirty && (
            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
              Unsaved
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Dialect selector */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800/60 shrink-0">
        {(['postgresql', 'mysql', 'sqlite'] as SqlDialect[]).map((d) => (
          <button
            key={d}
            onClick={() => { setDialect(d); setIsDirty(false); }}
            className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors ${
              dialect === d ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {d}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors"
            title="Sync dari canvas"
          >
            <RefreshCw size={11} />
            Sync
          </button>
        </div>
      </div>

      {/* Error */}
      {applyError && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-[11px] shrink-0">
          {applyError}
        </div>
      )}

      {/* Editor with line numbers */}
      <div className="flex flex-1 font-mono text-[11px] overflow-hidden">
        {/* Line numbers */}
        <div className="select-none py-3 pl-2 pr-2 text-right text-slate-700 border-r border-slate-800/60 bg-slate-950/40 overflow-hidden min-w-[2.5rem]" style={{ lineHeight: '1.6rem' }}>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setIsDirty(true); setApplyError(null); }}
          spellCheck={false}
          className="flex-1 p-3 bg-transparent text-slate-200 focus:outline-none resize-none select-text overflow-auto"
          style={{ lineHeight: '1.6rem' }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-800 shrink-0 bg-slate-900/50">
        <span className="text-[10px] font-mono text-slate-600">{lineCount} lines · {activeSheet.nodes.length} tables</span>
        <button
          onClick={handleApply}
          disabled={!isDirty}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            isDirty
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed'
          }`}
        >
          <Upload size={12} />
          Apply to Canvas
        </button>
      </div>
    </div>
  );
};

