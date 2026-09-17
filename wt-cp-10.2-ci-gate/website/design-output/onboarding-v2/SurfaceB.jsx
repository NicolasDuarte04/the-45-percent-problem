// ─────────────────────────────────────────────────────────────────────────
// SurfaceB.jsx · simulator walk-through (3-beat coachmark over the real UI)
// ─────────────────────────────────────────────────────────────────────────
// The walk-through does NOT redesign the simulator — it sits on top, with the
// real UI dimmed behind a scrim and the currently-anchored region spotlit at full
// opacity so it stays interactive. Three beats:
//   Beat 1 — "You make a call."   anchored to the mode picker.
//   Beat 2 — "10,000 simulations" anchored to the Final Four grid + corner anim.
//   Beat 3 — "Your call beside the model's." plays on Submit; then a soft email
//            capture appears below the rarity badge.
// State: localStorage['45a.onboarding.tour'] = 'completed' after Beat 3. The
// header "[ ? ] tour" pill re-triggers the tour on demand and does NOT touch the
// key. The grid is restricted to the eight leaderboard teams (data.jsx) so no
// new probability is introduced.

const { useState: useStateB, useEffect: useEffectB, useRef: useRefB } = React;

const TOUR_KEY = '45a.onboarding.tour';
function tourDone()     { try { return localStorage.getItem(TOUR_KEY) === 'completed'; } catch (e) { return false; } }
function markTourDone() { try { localStorage.setItem(TOUR_KEY, 'completed'); } catch (e) {} }

function MonoBtnB({ label, onClick, disabled, primary }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily:'var(--font-mono)', fontSize:12, letterSpacing:'0.04em',
      padding:'10px 18px', cursor: disabled ? 'default' : 'pointer',
      border:`1px solid ${disabled ? 'var(--border-subtle)' : (primary ? 'var(--accent-warm)' : 'var(--border-default)')}`,
      background: primary && !disabled ? 'color-mix(in oklch, var(--accent-warm) 12%, transparent)' : 'transparent',
      color: disabled ? 'var(--text-quiet)' : (primary ? 'var(--accent-warm)' : 'var(--text-primary)'),
      opacity: disabled ? 0.5 : 1, transition:'border-color 120ms, color 120ms, background 120ms',
    }}>{label}</button>
  );
}

