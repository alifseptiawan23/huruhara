import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { useDiagramStore } from '../store/useDiagramStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCollaborationStore } from '../store/useCollaborationStore';
import { supabase } from '../lib/supabase';
import { EditProjectNameModal } from './EditProjectNameModal';
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
  Menu,
  X,
  BoxSelect,
  Copy,
  ClipboardPaste,
  Pencil,
  Keyboard,
} from 'lucide-react';

interface Props {
  onOpenExportSql: () => void;
  onOpenImportSql: () => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  onOpenMyDiagrams: () => void;
  onOpenShortcuts: () => void;
  onShowToast?: (msg: string) => void;
}

export const Toolbar: React.FC<Props> = ({
  onOpenExportSql,
  onOpenImportSql,
  onOpenSearch,
  onOpenAuth,
  onOpenMyDiagrams,
  onOpenShortcuts,
  onShowToast,
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
    clipboard,
    copySelectedTables,
    pasteTables,
    isSelectMode,
    toggleSelectMode,
  } = useDiagramStore();

  const { user, signOut } = useAuthStore();
  const { collaborators, startSharing } = useCollaborationStore();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);

  const handleSaveProjectName = async (newTitle: string) => {
    setDiagramTitle(newTitle);
    useCollaborationStore.getState().broadcastTitleChange(newTitle);

    if (diagramId && user) {
      try {
        await supabase
          .from('diagrams')
          .update({ title: newTitle, updated_at: new Date().toISOString() })
          .eq('id', diagramId);
      } catch (err) {
        console.error('Failed to update title in cloud:', err);
      }
    }
    onShowToast?.(`✏️ Nama proyek diubah: "${newTitle}"`);
  };

  const nodes = useDiagramStore((s) => s.sheets.find((sh) => sh.id === s.activeSheetId)?.nodes ?? []);
  const edges = useDiagramStore((s) => s.sheets.find((sh) => sh.id === s.activeSheetId)?.edges ?? []);

  const handleShareClick = () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    startSharing(diagramId ? `diag_${diagramId}` : undefined, user);
  };

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
    <>
      <header className="h-14 bg-[#0d1117]/95 backdrop-blur-md border-b border-slate-800/80 px-2 sm:px-4 flex items-center justify-between z-30 relative select-none">
        {/* Brand & Project Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Database size={15} className="text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0d1117]" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Project Title Button with Pencil Icon */}
            <button
              onClick={() => setIsRenameOpen(true)}
              className="group flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 text-xs font-bold text-white transition-all max-w-[95px] xs:max-w-[130px] sm:max-w-[180px] md:max-w-[220px]"
              title="Klik untuk ubah nama proyek"
            >
              <span className="truncate">{diagramTitle}</span>
              <Pencil size={11} className="text-slate-400 group-hover:text-indigo-400 shrink-0 transition-colors" />
            </button>

            {/* Cloud Save Button */}
            <button
              onClick={handleSaveToCloud}
              disabled={saving}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
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
              <span className="hidden sm:inline">
                {saving ? 'Menyimpan...' : saveSuccess ? 'Tersimpan!' : 'Simpan'}
              </span>
            </button>

            {/* My Diagrams Button (Hidden on small mobile) */}
            <button
              onClick={onOpenMyDiagrams}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-all"
              title="Buka daftar diagram saya"
            >
              <Folder size={13} className="text-slate-400" />
              <span>Proyek</span>
            </button>
          </div>
        </div>

        {/* Center Tool Buttons (Visible on desktop lg+) */}
        <div className="hidden lg:flex items-center gap-1.5">
          <button
            onClick={addTable}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all hover:scale-[1.02] shadow-md shadow-indigo-600/20"
          >
            <Plus size={14} />
            <span>New Table</span>
          </button>

          {/* Rectangle Selection & Copy/Paste Controls */}
          <button
            onClick={toggleSelectMode}
            title={
              isSelectMode
                ? 'Mode Kotak Seleksi AKTIF (Klik & geser untuk memilih banyak tabel). Klik untuk kembali ke mode geser canvas.'
                : 'Aktifkan Mode Kotak Seleksi (Rectangle Select). Anda juga bisa tahan tombol Shift sambil geser mouse.'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
              isSelectMode
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
            }`}
          >
            <BoxSelect size={13} />
            <span className="hidden xl:inline">{isSelectMode ? 'Kotak Seleksi (Aktif)' : 'Kotak Seleksi'}</span>
          </button>

          <button
            onClick={() => {
              const count = copySelectedTables();
              if (count > 0) {
                onShowToast?.(`📋 ${count} tabel disalin! Buka sheet lain lalu tekan Tempel (Ctrl+V)`);
              } else {
                onShowToast?.('Pilih tabel terlebih dahulu (klik atau tarik kotak seleksi)');
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-all"
            title="Salin tabel terpilih (Ctrl+C)"
          >
            <Copy size={13} />
            <span className="hidden xl:inline">Salin</span>
          </button>

          <button
            onClick={() => {
              const count = pasteTables();
              if (count > 0) {
                onShowToast?.(`✨ ${count} tabel berhasil ditempel ke sheet ini!`);
              } else {
                onShowToast?.('Belum ada tabel yang disalin. Salin tabel terlebih dahulu dengan Ctrl+C');
              }
            }}
            disabled={!clipboard}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
              clipboard
                ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/60'
                : 'opacity-40 cursor-not-allowed bg-slate-900 border-slate-800 text-slate-600'
            }`}
            title={clipboard ? `Tempel ${clipboard.nodes.length} tabel ke sheet ini (Ctrl+V)` : 'Tempel tabel (Ctrl+V)'}
          >
            <ClipboardPaste size={13} />
            <span className="hidden xl:inline">Tempel</span>
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
            onClick={onOpenShortcuts}
            title="Pintasan Keyboard (Shortcuts / ?)"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-all"
          >
            <Keyboard size={13} className="text-indigo-400" />
            <span className="hidden xl:inline">Shortcuts</span>
            <kbd className="text-[9px] ml-0.5 opacity-50 font-mono">?</kbd>
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

        {/* Tablet quick action buttons (md to lg) */}
        <div className="hidden md:flex lg:hidden items-center gap-1.5">
          <button
            onClick={addTable}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
          >
            <Plus size={13} />
            <span>Table</span>
          </button>
          <button
            onClick={applyAutoLayout}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60"
            title="Auto Layout"
          >
            <Workflow size={14} />
          </button>
          <button
            onClick={toggleSplitView}
            className={`p-1.5 rounded-lg border transition-all ${
              showSplitView ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700/60'
            }`}
            title="SQL Editor Panel"
          >
            <PanelRight size={14} />
          </button>
        </div>

        {/* Right Section: Collaborators, Share, Auth, Mobile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Add Table on Mobile */}
          <button
            onClick={addTable}
            className="flex md:hidden items-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
            title="Tambah Tabel Baru"
          >
            <Plus size={14} />
            <span className="hidden xs:inline">Tabel</span>
          </button>

          {/* Live Multiplayer Collaborators Stack */}
          {collaborators.length > 0 && (
            <div
              className="flex items-center -space-x-1.5 sm:-space-x-2 cursor-pointer"
              title="Pengguna yang sedang online di sesi ini"
              onClick={handleShareClick}
            >
              {collaborators.slice(0, 3).map((collab) => (
                <div
                  key={collab.id}
                  title={`${collab.name} ${collab.isSelf ? '(Anda)' : ''}`}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white shadow-md border-2 border-[#0d1117] transition-transform hover:scale-110 select-none"
                  style={{ backgroundColor: collab.color }}
                >
                  {collab.avatar ? (
                    <img src={collab.avatar} alt={collab.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    collab.name.charAt(0).toUpperCase()
                  )}
                </div>
              ))}
              {collaborators.length > 3 && (
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-800 border-2 border-[#0d1117] text-slate-300 flex items-center justify-center text-[9px] sm:text-[10px] font-semibold select-none">
                  +{collaborators.length - 3}
                </div>
              )}
            </div>
          )}

          {/* Share / Kolaborasi Button */}
          <button
            onClick={handleShareClick}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
            title="Undang tim & edit skema bersamaan (Canva-style)"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">Bagikan</span>
            {collaborators.length > 1 && (
              <span className="px-1 py-0.2 rounded-full bg-black/40 text-[9px] font-bold">
                {collaborators.length}
              </span>
            )}
          </button>

          {/* Reset button (Desktop only) */}
          <button
            onClick={resetToSample}
            className="hidden xl:flex items-center gap-1 text-slate-500 hover:text-slate-200 text-xs px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Reset ke skema contoh"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          {/* User Auth Section */}
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div
                className="hidden sm:flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-300 font-medium max-w-[100px] sm:max-w-[130px] truncate"
                title={user.email}
              >
                <User size={12} className="shrink-0" />
                <span className="truncate">{user.email?.split('@')[0]}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="hidden sm:flex p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-700/60 transition-colors"
                title="Keluar / Logout"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-all hover:scale-[1.02]"
            >
              <LogIn size={13} className="text-indigo-400" />
              <span className="hidden xs:inline">Masuk</span>
            </button>
          )}

          {/* Mobile & Tablet Drawer Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-colors ml-0.5"
            title="Menu lainnya"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile & Tablet Action Drawer / Sheet */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden pt-14"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="bg-[#0d1117] border-b border-slate-800 shadow-2xl p-4 space-y-3 max-h-[80vh] overflow-y-auto animate-in slide-in-from-top duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Project Title Banner in Mobile Drawer */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Folder size={14} className="text-indigo-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-medium">Proyek Aktif</div>
                  <div className="text-xs font-bold text-white truncate">{diagramTitle}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setIsRenameOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/50 hover:border-indigo-400 text-indigo-200 hover:text-white rounded-lg text-xs font-medium transition-colors shrink-0"
              >
                <Pencil size={11} />
                <span>Ubah</span>
              </button>
            </div>

            {/* Quick Overview */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
              <span className="text-xs font-semibold text-slate-400">Panel Kontrol</span>
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                <span className="text-indigo-400 font-bold">{nodes.length}</span> tabel ·{' '}
                <span className="text-violet-400 font-bold">{edges.length}</span> relasi
              </div>
            </div>

            {/* Grid Tools */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  toggleSelectMode();
                  setMobileMenuOpen(false);
                  onShowToast?.(
                    isSelectMode
                      ? 'Mode Geser Canvas aktif'
                      : 'Mode Kotak Seleksi aktif! Tarik kotak di atas tabel untuk memilih banyak tabel'
                  );
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-slate-200 ${
                  isSelectMode ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200' : 'bg-slate-900 border-slate-800'
                }`}
              >
                <BoxSelect size={14} className="text-indigo-400 shrink-0" />
                <span>{isSelectMode ? 'Kotak Seleksi (Aktif)' : 'Kotak Seleksi'}</span>
              </button>

              <button
                onClick={() => {
                  const count = copySelectedTables();
                  setMobileMenuOpen(false);
                  if (count > 0) {
                    onShowToast?.(`📋 ${count} tabel disalin! Buka sheet lain lalu tekan Tempel`);
                  } else {
                    onShowToast?.('Pilih tabel terlebih dahulu sebelum menyalin');
                  }
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
              >
                <Copy size={14} className="text-amber-400 shrink-0" />
                <span>Salin Tabel</span>
              </button>

              <button
                onClick={() => {
                  const count = pasteTables();
                  setMobileMenuOpen(false);
                  if (count > 0) {
                    onShowToast?.(`✨ ${count} tabel berhasil ditempel!`);
                  } else {
                    onShowToast?.('Belum ada tabel yang disalin');
                  }
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
              >
                <ClipboardPaste size={14} className="text-emerald-400 shrink-0" />
                <span>Tempel Tabel</span>
              </button>

              <button
                onClick={() => {
                  onOpenMyDiagrams();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
              >
                <Folder size={14} className="text-indigo-400 shrink-0" />
                <span>Proyek Saya</span>
              </button>

              <button
                onClick={() => {
                  onOpenSearch();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
              >
                <Search size={14} className="text-cyan-400 shrink-0" />
                <span>Cari Tabel</span>
              </button>

              <button
                onClick={() => {
                  onOpenImportSql();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
              >
                <Upload size={14} className="text-violet-400 shrink-0" />
                <span>Import SQL</span>
              </button>

              <button
                onClick={() => {
                  onOpenExportSql();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
              >
                <FileCode size={14} className="text-pink-400 shrink-0" />
                <span>Export Schema</span>
              </button>

              <button
                onClick={() => {
                  applyAutoLayout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
              >
                <Workflow size={14} className="text-emerald-400 shrink-0" />
                <span>Auto Layout</span>
              </button>

              <button
                onClick={() => {
                  toggleSplitView();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
              >
                <PanelRight size={14} className="text-amber-400 shrink-0" />
                <span>SQL Panel</span>
              </button>

              <button
                onClick={() => {
                  handleExportPng();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
              >
                <Camera size={14} className="text-blue-400 shrink-0" />
                <span>Download PNG</span>
              </button>

              <button
                onClick={toggleEdgeAnimation}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
              >
                {animateEdges ? (
                  <Zap size={14} className="text-emerald-400 shrink-0" />
                ) : (
                  <ZapOff size={14} className="text-slate-500 shrink-0" />
                )}
                <span>Animasi Garis</span>
              </button>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenShortcuts();
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 col-span-2"
              >
                <Keyboard size={14} className="text-indigo-400 shrink-0" />
                <span>Pintasan Keyboard (Shortcuts)</span>
              </button>
            </div>

            {/* Reset & Account options */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  resetToSample();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1.5"
              >
                <RotateCcw size={13} />
                <span>Reset ke Contoh</span>
              </button>

              {user && (
                <button
                  onClick={() => {
                    signOut();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-300 px-2 py-1.5"
                >
                  <LogOut size={13} />
                  <span>Keluar ({user.email?.split('@')[0]})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Edit Project Name Modal */}
      <EditProjectNameModal
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        currentTitle={diagramTitle}
        onSave={handleSaveProjectName}
      />
    </>
  );
};
