'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { ChatMsg } from './useRealtimeCollab';

interface Shape {
  id: string;
  type: string;
  x1: number; y1: number; x2: number; y2: number;
  strokeWidth: number;
  color: string;
}

interface ProjectData {
  projectId: string | null;
  pageTexts: Record<number, string>;
  pageShapes: Record<number, Shape[]>;
  totalPages: number;
  chatMessages: ChatMsg[];
  loading: boolean;
}

interface ProjectActions {
  savePage: (page: number, text: string, shapes: Shape[]) => void;
  saveChat: (msg: ChatMsg) => void;
  setPageTexts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setPageShapes: React.Dispatch<React.SetStateAction<Record<number, Shape[]>>>;
  setTotalPages: React.Dispatch<React.SetStateAction<number>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>>;
}

const LS_PREFIX = 'labmate_v1';

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}_${key}`);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(`${LS_PREFIX}_${key}`, JSON.stringify(value));
  } catch {}
}

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useProjectData(_userId: string | null, _displayName: string | null): ProjectData & ProjectActions {
  const [projectId,    setProjectId]    = useState<string | null>(null);
  const [pageTexts,    setPageTexts]    = useState<Record<number, string>>({});
  const [pageShapes,   setPageShapes]   = useState<Record<number, Shape[]>>({});
  const [totalPages,   setTotalPages]   = useState(4);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [loading,      setLoading]      = useState(true);

  /* ── Load from localStorage on mount, using ?room= for shared sessions ── */
  useEffect(() => {
    // Derive room ID: ?room=XYZ in the URL → shared session; otherwise per-browser session
    const params = new URLSearchParams(window.location.search);
    let pid = params.get('room') ?? '';
    if (!pid) {
      pid = lsGet<string>('project_id', '') || genId();
      // Write the room ID into the URL so it's easy to share
      const url = new URL(window.location.href);
      url.searchParams.set('room', pid);
      window.history.replaceState(null, '', url.toString());
    }

    const roomKey = `room_${pid}`;
    const texts  = lsGet<Record<number, string>>(`${roomKey}_page_texts`, {});
    const shapes = lsGet<Record<number, Shape[]>>(`${roomKey}_page_shapes`, {});
    const total  = lsGet<number>(`${roomKey}_total_pages`, 4);
    const msgs   = lsGet<ChatMsg[]>(`${roomKey}_chat_messages`, []);

    lsSet('project_id', pid);
    setProjectId(pid);
    setPageTexts(texts);
    setPageShapes(shapes);
    setTotalPages(total);
    setChatMessages(msgs);
    setLoading(false);
  }, []);

  /* ── Persist totalPages whenever it changes ── */
  useEffect(() => {
    if (!loading && projectId) lsSet(`room_${projectId}_total_pages`, totalPages);
  }, [totalPages, loading, projectId]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Debounced page save ── */
  const savePage = useCallback((page: number, text: string, shapes: Shape[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const pid = lsGet<string>('project_id', '');
      if (!pid) return;
      const key = `room_${pid}`;
      const texts     = lsGet<Record<number, string>>(`${key}_page_texts`, {});
      const allShapes = lsGet<Record<number, Shape[]>>(`${key}_page_shapes`, {});
      texts[page]     = text;
      allShapes[page] = shapes;
      lsSet(`${key}_page_texts`, texts);
      lsSet(`${key}_page_shapes`, allShapes);
    }, 1000);
  }, []);

  /* ── Save a chat message ── */
  const saveChat = useCallback((msg: ChatMsg) => {
    const pid = lsGet<string>('project_id', '');
    if (!pid) return;
    const msgs = lsGet<ChatMsg[]>(`room_${pid}_chat_messages`, []);
    msgs.push(msg);
    if (msgs.length > 200) msgs.splice(0, msgs.length - 200);
    lsSet(`room_${pid}_chat_messages`, msgs);
  }, []);

  return {
    projectId,
    pageTexts,
    pageShapes,
    totalPages,
    chatMessages,
    loading,
    savePage,
    saveChat,
    setPageTexts,
    setPageShapes,
    setTotalPages,
    setChatMessages,
  };
}
