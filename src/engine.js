import { teams, preseason, espnSnapshot, currentSeed } from './data.js';

export const MODEL_VERSION = 3;

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

function initialRatings(seed) {
  return Object.fromEntries(teams.map(team => {
    const rank = seed.indexOf(team.id);
    const fringe = espnSnapshot.others.findIndex(t => t.id === team.id);
    // Keep the voting bubble competitive, using preseason votes and prior-season performance.
    const unranked = fringe >= 0 ? 72.6 - fringe * .42 : 48 + team.performanceStrength * .23;
    return [team.id, rank >= 0 ? 96 - rank * .95 : Math.min(72.6, unranked)];
  }));
}

export function createSeason(seed = preseason, week = 0) {
  if (seed.length !== 25 || new Set(seed).size !== 25 || seed.some(id => !teams.some(t => t.id === id))) {
    throw Error('Choose 25 different teams.');
  }
  return {
    modelVersion: MODEL_VERSION, week, initialWeek: week, seed: [...seed], results: [], history: [],
    ratings: initialRatings(seed),
    records: Object.fromEntries(teams.map(t => [t.id, { w: 0, l: 0 }]))
  };
}

export function createEspnSeason() {
  const state = createSeason(currentSeed, 0);
  return { ...state, source: 'espn', voters: espnSnapshot.voters || 63, snapshotDate: espnSnapshot.pollDate };
}

export function poll(state) {
  if (state.source === 'espn' && state.results.length === 0) {
    const values = [...espnSnapshot.poll, ...espnSnapshot.others];
    return teams.map(team => {
      const entry = values.find(t => t.id === team.id);
      return { ...team, points: entry?.points || 0, first: entry?.first || 0,
        rating: state.ratings[team.id], ...state.records[team.id], rank: entry?.rank || 999 };
    }).sort((a, b) => a.rank - b.rank || b.points - a.points || b.rating - a.rating)
      .map((team, i) => ({ ...team, rank: team.rank === 999 ? i + 1 : team.rank }));
  }
  const points = Object.fromEntries(teams.map(t => [t.id, 0]));
  const first = {};
  for (let voter = 0; voter < (state.voters || 63); voter++) {
    const ballot = teams.map((team, i) => {
      const rating = state.ratings[team.id];
      // Voters agree more about elite teams and differ more near the Top 25 cutoff.
      const spread = clamp(3 + (90 - rating) * .2, 2.5, 7);
      const preference = Math.sin((voter + 1) * (i + 11) * 1.618) * spread;
      return { id: team.id, score: rating + preference };
    }).sort((a, b) => b.score - a.score).slice(0, 25);
    ballot.forEach((team, i) => {
      points[team.id] += 25 - i;
      if (i === 0) first[team.id] = (first[team.id] || 0) + 1;
    });
  }
  return teams.map(t => ({ ...t, points: points[t.id], first: first[t.id] || 0,
    rating: state.ratings[t.id], ...state.records[t.id] }))
    .sort((a, b) => b.points - a.points || b.rating - a.rating || a.name.localeCompare(b.name))
    .map((t, i) => ({ ...t, rank: i + 1 }));
}

