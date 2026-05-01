'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('Invalid email or password.');
    else { router.push('/dashboard'); router.refresh(); }
    setLoading(false);
  }

  async function handleGoogle() {
    setGLoading(true);
    await supabase.auth.signInWithOAuth({ provider:'google', options:{ redirectTo:`${location.origin}/auth/callback` } });
  }

  return (
    <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <div className="mb-2 text-3xl font-bold text-brand-600">LabRecord</div>
        <p className="text-sm text-slate-500">Your lab records, organized.</p>
      </div>
      <Button variant="secondary" className="mb-4 w-full" loading={gLoading} onClick={handleGoogle}>
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </Button>
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-border"/></div>
        <div className="relative flex justify-center"><span className="bg-white px-2 text-xs text-slate-400">or</span></div>
      </div>
      <form onSubmit={handleEmail} className="flex flex-col gap-3">
        <Input label="Email" type="email" placeholder="you@college.edu" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} required error={error}/>
        <Button type="submit" loading={loading} className="w-full">Sign in</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">No account? <a href="/register" className="text-brand-600 hover:underline">Register</a></p>
    </div>
  );
}
