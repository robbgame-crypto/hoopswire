'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// ── SSR-safe localStorage helpers ──
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

function ScoreRow({ game }) {
  if (game.homeScore === 0 && game.awayScore === 0) return null;
  const homeWon = game.homeScore > game.awayScore;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #141414" }}>
      <span style={{ flex: 1, fontSize: 13, color: homeWon ? "#e8e0d0" : "#666", fontWeight: homeWon ? 600 : 400 }}>{game.home}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: homeWon ? "#f97316" : "#666", fontWeight: 700, minWidth: 32, textAlign: "right" }}>{game.homeScore}</span>
      <span style={{ color: "#333", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", minWidth: 16, textAlign: "center" }}>—</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, color: !homeWon ? "#f97316" : "#666", fontWeight: 700, minWidth: 32, textAlign: "left" }}>{game.awayScore}</span>
      <span style={{ flex: 1, fontSize: 13, color: !homeWon ? "#e8e0d0" : "#666", fontWeight: !homeWon ? 600 : 400, textAlign: "right" }}>{game.away}</span>
      {game.note && <span style={{ fontSize: 11, color: "#f97316", fontFamily: "'IBM Plex Mono', monospace", marginLeft: 8 }}>{game.note}</span>}
    </div>
  );
}

function StatsTable({ players, showPlusMinus = false, showDraftStar = false, showRelation = false, showAvgs = false }) {
  if (!players || players.length === 0) return null;
  return (
    <div className="table-wrap">
      <table className="stats-table">
        <thead>
          <tr>
            <th>Player</th>
            {showRelation && <th>Legacy</th>}
            <th>Team</th>
            <th>PTS</th>
            <th>REB</th>
            <th>AST</th>
            <th>STL</th>
            <th>BLK</th>
            <th>FG</th>
            {showPlusMinus && <th>+/-</th>}
            {showAvgs && <th style={{color:"#555"}}>Season Avg</th>}
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={i}>
              <td style={{ color: "#e8e0d0", fontWeight: 500 }}>
                {p.name}{showDraftStar && p.isDraftProspect ? <span style={{ color: "#f97316", marginLeft: 4 }}>★</span> : ""}
              </td>
              {showRelation && <td style={{ color: "#888", fontSize: 11 }}>{p.relation}</td>}
              <td>{p.team}</td>
              <td style={{ color: "#f97316", fontWeight: 600 }}>{p.pts}</td>
              <td>{p.reb}</td>
              <td>{p.ast}</td>
              <td>{p.stl}</td>
              <td>{p.blk}</td>
              <td>{p.fg}</td>
              {showPlusMinus && <td style={{ color: String(p.plusMinus).startsWith("+") ? "#22c55e" : String(p.plusMinus).startsWith("-") ? "#ef4444" : "#888" }}>{p.plusMinus}</td>}
              {showAvgs && <td style={{ color: "#555", fontSize: 11 }}>{p.avgPts}/{p.avgReb}/{p.avgAst}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DraftTable({ prospects }) {
  if (!prospects || prospects.length === 0) return null;
  return (
    <div className="table-wrap">
      <table className="stats-table">
        <thead>
          <tr><th>#</th><th>Move</th><th>Player</th><th>School</th><th>Mock Pick</th><th>Notes</th></tr>
        </thead>
        <tbody>
          {prospects.map((p, i) => {
            const change = String(p.change);
            const isUp = change.startsWith("+") && change !== "+0";
            const isDown = change.startsWith("-");
            const isNew = change === "NEW";
            const changeColor = isUp ? "#22c55e" : isDown ? "#ef4444" : isNew ? "#f97316" : "#444";
            const changeLabel = isNew ? "🆕" : change === "0" || change === "+0" ? "—" : isUp ? `▲${change.replace("+","")}` : `▼${change.replace("-","")}`;
            return (
              <tr key={i}>
                <td style={{ color: "#f97316", fontWeight: 700, fontFamily: "'IBM Plex Mono', monospace" }}>{p.rank}</td>
                <td style={{ color: changeColor, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{changeLabel}</td>
                <td style={{ color: "#e8e0d0", fontWeight: 500 }}>{p.name}</td>
                <td>{p.school}</td>
                <td style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.mockPick}</td>
                <td style={{ color: "#888", fontSize: 12 }}>{p.notes}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UpsetTable({ upsets }) {
  if (!upsets || upsets.length === 0) return null;
  return (
    <div className="table-wrap">
      <table className="stats-table">
        <thead>
          <tr><th>Game</th><th>Line</th><th>Result</th><th>Miss By</th><th>Context</th></tr>
        </thead>
        <tbody>
          {upsets.map((u, i) => (
            <tr key={i}>
              <td style={{ color: "#e8e0d0", fontWeight: 500 }}>{u.game}</td>
              <td style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#f97316" }}>{u.line}</td>
              <td>{u.result}</td>
              <td style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#ef4444", fontWeight: 600 }}>{u.beatBy}</td>
              <td style={{ color: "#888", fontSize: 12 }}>{u.context}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContextBlock({ text }) {
  if (!text) return null;
  return <p style={{ fontSize: 14, lineHeight: 1.75, color: "#c8c0b0", margin: "12px 0 0" }}>{text}</p>;
}

// ── 64x32 pixel court scene — canvas renderer ──
function PixelPlayer({ mode }) {
  const canvasRef = useRef(null);
  const PX = 2;
  const COLS = 64, ROWS = 32;

  const C = {
    _: null,
    S: "#f0b080", s: "#d08050", ss: "#a05830",
    H: "#1a0a04", h: "#2e1208",
    B: "#f97316", bn: "#ffb060",
    J: "#f97316", j: "#c75a00", jn: "#ffa040", jd: "#8B3a00",
    Q: "#1a1a2e", q: "#12122a", qh: "#2a2a44",
    W: "#f0ece0", w: "#d0ccc0",
    K: "#0d0d0d", k: "#1e1e1e", kw: "#e0e0e0",
    L: "#e07820", l: "#b05010", lh: "#f09840", lx: "#5a2800",
    R: "#f97316", r: "#c75a00", rh: "#ffaa44",
    G: "#c8c8c8", g: "#888", gd: "#444", gw: "#eee",
    T: "#e8e8e8", t: "#aaa",
    P: "#666", p: "#444",
    F: "#c8960c", f: "#b07e08", fe: "#d8a820", fl: "#a06a04",
    CL: "#e8d080",
  };

  const dot = (grid, r, c, col) => {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = col;
  };
  const rect = (grid, r, c, h, w, col) => {
    for (let y = r; y < r + h && y < ROWS; y++)
      for (let x = c; x < c + w && x < COLS; x++)
        if (y >= 0 && x >= 0) grid[y][x] = col;
  };

  const buildScene = (dr, dc, opts, ballPos, rimFlash) => {
    dr = dr || 0; dc = dc || 0;
    const { armUp, hasBall, jumping, crouching } = opts || {};
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('_'));

    // Floor
    for (let r = 20; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        grid[r][c] = Math.floor((r - 20) / 2) % 2 === 0 ? 'F' : 'f';
    for (let c = 0; c < COLS; c += 8)
      for (let r = 20; r < ROWS; r++) dot(grid, r, c, 'fl');
    rect(grid, 20, 0, 1, COLS, 'CL');

    // Pole
    rect(grid, 14, 56, 8, 2, 'P');
    rect(grid, 14, 57, 8, 1, 'p');
    // Support arm
    rect(grid, 8, 46, 1, 12, 'P');
    rect(grid, 9, 46, 1, 12, 'p');
    // Backboard
    rect(grid, 2, 52, 14, 8, 'G');
    rect(grid, 2, 52, 1, 8, 'gd');
    rect(grid, 15, 52, 1, 8, 'gd');
    rect(grid, 2, 52, 14, 1, 'gd');
    rect(grid, 2, 59, 14, 1, 'gd');
    rect(grid, 6, 54, 5, 4, 'gw');
    rect(grid, 6, 54, 1, 4, 'gd');
    rect(grid, 10, 54, 1, 4, 'gd');
    rect(grid, 6, 54, 5, 1, 'gd');
    rect(grid, 6, 57, 5, 1, 'gd');
    // Rim
    const rimCol = rimFlash ? 'rh' : 'R';
    rect(grid, 10, 42, 2, 10, rimCol);
    rect(grid, 10, 42, 1, 10, 'rh');
    rect(grid, 11, 42, 1, 10, 'r');
    dot(grid, 10, 41, 'r'); dot(grid, 11, 41, 'r');
    // Net
    for (let r = 12; r <= 18; r++) {
      const sp = Math.round(((r - 12) / 6) * 4);
      const nl = 42 + sp, nr = 52 - sp;
      for (let c = nl; c <= nr; c++)
        dot(grid, r, c, (c - nl) % 2 === 0 || r === 12 || r === 18 ? 'T' : 't');
    }

    // Player
    const p = (r, c, col) => dot(grid, r + dr, c + dc, col);

    // Hair
    rect(grid, 0+dr, 6+dc, 1, 6, 'H');
    rect(grid, 1+dr, 5+dc, 1, 8, 'H');
    dot(grid, 2+dr, 5+dc, 'H'); dot(grid, 2+dr, 12+dc, 'H');
    // Headband
    rect(grid, 2+dr, 6+dc, 1, 6, 'B');
    dot(grid, 2+dr, 6+dc, 'bn'); dot(grid, 2+dr, 7+dc, 'bn');
    // Face
    rect(grid, 3+dr, 5+dc, 3, 8, 'S');
    rect(grid, 3+dr, 5+dc, 3, 1, 'ss');
    rect(grid, 3+dr, 12+dc, 3, 1, 'ss');
    dot(grid, 3+dr, 7+dc, 'ss'); dot(grid, 3+dr, 10+dc, 'ss');
    dot(grid, 5+dr, 8+dc, 'ss'); dot(grid, 5+dr, 9+dc, 'ss');
    // Neck
    rect(grid, 6+dr, 7+dc, 1, 4, 'S');
    // Jersey
    rect(grid, 7+dr, 4+dc, 5, 10, 'J');
    rect(grid, 7+dr, 4+dc, 5, 1, 'j');
    rect(grid, 7+dr, 13+dc, 5, 1, 'j');
    rect(grid, 7+dr, 5+dc, 1, 8, 'jn');
    dot(grid, 9+dr, 7+dc, 'jd'); dot(grid, 9+dr, 8+dc, 'jd');
    dot(grid, 10+dr, 7+dc, 'jd'); dot(grid, 10+dr, 8+dc, 'jd');
    dot(grid, 9+dr, 10+dc, 'jd'); dot(grid, 9+dr, 11+dc, 'jd');
    dot(grid, 10+dr, 10+dc, 'jd'); dot(grid, 10+dr, 11+dc, 'jd');
    // Arms
    if (armUp) {
      rect(grid, 4+dr, 14+dc, 4, 2, 'S');
      rect(grid, 4+dr, 16+dc, 2, 2, 'S');
      rect(grid, 9+dr, 2+dc, 3, 2, 'S');
    } else {
      rect(grid, 9+dr, 14+dc, 3, 2, 'S');
      rect(grid, 9+dr, 2+dc, 3, 2, 'S');
    }
    // Shorts
    const sr = crouching ? 13 : 12;
    rect(grid, sr+dr, 4+dc, 4, 10, 'Q');
    rect(grid, sr+dr, 4+dc, 4, 1, 'q');
    rect(grid, sr+dr, 13+dc, 4, 1, 'q');
    rect(grid, sr+dr, 5+dc, 1, 8, 'qh');
    // Legs
    const lr = crouching ? 17 : 16;
    if (jumping) {
      rect(grid, lr+dr, 4+dc, 2, 3, 'S');
      rect(grid, lr+dr, 11+dc, 2, 3, 'S');
      rect(grid, lr+2+dr, 2+dc, 2, 3, 'S');
      rect(grid, lr+2+dr, 13+dc, 2, 3, 'S');
      dot(grid, lr+4+dr, 2+dc, 'W'); dot(grid, lr+4+dr, 3+dc, 'W');
      dot(grid, lr+4+dr, 13+dc, 'W'); dot(grid, lr+4+dr, 14+dc, 'W');
      rect(grid, lr+5+dr, 1+dc, 2, 4, 'K');
      rect(grid, lr+5+dr, 13+dc, 2, 4, 'K');
    } else {
      rect(grid, lr+dr, 4+dc, 3, 3, 'S');
      rect(grid, lr+dr, 11+dc, 3, 3, 'S');
      rect(grid, lr+3+dr, 4+dc, 2, 3, 'W');
      rect(grid, lr+3+dr, 11+dc, 2, 3, 'W');
      rect(grid, lr+5+dr, 3+dc, 2, 5, 'K');
      rect(grid, lr+5+dr, 10+dc, 2, 5, 'K');
      dot(grid, lr+5+dr, 4+dc, 'kw'); dot(grid, lr+5+dr, 11+dc, 'kw');
    }
    // Ball in hand
    if (hasBall) {
      rect(grid, 9+dr, 16+dc, 4, 4, 'L');
      dot(grid, 9+dr, 16+dc, 'lh');
      dot(grid, 10+dr, 17+dc, 'lx'); dot(grid, 11+dr, 18+dc, 'lx');
      dot(grid, 9+dr, 19+dc, 'l'); dot(grid, 12+dr, 16+dc, 'l');
    }
    // Flying ball
    if (ballPos) {
      const [br, bc] = ballPos;
      rect(grid, br, bc, 3, 3, 'L');
      dot(grid, br, bc, 'lh'); dot(grid, br+1, bc+1, 'lx');
      dot(grid, br, bc+2, 'l'); dot(grid, br+2, bc, 'l');
    }

    return grid;
  };

  const frames = {
    idle:  [ buildScene(0, 0, {hasBall:true}, null, false) ],
    shoot: [
      buildScene(0,  0, {hasBall:true}, null, false),
      buildScene(1,  0, {hasBall:true, crouching:true}, null, false),
      buildScene(0,  0, {armUp:true}, [4, 28], false),
      buildScene(0,  0, {}, [7, 36], false),
      buildScene(0,  0, {}, [9, 42], false),
      buildScene(0,  0, {}, null, false),
    ],
    dunk: [
      buildScene(0,  0, {hasBall:true}, null, false),
      buildScene(-3, 0, {hasBall:true, jumping:true}, null, false),
      buildScene(-5, 0, {hasBall:true, jumping:true}, null, false),
      buildScene(-5, 0, {armUp:true, jumping:true}, [9, 41], true),
      buildScene(-2, 0, {jumping:true}, null, true),
      buildScene(0,  0, {}, null, false),
    ],
  };

  const [frame, setFrame] = useState(0);
  const prevMode = useRef("idle");

  useEffect(() => {
    if (mode !== prevMode.current) { prevMode.current = mode; setFrame(0); }
    const seq = frames[mode] || frames.idle;
    if (seq.length === 1) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setFrame(Math.min(i, seq.length - 1));
      if (i >= seq.length - 1) clearInterval(timer);
    }, 130);
    return () => clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grid = (frames[mode] || frames.idle)[Math.min(frame, (frames[mode] || frames.idle).length - 1)];
    grid.forEach((row, r) => {
      row.forEach((c, col) => {
        const color = C[c];
        if (color) { ctx.fillStyle = color; ctx.fillRect(col * PX, r * PX, PX, PX); }
      });
    });
  }, [frame, mode]);

  return (
    <canvas
      ref={canvasRef}
      width={COLS * PX}
      height={ROWS * PX}
      style={{ imageRendering: "pixelated", display: "block", flexShrink: 0 }}
    />
  );
}

// ── Swish + buzzer sound via Web Audio API ──
function playSwish() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;

    // 1. Ball swish — filtered noise with net "whoosh" character
    const swishLen = ctx.sampleRate * 0.25;
    const swishBuf = ctx.createBuffer(1, swishLen, ctx.sampleRate);
    const swishData = swishBuf.getChannelData(0);
    for (let i = 0; i < swishLen; i++) {
      swishData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / swishLen, 1.5);
    }
    const swishSrc = ctx.createBufferSource();
    swishSrc.buffer = swishBuf;
    const swishFilter = ctx.createBiquadFilter();
    swishFilter.type = "bandpass";
    swishFilter.frequency.value = 3500;
    swishFilter.Q.value = 1.2;
    const swishGain = ctx.createGain();
    swishGain.gain.setValueAtTime(0.5, t);
    swishGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    swishSrc.connect(swishFilter);
    swishFilter.connect(swishGain);
    swishGain.connect(ctx.destination);
    swishSrc.start(t);

    // 2. Rim thud — short low punch
    const rimOsc = ctx.createOscillator();
    const rimGain = ctx.createGain();
    rimOsc.frequency.setValueAtTime(180, t + 0.05);
    rimOsc.frequency.exponentialRampToValueAtTime(60, t + 0.18);
    rimGain.gain.setValueAtTime(0.4, t + 0.05);
    rimGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    rimOsc.connect(rimGain);
    rimGain.connect(ctx.destination);
    rimOsc.start(t + 0.05);
    rimOsc.stop(t + 0.2);

    // 3. Crowd roar — rising noise swell
    const crowdLen = ctx.sampleRate * 0.6;
    const crowdBuf = ctx.createBuffer(1, crowdLen, ctx.sampleRate);
    const crowdData = crowdBuf.getChannelData(0);
    for (let i = 0; i < crowdLen; i++) {
      const env = Math.min(i / (crowdLen * 0.3), 1) * Math.pow(1 - i / crowdLen, 0.5);
      crowdData[i] = (Math.random() * 2 - 1) * env;
    }
    const crowdSrc = ctx.createBufferSource();
    crowdSrc.buffer = crowdBuf;
    const crowdFilter = ctx.createBiquadFilter();
    crowdFilter.type = "lowpass";
    crowdFilter.frequency.value = 800;
    const crowdGain = ctx.createGain();
    crowdGain.gain.setValueAtTime(0.15, t + 0.2);
    crowdGain.gain.linearRampToValueAtTime(0.001, t + 0.8);
    crowdSrc.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(ctx.destination);
    crowdSrc.start(t + 0.2);

    // 4. Buzzer — classic game-ending buzzer beep
    setTimeout(() => {
      const bt = ctx.currentTime;
      const buzzOsc = ctx.createOscillator();
      const buzzGain = ctx.createGain();
      buzzOsc.type = "sawtooth";
      buzzOsc.frequency.setValueAtTime(440, bt);
      buzzOsc.frequency.setValueAtTime(380, bt + 0.05);
      buzzOsc.frequency.setValueAtTime(440, bt + 0.1);
      buzzOsc.frequency.setValueAtTime(380, bt + 0.15);
      buzzGain.gain.setValueAtTime(0.3, bt);
      buzzGain.gain.setValueAtTime(0.3, bt + 0.18);
      buzzGain.gain.exponentialRampToValueAtTime(0.001, bt + 0.25);
      // Add distortion feel with second oscillator slightly detuned
      const buzz2 = ctx.createOscillator();
      const buzz2Gain = ctx.createGain();
      buzz2.type = "square";
      buzz2.frequency.setValueAtTime(445, bt);
      buzz2Gain.gain.setValueAtTime(0.15, bt);
      buzz2Gain.gain.exponentialRampToValueAtTime(0.001, bt + 0.25);
      buzzOsc.connect(buzzGain); buzzGain.connect(ctx.destination);
      buzz2.connect(buzz2Gain); buzz2Gain.connect(ctx.destination);
      buzzOsc.start(bt); buzzOsc.stop(bt + 0.28);
      buzz2.start(bt); buzz2.stop(bt + 0.28);
    }, 500);

  } catch(_) {}
}

function getTimeUntil8AM() {
  const now = new Date();
  const next8 = new Date();
  next8.setHours(8, 0, 0, 0);
  if (now >= next8) next8.setDate(next8.getDate() + 1);
  const diff = next8 - now;
  return { h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) };
}
const pad = n => String(n).padStart(2, "0");

const DEMO_DATA = {
  nba: {
    games: [
      { home: "Los Angeles Lakers", homeScore: 118, away: "Golden State Warriors", awayScore: 109, note: "" },
      { home: "Boston Celtics", homeScore: 102, away: "Miami Heat", awayScore: 97, note: "OT" },
      { home: "Denver Nuggets", homeScore: 124, away: "Phoenix Suns", awayScore: 101, note: "" },
    ],
    players: [
      { name: "LeBron James", team: "LAL", pts: 34, reb: 8, ast: 9, stl: 2, blk: 1, fg: "13/22", plusMinus: "+14" },
      { name: "Stephen Curry", team: "GSW", pts: 28, reb: 4, ast: 7, stl: 3, blk: 0, fg: "10/19", plusMinus: "-7" },
      { name: "Jayson Tatum", team: "BOS", pts: 31, reb: 9, ast: 4, stl: 1, blk: 2, fg: "11/24", plusMinus: "+6" },
      { name: "Nikola Jokic", team: "DEN", pts: 27, reb: 14, ast: 11, stl: 2, blk: 1, fg: "10/16", plusMinus: "+22" },
    ],
    context: "Jokic posted his 28th triple-double of the season in Denver's blowout win, continuing his MVP-caliber campaign. Boston survived in overtime behind Tatum's clutch fourth quarter, while the Lakers got balanced contributions up and down the roster."
  },
  cbb: {
    games: [
      { home: "Duke", homeScore: 87, away: "North Carolina", awayScore: 81, note: "" },
      { home: "Kansas", homeScore: 74, away: "Houston", awayScore: 71, note: "" },
      { home: "Auburn", homeScore: 92, away: "Alabama", awayScore: 78, note: "" },
    ],
    players: [
      { name: "Cooper Flagg", team: "Duke", pts: 26, reb: 11, ast: 4, stl: 3, blk: 2, fg: "10/18", isDraftProspect: true },
      { name: "Cam Boozer", team: "Duke", pts: 18, reb: 9, ast: 2, stl: 1, blk: 3, fg: "7/12", isDraftProspect: true },
      { name: "Johni Broome", team: "Auburn", pts: 24, reb: 12, ast: 3, stl: 2, blk: 4, fg: "9/15", isDraftProspect: true },
    ],
    context: "Duke's frontcourt duo of Flagg and Boozer dominated the paint in the rivalry win over UNC. Flagg's 26-point, 11-rebound performance further cemented his status as the consensus #1 pick, while Broome's dominant showing in Auburn's SEC win keeps the Tigers in the top-5 conversation."
  },
  legacyWatch: {
    empty: false,
    players: [
      { name: "Bronny James", relation: "Son of LeBron James", pts: 11, reb: 3, ast: 4, stl: 2, blk: 0, fg: "4/9", avgPts: 8.4, avgReb: 2.8, avgAst: 3.1, context: "Solid 22-minute stint off the bench, showing improved court vision and defensive intensity." },
      { name: "Cam Boozer", relation: "Son of Carlos Boozer", pts: 18, reb: 9, ast: 2, stl: 1, blk: 3, fg: "7/12", avgPts: 16.2, avgReb: 8.7, avgAst: 1.9, context: "Another double-double performance — Boozer is playing his best basketball of the season at exactly the right time." },
      { name: "Scotty Pippen Jr.", relation: "Son of Scottie Pippen", pts: 14, reb: 2, ast: 6, stl: 3, blk: 0, fg: "5/11", avgPts: 12.1, avgReb: 2.3, avgAst: 5.8, context: "Pippen's defensive intensity stood out — 3 steals and relentless pressure all night." },
    ]
  },
  draftWatch: {
    prospects: [
      { rank: 1, change: "0", name: "Cooper Flagg", school: "Duke", mockPick: "1", notes: "26/11/4 last night — locked in" },
      { rank: 2, change: "+1", name: "Cam Boozer", school: "Duke", mockPick: "2", notes: "Rising after Duke run" },
      { rank: 3, change: "-1", name: "Dylan Harper", school: "Rutgers", mockPick: "3", notes: "Held to 14 pts" },
      { rank: 4, change: "0", name: "Ace Bailey", school: "Rutgers", mockPick: "4", notes: "Steady performer" },
      { rank: 5, change: "+2", name: "Johni Broome", school: "Auburn", mockPick: "5", notes: "24/12 vs Alabama" },
      { rank: 6, change: "-1", name: "VJ Edgecombe", school: "Baylor", mockPick: "6", notes: "" },
      { rank: 7, change: "NEW", name: "Tre Johnson", school: "Texas", mockPick: "7", notes: "New entry this week" },
    ],
    context: "Cam Boozer's rise to #2 is the biggest mover today after Duke's impressive rivalry win. Johni Broome jumping two spots to #5 reflects his dominant SEC performance. Dylan Harper drops one spot after a quieter night for Rutgers."
  },
  statOfMorning: {
    stat: "Nikola Jokic: 27 PTS / 14 REB / 11 AST — his 28th triple-double this season",
    context: "No player in NBA history has averaged a triple-double for a full season. Jokic is currently at 26.4 / 12.1 / 9.8 on the year — and is somehow getting more efficient as the season progresses. His +22 last night was the best plus-minus of any player league-wide."
  },
  lineUpsets: {
    empty: false,
    upsets: [
      { game: "Denver vs Phoenix", line: "DEN -4.5", result: "DEN won 124-101", beatBy: "18.5 pts", context: "Jokic triple-double in 28 minutes — Nuggets covered by nearly 4x the spread in a dominant wire-to-wire performance." },
      { game: "Kansas vs Houston", line: "KU -6", result: "KU won 74-71", beatBy: "-3 pts", context: "Kansas failed to cover as a 6-point home favorite, nearly blowing a 12-point second-half lead against a scrappy Houston squad." },
    ]
  },
  lineBeats: [
    "Nikola Jokic now has more triple-doubles this season (28) than some players have career assists.",
    "Cameron Boozer's 26/15 line is the best by a Duke freshman in a rivalry game since Zion Williamson in 2019.",
    "The Big 12 Tournament produced 3 games decided by single digits Wednesday — the bubble is officially on fire."
  ]
};

export default function HoopsBriefing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(getTimeUntil8AM());
  const [lastRun, setLastRun] = useState(null);
  const [dots, setDots] = useState("");
  const [playerMode, setPlayerMode] = useState("idle");

  useEffect(() => {
    const t = setInterval(() => setCountdown(getTimeUntil8AM()), 1000);
    return () => clearInterval(t);
  }, []);

  // Shoot animation on mount
  useEffect(() => {
    const t = setTimeout(() => {
      setPlayerMode("shoot");
      setTimeout(() => setPlayerMode("idle"), 700);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    return () => clearInterval(t);
  }, [loading]);

  const loadDemo = () => {
    setPlayerMode("dunk");
    setTimeout(() => { setPlayerMode("idle"); playSwish(); }, 600);
    setData(DEMO_DATA);
    setLastRun(new Date());
    setError(null);
  };

  const runBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setPlayerMode("idle");
    try {
      const previousDraftList = loadYesterdayDraftList();
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previousDraftList }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      // Safe defaults
      json.nba = json.nba || { games: [], players: [], context: '' };
      json.cbb = json.cbb || { games: [], players: [], context: '' };
      json.legacyWatch = json.legacyWatch || { players: [], empty: true };
      json.draftWatch = json.draftWatch || { prospects: [], context: '' };
      json.statOfMorning = json.statOfMorning || { stat: '', context: '' };
      json.lineUpsets = json.lineUpsets || { upsets: [], empty: true, emptyMessage: 'No data available.' };
      json.lineBeats = json.lineBeats || [];

      if (json.draftWatch?.prospects?.length) saveDraftList(json.draftWatch.prospects);
      setData(json);
      setLastRun(new Date());
      setPlayerMode("dunk");
      setTimeout(() => { setPlayerMode("idle"); playSwish(); }, 700);
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
        body { background: #0a0a0a; }
        .app { min-height: 100vh; background: #0a0a0a; color: #e8e0d0; font-family: 'IBM Plex Sans', sans-serif; padding-bottom: 60px; }
        .header { border-bottom: 1px solid #1e1e1e; padding: 16px 40px 16px; display: flex; justify-content: space-between; align-items: center; background: #0a0a0a; position: sticky; top: 0; z-index: 10; overflow: visible; min-height: 80px; }
        .eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.2em; color: #f97316; text-transform: uppercase; margin-bottom: 4px; }
        .title { font-family: 'Bebas Neue', sans-serif; font-size: 48px; letter-spacing: 0.04em; line-height: 1; color: #fff; }
        .title span { color: #f97316; }
        .clock-block { text-align: right; }
        .clock-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.15em; color: #555; text-transform: uppercase; margin-bottom: 6px; }
        .clock { font-family: 'IBM Plex Mono', monospace; font-size: 28px; font-weight: 600; color: #e8e0d0; letter-spacing: 0.05em; }
        .clock-sep { color: #f97316; animation: blink 1s step-end infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .main { max-width: 960px; margin: 0 auto; padding: 40px 40px 0; }
        .key-section { border: 1px solid #2a2a2a; background: #111; padding: 20px 24px; margin-bottom: 32px; }
        .key-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.18em; color: #555; text-transform: uppercase; margin-bottom: 10px; }
        .key-row { display: flex; gap: 10px; align-items: center; }
        .key-input { flex: 1; background: #0a0a0a; border: 1px solid #2a2a2a; color: #e8e0d0; font-family: 'IBM Plex Mono', monospace; font-size: 13px; padding: 10px 14px; outline: none; transition: border-color 0.15s; }
        .key-input:focus { border-color: #f97316; }
        .key-input::placeholder { color: #333; }
        .key-toggle { background: transparent; border: 1px solid #2a2a2a; color: #555; font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 10px 14px; cursor: pointer; }
        .key-save { background: #1a1a1a; border: 1px solid #f97316; color: #f97316; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 10px 18px; cursor: pointer; transition: all 0.15s; }
        .key-save:hover { background: #f97316; color: #000; }
        .key-confirmed { display: flex; align-items: center; gap: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #22c55e; }
        .key-confirmed-dot { width: 6px; height: 6px; background: #22c55e; border-radius: 50%; }
        .key-change { background: transparent; border: none; color: #444; font-family: 'IBM Plex Mono', monospace; font-size: 11px; cursor: pointer; text-decoration: underline; margin-left: 12px; padding: 0; }
        .key-note { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #333; margin-top: 8px; }
        .run-section { display: flex; align-items: center; gap: 20px; margin-bottom: 40px; }
        .run-btn { font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; background: #f97316; color: #000; border: none; padding: 14px 32px; cursor: pointer; transition: all 0.15s; }
        .run-btn:hover:not(:disabled) { background: #fb923c; transform: translateY(-1px); }
        .run-btn:disabled { background: #333; color: #666; cursor: not-allowed; }
        .demo-btn { font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; background: transparent; color: #f97316; border: 1px solid #f97316; padding: 14px 24px; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
        .demo-btn:hover:not(:disabled) { background: rgba(249,115,22,0.1); }
        .demo-btn:disabled { opacity: 0.3; cursor: not-allowed; }
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
        .section { margin-bottom: 40px; }
        .section-header { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.06em; color: #f97316; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #1e1e1e; }
        .scores-list { margin-bottom: 12px; }
        .table-wrap { overflow-x: auto; margin: 12px 0 4px; border: 1px solid #1e1e1e; }
        .stats-table { width: 100%; border-collapse: collapse; font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
        .stats-table thead { background: #161616; }
        .stats-table th { padding: 9px 14px; text-align: left; color: #555; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; font-size: 10px; border-bottom: 1px solid #1e1e1e; white-space: nowrap; }
        .stats-table td { padding: 9px 14px; color: #c8c0b0; border-bottom: 1px solid #141414; white-space: nowrap; }
        .stats-table tr:last-child td { border-bottom: none; }
        .stats-table tr:hover td { background: #141414; }
        .stat-box { border: 1px solid #1e1e1e; background: #111; padding: 20px 24px; }
        .stat-headline { font-family: 'Bebas Neue', sans-serif; font-size: 20px; color: #fff; letter-spacing: 0.04em; margin-bottom: 8px; }
        .empty-note { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #444; padding: 16px 0; }
        .empty-state { text-align: center; padding: 80px 40px; border: 1px dashed #1e1e1e; }
        .empty-icon { font-size: 52px; margin-bottom: 20px; display: block; opacity: 0.4; }
        .empty-title { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: #333; letter-spacing: 0.06em; margin-bottom: 8px; }
        .empty-sub { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: #2a2a2a; }
        .line-beats { display: flex; flex-direction: column; gap: 12px; }
        .line-beat { display: flex; align-items: flex-start; gap: 14px; padding: 14px 18px; border: 1px solid #1e1e1e; background: #111; }
        .beat-num { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #f97316; line-height: 1; flex-shrink: 0; width: 16px; }
        .beat-text { font-size: 14px; line-height: 1.6; color: #e8e0d0; }
        @keyframes rimShake { 0%{transform:translateX(0)} 25%{transform:translateX(3px)} 50%{transform:translateX(-3px)} 75%{transform:translateX(2px)} 100%{transform:translateX(0)} }
      `}</style>

      <div className="app">
        <div className="header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <div className="eyebrow">Morning Briefing · 8:00 AM Daily</div>
              <div className="title">Hoops<span>Wire</span></div>
            </div>
            <PixelPlayer mode={playerMode} />
          </div>
          <div className="clock-block">
            <div className="clock-label">Next Briefing In</div>
            <div className="clock">{pad(countdown.h)}<span className="clock-sep">:</span>{pad(countdown.m)}<span className="clock-sep">:</span>{pad(countdown.s)}</div>
          </div>
        </div>

        <div className="main">
          </div>

          <div className="run-section">
            <button className="run-btn" onClick={runBriefing} disabled={loading}>
              {loading ? `Searching${dots}` : "▶ Run Briefing Now"}
            </button>
            <button className="demo-btn" onClick={loadDemo} disabled={loading}>
              Preview Demo
            </button>
            {lastRun && <div className="last-run">Last run: <strong>{lastRun.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></div>}
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
                <div className="briefing-date">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
                <div className="live-dot" />
              </div>
              <div className="briefing-body">

                {/* NBA */}
                <div className="section">
                  <div className="section-header">🏀 NBA Last Night</div>
                  <div className="scores-list">{data.nba?.games?.map((g, i) => <ScoreRow key={i} game={g} />)}</div>
                  <StatsTable players={data.nba?.players} showPlusMinus={true} />
                  <ContextBlock text={data.nba?.context} />
                </div>

                {/* CBB */}
                <div className="section">
                  <div className="section-header">🎓 CBB Last Night</div>
                  <div className="scores-list">{data.cbb?.games?.map((g, i) => <ScoreRow key={i} game={g} />)}</div>
                  <StatsTable players={data.cbb?.players} showDraftStar={true} />
                  <ContextBlock text={data.cbb?.context} />
                </div>

                {/* Legacy Watch */}
                <div className="section">
                  <div className="section-header">👑 Legacy Watch</div>
                  {data.legacyWatch?.empty || !data.legacyWatch?.players?.length
                    ? <div className="empty-note">No legacy moments last night.</div>
                    : <>
                        <StatsTable players={data.legacyWatch.players} showRelation={true} showAvgs={true} />
                        {data.legacyWatch.players.map((p, i) => p.context && <ContextBlock key={i} text={`${p.name}: ${p.context}`} />)}
                      </>
                  }
                </div>

                {/* Draft Watch */}
                <div className="section">
                  <div className="section-header">🔭 Draft Prospect Watch</div>
                  <DraftTable prospects={data.draftWatch?.prospects} />
                  <ContextBlock text={data.draftWatch?.context} />
                </div>

                {/* Stat of the Morning */}
                <div className="section">
                  <div className="section-header">📊 Stat of the Morning</div>
                  <div className="stat-box">
                    <div className="stat-headline">{data.statOfMorning?.stat}</div>
                    <ContextBlock text={data.statOfMorning?.context} />
                  </div>
                </div>

                {/* Line Upsets */}
                <div className="section">
                  <div className="section-header">🎲 Biggest Line Upsets</div>
                  {data.lineUpsets?.empty
                    ? <div className="empty-note">{data.lineUpsets.emptyMessage}</div>
                    : <UpsetTable upsets={data.lineUpsets?.upsets} />
                  }
                </div>

                {/* Line Beats */}
                {data.lineBeats?.length > 0 && (
                  <div className="section">
                    <div className="section-header">⚡ Line Beats</div>
                    <div className="line-beats">
                      {data.lineBeats.map((beat, i) => (
                        <div key={i} className="line-beat">
                          <span className="beat-num">{i + 1}</span>
                          <span className="beat-text">{beat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

          {!data && !loading && !error && (
            <div className="empty-state">
              <span className="empty-icon">🏀</span>
              <div className="empty-title">No Briefing Yet</div>
              <div className="empty-sub">"Hit 'Run Briefing Now' to fetch last night's results"</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
