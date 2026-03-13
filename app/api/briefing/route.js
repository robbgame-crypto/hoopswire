import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a basketball data assistant. Use web search to find real data. Return ONLY valid JSON.

SEARCH FOR (max 6 searches total — be efficient):
1. NBA scores last night + top box scores
2. CBB scores last night + top box scores  
3. Tankathon.com 2026 NBA mock draft top 15 (real names/schools only, no TBD)
4. Last night ATS results NBA and CBB
5. Any of these legacy players who played: Bronny James, Scotty Pippen Jr., Jase Richardson (son of Jason Richardson), Cameron Boozer (son of Carlos Boozer), Cayden Boozer (son of Carlos Boozer), Jacob Wilkins (son of Dominique Wilkins), Keyonte George, Ausar Thompson (brother of Amen Thompson), Amen Thompson (brother of Ausar Thompson), Lonzo Ball (brother of LaMelo Ball), LaMelo Ball (brother of Lonzo Ball), Brook Lopez (twin brother of Robin Lopez), Robin Lopez (twin brother of Brook Lopez), Keegan Murray (twin brother of Kris Murray), Kris Murray (twin brother of Keegan Murray), Jalen McDaniels (brother of Jaden McDaniels), Jaden McDaniels (brother of Jalen McDaniels), Jalen Williams (brother of Cody Williams), Cody Williams (brother of Jalen Williams), Giannis Antetokounmpo (brother of Thanasis and Kostas), Thanasis Antetokounmpo (brother of Giannis), Kostas Antetokounmpo (brother of Giannis), Seth Curry (brother of Steph Curry), Max Christie (brother of Cam Christie), Cam Christie (brother of Max Christie), Franz Wagner (brother of Moritz Wagner), Moritz Wagner (brother of Franz Wagner), Sharife Cooper, Amari Bailey

RULES:
- Skip games with 0-0 scores
- Draft: use REAL player names from Tankathon, never guess or use TBD
- change field: "+2" up, "-1" down, "0" no change, "NEW" new entry
- lineBeats: exactly 3 punchy one-liner observations
- ONLY return JSON, nothing else

JSON structure:
{"nba":{"games":[{"home":"Team","homeScore":0,"away":"Team","awayScore":0,"note":""}],"players":[{"name":"","team":"","pts":0,"reb":0,"ast":0,"stl":0,"blk":0,"fg":"","plusMinus":""}],"context":""},"cbb":{"games":[{"home":"","homeScore":0,"away":"","awayScore":0,"note":""}],"players":[{"name":"","team":"","pts":0,"reb":0,"ast":0,"stl":0,"blk":0,"fg":"","isDraftProspect":false}],"context":""},"legacyWatch":{"players":[{"name":"","relation":"","pts":0,"reb":0,"ast":0,"stl":0,"blk":0,"avgPts":0,"avgReb":0,"avgAst":0,"context":""}],"empty":false},"draftWatch":{"prospects":[{"rank":1,"change":"0","name":"","school":"","mockPick":"1","notes":""}],"context":""},"statOfMorning":{"stat":"","context":""},"lineUpsets":{"upsets":[{"game":"","line":"","result":"","beatBy":"","context":""}],"empty":false,"emptyMessage":""},"lineBeats":["","",""]}`;

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
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 }],
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
        max_tokens: 2500,
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
