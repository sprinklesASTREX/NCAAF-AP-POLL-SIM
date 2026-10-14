import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEspnSeason,createSeason,poll,advance,simulate} from '../src/engine.js';
import {addCustomTeam,editCustomTeam,removeCustomTeam,getTeams} from '../src/custom-teams.js';
import {createPlayoff,playoffRounds,enterPlayoffScore,pickPlayoffWinner,clearPlayoffGame,simulatePlayoff,playoffChampion} from '../src/playoff.js';

const input={name:'Lake City',conference:'Custom',strength:92,color:'#326fa8'};
const bracket=()=>createPlayoff(poll(createEspnSeason()),0);

test('custom teams join ballots, game entry, simulation, and resets',()=>{
 const original=createEspnSeason(),state=addCustomTeam(original,input),team=state.customTeams[0];
 assert.equal(getTeams(state).length,139);assert.equal(getTeams(original).length,138);
 assert.ok(poll(state).find(t=>t.id===team.id).rank<=12);
 assert.equal(poll(state).reduce((sum,t)=>sum+t.points,0),state.voters*325);
 const played=advance(state,[{home:team.id,away:'Texas',hs:28,as:24}]);
 assert.equal(played.records[team.id].w,1);assert.match(played.results[0].games[0].explanation,/Lake City/);
 const even=addCustomTeam(state,{...input,name:'Lake Rival'});const games=simulate(even,[],()=>.5);assert.equal(games.length,70);assert.ok(games.some(g=>g.home===team.id||g.away===team.id));
 const reset=createEspnSeason(played.customTeams);assert.equal(reset.records[team.id].w,0);assert.equal(getTeams(reset).length,139);
 const seed=[team.id,...state.seed.slice(0,24)];assert.equal(createSeason(seed,0,state.customTeams).seed[0],team.id);
});

test('custom-team validation prevents duplicate identities and invalid profiles',()=>{
 const s=createEspnSeason();
 for(const bad of [{...input,name:'Texas'},{...input,name:'  texas '},{...input,name:'Ｔｅｘａｓ'},{...input,name:'x'},{...input,strength:100},{...input,strength:35.5},{...input,color:'red'}])assert.throws(()=>addCustomTeam(s,bad));
 const next=addCustomTeam(s,input);assert.throws(()=>addCustomTeam(next,input));assert.equal(next.customTeams.length,1);
});

test('editing preserves custom-team identity and records; used teams cannot be deleted',()=>{
 const s=addCustomTeam(createEspnSeason(),input),id=s.customTeams[0].id;
 const played=advance(s,[{home:id,away:'Texas',hs:28,as:24}]);
 const edited=editCustomTeam(played,id,{...input,name:'Lake College',strength:90});
 assert.equal(edited.customTeams[0].id,id);assert.equal(edited.records[id].w,1);assert.equal(getTeams(edited).find(t=>t.id===id).name,'Lake College');
 assert.throws(()=>removeCustomTeam(edited,id));assert.equal(getTeams(removeCustomTeam(s,id)).length,138);
 assert.equal(getTeams(JSON.parse(JSON.stringify(edited))).length,139);
});

test('playoff seeds the current Top 12 and gives exactly four first-round byes',()=>{
 const b=bracket(),rounds=playoffRounds(b);assert.equal(b.seeds.length,12);
 assert.deepEqual(rounds[0].games.map(g=>[g.a.seed,g.b.seed]),[[8,9],[5,12],[6,11],[7,10]]);
 assert.deepEqual(rounds[1].games.map(g=>g.a.seed),[1,4,3,2]);
 assert.ok(rounds[1].games.every(g=>!g.ready));assert.equal(rounds.flatMap(r=>r.games).length,11);
 assert.throws(()=>createPlayoff(b.seeds.slice(0,11)));
});

test('manual picks follow fixed bracket paths to a single champion',()=>{
 let b=bracket();
 for(let r=0;r<4;r++)for(const game of playoffRounds(b)[r].games){assert.ok(game.ready);b=pickPlayoffWinner(b,game.id,(game.a.seed<game.b.seed?game.a:game.b).id);}
 const final=playoffRounds(b)[3].games[0];assert.deepEqual([final.a.seed,final.b.seed],[1,2]);assert.equal(playoffChampion(b).seed,1);assert.equal(Object.keys(b.results).length,11);
});

test('changed winners invalidate affected downstream results only',()=>{
 let b=bracket();for(let r=0;r<4;r++)for(const game of playoffRounds(b)[r].games)b=pickPlayoffWinner(b,game.id,game.a.id);
 const first=playoffRounds(b)[0].games[0];const next=pickPlayoffWinner(b,first.id,first.b.id);
 assert.equal(next.results.q1,undefined);assert.equal(next.results.s1,undefined);assert.equal(next.results.final,undefined);
 assert.deepEqual(next.results.q2,b.results.q2);assert.deepEqual(next.results.s2,b.results.s2);assert.equal(playoffChampion(next),null);
 const cleared=clearPlayoffGame(b,'r1a');assert.equal(cleared.results.r1a,undefined);assert.equal(cleared.results.q1,undefined);assert.equal(cleared.results.final,undefined);
});

test('playoff scores validate, persist, and keep later games when the winner stays the same',()=>{
 let b=bracket();const first=playoffRounds(b)[0].games[0];
 assert.throws(()=>enterPlayoffScore(b,'q1',30,20));assert.throws(()=>enterPlayoffScore(b,first.id,20,20));assert.throws(()=>enterPlayoffScore(b,first.id,-1,20));assert.throws(()=>pickPlayoffWinner(b,first.id,'Unknown'));
 b=enterPlayoffScore(b,first.id,30,20);const q=playoffRounds(b)[1].games[0];assert.equal(q.b.id,first.a.id);
 b=enterPlayoffScore(b,q.id,40,10);const changed=enterPlayoffScore(b,first.id,35,17);assert.deepEqual(changed.results.q1,b.results.q1);
 assert.deepEqual(playoffRounds(JSON.parse(JSON.stringify(changed))),playoffRounds(changed));
});

test('playoff simulation fills rounds, preserves entered results, and leaves season records alone',()=>{
 const season=createEspnSeason(),before=structuredClone(season);let b=createPlayoff(poll(season));
 b=enterPlayoffScore(b,'r1a',17,24);const manual=structuredClone(b.results.r1a);
 const round=simulatePlayoff(b,false,()=>.5);assert.equal(Object.keys(round.results).length,4);assert.equal(playoffChampion(round),null);
 const all=simulatePlayoff(round,true,()=>.5);assert.equal(Object.keys(all.results).length,11);assert.ok(playoffChampion(all));assert.deepEqual(all.results.r1a,manual);assert.deepEqual(season,before);
});

test('ranked custom teams can enter the playoff',()=>{
 const s=addCustomTeam(createEspnSeason(),{...input,strength:99});const b=createPlayoff(poll(s));assert.equal(b.seeds[0].id,s.customTeams[0].id);assert.equal(b.seeds[0].custom,true);assert.equal(playoffChampion(simulatePlayoff(b,true,()=>.5)).custom,true);
});
