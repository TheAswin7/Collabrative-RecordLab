'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { const s = localStorage.getItem('lr_searches'); if(s) setRecent(JSON.parse(s)); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();setOpen(true);setTimeout(()=>ref.current?.focus(),50);} if(e.key==='Escape')setOpen(false); };
    document.addEventListener('keydown',h); return ()=>document.removeEventListener('keydown',h);
  }, []);

  function search(q: string) {
    if(!q.trim()) return;
    const n=[q,...recent.filter(r=>r!==q)].slice(0,5);
    localStorage.setItem('lr_searches',JSON.stringify(n)); setRecent(n);
    setOpen(false); setQuery(''); router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-surface-border bg-white px-4">
      <button className="lg:hidden p-1 text-slate-500" onClick={onMenuClick}>
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <div className="relative flex-1 max-w-md">
        <button onClick={()=>{setOpen(true);setTimeout(()=>ref.current?.focus(),50);}} className="flex w-full items-center gap-2 rounded-lg border border-surface-border bg-surface-muted px-3 py-2 text-sm text-slate-400 hover:border-brand-300">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          Search records, files…
          <kbd className="ml-auto rounded bg-white px-1.5 py-0.5 text-xs border border-surface-border">⌘K</kbd>
        </button>
        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-card border border-surface-border bg-white shadow-lg">
            <form onSubmit={e=>{e.preventDefault();search(query);}} className="p-2">
              <input ref={ref} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search…" className="w-full rounded-lg border border-surface-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"/>
            </form>
            {recent.length>0&&<div className="border-t border-surface-border px-2 pb-2">
              <p className="px-2 py-1 text-xs text-slate-400">Recent</p>
              {recent.map(r=><button key={r} onClick={()=>search(r)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-surface-muted">🕐 {r}</button>)}
            </div>}
          </div>
        )}
      </div>
    </header>
  );
}
