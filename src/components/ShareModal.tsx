import React, { useState } from 'react';
import { useCollaborationStore } from '../store/useCollaborationStore';
import {
  X,
  Share2,
  Copy,
  Check,
  Users,
  Radio,
  Sparkles,
  Edit3,
} from 'lucide-react';

export const ShareModal: React.FC = () => {
  const {
    isShareOpen,
    setIsShareOpen,
    roomId,
    myProfile,
    collaborators,
    isConnected,
    setMyName,
  } = useCollaborationStore();

  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(myProfile.name);

  if (!isShareOpen) return null;

  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      prompt('Salin link kolaborasi berikut:', shareUrl);
    }
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      setMyName(tempName.trim());
    }
    setEditingName(false);
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
                  Kolaborasi Real-Time
                </h2>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isConnected
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  <Radio size={10} className={isConnected ? 'animate-pulse' : ''} />
                  {isConnected ? 'Live Sync' : 'Menghubungkan...'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Ajak tim mengedit diagram bersamaan layaknya Canva & Figma
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
          {/* Share Link Box */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span>Link Sesi Kolaborasi</span>
              <span className="text-[10px] text-slate-500 font-normal">
                (Siapapun dengan link ini dapat mengedit bersama)
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
                <span>{copied ? 'Tersalin!' : 'Salin'}</span>
              </button>
            </div>
          </div>

          {/* Your Profile in this room */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md ring-2 ring-offset-2 ring-offset-[#0d1117]"
                style={{ backgroundColor: myProfile.color, borderColor: myProfile.color }}
              >
                {myProfile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider block">
                  Identitas Anda di Sesi Ini
                </span>
                {editingName ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      className="text-xs bg-slate-800 text-white px-2 py-0.5 rounded border border-indigo-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="text-[11px] px-2 py-0.5 rounded bg-indigo-600 text-white font-medium"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{myProfile.name}</span>
                    <button
                      onClick={() => {
                        setTempName(myProfile.name);
                        setEditingName(true);
                      }}
                      className="text-slate-500 hover:text-slate-300 p-0.5"
                      title="Ganti nama panggilan"
                    >
                      <Edit3 size={11} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: myProfile.color }}
              />
              <span className="text-[11px]">Warna Kursor</span>
            </div>
          </div>

          {/* Online Collaborators */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Users size={14} className="text-indigo-400" />
                <span>Sedang Online ({collaborators.length})</span>
              </div>
              <span className="text-[11px] text-slate-500">Live Supabase Presence</span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {collaborators.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 border border-slate-800/80 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="font-medium text-slate-200">
                      {user.name} {user.isSelf && <span className="text-slate-500 font-normal">(Anda)</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
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
              Setiap perubahan yang Anda atau tim lakukan (menambah tabel, menggeser node, mengubah relasi) akan otomatis tersinkronisasi ke seluruh layar dalam hitungan milidetik.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

