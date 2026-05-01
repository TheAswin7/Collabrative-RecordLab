'use client';
import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { variant?:'primary'|'secondary'|'ghost'|'danger'; size?:'sm'|'md'|'lg'; loading?:boolean; }

const V = { primary:'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300', secondary:'bg-white text-slate-700 border border-surface-border hover:bg-surface-muted', ghost:'text-slate-600 hover:bg-surface-muted', danger:'bg-red-600 text-white hover:bg-red-700' };
const S = { sm:'h-8 px-3 text-sm', md:'h-9 px-4 text-sm', lg:'h-11 px-6 text-base' };

const Button = forwardRef<HTMLButtonElement, Props>(({ variant='primary', size='md', loading, className, children, disabled, ...p }, ref) => (
  <button ref={ref} disabled={disabled||loading} className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50', V[variant], S[size], className)} {...p}>
    {loading && <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
    {children}
  </button>
));
Button.displayName = 'Button';
export default Button;
