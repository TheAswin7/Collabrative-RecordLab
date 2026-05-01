'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import FileCard from '@/components/repository/FileCard';
import FileUpload from '@/components/repository/FileUpload';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { FileItem, Experiment } from '@/types';

type FileMeta = FileItem & { file_size_bytes:number|null; created_at:string };

export default function RepositoryPage() {
  const supabase = createClient();
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [exps, setExps] = useState<Experiment[]>([]);
  const [sel, setSel] = useState('all');
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const loadFiles = useCallback(async () => {
    const url = sel==='all'?'/api/files':`/api/files?experiment_id=${sel}`;
    const res = await fetch(url);
    if(res.ok) setFiles(await res.json() as FileMeta[]);
    setLoading(false);
  }, [sel]);

  useEffect(() => { supabase.from('experiments').select('*').then(({data})=>setExps(data??[])); }, []);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadFiles(); }, [loadFiles]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Repository</h1>
        <Button onClick={()=>setUploadOpen(true)}>+ Upload File</Button>
      </div>
      <div className="flex gap-6">
        <aside className="hidden md:block w-52 flex-shrink-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Filter</p>
          <ul className="space-y-0.5">
            <li><button onClick={()=>setSel('all')} className={`w-full rounded-lg px-3 py-2 text-left text-sm ${sel==='all'?'bg-brand-50 text-brand-700 font-medium':'text-slate-600 hover:bg-surface-muted'}`}>All files</button></li>
            {exps.map(e=><li key={e.id}><button onClick={()=>setSel(e.id)} className={`w-full rounded-lg px-3 py-2 text-left text-sm truncate ${sel===e.id?'bg-brand-50 text-brand-700 font-medium':'text-slate-600 hover:bg-surface-muted'}`}>{e.title}</button></li>)}
          </ul>
        </aside>
        <div className="flex-1">
          {loading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[...Array(4)].map((_,i)=><div key={i} className="h-36 animate-pulse rounded-card bg-white border border-surface-border"/>)}</div>
          : files.length===0 ? (
            <div className="flex flex-col items-center justify-center rounded-card border-2 border-dashed border-surface-border bg-white py-16 text-center">
              <span className="mb-3 text-4xl">📂</span>
              <p className="font-medium text-slate-600 mb-4">No files yet</p>
              <Button onClick={()=>setUploadOpen(true)}>Upload File</Button>
            </div>
          ) : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{files.map(f=><FileCard key={f.id} file={f}/>)}</div>}
        </div>
      </div>
      <Modal open={uploadOpen} onClose={()=>setUploadOpen(false)} title="Upload File">
        <FileUpload experiments={exps} onUploaded={()=>{ setUploadOpen(false); loadFiles(); }}/>
      </Modal>
    </div>
  );
}
