'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { checkUserExists } from '@/app/actions/check-user';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'update';

interface AuthCardProps {
  initialMode: AuthMode;
  confirmed?: boolean;
  linkExpired?: boolean;
}

const GOOGLE_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const FlaskIcon = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <path d="M15 4h10M13 4v14L6 30a4 4 0 0 0 3.43 6h21.14A4 4 0 0 0 34 30L27 18V4" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="17" cy="28" r="1.5" fill="#818cf8"/>
    <circle cx="22" cy="31" r="1" fill="#a5b4fc"/>
    <circle cx="25" cy="26" r="2" fill="#6366f1" opacity="0.6"/>
  </svg>
);

function FloatingBlob({ style }: { style: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute',
      borderRadius: '50%',
      filter: 'blur(60px)',
      opacity: 0.35,
      animation: 'float 8s ease-in-out infinite',
      ...style,
    }} />
  );
}

function Orb3D({ size, x, y, color1, color2, delay = 0 }: {
  size: number; x: string; y: string; color1: string; color2: string; delay?: number;
}) {
  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width: size, height: size,
      borderRadius: '50%',
      background: `radial-gradient(circle at 35% 35%, ${color1}, ${color2})`,
      boxShadow: 'inset -8px -8px 20px rgba(0,0,0,0.15), inset 4px 4px 12px rgba(255,255,255,0.4), 0 8px 32px rgba(0,0,0,0.12)',
      animation: `floatOrb 6s ease-in-out ${delay}s infinite`,
      opacity: 0.85,
    }} />
  );
}

function GlassCube({ x, y, size = 80, delay = 0 }: {
  x: string; y: string; size?: number; delay?: number;
}) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: size, height: size,
      background: 'rgba(255,255,255,0.18)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.45)',
      borderRadius: 16,
      boxShadow: 'inset 2px 2px 8px rgba(255,255,255,0.3), 0 8px 32px rgba(99,102,241,0.15)',
      transform: 'rotate(20deg)',
      animation: `floatOrb 7s ease-in-out ${delay}s infinite`,
    }} />
  );
}

function Torus({ x, y, delay = 0 }: { x: string; y: string; delay?: number }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: 100, height: 100,
      borderRadius: '50%',
      border: '18px solid transparent',
      background: 'linear-gradient(135deg, #818cf8, #a78bfa, #7c3aed) border-box',
      WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
      WebkitMaskComposite: 'destination-out',
      maskComposite: 'exclude',
      animation: `floatOrb 9s ease-in-out ${delay}s infinite`,
      opacity: 0.8,
    } as React.CSSProperties} />
  );
}

function MoleculeOrb({ x, y, delay = 0 }: { x: string; y: string; delay?: number }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: 120, height: 120,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.12)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.3)',
      boxShadow: '0 8px 32px rgba(99,102,241,0.1)',
      animation: `floatOrb 8s ease-in-out ${delay}s infinite`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="20" r="7" fill="#60a5fa" opacity="0.9"/>
        <circle cx="16" cy="44" r="6" fill="#60a5fa" opacity="0.9"/>
        <circle cx="48" cy="44" r="6" fill="#60a5fa" opacity="0.9"/>
        <line x1="32" y1="27" x2="16" y2="38" stroke="#93c5fd" strokeWidth="2"/>
        <line x1="32" y1="27" x2="48" y2="38" stroke="#93c5fd" strokeWidth="2"/>
        <line x1="16" y1="44" x2="48" y2="44" stroke="#93c5fd" strokeWidth="2"/>
      </svg>
    </div>
  );
}

interface InputFieldProps {
  icon: React.ReactNode;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  rightEl?: React.ReactNode;
  label?: string;
}

function InputField({ icon, type = 'text', placeholder, value, onChange, rightEl, label }: InputFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4338ca', marginBottom: 6, letterSpacing: '0.02em' }}>
          {label}
        </label>
      )}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: focused ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(8px)',
        border: `1.5px solid ${focused ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.6)'}`,
        borderRadius: 14,
        padding: '0 14px',
        transition: 'all 0.2s ease',
        boxShadow: focused
          ? '0 0 0 4px rgba(99,102,241,0.12), 0 2px 8px rgba(99,102,241,0.08)'
          : '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <span style={{ color: focused ? '#6366f1' : '#94a3b8', marginRight: 10, display: 'flex', flexShrink: 0, transition: 'color 0.2s' }}>
          {icon}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: 14, color: '#1e1b4b', padding: '13px 0',
            fontFamily: "'DM Sans', sans-serif",
          }}
        />
        {rightEl && (
          <span style={{ marginLeft: 8, display: 'flex', color: '#94a3b8', cursor: 'pointer' }}>
            {rightEl}
          </span>
        )}
      </div>
    </div>
  );
}