export function advance(state, games) {
  const seen = new Set();
  for (const game of games) {
    if (game.home === game.away || !teams.some(t => t.id === game.home) || !teams.some(t => t.id === game.away)) {
      throw Error('Each game needs two different roster teams.');
    }
    if (seen.has(game.home) || seen.has(game.away)) throw Error('A team can play only once per week.');
    seen.add(game.home); seen.add(game.away);
    if (![game.hs, game.as].every(score => Number.isInteger(score) && score >= 0 && score <= 200) || game.hs === game.as) {
      throw Error('Use final scores from 0–200, with no ties.');
    }
  }
  if (!games.length) throw Error('Add results or simulate this week first.');
  const next = structuredClone(state);
  const before = poll(state);
  const notes = [];
  for (const game of games) {
    const winner = game.hs > game.as ? game.home : game.away;
    const loser = winner === game.home ? game.away : game.home;
    const winnerRating = state.ratings[winner], loserRating = state.ratings[loser];
    const winnerTeam = teams.find(t => t.id === winner);
    const unrankedWinner = before.find(t => t.id === winner).rank > 25;
    const expected = 1 / (1 + Math.exp((loserRating - winnerRating + (winner === game.home ? -2.5 : 2.5)) / 9));
    const margin = Math.abs(game.hs - game.as);
    const blowout = clamp((margin - 10) / 25, 0, 1.5);
    const loserRank = before.find(t => t.id === loser).rank;
    const quality = clamp((loserRating - 62) / 30, 0, 1.25);
    const badLoss = Math.max(0, (60 - winnerTeam.strength) / 25) * .5 + Math.max(0, (55 - winnerTeam.performanceStrength) / 25) * .5;
    // Opponent quality drives credit. A close elite win matters far more than a weak blowout.
    const rankedBonus = loserRank <= 10 ? 3.5 : loserRank <= 25 ? 1.5 : 0;
    let gain = quality * (1.5 + (1 - expected) * 9) + rankedBonus + (1 - expected) * .4
      + Math.min(margin, 28) / 28 * quality * .8;
    // Routine wins cannot steadily inflate a strong team's rating into the Top 25.
    // This applies to every conference; there is no win-count or conference shortcut.
    if (loserRank > 25) gain *= clamp((loserRating + 12 - winnerRating) / 12, 0, 1);
    // A big loss is costly even against a ranked opponent. Unranked blowouts are harsher.
    const blowoutPenalty = blowout * (unrankedWinner ? 18 : 12);
    const drop = 2 + (1 - expected) * 7 + badLoss * 2 + blowoutPenalty;
    next.ratings[winner] = Math.min(150, winnerRating + gain);
    next.ratings[loser] = Math.max(5, loserRating - drop);
    next.records[winner].w++; next.records[loser].l++;
    const reason = margin >= 21 ? `${margin}-point blowout loss to ${unrankedWinner ? 'an unranked' : 'a ranked'} opponent` : expected < .35 ? 'upset loss' : 'loss';
    notes.push({ ...game, winner, loser, gain, drop, margin, blowout: margin >= 21,
      opponentRank: loserRank, opponentRating: loserRating, upset: expected < .35,
      explanation: `${winner}: +${gain.toFixed(1)} rating (${loserRank <= 25 ? '#' + loserRank : 'unranked'} opponent). ${loser}: −${drop.toFixed(1)} (${reason}).` });
  }
  next.history.push({ week: state.week, poll: before });
  next.week++;
  next.results.push({ week: next.week, games: notes });
  return next;
}

// Re-score saved results without discarding the user's season or changing any score.
export function upgradeSeason(saved) {
  if (saved.modelVersion === MODEL_VERSION) return saved;
  let next = saved.source === 'espn' ? createEspnSeason() : createSeason(saved.seed, saved.initialWeek || 0);
  if (saved.customSeed) next.customSeed = true;
  for (const week of saved.results) {
    next = advance(next, week.games.map(({ home, away, hs, as }) => ({ home, away, hs, as })));
  }
  return next;
}

// Recompute from the start-of-week state, so editing a result never counts it twice.
export function workingSeason(state, games, autoUpdate = true) {
  return autoUpdate && games.length ? advance(state, games) : state;
}

export function simulate(state, excluded = [], random = Math.random) {
  const pool = teams.filter(t => !excluded.includes(t.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const games = [];
  for (let i = 0; i + 1 < pool.length; i += 2) {
    const home = pool[i], away = pool[i + 1];
    const homeBase = (home.stats.ppg + away.stats.allowed) / 2;
    const awayBase = (away.stats.ppg + home.stats.allowed) / 2;
    const hs = Math.max(0, Math.round(homeBase + 2 + (state.ratings[home.id] - state.ratings[away.id]) * .2 + (random() - .5) * 28));
    let as = Math.max(0, Math.round(awayBase + (state.ratings[away.id] - state.ratings[home.id]) * .2 + (random() - .5) * 28));
    if (hs === as) as += 3;
    games.push({ home: home.id, away: away.id, hs, as });
  }
  return games;
}
