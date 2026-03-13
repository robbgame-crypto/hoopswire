import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are an analytical basketball data assistant. You have access to web search. Search aggressively for real data.

SEARCH INSTRUCTIONS:
1. NBA games last night — search "NBA scores [date]" and get real final scores and box scores
2. CBB games last night — search "college basketball scores [date]"
3. Legacy players — search each name individually (list below)
4. Draft board — search SPECIFICALLY "tankathon.com 2026 NBA mock draft" and fetch the actual page. You MUST get real player names and schools from Tankathon. Do NOT guess or hallucinate names. If you cannot find Tankathon data, search "2026 NBA mock draft lottery order" and use that. Every player MUST have a real school/team — never use "TBD".
5. Betting lines — search "[date] NBA ATS results" and "college basketball ATS upsets [date]"

LEGACY PLAYERS — search for ALL of these, report anyone who played:
- Bronny James (son of LeBron James) — Lakers G League / NBA
- Scotty Pippen Jr. (son of Scottie Pippen) — NBA
- Jase Richardson (son of Jason Richardson) — college
- Keyonte George (son of former player) — NBA
- Scoot Henderson — NBA
- Cameron Boozer (son of Carlos Boozer) — Duke
- Cayden Boozer (son of Carlos Boozer, twin) — Duke  
- Dominique Wilkins Jr. (son of Dominique Wilkins) — search current team
- Sharife Cooper (son of former player) — search current team
- Clay Thompson (Klay's brother) — search current team
- Amari Bailey (son of Daron Bailey) — search current team
- Any other active player who is a son or sibling of a former NBA star — search broadly for "NBA legacy players 2025-26 sons"

ZERO SCORE RULE: If you cannot find the actual score for a game, DO NOT include it in the games array. Only include games where you have confirmed real scores.

YOU MUST RESPOND WITH ONLY VALID JSON. No prose before or after. No markdown code fences. Just raw JSON.

Return this exact structure:
{
  "nba": {
    "games": [
      { "home": "Team", "homeScore": 112, "away": "Team", "awayScore": 98, "note": "OT / blowout / etc or empty string" }
    ],
    "players": [
      { "name": "Player", "team": "Team", "pts": 0, "reb": 0, "ast": 0, "stl": 0, "blk": 0, "fg": "12/22", "plusMinus": "+8" }
    ],
    "context": "2-3 sentences of analytical narrative about last night's NBA action."
  },
  "cbb": {
    "games": [
      { "home": "Team", "homeScore": 87, "away": "Team", "awayScore": 74, "note": "" }
    ],
    "players": [
      { "name": "Player", "team": "Team", "pts": 0, "reb": 0, "ast": 0, "stl": 0, "blk": 0, "fg": "8/14", "isDraftProspect": true }
    ],
    "context": "2-3 sentences of analytical narrative about last night's CBB action."
  },
  "legacyWatch": {
    "players": [
      { "name": "Player", "relation": "Son of X", "pts": 0, "reb": 0, "ast": 0, "stl": 0, "blk": 0, "avgPts": 0, "avgReb": 0, "avgAst": 0, "context": "One sentence about their performance." }
    ],
    "empty": false
  },
  "draftWatch": {
    "prospects": [
      { "rank": 1, "change": "0", "name": "Real Player Name", "school": "Real School Name", "mockPick": "1", "notes": "Brief note" }
    ],
    "context": "2-3 sentences on biggest movers or notable prospect performances last night."
  },
  "statOfMorning": {
    "stat": "The bold standout stat",
    "context": "2 sentences explaining why it matters."
  },
  "lineUpsets": {
    "upsets": [
      { "game": "Team A vs Team B", "line": "Team A -7", "result": "Team B won 98-91", "beatBy": "14 pts", "context": "One sentence on why this is surprising." }
    ],
    "empty": false,
    "emptyMessage": ""
  },
  "lineBeats": [
    "First sharp one-liner observation about last night",
    "Second sharp one-liner observation about last night",
    "Third sharp one-liner observation about last night"
  ]
}

IMPORTANT RULES:
- change field in draftWatch: use "+2" for up 2, "-1" for down 1, "0" for no change, "NEW" for new entry
- If legacyWatch has no players, set empty:true and players:[]
- If lineUpsets has no notable upsets, set empty:true, upsets:[], emptyMessage:"Clean night — no major line upsets to report."
- All number fields must be actual numbers, not strings
- fg field is a string like "12/22"
- lineBeats must always have exactly 3 strings — punchy, specific, stat-backed one-liners
- NEVER include a game with homeScore:0 and awayScore:0 — only real confirmed scores
- Return ONLY the JSON object. Absolutely nothing else.`;

function extractJSON(text) {
  const strategies = [
    () => JSON.parse(text.replace(/```json\s*|```\s*/g, '').trim()),
    () => { const m = text.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('no match'); },
    () => { const s = text.indexOf('{'), e = text.lastIndexOf('}'); if (s !== -1 && e !== -1) return JSON.parse(text.slice(s, e + 1)); throw new Error('no block'); },
  ];
  for (const strategy of strategies) {
    try { return strategy(); } catch (_) {}
  }
  return null;
}

export async function POST(request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY not set in environment variables.' }, { status: 500 });

    const { previousDraftList } = await request.json().catch(() => ({}));
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const draftContext = previousDraftList
      ? `Yesterday's Tankathon top-15 order was: ${previousDraftList}. Use this to calculate the change field for each prospect.`
      : `No previous draft data — set change to "0" for all prospects.`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Generate the morning basketball briefing JSON for ${dateStr}. Search for NBA scores, CBB scores, all legacy players on the list, Tankathon top-15 lottery projections, and last night's ATS results. ${draftContext} Return ONLY valid JSON matching the specified structure.`
      }]
    });

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    let parsed = extractJSON(rawText);

    // Auto-repair if parse failed
    if (!parsed) {
      const repair = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: `Fix this broken JSON and return ONLY the corrected JSON, nothing else:\n\n${rawText.slice(0, 8000)}` }]
      });
      const repairText = repair.content.filter(b => b.type === 'text').map(b => b.text).join('');
      parsed = extractJSON(repairText);
    }

    if (!parsed) return Response.json({ error: 'Could not parse briefing data. Please try again.' }, { status: 500 });

    // Safe defaults
    parsed.nba = parsed.nba || { games: [], players: [], context: '' };
    parsed.cbb = parsed.cbb || { games: [], players: [], context: '' };
    parsed.legacyWatch = parsed.legacyWatch || { players: [], empty: true };
    parsed.draftWatch = parsed.draftWatch || { prospects: [], context: '' };
    parsed.statOfMorning = parsed.statOfMorning || { stat: '', context: '' };
    parsed.lineUpsets = parsed.lineUpsets || { upsets: [], empty: true, emptyMessage: 'No data available.' };
    parsed.lineBeats = parsed.lineBeats || [];

    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
