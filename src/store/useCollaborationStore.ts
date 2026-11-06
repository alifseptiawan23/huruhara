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
  email?: string;
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

interface CollaborationState {
  roomId: string;
  myProfile: Collaborator;
  collaborators: Collaborator[];
  cursors: Record<string, CursorPosition>;
  channel: RealtimeChannel | null;
  isConnected: boolean;
  isShareOpen: boolean;
  needsAuthToJoin: boolean;

  setRoomId: (roomId: string) => void;
  setIsShareOpen: (open: boolean) => void;
  initSession: (customRoomId?: string, user?: User | null) => void;
  startSharing: (preferredRoomId?: string, user?: User | null) => void;
  leaveRoom: () => void;
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

  return {
    roomId: '',
    myProfile: {
      id: myId,
      name: 'User',
      color: defaultColor,
      isSelf: true,
    },
    collaborators: [],
    cursors: {},
    channel: null,
    isConnected: false,
    isShareOpen: false,
    needsAuthToJoin: false,

    setRoomId: (roomId: string) => set({ roomId }),
    setIsShareOpen: (open: boolean) => set({ isShareOpen: open }),

    startSharing: (preferredRoomId?: string, user?: User | null) => {
      // Must be logged in to share
      if (!user) return;

      let currentRoom = get().roomId;
      if (!currentRoom) {
        currentRoom = preferredRoomId || `collab_${Math.random().toString(36).substring(2, 9)}`;
        get().initSession(currentRoom, user);
      }
      set({ isShareOpen: true });
    },

    leaveRoom: () => {
      // Clear room parameter from URL
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('room');
      window.history.replaceState({}, '', currentUrl.toString());

      get().cleanup();
      set({
        roomId: '',
        needsAuthToJoin: false,
      });
    },

    initSession: (customRoomId?: string, user?: User | null) => {
      // 1. Remove any previously created channel with the same or old room
      supabase.getChannels().forEach((ch) => {
        if (ch.topic.includes('drawsql_room')) {
          supabase.removeChannel(ch);
        }
      });

      // 2. Determine target room
      const urlParams = new URLSearchParams(window.location.search);
      const urlRoom = urlParams.get('room');
      const targetRoom = customRoomId || urlRoom;

      // If no room is requested in URL or param, stay in private mode
      if (!targetRoom) {
        set({
          roomId: '',
          isConnected: false,
          collaborators: [],
          cursors: {},
          channel: null,
          needsAuthToJoin: false,
        });
        return;
      }

      // If room is requested BUT user is not logged in:
      // LOCK THE ROOM and show auth gate modal!
      if (!user) {
        set({
          roomId: targetRoom,
          isConnected: false,
          collaborators: [],
          cursors: {},
          channel: null,
          needsAuthToJoin: true,
        });
        return;
      }

      // User is authenticated! Clear the lock flag
      set({ needsAuthToJoin: false });

      // Update URL search query without full reload
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('room') !== targetRoom) {
        currentUrl.searchParams.set('room', targetRoom);
        window.history.replaceState({}, '', currentUrl.toString());
      }

      // Configure verified Google identity
      const userName =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User';
      const userAvatar = user.user_metadata?.avatar_url;

      const myProfile: Collaborator = {
        id: user.id || myId,
        name: userName,
        avatar: userAvatar,
        email: user.email,
        color: defaultColor,
        isSelf: true,
      };

      set({ roomId: targetRoom, myProfile });

      // If targetRoom is from a saved cloud diagram, load it if available
      if (targetRoom.startsWith('diag_')) {
        const diagId = targetRoom.replace('diag_', '');
        supabase
          .from('diagrams')
          .select('*')
          .eq('id', diagId)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              useDiagramStore.getState().loadCloudDiagram(data.id, data.title, data.sheets, data.active_sheet_id);
            }
          });
      }

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
                  name: p.name || 'User',
                  color: p.color || '#8b5cf6',
                  avatar: p.avatar,
                  email: p.email,
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
                  name: p.name || 'User',
                  color: p.color || '#8b5cf6',
                  avatar: p.avatar,
                  email: p.email,
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
        useDiagramStore.getState().applyRemoteUpdate(payload.sheets, payload.activeSheetId);
      });

      // 4. Broadcast: Request canvas state when a new peer joins
      roomChannel.on('broadcast', { event: 'request_state' }, ({ payload }) => {
        if (payload && payload.requesterId !== myProfile.id) {
          const { sheets, activeSheetId, diagramTitle } = useDiagramStore.getState();
          // Send active canvas state to newcomer
          roomChannel.send({
            type: 'broadcast',
            event: 'sync_state',
            payload: {
              targetId: payload.requesterId,
              sheets,
              activeSheetId,
              diagramTitle,
            },
          });
        }
      });

      // 5. Broadcast: Receive initial canvas state from existing peer
      roomChannel.on('broadcast', { event: 'sync_state' }, ({ payload }) => {
        if (payload && (!payload.targetId || payload.targetId === myProfile.id)) {
          useDiagramStore.getState().applyRemoteUpdate(payload.sheets, payload.activeSheetId);
          if (payload.diagramTitle) {
            useDiagramStore.setState({ diagramTitle: payload.diagramTitle });
          }
        }
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
            email: myProfile.email,
            onlineAt: new Date().toISOString(),
          });

          // Request latest canvas state from any peer already in the room!
          roomChannel.send({
            type: 'broadcast',
            event: 'request_state',
            payload: { requesterId: myProfile.id },
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          set({ isConnected: false });
        }
      });
    },

    broadcastCursor: (x: number, y: number) => {
      const { channel, isConnected, myProfile, roomId } = get();
      if (!channel || !isConnected || !roomId) return;

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
      const { channel, isConnected, myProfile, roomId } = get();
      if (!channel || !isConnected || !roomId) return;

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
