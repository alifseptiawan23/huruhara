import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { useDiagramStore } from '../store/useDiagramStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCollaborationStore, selectIsReadOnly } from '../store/useCollaborationStore';
import { supabase } from '../lib/supabase';
import { EditProjectNameModal } from './EditProjectNameModal';
import { SheetManagerModal } from './SheetManagerModal';
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
  Eye,
  Crown,
  Layers,
  ChevronDown,
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
    clipboard,
    copySelectedTables,
    pasteTables,
    isSelectMode,
    toggleSelectMode,
    saveStatus,
    lastSavedAt,
    saveToCloud,
    duplicateProjectAsNew,
    sheets,
    activeSheetId,
    addSheet,
    setActiveSheet,
  } = useDiagramStore();

  const isReadOnly = useCollaborationStore(selectIsReadOnly);
  const currentUserRole = useCollaborationStore((s) => s.currentUserRole);
  const projectOwnerInfo = useCollaborationStore((s) => s.projectOwnerInfo);
  const isOwner = currentUserRole === 'owner';
  const { user, signOut } = useAuthStore();
  const { collaborators, startSharing } = useCollaborationStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isSheetManagerOpen, setIsSheetManagerOpen] = useState(false);

  const handleSaveProjectName = async (newTitle: string) => {
    if (!isOwner) {
      onShowToast?.('🔒 Hanya pemilik yang dapat mengubah nama proyek');
      return;
    }
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

  const currentSheet = sheets.find((sh) => sh.id === activeSheetId);
  const nodes = currentSheet?.nodes || [];
  const edges = currentSheet?.edges || [];

  const handleShareClick = async () => {
    if (!isOwner) {
      onShowToast?.('🔒 Hanya pemilik proyek yang dapat membagikan file proyek.');
      return;
    }
    if (!user) {
      onOpenAuth();
      return;
    }

    let currentDiagramId = diagramId;
    // If project is not yet saved to cloud, auto-save as a permanent cloud project file first!
    if (!currentDiagramId) {
      const ok = await saveToCloud(user);
      if (!ok) {
        alert('Gagal menyiapkan link file proyek. Coba periksa koneksi.');
        return;
      }
      currentDiagramId = useDiagramStore.getState().diagramId;
    }

    startSharing(currentDiagramId || undefined, user);
  };

  const handleDuplicate = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    const newId = await duplicateProjectAsNew(user);
    if (newId) {
      window.history.replaceState({}, '', `?project=${newId}`);
      useCollaborationStore.getState().initSession(newId, user);
      onShowToast?.('🎉 Proyek berhasil diduplikasi ke akun Anda! Sekarang Anda dapat mengedit.');
    } else {
      onShowToast?.('⚠️ Gagal menduplikasi proyek.');
    }
  };

  const handleSaveToCloud = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    const success = await saveToCloud(user);
    if (success) {
      onShowToast?.('☁️ Semua sheet & tabel berhasil disimpan ke Cloud!');
    } else {
      onShowToast?.('⚠️ Gagal menyimpan ke Cloud. Coba periksa koneksi.');
    }
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

  return (
    <>
      <header className="h-14 bg-[#0d1117]/95 backdrop-blur-md border-b border-slate-800/80 px-2 sm:px-4 flex items-center justify-between z-30 relative select-none gap-2">
        {/* Left Section: Brand, Project Title & Cloud Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div className="relative w-7 h-7 sm:w-8 sm:h-8 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Database size={15} className="text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0d1117]" />
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Project Title Button with Pencil Icon */}
            <button
              onClick={() => isOwner && setIsRenameOpen(true)}
              className={`group flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-lg bg-slate-900/80 border text-xs font-bold text-white transition-all max-w-[80px] xs:max-w-[110px] sm:max-w-[150px] md:max-w-[180px] shrink-0 ${
                isOwner ? 'hover:bg-slate-800 border-slate-800 hover:border-indigo-500/50 cursor-pointer' : 'border-slate-800/80 cursor-default'
              }`}
              title={isOwner ? "Klik untuk ubah nama proyek" : `Nama proyek: ${diagramTitle}`}
            >
              <span className="truncate">{diagramTitle}</span>
              {isOwner && <Pencil size={11} className="text-slate-400 group-hover:text-indigo-400 shrink-0 transition-colors" />}
            </button>

            {/* Sheet Viewer / Navigator Button (Prominent at TOP for mobile & desktop) */}
            <button
              onClick={() => setIsSheetManagerOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/90 border border-indigo-500/50 hover:border-indigo-400 text-indigo-200 hover:text-white text-xs font-semibold shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
              title="Lihat & Kelola Seluruh Sheet di Proyek Ini (Sheet Viewer)"
            >
              <Layers size={13} className="text-indigo-400 shrink-0" />
              <span className="truncate max-w-[50px] xs:max-w-[80px] sm:max-w-[120px] text-white">
                {currentSheet?.name || 'Sheet'}
              </span>
              <span className="text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-200 px-1.5 py-0.2 rounded border border-indigo-500/40 shrink-0">
                {sheets.length}
              </span>
              <ChevronDown size={11} className="text-indigo-400 shrink-0" />
            </button>

            {/* Creator / Owner Tag */}
            {projectOwnerInfo && (
              <div
                className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                  isOwner
                    ? 'bg-amber-950/50 border-amber-500/30 text-amber-300'
                    : 'bg-indigo-950/50 border-indigo-500/30 text-indigo-300'
                }`}
                title={
                  isOwner
                    ? `Proyek ini dibuat oleh Anda (${user?.email})`
                    : `Proyek dibuat oleh: ${projectOwnerInfo.name} (${projectOwnerInfo.email || ''})`
                }
              >
                <Crown size={10} className={isOwner ? 'text-amber-400' : 'text-indigo-400'} />
                <span className="truncate max-w-[95px]">
                  {isOwner ? 'Milik Anda' : `Oleh: ${projectOwnerInfo.name}`}
                </span>
              </div>
            )}

            {/* Cloud Save Status Pill (Only for editable mode) */}
            {!isReadOnly && (
              <button
                onClick={handleSaveToCloud}
                disabled={saveStatus === 'saving'}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border transition-all ${
                  saveStatus === 'saved'
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
                    : saveStatus === 'saving'
                    ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
                    : saveStatus === 'unsaved'
                    ? 'bg-amber-950/60 border-amber-500/60 text-amber-300 hover:bg-amber-900/60'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                }`}
                title={
                  !user
                    ? 'Draft tersimpan di browser. Login Google untuk simpan ke cloud'
                    : saveStatus === 'saved'
                    ? `Tersimpan di Cloud ${lastSavedAt ? `(${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}`
                    : saveStatus === 'saving'
                    ? 'Sedang menyimpan ke cloud...'
                    : 'Ada perubahan belum disimpan ke Cloud. Klik untuk simpan'
                }
              >
                {saveStatus === 'saving' ? (
                  <Loader2 size={13} className="animate-spin text-indigo-400" />
                ) : saveStatus === 'saved' ? (
                  <Check size={13} className="text-emerald-400" />
                ) : saveStatus === 'unsaved' ? (
                  <Cloud size={13} className="text-amber-400" />
                ) : (
                  <Cloud size={13} className={user ? 'text-indigo-400' : 'text-slate-400'} />
                )}
                <span className="hidden sm:inline">
                  {saveStatus === 'saving'
                    ? 'Menyimpan...'
                    : saveStatus === 'saved'
                    ? 'Tersimpan'
                    : saveStatus === 'unsaved'
                    ? 'Simpan Cloud'
                    : user
                    ? 'Simpan'
                    : 'Draft Lokal'}
                </span>
              </button>
            )}

            {/* My Diagrams Button */}
            <button
              onClick={onOpenMyDiagrams}
              className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 hover:border-slate-700 transition-all"
              title="Buka daftar diagram saya"
            >
              <Folder size={13} className="text-slate-400" />
              <span>Proyek</span>
            </button>
          </div>
        </div>

        {/* Center Section: Compact Tool Clusters (Fits cleanly on 100% zoom & laptops) */}
        <div className="hidden lg:flex items-center gap-1.5 shrink-0">
          {isReadOnly ? (
            /* Mode Pelihat center badge with Duplicate button */
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/80 border border-amber-500/30 text-xs">
              <span className="flex items-center gap-1 text-amber-300 font-medium">
                <Eye size={13} className="text-amber-400" />
                <span>Mode Pelihat (Hanya Baca)</span>
              </span>
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm transition-all"
                title="Buat salinan proyek ini ke akun Anda agar bisa mengedit"
              >
                <Copy size={12} />
                <span>Duplikasi untuk Edit</span>
              </button>
            </div>
          ) : (
            <>
              {/* Primary: New Table Button */}
              <button
                onClick={addTable}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all hover:scale-[1.02] shadow-md shadow-indigo-600/20 shrink-0"
                title="Tambah Tabel Baru"
              >
                <Plus size={14} />
                <span>New Table</span>
              </button>

              {/* Cluster 1: Selection & Clipboard */}
              <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={toggleSelectMode}
                  title={
                    isSelectMode
                      ? 'Mode Kotak Seleksi AKTIF (Klik untuk kembali ke geser canvas)'
                      : 'Mode Kotak Seleksi (Rectangle Select). Anda juga bisa Shift+Tarik mouse.'
                  }
                  className={`p-1.5 rounded-md transition-all ${
                    isSelectMode
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <BoxSelect size={14} />
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
                  className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                  title="Salin tabel terpilih (Ctrl+C)"
                >
                  <Copy size={14} />
                </button>

                <button
                  onClick={() => {
                    const count = pasteTables();
                    if (count > 0) {
                      onShowToast?.(`✨ ${count} tabel berhasil ditempel!`);
                    } else {
                      onShowToast?.('Belum ada tabel yang disalin. Salin tabel terlebih dahulu dengan Ctrl+C');
                    }
                  }}
                  disabled={!clipboard}
                  className={`p-1.5 rounded-md transition-all ${
                    clipboard
                      ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'text-slate-600 opacity-40 cursor-not-allowed'
                  }`}
                  title={clipboard ? `Tempel ${clipboard.nodes.length} tabel (Ctrl+V)` : 'Tempel tabel (Ctrl+V)'}
                >
                  <ClipboardPaste size={14} />
                </button>
              </div>

              {/* Layout: Auto Layout Dagre */}
              <button
                onClick={applyAutoLayout}
                title="Rapikan Tata Letak Otomatis (Auto Layout Dagre)"
                className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <Workflow size={14} />
              </button>
            </>
          )}

          {/* Cluster 2: Layout & View Controls */}
          <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={toggleSplitView}
              title="Toggle Panel SQL Preview"
              className={`p-1.5 rounded-md transition-all ${
                showSplitView
                  ? 'bg-indigo-600/30 text-indigo-300'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PanelRight size={14} />
            </button>

            <button
              onClick={toggleEdgeAnimation}
              title="Toggle animasi garis relasi"
              className={`p-1.5 rounded-md transition-all ${
                animateEdges
                  ? 'text-emerald-400 hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              {animateEdges ? <Zap size={14} /> : <ZapOff size={14} />}
            </button>
          </div>

          {/* Cluster 3: Import & Export Group */}
          <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5 text-xs">
            {!isReadOnly && (
              <button
                onClick={onOpenImportSql}
                title="Import Skema dari SQL DDL"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
              >
                <Upload size={13} className="text-slate-400" />
                <span className="hidden xl:inline">Import</span>
              </button>
            )}

            <button
              onClick={onOpenExportSql}
              title="Export Skema ke SQL (PostgreSQL, MySQL, SQLite)"
              className="flex items-center gap-1 px-2 py-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            >
              <FileCode size={13} className="text-slate-400" />
              <span className="hidden xl:inline">Export</span>
            </button>

            <button
              onClick={handleExportPng}
              title="Download Diagram sebagai Gambar PNG"
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              <Camera size={14} />
            </button>
          </div>

          {/* Cluster 4: Search & Shortcuts */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSearch}
              title="Cari Tabel & Kolom (Ctrl+K)"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs transition-all"
            >
              <Search size={13} className="text-slate-400" />
              <kbd className="text-[9px] px-1 py-0.2 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">⌘K</kbd>
            </button>

            <button
              onClick={onOpenShortcuts}
              title="Panduan Pintasan Keyboard (?)"
              className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <Keyboard size={14} className="text-indigo-400" />
            </button>
          </div>
        </div>

        {/* Right Section: Collaborators, Share, Auth, Mobile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Add Table / Duplikasi on Mobile (< lg) */}
          {!isReadOnly ? (
            <button
              onClick={addTable}
              className="flex lg:hidden items-center gap-1 px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
              title="Tambah Tabel Baru"
            >
              <Plus size={14} />
              <span className="hidden xs:inline">Tabel</span>
            </button>
          ) : (
            <div className="flex lg:hidden items-center rounded-lg bg-amber-950/60 border border-amber-500/40 p-0.5 shrink-0">
              <span
                className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300"
                title="Mode Pelihat: Hanya baca skema"
              >
                <Eye size={11} className="text-amber-400" />
                <span className="hidden xs:inline">Pelihat</span>
              </span>
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                title="Duplikasi proyek ini ke akun Anda untuk mulai mengedit"
              >
                <Copy size={10} />
                <span>Duplikasi</span>
              </button>
            </div>
          )}

          {/* Live Multiplayer Collaborators Stack */}
          {collaborators.length > 0 && (
            <div
              className="flex items-center -space-x-1.5 sm:-space-x-2 cursor-pointer"
              title="Pengguna yang sedang membuka file proyek ini"
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

          {/* Share / Role Indicator */}
          {isOwner ? (
            <button
              onClick={handleShareClick}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
              title="Bagikan file proyek ke rekan tim"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">Bagikan</span>
              {collaborators.length > 1 && (
                <span className="px-1 py-0.2 rounded-full bg-black/40 text-[9px] font-bold">
                  {collaborators.length}
                </span>
              )}
            </button>
          ) : currentUserRole === 'editor' ? (
            <div
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border shrink-0 bg-indigo-950/60 border-indigo-500/40 text-indigo-300"
              title="Anda memiliki hak akses Editor"
            >
              <Pencil size={12} />
              <span className="hidden xs:inline">Editor</span>
            </div>
          ) : null}

          {/* Reset button (Desktop only) */}
          <button
            onClick={resetToSample}
            className="hidden 2xl:flex items-center gap-1 text-slate-500 hover:text-slate-200 text-xs px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Reset ke skema contoh"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          {/* User Auth Section */}
          {user ? (
            <div className="flex items-center gap-1.5">
              <div
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/40 text-xs text-indigo-300 font-medium max-w-[120px] truncate"
                title={user.email}
              >
                <User size={12} className="shrink-0" />
                <span className="truncate">{user.email?.split('@')[0]}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-slate-800 hover:border-slate-700 transition-colors"
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
              {isOwner ? (
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
              ) : (
                <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                  currentUserRole === 'editor'
                    ? 'bg-indigo-950/80 border-indigo-500/40 text-indigo-300'
                    : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                }`}>
                  {currentUserRole === 'editor' ? 'Editor' : 'Pelihat'}
                </span>
              )}
            </div>

            {/* Share Project Button for Owner in Mobile Drawer */}
            {isOwner && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleShareClick();
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
              >
                <Share2 size={14} />
                <span>Bagikan File Proyek (Atur Izin)</span>
              </button>
            )}

            {/* Sheet Switcher in Mobile Drawer */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Layers size={14} className="text-indigo-400" />
                  <span>Sheet Skema ({sheets.length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setIsSheetManagerOpen(true);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 transition-colors"
                    title="Lihat & kelola semua sheet"
                  >
                    <span>Lihat Semua</span>
                  </button>
                  <button
                    onClick={() => {
                      addSheet();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-[11px] font-semibold text-indigo-200 hover:text-white transition-colors"
                  >
                    <Plus size={12} />
                    <span>Sheet Baru</span>
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {sheets.map((sh) => {
                  const isActive = sh.id === activeSheetId;
                  return (
                    <div
                      key={sh.id}
                      onClick={() => {
                        setActiveSheet(sh.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        isActive
                          ? 'bg-indigo-950/60 border-indigo-500 text-white font-semibold'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                        <span className="truncate">{sh.name}</span>
                        {isActive && (
                          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/20 px-1 py-0.2 rounded border border-indigo-500/30">
                            Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {sh.nodes?.length || 0} tabel
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ReadOnly Callout in Mobile Drawer */}
            {isReadOnly && (
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Eye size={16} className="text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-amber-300">Mode Pelihat</div>
                    <div className="text-[10px] text-slate-400 truncate">Hanya pemilik & editor yang dapat mengedit</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleDuplicate();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-1 shrink-0"
                >
                  <Copy size={12} />
                  <span>Duplikasi</span>
                </button>
              </div>
            )}

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
              {!isReadOnly && (
                <>
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
                      onOpenImportSql();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200"
                  >
                    <Upload size={14} className="text-violet-400 shrink-0" />
                    <span>Import SQL</span>
                  </button>
                </>
              )}

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
              {!isReadOnly && (
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
              )}

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
      {/* Sheet Manager Modal (Available on mobile & desktop from top header) */}
      <SheetManagerModal
        isOpen={isSheetManagerOpen}
        onClose={() => setIsSheetManagerOpen(false)}
      />
    </>
  );
};
