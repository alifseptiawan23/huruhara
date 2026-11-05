import { create } from 'zustand';
import { addEdge, applyEdgeChanges, applyNodeChanges } from '@xyflow/react';
import type { Connection, Edge, EdgeChange, Node, NodeChange, Viewport } from '@xyflow/react';
import type { Column, Sheet, TableData } from '../types/schema';
import { initialTables, initialEdges } from '../utils/sampleData';
import { computeDagreLayout } from '../utils/autoLayout';

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectActiveSheet = (s: DiagramState): Sheet =>
  s.sheets.find((sh) => sh.id === s.activeSheetId) ?? s.sheets[0];

export const selectActiveNodes = (s: DiagramState): Node<TableData>[] =>
  selectActiveSheet(s).nodes;

export const selectActiveEdges = (s: DiagramState): Edge[] =>
  selectActiveSheet(s).edges;

// ─── State Shape ──────────────────────────────────────────────────────────────
interface DiagramState {
  sheets: Sheet[];
  activeSheetId: string;
  hoveredTableId: string | null;
  showSplitView: boolean;
  animateEdges: boolean;
  diagramId: string | null;
  diagramTitle: string;
  setDiagramTitle: (title: string) => void;
  loadCloudDiagram: (id: string, title: string, sheets: Sheet[], activeSheetId: string) => void;
  newDiagram: () => void;

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
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6'];

const initialSheet: Sheet = {
  id: 'sheet-1',
  name: 'Main Schema',
  nodes: initialTables,
  edges: initialEdges,
};

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
  sheets: [initialSheet],
  activeSheetId: 'sheet-1',
  hoveredTableId: null,
  showSplitView: false,
  animateEdges: true,
  diagramId: null,
  diagramTitle: 'Untitled Schema',

  setDiagramTitle: (title) => set({ diagramTitle: title }),
  loadCloudDiagram: (id, title, sheets, activeSheetId) =>
    set({ diagramId: id, diagramTitle: title, sheets, activeSheetId }),
  newDiagram: () =>
    set({
      diagramId: null,
      diagramTitle: 'Untitled Schema',
      sheets: [{ id: 'sheet-1', name: 'Main Schema', nodes: [], edges: [] }],
      activeSheetId: 'sheet-1',
    }),

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
    set({ sheets, activeSheetId, isRemoteUpdate: true });
    // Reset flag after 60ms so subsequent local edits broadcast normally
    setTimeout(() => {
      useDiagramStore.setState({ isRemoteUpdate: false });
    }, 60);
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

  // ── Reset ───────────────────────────────────────────────────────────────────
  resetToSample: () => {
    const { sheets, activeSheetId } = get();
    set({
      sheets: updateActive(sheets, activeSheetId, (sh) => ({
        ...sh,
        nodes: initialTables,
        edges: initialEdges,
      })),
    });
  },
}));

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
    if (broadcastTimeout) clearTimeout(broadcastTimeout);
    broadcastTimeout = setTimeout(() => {
      collabBroadcaster?.(state.sheets, state.activeSheetId);
    }, 40);
  }
});

