"""Refresh the checked-in ESPN snapshot. Run from the repository root."""
import concurrent.futures, datetime, json, math, urllib.request, subprocess
from pathlib import Path
BASE='https://site.api.espn.com/apis/site/v2/sports/football/college-football/'
def get(path):
    with urllib.request.urlopen(BASE+path, timeout=30) as response:return json.load(response)
roster=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {teams} from './src/data.js';console.log(JSON.stringify(teams));"],text=True))
r=get('rankings');ap=next(x for x in r['rankings'] if x['type']=='ap');year=ap['season']['year'];week=ap['occurrence']['number']
def load(team):
    tid=team['espn'];detail=get(f'teams/{tid}?season={year}')['team'];stats=get(f'teams/{tid}/statistics?season={year}&seasontype=2');historical=get(f'teams/{tid}/schedule?season={year-1}');schedule=get(f'teams/{tid}/schedule?season={year}&seasontype=2')
    if historical.get('season',{}).get('year')!=year-1:raise ValueError('Wrong historical season: '+team['id'])
    if str(detail['id'])!=tid or stats.get('season',{}).get('year')!=year:raise ValueError(f'Wrong season/team: {team["id"]}')
    rec=next((x for x in detail.get('record',{}).get('items',[]) if x.get('type')=='total'),{})
    fields={x['name']:x.get('value') for x in rec.get('stats',[]) if x.get('value') is not None}
    metrics={x['name']:x.get('value') for c in stats.get('results',{}).get('stats',{}).get('categories',[]) for x in c.get('stats',[]) if x.get('value') is not None}
    hw=hl=0
    for e in historical.get('events',[]):
        c=e['competitions'][0]
        if not c.get('status',{}).get('type',{}).get('completed'):continue
        own=next((x for x in c['competitors'] if str(x['id'])==tid),None)
        if own and 'winner' in own:
            if own['winner']:hw+=1
            else:hl+=1
    opponents=[]
    for e in schedule.get('events',[]):
        c=e['competitions'][0]
        if c.get('status',{}).get('type',{}).get('completed'):
            opponents.extend(str(x['id']) for x in c['competitors'] if str(x['id'])!=tid)
    return team['id'],{'espn':tid,'displayName':detail['displayName'],'logo':detail.get('logos',[{}])[0].get('href'),'conferenceId':detail.get('groups',{}).get('id'),'w':int(fields.get('wins',0)),'l':int(fields.get('losses',0)),'ppg':fields.get('avgPointsFor'),'allowed':fields.get('avgPointsAgainst'),'passingYpg':metrics.get('passingYardsPerGame'),'rushingYpg':metrics.get('rushingYardsPerGame'),'turnoverMargin':metrics.get('turnOverDifferential'),'historicalW':hw,'historicalL':hl,'opponents':opponents}
entries={};failures=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    futures={pool.submit(load,t):t for t in roster}
    for future in concurrent.futures.as_completed(futures):
        t=futures[future]
        try:k,v=future.result();entries[k]=v
        except Exception as exc:failures.append(f'{t["name"]}: {exc}')
if failures:raise SystemExit('\n'.join(failures))
byid={x['espn']:x for x in entries.values()}
for name,t in entries.items():
    n=t['w']+t['l'];win=t['w']/n if n else .5;hist=t['historicalW']+t['historicalL'];hw=t['historicalW']/hist if hist else .5
    margin=max(-28,min(28,(t['ppg'] or 0)-(t['allowed'] or 0)))
    foes=[byid[x] for x in t.pop('opponents') if x in byid];sos=sum(x['w']/max(1,x['w']+x['l']) for x in foes)/len(foes) if foes else .5
    t['opponentWinPct']=round(sos,3);t['historicalStrength']=round(35+hw*50,2)
    t['performanceStrength']=round(max(25,min(96,35+win*30+margin*.65+(sos-.5)*12+(hw-.5)*8)),2)
namebyid={t['espn']:t['id'] for t in roster}
def normalize(x):
    tid=str(x['team']['id'])
    if tid not in namebyid:raise ValueError(f'Poll team missing from roster: {tid}')
    return {'id':namebyid[tid],'rank':x.get('current',0),'previous':x.get('previous',0),'points':int(x.get('points',0)),'first':int(x.get('firstPlaceVotes',0)),'record':x.get('recordSummary')}
snapshot={'season':year,'week':week,'pollDate':ap['date'],'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':BASE+'rankings','voters':sum(x.get('firstPlaceVotes',0) for x in ap['ranks']),'poll':[normalize(x) for x in ap['ranks']],'others':[normalize(x) for x in ap.get('others',[])],'dropped':[normalize(x) for x in ap.get('droppedOut',[])],'teams':entries}
if len(snapshot['poll'])!=25 or len(entries)!=138:raise ValueError('Incomplete snapshot')
Path('src/espn-snapshot.json').write_text(json.dumps(snapshot,indent=2)+'\n')
print(f'Saved ESPN {year} Week {week}: {len(entries)} teams, {len(snapshot["others"])} others receiving votes; {snapshot["voters"]} reported first-place votes.')
