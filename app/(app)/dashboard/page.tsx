'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, User, Upload, BookOpen, ChevronDown, Clock, Eye, X, Check,
  FileText, GraduationCap, Sparkles, Bot, CloudUpload,
  File as FileIcon,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type React from 'react';

// ─── types ───────────────────────────────────────────────────────────────────

type FetchedRecord = {
  id: string;
  title: string;
  status: 'draft' | 'complete';
  last_edited_at: string;
  experiments: { title: string; subjects: { name: string } | null } | null;
};

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

type DisplayRecord = {
  id: string;
  Icon: IconComponent;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  tag: string;
  tagColor: string;
  tagText: string;
  date: string;
};

// ─── constants ───────────────────────────────────────────────────────────────

const SUGGESTIONS = ['DBMS Record', 'OS Record', 'CN Record', 'MMA Record'];

const NAV = [
  { id: 'search',  label: 'Search',      Icon: Search,  href: '/search'  as string | null },
  { id: 'profile', label: 'Profile',     Icon: User,    href: null       as string | null },
  { id: 'upload',  label: 'Upload File', Icon: Upload,  href: null       as string | null },
  { id: 'labmate', label: 'LabMate',     Icon: Bot,     href: '/labmate' as string | null, badge: 'Soon' as string | undefined },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function useReveal(delay = 0) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return visible;
}

const glass = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.15)',
  ...extra,
});

function toDisplayRecord(r: FetchedRecord): DisplayRecord {
  const done = r.status === 'complete';
  return {
    id:       r.id,
    // assertion required: lucide icon props are a superset of IconComponent props
    Icon:     (done ? Check : FileText) as IconComponent,
    iconBg:   done ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.25)',
    iconColor: done ? '#6EE7B7'              : '#93C5FD',
    title:    r.title,
    subtitle: r.experiments?.title ?? 'No experiment linked',
    tag:      r.experiments?.subjects?.name ?? r.status,
    tagColor: done ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.25)',
    tagText:  done ? '#6EE7B7'               : '#93C5FD',
    date:     formatDate(r.last_edited_at),
  };
}

