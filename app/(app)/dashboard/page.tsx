'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import type { LabRecord } from '@/types';

export default function DashboardPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<LabRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('records').select('*').order('last_edited_at',{ascending:false}).limit(8)
      .then(({data})=>{ setRecords(data??[]); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/records/new" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">+ New Record</Link>
          <Link href="/repository" className="inline-flex items-center gap-2 rounded-lg border border-surface-border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-surface-muted">Upload File</Link>
        </div>
      </div>
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">Recent Records</h2>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[...Array(3)].map((_,i)=><div key={i} className="h-24 animate-pulse rounded-card bg-white border border-surface-border"/>)}</div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card border-2 border-dashed border-surface-border bg-white py-16 text-center">
            <svg className="mb-3 h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <p className="mb-1 font-medium text-slate-600">No records yet</p>
            <p className="mb-4 text-sm text-slate-400">Create your first lab record to get started</p>
            <Link href="/records/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Create Record</Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {records.map(r=>(
              <Link key={r.id} href={`/records/${r.id}`} className="group rounded-card border border-surface-border bg-white p-4 hover:border-brand-300 hover:shadow-sm transition-all">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-medium text-slate-900 group-hover:text-brand-700 line-clamp-2">{r.title}</h3>
                  <Badge variant={r.status==='complete'?'success':'default'}>{r.status}</Badge>
                </div>
                <p className="text-xs text-slate-400">Edited {formatDate(r.last_edited_at)}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
