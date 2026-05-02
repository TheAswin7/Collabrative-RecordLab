'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { CurrentUser } from './useCurrentUser';

/* ─── Types ─── */
export interface CursorPos { x: number; y: number; }

export interface OnlineUser {
  id: string;
  displayName: string;
  initials: string;
  color: string;
  cursor: CursorPos;
  action: string;
}

export interface ChatMsg {
  id: string;
  author: string;
  authorId: string;
  time: string;
  text: string;
  reactions: number;
}

/* ─── Hook ─── */
export function useRealtimeCollab(
  projectId: string | null,
  currentUser: CurrentUser | null,
  callbacks: {
    onRemoteTextEdit: (page: number, html: string) => void;
    onRemoteShapeEdit: (page: number, shapes: unknown[]) => void;
    onRemoteChatMsg: (msg: ChatMsg) => void;
    onRemoteFontChange?: (font: string, size: number) => void;
  },
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!projectId || !currentUser) return;

    const supabase = createClient();
    const channel = supabase.channel(`labmate:${projectId}`, {
      config: { presence: { key: currentUser.id } },
    });

    /* ── Presence sync ── */
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{
        id: string; displayName: string; initials: string;
        color: string; cursor: CursorPos; action: string;
      }>();
      const users: OnlineUser[] = Object.values(state).flatMap(presences =>
        presences.map(p => ({
          id: p.id, displayName: p.displayName, initials: p.initials,
          color: p.color, cursor: p.cursor ?? { x: 50, y: 50 }, action: p.action ?? 'Viewing',
        }))
      );
      setOnlineUsers(users);
    });

    /* ── Broadcast listeners ── */
    channel.on('broadcast', { event: 'text-edit' }, ({ payload }) => {
      if ((payload as { userId: string }).userId !== currentUser.id)
        callbacksRef.current.onRemoteTextEdit((payload as { page: number }).page, (payload as { html: string }).html);
    });

    channel.on('broadcast', { event: 'shape-edit' }, ({ payload }) => {
      if ((payload as { userId: string }).userId !== currentUser.id)
        callbacksRef.current.onRemoteShapeEdit((payload as { page: number }).page, (payload as { shapes: unknown[] }).shapes);
    });

    channel.on('broadcast', { event: 'chat-msg' }, ({ payload }) => {
      const msg = (payload as { msg: ChatMsg }).msg;
      if (msg.authorId !== currentUser.id)
        callbacksRef.current.onRemoteChatMsg(msg);
    });

    channel.on('broadcast', { event: 'font-change' }, ({ payload }) => {
      if ((payload as { userId: string }).userId !== currentUser.id && callbacksRef.current.onRemoteFontChange)
        callbacksRef.current.onRemoteFontChange(
          (payload as { font: string }).font,
          (payload as { size: number }).size
        );
    });

    /* ── Subscribe & track presence ── */
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          id: currentUser.id,
          displayName: currentUser.displayName,
          initials: currentUser.initials,
          color: currentUser.color,
          cursor: { x: 50, y: 50 },
          action: 'Just joined',
        });
      }
    });

    channelRef.current = channel;
    return () => { channel.unsubscribe(); channelRef.current = null; };
  }, [projectId, currentUser]);

  /* ── Broadcast helpers ── */
  const broadcastTextEdit = useCallback((page: number, html: string) => {
    channelRef.current?.send({ type: 'broadcast', event: 'text-edit', payload: { page, html, userId: currentUser?.id } });
  }, [currentUser]);

  const broadcastShapeEdit = useCallback((page: number, shapes: unknown[]) => {
    channelRef.current?.send({ type: 'broadcast', event: 'shape-edit', payload: { page, shapes, userId: currentUser?.id } });
  }, [currentUser]);

  const broadcastChatMsg = useCallback((msg: ChatMsg) => {
    channelRef.current?.send({ type: 'broadcast', event: 'chat-msg', payload: { msg } });
  }, []);

  const broadcastFontChange = useCallback((font: string, size: number) => {
    channelRef.current?.send({ type: 'broadcast', event: 'font-change', payload: { font, size, userId: currentUser?.id } });
  }, [currentUser]);

  const updatePresence = useCallback((cursor: CursorPos, action: string) => {
    if (!currentUser) return;
    channelRef.current?.track({
      id: currentUser.id,
      displayName: currentUser.displayName,
      initials: currentUser.initials,
      color: currentUser.color,
      cursor,
      action,
    });
  }, [currentUser]);

  return { onlineUsers, broadcastTextEdit, broadcastShapeEdit, broadcastChatMsg, broadcastFontChange, updatePresence };
}
