import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Sparkles, FolderEdit } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTitle: string;
  onSave: (newTitle: string) => void;
}

const PRESET_SUGGESTIONS = [
  'E-Commerce Database',
  'Sistem POS & Kasir',
  'Aplikasi HRM & Payroll',
  'Sistem Manajemen Sekolah',
  'Platform Blog & Media',
  'Warehouse Inventory ERP',
  'Health & Clinic System',
];

export const EditProjectNameModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentTitle,
  onSave,
}) => {
  const [title, setTitle] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isOpen, currentTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    onSave(clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-[#0d1117] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FolderEdit size={17} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Ubah Nama Proyek
              </h2>
              <p className="text-xs text-slate-400">
                Nama ini disimpan di cloud & terlihat oleh rekan kolaborasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Judul Diagram / Proyek
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: E-Commerce Store Schema"
                maxLength={60}
                required
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
                {title.length}/60
              </span>
            </div>
          </div>

          {/* Quick Suggestions */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium mb-2">
              <Sparkles size={12} className="text-amber-400" />
              <span>Saran judul cepat:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SUGGESTIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className="px-2 py-1 rounded-md bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[11px] text-slate-300 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/25 transition-all"
            >
              <Check size={14} />
              <span>Simpan Nama</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
