'use client';
import { useState, useRef, DragEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn, formatBytes, MAX_FILE_SIZE } from '@/lib/utils';
import Button from '@/components/ui/Button';
import type { Experiment } from '@/types';
import toast from 'react-hot-toast';

const ALLOWED = ['pdf','png','jpg','jpeg','csv'];

export default function FileUpload({ experiments, onUploaded }: { experiments:Experiment[]; onUploaded:()=>void }) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File|null>(null);
  const [dragging, setDragging] = useState(false);
  const [expId, setExpId] = useState('');
  const [vis, setVis] = useState('department');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  function validate(f: File): string {
    const ext = f.name.split('.').pop()?.toLowerCase()??'';
    if(!ALLOWED.includes(ext)) return 'Only PDF, PNG, JPG, CSV files allowed.';
    if(f.size>MAX_FILE_SIZE) return `Max size is ${formatBytes(MAX_FILE_SIZE)}.`;
    return '';
  }

  function pick(f: File) { const e=validate(f); setError(e); if(!e) setFile(f); }
  function onDrop(e: DragEvent) { e.preventDefault(); setDragging(false); if(e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]); }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault(); if(!file) return; setUploading(true); setProgress(10);
    const { data:{ user } } = await supabase.auth.getUser();
    if(!user){ toast.error('Not authenticated'); setUploading(false); return; }
    const path = `uploads/${user.id}/${Date.now()}_${file.name}`;
    const { error:upErr } = await supabase.storage.from('lab-files').upload(path, file);
    if(upErr){ toast.error('Upload failed.'); setUploading(false); setProgress(0); return; }
    setProgress(70);
    const res = await fetch('/api/files', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:file.name, storage_path:path, file_type:file.type, file_size_bytes:file.size, experiment_id:expId||null, visibility:vis }) });
    setProgress(100);
    if(res.ok){ toast.success('File uploaded'); setFile(null); setProgress(0); onUploaded(); }
    else { const d = await res.json() as {error:string}; toast.error(d.error??'Failed to save file'); }
    setUploading(false);
  }

  return (
    <form onSubmit={handleUpload} className="space-y-4">
      <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={onDrop} onClick={()=>inputRef.current?.click()}
        className={cn('flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed p-8 text-center transition-colors', dragging?'border-brand-400 bg-brand-50':'border-surface-border hover:border-brand-300')}>
        <span className="mb-2 text-3xl">📂</span>
        {file ? <p className="font-medium text-brand-600">{file.name} ({formatBytes(file.size)})</p>
               : <><p className="font-medium text-slate-700">Drop file here or click to browse</p><p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG, CSV — max 10 MB</p></>}
        <input ref={inputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.csv" onChange={e=>{ if(e.target.files?.[0]) pick(e.target.files[0]); }}/>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Experiment</label>
        <select value={expId} onChange={e=>setExpId(e.target.value)} className="h-9 w-full rounded-lg border border-surface-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">— None —</option>
          {experiments.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Visibility</label>
        <select value={vis} onChange={e=>setVis(e.target.value)} className="h-9 w-full rounded-lg border border-surface-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="private">Private (only me)</option>
          <option value="department">Department</option>
          <option value="public">Public</option>
        </select>
      </div>
      {uploading && <div className="rounded-full bg-surface-border h-2 overflow-hidden"><div className="h-full bg-brand-500 transition-all duration-500" style={{width:`${progress}%`}}/></div>}
      <Button type="submit" loading={uploading} disabled={!file} className="w-full">Upload File</Button>
    </form>
  );
}