// ── Header with the always-visible replay pill ─────────────────────────────
function SimHeaderB({ onReplay, onExit }) {
  return (
    <header style={{ background:'var(--bg-root)', position:'sticky', top:0, zIndex:30, borderBottom:'1px solid var(--border-default)' }}>
      <div style={{ maxWidth:1440, margin:'0 auto', padding:'11px 24px', display:'flex', alignItems:'center', gap:20 }}>
        <button onClick={onExit} title="Back to the homepage" style={{
          fontFamily:'var(--font-serif)', fontSize:15, letterSpacing:'-0.01em', color:'var(--text-primary)',
          background:'none', border:'none', cursor:'pointer', padding:0, fontWeight:400, whiteSpace:'nowrap',
        }}>The <span style={{ fontWeight:600 }}>45%</span> Problem</button>
        <div className="mono" style={{ fontSize:10, letterSpacing:'0.05em', color:'var(--text-quiet)', textTransform:'uppercase', whiteSpace:'nowrap' }}>Scenario Simulator</div>
        <div style={{ flex:1 }} />
        {/* Replay pill — always visible, re-triggers the tour on demand. */}
        <button onClick={onReplay} title="Replay the walk-through" style={{
          fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:'0.06em', color:'var(--text-tertiary)',
          background:'transparent', border:'1px solid var(--border-subtle)', borderRadius:4,
          padding:'5px 10px', cursor:'pointer', transition:'color 120ms, border-color 120ms',
        }}
        onMouseEnter={e=>{ e.currentTarget.style.color='var(--text-primary)'; e.currentTarget.style.borderColor='var(--border-default)'; }}
        onMouseLeave={e=>{ e.currentTarget.style.color='var(--text-tertiary)'; e.currentTarget.style.borderColor='var(--border-subtle)'; }}
        >[ ? ] tour</button>
        <div className="mono" style={{ fontSize:10, color:'var(--text-quiet)', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background:'var(--edge-positive)', display:'inline-block' }} />
          snap {SNAPSHOT.id}
        </div>
      </div>
      <div style={{ borderTop:'1px solid var(--border-subtle)', background:'var(--bg-panel)' }}>
        <div style={{ maxWidth:1440, margin:'0 auto', padding:'5px 24px', fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-quiet)', display:'flex', justifyContent:'space-between' }}>
          <span>Research publication · nothing here is investment or gambling advice · <span style={{ opacity:0.6 }}>{SNAPSHOT.osf}</span></span>
          <span style={{ whiteSpace:'nowrap', opacity:0.55 }}>WC 2026 · phase: group stage open</span>
        </div>
      </div>
    </header>
  );
}

// ── Spotlight wrapper — lifts a region above the scrim at full opacity ──────
function Spotlight({ active, children, style }) {
  return (
    <div style={{
      position:'relative',
      zIndex: active ? 71 : 'auto',
      background: active ? 'var(--bg-root)' : 'transparent',
      borderRadius: active ? 8 : 0,
      boxShadow: active ? '0 0 0 1px var(--accent-warm), 0 0 0 6px color-mix(in oklch, var(--accent-warm) 14%, transparent)' : 'none',
      transition:'box-shadow 160ms ease-out',
      ...style,
    }}>{children}</div>
  );
}

// ── Coachmark bubble ────────────────────────────────────────────────────────
function BeatBubble({ n, total, head, body, onNext, nextLabel, onDismiss, style, reduced }) {
  return (
    <div style={{
      zIndex:72, position:'relative',
      maxWidth:380, background:'var(--bg-panel-elev)', border:'1px solid var(--border-default)',
      borderRadius:10, boxShadow:'0 12px 40px rgba(0,0,0,0.45)', padding:'18px 20px',
      animation: reduced ? 'none' : 'bubbleIn 200ms cubic-bezier(0.4,0,0.2,1)',
      ...style,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span className="mono" style={{ fontSize:10, letterSpacing:'0.06em', color:'var(--accent-warm)', whiteSpace:'nowrap' }}>BEAT {n} / {total}</span>
        <button onClick={onDismiss} aria-label="Dismiss the tour" style={{
          width:22, height:22, borderRadius:5, border:'none', background:'transparent',
          color:'var(--text-quiet)', cursor:'pointer', fontFamily:'var(--font-mono)', fontSize:12,
        }}>✕</button>
      </div>
      <h3 style={{ fontFamily:'var(--font-serif)', fontWeight:400, fontSize:19, lineHeight:1.25, margin:'0 0 8px', color:'var(--text-primary)', letterSpacing:'-0.01em' }}>{head}</h3>
      <p style={{ fontFamily:'var(--font-sans)', fontSize:13.5, lineHeight:1.55, color:'var(--text-tertiary)', margin:0 }}>{body}</p>
      {onNext && (
        <div style={{ marginTop:14, display:'flex', alignItems:'center', gap:12 }}>
          <MonoBtnB label={nextLabel || 'NEXT →'} onClick={onNext} primary />
        </div>
      )}
    </div>
  );
}

// ── Mode picker (Beat 1 target) ─────────────────────────────────────────────
function ModeCards({ onSelect, selected }) {
  const [hovered, setHovered] = useStateB(null);
  const modes = [
    { id:'A', code:'FINAL FOUR',      headline:'Who makes the semifinals?',  body:'Pick four teams. See how often the model agrees.', time:'30 seconds.' },
    { id:'B', code:"CHAMPION'S PATH", headline:"Tell us your team's story.",  body:'Round by round, opponent by opponent. We build the sentence as you click.', time:'About a minute.' },
    { id:'C', code:'FULL BRACKET',    headline:'Call the whole tournament.',  body:'Every match from the Round of 16 to the Final. For the obsessives.', time:'A few minutes.' },
  ];
  return (
    <div style={{ padding:'8px' }}>
      <div className="mono" style={{ fontSize:10, letterSpacing:'0.06em', color:'var(--text-quiet)', textTransform:'uppercase', marginBottom:16, paddingLeft:16 }}>Choose your mode</div>
      <div className="grid-modes">
        {modes.map((m, i) => {
          const active = hovered === m.id || selected === m.id;
          return (
            <button key={m.id}
              onMouseEnter={()=>setHovered(m.id)} onMouseLeave={()=>setHovered(null)}
              onClick={()=>onSelect(m.id)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'flex-start', textAlign:'left',
                padding:'28px 24px', cursor:'pointer', outline:'none',
                background: active ? 'color-mix(in oklch, var(--accent-warm) 6%, transparent)' : 'transparent',
                border:'1px solid var(--border-default)', marginLeft: i>0 ? -1 : 0,
                transition:'background 120ms',
              }}>
              <div className="mono" style={{ fontSize:11, letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:12, whiteSpace:'nowrap',
                color: active ? 'var(--accent-warm)' : 'var(--text-quiet)', transition:'color 120ms' }}>{m.code}</div>
              <div style={{ fontFamily:'var(--font-serif)', fontSize:18, fontWeight:400, color:'var(--text-primary)', marginBottom:8, letterSpacing:'-0.01em', lineHeight:1.25 }}>{m.headline}</div>
              <div style={{ fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-tertiary)', lineHeight:1.5, marginBottom:16, flex:1 }}>{m.body}</div>
              <div style={{ fontFamily:'var(--font-sans)', fontSize:12, color:'var(--text-quiet)', opacity:0.7, whiteSpace:'nowrap' }}>{m.time}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Final Four grid (Beat 2 target) ─────────────────────────────────────────
function FinalFourGrid({ picks, onToggle }) {
  return (
    <div style={{ padding:'20px' }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:16 }}>
        <div>
          <div className="mono" style={{ fontSize:10, letterSpacing:'0.06em', color:'var(--accent-warm)', textTransform:'uppercase', marginBottom:6 }}>Final Four</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize:20, fontWeight:400, color:'var(--text-primary)', letterSpacing:'-0.01em' }}>Pick the four teams you think reach the semifinals.</div>
        </div>
        <div className="mono" style={{ fontSize:13, color: picks.length===4 ? 'var(--accent-warm)' : 'var(--text-quiet)', whiteSpace:'nowrap' }}>{picks.length} / 4</div>
      </div>
      <div className="grid-ff">
        {TOURNAMENT.map(t => {
          const on = picks.includes(t.team);
          const full = picks.length >= 4 && !on;
          return (
            <button key={t.team} onClick={()=>onToggle(t.team)} disabled={full}
              style={{
                display:'flex', flexDirection:'column', alignItems:'flex-start', gap:10,
                padding:'16px 16px', textAlign:'left', cursor: full ? 'default' : 'pointer',
                background: on ? 'color-mix(in oklch, var(--accent-warm) 10%, transparent)' : 'var(--bg-panel)',
                border:`1px solid ${on ? 'var(--accent-warm)' : 'var(--border-subtle)'}`,
                borderRadius:6, opacity: full ? 0.45 : 1, outline:'none',
                transition:'background 120ms, border-color 120ms, opacity 120ms',
              }}>
              <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ width:24, height:16, borderRadius:2, background:'var(--bg-panel-elev)', border:'1px solid var(--border-subtle)',
                  display:'inline-flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-tertiary)' }}>{t.code}</span>
                <span style={{ fontFamily:'var(--font-sans)', fontSize:14, color:'var(--text-primary)' }}>{t.team}</span>
              </span>
              <span className="mono" style={{ fontSize:10, color:'var(--text-quiet)' }}>p · champ {(t.p*100).toFixed(1)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Corner mini-bracket animation (Beat 2) ──────────────────────────────────
function MiniBracketAnim({ reduced }) {
  const [fills, setFills] = useStateB(reduced ? [1,1,1,1] : [0,0,0,0]);
  const [resolved, setResolved] = useStateB(reduced);
  useEffectB(() => {
    if (reduced) return;
    const timers = [];
    [0,1,2,3].forEach((i) => timers.push(setTimeout(() => setFills(f => { const n=[...f]; n[i]=1; return n; }), 180 + i*230)));
    timers.push(setTimeout(() => setResolved(true), 1300));
    return () => timers.forEach(clearTimeout);
  }, [reduced]);
  return (
    <div style={{
      zIndex:72, position:'relative',
      width:200, background:'var(--bg-panel-elev)', border:'1px solid var(--border-default)',
      borderRadius:10, boxShadow:'0 12px 40px rgba(0,0,0,0.45)', padding:'14px 16px',
    }}>
      <div className="mono" style={{ fontSize:9, letterSpacing:'0.06em', color:'var(--text-quiet)', textTransform:'uppercase', marginBottom:10 }}>Sampling the distribution</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:12 }}>
        {fills.map((f, i) => (
          <div key={i} style={{ display:'flex', flexDirection:'column', gap:3 }}>
            {[0,1,2].map(r => (
              <div key={r} style={{ height:5, borderRadius:1, background: f ? TOURNAMENT[(i+r)%TOURNAMENT.length].color : 'var(--bg-panel)',
                opacity: f ? 1 : 0.5, transition:'background 160ms ease-out, opacity 160ms ease-out' }} />
            ))}
          </div>
        ))}
      </div>
      <div style={{ borderTop:'1px solid var(--rule)', paddingTop:10, display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
        <span className="mono" style={{ fontSize:9, color:'var(--text-quiet)', letterSpacing:'0.04em' }}>COMPOSITE</span>
        <span className="mono" style={{ fontSize:18, color: resolved ? 'var(--text-primary)' : 'var(--text-quiet)', letterSpacing:'-0.01em',
          opacity: resolved ? 1 : 0.4, transition:'opacity 180ms ease-out, color 180ms ease-out', fontVariantNumeric:'tabular-nums' }}>
          {resolved ? `${(LEADER.p*100).toFixed(1)}%` : '··· %'}
        </span>
      </div>
    </div>
  );
}

// ── Reality bar ──────────────────────────────────────────────────────────────
function RealityBarB({ pending, score, bandVisible }) {
  return (
    <div style={{ position:'sticky', top:0, zIndex:20, background:'var(--bg-root)', borderBottom:'1px solid var(--border-default)',
      display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 24px' }}>
      <div>
        <div className="mono" style={{ fontSize:10, letterSpacing:'0.06em', opacity:0.6, textTransform:'uppercase', color:'var(--text-primary)', marginBottom:2 }}>Reality Score</div>
        {pending ? (
          <div style={{ fontFamily:'var(--font-sans)', fontSize:20, color:'var(--text-quiet)' }}>Pick four teams to see your score.</div>
        ) : (
          <>
            <div className="mono" style={{ fontSize:56, fontWeight:500, letterSpacing:'-0.02em', color:'var(--text-primary)', lineHeight:1, fontVariantNumeric:'tabular-nums' }}>
              {(score.count/score.total*100).toFixed(2)}%
            </div>
            <div className="mono" style={{ fontSize:12, opacity:0.55, color:'var(--text-primary)', marginTop:4, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>
              {score.count.toLocaleString()} / {score.total.toLocaleString()} simulated tournaments
            </div>
            {bandVisible && (
              <div style={{ fontFamily:'var(--font-serif)', fontSize:18, color:'var(--text-primary)', marginTop:4, letterSpacing:'-0.01em' }}>{score.band.label}.</div>
            )}
          </>
        )}
      </div>
      <div className="mono" style={{ fontSize:10, color:'var(--text-quiet)', textAlign:'right', lineHeight:1.9, opacity:0.7 }}>
        <div>MODEL SHA {SNAPSHOT.sha}</div>
        <div>SNAPSHOT {SNAPSHOT.id}</div>
        <div>N={SNAPSHOT.mcRuns.toLocaleString()} Monte Carlo simulations</div>
      </div>
    </div>
  );
}

// ── Beat 3 comparison composition ────────────────────────────────────────────
function FourList({ title, align, teams, otherSet, reduced, delay }) {
  return (
    <div style={{
      animation: reduced ? 'none' : `slideIn${align==='left'?'L':'R'} 520ms cubic-bezier(0.4,0,0.2,1) ${delay}ms both`,
    }}>
      <div className="mono" style={{ fontSize:10, letterSpacing:'0.06em', color:'var(--text-quiet)', textTransform:'uppercase', marginBottom:14, textAlign: align==='right'?'right':'left' }}>{title}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {teams.map(name => {
          const t = TOURNAMENT.find(x=>x.team===name);
          const agree = otherSet.includes(name);
          return (
            <div key={name} style={{ display:'flex', alignItems:'center', gap:10, justifyContent: align==='right'?'flex-end':'flex-start',
              flexDirection: align==='right'?'row-reverse':'row' }}>
              <span style={{ width:26, height:17, borderRadius:2, background:'var(--bg-panel)', border:'1px solid var(--border-subtle)',
                display:'inline-flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-tertiary)' }}>{t?.code}</span>
              <span style={{ fontFamily:'var(--font-sans)', fontSize:15, color:'var(--text-primary)' }}>{name}</span>
              <span style={{ width:6, height:6, borderRadius:'50%', background: agree ? 'var(--edge-positive)' : 'var(--border-default)' }} title={agree?'Model agrees':'Model differs'} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Beat3Comparison({ picks, model, score, reduced, onReplay, onReset, children }) {
  return (
    <div style={{ maxWidth:1000, margin:'0 auto', padding:'48px 24px 64px' }}>
      <h2 style={{ fontFamily:'var(--font-serif)', fontSize:24, fontWeight:400, color:'var(--text-primary)', margin:'0 0 32px', letterSpacing:'-0.015em' }}>Your call, beside the model&rsquo;s.</h2>
      <div style={{ position:'relative', background:'var(--bg-panel)', border:'1px solid var(--border-default)', borderRadius:6, padding:'32px 36px' }} className="grid-compare">
        <FourList title="Your Final Four" align="left" teams={picks} otherSet={model} reduced={reduced} delay={0} />
        <div className="rule-v" style={{ alignSelf:'stretch', width:1, background:'var(--border-default)', transformOrigin:'top',
          animation: reduced ? 'none' : 'drawRule 420ms ease-out 260ms both' }} />
        <FourList title="Model's median Final Four" align="right" teams={model} otherSet={picks} reduced={reduced} delay={120} />
      </div>

      {/* Rarity badge resolves at the bottom */}
      <div style={{ marginTop:24, border:'1px solid var(--border-default)', background:'var(--bg-panel-elev)', borderRadius:6, padding:'24px 28px',
        animation: reduced ? 'none' : 'badgeIn 360ms cubic-bezier(0.4,0,0.2,1) 700ms both' }}>
        <div className="mono" style={{ fontSize:10, letterSpacing:'0.06em', color:'var(--text-quiet)', textTransform:'uppercase', marginBottom:10 }}>Reality Score</div>
        <div style={{ fontFamily:'var(--font-serif)', fontSize:32, fontWeight:400, color:'var(--text-primary)', letterSpacing:'-0.015em', lineHeight:1, marginBottom:6 }}>{score.band.label}.</div>
        <div style={{ fontFamily:'var(--font-sans)', fontSize:14, color:'var(--text-tertiary)', marginBottom:18 }}>{score.band.caption}</div>
        <div style={{ display:'flex', alignItems:'baseline', gap:16, flexWrap:'wrap' }}>
          <span className="mono" style={{ fontSize:56, fontWeight:500, color:'var(--text-primary)', letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums', lineHeight:1 }}>{(score.count/score.total*100).toFixed(2)}%</span>
          <span className="mono" style={{ fontSize:15, color:'var(--text-primary)', opacity:0.7, fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap' }}>{score.oneInN} simulated tournaments matched your call.</span>
        </div>
        <div className="mono" style={{ fontSize:11, color:'var(--text-quiet)', marginTop:10, opacity:0.6 }}>{score.count.toLocaleString()} / {score.total.toLocaleString()} · derived from model semifinal probabilities</div>

        {/* "do not implement" provenance tag — this score is an illustrative demo */}
        <div className="mono" style={{ display:'inline-block', marginTop:16, fontSize:9, letterSpacing:'0.06em', color:'var(--text-quiet)', whiteSpace:'nowrap',
          border:'1px dashed var(--border-default)', borderRadius:4, padding:'3px 8px' }}>◆ ILLUSTRATIVE DEMO VALUE · DO NOT IMPLEMENT AS HARDCODED</div>
      </div>

      {/* Soft email capture slot */}
      {children}

      <div style={{ marginTop:24, borderTop:'1px solid var(--rule)', paddingTop:20, display:'flex', gap:12, flexWrap:'wrap' }}>
        <MonoBtnB label="TRY ANOTHER PREDICTION" onClick={onReset} />
        <MonoBtnB label="[ ? ] REPLAY TOUR" onClick={onReplay} />
      </div>
    </div>
  );
}

// ── Soft email capture (reuses the EmailGate register) ───────────────────────
function SoftEmailCapture({ score, onDismiss, reduced }) {
  const [email, setEmail] = useStateB('');
  const [done, setDone] = useStateB(false);
  const valid = email.includes('@') && email.includes('.');
  function submit(e) { e.preventDefault(); if (!valid) return; setDone(true); setTimeout(onDismiss, 1400); }
  return (
    <div style={{ marginTop:24, border:'1px solid var(--border-subtle)', background:'var(--bg-panel)', borderRadius:6, padding:'22px 26px',
      animation: reduced ? 'none' : 'badgeIn 320ms ease-out both' }}>
      {done ? (
        <div style={{ fontFamily:'var(--font-serif)', fontSize:16, color:'var(--text-primary)' }}>Recorded. We&rsquo;ll send one email when the tournament ends.</div>
      ) : (
        <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
          <div style={{ flex:'1 1 280px', minWidth:240 }}>
            <div style={{ fontFamily:'var(--font-sans)', fontSize:14, color:'var(--text-primary)', lineHeight:1.5 }}>
              We&rsquo;ll send you one email when the tournament ends, comparing your call to the model&rsquo;s.
            </div>
            <div style={{ fontFamily:'var(--font-sans)', fontSize:12, color:'var(--text-quiet)', marginTop:4 }}>No marketing. One email, then nothing.</div>
          </div>
          <form onSubmit={submit} style={{ display:'flex', alignItems:'stretch', gap:0, flex:'1 1 320px', minWidth:280 }}>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@firm.com"
              style={{ flex:1, fontFamily:'var(--font-mono)', fontSize:13, color:'var(--text-primary)', background:'var(--bg-panel-elev)',
                border:'1px solid var(--border-default)', borderRight:'none', borderRadius:'4px 0 0 4px', padding:'9px 12px', outline:'none' }} />
            <button type="submit" disabled={!valid} style={{
              fontFamily:'var(--font-mono)', fontSize:12, letterSpacing:'0.04em', padding:'9px 16px', whiteSpace:'nowrap',
              border:`1px solid ${valid?'var(--accent-warm)':'var(--border-default)'}`, borderRadius:'0 4px 4px 0',
              background: valid ? 'color-mix(in oklch, var(--accent-warm) 12%, transparent)' : 'transparent',
              color: valid ? 'var(--accent-warm)' : 'var(--text-quiet)', cursor: valid?'pointer':'default' }}>NOTIFY ME</button>
          </form>
          <button onClick={onDismiss} aria-label="Dismiss" style={{
            fontFamily:'var(--font-sans)', fontSize:13, color:'var(--text-quiet)', background:'none', border:'none', cursor:'pointer', whiteSpace:'nowrap' }}>No thanks</button>
        </div>
      )}
    </div>
  );
}

// ── Controller ────────────────────────────────────────────────────────────────
function SurfaceB({ reduced, forceTour, onExit }) {
  // simPhase: 'mode-select' | 'building' | 'result'
  const [simPhase, setSimPhase] = useStateB('mode-select');
  const [beat, setBeat] = useStateB(() => (forceTour || !tourDone()) ? 1 : 0);
  const [mode, setMode] = useStateB(null);
  const [picks, setPicks] = useStateB([]);
  const [beat2Faded, setBeat2Faded] = useStateB(false);
  const [showEmail, setShowEmail] = useStateB(false);
  const [emailDismissed, setEmailDismissed] = useStateB(false);
  const [bandVisible, setBandVisible] = useStateB(false);

  const model = modelMedianFour();
  const score = picks.length === 4 ? finalFourScore(picks) : null;

  // Esc dismisses an active tour beat (self-evident dismissal).
  useEffectB(() => {
    function onKey(e) { if (e.key === 'Escape' && beat > 0 && beat < 3) endTour(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [beat]);

  // Beat 3: reveal band + soft email capture on a short sequence.
  useEffectB(() => {
    if (simPhase !== 'result') return;
    const t1 = setTimeout(() => setBandVisible(true), reduced ? 0 : 900);
    const t2 = setTimeout(() => { if (!emailDismissed) setShowEmail(true); }, reduced ? 0 : 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [simPhase, reduced, emailDismissed]);

  function endTour() { markTourDone(); setBeat(0); }

  function replayTour() {
    // Re-trigger from Beat 1 — re-arms the live hover-preview on the mode cards.
    // Does NOT touch the tour-completed key.
    setSimPhase('mode-select'); setMode(null); setPicks([]);
    setBeat2Faded(false); setShowEmail(false); setEmailDismissed(false); setBandVisible(false);
    setBeat(1);
  }

  function selectMode(m) {
    setMode(m);
    if (m === 'A') {
      setSimPhase('building');
      if (beat === 1) setBeat(2);    // advance the tour with the mode selected
    } else {
      // Modes B/C are out of scope for this walk-through demo; route to A's grid
      // but keep the same beat so the tour stays coherent.
      setSimPhase('building');
      if (beat === 1) setBeat(2);
      setMode('A');
    }
  }

  function togglePick(team) {
    setPicks(prev => {
      const has = prev.includes(team);
      const next = has ? prev.filter(t=>t!==team) : (prev.length<4 ? [...prev, team] : prev);
      // Beat 2 fades after the first pick is registered.
      if (!has && prev.length === 0 && beat === 2) setBeat2Faded(true);
      return next;
    });
  }

  function submit() {
    if (picks.length !== 4) return;
    setSimPhase('result');
    if (beat === 2) { setBeat(3); markTourDone(); }  // Beat 3 completes the tour
  }

  function resetSim() {
    setSimPhase('mode-select'); setMode(null); setPicks([]);
    setBeat2Faded(false); setShowEmail(false); setEmailDismissed(false); setBandVisible(false);
    setBeat(0);
  }

  const scrimOn = (beat === 1) || (beat === 2 && !beat2Faded);

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-root)' }} data-canvas="quant-scope">
      <SimHeaderB onReplay={replayTour} onExit={onExit} />

      {/* Scrim — dims the real UI to ~32% while a coachmark is up */}
      {scrimOn && (
        <div onClick={endTour} style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(10,9,8,0.68)',
          animation: reduced ? 'none' : 'overlayIn 160ms ease-out' }} />
      )}

      {/* Reality bar — building + result */}
      {(simPhase === 'building' || simPhase === 'result') && (
        <RealityBarB pending={simPhase==='building' || !score} score={score || {count:0,total:SNAPSHOT.mcRuns,band:{label:''}}} bandVisible={false} />
      )}

      <div style={{ maxWidth:1440, margin:'0 auto', padding:'32px 24px 80px' }}>
        {simPhase === 'mode-select' && (
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            <Spotlight active={beat===1}><ModeCards onSelect={selectMode} selected={mode} /></Spotlight>
            {beat === 1 && (
              <BeatBubble n={1} total={3} reduced={reduced}
                head="You make a call."
                body={<>Pick a mode. <strong style={{color:'var(--text-secondary)'}}>Final Four</strong> is 30 seconds. <strong style={{color:'var(--text-secondary)'}}>Champion&rsquo;s Path</strong> tells one team&rsquo;s story. <strong style={{color:'var(--text-secondary)'}}>Full Bracket</strong> is for the obsessives.</>}
                onDismiss={endTour}
                style={{ alignSelf:'center' }} />
            )}
          </div>
        )}

        {simPhase === 'building' && (
          <div className={`sim-build${beat===2 && !beat2Faded ? ' with-bubble' : ''}`}>
            <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
              <Spotlight active={beat===2 && !beat2Faded}><FinalFourGrid picks={picks} onToggle={togglePick} /></Spotlight>
              <div style={{ display:'flex', gap:12, alignItems:'center', paddingLeft:20 }}>
                <MonoBtnB label="SUBMIT PREDICTION →" onClick={submit} disabled={picks.length!==4} primary />
                {picks.length>0 && <MonoBtnB label="CLEAR" onClick={()=>setPicks([])} />}
              </div>
            </div>
            {beat === 2 && !beat2Faded && (
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <BeatBubble n={2} total={3} reduced={reduced}
                  head="We run 10,000 simulations against your call."
                  body={<>Each night the model simulates the tournament {SNAPSHOT.mcRuns.toLocaleString()} times. When you pick, we count how many of those runs match. The closer your call to the model&rsquo;s median, the more often it agrees.</>}
                  onDismiss={endTour} />
                <MiniBracketAnim reduced={reduced} />
              </div>
            )}
          </div>
        )}

        {simPhase === 'result' && score && (
          <Beat3Comparison picks={picks} model={model} score={score} reduced={reduced} onReplay={replayTour} onReset={resetSim}>
            {showEmail && !emailDismissed && (
              <SoftEmailCapture score={score} reduced={reduced} onDismiss={()=>{ setShowEmail(false); setEmailDismissed(true); }} />
            )}
          </Beat3Comparison>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { SurfaceB, TOUR_KEY });
