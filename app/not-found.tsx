import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center p-6">
      <p className="text-6xl font-bold text-brand-300 mb-4">404</p>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h1>
      <p className="text-slate-500 mb-6">The page you are looking for does not exist.</p>
      <Link href="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Go to Dashboard</Link>
    </div>
  );
}
