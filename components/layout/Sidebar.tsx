'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Department, Subject, Experiment } from '@/types';

type TreeDept = Department & { subjects: (Subject & { experiments: Experiment[] })[] };
interface Props { departments: TreeDept[]; userName: string; userEmail: string|null; }

const NAV = [{ href:'/dashboard', label:'Dashboard', icon:'🏠' }, { href:'/records', label:'My Records', icon:'📝' }, { href:'/repository', label:'Repository', icon:'📁' }, { href:'/search', label:'Search', icon:'🔍' }];

export default function Sidebar({ departments, userName, userEmail }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [openD, setOpenD] = useState(new Set<string>());
  const [openS, setOpenS] = useState(new Set<string>());

  function tog(s: Set<string>, id: string) { const n=new Set(s); if(n.has(id)) n.delete(id); else n.add(id); return n; }

  async function signOut() { await supabase.auth.signOut(); router.push('/login'); router.refresh(); }

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col border-r border-surface-border bg-white">
      <div className="flex h-14 items-center px-4 border-b border-surface-border">
        <span className="text-lg font-bold text-brand-600">LabRecord</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {NAV.map(l => (
            <li key={l.href}>
              <Link href={l.href} className={cn('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors', (pathname===l.href||pathname.startsWith(l.href+'/')) ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-surface-muted')}>
                <span>{l.icon}</span>{l.label}
              </Link>
            </li>
          ))}
        </ul>
        {departments.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Departments</p>
            {departments.map(d => (
              <div key={d.id}>
                <button onClick={()=>setOpenD(tog(openD,d.id))} className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-surface-muted">
                  <span className={cn('text-xs transition-transform',openD.has(d.id)&&'rotate-90')}>▶</span>{d.name}
                </button>
                {openD.has(d.id) && d.subjects.map(s => (
                  <div key={s.id} className="ml-3">
                    <button onClick={()=>setOpenS(tog(openS,s.id))} className="flex w-full items-center gap-2 rounded-lg px-3 py-1 text-xs text-slate-500 hover:bg-surface-muted">
                      <span className={cn('transition-transform',openS.has(s.id)&&'rotate-90')}>▶</span>{s.name}
                    </button>
                    {openS.has(s.id) && s.experiments.map(e => (
                      <Link key={e.id} href={`/repository/${e.id}`} className="ml-5 block truncate rounded px-2 py-0.5 text-xs text-slate-400 hover:text-brand-600">{e.title}</Link>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </nav>
      <div className="border-t border-surface-border p-3">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{userName.charAt(0).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{userName}</p>
            <p className="truncate text-xs text-slate-400">{userEmail}</p>
          </div>
          <button onClick={signOut} title="Sign out" className="text-slate-400 hover:text-slate-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
