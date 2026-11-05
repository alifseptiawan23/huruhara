import React, { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import type { DataType, TableData } from '../types/schema';
import { useDiagramStore, selectActiveEdges } from '../store/useDiagramStore';
import { Key, Plus, Trash2 } from 'lucide-react';

const COMMON_TYPES: DataType[] = [
  'uuid', 'bigint', 'integer', 'varchar(255)', 'text',
  'boolean', 'timestamp', 'timestamptz', 'date', 'decimal(10,2)',
  'float', 'jsonb', 'inet',
];

const PRESET_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#ef4444', '#14b8a6'];

const TableNodeInner: React.FC<NodeProps> = ({ id, data }) => {
  const tableData = data as unknown as TableData;
  const { updateTableName, updateTableColor, deleteTable, addColumn, updateColumn, deleteColumn, setHoveredTable } = useDiagramStore();
  const hoveredTableId = useDiagramStore((s) => s.hoveredTableId);
  const edges = useDiagramStore(selectActiveEdges);

  const [showColorPicker, setShowColorPicker] = useState(false);

  // Determine highlight/dim state
  const isHovered = hoveredTableId === id;
  const isConnected = hoveredTableId
    ? edges.some((e) => (e.source === hoveredTableId && e.target === id) || (e.target === hoveredTableId && e.source === id))
    : true;
  const isDimmed = !!hoveredTableId && !isHovered && !isConnected;

  return (
    <div
      className={`bg-slate-900 rounded-xl shadow-2xl min-w-[290px] max-w-[350px] border transition-all duration-200 ${
        isDimmed
          ? 'opacity-25 border-slate-800'
          : isHovered
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-indigo-900/40'
          : 'border-slate-700/80 hover:border-slate-500'
      }`}
      onMouseEnter={() => setHoveredTable(id)}
      onMouseLeave={() => setHoveredTable(null)}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 rounded-t-xl flex items-center justify-between"
        style={{ backgroundColor: `${tableData.color}18`, borderTop: `3px solid ${tableData.color}` }}
      >
        <div className="flex items-center gap-2 flex-1 mr-2">
          <span
            className="w-2.5 h-2.5 rounded-full cursor-pointer hover:scale-125 transition-transform shrink-0"
            style={{ backgroundColor: tableData.color }}
            onClick={() => setShowColorPicker(!showColorPicker)}
          />
          <input
            type="text"
            value={tableData.name}
            onChange={(e) => updateTableName(id, e.target.value)}
            className="bg-transparent font-bold text-sm text-white focus:outline-none focus:bg-slate-800/80 px-1 py-0.5 rounded w-full border border-transparent focus:border-slate-600 font-mono"
            placeholder="table_name"
          />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => addColumn(id)} className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-white transition-colors" title="Tambah kolom">
            <Plus size={14} />
          </button>
          <button onClick={() => deleteTable(id)} className="p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors" title="Hapus tabel">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Color picker */}
      {showColorPicker && (
        <div className="flex gap-1.5 p-2 bg-slate-800 border-b border-slate-700 justify-center">
          {PRESET_COLORS.map((c) => (
            <button key={c} onClick={() => { updateTableColor(id, c); setShowColorPicker(false); }}
              className="w-5 h-5 rounded-full border border-slate-600 hover:scale-125 transition-transform"
              style={{ backgroundColor: c }} />
          ))}
        </div>
      )}

      {/* Column list */}
      <div className="py-0.5">
        {tableData.columns.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-600 italic">
            Klik + untuk menambah kolom
          </div>
        ) : (
          tableData.columns.map((col) => (
            <div key={col.id} className="group relative flex items-center gap-1 px-2.5 py-1.5 hover:bg-slate-800/60 border-b border-slate-800/30 text-xs">
              {/* Dual-Direction Handles (Bisa tarik & hubungkan dari sisi kiri maupun kanan) */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.id}-target`}
                className="!w-2.5 !h-2.5 !bg-indigo-500 hover:!bg-cyan-400 hover:!scale-125 !border-2 !border-slate-900 -left-1.5 !rounded-full transition-all cursor-crosshair"
                title="Hubungkan relasi (kiri)"
              />
              <Handle
                type="source"
                position={Position.Left}
                id={`${col.id}-source-left`}
                className="!w-2.5 !h-2.5 !bg-indigo-500 hover:!bg-cyan-400 hover:!scale-125 !border-2 !border-slate-900 -left-1.5 !rounded-full transition-all cursor-crosshair"
                title="Tarik relasi ke kiri"
              />

              <Handle
                type="source"
                position={Position.Right}
                id={`${col.id}-source`}
                className="!w-2.5 !h-2.5 !bg-indigo-500 hover:!bg-cyan-400 hover:!scale-125 !border-2 !border-slate-900 -right-1.5 !rounded-full transition-all cursor-crosshair"
                title="Tarik relasi ke kanan"
              />
              <Handle
                type="target"
                position={Position.Right}
                id={`${col.id}-target-right`}
                className="!w-2.5 !h-2.5 !bg-indigo-500 hover:!bg-cyan-400 hover:!scale-125 !border-2 !border-slate-900 -right-1.5 !rounded-full transition-all cursor-crosshair"
                title="Hubungkan relasi dari kanan"
              />

              {/* PK toggle */}
              <button onClick={() => updateColumn(id, col.id, { isPrimaryKey: !col.isPrimaryKey })}
                className={`p-0.5 rounded shrink-0 ${col.isPrimaryKey ? 'text-amber-400' : 'text-slate-700 hover:text-slate-500'}`}>
                <Key size={12} />
              </button>

              {/* Column name */}
              <input type="text" value={col.name}
                onChange={(e) => updateColumn(id, col.id, { name: e.target.value })}
                className="bg-transparent text-slate-200 font-mono focus:outline-none focus:bg-slate-800 px-1 py-0.5 rounded flex-1 min-w-0 border border-transparent focus:border-slate-600 text-[11px]"
                placeholder="column_name" />

              {/* Type selector */}
              <select value={col.type} onChange={(e) => updateColumn(id, col.id, { type: e.target.value })}
                className="bg-slate-800 text-slate-400 font-mono text-[10px] rounded px-1 py-0.5 border border-slate-700/60 focus:outline-none focus:border-indigo-500 max-w-[90px]">
                {COMMON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                {!COMMON_TYPES.includes(col.type as DataType) && <option value={col.type}>{col.type}</option>}
              </select>

              {/* Nullable toggle */}
              <button onClick={() => updateColumn(id, col.id, { isNullable: !col.isNullable })}
                className={`text-[9px] font-mono px-1 py-0.5 rounded shrink-0 ${col.isNullable ? 'text-slate-600' : 'text-rose-400 font-bold'}`}
                title={col.isNullable ? 'Nullable' : 'NOT NULL'}>
                {col.isNullable ? 'null' : 'NN'}
              </button>

              {/* Delete column */}
              <button onClick={() => deleteColumn(id, col.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity shrink-0">
                <Trash2 size={11} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <button onClick={() => addColumn(id)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] text-slate-600 hover:text-indigo-300 hover:bg-slate-800/40 rounded-b-xl transition-colors border-t border-slate-800/40">
        <Plus size={12} /> Tambah Kolom
      </button>
    </div>
  );
};

export const TableNode = memo(TableNodeInner);
