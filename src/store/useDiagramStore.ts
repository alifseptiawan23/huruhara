import { create } from 'zustand';
import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import type { Connection, Edge, EdgeChange, Node, NodeChange, Viewport } from '@xyflow/react';
import type { Column, Sheet, TableData } from '../types/schema';
import { initialTables, initialEdges } from '../utils/sampleData';
import { computeDagreLayout } from '../utils/autoLayout';
import { supabase } from '../lib/supabase';

export interface CollabDelegate {
  getRole: () => string;
  getShareRole: () => 'editor' | 'viewer';
  getAllowedEditors: () => string[];
  initSession: (diagramId: string, user: any) => void;
  leaveRoom: () => void;
}

let collabDelegate: CollabDelegate | null = null;
export const setCollabDelegate = (delegate: CollabDelegate) => {
  collabDelegate = delegate;
};

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'local';

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectActiveSheet = (s: DiagramState): Sheet =>
  s.sheets.find((sh) => sh.id === s.activeSheetId) ?? s.sheets[0] ?? { id: 'sheet-1', name: 'Main Schema', nodes: [], edges: [] };

export const selectActiveNodes = (s: DiagramState): Node<TableData>[] =>
  selectActiveSheet(s)?.nodes ?? [];

export const selectActiveEdges = (s: DiagramState): Edge[] =>
  selectActiveSheet(s)?.edges ?? [];

// ─── State Shape ──────────────────────────────────────────────────────────────
interface DiagramState {
  sheets: Sheet[];
  activeSheetId: string;
  hoveredTableId: string | null;
  showSplitView: boolean;
  animateEdges: boolean;
  diagramId: string | null;
  diagramTitle: string;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  setDiagramTitle: (title: string) => void;
  setSaveStatus: (status: SaveStatus) => void;
  setLastSavedAt: (date: Date | null) => void;
  loadCloudDiagram: (id: string, title: string, sheets: Sheet[], activeSheetId: string) => void;
  newDiagram: () => void;
  saveToCloud: (user: any) => Promise<boolean>;
  duplicateProjectAsNew: (user: any) => Promise<string | null>;

  // ReactFlow handlers (operate on active sheet)
  onNodesChange: (changes: NodeChange<Node<TableData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (conn: Connection) => void;

  // Sheet management
  addSheet: () => void;
  deleteSheet: (id: string) => void;
  renameSheet: (id: string, name: string) => void;
  setActiveSheet: (id: string) => void;
  saveViewport: (id: string, viewport: Viewport) => void;

  // Table management
  addTable: () => void;
  deleteTable: (id: string) => void;
  updateTableName: (id: string, name: string) => void;
  updateTableColor: (id: string, color: string) => void;
  addColumn: (tableId: string) => void;
  updateColumn: (tableId: string, colId: string, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, colId: string) => void;

  // Edge management
  updateEdgeCardinality: (edgeId: string, cardinality: '1:n' | 'n:1' | '1:1' | 'n:m') => void;
  reverseEdge: (edgeId: string) => void;
  deleteEdge: (edgeId: string) => void;

  // Diagram import
  setDiagram: (nodes: Node<TableData>[], edges: Edge[]) => void;

  // Real-time remote sync
  isRemoteUpdate: boolean;
  applyRemoteUpdate: (sheets: Sheet[], activeSheetId: string) => void;

  // Auto-layout
  applyAutoLayout: () => void;

  // Hover highlight
  setHoveredTable: (id: string | null) => void;

  // UI toggles
  toggleSplitView: () => void;
  toggleEdgeAnimation: () => void;

  // Reset
  resetToSample: () => void;

  // Clipboard & Selection (Copy / Paste across sheets & Rectangle selection)
  clipboard: { nodes: Node<TableData>[]; edges: Edge[] } | null;
  copySelectedTables: () => number;
  pasteTables: () => number;
  duplicateTable: (tableId: string) => void;
  duplicateSelectedTables: () => number;
  isSelectMode: boolean;
  toggleSelectMode: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6'];

export const LOCAL_STORAGE_KEY = 'drawsql_local_draft_v1';

const initialSheet: Sheet = {
  id: 'sheet-1',
  name: 'Main Schema',
  nodes: initialTables,
  edges: initialEdges,
};

// ─── Helper: Load initial draft from localStorage (if not opening shared project) ───
const getInitialDraft = () => {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const hasProjectParam = params.get('project') || params.get('diagram') || params.get('room');
    if (!hasProjectParam) {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.sheets) && parsed.sheets.length > 0) {
            return {
              sheets: parsed.sheets,
              activeSheetId: parsed.activeSheetId || parsed.sheets[0].id,
              diagramTitle: parsed.diagramTitle || 'Untitled Schema',
              diagramId: parsed.diagramId || null,
            };
          }
        }
      } catch (err) {
        console.warn('Failed to parse local draft:', err);
      }
    } else {
      // Opening a shared project: start with empty canvas to avoid flashing or broadcasting sample tables
      return {
        sheets: [],
        activeSheetId: '',
        diagramTitle: 'Memuat proyek...',
        diagramId: params.get('project') || params.get('diagram') || null,
      };
    }
  }

  return {
    sheets: [initialSheet],
    activeSheetId: 'sheet-1',
    diagramTitle: 'Untitled Schema',
    diagramId: null,
  };
};

