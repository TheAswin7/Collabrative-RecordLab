'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatBytes, formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import type { FileItem } from '@/types';
import toast from 'react-hot-toast';

const ICONS: Record<string,string> = { pdf:'📄', image:'🖼️', csv:'📊' };
const COLORS: Record<string,'danger'|'info'|'success'> = { pdf:'danger', image:'info', csv:'success' };

export default function FileCard({ file }: { file: FileItem & { file_size_bytes?:number|null; created_at?:string } }) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    const { data, error } = await supabase.storage.from('lab-files').createSignedUrl(file.storage_path, 60);
    if(error||!data) toast.error('Failed to generate download link');
    else window.open(data.signedUrl,'_blank');
    setLoading(false);
  }

  return (
    <div className="rounded-card border border-surface-border bg-white p-4 hover:border-brand-300 hover:shadow-sm transition-all">
      <div className="mb-3 flex items-start gap-3">
        <span className="text-2xl">{ICONS[file.file_type]??'📎'}</span>
        <div className="min-w-0 flex-1"><p className="font-medium truncate" title={file.name}>{file.name}</p></div>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <Badge variant={COLORS[file.file_type]??'default'}>{file.file_type.toUpperCase()}</Badge>
        <Badge variant={file.visibility==='public'?'success':file.visibility==='department'?'info':'default'}>{file.visibility}</Badge>
        {file.file_size_bytes && <span className="text-xs text-slate-400">{formatBytes(file.file_size_bytes)}</span>}
      </div>
      {file.created_at && <p className="text-xs text-slate-400 mb-3">{formatDate(file.created_at)}</p>}
      <button onClick={download} disabled={loading} className="w-full rounded-lg border border-surface-border py-1.5 text-sm font-medium text-slate-700 hover:bg-surface-muted disabled:opacity-50 transition-colors">
        {loading?'Generating link…':'⬇ Download'}
      </button>
    </div>
  );
}
