// ─────────────────────────────────────────────────────────────────────────
// SurfaceA.jsx · homepage onboarding (lightweight, additive)
// ─────────────────────────────────────────────────────────────────────────
// Pattern: a bottom-right chip on first visit (Linear "what's new" register) that
// opens a compact modal, PLUS a persistent "First time?" affordance in the
// masthead (rendered by HomePage) for anyone who wants the explainer later.
//
// State: localStorage['45a.onboarding.seen'] = 'true' once the visitor dismisses
// the chip OR closes the modal OR clicks the modal CTA. The chip never re-appears
// after that; the masthead link is always available.
//
// Nothing here displaces, hides, or restyles the homepage. The chip is fixed
// bottom-right; the modal is an overlay capped at 80vh.

const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

const SEEN_KEY = '45a.onboarding.seen';

function markSeen() { try { localStorage.setItem(SEEN_KEY, 'true'); } catch (e) {} }
function hasSeen()  { try { return localStorage.getItem(SEEN_KEY) === 'true'; } catch (e) { return false; } }

// ── Chip ──────────────────────────────────────────────────────────────────
function OnboardingChip({ onOpen, onDismiss, reduced }) {
  return (
    <div
      role="status"
      style={{
        position:'fixed', right:24, bottom:24, zIndex:50,
        display:'flex', alignItems:'stretch',
        background:'var(--bg-panel-elev)', border:'1px solid var(--border-default)',
        borderRadius:10, boxShadow:'var(--shadow-card)',
        animation: reduced ? 'none' : 'chipIn 300ms cubic-bezier(0.4,0,0.2,1)',
        maxWidth:'calc(100vw - 48px)',
      }}
    >
      <button
        onClick={onOpen}
        style={{
          display:'flex', alignItems:'center', gap:12,
          padding:'12px 8px 12px 16px', background:'transparent', border:'none',
          cursor:'pointer', textAlign:'left',
        }}
      >
        <span style={{
          fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-tertiary)',
          letterSpacing:'0.04em', whiteSpace:'nowrap',
        }}>First time here?</span>
        <span style={{
          fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-primary)', fontWeight:500, whiteSpace:'nowrap',
        }}>Read in 90 seconds</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:13, color:'#0F6B7D' }}>→</span>
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          width:34, borderLeft:'1px solid var(--rule)', background:'transparent', border:'none',
          borderTopRightRadius:10, borderBottomRightRadius:10,
          color:'var(--text-quiet)', cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:13,
          transition:'background 120ms, color 120ms',
        }}
        onMouseEnter={e=>{ e.currentTarget.style.background='var(--bg-panel)'; e.currentTarget.style.color='var(--text-primary)'; }}
        onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-quiet)'; }}
      >✕</button>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
