import { cn } from '@/lib/utils';
type V = 'default'|'success'|'warning'|'danger'|'info';
const V = { default:'bg-slate-100 text-slate-700', success:'bg-green-100 text-green-700', warning:'bg-yellow-100 text-yellow-700', danger:'bg-red-100 text-red-700', info:'bg-blue-100 text-blue-700' };
export default function Badge({ children, variant='default', className }: { children:React.ReactNode; variant?:V; className?:string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', V[variant], className)}>{children}</span>;
}
