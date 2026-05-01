'use client';
import Link from 'next/link';
export default function GlobalError({ reset }: { error:Error; reset:()=>void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-6">
      <p className="text-6xl mb-4">⚠️</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
      <div className="flex gap-3 mt-4">
        <button onClick={reset} className="rounded-lg border border-surface-border bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-surface-muted">Try again</button>
        <Link href="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Go to Dashboard</Link>
      </div>
    </div>
  );
}
