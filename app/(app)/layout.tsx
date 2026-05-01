'use client';
import { useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { cn } from '@/lib/utils';
import { Toaster } from 'react-hot-toast';
import type { Department, Subject, Experiment } from '@/types';

type TreeDept = Department & { subjects: (Subject & { experiments: Experiment[] })[] };

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('User');
  const [email, setEmail] = useState<string|null>(null);
  const [depts, setDepts] = useState<TreeDept[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function load() {
      const { data:{ user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data:profile } = await supabase.from('profiles').select('name,college_email').eq('id',user.id).single();
      setName(profile?.name ?? user.email?.split('@')[0] ?? 'User');
      setEmail(profile?.college_email ?? user.email ?? null);
      const [{ data:d }, { data:s }, { data:e }] = await Promise.all([
        supabase.from('departments').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('experiments').select('*'),
      ]);
      setDepts((d??[]).map(dept=>({ ...dept, subjects:(s??[]).filter(sub=>sub.department_id===dept.id).map(sub=>({ ...sub, experiments:(e??[]).filter(exp=>exp.subject_id===sub.id) })) })));
      setReady(true);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"/>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={()=>setOpen(false)}/>}
      <div className={cn('fixed inset-y-0 left-0 z-40 transition-transform lg:relative lg:translate-x-0', open?'translate-x-0':'-translate-x-full')}>
        <Sidebar departments={depts} userName={name} userEmail={email}/>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={()=>setOpen(o=>!o)}/>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <Toaster position="bottom-right" toastOptions={{ duration:3000 }}/>
    </div>
  );
}
