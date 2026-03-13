import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    number: '01',
    title: 'One-tap timer',
    body: 'Start tracking in seconds. Assign a client, project, and task — then forget about it. Stop when you\'re done.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Client & project management',
    body: 'Organise work by client, set per-project rates, define tasks. Every billable minute lands in the right bucket.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Invoice generation',
    body: 'Turn tracked hours into a polished PDF invoice in one click. Auto-numbered, tax-calculated, ready to send.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Revenue reports',
    body: 'See exactly where your hours go. Weekly charts, client breakdowns, and CSV exports for your accountant.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

const STEPS = [
  { n: '1', title: 'Track your time', body: 'Hit start when you begin work, stop when you\'re done. The timer logs duration, rate, and project automatically.' },
  { n: '2', title: 'Generate the invoice', body: 'Select a client, pick a date range, and Hourly Halo compiles every billable entry into a numbered invoice.' },
  { n: '3', title: 'Get paid', body: 'Export a PDF or email the invoice directly. Mark it paid when the money lands.' },
];

function TickingClock() {
  const [time, setTime] = useState('00:00:00');
  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const s = Math.floor((Date.now() - start) / 1000);
      const h = String(Math.floor(s / 3600)).padStart(2, '0');
      const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
      const sec = String(s % 60).padStart(2, '0');
      setTime(`${h}:${m}:${sec}`);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{time}</span>;
}

