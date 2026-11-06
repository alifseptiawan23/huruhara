import React, { useState } from 'react';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { useDiagramStore } from '../store/useDiagramStore';
import {
  X,
  Share2,
  Copy,
  Check,
  Users,
  Radio,
  Sparkles,
  ShieldCheck,
  FolderGit2,
  Layers,
  Database,
} from 'lucide-react';

export const ShareModal: React.FC = () => {
  const {
    isShareOpen,
    setIsShareOpen,
    roomId,
    myProfile,
    collaborators,
    isConnected,
  } = useCollaborationStore();

  const { diagramTitle, sheets } = useDiagramStore();

  const [copied, setCopied] = useState(false);

  if (!isShareOpen) return null;

  const totalTables = sheets.reduce((acc, sh) => acc + sh.nodes.length, 0);
  const totalEdges = sheets.reduce((acc, sh) => acc + sh.edges.length, 0);

  const shareUrl = `${window.location.origin}${window.location.pathname}?project=${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Salin link file proyek berikut:', shareUrl);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsShareOpen(false);
      }}
    >
      <div className="bg-[#0d1117] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Share2 size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-white tracking-tight">
                  Bagikan File Proyek
                </h2>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isConnected
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  <Radio size={10} className={isConnected ? 'animate-pulse' : ''} />
                  {isConnected ? 'Live Cloud Sync' : 'Menghubungkan...'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Ajak tim membuka seluruh isi file diagram & edit bersamaan
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsShareOpen(false)}
            className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Project File Info Card */}
          <div className="p-3.5 rounded-xl bg-slate-900/70 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <FolderGit2 size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  File Proyek Cloud
                </div>
                <div className="text-xs sm:text-sm font-bold text-white truncate">
                  {diagramTitle}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Layers size={11} className="text-violet-400" /> {sheets.length} Sheet
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Database size={11} className="text-sky-400" /> {totalTables} Tabel
                  </span>
                  <span>·</span>
                  <span>{totalEdges} Relasi</span>
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 shrink-0">
              Tersimpan
            </span>
          </div>

          {/* Share Link Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Link File Proyek (Siapapun dengan link ini)</span>
              <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                <ShieldCheck size={12} /> Wajib Login Google
              </span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono truncate select-all">
                {shareUrl}
              </div>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-md ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Rekan yang membuka link ini akan langsung membuka file proyek yang sama (termasuk Sheet 1 & semua sheet lainnya), serta dapat berkontribusi secara real-time.
            </p>
          </div>

          {/* Your Profile in this room */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-offset-2 ring-offset-[#0d1117] overflow-hidden shrink-0"
                style={{ backgroundColor: myProfile.color, borderColor: myProfile.color }}
              >
                {myProfile.avatar ? (
                  <img src={myProfile.avatar} alt={myProfile.name} className="w-full h-full object-cover" />
                ) : (
                  myProfile.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                  Identitas Google Anda
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">{myProfile.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-medium">
                    Terverifikasi
                  </span>
                </div>
                {myProfile.email && (
                  <span className="text-[11px] text-slate-400 block">{myProfile.email}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: myProfile.color }}
              />
              <span className="text-[11px] hidden sm:inline">Warna Kursor</span>
            </div>
          </div>

          {/* Online Collaborators */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Users size={14} className="text-indigo-400" />
                <span>Anggota yang Sedang Membuka File ({collaborators.length})</span>
              </div>
              <span className="text-[11px] text-slate-500">Live Sync</span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {collaborators.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 overflow-hidden"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-slate-200 truncate">
                        {user.name} {user.isSelf && <span className="text-slate-500 font-normal">(Anda)</span>}
                      </div>
                      {user.email && (
                        <div className="text-[10px] text-slate-500 truncate">{user.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-[10px] text-emerald-400 font-medium">Aktif</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features note */}
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/40 flex items-start gap-2.5 text-xs text-slate-400">
            <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              Setiap tabel yang Anda geser, tambah, atau relasikan akan otomatis tersimpan ke file proyek ini dan tersinkronisasi langsung ke layar seluruh anggota.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
