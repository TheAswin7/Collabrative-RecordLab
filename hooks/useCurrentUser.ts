'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface CurrentUser {
  id: string;
  email: string;
  displayName: string;
  initials: string;
  color: string;
}

const USER_COLORS = [
  '#ec4899', '#22c55e', '#f97316', '#ef4444',
  '#8b5cf6', '#06b6d4', '#d97706', '#4f46e5',
  '#10b981', '#f43f5e', '#0ea5e9', '#a855f7',
];

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

/* Persist an anonymous display name so it survives page refreshes */
function getOrCreateDisplayName(): string {
  const key = 'labmate_display_name';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const adjectives = ['Swift', 'Bright', 'Clever', 'Bold', 'Calm', 'Sharp', 'Keen', 'Wise'];
  const nouns      = ['Falcon', 'Tiger', 'Panda', 'Eagle', 'Wolf', 'Bear', 'Fox', 'Owl'];
  const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
  localStorage.setItem(key, name);
  return name;
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function resolve() {
      /* 1. Check for an existing session first */
      const { data: { user: existing } } = await supabase.auth.getUser();

      if (existing) {
        buildAndSet(existing);
        return;
      }

      /* 2. No session → sign in anonymously so anyone with the link can collab */
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('Anonymous sign-in failed:', error.message);
        return;
      }
      if (data.user) buildAndSet(data.user);
    }

    function buildAndSet(u: { id: string; email?: string; user_metadata?: Record<string, string> }) {
      const meta        = u.user_metadata ?? {};
      const email       = u.email ?? '';
      /* Named users keep their real name; anonymous users get a fun random name */
      const displayName = meta.full_name || meta.name || getOrCreateDisplayName();
      const initials    = getInitials(displayName);
      const color       = USER_COLORS[hashCode(u.id) % USER_COLORS.length];
      setUser({ id: u.id, email, displayName, initials, color });
    }

    resolve();
  }, []);

  return user;
}
