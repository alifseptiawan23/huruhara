import React, { useState, useMemo } from 'react';
import { useDiagramStore, selectActiveSheet } from '../store/useDiagramStore';
import { generateSql, generatePrisma, generateDrizzle, generateMarkdown, EXPORT_FORMATS } from '../utils/sqlGenerator';
import type { ExportFormat } from '../utils/sqlGenerator';
import { X, Copy, Check, Download, Database } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportSqlModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const activeSheet = useDiagramStore(selectActiveSheet);
  const { nodes, edges } = activeSheet;
  const [format, setFormat] = useState<ExportFormat>('postgresql');
  const [copied, setCopied] = useState(false);

  const selectedFormat = EXPORT_FORMATS.find((f) => f.id === format)!;

  const output = useMemo(() => {
    if (format === 'prisma')   return generatePrisma(nodes, edges);
    if (format === 'drizzle')  return generateDrizzle(nodes, edges);
    if (format === 'markdown') return generateMarkdown(nodes, edges);
    return generateSql(nodes, edges, format as any);
  }, [nodes, edges, format]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const ext = format === 'prisma' ? 'prisma' : format === 'drizzle' ? 'ts' : format === 'markdown' ? 'md' : 'sql';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schema.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groups = [
    { label: 'SQL Dialects', key: 'sql' },
    { label: 'ORM Schema', key: 'orm' },
    { label: 'Documentation', key: 'docs' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#0d1117] border border-slate-700/60 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[88vh] ring-1 ring-white/5 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black text-white shadow-lg"
              style={{ backgroundColor: selectedFormat.color }}>
              {selectedFormat.badge}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Export Schema</h2>
              <p className="text-[11px] text-slate-400">{selectedFormat.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Format Selector */}
        <div className="px-6 pt-4 pb-3 border-b border-slate-800/60 shrink-0">
          {groups.map((g) => (
            <div key={g.key} className="mb-3 last:mb-0">
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-1.5">{g.label}</p>
              <div className="flex flex-wrap gap-1.5">
                {EXPORT_FORMATS.filter((f) => f.group === g.key).map((f) => (
                  <button key={f.id} onClick={() => setFormat(f.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      format === f.id
                        ? 'text-white border-transparent'
                        : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-500'
                    }`}
                    style={format === f.id ? { backgroundColor: f.color, borderColor: f.color } : {}}>
                    <span className={`w-4 h-4 rounded text-[9px] font-black flex items-center justify-center ${format === f.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {f.badge}
                    </span>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Code Viewer */}
        <div className="flex-1 overflow-auto bg-[#090d13] flex">
          <div className="select-none py-4 pl-3 pr-2.5 text-right text-slate-700 border-r border-slate-800/60 bg-slate-950/40 font-mono text-[11px]" style={{ lineHeight: '1.75rem' }}>
            {output.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          <pre className="p-4 text-slate-200 font-mono text-[11px] overflow-x-auto flex-1 select-text whitespace-pre" style={{ lineHeight: '1.75rem' }}>
            {output || '-- Tidak ada tabel.'}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800/80 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Database size={12} />
            <span>
              <span className="text-indigo-400 font-semibold">{nodes.length}</span> tabel ·{' '}
              <span className="text-indigo-400 font-semibold">{edges.length}</span> relasi ·{' '}
              <span className="text-slate-500">{output.split('\n').length} baris</span>
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors">
              <Download size={13} />Download
            </button>
            <button onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                copied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Tersalin!' : 'Salin'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
