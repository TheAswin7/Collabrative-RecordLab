'use client';
import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface Props extends InputHTMLAttributes<HTMLInputElement> { label?:string; error?:string; }

const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className, ...p }, ref) => (
  <div className="flex flex-col gap-1">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <input ref={ref} className={cn('h-9 w-full rounded-lg border border-surface-border bg-white px-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500', error&&'border-red-400', className)} {...p} />
    {error && <p className="text-xs text-red-600">{error}</p>}
  </div>
));
Input.displayName = 'Input';
export default Input;
