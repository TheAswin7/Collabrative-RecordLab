'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [form, setForm] = useState({ name:'', email:'', password:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    const { error } = await supabase.auth.signUp({ email:form.email, password:form.password, options:{ data:{ full_name:form.name } } });
    if (error) setError(error.message);
    else { router.push('/dashboard'); router.refresh(); }
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-lg">
      <div className="mb-6 text-center">
        <div className="mb-2 text-3xl font-bold text-brand-600">LabRecord</div>
        <p className="text-sm text-slate-500">Create your account</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input label="Full name" placeholder="Alex Kumar" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/>
        <Input label="College email" type="email" placeholder="you@college.edu" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/>
        <Input label="Password" type="password" placeholder="Min 6 characters" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required minLength={6} error={error}/>
        <Button type="submit" loading={loading} className="w-full">Create account</Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">Have an account? <a href="/login" className="text-brand-600 hover:underline">Sign in</a></p>
    </div>
  );
}
