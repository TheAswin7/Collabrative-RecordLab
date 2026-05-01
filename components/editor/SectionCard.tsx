'use client';
import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { cn } from '@/lib/utils';
import type { SectionMeta } from '@/types';

interface Props { section:SectionMeta; sectionId:string; recordId:string; initialContent:object; onSaveStatusChange:(s:'idle'|'saving'|'saved'|'error')=>void; onContentChange:(t:string,has:boolean)=>void; }

function hasContent(json: object) { return JSON.stringify(json).length > 50; }

export default function SectionCard({ section, sectionId, recordId, initialContent, onSaveStatusChange, onContentChange }: Props) {
  const [open, setOpen] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>|null>(null);

  const save = useCallback(async (content: object) => {
    onSaveStatusChange('saving');
    try {
      const res = await fetch(`/api/records/${recordId}/sections/${sectionId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({content_json:content}) });
      onSaveStatusChange(res.ok?'saved':'error');
      if(res.ok) setTimeout(()=>onSaveStatusChange('idle'),2000);
    } catch { onSaveStatusChange('error'); }
  }, [recordId, sectionId, onSaveStatusChange]);

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({placeholder:section.hint}), Image, Table.configure({resizable:true}), TableRow, TableHeader, TableCell],
    content: Object.keys(initialContent).length>0 ? initialContent as never : undefined,
    onUpdate: ({editor}) => {
      const json = editor.getJSON();
      onContentChange(section.type, hasContent(json));
      if(timer) clearTimeout(timer);
      setTimer(setTimeout(()=>save(json), 1500));
    },
    editorProps: { attributes:{ class:'prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2' } },
  });

  const filled = hasContent(initialContent);

  return (
    <div className={cn('rounded-card border bg-white transition-all', open?'border-brand-300 shadow-sm':'border-surface-border')}>
      <button onClick={()=>setOpen(o=>!o)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="text-lg">{section.icon}</span>
        <span className="flex-1 font-medium text-slate-900">{section.label}</span>
        <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', filled?'bg-green-500':'bg-slate-200')}/>
        <svg className={cn('h-4 w-4 text-slate-400 transition-transform',open&&'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
      </button>
      {open && (
        <div className="border-t border-surface-border">
          <Toolbar editor={editor}/>
          <EditorContent editor={editor}/>
          {!filled && <p className="px-3 pb-3 text-xs text-slate-400 flex items-center gap-1">ℹ️ {section.hint}</p>}
        </div>
      )}
    </div>
  );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if(!editor) return null;
  const btn = (active:boolean, fn:()=>void, label:string, icon:string) => (
    <button type="button" onClick={fn} title={label} className={cn('rounded p-1.5 text-sm transition-colors',active?'bg-brand-100 text-brand-700':'text-slate-500 hover:bg-surface-muted')}>{icon}</button>
  );
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-surface-border px-2 py-1">
      {btn(editor.isActive('bold'), ()=>editor.chain().focus().toggleBold().run(), 'Bold', 'B')}
      {btn(editor.isActive('italic'), ()=>editor.chain().focus().toggleItalic().run(), 'Italic', 'I')}
      {btn(editor.isActive('bulletList'), ()=>editor.chain().focus().toggleBulletList().run(), 'Bullet list', '•')}
      {btn(editor.isActive('orderedList'), ()=>editor.chain().focus().toggleOrderedList().run(), 'Numbered list', '1.')}
      <button type="button" onClick={()=>editor.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:true}).run()} className="rounded px-1.5 py-1 text-xs text-slate-500 hover:bg-surface-muted">⊞ Table</button>
    </div>
  );
}