// ─── component ───────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [query,       setQuery]       = useState('');
  const [activeNav,   setActiveNav]   = useState('search');
  const [records,     setRecords]     = useState<DisplayRecord[]>([]);
  const [uploadCount, setUploadCount] = useState(0);
  const [showUpload,  setShowUpload]  = useState(false);
  const [step,        setStep]        = useState<'drop' | 'name'>('drop');
  const [pending,     setPending]     = useState<File[]>([]);
  const [fileNames,   setFileNames]   = useState<string[]>([]);
  const [dragging,    setDragging]    = useState(false);
  const [userName,    setUserName]    = useState('User');
  const [userEmail,   setUserEmail]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const showSidebar = useReveal(0);
  const showHero    = useReveal(120);
  const showSearch  = useReveal(260);
  const showList    = useReveal(400);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name,college_email')
        .eq('id', user.id)
        .single();
      setUserName(profile?.name ?? user.email?.split('@')[0] ?? 'User');
      setUserEmail(profile?.college_email ?? user.email ?? '');

      const { data } = await supabase
        .from('records')
        .select('id, title, status, last_edited_at, experiments(title, subjects(name))')
        .order('last_edited_at', { ascending: false })
        .limit(12);
      // double-cast: Supabase infers join shape without generated types
      setRecords(((data ?? []) as unknown as FetchedRecord[]).map(toDisplayRecord));
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // upload handlers
  const openDrop = () => { setStep('drop'); setShowUpload(true); };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setPending(arr);
    setFileNames(arr.map(f => f.name.replace(/\.[^.]+$/, '')));
    setStep('name');
  };

  const confirmUpload = () => {
    setUploadCount(prev => prev + pending.length);
    setShowUpload(false);
    setPending([]);
    setFileNames([]);
    router.push('/repository');
  };

  const filtered = records.filter(r =>
    !query ||
    r.title.toLowerCase().includes(query.toLowerCase()) ||
    r.subtitle.toLowerCase().includes(query.toLowerCase()) ||
    r.tag.toLowerCase().includes(query.toLowerCase())
  );

  const initial = userName.charAt(0).toUpperCase();

  /* ─────────────────────────── render ─────────────────────────── */
  return (
    <>
      {/* ── upload modal ── */}
      {showUpload && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowUpload(false)}
        >
          <div
            className="modal-reveal"
            style={{ ...glass({ borderRadius: 24, padding: 36, width: 460, boxShadow: '0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' }) }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
                  {step === 'drop' ? 'Upload File' : 'Name Your Files'}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
                  {step === 'drop' ? 'Drag & drop or browse your lab records' : 'Give each file a meaningful name'}
                </div>
              </div>
              <button onClick={() => setShowUpload(false)} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 8px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>

            {step === 'drop' ? (
              <>
                <div
                  className="upload-area"
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${dragging ? 'rgba(99,102,241,0.8)' : 'rgba(255,255,255,0.2)'}`, borderRadius: 18, padding: '44px 24px', textAlign: 'center', cursor: 'pointer', background: dragging ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)' }}
                >
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CloudUpload size={28} color="#A5B4FC" />
                  </div>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 6 }}>Drop your files here</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>or <span style={{ color: '#A5B4FC', fontWeight: 600 }}>browse to upload</span></div>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {['PDF', 'DOCX', 'PPTX', 'PNG', 'JPG'].map(t => (
                      <span key={t} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                </div>
                <input ref={fileRef} type="file" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
              </>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 280, overflowY: 'auto', paddingRight: 4 }}>
                  {pending.map((f, i) => (
                    <div key={i} style={{ ...glass({ borderRadius: 14, padding: '14px 16px' }), display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileIcon size={18} color="#A5B4FC" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5, fontWeight: 500 }}>{f.name} · {(f.size / 1024).toFixed(1)} KB</div>
                        <input
                          value={fileNames[i]}
                          onChange={e => setFileNames(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                          placeholder="Enter file name..."
                          style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, fontFamily: "'Outfit',sans-serif", fontWeight: 600, outline: 'none' }}
                        />
                      </div>
                      <button
                        onClick={() => { setPending(prev => prev.filter((_, j) => j !== i)); setFileNames(prev => prev.filter((_, j) => j !== i)); }}
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '6px', cursor: 'pointer', color: '#FCA5A5', display: 'flex' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                  <button onClick={() => setStep('drop')} style={{ flex: 1, padding: '12px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 14 }}>Back</button>
                  <button
                    className="primary-btn"
                    onClick={confirmUpload}
                    disabled={pending.length === 0}
                    style={{ flex: 2, padding: '12px', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                  >
                    <Check size={16} /> Confirm Upload
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── full-screen overlay (covers existing sidebar/topbar) ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', fontFamily: "'Outfit',sans-serif", background: 'linear-gradient(135deg,#0a0f1e 0%,#0d1533 40%,#0f0a1e 100%)', overflow: 'hidden' }}>

        {/* bg orbs */}
        <div style={{ position: 'absolute', top: '-15%', left: '8%',   width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '5%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(16,185,129,0.1) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '40%', left: '30%',  width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)', pointerEvents: 'none' }} />

        {/* ════ sidebar ════ */}
        <div
          className={showSidebar ? 'sidebar-reveal' : ''}
          style={{ ...glass({ width: 228, borderRight: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }), display: 'flex', flexDirection: 'column', padding: '28px 14px', gap: 2, flexShrink: 0, opacity: showSidebar ? 1 : 0 }}
        >
          {/* logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, paddingLeft: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
              <BookOpen size={17} color="#fff" />
            </div>
            <span style={{ fontWeight: 900, fontSize: 18, color: '#fff', letterSpacing: '-0.5px' }}>Lablio</span>
          </div>

          {/* nav items */}
          {NAV.map((nav, idx) => {
            const active   = activeNav === nav.id;
            const isUpload = nav.id === 'upload';
            return (
              <button
                key={nav.id}
                className="nav-btn"
                onClick={() => {
                  setActiveNav(nav.id);
                  if (isUpload) { openDrop(); return; }
                  if (nav.href) router.push(nav.href);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14, color: active ? '#fff' : 'rgba(255,255,255,0.5)', background: active ? 'rgba(99,102,241,0.3)' : 'transparent', backdropFilter: active ? 'blur(10px)' : 'none', boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.15)' : 'none', animation: `rowIn .4s ${idx * 0.07 + 0.3}s both`, position: 'relative' }}
              >
                <nav.Icon size={17} />
                <span style={{ flex: 1, textAlign: 'left' }}>{nav.label}</span>
                {nav.badge && (
                  <span style={{ background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)', borderRadius: 20, fontSize: 10, color: '#C4B5FD', fontWeight: 700, padding: '2px 8px' }}>{nav.badge}</span>
                )}
                {isUpload && uploadCount > 0 && (
                  <span style={{ background: '#6366F1', borderRadius: 20, fontSize: 10, color: '#fff', fontWeight: 700, padding: '2px 7px' }}>{uploadCount}</span>
                )}
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          {/* user card */}
          <div style={{ ...glass({ borderRadius: 14, padding: '12px 10px' }), display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{initial}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</div>
            </div>
            <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
          </div>
        </div>

        {/* ════ main content ════ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* hero */}
          <div
            className={showHero ? 'hero-reveal' : ''}
            style={{ ...glass({ borderRadius: 24, padding: '30px 40px', minHeight: 190, position: 'relative', overflow: 'hidden' }), display: 'flex', alignItems: 'center', opacity: showHero ? 1 : 0 }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg,rgba(99,102,241,0.12) 0%,rgba(139,92,246,0.06) 50%,rgba(16,185,129,0.05) 100%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -40, right: 220, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.25) 0%,transparent 70%)', pointerEvents: 'none' }} />
            <Sparkles size={18} color="#FCD34D" style={{ position: 'absolute', top: 28, left: 345, animation: 'shimmer 2s infinite' } as React.CSSProperties} />
            <Sparkles size={11} color="#FCD34D" style={{ position: 'absolute', top: 65, left: 390, animation: 'shimmer 2s infinite .4s' } as React.CSSProperties} />
            <Sparkles size={13} color="#FCD34D" style={{ position: 'absolute', top: 20, right: 230, animation: 'shimmer 2s infinite .8s' } as React.CSSProperties} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/boy_nobg.png" alt="student character" className="float-img" style={{ width: 155, height: 155, objectFit: 'contain', marginRight: 30, flexShrink: 0, filter: 'drop-shadow(0 8px 24px rgba(99,102,241,0.35))', position: 'relative', zIndex: 1 }} />
            <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-1px' }}>
                Find What{' '}
                <span style={{ background: 'linear-gradient(135deg,#818CF8,#A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>You Need</span>
              </div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', marginTop: 8, fontWeight: 500 }}>Search your records easily and find the right information</div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/file_img_nobg.png" alt="files illustration" className="float-img2" style={{ width: 148, height: 148, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 8px 24px rgba(16,185,129,0.2))', position: 'relative', zIndex: 1 }} />
          </div>

          {/* search */}
          <div
            className={showSearch ? 'search-reveal' : ''}
            style={{ ...glass({ borderRadius: 20, padding: '24px 28px' }), opacity: showSearch ? 1 : 0 }}
          >
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div className="search-input" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '13px 18px', transition: 'all .2s' }}>
                <Search size={17} color="rgba(255,255,255,0.4)" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && query) router.push(`/search?q=${encodeURIComponent(query)}`); }}
                  placeholder="Search by title, subject, keyword, or any details..."
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 14, color: '#fff', fontFamily: "'Outfit',sans-serif", fontWeight: 500 }}
                />
                {query && (
                  <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
                    <X size={15} />
                  </button>
                )}
              </div>
              <button
                className="primary-btn"
                onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
                style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', borderRadius: 14, padding: '0 28px', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Outfit',sans-serif", boxShadow: '0 4px 20px rgba(99,102,241,0.4)', whiteSpace: 'nowrap' }}
              >
                <Search size={15} /> Search
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Try searching:</span>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  className="suggest-chip"
                  onClick={() => setQuery(s)}
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '5px 15px', fontSize: 12.5, color: '#A5B4FC', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", animation: `rowIn .4s ${i * 0.08}s both` }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* records list */}
          <div
            className={showList ? 'list-reveal' : ''}
            style={{ ...glass({ borderRadius: 20, padding: '24px 28px', flex: 1 }), opacity: showList ? 1 : 0 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Clock size={17} color="#A5B4FC" />
                </div>
                <span style={{ fontWeight: 800, fontSize: 17, color: '#fff', letterSpacing: '-0.3px' }}>Recent Records</span>
              </div>
              <button
                onClick={() => router.push('/records')}
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '7px 18px', fontSize: 13, color: 'rgba(255,255,255,0.55)', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit',sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Eye size={14} /> View all
              </button>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(255,255,255,0.35)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <Search size={36} style={{ opacity: 0.4 }} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {query ? `No records found for "${query}"` : 'No records yet'}
                </div>
                {!query && (
                  <button
                    onClick={() => router.push('/records/new')}
                    style={{ marginTop: 12, background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: "'Outfit',sans-serif" }}
                  >
                    Create Record
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filtered.map((record, i) => (
                  <div
                    key={record.id}
                    className="record-row"
                    onClick={() => router.push(`/records/${record.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 14px', borderRadius: 14, cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none', animation: `rowIn .4s ${i * 0.06}s both` }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 13, background: record.iconBg, border: `1px solid ${record.iconColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <record.Icon size={20} color={record.iconColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5, color: '#fff', letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.title}</div>
                      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.subtitle}</div>
                    </div>
                    <span style={{ background: record.tagColor, color: record.tagText, borderRadius: 20, padding: '5px 15px', fontSize: 12, fontWeight: 700, flexShrink: 0, border: `1px solid ${record.tagText}33` }}>{record.tag}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.35)', fontSize: 13, flexShrink: 0, minWidth: 112, justifyContent: 'flex-end' }}>
                      <Clock size={13} /> {record.date}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* footer */}
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 4, animation: 'fadeIn 1s 1s both' }}>
            <GraduationCap size={15} color="#818CF8" /> Stay curious, keep learning, and achieve great things!
          </div>
        </div>
      </div>
    </>
  );
}
