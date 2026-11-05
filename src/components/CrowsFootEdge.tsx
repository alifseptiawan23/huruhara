import React, { useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
  Position,
  useReactFlow,
} from '@xyflow/react';
import { useDiagramStore } from '../store/useDiagramStore';
import { Trash2, ArrowLeftRight } from 'lucide-react';

// Marker "One" (|| double bar)
function OneMarker({ x, y, pos, color }: { x: number; y: number; pos: Position; color: string }) {
  const s = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const };
  switch (pos) {
    case Position.Right:
      return (
        <g>
          <line x1={x + 5} y1={y - 6} x2={x + 5} y2={y + 6} {...s} />
          <line x1={x + 10} y1={y - 6} x2={x + 10} y2={y + 6} {...s} />
        </g>
      );
    case Position.Left:
      return (
        <g>
          <line x1={x - 5} y1={y - 6} x2={x - 5} y2={y + 6} {...s} />
          <line x1={x - 10} y1={y - 6} x2={x - 10} y2={y + 6} {...s} />
        </g>
      );
    case Position.Bottom:
      return (
        <g>
          <line x1={x - 6} y1={y + 5} x2={x + 6} y2={y + 5} {...s} />
          <line x1={x - 6} y1={y + 10} x2={x + 6} y2={y + 10} {...s} />
        </g>
      );
    case Position.Top:
      return (
        <g>
          <line x1={x - 6} y1={y - 5} x2={x + 6} y2={y - 5} {...s} />
          <line x1={x - 6} y1={y - 10} x2={x + 6} y2={y - 10} {...s} />
        </g>
      );
  }
}

// Marker "Many / Arrow" (Crow's foot + panah tegas yang sangat jelas arahnya)
function ManyMarker({ x, y, pos, color }: { x: number; y: number; pos: Position; color: string }) {
  const s = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const };
  switch (pos) {
    case Position.Left:
      // Garis datang dari kiri luar menuju handle di x: panah menunjuk ke KANAN masuk ke handle
      return (
        <g>
          <polygon
            points={`${x - 13},${y - 6} ${x - 2},${y} ${x - 13},${y + 6}`}
            fill={color}
            stroke={color}
            strokeWidth={1}
          />
          <line x1={x - 15} y1={y - 7} x2={x - 15} y2={y + 7} {...s} />
        </g>
      );
    case Position.Right:
      // Garis datang dari kanan luar menuju handle di x: panah menunjuk ke KIRI masuk ke handle
      return (
        <g>
          <polygon
            points={`${x + 13},${y - 6} ${x + 2},${y} ${x + 13},${y + 6}`}
            fill={color}
            stroke={color}
            strokeWidth={1}
          />
          <line x1={x + 15} y1={y - 7} x2={x + 15} y2={y + 7} {...s} />
        </g>
      );
    case Position.Top:
      return (
        <g>
          <polygon
            points={`${x - 6},${y - 13} ${x},${y - 2} ${x + 6},${y - 13}`}
            fill={color}
            stroke={color}
            strokeWidth={1}
          />
          <line x1={x - 7} y1={y - 15} x2={x + 7} y2={y - 15} {...s} />
        </g>
      );
    case Position.Bottom:
      return (
        <g>
          <polygon
            points={`${x - 6},${y + 13} ${x},${y + 2} ${x + 6},${y + 13}`}
            fill={color}
            stroke={color}
            strokeWidth={1}
          />
          <line x1={x - 7} y1={y + 15} x2={x + 7} y2={y + 15} {...s} />
        </g>
      );
  }
}

