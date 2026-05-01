'use client';
import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import type { LabRecord, FileItem } from '@/types';

type Results = { records:LabRecord[]; files:(FileItem&{created_at:string})[] };

export default function SearchPage() {
  const sp = useSearchParams(); const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(sp.get('q')??'');
  const [filter, setFilter] = useState<'all'|'records'|'files'>('all');
  const [results, setResults] = useState<Results>({records:[],files:[]});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  useEffect(()=>{ inputRef.current?.focus(); },[]);
  useEffect(()=>{ const v=sp.get('q'); if(v){setQ(v);doSearch(v);} },[sp]); // eslint-disable-line react-hooks/exhaustive-deps

  function doSearch(v: string) {
    if(!v.trim()) return; setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(v.trim())}`).then(r=>r.json() as Promise<Results>)
      .then(d=>{setResults(d);setSearched(true);}).finally(()=>setLoading(false));
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v=e.target.value; setQ(v);
    if(debRef.current) clearTimeout(debRef.current);
    debRef.current=setTimeout(()=>router.replace(`/search?q=${encodeURIComponent(v)}`),300);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input ref={inputRef} value={q} onChange={handleInput} placeholder="Search records, files…" className="h-11 w-full rounded-lg border border-surface-border pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"/>
        </div>
        <div className="mt-3 flex gap-2">
          {(['all','records','files'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${filter===f?'bg-brand-600 text-white':'bg-white border border-surface-border text-slate-600 hover:bg-surface-muted'}`}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {loading && <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600"/></div>}
      {!loading&&searched&&results.records.length===0&&results.files.length===0&&(
        <div className="flex flex-col items-center py-16 text-center"><span className="mb-3 text-4xl">🔍</span><p className="font-medium text-slate-600">No results for &quot;{q}&quot;</p></div>
      )}
      {!loading&&(filter==='all'||filter==='records')&&results.records.length>0&&(
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Records ({results.records.length})</h2>
          <div className="space-y-2">
            {results.records.map(r=>(
              <Link key={r.id} href={`/records/${r.id}`} className="flex items-center justify-between rounded-card border border-surface-border bg-white p-4 hover:border-brand-300 transition-all">
                <div><p className="font-medium">{r.title}</p><p className="text-xs text-slate-400 mt-0.5">Edited {formatDate(r.last_edited_at)}</p></div>
                <Badge variant={r.status==='complete'?'success':'default'}>{r.status}</Badge>
              </Link>
            ))}
          </div>
        </section>
      )}
      {!loading&&(filter==='all'||filter==='files')&&results.files.length>0&&(
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Files ({results.files.length})</h2>
          <div className="space-y-2">
            {results.files.map(f=>(
              <div key={f.id} className="flex items-center gap-3 rounded-card border border-surface-border bg-white p-4">
                <span className="text-xl">{f.file_type==='pdf'?'📄':f.file_type==='csv'?'📊':'🖼️'}</span>
                <div className="flex-1 min-w-0"><p className="font-medium truncate">{f.name}</p><p className="text-xs text-slate-400">{formatDate(f.created_at)}</p></div>
                <Badge variant="default">{f.file_type.toUpperCase()}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
