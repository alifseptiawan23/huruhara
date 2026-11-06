import React from 'react';
import { X, Keyboard, MousePointer, Copy, Search, Layers, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  badge?: string;
}

interface ShortcutCategory {
  title: string;
  icon: React.ReactNode;
  items: ShortcutItem[];
}

export const ShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const categories: ShortcutCategory[] = [
    {
      title: 'Manipulasi & Copy-Paste Tabel',
      icon: <Copy size={16} className="text-indigo-400" />,
      items: [
        {
          keys: [modKey, 'C'],
          description: 'Salin tabel yang dipilih (tersimpan di clipboard)',
          badge: 'Antar Sheet',
        },
        {
          keys: [modKey, 'V'],
          description: 'Tempel tabel yang disalin ke sheet yang sedang aktif',
          badge: 'Antar Sheet',
        },
        {
          keys: [modKey, 'D'],
          description: 'Duplikasi tabel terpilih secara instan di posisi baru',
        },
        {
          keys: ['Backspace', 'Delete'],
          description: 'Hapus tabel atau garis relasi yang sedang dipilih',
        },
        {
          keys: ['Shift', 'Klik Tabel'],
          description: 'Pilih beberapa tabel sekaligus secara bertahap',
        },
      ],
    },
    {
      title: 'Navigasi & Seleksi Canvas',
      icon: <MousePointer size={16} className="text-sky-400" />,
      items: [
        {
          keys: ['Shift', 'Tarik Mouse'],
          description: 'Kotak Seleksi (Rectangle Marquee) untuk memilih banyak tabel',
          badge: 'Baru',
        },
        {
          keys: ['Klik & Geser Canvas'],
          description: 'Geser pandangan canvas (Pan)',
        },
        {
          keys: ['Scroll Wheel'],
          description: 'Zoom in dan Zoom out kanvas diagram',
        },
        {
          keys: ['Pinch Trackpad'],
          description: 'Zoom kanvas dengan 2 jari pada trackpad / layar sentuh',
        },
      ],
    },
    {
      title: 'Pencarian & Alat Cepat',
      icon: <Search size={16} className="text-emerald-400" />,
      items: [
        {
          keys: [modKey, 'K'],
          description: 'Buka Quick Search Palette (cari tabel & nama kolom)',
        },
        {
          keys: [modKey, 'F'],
          description: 'Buka pencarian cepat alternatif',
        },
        {
          keys: ['?'],
          description: 'Buka panduan Shortcut Keyboard ini',
        },
        {
          keys: ['Esc'],
          description: 'Tutup modal / popover aktif',
        },
      ],
    },
    {
      title: 'Kolaborasi & Multi-Sheet',
      icon: <Layers size={16} className="text-purple-400" />,
      items: [
        {
          keys: ['Tab Sheet Bawah'],
          description: 'Beralih antar-skema / sheet dalam diagram yang sama',
        },
        {
          keys: ['Tombol Bagikan'],
          description: 'Undang rekan tim secara real-time dengan Google Login',
        },
        {
          keys: ['Auto-Sync'],
          description: 'Setiap perubahan tabel, relasi, & nama proyek otomatis tersinkronisasi',
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-[#0d1117] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Keyboard size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Pintasan Keyboard & Panduan Kontrol
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                  Shortcuts
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gunakan pintasan keyboard untuk mendesain skema database lebih cepat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Tutup (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shortcuts Content */}
        <div className="p-5 overflow-y-auto space-y-6 divide-y divide-slate-800/50">
          {categories.map((cat, idx) => (
            <div key={cat.title} className={idx > 0 ? 'pt-5' : ''}>
              <div className="flex items-center gap-2 mb-3">
                {cat.icon}
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">{cat.title}</h3>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {cat.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-900/40 hover:bg-slate-800/50 border border-slate-800/40 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 pr-4">
                      <span className="text-slate-200">{item.description}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-950/70 text-indigo-300 border border-indigo-500/30">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, ki) => (
                        <React.Fragment key={ki}>
                          {ki > 0 && <span className="text-slate-600 text-xs font-bold">+</span>}
                          <kbd className="px-2 py-0.8 min-w-[22px] text-center text-[11px] font-mono font-semibold text-slate-200 bg-slate-800 border border-slate-700/80 rounded-md shadow-sm">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900/30 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-amber-400" />
            <span>Tekan <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300">?</kbd> kapan saja untuk membuka jendela ini</span>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
