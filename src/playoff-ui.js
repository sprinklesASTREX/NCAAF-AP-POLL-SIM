import {playoffRounds,playoffChampion} from './playoff.js';

export function renderPlayoff(bracket,icon,esc) {
  if(!bracket)return '<div class="empty">Open Playoff to seed the current Top 12.</div>';
  const champion=playoffChampion(bracket);
  return `<div class="section-head"><h2>12-team playoff</h2><span>${bracket.week?'Week '+bracket.week:'Preseason'} seeds</span></div>
  <div class="playoff-tools"><button id="reseed-playoff">Use current Top 12</button><button id="simulate-round">Simulate round</button><button id="simulate-playoff">Simulate rest</button><span class="muted">Top 4 get byes. Pick winners or add scores.</span></div>
  ${champion?`<div class="champion"><span>Champion</span>${icon(champion)}<strong>${esc(champion.name)}</strong></div>`:''}
  <div class="bracket-scroll"><div class="bracket">${playoffRounds(bracket).map(round=>`<section class="bracket-round"><h3>${round.name}</h3><div class="round-games">${round.games.map(game=>`<form class="bracket-game" data-playoff-game="${game.id}">${[game.a,game.b].map((team,i)=>`<div class="bracket-slot ${team&&game.winner?.id===team.id?'winner':''}"><button type="button" ${!game.ready?'disabled':''} data-pick-game="${game.id}" data-pick-team="${esc(team?.id||'')}" aria-pressed="${!!team&&game.winner?.id===team.id}">${team?`<small>${team.seed}</small>${icon(team)}<span>${esc(team.name)}</span>`:'<span class="muted">TBD</span>'}</button><input type="number" min="0" max="200" name="${i?'as':'hs'}" aria-label="${esc(team?.name||'TBD')} score in ${game.id}" placeholder="—" value="${game.result?.[i?'as':'hs']??''}" required ${!game.ready?'disabled':''}></div>`).join('')}<div class="bracket-game-actions"><button type="submit" ${!game.ready?'disabled':''}>Save score</button><button type="button" data-clear-game="${game.id}" ${!game.result?'disabled':''}>Clear</button></div></form>`).join('')}</div></section>`).join('')}</div></div>`;
}
