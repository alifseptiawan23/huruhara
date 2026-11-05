import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import type { NodeTypes, EdgeTypes, Viewport } from '@xyflow/react';
import { useDiagramStore, selectActiveSheet, selectActiveEdges } from './store/useDiagramStore';
import { useAuthStore } from './store/useAuthStore';
import { TableNode } from './components/TableNode';
import { CrowsFootEdge } from './components/CrowsFootEdge';
import { Toolbar } from './components/Toolbar';
import { SheetBar } from './components/SheetBar';
import { SearchPalette } from './components/SearchPalette';
import { SplitViewPanel } from './components/SplitViewPanel';
import { ExportSqlModal } from './components/ExportSqlModal';
import { ImportSqlModal } from './components/ImportSqlModal';
import { AuthModal } from './components/AuthModal';
import { MyDiagramsModal } from './components/MyDiagramsModal';
import { MultiplayerCursors } from './components/MultiplayerCursors';
import { ShareModal } from './components/ShareModal';
import { useCollaborationStore } from './store/useCollaborationStore';

const nodeTypes: NodeTypes = { tableNode: TableNode };
const edgeTypes: EdgeTypes = { crowsFoot: CrowsFootEdge };

export const App: React.FC = () => {
  const rfInstance = useReactFlow();

  const {
    onNodesChange,
    onEdgesChange,
    onConnect,
    saveViewport,
    showSplitView,
    animateEdges,
    hoveredTableId,
    activeSheetId,
  } = useDiagramStore();

  const activeSheet = useDiagramStore(selectActiveSheet);
  const rawEdges = useDiagramStore(selectActiveEdges);
  const initializeAuth = useAuthStore((s) => s.initialize);
  const user = useAuthStore((s) => s.user);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isMyDiagramsOpen, setIsMyDiagramsOpen] = useState(false);

  // Initialize Supabase Auth session listener
  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

  // Initialize Real-time Collaboration (Canva/Figma style)
  useEffect(() => {
    useCollaborationStore.getState().initSession(undefined, user);
    return () => {
      useCollaborationStore.getState().cleanup();
    };
  }, [user]);

  // Live mouse cursor throttling (broadcast to peers)
  const lastCursorSentRef = React.useRef(0);
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const now = Date.now();
      if (now - lastCursorSentRef.current < 40) return;
      lastCursorSentRef.current = now;

      try {
        const pos = rfInstance.screenToFlowPosition({
          x: e.clientX,
          y: e.clientY,
        });
        useCollaborationStore.getState().broadcastCursor(Math.round(pos.x), Math.round(pos.y));
      } catch {
        // rfInstance may not be ready yet
      }
    },
    [rfInstance]
  );

  // Keyboard shortcuts (Ctrl+K / Ctrl+F for search)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Save viewport on sheet change
  useEffect(() => {
    const vp = activeSheet.viewport;
    if (vp) {
      rfInstance.setViewport(vp, { duration: 300 });
    } else {
      rfInstance.fitView({ padding: 0.25, duration: 400 });
    }
  }, [activeSheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMoveEnd = useCallback(
    (_: unknown, viewport: Viewport) => {
      saveViewport(activeSheetId, viewport);
    },
    [activeSheetId, saveViewport]
  );

  // Focus table from search
  const focusTable = useCallback(
    (tableId: string) => {
      const node = activeSheet.nodes.find((n) => n.id === tableId);
      if (!node) return;
      const height = 120 + node.data.columns.length * 34;
      rfInstance.setCenter(node.position.x + 160, node.position.y + height / 2, {
        zoom: 1.2,
        duration: 500,
      });
    },
    [activeSheet.nodes, rfInstance]
  );

  // Edge highlight/dim
  const displayEdges = useMemo(() => {
    const connectedIds = hoveredTableId
      ? new Set(
          rawEdges
            .filter((e) => e.source === hoveredTableId || e.target === hoveredTableId)
            .map((e) => e.id)
        )
      : null;

    return rawEdges.map((edge) => {
      const isHighlighted = !connectedIds || connectedIds.has(edge.id);
      const isSelected = edge.selected;
      return {
        ...edge,
        type: 'crowsFoot',
        animated: animateEdges && isHighlighted,
        style: {
          ...edge.style,
          stroke: isSelected ? '#38bdf8' : isHighlighted ? '#6366f1' : '#1e293b',
          strokeWidth: isSelected ? 3 : isHighlighted ? (connectedIds?.has(edge.id) ? 2.5 : 2) : 1,
          opacity: isHighlighted || isSelected ? 1 : 0.1,
          transition: 'opacity 0.2s, stroke 0.2s, stroke-width 0.2s',
        },
      };
    });
  }, [rawEdges, hoveredTableId, animateEdges]);

  return (
    <div className="w-screen h-screen flex flex-col bg-[#020617] overflow-hidden">
      <Toolbar
        onOpenExportSql={() => setIsExportOpen(true)}
        onOpenImportSql={() => setIsImportOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenMyDiagrams={() => setIsMyDiagramsOpen(true)}
      />

      {/* Canvas + Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* ReactFlow Canvas */}
        <div className="flex-1 relative" onPointerMove={handlePointerMove}>
          <ReactFlow
            nodes={activeSheet.nodes}
            edges={displayEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onMoveEnd={handleMoveEnd}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.08}
            maxZoom={2.5}
            onlyRenderVisibleElements
            elevateNodesOnSelect
            deleteKeyCode={['Backspace', 'Delete']}
            className="bg-[#020617]"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="#1e293b" />
            <Controls className="!bg-[#0d1117] !border-slate-800 !rounded-xl !shadow-2xl [&>button]:!bg-[#0d1117] [&>button]:!border-slate-800 [&>button]:!text-slate-400 hover:[&>button]:!bg-slate-800 hover:[&>button]:!text-white !bottom-12 md:!bottom-4 !left-3" />
            <MiniMap
              zoomable
              pannable
              nodeColor={(n) => ((n.data as Record<string, unknown>)?.color as string) || '#6366f1'}
              maskColor="rgba(2,6,23,0.75)"
              className="hidden md:block !bg-[#0d1117] !border !border-slate-800 !rounded-xl !shadow-2xl overflow-hidden"
            />
            {/* Live Multiplayer Cursors (Canva / Figma style) */}
            <MultiplayerCursors />
          </ReactFlow>

          {/* Empty state */}
          {activeSheet.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-2">
                <div className="text-5xl">🗄️</div>
                <p className="text-slate-400 text-sm font-medium">Canvas kosong</p>
                <p className="text-slate-600 text-xs">
                  Klik <span className="text-indigo-400 font-semibold">New Table</span> atau{' '}
                  <span className="text-indigo-400 font-semibold">Import SQL</span> untuk memulai
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Split View Panel */}
        {showSplitView && <SplitViewPanel onClose={() => useDiagramStore.getState().toggleSplitView()} />}
      </div>

      {/* Sheet Bar at bottom */}
      <SheetBar />

      {/* Modals & Overlays */}
      <ExportSqlModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <ImportSqlModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <SearchPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} onFocusTable={focusTable} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <MyDiagramsModal
        isOpen={isMyDiagramsOpen}
        onClose={() => setIsMyDiagramsOpen(false)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />
      <ShareModal />
    </div>
  );
};

export default App;
