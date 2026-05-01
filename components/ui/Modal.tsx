'use client';
import { useEffect, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export default function Modal({ open, onClose, title, children, className }: { open:boolean; onClose:()=>void; title:string; children:ReactNode; className?:string }) {
  useEffect(() => {
    const h = (e:KeyboardEvent) => { if(e.key==='Escape') onClose(); };
    if(open) document.addEventListener('keydown',h);
    return () => document.removeEventListener('keydown',h);
  }, [open, onClose]);
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}/>
      <div className={cn('relative z-10 w-full max-w-lg rounded-card bg-white p-6 shadow-xl', className)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:text-slate-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
