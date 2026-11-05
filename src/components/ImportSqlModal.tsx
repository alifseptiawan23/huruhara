import React, { useState } from 'react';
import { useDiagramStore } from '../store/useDiagramStore';
import { parseSqlDdl } from '../utils/sqlParser';
import { X, Upload, AlertCircle, CheckCircle2, FileCode2, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_IMPORT = `-- Contoh: E-Commerce Schema
CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP
);

CREATE TABLE categories (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  category_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id BIGINT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);`;

const QUICK_SAMPLES = [
  { label: 'E-Commerce', sql: SAMPLE_IMPORT },
  {
    label: 'Blog',
    sql: `CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE posts (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  published_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE comments (
  id BIGINT PRIMARY KEY,
  post_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  body TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES posts(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE tags (
  id BIGINT PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);`,
  },
  {
    label: 'SaaS / Multi-Tenant',
    sql: `CREATE TABLE organizations (
  id BIGINT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL
);

CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  org_id BIGINT NOT NULL,
  email VARCHAR(100) NOT NULL,
  role VARCHAR(30) NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE projects (
  id BIGINT PRIMARY KEY,
  org_id BIGINT NOT NULL,
  name VARCHAR(255) NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE tasks (
  id BIGINT PRIMARY KEY,
  project_id BIGINT NOT NULL,
  assigned_to BIGINT,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(30) NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);`,
  },
];

export const ImportSqlModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { setDiagram } = useDiagramStore();
  const [sqlInput, setSqlInput] = useState(SAMPLE_IMPORT);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ tables: number; relations: number } | null>(null);

  if (!isOpen) return null;

  const analyzeInput = (sql: string) => {
    setSqlInput(sql);
    setError(null);
    try {
      const { nodes, edges } = parseSqlDdl(sql);
      if (nodes.length > 0) {
        setPreview({ tables: nodes.length, relations: edges.length });
      } else {
        setPreview(null);
      }
    } catch {
      setPreview(null);
    }
  };

  const handleImport = () => {
    try {
      const { nodes, edges } = parseSqlDdl(sqlInput);
      if (nodes.length === 0) {
        setError('Tidak ada perintah CREATE TABLE yang valid ditemukan. Pastikan SQL kamu menggunakan sintaks DDL standar.');
        return;
      }
      setDiagram(nodes, edges);
      setError(null);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mem-parsing script SQL.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#0d1117] border border-slate-700/60 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden ring-1 ring-white/5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg">
              <FileCode2 size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">Import SQL DDL</h2>
              <p className="text-[11px] text-slate-400">
                Tempel script SQL → Diagram otomatis tersusun rapi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Quick Samples ── */}
        <div className="px-6 pt-3.5 pb-3 border-b border-slate-800/60 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mr-1">
            <Sparkles size={12} />
            <span>Contoh cepat:</span>
          </div>
          {QUICK_SAMPLES.map((s) => (
            <button
              key={s.label}
              onClick={() => analyzeInput(s.sql)}
              className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* ── Textarea ── */}
        <div className="flex-1 flex flex-col px-6 py-4 gap-3 overflow-hidden">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/50 border border-red-800/70 text-red-300 text-xs shrink-0">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {preview && !error && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs shrink-0">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>
                Terdeteksi{' '}
                <strong className="text-emerald-200">{preview.tables} tabel</strong> dan{' '}
                <strong className="text-emerald-200">{preview.relations} relasi</strong>.
                Diagram akan disusun otomatis rapi! ✨
              </span>
            </div>
          )}

          <div className="flex flex-1 font-mono text-xs rounded-xl border border-slate-800 overflow-hidden bg-[#090d13]">
            {/* Line numbers */}
            <div className="select-none py-3 pl-3 pr-2.5 text-right text-slate-600 border-r border-slate-800 bg-slate-950/40 min-w-[2.75rem] overflow-hidden">
              {sqlInput.split('\n').map((_, i) => (
                <div key={i} className="leading-[1.6rem]">{i + 1}</div>
              ))}
            </div>
            {/* Editor */}
            <textarea
              value={sqlInput}
              onChange={(e) => analyzeInput(e.target.value)}
              placeholder="-- Paste script CREATE TABLE ... di sini"
              spellCheck={false}
              className="flex-1 p-3 bg-transparent text-slate-200 focus:outline-none resize-none leading-[1.6rem] select-text"
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 gap-2 border-t border-slate-800/80 bg-slate-900/50 shrink-0">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Mendukung: PostgreSQL · MySQL · SQLite · SQL Server · Oracle
          </span>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleImport}
              disabled={!preview}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                preview
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Upload size={13} />
              <span>Import ke Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