const initialData = getInitialDraft();

// ─── Helper: mutate active sheet ─────────────────────────────────────────────
function updateActive(
  sheets: Sheet[],
  activeId: string,
  updater: (sheet: Sheet) => Sheet
): Sheet[] {
  return sheets.map((sh) => (sh.id === activeId ? updater(sh) : sh));
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useDiagramStore = create<DiagramState>((set, get) => ({
  sheets: initialData.sheets,
  activeSheetId: initialData.activeSheetId,
  hoveredTableId: null,
  showSplitView: false,
  animateEdges: true,
  diagramId: initialData.diagramId,
  diagramTitle: initialData.diagramTitle,
  saveStatus: initialData.diagramId ? 'saved' : 'local',
  lastSavedAt: null,

  setDiagramTitle: (title) => set({ diagramTitle: title, saveStatus: get().diagramId ? 'unsaved' : 'local' }),
  setSaveStatus: (status) => set({ saveStatus: status }),
  setLastSavedAt: (date) => set({ lastSavedAt: date }),

  loadCloudDiagram: (id, title, sheets, activeSheetId) => {
    const validSheets = Array.isArray(sheets) && sheets.length > 0 ? sheets : [initialSheet];
    set({
      diagramId: id,
      diagramTitle: title || 'Untitled Schema',
      sheets: validSheets,
      activeSheetId: activeSheetId || validSheets[0]?.id || 'sheet-1',
      saveStatus: 'saved',
      lastSavedAt: new Date(),
    });
    saveDraftImmediately();
  },

  saveToCloud: async (user: any) => {
    if (!user) return false;
    const { diagramId, diagramTitle, sheets, activeSheetId } = get();
    // Safety: never overwrite cloud record with empty sheets!
    if (!sheets || sheets.length === 0) return false;

    // Viewers cannot save to cloud
    if (collabDelegate && collabDelegate.getRole() === 'viewer') return false;

    // Enrich sheets[0] with creator & permission metadata
    const enrichedSheets = [...sheets];
    const existingSettings = enrichedSheets[0]?.projectSettings || {};
    const ownerName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Pengguna';

    enrichedSheets[0] = {
      ...enrichedSheets[0],
      projectSettings: {
        ...existingSettings,
        defaultRole: collabDelegate?.getShareRole() || existingSettings.defaultRole || 'editor',
        allowedEditors: collabDelegate?.getAllowedEditors() || existingSettings.allowedEditors || [],
        ownerId: existingSettings.ownerId || user.id,
        ownerName: existingSettings.ownerName || ownerName,
        ownerEmail: existingSettings.ownerEmail || user.email,
        updatedAt: new Date().toISOString(),
      },
    };

    set({ saveStatus: 'saving' });

    try {
      if (diagramId) {
        const { error } = await supabase
          .from('diagrams')
          .update({
            title: diagramTitle,
            sheets: enrichedSheets,
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
            sheets: enrichedSheets,
            active_sheet_id: activeSheetId,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          set({ diagramId: data.id });
          // Update URL without full reload to reflect permanent project ID
          if (typeof window !== 'undefined') {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('project', data.id);
            window.history.replaceState({}, '', currentUrl.toString());
          }
          collabDelegate?.initSession(data.id, user);
        }
      }
      set({ saveStatus: 'saved', lastSavedAt: new Date() });
      saveDraftImmediately();
      return true;
    } catch (err) {
      console.error('Failed to save to cloud:', err);
      set({ saveStatus: 'unsaved' });
      return false;
    }
  },

  duplicateProjectAsNew: async (user: any) => {
    if (!user) return null;
    const { diagramTitle, sheets, activeSheetId } = get();
    const newTitle = `${diagramTitle} (Salinan)`;
    set({ saveStatus: 'saving' });

    const ownerName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Pengguna';

    const enrichedSheets = [...sheets];
    if (enrichedSheets[0]) {
      enrichedSheets[0] = {
        ...enrichedSheets[0],
        projectSettings: {
          defaultRole: 'editor',
          allowedEditors: [],
          ownerId: user.id,
          ownerName: ownerName,
          ownerEmail: user.email,
          updatedAt: new Date().toISOString(),
        },
      };
    }

    try {
      const { data, error } = await supabase
        .from('diagrams')
        .insert({
          user_id: user.id,
          title: newTitle,
          sheets: enrichedSheets,
          active_sheet_id: activeSheetId,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        set({
          diagramId: data.id,
          diagramTitle: newTitle,
          sheets: enrichedSheets,
          saveStatus: 'saved',
          lastSavedAt: new Date(),
        });
        saveDraftImmediately();

        if (typeof window !== 'undefined') {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.set('project', data.id);
          currentUrl.searchParams.delete('role');
          window.history.replaceState({}, '', currentUrl.toString());
        }
        collabDelegate?.initSession(data.id, user);
        return data.id;
      }
      return null;
    } catch (err) {
      console.error('Failed to duplicate project:', err);
      set({ saveStatus: 'unsaved' });
      return null;
    }
  },

  resetToSample: () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
    collabDelegate?.leaveRoom();
    set({
      diagramId: null,
      diagramTitle: 'Untitled Schema',
      sheets: [initialSheet],
      activeSheetId: 'sheet-1',
      saveStatus: 'local',
      lastSavedAt: null,
    });
  },
  newDiagram: () => {
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
    collabDelegate?.leaveRoom();
    set({
      diagramId: null,
      diagramTitle: 'Untitled Schema',
      sheets: [{ id: 'sheet-1', name: 'Main Schema', nodes: [], edges: [] }],
      activeSheetId: 'sheet-1',
      saveStatus: 'local',
      lastSavedAt: null,
    });
  },

  // ── ReactFlow handlers ──────────────────────────────────────────────────────
  onNodesChange: (changes) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: applyNodeChanges(changes, sh.nodes),
      })),
    });
  },

  onEdgesChange: (changes) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        edges: applyEdgeChanges(changes, sh.edges),
      })),
    });
  },

  onConnect: (conn) => {
    const { sheets, activeSheetId, animateEdges } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        edges: addEdge(
          {
            ...conn,
            type: 'crowsFoot',
            data: { cardinality: '1:n' },
            animated: animateEdges,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          },
          sh.edges
        ),
      })),
    });
  },

  // ── Sheet management ────────────────────────────────────────────────────────
  addSheet: () => {
    const id = `sheet-${Date.now()}`;
    const newSheet: Sheet = {
      id,
      name: `Schema ${get().sheets.length + 1}`,
      nodes: [],
      edges: [],
    };
    set({ sheets: [...get().sheets, newSheet], activeSheetId: id });
  },

  deleteSheet: (id) => {
    const { sheets, activeSheetId } = get();
    if (sheets.length === 1) return; // Don't delete last sheet
    const remaining = sheets.filter((sh) => sh.id !== id);
    const newActive = activeSheetId === id ? remaining[0].id : activeSheetId;
    set({ sheets: remaining, activeSheetId: newActive });
  },

  renameSheet: (id, name) => {
    set({
      sheets: get().sheets.map((sh) => (sh.id === id ? { ...sh, name } : sh)),
    });
  },

  setActiveSheet: (id) => {
    set({ activeSheetId: id });
  },

  saveViewport: (id, viewport) => {
    set({
      sheets: get().sheets.map((sh) => (sh.id === id ? { ...sh, viewport } : sh)),
    });
  },

  // ── Table management ────────────────────────────────────────────────────────
  addTable: () => {
    const { sheets, activeSheetId } = get();
    const activeSheet = selectActiveSheet(get());
    const id = `table_${Date.now()}`;
    const color = COLORS[activeSheet.nodes.length % COLORS.length];
    const newNode: Node<TableData> = {
      id,
      type: 'tableNode',
      position: { x: 150 + Math.random() * 200, y: 100 + Math.random() * 150 },
      data: {
        id,
        name: `new_table_${activeSheet.nodes.length + 1}`,
        color,
        columns: [{ id: `col_${Date.now()}`, name: 'id', type: 'uuid', isPrimaryKey: true, isNullable: false }],
      },
    };
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: [...sh.nodes, newNode],
      })),
    });
  },

  deleteTable: (id) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: sh.nodes.filter((n) => n.id !== id),
        edges: sh.edges.filter((e) => e.source !== id && e.target !== id),
      })),
    });
  },

  updateTableName: (id, name) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: sh.nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, name } } : n),
      })),
    });
  },

  updateTableColor: (id, color) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: sh.nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, color } } : n),
      })),
    });
  },

  addColumn: (tableId) => {
    const { sheets, activeSheetId } = get();
    const newColId = `col_${Date.now()}`;
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: sh.nodes.map((n) => {
          if (n.id !== tableId) return n;
          const newCol: Column = {
            id: newColId,
            name: `column_${n.data.columns.length + 1}`,
            type: 'varchar(255)',
            isPrimaryKey: false,
            isNullable: true,
          };
          return { ...n, data: { ...n.data, columns: [...n.data.columns, newCol] } };
        }),
      })),
    });
  },

  updateColumn: (tableId, colId, updates) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: sh.nodes.map((n) => {
          if (n.id !== tableId) return n;
          return {
            ...n,
            data: {
              ...n.data,
              columns: n.data.columns.map((c) => c.id === colId ? { ...c, ...updates } : c),
            },
          };
        }),
      })),
    });
  },

  deleteColumn: (tableId, colId) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: sh.nodes.map((n) => {
          if (n.id !== tableId) return n;
          return { ...n, data: { ...n.data, columns: n.data.columns.filter((c) => c.id !== colId) } };
        }),
        edges: sh.edges.filter(
          (e) => !e.sourceHandle?.startsWith(colId) && !e.targetHandle?.startsWith(colId)
        ),
      })),
    });
  },

  updateEdgeCardinality: (edgeId, cardinality) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        edges: sh.edges.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, cardinality } } : e
        ),
      })),
    });
  },

  reverseEdge: (edgeId) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        edges: sh.edges.map((e) => {
          if (e.id !== edgeId) return e;
          // Tukar arah source <-> target
          const currentCard = (e.data?.cardinality as string) || '1:n';
          const newCard =
            currentCard === '1:n' ? 'n:1' : currentCard === 'n:1' ? '1:n' : currentCard;
          return {
            ...e,
            source: e.target,
            target: e.source,
            sourceHandle: e.targetHandle,
            targetHandle: e.sourceHandle,
            data: { ...e.data, cardinality: newCard },
          };
        }),
      })),
    });
  },

  deleteEdge: (edgeId) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        edges: sh.edges.filter((e) => e.id !== edgeId),
      })),
    });
  },

  // ── Diagram import ──────────────────────────────────────────────────────────
  setDiagram: (nodes, edges) => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({ ...sh, nodes, edges })),
    });
  },

  // ── Real-time remote sync ───────────────────────────────────────────────────
  isRemoteUpdate: false,
  applyRemoteUpdate: (sheets, activeSheetId) => {
    if (!Array.isArray(sheets) || sheets.length === 0) return;
    set({
      sheets,
      activeSheetId: activeSheetId || sheets[0]?.id || 'sheet-1',
      isRemoteUpdate: true,
      saveStatus: 'saved',
    });
    // Reset flag after 100ms so subsequent local edits broadcast normally
    setTimeout(() => {
      useDiagramStore.setState({ isRemoteUpdate: false });
    }, 100);
  },

  // ── Auto-layout ─────────────────────────────────────────────────────────────
  applyAutoLayout: () => {
    const { sheets, activeSheetId } = get();
    const activeSheet = selectActiveSheet(get());
    const laid = computeDagreLayout(activeSheet.nodes, activeSheet.edges);
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({ ...sh, nodes: laid })),
    });
  },

  // ── Hover highlight ─────────────────────────────────────────────────────────
  setHoveredTable: (id) => set({ hoveredTableId: id }),

  // ── UI toggles ──────────────────────────────────────────────────────────────
  toggleSplitView: () => set((s) => ({ showSplitView: !s.showSplitView })),
  toggleEdgeAnimation: () => set((s) => ({ animateEdges: !s.animateEdges })),

  // ── Clipboard & Selection ───────────────────────────────────────────────────
  clipboard: null,
  isSelectMode: false,
  toggleSelectMode: () => set((s) => ({ isSelectMode: !s.isSelectMode })),

  copySelectedTables: () => {
    const { sheets, activeSheetId } = get();
    const activeSheet = sheets.find((sh) => sh.id === activeSheetId) ?? sheets[0];
    const selectedNodes = activeSheet.nodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return 0;

    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    // Clone internal edges connecting the selected nodes
    const internalEdges = activeSheet.edges.filter(
      (e) => selectedIds.has(e.source) && selectedIds.has(e.target)
    );

    const clonedNodes = JSON.parse(JSON.stringify(selectedNodes));
    const clonedEdges = JSON.parse(JSON.stringify(internalEdges));

    set({ clipboard: { nodes: clonedNodes, edges: clonedEdges } });
    return selectedNodes.length;
  },

  pasteTables: () => {
    const { clipboard, sheets, activeSheetId } = get();
    if (!clipboard || clipboard.nodes.length === 0) return 0;

    const idMap: Record<string, string> = {};
    const timestamp = Date.now();

    // Generate new unique IDs & offset position for pasted nodes
    const newNodes: Node<TableData>[] = clipboard.nodes.map((node, idx) => {
      const newId = `table-${timestamp}-${idx}`;
      idMap[node.id] = newId;

      return {
        ...node,
        id: newId,
        selected: true,
        position: {
          x: node.position.x + 35,
          y: node.position.y + 35,
        },
        data: {
          ...node.data,
          id: newId,
          name: `${node.data.name}_copy`,
          columns: (node.data.columns || []).map((col: Column, cIdx: number) => ({
            ...col,
            id: `col-${timestamp}-${idx}-${cIdx}`,
          })),
        },
      };
    });

    // Remap copied internal edges to the new node IDs
    const newEdges: Edge[] = clipboard.edges
      .filter((edge) => idMap[edge.source] && idMap[edge.target])
      .map((edge, idx) => ({
        ...edge,
        id: `edge-${timestamp}-${idx}`,
        source: idMap[edge.source],
        target: idMap[edge.target],
        selected: false,
      }));

    // Insert into current active sheet (allowing pasting to sheet 2, sheet 3, etc.)
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: [
          ...sh.nodes.map((n) => ({ ...n, selected: false })),
          ...newNodes,
        ],
        edges: [...sh.edges, ...newEdges],
      })),
      // Update clipboard positions so successive pastes cascade nicely
      clipboard: {
        nodes: newNodes,
        edges: newEdges,
      },
    });

    return newNodes.length;
  },

  duplicateTable: (tableId: string) => {
    const { sheets, activeSheetId } = get();
    const activeSheet = sheets.find((sh) => sh.id === activeSheetId) ?? sheets[0];
    const node = activeSheet.nodes.find((n) => n.id === tableId);
    if (!node) return;

    const timestamp = Date.now();
    const newId = `table-${timestamp}`;

    const newNode: Node<TableData> = {
      ...node,
      id: newId,
      selected: true,
      position: {
        x: node.position.x + 35,
        y: node.position.y + 35,
      },
      data: {
        ...node.data,
        id: newId,
        name: `${node.data.name}_copy`,
        columns: (node.data.columns || []).map((col, idx) => ({
          ...col,
          id: `col-${timestamp}-${idx}`,
        })),
      },
    };

    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: [
          ...sh.nodes.map((n) => ({ ...n, selected: false })),
          newNode,
        ],
      })),
    });
  },

  duplicateSelectedTables: () => {
    const count = get().copySelectedTables();
    if (count > 0) {
      get().pasteTables();
    }
    return count;
  },
}));