export const CrowsFootEdge: React.FC<EdgeProps> = ({
  id,
  source,
  target,
  sourceX: initialSourceX,
  sourceY,
  targetX: initialTargetX,
  targetY,
  sourcePosition: initialSourcePos,
  targetPosition: initialTargetPos,
  style = {},
  selected,
  data,
}) => {
  const { getNode } = useReactFlow();
  const { updateEdgeCardinality, reverseEdge, deleteEdge } = useDiagramStore();
  const [isHovered, setIsHovered] = useState(false);

  // ── Dynamic 2-Way Smart Routing (Jalur Terpendek Otomatis) ──
  const sourceNode = getNode(source);
  const targetNode = getNode(target);

  let sourceX = initialSourceX;
  let targetX = initialTargetX;
  let sourcePosition = initialSourcePos;
  let targetPosition = initialTargetPos;

  if (sourceNode && targetNode) {
    const sourceWidth = (sourceNode.measured?.width as number) ?? 300;
    const targetWidth = (targetNode.measured?.width as number) ?? 300;

    const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
    const targetCenterX = targetNode.position.x + targetWidth / 2;
    const xDiff = targetCenterX - sourceCenterX;

    if (xDiff < -100) {
      // Target jelas berada di sebelah KIRI source:
      // Garis keluar dari KIRI source dan masuk ke KANAN target
      sourceX = sourceNode.position.x - 2;
      sourcePosition = Position.Left;

      targetX = targetNode.position.x + targetWidth + 2;
      targetPosition = Position.Right;
    } else if (xDiff > 100) {
      // Target jelas berada di sebelah KANAN source:
      // Garis keluar dari KANAN source dan masuk ke KIRI target
      sourceX = sourceNode.position.x + sourceWidth + 2;
      sourcePosition = Position.Right;

      targetX = targetNode.position.x - 2;
      targetPosition = Position.Left;
    } else {
      // Posisi X hampir vertikal sejajar:
      // Keduanya memakai sisi Kanan agar garis langsung vertikal naik/turun rapi
      sourceX = sourceNode.position.x + sourceWidth + 2;
      sourcePosition = Position.Right;

      targetX = targetNode.position.x + targetWidth + 2;
      targetPosition = Position.Right;
    }
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
    offset: 25,
  });

  // Normalisasi kardinalitas ('1:n' | 'n:1' | '1:1' | 'n:m')
  const rawCard = (data?.cardinality as string) || '1:n';
  const cardinality =
    rawCard === 'n:1'
      ? 'n:1'
      : rawCard === '1:1' || rawCard === 'one-to-one'
      ? '1:1'
      : rawCard === 'n:m' || rawCard === 'many-to-many'
      ? 'n:m'
      : '1:n';

  // Label tampilan: menunjukkan arah panah yang jelas
  const displayLabel =
    cardinality === '1:n'
      ? '1 → N'
      : cardinality === 'n:1'
      ? 'N ← 1'
      : cardinality === '1:1'
      ? '1 ⇄ 1'
      : 'N ⇄ M';

  const edgeColor = selected ? '#38bdf8' : (style.stroke as string) ?? '#6366f1';
  const edgeWidth = selected ? 3 : (style.strokeWidth as number) ?? 2;

  // Toggle kardinalitas saat label diklik: 1→N ➔ N←1 ➔ 1⇄1 ➔ N⇄M
  const handleToggleCardinality = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextCard =
      cardinality === '1:n'
        ? 'n:1'
        : cardinality === 'n:1'
        ? '1:1'
        : cardinality === '1:1'
        ? 'n:m'
        : '1:n';
    updateEdgeCardinality(id, nextCard);
  };

  // Tukar arah panah (reverse direction)
  const handleSwapDirection = (e: React.MouseEvent) => {
    e.stopPropagation();
    reverseEdge(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteEdge(id);
  };

  return (
    <>
      <g className={selected ? 'selected-edge' : ''}>
        {/* Invisible wide hit area: lebar 22px agar sangat mudah diklik */}
        <path
          d={edgePath}
          fill="none"
          stroke="transparent"
          strokeWidth={22}
          className="cursor-pointer"
        />

        {/* Glow neon saat garis terseleksi */}
        {selected && (
          <path
            d={edgePath}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={8}
            strokeOpacity={0.4}
            strokeLinecap="round"
          />
        )}

        {/* Garis utama relasi */}
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            ...style,
            stroke: edgeColor,
            strokeWidth: edgeWidth,
            fill: 'none',
          }}
        />

        {/* ── Ujung Source ── */}
        {cardinality === 'n:1' || cardinality === 'n:m' ? (
          // Jika N:1 atau N:M, panah berada di sisi Source (panah ke KIRI / Source)
          <ManyMarker x={sourceX} y={sourceY} pos={sourcePosition} color={edgeColor} />
        ) : (
          <OneMarker x={sourceX} y={sourceY} pos={sourcePosition} color={edgeColor} />
        )}

        {/* ── Ujung Target ── */}
        {cardinality === '1:n' || cardinality === 'n:m' ? (
          // Jika 1:N atau N:M, panah berada di sisi Target (panah ke KANAN / Target)
          <ManyMarker x={targetX} y={targetY} pos={targetPosition} color={edgeColor} />
        ) : (
          <OneMarker x={targetX} y={targetY} pos={targetPosition} color={edgeColor} />
        )}
      </g>

      {/* Interactive Badge di Tengah Garis Relasi */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan z-30"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="flex items-center gap-1 group">
            {/* Tombol Utama: Ganti Kardinalitas & Arah (1→N, N←1, 1⇄1, N⇄M) */}
            <button
              onClick={handleToggleCardinality}
              title={`Arah & Kardinalitas: ${displayLabel}\nKlik untuk rotasi: 1→N ➔ N←1 ➔ 1⇄1 ➔ N⇄M`}
              className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider shadow-md transition-all cursor-pointer border ${
                selected
                  ? 'bg-cyan-950 border-cyan-400 text-cyan-200 ring-4 ring-cyan-500/40 scale-125 shadow-cyan-500/50 shadow-lg'
                  : cardinality === 'n:1'
                  ? 'bg-amber-950/90 border-amber-500/70 text-amber-300 hover:bg-amber-900'
                  : cardinality === '1:1'
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                  : cardinality === 'n:m'
                  ? 'bg-purple-950/90 border-purple-500/60 text-purple-300 hover:bg-purple-900'
                  : 'bg-slate-900/95 border-indigo-500/60 text-indigo-300 hover:bg-indigo-950 hover:border-indigo-400'
              } hover:scale-110 active:scale-95`}
            >
              <span>{displayLabel}</span>
            </button>

            {/* Tombol Balik Arah Panah Langsung (⇄ Flip Arrow) */}
            {(isHovered || selected) && (
              <>
                <button
                  onClick={handleSwapDirection}
                  className="p-1 rounded-full bg-slate-900 border border-indigo-500/60 text-indigo-300 hover:bg-indigo-950 hover:text-white transition-all shadow-md hover:scale-110"
                  title="Tukar arah panah (Balik Kiri ⇋ Kanan)"
                >
                  <ArrowLeftRight size={11} />
                </button>

                <button
                  onClick={handleDelete}
                  className="p-1 rounded-full bg-slate-900 border border-red-500/60 text-red-400 hover:bg-red-950 hover:text-red-300 transition-all shadow-md hover:scale-110"
                  title="Hapus relasi ini (atau tekan Delete di keyboard)"
                >
                  <Trash2 size={11} />
                </button>
              </>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
