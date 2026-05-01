'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SectionCard from './SectionCard';
import { SECTION_DEFINITIONS } from '@/types';
import type { LabRecord, RecordSection } from '@/types';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Props { record: LabRecord; sections: RecordSection[]; }

export default function RecordEditor({ record, sections }: Props) {
  const router = useRouter();
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle');
  const [filled, setFilled] = useState<Record<string,boolean>>(() => Object.fromEntries(sections.map(s=>[s.section_type, JSON.stringify(s.content_json).length>50])));
  const [exporting, setExporting] = useState(false);

  const onContentChange = useCallback((type: string, has: boolean) => setFilled(p=>({...p,[type]:has})), []);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/records/${record.id}/export`, {method:'POST'});
      if(!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`${record.title.replace(/[^a-z0-9]/gi,'_')}.pdf`; a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF exported');
    } catch { toast.error('Export failed, please try again'); }
    setExporting(false);
  }

  const filledCount = Object.values(filled).filter(Boolean).length;
  const total = SECTION_DEFINITIONS.length;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{record.title}</h1>
              <span className={`text-xs mt-0.5 block ${saveStatus==='saving'?'text-slate-400':saveStatus==='saved'?'text-green-600':saveStatus==='error'?'text-red-500':'invisible'}`}>
                {saveStatus==='saving'?'Saving…':saveStatus==='saved'?'Saved':'Save failed'}
              </span>
            </div>
            <Button onClick={handleExport} loading={exporting} variant="secondary" size="sm">📄 Export PDF</Button>
          </div>
          <div className="space-y-3">
            {SECTION_DEFINITIONS.map(def => {
              const sec = sections.find(s=>s.section_type===def.type);
              if(!sec) return null;
              return <SectionCard key={sec.id} section={def} sectionId={sec.id} recordId={record.id} initialContent={sec.content_json} onSaveStatusChange={setSaveStatus} onContentChange={onContentChange}/>;
            })}
          </div>
        </div>
      </div>
      <aside className="hidden lg:block w-64 flex-shrink-0 border-l border-surface-border bg-white overflow-y-auto p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Progress</p>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex-1 rounded-full bg-surface-border h-2 overflow-hidden">
            <div className="h-full bg-brand-500 transition-all" style={{width:`${(filledCount/total)*100}%`}}/>
          </div>
          <span className="text-xs font-medium text-slate-600">{filledCount}/{total}</span>
        </div>
        <ul className="space-y-1.5">
          {SECTION_DEFINITIONS.map(def=>(
            <li key={def.type} className="flex items-center gap-2">
              <span className={`h-4 w-4 flex-shrink-0 rounded-full flex items-center justify-center text-xs ${filled[def.type]?'bg-green-500 text-white':'bg-slate-100'}`}>{filled[def.type]?'✓':''}</span>
              <span className="text-sm text-slate-600">{def.icon} {def.label}</span>
            </li>
          ))}
        </ul>
        <button onClick={()=>router.push('/records')} className="mt-6 text-xs text-slate-400 hover:text-brand-600">← All records</button>
      </aside>
    </div>
  );
}
