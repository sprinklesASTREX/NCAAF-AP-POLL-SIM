import './style.css';
import {getTeams,addCustomTeam,editCustomTeam,removeCustomTeam} from './custom-teams.js';
import {createPlayoff,playoffRounds,pickPlayoffWinner,enterPlayoffScore,clearPlayoffGame,simulatePlayoff} from './playoff.js';
import {renderPlayoff} from './playoff-ui.js';
import {teams,logo,espnSnapshot} from './data.js';
import {createSeason,createEspnSeason,poll,advance,simulate,workingSeason,upgradeSeason,MODEL_VERSION} from './engine.js';
// v2 starts the requested 2026 preseason; the previous season remains stored under v1.
const key='saturday-season-v2';
let baseState;
try { baseState=JSON.parse(localStorage.getItem(key)); if(!baseState?.ratings||teams.some(t=>!Number.isFinite(baseState.ratings[t.id])))throw Error(); }
catch { baseState=createEspnSeason(); }
if(baseState.modelVersion!==MODEL_VERSION){localStorage.setItem(key+'-before-v3',JSON.stringify(baseState));baseState=upgradeSeason(baseState);}
let settings={autoUpdate:true,darkMode:false};
try { const saved=JSON.parse(localStorage.getItem(key+'-settings')); if(typeof saved?.autoUpdate==='boolean')settings.autoUpdate=saved.autoUpdate;if(typeof saved?.darkMode==='boolean')settings.darkMode=saved.darkMode; } catch {}
let queued=[];
try { queued=JSON.parse(localStorage.getItem(key+'-queue'))||[]; if(queued.length)advance(baseState,queued); } catch { queued=[]; }
let appliedGames=[];
try { const saved=JSON.parse(localStorage.getItem(key+'-applied'))||[];appliedGames=queued.filter(g=>saved.some(x=>x.home===g.home&&x.away===g.away&&x.hs===g.hs&&x.as===g.as)); } catch {}
let playoff=null;
try{const saved=JSON.parse(localStorage.getItem(key+'-playoff'));if(saved&&saved.seeds?.length===12&&new Set(saved.seeds.map(t=>t.id)).size===12&&saved.results&&saved.seeds.every(t=>Number.isFinite(t.rating))){playoffRounds(saved);playoff=saved;}}catch{}
let teamEditor=null;
let state=baseState;
const roster=()=>getTeams(baseState);
const teamName=id=>roster().find(t=>t.id===id)?.name||id;
function savePlayoff(){localStorage.setItem(key+'-playoff',JSON.stringify(playoff));}