export default function AuthCard({ initialMode, confirmed, linkExpired }: AuthCardProps) {
  const router = useRouter();
  const supabase = createClient();

  const [page, setPage] = useState<AuthMode>(initialMode);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  function switchPage(newPage: AuthMode) {
    setMounted(false);
    setError('');
    setSuccess('');
    setTimeout(() => {
      setPage(newPage);
      setTimeout(() => setMounted(true), 20);
    }, 300);
    router.push(newPage === 'signin' ? '/login' : 
                newPage === 'signup' ? '/register' : 
                newPage === 'forgot' ? '/forgot-password' : '/update-password');
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    if (authError) setError('Invalid email or password.');
    else { router.push('/dashboard'); router.refresh(); }
    setLoading(false);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { 
        data: { full_name: form.name },
        emailRedirectTo: `${location.origin}/auth/callback`
      },
    });
    if (authError) setError(authError.message);
    else { 
      setSuccess('Registration successful! Please check your email to confirm your account.');
    }
    setLoading(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const exists = await checkUserExists(form.email);
    if (!exists) {
      setError('Email is not registered in our database.');
      setLoading(false);
      return;
    }
    const { error: authError } = await supabase.auth.resetPasswordForEmail(form.email, {
      redirectTo: `${location.origin}/auth/callback?next=/update-password`,
    });
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess('Reset link sent! Please check your email to change your password.');
    }
    setLoading(false);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.updateUser({ password: form.password });
    if (authError) {
      setError(authError.message);
    } else {
      await supabase.auth.signOut();
      setSuccess('Password updated successfully! Sign in with your new password.');
      setTimeout(() => router.push('/login'), 1800);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setGLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  const cardStyle: React.CSSProperties = {
    width: 400,
    background: 'rgba(255,255,255,0.28)',
    backdropFilter: 'blur(24px) saturate(180%)',
    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: '1.5px solid rgba(255,255,255,0.5)',
    borderRadius: 28,
    padding: '40px 36px 36px',
    boxShadow: '0 32px 80px rgba(79,70,229,0.18), 0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)',
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'translateY(0)' : 'translateY(40px)',
    transition: 'opacity 0.6s cubic-bezier(.16,1,.3,1), transform 0.6s cubic-bezier(.16,1,.3,1)',
    position: 'relative',
    zIndex: 10,
    maxWidth: '100%',
  };

  const gradBtn: React.CSSProperties = {
    width: '100%', padding: '14px 0',
    background: loading
      ? 'linear-gradient(135deg, #6d6adb 0%, #9d6ae8 100%)'
      : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    border: 'none', borderRadius: 14,
    color: '#fff', fontSize: 15, fontWeight: 700,
    letterSpacing: '0.03em',
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingLeft: 24, paddingRight: 20,
    boxShadow: '0 6px 24px rgba(79,70,229,0.4), 0 2px 8px rgba(79,70,229,0.2)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    fontFamily: "'DM Sans', sans-serif",
    marginTop: 8,
    opacity: loading ? 0.8 : 1,
  };

  const googleBtn: React.CSSProperties = {
    width: '100%', padding: '12px 20px',
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(8px)',
    border: '1.5px solid rgba(0,0,0,0.08)',
    borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    fontSize: 14, fontWeight: 600, color: '#1e293b',
    cursor: gLoading ? 'not-allowed' : 'pointer',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: 20,
    opacity: gLoading ? 0.7 : 1,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        @keyframes floatOrb { 0%,100%{transform:translateY(0) rotate(0deg)} 33%{transform:translateY(-14px) rotate(5deg)} 66%{transform:translateY(8px) rotate(-3deg)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .gBtn:hover { transform: scale(1.02) !important; box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important; }
        .mainBtn:hover { transform: scale(1.02) translateY(-1px) !important; box-shadow: 0 10px 32px rgba(79,70,229,0.5) !important; }
        input::placeholder { color: #c4b5fd; opacity:1; }
        .authLink { color: #4f46e5; font-weight: 700; cursor: pointer; text-decoration: none; }
        .authLink:hover { text-decoration: underline; }
      `}</style>

      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #c7d2fe 0%, #ddd6fe 30%, #e0e7ff 60%, #bfdbfe 100%)',
        position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif",
        padding: '24px 16px',
      }}>
        {/* Animated blob backgrounds */}
        <FloatingBlob style={{ width: 500, height: 500, top: -100, left: -150, background: 'radial-gradient(circle, #a78bfa, #6366f1)' }} />
        <FloatingBlob style={{ width: 400, height: 400, bottom: -80, right: -100, background: 'radial-gradient(circle, #60a5fa, #818cf8)', animationDelay: '2s' }} />
        <FloatingBlob style={{ width: 300, height: 300, top: '40%', right: '15%', background: 'radial-gradient(circle, #f0abfc, #a78bfa)', animationDelay: '4s' }} />

        {/* 3D Floating elements */}
        <GlassCube x="5%" y="12%" size={90} delay={0} />
        <GlassCube x="8%" y="55%" size={60} delay={1.5} />
        <Torus x="78%" y="8%" delay={0.5} />
        <Orb3D size={120} x="2%" y="38%" color1="#e0e7ff" color2="#818cf8" delay={0} />
        <Orb3D size={80} x="80%" y="62%" color1="#fde8ff" color2="#c084fc" delay={1} />
        <Orb3D size={50} x="72%" y="30%" color1="#dbeafe" color2="#60a5fa" delay={2} />
        <MoleculeOrb x="74%" y="50%" delay={1} />

        <div style={{
          position: 'absolute', left: '3%', bottom: '5%',
          width: 90, height: 120,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: '50% 50% 40% 40% / 40% 40% 60% 60%',
          boxShadow: '0 16px 48px rgba(99,102,241,0.15)',
          animation: 'floatOrb 10s ease-in-out 0.5s infinite',
        }} />

        <div style={{
          position: 'absolute', right: '6%', bottom: '10%',
          width: 60, height: 60,
          background: 'linear-gradient(135deg, #818cf8, #4f46e5)',
          clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
          animation: 'floatOrb 7s ease-in-out 1s infinite',
          opacity: 0.85,
          boxShadow: '0 8px 24px rgba(79,70,229,0.3)',
        }} />

        {/* Auth Card */}
        <div style={cardStyle}>
          {/* Inner glow */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 28,
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.45) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, background: 'rgba(99,102,241,0.1)', borderRadius: 20, marginBottom: 14, border: '1.5px solid rgba(99,102,241,0.2)' }}>
              <FlaskIcon />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1e1b4b', fontFamily: "'Instrument Serif', serif", letterSpacing: '-0.01em', marginBottom: 6 }}>
              Lablio
            </h1>
            <p style={{ fontSize: 13.5, color: '#6366f1', fontWeight: 500, letterSpacing: '0.02em' }}>
              {page === 'signin' ? 'Your lab records, organized.' : 
               page === 'signup' ? 'Create your Lablio account' : 
               page === 'forgot' ? 'Reset your password' : 'Set a new password'}
            </p>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
              <div style={{ 
                width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', 
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', 
                fontSize: 32, boxShadow: '0 8px 24px rgba(16,185,129,0.3)' 
              }}>✓</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1e1b4b', marginBottom: 12 }}>
                {page === 'update' ? 'Password updated!' : 'Check your email'}
              </h2>
              <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, marginBottom: 32 }}>
                {success}
              </p>
              <button type="button" className="mainBtn" style={{...gradBtn, justifyContent: 'center', gap: 12}} onClick={() => switchPage('signin')}>
                <span>{page === 'update' ? 'Sign in now' : 'Go to Sign in'}</span>
                <span style={{ fontSize: 18 }}>→</span>
              </button>
            </div>
          ) : page === 'signin' ? (
            <form onSubmit={handleSignIn}>
              {confirmed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 20, background: 'rgba(16,185,129,0.12)', border: '1.5px solid rgba(16,185,129,0.3)', borderRadius: 12 }}>
                  <span style={{ fontSize: 18 }}>✓</span>
                  <p style={{ fontSize: 13, color: '#065f46', fontWeight: 500 }}>Email confirmed! Sign in with your password to continue.</p>
                </div>
              )}
              {linkExpired && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 20, background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.25)', borderRadius: 12 }}>
                  <span style={{ fontSize: 18 }}>⚠</span>
                  <p style={{ fontSize: 13, color: '#991b1b', fontWeight: 500 }}>Confirmation link expired. Please register again.</p>
                </div>
              )}
              <button type="button" className="gBtn" style={googleBtn} onClick={handleGoogle} disabled={gLoading}>
                {GOOGLE_ICON}
                <span>{gLoading ? 'Redirecting...' : 'Sign in with Google'}</span>
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.3)' }} />
                <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.3)' }} />
              </div>

              <InputField label="Email" icon={<MailIcon />} type="email" placeholder="you@college.edu" value={form.email} onChange={set('email')} />
              <InputField
                label="Password"
                icon={<LockIcon />}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
                rightEl={<span onClick={() => setShowPass(p => !p)}><EyeIcon open={showPass} /></span>}
              />

              {error && (
                <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12, marginTop: -8, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 8 }}>
                  {error}
                </p>
              )}

              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                <span className="authLink" style={{ fontSize: 12 }} onClick={() => switchPage('forgot')}>Forgot password?</span>
              </div>

              <button type="submit" className="mainBtn" style={gradBtn} disabled={loading}>
                <span>{loading ? 'Signing in...' : 'Sign in'}</span>
                <span style={{ fontSize: 18 }}>→</span>
              </button>
            </form>
          ) : page === 'forgot' ? (
            <form onSubmit={handleForgot}>
              <InputField label="Email" icon={<MailIcon />} type="email" placeholder="you@college.edu" value={form.email} onChange={set('email')} />
              {error && (
                <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 8 }}>
                  {error}
                </p>
              )}
              <button type="submit" className="mainBtn" style={gradBtn} disabled={loading}>
                <span>{loading ? 'Sending...' : 'Send reset link'}</span>
                <span style={{ fontSize: 18 }}>→</span>
              </button>
            </form>
          ) : page === 'update' ? (
            <form onSubmit={handleUpdate}>
              <InputField
                label="New Password"
                icon={<LockIcon />}
                type={showPass ? 'text' : 'password'}
                placeholder="Enter new password"
                value={form.password}
                onChange={set('password')}
                rightEl={<span onClick={() => setShowPass(p => !p)}><EyeIcon open={showPass} /></span>}
              />
              <InputField
                label="Confirm New Password"
                icon={<LockIcon />}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat new password"
                value={form.confirm}
                onChange={set('confirm')}
                rightEl={<span onClick={() => setShowConfirm(p => !p)}><EyeIcon open={showConfirm} /></span>}
              />
              {error && (
                <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 8 }}>
                  {error}
                </p>
              )}
              <button type="submit" className="mainBtn" style={gradBtn} disabled={loading}>
                <span>{loading ? 'Updating...' : 'Update password'}</span>
                <span style={{ fontSize: 18 }}>→</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp}>
              <InputField label="Full Name" icon={<UserIcon />} placeholder="Dr. Jane Smith" value={form.name} onChange={set('name')} />
              <InputField label="Email" icon={<MailIcon />} type="email" placeholder="you@college.edu" value={form.email} onChange={set('email')} />
              <InputField
                label="Password"
                icon={<LockIcon />}
                type={showPass ? 'text' : 'password'}
                placeholder="Create a password"
                value={form.password}
                onChange={set('password')}
                rightEl={<span onClick={() => setShowPass(p => !p)}><EyeIcon open={showPass} /></span>}
              />
              <InputField
                label="Confirm Password"
                icon={<LockIcon />}
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={set('confirm')}
                rightEl={<span onClick={() => setShowConfirm(p => !p)}><EyeIcon open={showConfirm} /></span>}
              />

              {error && (
                <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: 'rgba(220,38,38,0.08)', borderRadius: 8 }}>
                  {error}
                </p>
              )}

              <button type="submit" className="mainBtn" style={gradBtn} disabled={loading}>
                <span>{loading ? 'Creating account...' : 'Create account'}</span>
                <span style={{ fontSize: 18 }}>→</span>
              </button>
            </form>
          )}

          {page !== 'update' && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13.5, color: '#64748b' }}>
            {page === 'signin' ? (
              <>No account?{' '}<span className="authLink" onClick={() => switchPage('signup')}>Register</span></>
            ) : page === 'signup' ? (
              <>Already have an account?{' '}<span className="authLink" onClick={() => switchPage('signin')}>Sign in</span></>
            ) : (
              <><span className="authLink" onClick={() => switchPage('signin')}>Back to Sign in</span></>
            )}
          </p>
          )}
        </div>
      </div>
    </>
  );
}
