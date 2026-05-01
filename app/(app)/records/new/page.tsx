
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SECTION_DEFINITIONS } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import type { Experiment } from '@/types';

export default function NewRecordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [expId, setExpId] = useState('');
  const [exps, setExps] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('experiments').select('*').order('title').then(({data})=>setExps(data??[]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); if(!title.trim()) return; setLoading(true);
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user){ router.push('/login'); return; }
    const { data:rec, error } = await supabase.from('records').insert({ title:title.trim(), experiment_id:expId||null, created_by:user.id, status:'draft', last_edited_at:new Date().toISOString() }).select().single();
    if(error||!rec){ toast.error('Failed to create record.'); setLoading(false); return; }
    await supabase.from('record_sections').insert(SECTION_DEFINITIONS.map((d,i)=>({ record_id:rec.id, section_type:d.type, content_json:{}, order_number:i })));
    router.push(`/records/${rec.id}`);
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">New Record</h1>
      <form onSubmit={handleSubmit} className="rounded-card border border-surface-border bg-white p-6 space-y-4">
        <Input label="Record title" placeholder="e.g. Stack Implementation — Experiment 1" value={title} onChange={e=>setTitle(e.target.value)} required/>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Experiment (optional)</label>
          <select value={expId} onChange={e=>setExpId(e.target.value)} className="h-9 w-full rounded-lg border border-surface-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
            <option value="">— Select experiment —</option>
            {exps.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={()=>router.back()}>Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1">Create Record</Button>
        </div>
      </form>
    </div>
  );
}
