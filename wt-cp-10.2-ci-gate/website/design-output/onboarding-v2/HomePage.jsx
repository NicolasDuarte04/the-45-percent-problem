// ─────────────────────────────────────────────────────────────────────────
// HomePage.jsx · faithful recreation of the editorial home (Surface A backdrop)
// ─────────────────────────────────────────────────────────────────────────
// This is the EXISTING homepage. The onboarding never touches it — it is
// reproduced here unchanged so Surface A can sit on top of a real page. Masthead,
// trophy hero, OSF pre-registration line, "Receive the daily brief" CTA,
// leaderboard with flags, featured divergences, calibration, vault.

const { useState: useStateHome } = React;

function FlagChip({ code }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:22, height:15, borderRadius:2, marginRight:10,
      background:'var(--bg-panel)', border:'1px solid var(--rule)',
      fontFamily:'var(--font-mono)', fontSize:8, letterSpacing:'0.02em',
      color:'var(--text-tertiary)', verticalAlign:'middle', flexShrink:0,
    }}>{code}</span>
  );
}

// ── Masthead — accepts an onHelp slot for Surface A's persistent "?" link ──
function HomeMasthead({ page, setPage, onHelp, pulse }) {
  const tabs = ['Overview', 'Matches', 'Ledger', 'Essays', 'Vault'];
  return (
    <header style={{ borderBottom:'1px solid var(--rule)', background:'var(--bg-root)', position:'sticky', top:0, zIndex:30 }}>
      <div style={{ maxWidth:1152, margin:'0 auto', padding:'22px 48px', display:'flex', alignItems:'baseline', gap:36 }}>
        <a href="#" onClick={e=>{e.preventDefault(); setPage('home');}} style={{
          fontFamily:'var(--font-serif)', fontSize:24, letterSpacing:'-0.015em',
          color:'var(--text-primary)', textDecoration:'none', whiteSpace:'nowrap',
        }}>The <span style={{ color:'rgb(15, 107, 125)' }}>45%</span> Problem</a>
        <nav style={{ display:'flex', gap:24, flex:1, alignItems:'baseline' }}>
          {tabs.map(t => {
            const id = t.toLowerCase();
            const active = page === id;
            return (
              <a key={t} href="#" onClick={e=>e.preventDefault()} style={{
                fontFamily:'var(--font-sans)', fontSize:13,
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                textDecoration:'none',
                borderBottom: active ? '1.5px solid var(--text-primary)' : '1.5px solid transparent',
                paddingBottom:22, marginBottom:-23,
              }}>{t}</a>
            );
          })}
        </nav>
        {/* Surface A · persistent affordance — always available, even after dismiss */}
        <button
          onClick={onHelp}
          className={pulse ? 'help-pulse' : ''}
          aria-label="First time here? Read a 90-second orientation"
          title="First time here?"
          style={{
            fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:'0.04em',
            color:'var(--text-tertiary)', background:'transparent',
            border:'1px solid var(--rule)', borderRadius:6,
            padding:'0 10px', height:30, cursor:'pointer', whiteSpace:'nowrap',
            display:'inline-flex', alignItems:'center', gap:6,
            transition:'color 120ms ease-out, border-color 120ms ease-out',
          }}
          onMouseEnter={e=>{ e.currentTarget.style.color='var(--text-primary)'; e.currentTarget.style.borderColor='var(--border-default)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.color='var(--text-tertiary)'; e.currentTarget.style.borderColor='var(--rule)'; }}
        >First time?</button>
        <a href="#" onClick={e=>{e.preventDefault(); setPage('terminal');}} style={{
          fontFamily:'var(--font-sans)', fontSize:13, fontWeight:500,
          background:'#141414', color:'#F7F4EC',
          padding:'0 14px', height:32, display:'inline-flex', alignItems:'center', gap:6,
          borderRadius:6, textDecoration:'none', whiteSpace:'nowrap',
        }}>Open terminal <span style={{opacity:.6}}>→</span></a>
      </div>
    </header>
  );
}

function HomeEyebrow({ children }) {
  const render = typeof children === 'string'
    ? children.split(/(§)/).map((part, i) => part === '§'
        ? <span key={i} style={{ color:'var(--brand-accent)' }}>§</span>
        : <span key={i}>{part}</span>)
    : children;
  return <div className="mono" style={{
    fontSize:11, letterSpacing:'.08em', textTransform:'uppercase',
    color:'var(--text-tertiary)', marginBottom:14,
  }}>{render}</div>;
}

// ── Hero: trophy + headline + OSF line + daily-brief CTA ──────────────────
function HomeHero() {
  return (
    <header style={{ marginBottom:64 }} className="grid-hero">
      <div>
        <div className="mono" style={{ fontSize:11, letterSpacing:'.08em', textTransform:'uppercase', color:'var(--text-tertiary)', marginBottom:18 }}>
          Probabilistic pricing · FIFA World Cup 2026
        </div>
        <h1 style={{
          fontFamily:'var(--font-serif)', fontWeight:400, letterSpacing:'-0.025em',
          lineHeight:1.05, fontSize:'clamp(2.5rem, 5vw, 3.25rem)', margin:'0 0 24px',
          color:'var(--text-primary)', maxWidth:'18ch',
        }}>The 45% Problem</h1>
        <p style={{ fontSize:18, lineHeight:1.7, color:'var(--text-secondary)', margin:'0 0 20px', maxWidth:'64ch' }}>
          M★ is a bivariate Poisson model with Dixon-Coles correction, calibrated on international
          match data and compared nightly to bookmaker-implied probabilities. The &ldquo;45% problem&rdquo;
          refers to a systematic divergence documented in Phase 1: market-implied championship
          probabilities for mid-tier contenders cluster near 45% of their model-implied values.
        </p>
        <p style={{ fontSize:13, color:'var(--text-tertiary)', margin:'0 0 28px' }}>
          Pre-registered at <a href="#" onClick={e=>e.preventDefault()} style={{ color:'#0F6B7D', fontWeight:500 }}>{SNAPSHOT.osf}</a> ·
          tag <span className="mono" style={{ color:'var(--data-neutral)' }}>{SNAPSHOT.tag}</span> ·
          Phase: {SNAPSHOT.phase} · <span className="mono">{SNAPSHOT.remaining}</span> matches remaining
        </p>
        <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <a href="#" onClick={e=>e.preventDefault()} style={{
            fontFamily:'var(--font-sans)', fontSize:13, fontWeight:500,
            background:'#141414', color:'#F7F4EC', padding:'0 18px', height:38,
            display:'inline-flex', alignItems:'center', gap:8, borderRadius:6, textDecoration:'none',
          }}>Receive the daily brief <span style={{opacity:.6}}>→</span></a>
          <a href="#" onClick={e=>e.preventDefault()} style={{
            fontFamily:'var(--font-sans)', fontSize:13, fontWeight:500,
            color:'var(--text-primary)', border:'1px solid var(--border-default)', borderRadius:6,
            padding:'0 16px', height:38, display:'inline-flex', alignItems:'center', textDecoration:'none',
          }}>Read the brief</a>
        </div>
      </div>
      <figure style={{ margin:0, justifySelf:'end' }}>
        <img src="assets/trophy_point_cloud.svg" alt="Quantitative World Cup trophy point cloud" className="trophy-settle"
             style={{ width:'100%', maxWidth:240, height:'auto', display:'block' }} />
      </figure>
    </header>
  );
}

function HomeSectionHead({ eyebrow, title, rightLabel }) {
  return (
    <div style={{ marginBottom:20, display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:16 }}>
      <div>
        <HomeEyebrow>{eyebrow}</HomeEyebrow>
        <h2 style={{ fontFamily:'var(--font-serif)', fontWeight:400, letterSpacing:'-0.015em', fontSize:28, lineHeight:1.2, margin:0, color:'var(--text-primary)' }}>{title}</h2>
      </div>
      {rightLabel && (
        <a href="#" onClick={e=>e.preventDefault()} style={{
          fontFamily:'var(--font-sans)', fontSize:12, fontWeight:500, color:'#141414', textDecoration:'none',
          border:'1px solid rgba(31,31,31,.28)', borderRadius:6, padding:'6px 12px',
          display:'inline-flex', alignItems:'center', gap:4, whiteSpace:'nowrap',
        }}>{rightLabel}</a>
      )}
    </div>
  );
}

function HomeLeaderboard({ rows }) {
  const max = Math.max(...rows.map(r=>r.p));
  return (
    <div style={{ background:'var(--bg-panel-elev)', border:'1px solid var(--rule)', borderRadius:16, padding:'22px 24px', boxShadow:'var(--shadow-card)' }} className="table-wrap">
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13, minWidth:560 }}>
        <thead><tr>
          {['Rank','Team','Championship probability','p · model','q · market','Δ'].map((h,i)=>(
            <th key={h} style={{ textAlign: i>=3?'right':'left', fontWeight:400, color:'var(--text-tertiary)', fontSize:11, padding:'0 0 10px', width: i===2?'38%':'auto' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={r.team} style={{ borderTop:'1px solid var(--rule)' }}>
              <td className="mono" style={{ padding:'10px 0', color:'var(--text-tertiary)', fontSize:12 }}>{String(i+1).padStart(2,'0')}</td>
              <td style={{ padding:'10px 16px 10px 0', color:'var(--text-primary)', fontFamily:'var(--font-sans)', fontSize:14, whiteSpace:'nowrap' }}>
                <FlagChip code={r.code} />{r.team}
              </td>
              <td style={{ padding:'10px 24px 10px 0' }}>
                <div style={{ height:6, background:'var(--bg-panel)', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${(r.p/max)*100}%`, height:'100%', background:r.color, borderRadius:3 }}/>
                </div>
              </td>
              <td className="mono" style={{ padding:'10px 0', textAlign:'right', color:'var(--text-primary)' }}>{(r.p*100).toFixed(1)}%</td>
              <td className="mono" style={{ padding:'10px 0', textAlign:'right', color:'var(--text-tertiary)' }}>{(r.q*100).toFixed(1)}%</td>
              <td className="mono" style={{ padding:'10px 0', textAlign:'right', color:(r.p-r.q)>=0?'var(--edge-positive)':'var(--edge-negative)' }}>
                {(r.p-r.q)>=0?'+':'−'}{Math.abs((r.p-r.q)*100).toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EdgeBadgeHome({ edge }) {
  const pos = edge >= 0;
  return (
    <span className="mono" style={{
      fontSize:12, padding:'2px 8px', borderRadius:4,
      color: pos ? 'var(--edge-positive)' : 'var(--edge-negative)',
      background: pos ? 'color-mix(in oklch, var(--prism-mint) 22%, transparent)' : 'color-mix(in oklch, var(--prism-rose) 22%, transparent)',
      fontVariantNumeric:'tabular-nums', whiteSpace:'nowrap',
    }}>{pos?'+':'−'}{Math.abs(edge*100).toFixed(1)}pp</span>
  );
}

function DivergenceCard({ row }) {
  return (
    <article style={{ background:'var(--bg-panel-elev)', border:'1px solid var(--rule)', borderRadius:16, padding:'20px 22px', boxShadow:'var(--shadow-card)' }}>
      <HomeEyebrow>Featured divergence · {row.kickoff}</HomeEyebrow>
      <h3 style={{ fontFamily:'var(--font-serif)', fontWeight:400, fontSize:22, margin:'0 0 6px', letterSpacing:'-0.01em', color:'var(--text-primary)' }}>{row.match}</h3>
      <p style={{ fontFamily:'var(--font-sans)', fontSize:14, color:'var(--text-secondary)', margin:'0 0 16px', lineHeight:1.6 }}>{row.blurb}</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr auto', columnGap:24, alignItems:'end', paddingTop:14, borderTop:'1px solid var(--rule)' }}>
        <div>
          <div className="mono" style={{ fontSize:10, color:'var(--text-tertiary)', letterSpacing:'.04em', marginBottom:4 }}>p · model</div>
          <div className="mono" style={{ fontSize:22, color:'var(--text-primary)', lineHeight:1 }}>{(row.p*100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="mono" style={{ fontSize:10, color:'var(--text-tertiary)', letterSpacing:'.04em', marginBottom:4 }}>q · market</div>
          <div className="mono" style={{ fontSize:22, color:'var(--text-tertiary)', lineHeight:1 }}>{(row.q*100).toFixed(1)}%</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div className="mono" style={{ fontSize:10, color:'var(--text-tertiary)', letterSpacing:'.04em', marginBottom:4, textAlign:'right' }}>edge</div>
          <div style={{ display:'flex', justifyContent:'flex-end', height:22, alignItems:'center' }}><EdgeBadgeHome edge={row.E} /></div>
        </div>
      </div>
    </article>
  );
}

function HomeMetric({ label, value }) {
  return (
    <div>
      <div className="mono" style={{ fontSize:10, color:'var(--text-tertiary)', letterSpacing:'.04em', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div className="mono" style={{ fontSize:24, color:'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

function HomeCalibration({ brier, logloss, nSettled }) {
  return (
    <div style={{ background:'var(--bg-panel-elev)', border:'1px solid var(--rule)', borderRadius:16, padding:'22px 24px', boxShadow:'var(--shadow-card)' }} className="grid-calib">
      <HomeMetric label="Brier (lower = better)" value={brier.toFixed(4)} />
      <HomeMetric label="Log-loss" value={logloss.toFixed(4)} />
      <HomeMetric label="Settled forecasts" value={nSettled.toLocaleString()} />
      <div style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.55 }}>
        Reliability tracks within <span className="mono">±2.1pp</span> of the diagonal across all deciles. Updated on each match settlement. <a href="#" onClick={e=>e.preventDefault()} style={{ color:'#0F6B7D', fontWeight:500 }}>Full diagram →</a>
      </div>
    </div>
  );
}

function VaultRowHome({ kind, title, authors, date, kicker }) {
  return (
    <a href="#" onClick={e=>e.preventDefault()} style={{ padding:'20px 0', borderBottom:'1px solid var(--rule)', textDecoration:'none' }} className="vault-row">
      <span className="mono" style={{ fontSize:11, color:'var(--text-tertiary)', letterSpacing:'.06em', textTransform:'uppercase' }}>{kind}</span>
      <div>
        <h4 style={{ fontFamily:'var(--font-serif)', fontWeight:400, fontSize:19, margin:'0 0 4px', color:'var(--text-primary)', letterSpacing:'-0.01em' }}>{title}</h4>
        <div style={{ fontSize:13, color:'var(--text-tertiary)' }}>{authors} · {kicker}</div>
      </div>
      <div className="mono vault-date" style={{ fontSize:11, color:'var(--text-tertiary)', textAlign:'right' }}>{date}</div>
    </a>
  );
}

// ── Full homepage ─────────────────────────────────────────────────────────
function HomePage({ onHelp, onOpenTerminal, helpPulse }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg-root)' }}>
      <HomeMasthead page="overview" setPage={(p)=>{ if (p==='terminal') onOpenTerminal(); }} onHelp={onHelp} pulse={helpPulse} />
      <div style={{ maxWidth:1152, margin:'0 auto', padding:'56px 48px 96px' }}>
        <HomeHero />

        <section style={{ marginBottom:56 }}>
          <HomeSectionHead eyebrow="§ 1 · Championship pricing" title="Tournament leaderboard" rightLabel="All 48 teams →" />
          <HomeLeaderboard rows={TOURNAMENT} />
        </section>

        <section style={{ marginBottom:56 }}>
          <HomeSectionHead eyebrow="§ 2 · This window" title="Featured divergences" rightLabel="Full terminal →" />
          <div className="grid-3">
            {FEATURED.map(r => <DivergenceCard key={r.id} row={r} />)}
          </div>
        </section>

        <section style={{ marginBottom:56 }}>
          <HomeSectionHead eyebrow="§ 3 · Calibration" title="How the model is doing" />
          <HomeCalibration {...CALIBRATION} />
        </section>

        <section style={{ marginBottom:56 }}>
          <HomeSectionHead eyebrow="§ 4 · Research vault" title="Recent writing" rightLabel="All essays →" />
          <div>{ESSAYS.map((e,i) => <VaultRowHome key={i} {...e} />)}</div>
        </section>

        <div style={{ background:'#141414', color:'#F7F4EC', border:'1px solid #141414', borderRadius:16, padding:'26px 28px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:20 }}>
          <div>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-serif)', fontSize:22, fontWeight:400, color:'#F7F4EC', letterSpacing:'-0.01em' }}>The quantitative surface lives one click away.</h3>
            <p style={{ margin:0, fontFamily:'var(--font-sans)', fontSize:14, color:'#A8AFBC', maxWidth:'52ch', lineHeight:1.55 }}>Every number on this page is traceable to a snapshot and a code SHA in the Divergence Terminal.</p>
          </div>
          <a href="#" onClick={e=>{e.preventDefault(); onOpenTerminal();}} style={{ fontFamily:'var(--font-sans)', fontSize:13, fontWeight:500, background:'#F7F4EC', color:'#141414', padding:'0 16px', height:36, display:'inline-flex', alignItems:'center', borderRadius:6, textDecoration:'none', whiteSpace:'nowrap' }}>Open terminal →</a>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomePage });
