import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { useDiagramStore } from '../store/useDiagramStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Upload,
  FileCode,
  RotateCcw,
  Database,
  Camera,
  Workflow,
  PanelRight,
  Search,
  Zap,
  ZapOff,
  Cloud,
  Folder,
  LogIn,
  LogOut,
  User,
  Loader2,
  Check,
  Share2,
} from 'lucide-react';

interface Props {
  onOpenExportSql: () => void;
  onOpenImportSql: () => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  onOpenMyDiagrams: () => void;
}

export const Toolbar: React.FC<Props> = ({
  onOpenExportSql,
  onOpenImportSql,
  onOpenSearch,
  onOpenAuth,
  onOpenMyDiagrams,
}) => {
  const {
    addTable,
    resetToSample,
    applyAutoLayout,
    toggleSplitView,
    toggleEdgeAnimation,
    showSplitView,
    animateEdges,
    diagramId,
    diagramTitle,
    setDiagramTitle,
    sheets,
    activeSheetId,
  } = useDiagramStore();

  const { user, signOut } = useAuthStore();
  const { collaborators, setIsShareOpen } = useCollaborationStore();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const nodes = useDiagramStore((s) => s.sheets.find((sh) => sh.id === s.activeSheetId)?.nodes ?? []);
  const edges = useDiagramStore((s) => s.sheets.find((sh) => sh.id === s.activeSheetId)?.edges ?? []);

  const handleExportPng = async () => {
    const el = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, { backgroundColor: '#020617', quality: 0.98, pixelRatio: 2 });
      const a = document.createElement('a');
      a.download = `${diagramTitle.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.png`;
      a.href = dataUrl;
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveToCloud = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }

    setSaving(true);
    setSaveSuccess(false);

    try {
      if (diagramId) {
        // Update existing diagram
        const { error } = await supabase
          .from('diagrams')
          .update({
            title: diagramTitle,
            sheets,
            active_sheet_id: activeSheetId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', diagramId);

        if (error) throw error;
      } else {
        // Insert new diagram
        const { data, error } = await supabase
          .from('diagrams')
          .insert({
            user_id: user.id,
            title: diagramTitle,
            sheets,
            active_sheet_id: activeSheetId,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          useDiagramStore.setState({ diagramId: data.id });
          useCollaborationStore.getState().initSession(data.id, user);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(`Gagal menyimpan diagram: ${err?.message || 'Error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <header className="h-14 bg-[#0d1117]/95 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between z-20 relative select-none">
      {/* Brand & Project Title */}
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Database size={16} className="text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0d1117]" />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={diagramTitle}
            onChange={(e) => setDiagramTitle(e.target.value)}
            className="text-xs font-bold text-white bg-transparent hover:bg-slate-800/80 focus:bg-slate-800 px-2 py-1 rounded-md border border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors max-w-[150px] truncate"
            title="Klik untuk ubah judul diagram"
          />

          {/* Cloud Save Button */}
          <button
            onClick={handleSaveToCloud}
            disabled={saving}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
              saveSuccess
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-400'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
            }`}
            title={user ? 'Simpan diagram ke cloud Supabase' : 'Login untuk simpan ke cloud'}
          >
            {saving ? (
              <Loader2 size={13} className="animate-spin text-indigo-400" />
            ) : saveSuccess ? (
              <Check size={13} className="text-emerald-400" />
            ) : (
              <Cloud size={13} className={user ? 'text-indigo-400' : 'text-slate-400'} />
            )}
            <span>{saving ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'Simpan'}</span>
          </button>

          {/* My Diagrams Button */}
          <button
            onClick={onOpenMyDiagrams}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-all"
            title="Buka daftar diagram saya"
          >
            <Folder size={13} className="text-slate-400" />
            <span>Proyek</span>
          </button>
        </div>
      </div>

      {/* Center Tool Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={addTable}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all hover:scale-[1.02] shadow-md shadow-indigo-600/20"
        >
          <Plus size={14} />
          <span>New Table</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5" />

        <button
          onClick={onOpenImportSql}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-all"
        >
          <Upload size={13} className="text-slate-400" />
          <span>Import SQL</span>
        </button>

        <button
          onClick={onOpenExportSql}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-all"
        >
          <FileCode size={13} className="text-slate-400" />
          <span>Export</span>
        </button>

        <button
          onClick={handleExportPng}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-all"
        >
          <Camera size={13} className="text-slate-400" />
          <span>PNG</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5" />

        <button
          onClick={applyAutoLayout}
          title="Auto-layout dengan Dagre"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-violet-600/80 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-all"
        >
          <Workflow size={13} />
          <span>Auto Layout</span>
        </button>

        <button
          onClick={toggleSplitView}
          title="SQL Editor Panel"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
            showSplitView
              ? 'bg-indigo-600/20 border-indigo-600/50 text-indigo-300'
              : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
          }`}
        >
          <PanelRight size={13} />
          <span>SQL Panel</span>
        </button>

        <button
          onClick={onOpenSearch}
          title="Cari tabel (Ctrl+K)"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-all"
        >
          <Search size={13} />
          <span>Search</span>
          <kbd className="text-[9px] ml-0.5 opacity-50">⌘K</kbd>
        </button>

        <button
          onClick={toggleEdgeAnimation}
          title="Toggle animasi garis relasi"
          className={`p-1.5 rounded-lg border text-xs transition-all ${
            animateEdges
              ? 'bg-emerald-600/20 border-emerald-600/40 text-emerald-400'
              : 'bg-slate-800/80 border-slate-700/60 text-slate-500 hover:text-white'
          }`}
        >
          {animateEdges ? <Zap size={14} /> : <ZapOff size={14} />}
        </button>
      </div>

      {/* Right: Stats, Reset, & User Auth Profile */}
      <div className="flex items-center gap-2">
        <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px]">
          <span className="text-indigo-400 font-bold">{nodes.length}</span>
          <span className="text-slate-700">·</span>
          <span className="text-violet-400 font-bold">{edges.length}</span>
          <span className="text-slate-600 ml-1">t·r</span>
        </div>

        <button
          onClick={resetToSample}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-200 text-xs px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Reset ke skema contoh"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>

        <div className="h-5 w-px bg-slate-800 mx-0.5" />

        {/* Live Multiplayer Collaborators Stack (Canva / Figma style) */}
        <div className="flex items-center gap-2">
          {collaborators.length > 0 && (
            <div className="flex items-center -space-x-2" title="Pengguna yang sedang online di sesi ini">
              {collaborators.slice(0, 4).map((collab) => (
                <div
                  key={collab.id}
                  title={`${collab.name} ${collab.isSelf ? '(Anda)' : ''} - Sedang aktif`}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md border-2 border-[#0d1117] transition-transform hover:scale-110 hover:z-10 cursor-pointer select-none"
                  style={{ backgroundColor: collab.color }}
                  onClick={() => setIsShareOpen(true)}
                >
                  {collab.avatar ? (
                    <img src={collab.avatar} alt={collab.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    collab.name.charAt(0).toUpperCase()
                  )}
                </div>
              ))}
              {collaborators.length > 4 && (
                <div
                  onClick={() => setIsShareOpen(true)}
                  className="w-7 h-7 rounded-full bg-slate-800 border-2 border-[#0d1117] text-slate-300 flex items-center justify-center text-[10px] font-semibold cursor-pointer hover:bg-slate-700 select-none"
                >
                  +{collaborators.length - 4}
                </div>
              )}
            </div>
          )}

          {/* Share / Kolaborasi Button */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            title="Undang tim & edit skema bersamaan (Canva-style)"
          >
            <Share2 size={13} />
            <span>Bagikan</span>
            {collaborators.length > 1 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-bold">
                {collaborators.length}
              </span>
            )}
          </button>
        </div>

        <div className="h-5 w-px bg-slate-800 mx-0.5" />

        {/* User Auth Section */}
        {user ? (
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-300 font-medium max-w-[140px] truncate"
              title={user.email}
            >
              <User size={12} className="shrink-0" />
              <span className="truncate">{user.email?.split('@')[0]}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700/60 transition-colors"
              title="Keluar / Logout"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all hover:scale-[1.02]"
          >
            <LogIn size={13} className="text-indigo-400" />
            <span>Masuk</span>
          </button>
        )}
      </div>
    </header>
  );
};
