import React from 'react';
import { ViewportPortal } from '@xyflow/react';
import { useCollaborationStore } from '../store/useCollaborationStore';

export const MultiplayerCursors: React.FC = () => {
  const cursors = useCollaborationStore((s) => s.cursors);
  const myId = useCollaborationStore((s) => s.myProfile.id);

  // Filter out self and any cursor inactive for > 15 seconds
  const now = Date.now();
  const activeCursors = Object.values(cursors).filter(
    (c) => c.id !== myId && now - c.lastUpdated < 15000
  );

  return (
    <ViewportPortal>
      {activeCursors.map((cursor) => (
        <div
          key={cursor.id}
          className="absolute top-0 left-0 pointer-events-none z-50 select-none will-change-transform"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
            transition: 'transform 0.06s ease-out',
          }}
        >
          {/* Smooth SVG Cursor Pointer */}
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            className="filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
          >
            <path
              d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
              fill={cursor.color}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </svg>

          {/* User Name Pill Tag (Canva / Figma style) */}
          <div
            style={{ backgroundColor: cursor.color }}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-xl shadow-black/50 whitespace-nowrap ml-3 -mt-1 ring-1 ring-white/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />
            <span>{cursor.name}</span>
          </div>
        </div>
      ))}
    </ViewportPortal>
  );
};

