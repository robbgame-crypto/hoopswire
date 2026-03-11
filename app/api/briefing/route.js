import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are an analytical basketball data assistant. You have access to web search. Search aggressively for real data.

SEARCH FOR:
1. All NBA games last night — scores, box scores for top performers
2. Top CBB games last night — scores, box scores
3. These specific legacy players (search each by name): Bronny James, Scotty Pippen Jr., Sharife Cooper, Sedrick Barefield, Amari Bailey, Keyonte George, Scoot Henderson, Cam Boozer, Clay Boozer, Dominique Wilkins Jr., Toby Flagg, any sibling of Cooper Flagg, any son of Rick Brunson, and any other son/sibling of a former NBA or prominent college player
4. Top NBA Draft prospects playing in CBB — search Tankathon.com for today's top 15 lottery projections
5. Closing point spreads for last night's NBA and CBB games — search for ATS results

YOU MUST RESPOND WITH ONLY VALID JSON. No prose before or after. No markdown code fences. Just raw JSON.

Return this exact structure:
{
  "nba": {
    "games": [
      { "home": "Team", "homeScore": 0, "away": "Team", "awayScore": 0, "note": "" }
    ],
    "players": [
      { "name": "Player", "team": "Team", "pts": 0, "reb": 0, "ast": 0, "stl": 0, "blk": 0, "fg": "12/22", "plusMinus": "+8" }
    ],
    "context": "2-3 sentences of analytical narrative about last night's NBA action."
  },
  "cbb": {
    "games": [
      { "home": "Team", "homeScore": 0, "away": "Team", "awayScore": 0, "note": "" }
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
      { "rank": 1, "change": "0", "name": "Player", "school": "School", "mockPick": "1", "notes": "Brief note" }
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
  }
}

RULES:
- change field: "+2" up, "-1" down, "0" no change, "NEW" new entry
- If no legacy players, set empty:true and players:[]
- If no notable upsets, set empty:true, upsets:[], emptyMessage:"Clean night — no major line upsets to report."
- All number fields must be numbers not strings
- Return ONLY the JSON. Nothing else.`;

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
      ? `Yesterday's Tankathon top-15 order was: ${previousDraftList}. Use this to calculate the change field.`
      : `No previous draft data — set change to "0" for all prospects.`;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Generate the morning basketball briefing JSON for ${dateStr}. Search for NBA scores, CBB scores, all legacy players, Tankathon top-15 lottery projections, and last night's ATS results. ${draftContext} Return ONLY valid JSON.`
      }]
    });

    const rawText = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    let parsed = extractJSON(rawText);

    // If parse failed, make a repair call
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

    return Response.json(parsed);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
