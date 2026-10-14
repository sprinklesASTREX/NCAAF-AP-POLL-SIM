const layout = [
  { name: 'First round', games: [['r1a', 8, 9], ['r1b', 5, 12], ['r1c', 6, 11], ['r1d', 7, 10]] },
  { name: 'Quarterfinals', games: [['q1', 1, 'r1a'], ['q2', 4, 'r1b'], ['q3', 3, 'r1c'], ['q4', 2, 'r1d']] },
  { name: 'Semifinals', games: [['s1', 'q1', 'q2'], ['s2', 'q3', 'q4']] },
  { name: 'Championship', games: [['final', 's1', 's2']] }
];

export function createPlayoff(ranked, week = 0) {
  if (ranked.length < 12 || new Set(ranked.slice(0, 12).map(t => t.id)).size !== 12 || ranked.slice(0,12).some(t=>!t.id||!t.name||!Number.isFinite(t.rating))) throw Error('A playoff needs 12 different teams.');
  return { week, seeds: ranked.slice(0, 12).map((t, i) => ({id:t.id,name:t.name,espn:t.espn||null,custom:!!t.custom,color:t.color||null,seed:i+1,rating:t.rating})), results:{} };
}

export function playoffRounds(bracket) {
  const winners = {};
  const resolve = ref => typeof ref === 'number' ? bracket.seeds[ref - 1] : winners[ref];
  return layout.map(round => ({ name: round.name, games: round.games.map(([id, aRef, bRef]) => {
    const a = resolve(aRef), b = resolve(bRef), stored = bracket.results[id];
    const result = a && b && stored?.a === a.id && stored?.b === b.id && [a.id,b.id].includes(stored.winner) ? stored : null;
    const winner = result ? (result.winner === a.id ? a : b) : null;
    winners[id] = winner;
    return {id,a,b,result,winner,ready:!!(a&&b)};
  }) }));
}

function setResult(bracket, id, outcome) {
  const game = playoffRounds(bracket).flatMap(r=>r.games).find(g=>g.id===id);
  if (!game?.ready) throw Error('Finish the earlier matchup first.');
  if (![game.a.id,game.b.id].includes(outcome.winner)) throw Error('Choose a team in this matchup.');
  const next = structuredClone(bracket);
  next.results[id] = {a:game.a.id,b:game.b.id,...outcome};
  for (const g of playoffRounds(next).flatMap(r=>r.games)) if(next.results[g.id]&&!g.result)delete next.results[g.id];
  return next;
}

export function enterPlayoffScore(bracket, id, hs, as) {
  if (![hs,as].every(x=>Number.isInteger(x)&&x>=0&&x<=200)||hs===as) throw Error('Use final scores from 0–200, with no ties.');
  const game=playoffRounds(bracket).flatMap(r=>r.games).find(g=>g.id===id);
  if(!game?.ready)throw Error('Finish the earlier matchup first.');
  return setResult(bracket,id,{winner:hs>as?game.a.id:game.b.id,hs,as});
}

export function pickPlayoffWinner(bracket,id,winner) { return setResult(bracket,id,{winner,hs:null,as:null}); }

export function clearPlayoffGame(bracket,id) {
  const next=structuredClone(bracket);delete next.results[id];
  for(const g of playoffRounds(next).flatMap(r=>r.games))if(next.results[g.id]&&!g.result)delete next.results[g.id];
  return next;
}

export function simulatePlayoff(bracket, all = false, random = Math.random) {
  let next=structuredClone(bracket);
  for(let round=0;round<layout.length;round++) {
    const games=playoffRounds(next)[round].games.filter(g=>g.ready&&!g.result);
    for(const game of games){
      const difference=(game.a.rating-game.b.rating)*.3;
      const hs=Math.max(0,Math.round(25+difference+(random()-.5)*28));
      let as=Math.max(0,Math.round(25-difference+(random()-.5)*28));
      if(hs===as)as+=3;
      next=enterPlayoffScore(next,game.id,hs,as);
    }
    if(games.length&&!all)break;
  }
  return next;
}

export const playoffChampion = bracket => playoffRounds(bracket).at(-1).games[0].winner;
