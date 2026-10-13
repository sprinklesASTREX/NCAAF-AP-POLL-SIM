import {teams,preseason,espnSnapshot,currentSeed} from './data.js';
export function createSeason(seed=preseason,week=0){
 if(seed.length!==25||new Set(seed).size!==25||seed.some(n=>!teams.some(t=>t.id===n)))throw Error('Choose 25 different teams.');
 return {week,initialWeek:week,seed:[...seed],results:[],history:[],ratings:Object.fromEntries(teams.map(t=>[t.id,seed.includes(t.id)?96-seed.indexOf(t.id)*.95:Math.min(71,t.strength*.98)])),records:Object.fromEntries(teams.map(t=>[t.id,{w:0,l:0}]))};
}
export function createEspnSeason() {
 const state=createSeason(currentSeed,espnSnapshot.week);
 state.source='espn';state.voters=espnSnapshot.voters||63;state.snapshotDate=espnSnapshot.pollDate;
 state.records=Object.fromEntries(teams.map(t=>[t.id,{w:t.stats.w,l:t.stats.l}]));
 state.ratings=Object.fromEntries(teams.map(t=>{
   const rank=currentSeed.indexOf(t.id);const other=espnSnapshot.others.find(x=>x.id===t.id);
   return [t.id,rank>=0?96-rank*.95:Math.min(72.5,55+(t.performanceStrength-50)*.4+(other?3:0))];
 }));
 return state;
}
export function poll(state){
 if(state.source==='espn'&&state.results.length===0) {
  const values=[...espnSnapshot.poll,...espnSnapshot.others];
  return teams.map(t=>{const p=values.find(x=>x.id===t.id);return {...t,points:p?.points||0,first:p?.first||0,rating:state.ratings[t.id],...state.records[t.id],rank:p?.rank||999};}).sort((a,b)=>(a.rank===999)-(b.rank===999)||a.rank-b.rank||b.points-a.points||b.rating-a.rating).map((t,i)=>({...t,rank:i+1}));
 }
 const ballots=Array.from({length:state.voters||63},(_,v)=>teams.map(t=>({id:t.id,score:state.ratings[t.id]+Math.sin((v+1)*(teams.indexOf(t)+11)*1.618)*.4})).sort((a,b)=>b.score-a.score).slice(0,25));
 const pts=Object.fromEntries(teams.map(t=>[t.id,0]));const first={};ballots.forEach(b=>b.forEach((t,i)=>{pts[t.id]+=25-i;if(i===0)first[t.id]=(first[t.id]||0)+1;}));
 return teams.map(t=>({...t,points:pts[t.id],first:first[t.id]||0,rating:state.ratings[t.id],...state.records[t.id]})).sort((a,b)=>b.points-a.points||b.rating-a.rating||a.name.localeCompare(b.name)).map((t,i)=>({...t,rank:i+1}));
}
export function advance(state,games){
 const seen=new Set();for(const g of games){if(g.home===g.away||!teams.some(t=>t.id===g.home)||!teams.some(t=>t.id===g.away))throw Error('Each game needs two different roster teams.');if(seen.has(g.home)||seen.has(g.away))throw Error('A team can play only once per week.');seen.add(g.home);seen.add(g.away);if(!Number.isInteger(g.hs)||!Number.isInteger(g.as)||g.hs<0||g.as<0||g.hs>200||g.as>200||g.hs===g.as)throw Error('Use final scores from 0–200, with no ties.');}
 if(!games.length)throw Error('Add results or simulate this week first.');
 const next=structuredClone(state),before=poll(state),notes=[];
 for(const g of games){const winner=g.hs>g.as?g.home:g.away,loser=winner===g.home?g.away:g.home;const wr=state.ratings[winner],lr=state.ratings[loser];const winnerTeam=teams.find(t=>t.id===winner);const strengthW=winnerTeam.strength;
 const expected=1/(1+Math.exp((lr-wr+(winner===g.home?-2.5:2.5))/9));
 const margin=Math.min(Math.abs(g.hs-g.as),28)/28; const quality=Math.max(0,(lr-60)/35);const upset=1-expected;const badLoss=Math.max(0,(60-strengthW)/25)*.5+Math.max(0,(55-winnerTeam.performanceStrength)/25)*.5;const gain=1.5+upset*8+quality*2+margin;const drop=2+upset*8+badLoss*2+margin*1.5;
 next.ratings[winner]=Math.min(110,wr+gain);next.ratings[loser]=Math.max(5,lr-drop);next.records[winner].w++;next.records[loser].l++;
 notes.push({...g,winner,loser,gain,drop,upset:expected<.35,explanation:expected<.35?`Upset: ${winner} beat a stronger opponent. ${loser} loses ${drop.toFixed(1)} rating points${badLoss>0?' with an extra penalty for a loss to a historically weaker team':''}.`:`${winner} gains ${gain.toFixed(1)} rating points for opponent quality and margin; ${loser} loses ${drop.toFixed(1)}.`});}
 next.history.push({week:state.week,poll:before});next.week++;next.results.push({week:next.week,games:notes});return next;
}
export function simulate(state,excluded=[]){
 const pool=teams.filter(t=>!excluded.includes(t.id));for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 const games=[];for(let i=0;i+1<pool.length;i+=2){const h=pool[i],a=pool[i+1];const homeBase=state.source==='espn'?(h.stats.ppg+a.stats.allowed)/2:24;const awayBase=state.source==='espn'?(a.stats.ppg+h.stats.allowed)/2:22;const hs=Math.max(0,Math.round(homeBase+2+(state.ratings[h.id]-state.ratings[a.id])*.2+(Math.random()-.5)*28));let as=Math.max(0,Math.round(awayBase+(state.ratings[a.id]-state.ratings[h.id])*.2+(Math.random()-.5)*28));if(hs===as)as+=3;games.push({home:h.id,away:a.id,hs,as});}return games;
}
