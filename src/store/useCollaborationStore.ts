import { create } from 'zustand';
import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Sheet } from '../types/schema';
import { useDiagramStore, setCollabBroadcaster } from './useDiagramStore';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  isSelf?: boolean;
}

export interface CursorPosition {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  lastUpdated: number;
}

const COLLAB_COLORS = [
  '#f43f5e', // Rose
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

const GUEST_NAMES = [
  'Arsitek Kilat',
  'Pengrajin Skema',
  'Panda Kreatif',
  'Falcon Biru',
  'Kancil Cepat',
  'Bintang Kode',
  'Singa Data',
  'Elang Digital',
];

interface CollaborationState {
  roomId: string;
  myProfile: Collaborator;
  collaborators: Collaborator[];
  cursors: Record<string, CursorPosition>;
  channel: RealtimeChannel | null;
  isConnected: boolean;
  isShareOpen: boolean;

  setRoomId: (roomId: string) => void;
  setIsShareOpen: (open: boolean) => void;
  setMyName: (name: string) => void;
  initSession: (customRoomId?: string, user?: User | null) => void;
  startSharing: (preferredRoomId?: string, user?: User | null) => void;
  broadcastCursor: (x: number, y: number) => void;
  broadcastDiagramChange: (sheets: Sheet[], activeSheetId: string) => void;
  cleanup: () => void;
}

// Generate or retrieve persistent clientId
const getClientId = (): string => {
  let id = sessionStorage.getItem('drawsql_collab_client_id');
  if (!id) {
    id = `user_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('drawsql_collab_client_id', id);
  }
  return id;
};

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const useCollaborationStore = create<CollaborationState>((set, get) => {
  const myId = getClientId();
  const defaultColor = getRandomItem(COLLAB_COLORS);
  const defaultName = getRandomItem(GUEST_NAMES);

  return {
    roomId: '',
    myProfile: {
      id: myId,
      name: defaultName,
      color: defaultColor,
      isSelf: true,
    },
    collaborators: [],
    cursors: {},
    channel: null,
    isConnected: false,
    isShareOpen: false,

    setRoomId: (roomId: string) => set({ roomId }),
    setIsShareOpen: (open: boolean) => set({ isShareOpen: open }),

    setMyName: (name: string) => {
      const { myProfile, channel } = get();
      const updated = { ...myProfile, name };
      set({ myProfile: updated });
      if (channel) {
        channel.track({
          id: updated.id,
          name: updated.name,
          color: updated.color,
          avatar: updated.avatar,
        });
      }
    },

    startSharing: (preferredRoomId?: string, user?: User | null) => {
      let currentRoom = get().roomId;
      if (!currentRoom) {
        currentRoom = preferredRoomId || `collab_${Math.random().toString(36).substring(2, 9)}`;
        get().initSession(currentRoom, user);
      }
      set({ isShareOpen: true });
    },

    initSession: (customRoomId?: string, user?: User | null) => {
      // Remove any previously created channel with the same or old room
      supabase.getChannels().forEach((ch) => {
        if (ch.topic.includes('drawsql_room')) {
          supabase.removeChannel(ch);
        }
      });

      // Determine Room ID from param or URL search
      const urlParams = new URLSearchParams(window.location.search);
      const urlRoom = urlParams.get('room');
      const targetRoom = customRoomId || urlRoom;

      // If no room is specified in URL or param, stay in private mode
      if (!targetRoom) {
        set({
          roomId: '',
          isConnected: false,
          collaborators: [],
          cursors: {},
          channel: null,
        });
        return;
      }

      // Update URL search query without full reload
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('room') !== targetRoom) {
        currentUrl.searchParams.set('room', targetRoom);
        window.history.replaceState({}, '', currentUrl.toString());
      }

      // Configure current profile with Google info if logged in
      const currentProfile = get().myProfile;
      const userName =
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split('@')[0] ||
        currentProfile.name;
      const userAvatar = user?.user_metadata?.avatar_url;

      const myProfile: Collaborator = {
        ...currentProfile,
        name: userName,
        avatar: userAvatar,
        isSelf: true,
      };

      set({ roomId: targetRoom, myProfile });

      // Create Supabase Realtime Channel
      const roomChannel = supabase.channel(`drawsql_room:${targetRoom}`, {
        config: {
          presence: { key: myProfile.id },
          broadcast: { ack: false, self: false },
        },
      });

      // 1. Presence: Track who is currently in the room
      roomChannel
        .on('presence', { event: 'sync' }, () => {
          const state = roomChannel.presenceState();
          const activeList: Collaborator[] = [];

          Object.values(state).forEach((presences: any) => {
            presences.forEach((p: any) => {
              if (p.id) {
                activeList.push({
                  id: p.id,
                  name: p.name || 'Anonymous',
                  color: p.color || '#8b5cf6',
                  avatar: p.avatar,
                  isSelf: p.id === myProfile.id,
                });
              }
            });
          });

          // Ensure self is in list if not yet synced
          if (!activeList.some((u) => u.id === myProfile.id)) {
            activeList.unshift(myProfile);
          }

          set({ collaborators: activeList });
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          set((s) => {
            const next = [...s.collaborators];
            newPresences.forEach((p: any) => {
              if (p.id && !next.some((u) => u.id === p.id)) {
                next.push({
                  id: p.id,
                  name: p.name || 'Anonymous',
                  color: p.color || '#8b5cf6',
                  avatar: p.avatar,
                  isSelf: p.id === myProfile.id,
                });
              }
            });
            return { collaborators: next };
          });
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          const leftIds = new Set(leftPresences.map((p: any) => p.id));
          set((s) => {
            const nextCursors = { ...s.cursors };
            leftIds.forEach((id: string) => {
              delete nextCursors[id];
            });
            return {
              collaborators: s.collaborators.filter((u) => !leftIds.has(u.id)),
              cursors: nextCursors,
            };
          });
        });

      // 2. Broadcast: Live Cursor movements
      roomChannel.on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (!payload || payload.id === myProfile.id) return;
        set((s) => ({
          cursors: {
            ...s.cursors,
            [payload.id]: {
              id: payload.id,
              name: payload.name,
              color: payload.color,
              x: payload.x,
              y: payload.y,
              lastUpdated: Date.now(),
            },
          },
        }));
      });

      // 3. Broadcast: Realtime Schema / Diagram edits
      roomChannel.on('broadcast', { event: 'diagram_update' }, ({ payload }) => {
        if (!payload || payload.senderId === myProfile.id) return;
        // Apply remote changes cleanly to diagram store
        useDiagramStore.getState().applyRemoteUpdate(payload.sheets, payload.activeSheetId);
      });

      // Subscribe & begin presence tracking
      roomChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          set({ isConnected: true, channel: roomChannel });
          await roomChannel.track({
            id: myProfile.id,
            name: myProfile.name,
            color: myProfile.color,
            avatar: myProfile.avatar,
            onlineAt: new Date().toISOString(),
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          set({ isConnected: false });
        }
      });
    },

    broadcastCursor: (x: number, y: number) => {
      const { channel, isConnected, myProfile } = get();
      if (!channel || !isConnected) return;

      channel.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          id: myProfile.id,
          name: myProfile.name,
          color: myProfile.color,
          x,
          y,
        },
      });
    },

    broadcastDiagramChange: (sheets: Sheet[], activeSheetId: string) => {
      const { channel, isConnected, myProfile } = get();
      if (!channel || !isConnected) return;

      channel.send({
        type: 'broadcast',
        event: 'diagram_update',
        payload: {
          senderId: myProfile.id,
          sheets,
          activeSheetId,
          timestamp: Date.now(),
        },
      });
    },

    cleanup: () => {
      const { channel } = get();
      if (channel) {
        supabase.removeChannel(channel);
        set({ channel: null, isConnected: false, collaborators: [], cursors: {} });
      }
    },
  };
});

// Register broadcaster so useDiagramStore auto-syncs local mutations
setCollabBroadcaster((sheets, activeSheetId) => {
  useCollaborationStore.getState().broadcastDiagramChange(sheets, activeSheetId);
});

