'use client';
import { useState, useEffect, useCallback } from 'react';

// ── Local storage helpers for draft comparison (SSR-safe) ──
function saveDraftList(prospects) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem('hw-draft', JSON.stringify({ date: new Date().toDateString(), list: prospects.map(p => p.name).join(',') })); } catch(_) {}
}
function loadYesterdayDraftList() {
  if (typeof window === 'undefined') return null;
  try {
    const d = JSON.parse(localStorage.getItem('hw-draft') || 'null');
    if (!d || d.date === new Date().toDateString()) return null;
    return d.list;
  } catch(_) { return null; }
}

function getTimeUntil8AM() {
  const now = new Date(), next8 = new Date();
  next8.setHours(8, 0, 0, 0);
  if (now >= next8) next8.setDate(next8.getDate() + 1);
  const diff = next8 - now;
  return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) };
}
const pad = n => String(n).padStart(2, '0');

function ScoreRow({ game }) {
  const homeWon = game.homeScore > game.awayScore;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #141414' }}>
      <span style={{ flex: 1, fontSize: 13, color: homeWon ? '#e8e0d0' : '#555', fontWeight: homeWon ? 600 : 400 }}>{game.home}</span>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: homeWon ? '#f97316' : '#555', fontWeight: 700, minWidth: 32, textAlign: 'right' }}>{game.homeScore}</span>
      <span style={{ color: '#333', fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", minWidth: 16, textAlign: 'center' }}>—</span>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, color: !homeWon ? '#f97316' : '#555', fontWeight: 700, minWidth: 32 }}>{game.awayScore}</span>
      <span style={{ flex: 1, fontSize: 13, color: !homeWon ? '#e8e0d0' : '#555', fontWeight: !homeWon ? 600 : 400, textAlign: 'right' }}>{game.away}</span>
      {game.note && <span style={{ fontSize: 11, color: '#f97316', fontFamily: "'IBM Plex Mono',monospace", marginLeft: 8 }}>{game.note}</span>}
    </div>
  );
}