export const saveDraftImmediately = () => {
  if (typeof window === 'undefined') return;
  try {
    const state = useDiagramStore.getState();
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        sheets: state.sheets,
        activeSheetId: state.activeSheetId,
        diagramTitle: state.diagramTitle,
        diagramId: state.diagramId,
        updatedAt: Date.now(),
      })
    );
  } catch (e) {
    console.warn('Failed immediate save:', e);
  }
};

// Auto-persist local draft to localStorage (every edit is preserved!)
if (typeof window !== 'undefined') {
  let saveDraftTimer: any = null;
  useDiagramStore.subscribe(() => {
    if (saveDraftTimer) clearTimeout(saveDraftTimer);
    saveDraftTimer = setTimeout(() => {
      saveDraftImmediately();
    }, 400);
  });
}

// ─── Real-time Collaboration Broadcaster ──────────────────────────────────────
type CollabBroadcaster = (sheets: Sheet[], activeSheetId: string) => void;
let collabBroadcaster: CollabBroadcaster | null = null;
let broadcastTimeout: any = null;

export const setCollabBroadcaster = (fn: CollabBroadcaster) => {
  collabBroadcaster = fn;
};

// Listen to local diagram changes and broadcast to peers
useDiagramStore.subscribe((state, prevState) => {
  if (state.sheets !== prevState.sheets && !state.isRemoteUpdate && collabBroadcaster) {
    // Safety: NEVER broadcast if sheets is empty (still loading or uninitialized)
    if (state.sheets.length === 0) return;

    if (broadcastTimeout) clearTimeout(broadcastTimeout);
    broadcastTimeout = setTimeout(() => {
      collabBroadcaster?.(state.sheets, state.activeSheetId);
    }, 40);
  }
});