const voters=()=>state.voters||63;
let view='poll',filter='',conference='All conferences',toast='',seedOpen=false,settingsOpen=false;
let draft={home:'Texas',away:'Ohio State',hs:'',as:''};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=t=>{
 if(t.custom){const color=/^#[0-9a-f]{6}$/i.test(t.color)?t.color:'#347b55';const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));const ink=rgb[0]*.299+rgb[1]*.587+rgb[2]*.114>160?'#17231d':'#fff';return `<span class="crest custom-crest" style="background:${color};color:${ink}" aria-label="${esc(t.name)}"><b>${esc(t.name.split(' ').map(x=>x[0]).slice(0,3).join('').toUpperCase())}</b></span>`;}
 return `<span class="crest"><img src="${logo(t)}" alt="${esc(t.name)} logo" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.hidden=false"><b hidden>${esc(t.name.split(' ').map(s=>s[0]).slice(0,3).join(''))}</b></span>`;
};
const opts=(value='')=>roster().slice().sort((a,b)=>a.name.localeCompare(b.name)).map(t=>`<option value="${esc(t.id)}" ${t.id===value?'selected':''}>${esc(t.name)}</option>`).join('');
function save(){localStorage.setItem(key,JSON.stringify(baseState));}
function render(){
 document.documentElement.dataset.theme=settings.darkMode?'dark':'light';
 document.querySelector('meta[name=theme-color]').content=settings.darkMode?'#151719':'#f3f4f6';
 if(settings.autoUpdate)appliedGames=[...queued];
 state=workingSeason(baseState,appliedGames);
 localStorage.setItem(key+'-applied',JSON.stringify(appliedGames));
 localStorage.setItem(key+'-queue',JSON.stringify(queued));
 const ranked=poll(state),last=state.history.at(-1)?.poll||[];
 const others=ranked.filter(t=>t.rank>25&&t.points>0);
 const dropped=last.filter(t=>t.rank<=25&&!ranked.slice(0,25).some(x=>x.id===t.id));
 const movement=t=>{
  const old=last.find(x=>x.id===t.id)?.rank,delta=old?old-t.rank:0;
  return delta?`<span class="${delta>0?'up':'down'}">${delta>0?'↑':'↓'}${Math.abs(delta)}</span>`:'<span class="same">—</span>';
 };
 const rows=ranked.slice(0,25).map(t=>`<tr><td class="rank">${t.rank}</td><td><div class="teamcell">${icon(t)}<strong>${esc(t.name)}</strong>${t.first?`<span class="first" title="${t.first} first-place votes">(${t.first})</span>`:''}</div></td><td>${t.w}–${t.l}</td><td class="points">${t.points.toLocaleString()}</td><td>${movement(t)}</td></tr>`).join('');
 const pollView=`<div class="section-head"><h2>Top 25</h2><span>${state.week?'Week '+state.week:'Preseason'}</span></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Team</th><th>W–L</th><th>Pts</th><th>+/−</th></tr></thead><tbody>${rows}</tbody></table></div><section class="receiving"><h3>Others receiving votes</h3><div class="vote-list">${others.map(t=>`<span>${esc(t.name)} <b>${t.points}</b></span>`).join('')||'<span class="muted">None</span>'}</div></section>${dropped.length?`<section class="receiving"><h3>Dropped out</h3><div class="vote-list">${dropped.map(t=>`<span>${esc(t.name)} <b>#${t.rank}</b></span>`).join('')}</div></section>`:''}`;
 const teamsView=`<div class="section-head"><h2>Teams <small class="muted">${roster().length}</small></h2><button id="add-team">Add team</button></div><div class="filters"><input id="search" aria-label="Search teams" placeholder="Search teams" value="${esc(filter)}"><select id="conference" aria-label="Conference">${['All conferences',...new Set(roster().map(t=>t.conference))].map(c=>`<option ${conference===c?'selected':''}>${c}</option>`).join('')}</select></div><div class="team-grid">${ranked.filter(t=>t.name.toLowerCase().includes(filter.toLowerCase())&&(conference==='All conferences'||t.conference===conference)).map(t=>`<article><div class="card-team">${icon(t)}<strong>${esc(t.name)}</strong></div><div class="card-record"><span>${t.rank<=25?'#'+t.rank:t.conference}</span><b>${t.w}–${t.l}</b></div>${t.custom?`<div class="custom-team-controls"><span class="muted">Strength ${t.startingStrength}</span><button data-edit-team="${esc(t.id)}">Edit</button><button data-delete-team="${esc(t.id)}">Remove</button></div>`:`<details><summary>Stats</summary><p class="team-stats">2025: ${t.stats.historicalW}–${t.stats.historicalL}<br>${t.stats.ppg.toFixed(1)} PPG · ${t.stats.allowed.toFixed(1)} allowed<br>${(t.stats.passingYpg+t.stats.rushingYpg).toFixed(0)} yards/game</p><a href="https://www.espn.com/college-football/team/stats/_/id/${t.espn}" target="_blank" rel="noopener noreferrer">ESPN ↗</a></details>`}</article>`).join('')||'<p class="muted">No teams found.</p>'}</div>`;
 const resultsView=`<div class="section-head"><h2>Results</h2></div>${state.results.length?state.results.slice().reverse().map(w=>`<section class="week-results"><h3>Week ${w.week}</h3>${w.games.map(g=>`<article class="result"><div class="result-line"><span>${esc(teamName(g.home))} <b>${g.hs}</b></span><span>${esc(teamName(g.away))} <b>${g.as}</b></span>${g.upset?'<small class="upset">Upset</small>':''}</div><details><summary>Rating change</summary><p>${esc(g.explanation)}</p></details></article>`).join('')}</section>`).join(''):'<p class="empty">No games yet.</p>'}`;
 document.querySelector('#app').innerHTML=`
 <header><a class="brand" href="#">College Poll</a><span class="week-badge">${state.week?'Week '+state.week:'Preseason'} <small>2026</small></span><div class="header-actions"><button id="theme-toggle" aria-pressed="${settings.darkMode}" aria-label="Switch to ${settings.darkMode?'light':'dark'} mode">${settings.darkMode?'Light':'Dark'}</button><button id="settings-toggle" aria-expanded="${settingsOpen}" aria-controls="settings">Settings</button></div></header>
 <main>
 <section id="settings" class="settings-panel" ${settingsOpen?'':'hidden'} aria-label="Settings">
 <label class="toggle-setting"><input id="dark-mode" type="checkbox" ${settings.darkMode?'checked':''}>Dark mode</label>
 <label class="toggle-setting"><input id="auto-update" type="checkbox" ${settings.autoUpdate?'checked':''}>Auto-update poll</label>
 <div class="settings-actions"><button id="edit-seed">Edit starting poll</button><button id="reset">New season</button><button id="how">Ranking rules</button><a href="${esc(espnSnapshot.source)}" target="_blank" rel="noopener noreferrer">2026 preseason AP poll ↗</a></div>
 </section>
 <nav aria-label="Simulator views"><button data-view="poll" class="${view==='poll'?'active':''}">Top 25</button><button data-view="teams" class="${view==='teams'?'active':''}">Teams</button><button data-view="playoff" class="${view==='playoff'?'active':''}">Playoff</button><button data-view="results" class="${view==='results'?'active':''}">Results${state.results.length?` <span>${state.results.length}</span>`:''}</button></nav>
 <div class="workspace ${view==='playoff'?'playoff-wide':''}"><section class="primary">${view==='poll'?pollView:view==='teams'?teamsView:view==='playoff'?renderPlayoff(playoff,icon,esc):resultsView}</section>
 <aside><div class="game-panel"><div class="section-head"><h2>Add a game</h2><span>Week ${baseState.week+1}</span></div>
 <form id="game-form"><div class="score-row"><label for="home">Home</label><select id="home" name="home">${opts(draft.home)}</select><input name="hs" type="number" value="${esc(draft.hs)}" placeholder="0" min="0" max="200" required aria-label="Home score"></div><div class="score-row"><label for="away">Away</label><select id="away" name="away">${opts(draft.away)}</select><input name="as" type="number" value="${esc(draft.as)}" placeholder="0" min="0" max="200" required aria-label="Away score"></div><button class="add-btn" type="submit">Add result</button></form>
 <div class="game-actions"><button id="simulate">Simulate games</button>${!settings.autoUpdate?'<button id="update-poll">Update poll</button>':''}<button class="next-btn" id="advance">Next week →</button></div>
 ${queued.length?`<details class="queue" open><summary>This week <span>${queued.length}</span></summary><div class="queue-list">${queued.map((g,i)=>`<div class="queued"><span>${esc(teamName(g.home))} <b>${g.hs}</b><br>${esc(teamName(g.away))} <b>${g.as}</b></span><button data-remove="${i}" aria-label="Remove ${esc(teamName(g.home))} vs ${esc(teamName(g.away))}">×</button></div>`).join('')}</div></details>`:''}
 </div></aside></div>
 </main>
 ${toast?`<div class="toast" role="status">${esc(toast)}<button id="dismiss" aria-label="Dismiss">×</button></div>`:''}
 ${seedOpen?`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Edit starting poll"><button id="close-modal" class="close" aria-label="Close">×</button><h2>Starting Top 25</h2><p>One team per line. Starts a new season.</p><textarea id="seed-input" rows="12" aria-label="Starting Top 25">${state.seed.map(teamName).join('\n')}</textarea><button class="add-btn" id="save-seed">Start season</button></section></div>`:''}
 ${teamEditor?`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${teamEditor.id?'Edit':'Add'} custom team"><button id="close-team" class="close" aria-label="Close">×</button><h2>${teamEditor.id?'Edit':'Add'} custom team</h2><form id="team-form"><label for="team-name">Name</label><input id="team-name" name="name" value="${esc(teamEditor.name)}" minlength="2" maxlength="40" required><label for="team-conference">Conference</label><input id="team-conference" name="conference" value="${esc(teamEditor.conference)}" maxlength="30" required><div class="custom-fields"><div><label for="team-strength">Starting strength (25–99)</label><input id="team-strength" name="strength" type="number" min="25" max="99" value="${teamEditor.strength}" required></div><div><label for="team-color">Color</label><input id="team-color" name="color" type="color" value="${esc(teamEditor.color)}"></div></div><button class="add-btn" type="submit">${teamEditor.id?'Save team':'Add team'}</button></form></section></div>`:''}`;
 bind();
}
let toastTimer;
function message(s){toast=s;render();clearTimeout(toastTimer);if(s.length<150)toastTimer=setTimeout(()=>{if(toast===s){toast='';document.querySelector('.toast')?.remove();}},4000);}
function bind(){
 const openTeam=team=>{teamEditor=team?{id:team.id,name:team.name,conference:team.conference,strength:team.startingStrength,color:team.color}:{name:'',conference:'Custom',strength:65,color:'#347b55'};render();};
 document.querySelector('#add-team')?.addEventListener('click',()=>openTeam());
 document.querySelectorAll('[data-edit-team]').forEach(b=>b.onclick=()=>openTeam(baseState.customTeams.find(t=>t.id===b.dataset.editTeam)));
 document.querySelector('#close-team')?.addEventListener('click',()=>{teamEditor=null;render();});
 const teamForm=document.querySelector('#team-form');
 if(teamForm){teamForm.oninput=()=>{teamEditor={...teamEditor,...Object.fromEntries(new FormData(teamForm))};};teamForm.onsubmit=e=>{e.preventDefault();try{const input=Object.fromEntries(new FormData(teamForm));const updated=teamEditor.id?editCustomTeam(baseState,teamEditor.id,input):addCustomTeam(baseState,input);if(!teamEditor.id)draft.home=updated.customTeams.at(-1).id;baseState=updated;save();filter=input.name;conference='All conferences';teamEditor=null;message('Team saved.');}catch(error){message(error.message);}};}
 document.querySelectorAll('[data-delete-team]').forEach(b=>b.onclick=()=>{try{const id=b.dataset.deleteTeam;if(queued.some(g=>g.home===id||g.away===id))throw Error('Remove this team’s current-week game first.');if(playoff?.seeds.some(t=>t.id===id))throw Error('This team is in the playoff. Reseed the bracket before removing it.');const next=removeCustomTeam(baseState,id);if(!confirm('Remove this custom team?'))return;baseState=next;if(draft.home===id)draft.home='Texas';if(draft.away===id)draft.away='Ohio State';save();message('Team removed.');}catch(error){message(error.message);}});
 const changePlayoff=fn=>{try{playoff=fn();savePlayoff();render();}catch(error){message(error.message);}};
 document.querySelector('#reseed-playoff')?.addEventListener('click',()=>{if(Object.keys(playoff.results).length&&!confirm('Replace this bracket with the current Top 12?'))return;changePlayoff(()=>createPlayoff(poll(state),state.week));});
 document.querySelectorAll('[data-pick-game]').forEach(b=>b.onclick=()=>changePlayoff(()=>pickPlayoffWinner(playoff,b.dataset.pickGame,b.dataset.pickTeam)));
 document.querySelectorAll('[data-playoff-game]').forEach(form=>form.onsubmit=e=>{e.preventDefault();const data=new FormData(form);changePlayoff(()=>enterPlayoffScore(playoff,form.dataset.playoffGame,Number(data.get('hs')),Number(data.get('as'))));});
 document.querySelectorAll('[data-clear-game]').forEach(b=>b.onclick=()=>changePlayoff(()=>clearPlayoffGame(playoff,b.dataset.clearGame)));
 document.querySelector('#simulate-round')?.addEventListener('click',()=>changePlayoff(()=>simulatePlayoff(playoff)));
 document.querySelector('#simulate-playoff')?.addEventListener('click',()=>changePlayoff(()=>simulatePlayoff(playoff,true)));

 document.querySelector('#settings-toggle').onclick=()=>{settingsOpen=!settingsOpen;render();};
 const gameForm=document.querySelector('#game-form');gameForm.oninput=gameForm.onchange=()=>{draft=Object.fromEntries(new FormData(gameForm));};
 document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;if(view==='playoff'&&!playoff){playoff=createPlayoff(poll(state),state.week);savePlayoff();}render();});
 document.querySelector('#theme-toggle').onclick=()=>{settings.darkMode=!settings.darkMode;localStorage.setItem(key+'-settings',JSON.stringify(settings));render();};
 document.querySelector('#dark-mode').onchange=e=>{settings.darkMode=e.target.checked;localStorage.setItem(key+'-settings',JSON.stringify(settings));render();};
 document.querySelector('#auto-update').onchange=e=>{
  settings.autoUpdate=e.target.checked;localStorage.setItem(key+'-settings',JSON.stringify(settings));
  message(settings.autoUpdate?'Auto-update on.':'Auto-update off.');
 };
 document.querySelector('#game-form').onsubmit=e=>{
  e.preventDefault();const f=new FormData(e.target),g={home:f.get('home'),away:f.get('away'),hs:Number(f.get('hs')),as:Number(f.get('as'))};
  try{advance(baseState,[...queued,g]);queued.push(g);draft.hs='';draft.as='';message(settings.autoUpdate?'Score saved. Poll updated.':'Game saved for this week.');}catch(e){message(e.message);}
 };
 document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const [removed]=queued.splice(Number(b.dataset.remove),1);appliedGames=appliedGames.filter(g=>g.home!==removed.home);render();});
 document.querySelector('#simulate').onclick=()=>{queued.push(...simulate(baseState,queued.flatMap(g=>[g.home,g.away])));message(settings.autoUpdate?'Games simulated.':'Games saved.');};
 document.querySelector('#update-poll')?.addEventListener('click',()=>{if(!queued.length)return message('Add a result first.');appliedGames=[...queued];message('This week’s poll is updated.');});
 document.querySelector('#advance').onclick=()=>{
  try{baseState=advance(baseState,queued);queued=[];appliedGames=[];save();message(`Week ${baseState.week} is complete. Ready for Week ${baseState.week+1}.`);}catch(e){message(e.message);}
 };
 document.querySelector('#edit-seed').onclick=()=>{seedOpen=true;render();};
 document.querySelector('#close-modal')?.addEventListener('click',()=>{seedOpen=false;render();});
 document.querySelector('#save-seed')?.addEventListener('click',()=>{
  try{const seed=document.querySelector('#seed-input').value.split('\n').map(s=>s.replace(/^\s*\d+[.)\s]+/,'').trim()).filter(Boolean);const ids=seed.map(name=>roster().find(t=>t.name.toLowerCase()===name.toLowerCase())?.id||name);const next=createSeason(ids,0,baseState.customTeams||[]);
   if((baseState.results.length||queued.length)&&!confirm('Replace this season and its results?'))return;
   baseState=next;baseState.customSeed=true;playoff=null;savePlayoff();queued=[];appliedGames=[];save();seedOpen=false;message('Season started.');
  }catch(e){message(e.message);}
 });
 const reset=()=>{if((baseState.results.length||queued.length)&&!confirm('Start the 2026 preseason at 0–0 and replace this season?'))return;baseState=createEspnSeason(baseState.customTeams||[]);playoff=null;savePlayoff();queued=[];appliedGames=[];save();message('New season started.');};
 document.querySelector('#reset').onclick=reset;
 const explain=()=>message(`Beating ranked teams earns the most credit, even in close games. Routine wins over weak opponents add little or no rating. Blowout losses cause large drops. There is no five-win bonus or conference shortcut. Each of ${voters()} ballots awards 25–1 points, with different voter preferences near the Top 25 cutoff. Next week closes the current slate.`);
 document.querySelector('#how').onclick=explain;
 document.querySelector('#dismiss')?.addEventListener('click',()=>{toast='';render();});
 document.querySelector('#search')?.addEventListener('input',e=>{filter=e.target.value;const pos=e.target.selectionStart;render();const el=document.querySelector('#search');el.focus();el.setSelectionRange(pos,pos);});
 document.querySelector('#conference')?.addEventListener('change',e=>{conference=e.target.value;render();});
}
save();
render();