function StatsTable({ players, showPlusMinus, showDraftStar, showRelation, showAvgs }) {
  if (!players?.length) return null;
  return (
    <div className="table-wrap">
      <table className="stats-table">
        <thead>
          <tr>
            <th>Player</th>
            {showRelation && <th>Legacy</th>}
            <th>Team</th>
            <th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>FG</th>
            {showPlusMinus && <th>+/-</th>}
            {showAvgs && <><th>AVG PTS</th><th>AVG REB</th><th>AVG AST</th></>}
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={i}>
              <td style={{ color: '#e8e0d0', fontWeight: 500 }}>{p.name}{showDraftStar && p.isDraftProspect ? <span style={{ color: '#f97316', marginLeft: 4 }}>★</span> : ''}</td>
              {showRelation && <td style={{ color: '#888', fontSize: 11 }}>{p.relation}</td>}
              <td>{p.team}</td>
              <td style={{ color: '#f97316', fontWeight: 600 }}>{p.pts}</td>
              <td>{p.reb}</td><td>{p.ast}</td><td>{p.stl}</td><td>{p.blk}</td><td>{p.fg}</td>
              {showPlusMinus && <td style={{ color: String(p.plusMinus).startsWith('+') ? '#22c55e' : String(p.plusMinus).startsWith('-') ? '#ef4444' : '#888' }}>{p.plusMinus}</td>}
              {showAvgs && <><td style={{ color: '#666' }}>{p.avgPts}</td><td style={{ color: '#666' }}>{p.avgReb}</td><td style={{ color: '#666' }}>{p.avgAst}</td></>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DraftTable({ prospects }) {
  if (!prospects?.length) return null;
  return (
    <div className="table-wrap">
      <table className="stats-table">
        <thead><tr><th>#</th><th>Move</th><th>Player</th><th>School</th><th>Mock Pick</th><th>Notes</th></tr></thead>
        <tbody>
          {prospects.map((p, i) => {
            const c = String(p.change);
            const isUp = c.startsWith('+') && c !== '+0' && c !== '0';
            const isDown = c.startsWith('-');
            const isNew = c === 'NEW';
            const color = isUp ? '#22c55e' : isDown ? '#ef4444' : isNew ? '#f97316' : '#444';
            const label = isNew ? '🆕' : (c === '0' || c === '+0') ? '—' : isUp ? `▲${c.replace('+','')}` : `▼${c.replace('-','')}`;
            return (
              <tr key={i}>
                <td style={{ color: '#f97316', fontWeight: 700, fontFamily: "'IBM Plex Mono',monospace" }}>{p.rank}</td>
                <td style={{ color, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace" }}>{label}</td>
                <td style={{ color: '#e8e0d0', fontWeight: 500 }}>{p.name}</td>
                <td>{p.school}</td>
                <td style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{p.mockPick}</td>
                <td style={{ color: '#888', fontSize: 12 }}>{p.notes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UpsetTable({ upsets }) {
  if (!upsets?.length) return null;
  return (
    <div className="table-wrap">
      <table className="stats-table">
        <thead><tr><th>Game</th><th>Line</th><th>Result</th><th>Miss By</th><th>Context</th></tr></thead>
        <tbody>
          {upsets.map((u, i) => (
            <tr key={i}>
              <td style={{ color: '#e8e0d0', fontWeight: 500 }}>{u.game}</td>
              <td style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#f97316' }}>{u.line}</td>
              <td>{u.result}</td>
              <td style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#ef4444', fontWeight: 600 }}>{u.beatBy}</td>
              <td style={{ color: '#888', fontSize: 12 }}>{u.context}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div className="section-header">{title}</div>
      {children}
    </div>
  );
}

function Context({ text }) {
  if (!text) return null;
  return <p style={{ fontSize: 14, lineHeight: 1.75, color: '#c8c0b0', margin: '14px 0 0' }}>{text}</p>;
}

function EmptyNote({ text }) {
  return <p style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#444', padding: '12px 0' }}>{text}</p>;
}

export default function HoopsWire() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(getTimeUntil8AM());
  const [lastRun, setLastRun] = useState(null);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const t = setInterval(() => setCountdown(getTimeUntil8AM()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 400);
    return () => clearInterval(t);
  }, [loading]);

  const runBriefing = useCallback(async () => {
    setLoading(true); setError(null); setData(null);
    try {
      const previousDraftList = loadYesterdayDraftList();
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previousDraftList }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      if (json.draftWatch?.prospects?.length) saveDraftList(json.draftWatch.prospects);
      setData(json);
      setLastRun(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: #0a0a0a; min-height: 100%; }
        .app { min-height: 100vh; background: #0a0a0a; color: #e8e0d0; font-family: 'IBM Plex Sans', sans-serif; padding-bottom: 60px; }
        .header { border-bottom: 1px solid #1e1e1e; padding: 28px 40px 24px; display: flex; justify-content: space-between; align-items: flex-end; background: #0a0a0a; position: sticky; top: 0; z-index: 10; }
        @media(max-width:600px){ .header{ padding: 18px 20px 14px; } }
        .eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: #f97316; text-transform: uppercase; margin-bottom: 4px; }
        .title { font-family: 'Bebas Neue', sans-serif; font-size: 48px; letter-spacing: 0.04em; line-height: 1; color: #fff; }
        .title span { color: #f97316; }
        @media(max-width:600px){ .title{ font-size: 34px; } }
        .clock-block { text-align: right; }
        .clock-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.15em; color: #555; text-transform: uppercase; margin-bottom: 6px; }
        .clock { font-family: 'IBM Plex Mono', monospace; font-size: 26px; font-weight: 600; color: #e8e0d0; letter-spacing: 0.05em; }
        @media(max-width:600px){ .clock{ font-size: 18px; } }
        .clock-sep { color: #f97316; animation: blink 1s step-end infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .main { max-width: 960px; margin: 0 auto; padding: 40px 40px 0; }
        @media(max-width:600px){ .main{ padding: 24px 16px 0; } }
        .run-section { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; flex-wrap: wrap; }
        .run-btn { font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; background: #f97316; color: #000; border: none; padding: 14px 32px; cursor: pointer; transition: all 0.15s; }
        .run-btn:hover:not(:disabled) { background: #fb923c; transform: translateY(-1px); }
        .run-btn:disabled { background: #333; color: #666; cursor: not-allowed; transform: none; }
        .last-run { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #444; }
        .last-run strong { color: #666; }
        .loading-block { border: 1px solid #1e1e1e; background: #111; padding: 48px 40px; text-align: center; }
        .loading-icon { font-size: 36px; margin-bottom: 20px; display: block; animation: spin 2s linear infinite; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .loading-text { font-family: 'IBM Plex Mono', monospace; font-size: 13px; color: #f97316; letter-spacing: 0.1em; text-transform: uppercase; }
        .loading-sub { font-size: 12px; color: #444; margin-top: 8px; font-family: 'IBM Plex Mono', monospace; }
        .error-block { border: 1px solid #7f1d1d; background: #1a0a0a; padding: 20px 24px; font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #f87171; }
        .briefing { border: 1px solid #1e1e1e; background: #0f0f0f; }
        .briefing-header { border-bottom: 1px solid #1e1e1e; padding: 16px 28px; display: flex; justify-content: space-between; align-items: center; }
        .briefing-date { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #555; letter-spacing: 0.08em; text-transform: uppercase; }
        .live-dot { width: 7px; height: 7px; background: #22c55e; border-radius: 50%; animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        .briefing-body { padding: 32px 28px; }
        @media(max-width:600px){ .briefing-body{ padding: 20px 14px; } }
        .section-header { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.06em; color: #f97316; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #1e1e1e; }
        .table-wrap { overflow-x: auto; margin: 12px 0 4px; border: 1px solid #1e1e1e; }
        .stats-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
        .stats-table thead { background: #161616; }
        .stats-table th { padding: 9px 14px; text-align: left; color: '#555'; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; font-size: 10px; border-bottom: 1px solid #1e1e1e; white-space: nowrap; color: #555; }
        .stats-table td { padding: 9px 14px; color: #c8c0b0; border-bottom: 1px solid #141414; white-space: nowrap; }
        .stats-table tr:last-child td { border-bottom: none; }
        .stats-table tr:hover td { background: #141414; }
        .stat-box { border: 1px solid #1e1e1e; background: #111; padding: 20px 24px; }
        .stat-headline { font-family: 'Bebas Neue', sans-serif; font-size: 20px; color: #fff; letter-spacing: 0.04em; margin-bottom: 8px; }
        .empty-state { text-align: center; padding: 80px 40px; border: 1px dashed #1e1e1e; }
        .empty-icon { font-size: 52px; margin-bottom: 20px; display: block; opacity: 0.4; }
        .empty-title { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: #333; letter-spacing: 0.06em; margin-bottom: 8px; }
        .empty-sub { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: '#2a2a2a'; color: #2a2a2a; }
      `}</style>

      <div className="app">
        <div className="header">
          <div>
            <div className="eyebrow">Morning Briefing · 8:00 AM Daily</div>
            <div className="title">Hoops<span>Wire</span></div>
          </div>
          <div className="clock-block">
            <div className="clock-label">Next Briefing In</div>
            <div className="clock">{pad(countdown.h)}<span className="clock-sep">:</span>{pad(countdown.m)}<span className="clock-sep">:</span>{pad(countdown.s)}</div>
          </div>
        </div>

        <div className="main">
          <div className="run-section">
            <button className="run-btn" onClick={runBriefing} disabled={loading}>
              {loading ? `Searching${dots}` : '▶ Run Briefing Now'}
            </button>
            {lastRun && <div className="last-run">Last run: <strong>{lastRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></div>}
          </div>

          {loading && (
            <div className="loading-block">
              <span className="loading-icon">⟳</span>
              <div className="loading-text">Scanning last night's games{dots}</div>
              <div className="loading-sub">nba · cbb · legacy watch · tankathon · betting lines</div>
            </div>
          )}

          {error && <div className="error-block">⚠ {error}</div>}

          {data && !loading && (
            <div className="briefing">
              <div className="briefing-header">
                <div className="briefing-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                <div className="live-dot" />
              </div>
              <div className="briefing-body">

                <Section title="🏀 NBA Last Night">
                  <div style={{ marginBottom: 8 }}>{data.nba?.games?.map((g, i) => <ScoreRow key={i} game={g} />)}</div>
                  <StatsTable players={data.nba?.players} showPlusMinus />
                  <Context text={data.nba?.context} />
                </Section>

                <Section title="🎓 CBB Last Night">
                  <div style={{ marginBottom: 8 }}>{data.cbb?.games?.map((g, i) => <ScoreRow key={i} game={g} />)}</div>
                  <StatsTable players={data.cbb?.players} showDraftStar />
                  <Context text={data.cbb?.context} />
                </Section>

                <Section title="👑 Legacy Watch">
                  {data.legacyWatch?.empty || !data.legacyWatch?.players?.length
                    ? <EmptyNote text="No legacy moments last night." />
                    : <>
                        <StatsTable players={data.legacyWatch.players} showRelation showAvgs />
                        {data.legacyWatch.players.map((p, i) => p.context && <Context key={i} text={`${p.name}: ${p.context}`} />)}
                      </>
                  }
                </Section>

                <Section title="🔭 Draft Prospect Watch">
                  <DraftTable prospects={data.draftWatch?.prospects} />
                  <Context text={data.draftWatch?.context} />
                </Section>

                <Section title="📊 Stat of the Morning">
                  <div className="stat-box">
                    <div className="stat-headline">{data.statOfMorning?.stat}</div>
                    <Context text={data.statOfMorning?.context} />
                  </div>
                </Section>

                <Section title="🎲 Biggest Line Upsets">
                  {data.lineUpsets?.empty
                    ? <EmptyNote text={data.lineUpsets.emptyMessage || 'Clean night — no major line upsets to report.'} />
                    : <UpsetTable upsets={data.lineUpsets?.upsets} />
                  }
                </Section>

              </div>
            </div>
          )}

          {!data && !loading && !error && (
            <div className="empty-state">
              <span className="empty-icon">🏀</span>
              <div className="empty-title">No Briefing Yet</div>
              <div className="empty-sub">Hit "Run Briefing Now" to fetch last night's results</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
