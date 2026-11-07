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
  Eye,
  Pencil,
  Crown,
} from 'lucide-react';

export const ShareModal: React.FC = () => {
  const {
    isShareOpen,
    setIsShareOpen,
    roomId,
    collaborators,
    isConnected,
    shareRoleSetting,
    setShareRoleSetting,
    broadcastShareRoleChange,
    currentUserRole,
    projectOwnerId,
  } = useCollaborationStore();

  const { diagramTitle, sheets, saveStatus } = useDiagramStore();

  const [copied, setCopied] = useState(false);

  if (!isShareOpen) return null;

  const totalTables = sheets.reduce((acc, sh) => acc + sh.nodes.length, 0);
  const totalEdges = sheets.reduce((acc, sh) => acc + sh.edges.length, 0);

  const shareUrl = `${window.location.origin}${window.location.pathname}?project=${roomId}&role=${shareRoleSetting}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Salin link file proyek berikut:', shareUrl);
    }
  };

  const handleRoleChange = (role: 'editor' | 'viewer') => {
    setShareRoleSetting(role);
    broadcastShareRoleChange(role);
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
                Ajak tim membuka seluruh isi file diagram & kolaborasi
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
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border shrink-0 ${
                saveStatus === 'saved'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-950/80 text-amber-400 border-amber-500/40'
              }`}
            >
              {saveStatus === 'saved' ? 'Tersimpan di Cloud' : 'Perubahan Lokal'}
            </span>
          </div>

          {/* Permission Settings: Editor vs Viewer */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Hak Akses Pengguna Link Ini</span>
              <span className="text-[10px] text-indigo-400 font-medium">
                {currentUserRole === 'owner' ? '👑 Anda Pemilik Proyek' : 'Izin Dibagikan'}
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleRoleChange('editor')}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  shareRoleSetting === 'editor'
                    ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                    <Pencil size={13} className="text-indigo-400" />
                    <span>Bisa Mengedit</span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      shareRoleSetting === 'editor'
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {shareRoleSetting === 'editor' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Rekan dapat menggeser tabel, menambah kolom, & mengedit skema langsung.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('viewer')}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  shareRoleSetting === 'viewer'
                    ? 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-white">
                    <Eye size={13} className="text-amber-400" />
                    <span>Hanya Melihat</span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      shareRoleSetting === 'viewer'
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {shareRoleSetting === 'viewer' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Rekan hanya dapat melihat & export tanpa bisa mengubah kanvas.
                </p>
              </button>
            </div>
          </div>

          {/* Share Link Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Link File Proyek ({shareRoleSetting === 'editor' ? 'Mode Edit' : 'Mode Pelihat'})</span>
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
              Rekan yang membuka link ini akan membuka file proyek lengkap{' '}
              <strong className="text-slate-300">
                {shareRoleSetting === 'editor' ? 'sebagai Editor' : 'sebagai Pelihat (Viewer)'}
              </strong>
              .
            </p>
          </div>

          {/* Online Collaborators with Role Badges */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Users size={14} className="text-indigo-400" />
                <span>Anggota yang Sedang Membuka File ({collaborators.length})</span>
              </div>
              <span className="text-[11px] text-slate-500">Live Sync</span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {collaborators.map((u) => {
                const isOwner = u.role === 'owner' || (projectOwnerId && u.id === projectOwnerId);
                const isViewer = u.role === 'viewer';
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0 overflow-hidden"
                        style={{ backgroundColor: u.color }}
                      >
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          u.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-200 truncate flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {u.isSelf && <span className="text-slate-500 font-normal text-[10px]">(Anda)</span>}
                        </div>
                        {u.email && (
                          <div className="text-[10px] text-slate-500 truncate">{u.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isOwner ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-[10px] font-semibold text-amber-300 flex items-center gap-1">
                          <Crown size={10} className="text-amber-400" />
                          <span>Pemilik</span>
                        </span>
                      ) : isViewer ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300 flex items-center gap-1">
                          <Eye size={10} className="text-slate-400" />
                          <span>Pelihat</span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/30 text-[10px] font-semibold text-indigo-300 flex items-center gap-1">
                          <Pencil size={10} className="text-indigo-400" />
                          <span>Editor</span>
                        </span>
                      )}
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Aktif di ruangan" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Features note */}
          <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-900/40 flex items-start gap-2.5 text-xs text-slate-400">
            <Sparkles size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px]">
              Setiap tabel yang diedit oleh Editor otomatis tersimpan ke file cloud ini dan langsung sinkron ke seluruh anggota secara real-time. Pelihat hanya dapat melihat tanpa mengubah kanvas.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