// 90-second explainer. Three plain claims + one primary CTA ("Try the simulator").
// Closeable via Esc, click-outside, and explicit "Got it". No form, no choice.
function OnboardingModal({ onClose, onTrySimulator, reduced }) {
  const cardRef = useRefA(null);

  useEffectA(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    // focus the card for keyboard users
    if (cardRef.current) cardRef.current.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const claims = [
    { n:'01', text:<>A <strong style={{ fontWeight:600, color:'var(--text-primary)' }}>pre-registered probability model</strong> for the World Cup &mdash; not a betting site. The method was committed to OSF before the data came in.</> },
    { n:'02', text:<>Each night it runs <strong style={{ fontWeight:600, color:'var(--text-primary)' }}>{SNAPSHOT.mcRuns.toLocaleString()} simulations</strong> of the tournament and publishes the results. Right now it puts {LEADER.team} first, at <span className="mono" style={{ color:'var(--text-primary)' }}>{(LEADER.p*100).toFixed(1)}%</span>.</> },
    { n:'03', text:<>It compares those numbers to <strong style={{ fontWeight:600, color:'var(--text-primary)' }}>bookmaker odds</strong> and publishes every divergence &mdash; hits and misses with identical weight.</> },
  ];

  return (
    <div
      onClick={(e)=>{ if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:'fixed', inset:0, zIndex:80,
        background:'rgba(20,20,20,0.32)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:24,
        animation: reduced ? 'none' : 'overlayIn 160ms ease-out',
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="What this is"
        style={{
          width:'100%', maxWidth:520, maxHeight:'80vh', overflowY:'auto', outline:'none',
          background:'var(--bg-panel-elev)', border:'1px solid var(--border-default)',
          borderRadius:16, boxShadow:'var(--shadow-card)',
          animation: reduced ? 'none' : 'modalIn 180ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        <div style={{ padding:'28px 32px 0', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
          <div>
            <div className="mono" style={{ fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:14 }}>
              <span style={{ color:'var(--brand-accent)' }}>§</span> What this is
            </div>
            <h2 style={{ fontFamily:'var(--font-serif)', fontWeight:400, fontSize:28, letterSpacing:'-0.015em', lineHeight:1.2, margin:0, color:'var(--text-primary)' }}>
              A research publication, read in 90 seconds.
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            flexShrink:0, width:30, height:30, borderRadius:6, marginTop:-4,
            border:'1px solid var(--rule)', background:'transparent', color:'var(--text-quiet)',
            cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:13,
            transition:'background 120ms, color 120ms',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.background='var(--bg-panel)'; e.currentTarget.style.color='var(--text-primary)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-quiet)'; }}
          >✕</button>
        </div>

        <div style={{ padding:'24px 32px 8px', display:'flex', flexDirection:'column', gap:18 }}>
          {claims.map(c => (
            <div key={c.n} style={{ display:'grid', gridTemplateColumns:'28px 1fr', gap:14, alignItems:'start' }}>
              <span className="mono" style={{ fontSize:11, color:'var(--text-quiet)', letterSpacing:'0.04em', paddingTop:3 }}>{c.n}</span>
              <p style={{ margin:0, fontFamily:'var(--font-sans)', fontSize:15, lineHeight:1.6, color:'var(--text-secondary)' }}>{c.text}</p>
            </div>
          ))}
        </div>

        <div style={{ padding:'18px 32px 28px', marginTop:8, borderTop:'1px solid var(--rule)', display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
          <button onClick={onTrySimulator} style={{
            fontFamily:'var(--font-sans)', fontSize:13, fontWeight:500,
            background:'#141414', color:'#F7F4EC', border:'1px solid #141414',
            padding:'0 18px', height:40, borderRadius:6, cursor:'pointer',
            display:'inline-flex', alignItems:'center', gap:8,
          }}>Try the simulator <span style={{ opacity:.6 }}>→</span></button>
          <button onClick={onClose} style={{
            fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-tertiary)',
            background:'transparent', border:'none', cursor:'pointer', height:40, padding:'0 4px',
          }}>Got&nbsp;it</button>
          <div style={{ flex:1 }} />
          <span className="mono" style={{ fontSize:10, color:'var(--text-quiet)', letterSpacing:'0.04em' }}>{SNAPSHOT.osf}</span>
        </div>
      </div>
    </div>
  );
}

// ── Controller — owns chip/modal visibility + the seen flag ─────────────────
// `helpSignal` is bumped by the masthead "First time?" link to force-open the
// modal even after the visitor has dismissed onboarding.
function SurfaceA({ helpSignal, onTrySimulator, onSeen, reduced, chipDelayMs = 2500 }) {
  const [seen, setSeen] = useStateA(() => hasSeen());
  const [showChip, setShowChip] = useStateA(false);
  const [showModal, setShowModal] = useStateA(false);

  function flagSeen() { markSeen(); setSeen(true); if (onSeen) onSeen(); }

  // First visit: reveal the chip after a settle delay so the page establishes first.
  useEffectA(() => {
    if (seen) { setShowChip(false); return; }
    const t = setTimeout(() => setShowChip(true), Math.max(0, reduced ? Math.min(chipDelayMs, 400) : chipDelayMs));
    return () => clearTimeout(t);
  }, [seen, reduced, chipDelayMs]);

  // Masthead link → always open the modal (does not depend on seen).
  useEffectA(() => {
    if (helpSignal > 0) { setShowModal(true); setShowChip(false); }
  }, [helpSignal]);

  function dismissChip() { flagSeen(); setShowChip(false); }
  function openModal()   { setShowModal(true); setShowChip(false); }
  function closeModal()  { flagSeen(); setShowModal(false); }
  function trySim()      { flagSeen(); setShowModal(false); onTrySimulator(); }

  return (
    <>
      {showChip && !showModal && (
        <OnboardingChip onOpen={openModal} onDismiss={dismissChip} reduced={reduced} />
      )}
      {showModal && (
        <OnboardingModal onClose={closeModal} onTrySimulator={trySim} reduced={reduced} />
      )}
    </>
  );
}

Object.assign(window, { SurfaceA, SEEN_KEY });
