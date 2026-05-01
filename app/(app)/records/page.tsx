'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import type { LabRecord } from '@/types';

export default function RecordsPage() {
  const supabase = createClient();
  const [records, setRecords] = useState<LabRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('records').select('*').order('last_edited_at',{ascending:false})
      .then(({data})=>{ setRecords(data??[]); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Records</h1>
        <Link href="/records/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">+ New Record</Link>
      </div>
      {loading ? <div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="h-16 animate-pulse rounded-card bg-white border border-surface-border"/>)}</div>
      : records.length===0 ? (
        <div className="flex flex-col items-center py-20 text-center rounded-card border-2 border-dashed border-surface-border bg-white">
          <p className="mb-4 text-slate-500">No records yet.</p>
          <Link href="/records/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Create Record</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(r=>(
            <Link key={r.id} href={`/records/${r.id}`} className="flex items-center justify-between rounded-card border border-surface-border bg-white p-4 hover:border-brand-300 hover:shadow-sm transition-all">
              <div><p className="font-medium text-slate-900">{r.title}</p><p className="text-xs text-slate-400 mt-0.5">Last edited {formatDate(r.last_edited_at)}</p></div>
              <Badge variant={r.status==='complete'?'success':'default'}>{r.status}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