export default function Landing() {
  return (
    <div style={{ fontFamily: "'Syne', 'Inter', sans-serif", background: '#080c14', color: '#e8eaf0', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* Google Font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&display=swap" />

      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(99,102,241,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Glow blobs */}
      <div style={{ position: 'fixed', top: '-20vh', left: '-10vw', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.12) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10vh', right: '-10vw', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.08) 0%, transparent 70%)', zIndex: 0, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* NAV */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 40px', borderBottom: '1px solid rgba(99,102,241,.15)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(8,12,20,.8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'hsl(234,89%,58%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="16" height="16">
                <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: '#fff' }}>Hourly Halo</span>
          </div>
          <Link to="/auth" style={{ background: 'hsl(234,89%,58%)', color: '#fff', padding: '8px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none', letterSpacing: '0.01em', transition: 'opacity .15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            Sign in →
          </Link>
        </nav>

        {/* HERO */}
        <section style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 40px 60px', maxWidth: 1100, margin: '0 auto', position: 'relative' }}>

          {/* Live timer badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(99,102,241,.12)', border: '1px solid rgba(99,102,241,.25)', borderRadius: 100, padding: '6px 14px', marginBottom: 36, width: 'fit-content' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#818cf8', letterSpacing: '0.05em' }}>
              <TickingClock />
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(44px, 7vw, 88px)', fontWeight: 800, lineHeight: 1.0, letterSpacing: '-0.04em', marginBottom: 28, maxWidth: 800, color: '#fff' }}>
            Your time<br />
            <span style={{ color: 'hsl(234,89%,68%)', position: 'relative' }}>
              is money.
              <svg style={{ position: 'absolute', bottom: -4, left: 0, width: '100%', height: 8, overflow: 'visible' }} viewBox="0 0 200 8" preserveAspectRatio="none">
                <path d="M0,6 Q50,0 100,6 Q150,12 200,6" fill="none" stroke="hsl(234,89%,58%)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            <br />Track both.
          </h1>

          <p style={{ fontSize: 18, color: '#94a3b8', maxWidth: 500, lineHeight: 1.7, marginBottom: 44, fontFamily: "'Inter', sans-serif", fontWeight: 400 }}>
            Hourly Halo is the billing toolkit for freelancers who'd rather spend time on their craft than on spreadsheets.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to="/auth" style={{ background: 'hsl(234,89%,58%)', color: '#fff', padding: '14px 32px', borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none', letterSpacing: '-0.01em', transition: 'transform .15s, box-shadow .15s', boxShadow: '0 0 32px rgba(99,102,241,.35)' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(99,102,241,.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(99,102,241,.35)'; }}>
              Start tracking free
            </Link>
            <a href="#how-it-works" style={{ color: '#94a3b8', padding: '14px 24px', borderRadius: 10, fontWeight: 600, fontSize: 16, textDecoration: 'none', border: '1px solid rgba(148,163,184,.2)', transition: 'border-color .15s, color .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,.5)'; e.currentTarget.style.color = '#e8eaf0'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(148,163,184,.2)'; e.currentTarget.style.color = '#94a3b8'; }}>
              See how it works
            </a>
          </div>

          {/* Floating stat pills */}
          <div style={{ display: 'flex', gap: 16, marginTop: 64, flexWrap: 'wrap' }}>
            {[['∞', 'Clients'], ['∞', 'Projects'], ['PDF', 'Export'], ['0%', 'Commission']].map(([val, label]) => (
              <div key={label} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: '#818cf8' }}>{val}</span>
                <span style={{ fontSize: 12, color: '#64748b', fontFamily: "'Inter', sans-serif" }}>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* DIVIDER */}
        <div style={{ borderTop: '1px solid rgba(99,102,241,.12)', maxWidth: 1100, margin: '0 auto' }} />

        {/* FEATURES */}
        <section style={{ padding: '100px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 60 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6366f1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Features</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,.2)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 2 }}>
            {FEATURES.map((f) => (
              <div key={f.number} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: '32px 28px', transition: 'background .2s, border-color .2s', cursor: 'default' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,.07)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,.3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,.03)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,.07)'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div style={{ color: '#6366f1' }}>{f.icon}</div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#334155', fontWeight: 600 }}>{f.number}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" style={{ padding: '100px 40px', background: 'rgba(99,102,241,.04)', borderTop: '1px solid rgba(99,102,241,.1)', borderBottom: '1px solid rgba(99,102,241,.1)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 60 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6366f1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>How it works</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,.2)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 40 }}>
              {STEPS.map((s, i) => (
                <div key={s.n} style={{ position: 'relative' }}>
                  {i < STEPS.length - 1 && (
                    <div style={{ position: 'absolute', top: 24, left: 'calc(100% - 20px)', width: 40, height: 1, background: 'rgba(99,102,241,.3)', display: 'none' }} className="step-connector" />
                  )}
                  <div style={{ width: 48, height: 48, borderRadius: 12, border: '1px solid rgba(99,102,241,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, background: 'rgba(99,102,241,.08)' }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: '#6366f1' }}>{s.n}</span>
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{s.title}</h3>
                  <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, fontFamily: "'Inter', sans-serif" }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section style={{ padding: '100px 40px', maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 60 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6366f1', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Pricing</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(99,102,241,.2)' }} />
          </div>
          <div style={{ background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.25)', borderRadius: 20, padding: '52px 40px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 60, fontWeight: 700, color: '#6366f1', letterSpacing: '-0.04em', marginBottom: 8 }}>$0</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>Free while in beta</div>
            <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7, marginBottom: 36, fontFamily: "'Inter', sans-serif" }}>
              No seat fees. No percentage of invoices. Unlimited clients, projects, and time entries. Just pay for Resend if you want to email invoices directly.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left', maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
              {['Unlimited time entries', 'Unlimited clients & projects', 'PDF invoice export', 'Email invoice delivery', 'Revenue reports & CSV export', 'Timer rounding rules'].map(item => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#cbd5e1', fontFamily: "'Inter', sans-serif" }}>
                  <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                    <circle cx="8" cy="8" r="7" fill="rgba(99,102,241,.2)" />
                    <path d="M5 8l2 2 4-4" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/auth" style={{ display: 'inline-block', background: 'hsl(234,89%,58%)', color: '#fff', padding: '14px 40px', borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none', letterSpacing: '-0.01em', boxShadow: '0 0 32px rgba(99,102,241,.35)', transition: 'transform .15s, box-shadow .15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(99,102,241,.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 32px rgba(99,102,241,.35)'; }}>
              Get started free
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '36px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'hsl(234,89%,58%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="14" height="14">
                <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#94a3b8' }}>Hourly Halo</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/auth" style={{ fontSize: 14, color: '#64748b', textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>Sign in</Link>
            <Link to="/auth" style={{ fontSize: 14, color: '#64748b', textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#94a3b8')}
              onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>Create account</Link>
          </div>
          <span style={{ fontSize: 13, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>© {new Date().getFullYear()} Hourly Halo</span>
        </footer>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
        @media (max-width: 640px) {
          nav { padding: 16px 20px !important; }
          section { padding-left: 20px !important; padding-right: 20px !important; }
          footer { padding: 28px 20px !important; }
        }
      `}</style>
    </div>
  );
}
