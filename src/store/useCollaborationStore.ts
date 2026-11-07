import { create } from 'zustand';
import type { RealtimeChannel, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Sheet } from '../types/schema';
import { useDiagramStore, setCollabBroadcaster } from './useDiagramStore';

export type UserProjectRole = 'owner' | 'editor' | 'viewer';

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  email?: string;
  isSelf?: boolean;
  role?: UserProjectRole;
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
  projectOwnerId: string | null;
  projectOwnerInfo: { id?: string; name: string; email?: string } | null;
  currentUserRole: UserProjectRole;
  shareRoleSetting: 'editor' | 'viewer';
  allowedEditors: string[];
  isCanvasLoaded: boolean;
  myProfile: Collaborator;
  collaborators: Collaborator[];
  cursors: Record<string, CursorPosition>;
  channel: RealtimeChannel | null;
  isConnected: boolean;
  isShareOpen: boolean;
  needsAuthToJoin: boolean;

  setRoomId: (roomId: string) => void;
  setIsShareOpen: (open: boolean) => void;
  setShareRoleSetting: (role: 'editor' | 'viewer') => void;
  setAllowedEditors: (emails: string[]) => void;
  addAllowedEditor: (email: string) => void;
  removeAllowedEditor: (email: string) => void;
  changeUserRole: (userId: string, newRole: UserProjectRole) => void;
  initSession: (customRoomId?: string, user?: User | null) => void;
  startSharing: (preferredRoomId?: string, user?: User | null) => void;
  leaveRoom: () => void;
  broadcastCursor: (x: number, y: number) => void;
  broadcastDiagramChange: (sheets: Sheet[], activeSheetId: string) => void;
  broadcastTitleChange: (newTitle: string) => void;
  broadcastShareRoleChange: (newRole: 'editor' | 'viewer') => void;
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
    projectOwnerId: null,
    projectOwnerInfo: null,
    currentUserRole: 'owner',
    shareRoleSetting: 'editor',
    allowedEditors: [],
    isCanvasLoaded: false,
    myProfile: {
      id: myId,
      name: 'User',
      color: defaultColor,
      isSelf: true,
      role: 'owner',
    },
    collaborators: [],
    cursors: {},
    channel: null,
    isConnected: false,
    isShareOpen: false,
    needsAuthToJoin: false,

    setRoomId: (roomId: string) => set({ roomId }),
    setIsShareOpen: (open: boolean) => {
      // Non-owners can NEVER open share modal!
      if (open && get().currentUserRole !== 'owner') {
        return;
      }
      set({ isShareOpen: open });
    },
    setShareRoleSetting: (role: 'editor' | 'viewer') => {
      set({ shareRoleSetting: role });
      get().broadcastShareRoleChange(role);
    },
    setAllowedEditors: (emails: string[]) => {
      set({ allowedEditors: emails });
    },
    addAllowedEditor: (email: string) => {
      const clean = email.trim().toLowerCase();
      if (!clean) return;
      const current = get().allowedEditors;
      if (!current.includes(clean)) {
        set({ allowedEditors: [...current, clean] });
      }
    },
    removeAllowedEditor: (email: string) => {
      const clean = email.trim().toLowerCase();
      set({ allowedEditors: get().allowedEditors.filter((e) => e !== clean) });
    },
    changeUserRole: (userId: string, newRole: UserProjectRole) => {
      if (get().currentUserRole !== 'owner') return;
      const { channel } = get();
      if (channel) {
        channel.send({
          type: 'broadcast',
          event: 'individual_role_update',
          payload: { targetUserId: userId, newRole },
        });
      }
      set((s) => ({
        collaborators: s.collaborators.map((c) =>
          c.id === userId ? { ...c, role: newRole } : c
        ),
      }));
    },

    startSharing: (preferredRoomId?: string, user?: User | null) => {
      // Must be logged in to share
      if (!user) return;
      // If already connected and not owner, disallow sharing
      if (get().currentUserRole !== 'owner' && get().projectOwnerId && get().projectOwnerId !== user.id) {
        alert('Hanya pemilik proyek yang dapat membagikan atau mengatur izin akses proyek ini.');
        return;
      }

      let currentRoom = preferredRoomId || get().roomId;
      if (!currentRoom) {
        currentRoom = `collab_${Math.random().toString(36).substring(2, 9)}`;
      }
      get().initSession(currentRoom, user);
      set({ isShareOpen: true });
    },

    leaveRoom: () => {
      // Clear project/room parameter from URL
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.delete('project');
      currentUrl.searchParams.delete('diagram');
      currentUrl.searchParams.delete('room');
      window.history.replaceState({}, '', currentUrl.toString());

      get().cleanup();
      set({
        roomId: '',
        needsAuthToJoin: false,
        isCanvasLoaded: false,
        projectOwnerId: null,
        projectOwnerInfo: null,
        currentUserRole: 'owner',
      });
    },

    initSession: (customRoomId?: string, user?: User | null) => {
      // 1. Remove any previously created channel with the same or old room
      supabase.getChannels().forEach((ch) => {
        if (ch.topic.includes('drawsql_room')) {
          supabase.removeChannel(ch);
        }
      });

      // 2. Determine target room / project
      const urlParams = new URLSearchParams(window.location.search);
      const urlProject = urlParams.get('project') || urlParams.get('diagram');
      const urlRoom = urlParams.get('room');
      const rawTarget = customRoomId || urlProject || urlRoom;
      const targetRoom = rawTarget ? rawTarget.replace('diag_', '') : '';

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
      currentUrl.searchParams.delete('room');
      currentUrl.searchParams.delete('diagram');
      if (currentUrl.searchParams.get('project') !== targetRoom) {
        currentUrl.searchParams.set('project', targetRoom);
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
      if (targetRoom && !targetRoom.startsWith('collab_')) {
        supabase
          .from('diagrams')
          .select('*')
          .eq('id', targetRoom)
          .single()
          .then(({ data, error }) => {
            if (!error && data) {
              const isOwner = user && data.user_id === user.id;
              const settings = data.sheets?.[0]?.projectSettings;
              const allowed = settings?.allowedEditors || [];
              const linkRole = settings?.defaultRole || urlParams.get('role') || 'viewer';

              let role: UserProjectRole = 'viewer';
              if (isOwner) {
                role = 'owner';
              } else if (user?.email && allowed.includes(user.email.toLowerCase())) {
                role = 'editor';
              } else if (linkRole === 'editor' && urlParams.get('role') === 'editor') {
                role = 'editor';
              } else {
                role = 'viewer';
              }

              const ownerInfo = {
                id: data.user_id,
                name: isOwner
                  ? (user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anda')
                  : (settings?.ownerName || 'Pengguna'),
                email: isOwner ? user.email : settings?.ownerEmail,
              };

              set((s) => ({
                projectOwnerId: data.user_id,
                projectOwnerInfo: ownerInfo,
                currentUserRole: role,
                shareRoleSetting: linkRole === 'editor' ? 'editor' : 'viewer',
                allowedEditors: allowed,
                isCanvasLoaded: true,
                isShareOpen: isOwner ? s.isShareOpen : false,
                myProfile: { ...s.myProfile, role },
              }));

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
                  role: p.role || (p.id === get().projectOwnerId ? 'owner' : 'editor'),
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
                  role: p.role || (p.id === get().projectOwnerId ? 'owner' : 'editor'),
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
        if (!Array.isArray(payload.sheets) || payload.sheets.length === 0) return;

        // Safety: If current user is owner with custom tables, never accept incoming bogus update with sample tables!
        const currentNodes = useDiagramStore.getState().sheets.flatMap((s) => s.nodes);
        const incomingNodes = payload.sheets.flatMap((s: any) => s.nodes || []);
        const isIncomingSample = incomingNodes.length === 4 && incomingNodes.some((n: any) => n.data?.label === 'users');
        const isCurrentCustom = currentNodes.length > 0 && !currentNodes.every((n: any) => ['users', 'profiles', 'posts', 'comments'].includes(String(n.data?.label || '')));

        if (get().currentUserRole === 'owner' && isIncomingSample && isCurrentCustom) {
          console.warn('Blocked incoming update that would overwrite owner canvas with sample tables.');
          return;
        }

        useDiagramStore.getState().applyRemoteUpdate(payload.sheets, payload.activeSheetId);
        set({ isCanvasLoaded: true });
      });

      // 3b. Broadcast: Diagram Title change
      roomChannel.on('broadcast', { event: 'title_update' }, ({ payload }) => {
        if (!payload || payload.senderId === myProfile.id) return;
        if (payload.title) {
          useDiagramStore.setState({ diagramTitle: payload.title });
        }
      });

      // 3c. Broadcast: Role Permission update (e.g. owner toggled viewer/editor)
      roomChannel.on('broadcast', { event: 'role_permission_update' }, ({ payload }) => {
        if (!payload || !payload.shareRole) return;
        set((s) => {
          if (s.currentUserRole === 'owner') return { shareRoleSetting: payload.shareRole };
          return {
            currentUserRole: payload.shareRole,
            shareRoleSetting: payload.shareRole,
            myProfile: { ...s.myProfile, role: payload.shareRole },
          };
        });
      });

      // 3d. Broadcast: Individual Role update for specific user
      roomChannel.on('broadcast', { event: 'individual_role_update' }, ({ payload }) => {
        if (!payload || !payload.targetUserId || !payload.newRole) return;
        if (payload.targetUserId === myProfile.id) {
          set((s) => ({
            currentUserRole: payload.newRole,
            myProfile: { ...s.myProfile, role: payload.newRole },
          }));
        }
        set((s) => ({
          collaborators: s.collaborators.map((c) =>
            c.id === payload.targetUserId ? { ...c, role: payload.newRole } : c
          ),
        }));
      });

      // 4. Broadcast: Request canvas state when a new peer joins
      roomChannel.on('broadcast', { event: 'request_state' }, ({ payload }) => {
        const { currentUserRole, isCanvasLoaded, projectOwnerId, projectOwnerInfo, shareRoleSetting, allowedEditors } = get();
        // Only respond if this client has legitimate canvas state loaded!
        if ((currentUserRole === 'owner' || isCanvasLoaded) && payload && payload.requesterId !== myProfile.id) {
          const { sheets, activeSheetId, diagramTitle } = useDiagramStore.getState();
          if (Array.isArray(sheets) && sheets.length > 0) {
            roomChannel.send({
              type: 'broadcast',
              event: 'sync_state',
              payload: {
                targetId: payload.requesterId,
                sheets,
                activeSheetId,
                diagramTitle,
                ownerId: projectOwnerId || user?.id,
                ownerInfo: projectOwnerInfo,
                shareRoleSetting,
                allowedEditors,
              },
            });
          }
        }
      });

      // 5. Broadcast: Receive initial canvas state from existing peer
      roomChannel.on('broadcast', { event: 'sync_state' }, ({ payload }) => {
        if (payload && (!payload.targetId || payload.targetId === myProfile.id)) {
          if (Array.isArray(payload.sheets) && payload.sheets.length > 0) {
            useDiagramStore.getState().applyRemoteUpdate(payload.sheets, payload.activeSheetId);
            if (payload.diagramTitle) {
              useDiagramStore.setState({ diagramTitle: payload.diagramTitle });
            }

            const isOwner = user && payload.ownerId === user.id;
            const allowed: string[] = Array.isArray(payload.allowedEditors) ? payload.allowedEditors : [];
            const isAllowedEmail = Boolean(
              user?.email &&
              allowed.some((e) => typeof e === 'string' && e.toLowerCase() === user.email?.toLowerCase())
            );
            const urlRole = new URLSearchParams(window.location.search).get('role');

            let determinedRole: UserProjectRole = 'viewer';
            if (isOwner) {
              determinedRole = 'owner';
            } else if (isAllowedEmail) {
              determinedRole = 'editor';
            } else if (payload.shareRoleSetting === 'editor' && urlRole === 'editor') {
              determinedRole = 'editor';
            } else {
              determinedRole = 'viewer';
            }

            const ownerInfo = payload.ownerInfo || {
              id: payload.ownerId,
              name: isOwner ? 'Anda' : (payload.ownerName || 'Pemilik Proyek'),
              email: payload.ownerEmail,
            };

            set((s) => ({
              isCanvasLoaded: true,
              projectOwnerId: payload.ownerId || s.projectOwnerId,
              projectOwnerInfo: ownerInfo,
              currentUserRole: determinedRole,
              shareRoleSetting: payload.shareRoleSetting || s.shareRoleSetting,
              allowedEditors: allowed,
              myProfile: { ...s.myProfile, role: determinedRole },
            }));
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
            role: get().currentUserRole,
            onlineAt: new Date().toISOString(),
          });

          // Request latest canvas state from any peer already in the room!
          roomChannel.send({
            type: 'broadcast',
            event: 'request_state',
            payload: { requesterId: myProfile.id, userEmail: user?.email },
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
      const { channel, isConnected, myProfile, roomId, currentUserRole, isCanvasLoaded } = get();
      if (!channel || !isConnected || !roomId) return;
      // Viewers are strictly prohibited from broadcasting diagram edits
      if (currentUserRole === 'viewer') return;
      // Never broadcast before canvas is legitimately loaded
      if (!isCanvasLoaded) return;
      if (!Array.isArray(sheets) || sheets.length === 0) return;

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

    broadcastTitleChange: (newTitle: string) => {
      const { channel, isConnected, myProfile, roomId } = get();
      if (!channel || !isConnected || !roomId) return;

      channel.send({
        type: 'broadcast',
        event: 'title_update',
        payload: {
          senderId: myProfile.id,
          title: newTitle,
          timestamp: Date.now(),
        },
      });

      if (roomId && !roomId.startsWith('collab_')) {
        supabase
          .from('diagrams')
          .update({
            title: newTitle,
            updated_at: new Date().toISOString(),
          })
          .eq('id', roomId)
          .then();
      }
    },

    broadcastShareRoleChange: (newRole: 'editor' | 'viewer') => {
      const { channel, isConnected, roomId } = get();
      if (!channel || !isConnected || !roomId) return;

      channel.send({
        type: 'broadcast',
        event: 'role_permission_update',
        payload: {
          shareRole: newRole,
        },
      });
    },

    cleanup: () => {
      const { channel } = get();
      if (channel) {
        supabase.removeChannel(channel);
        set({
          channel: null,
          isConnected: false,
          collaborators: [],
          cursors: {},
          projectOwnerId: null,
          projectOwnerInfo: null,
          currentUserRole: 'owner',
        });
      }
    },
  };
});

export const selectIsReadOnly = (s: CollaborationState) => s.currentUserRole === 'viewer';

// Register broadcaster so useDiagramStore auto-syncs local mutations
setCollabBroadcaster((sheets, activeSheetId) => {
  useCollaborationStore.getState().broadcastDiagramChange(sheets, activeSheetId);
});
