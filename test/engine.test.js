import {test} from 'node:test';
import assert from 'node:assert/strict';
import {teams,preseason} from '../src/data.js';
import {createSeason,poll,advance,simulate} from '../src/engine.js';
test('138 unique teams and AP ballot point conservation',()=>{assert.equal(teams.length,138);assert.equal(new Set(teams.map(t=>t.id)).size,138);const p=poll(createSeason());assert.equal(p.reduce((n,t)=>n+t.points,0),63*325);assert.equal(p.reduce((n,t)=>n+t.first,0),63);assert.ok(p.every(t=>t.points<=1575));});
test('bad upset loss is penalized more than an expected elite loss',()=>{const s=createSeason();const upset=advance(s,[{home:'Texas',away:'Akron',hs:20,as:24}]);const expected=advance(s,[{home:'Texas',away:'Penn State',hs:20,as:24}]);assert.ok(upset.ratings.Texas<expected.ratings.Texas);assert.equal(upset.records.Texas.l,1);assert.equal(upset.records.Akron.w,1);assert.ok(upset.results[0].games[0].upset);assert.equal(s.records.Texas.l,0);});
test('a quality upset win earns more than beating a weak opponent',()=>{const s=createSeason();const elite=advance(s,[{home:'Akron',away:'Texas',hs:24,as:20}]);const weak=advance(s,[{home:'Akron',away:'Kent State',hs:24,as:20}]);assert.ok(elite.ratings.Akron>weak.ratings.Akron);});
test('reject invalid, duplicate, tied and unknown results without changing state',()=>{const s=createSeason();for(const g of [[{home:'Texas',away:'Texas',hs:20,as:10}],[{home:'Texas',away:'Akron',hs:20,as:20}],[{home:'Texas',away:'Akron',hs:-1,as:20}],[{home:'Unknown',away:'Akron',hs:21,as:20}],[{home:'Texas',away:'Akron',hs:21,as:20},{home:'Texas',away:'Georgia',hs:21,as:20}]])assert.throws(()=>advance(s,g));assert.equal(s.week,0);assert.throws(()=>advance(s,[]));});
test('week simulation respects manually entered games and preserves history',()=>{const s=createSeason(preseason,7),manual={home:'Texas',away:'Akron',hs:20,as:24};const games=simulate(s,['Texas','Akron']);assert.equal(games.length,68);assert.ok(games.every(g=>g.home!=='Texas'&&g.away!=='Akron'&&g.hs!==g.as));const next=advance(s,[manual,...games]);assert.equal(next.week,8);assert.equal(next.history[0].week,7);assert.equal(next.results[0].games.length,69);assert.ok(Object.values(next.records).every(t=>t.w+t.l===1));});
test('custom seed requires exactly 25 unique roster teams',()=>{assert.throws(()=>createSeason([]));assert.throws(()=>createSeason(Array(25).fill('Texas')));const seed=[...preseason].reverse();const s=createSeason(seed,7);assert.ok(s.ratings[seed[0]]>s.ratings[seed.at(-1)]);});

test('2026 preseason seed preserves exact ranks, ties, votes and all 0–0 records',async()=>{
 const {createEspnSeason}=await import('../src/engine.js');const {espnSnapshot}=await import('../src/data.js');const s=createEspnSeason(),p=poll(s);
 assert.equal(s.week,espnSnapshot.week);assert.equal(p[0].id,espnSnapshot.poll[0].id);
 for(const row of espnSnapshot.poll){const team=p.find(t=>t.id===row.id);assert.equal(team.rank,row.rank);assert.equal(team.points,row.points);assert.equal(team.first,row.first);assert.equal(`${team.w}-${team.l}`,row.record);}
 for(const row of espnSnapshot.others)assert.equal(p.find(t=>t.id===row.id).points,row.points);
 assert.ok(teams.every(t=>Number.isFinite(t.performanceStrength)&&Number.isFinite(t.stats.ppg)&&Number.isFinite(t.stats.allowed)));
 const next=advance(s,[{home:'Texas',away:'Akron',hs:20,as:24}]);assert.equal(next.records.Texas.l,s.records.Texas.l+1);assert.equal(next.records.Akron.w,s.records.Akron.w+1);assert.equal(poll(next).reduce((n,t)=>n+t.points,0),s.voters*325);assert.equal(poll(next).reduce((n,t)=>n+t.first,0),s.voters);
});

test('blowouts cause large drops against both ranked and unranked opponents',async()=>{
 const {createEspnSeason}=await import('../src/engine.js');const s=createEspnSeason();
 const close=advance(s,[{home:'Ohio State',away:'Oregon',hs:21,as:24}]);
 const ranked=advance(s,[{home:'Ohio State',away:'Oregon',hs:7,as:49}]);
 const unranked=advance(s,[{home:'Ohio State',away:'Akron',hs:7,as:49}]);
 const rank=state=>poll(state).find(t=>t.id==='Ohio State').rank;
 assert.ok(rank(ranked)>=15);assert.ok(rank(ranked)>rank(close)+8);assert.ok(rank(unranked)>25);
 assert.ok(unranked.results[0].games[0].drop>ranked.results[0].games[0].drop);
 assert.equal(s.records['Ohio State'].l,0);
});

test('live game updates equal a weekly batch and never double count',async()=>{
 const {createEspnSeason,workingSeason}=await import('../src/engine.js');const s=createEspnSeason();
 const a={home:'Ohio State',away:'Akron',hs:7,as:49},b={home:'Texas',away:'Oregon',hs:21,as:24};
 const first=workingSeason(s,[a]);const both=workingSeason(s,[a,b]);
 assert.equal(first.week,1);assert.equal(both.week,1);assert.equal(both.records['Ohio State'].l,1);
 assert.deepEqual(both,advance(s,[a,b]));assert.deepEqual(poll(both),poll(advance(s,[b,a])));
 assert.strictEqual(workingSeason(s,[a],false),s);assert.strictEqual(workingSeason(s,[]),s);
 assert.deepEqual(workingSeason(s,[b]).records['Ohio State'],{w:0,l:0});
});

test('voter diversity produces others receiving actual ballot points through the season',async()=>{
 const {createEspnSeason}=await import('../src/engine.js');let state=createEspnSeason(),seed=25;
 const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
 for(let week=1;week<=10;week++){
  state=advance(state,simulate(state,[],random));const p=poll(state);
  assert.ok(p.filter(t=>t.rank>25&&t.points>0).length>=3,`Week ${week} should have a voting bubble`);
  assert.equal(p.reduce((n,t)=>n+t.points,0),state.voters*325);
  assert.equal(p.reduce((n,t)=>n+t.first,0),state.voters);
 }
});

test('preseason statistics cannot contain results from the simulated year',async()=>{
 const {espnSnapshot}=await import('../src/data.js');const {createEspnSeason}=await import('../src/engine.js');
 assert.equal(espnSnapshot.season,2026);assert.equal(espnSnapshot.phase,'preseason');assert.equal(espnSnapshot.week,0);
 assert.ok(teams.every(t=>t.stats.statsSeason===2025&&t.stats.w===0&&t.stats.l===0));
 assert.ok(Object.values(createEspnSeason().records).every(r=>r.w===0&&r.l===0));
 assert.equal(poll(createEspnSeason()).filter(t=>t.rank===14).length,2);
});
