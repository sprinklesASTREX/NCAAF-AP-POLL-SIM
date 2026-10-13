"""Fetch the explicitly selected preseason AP poll and prior-year team statistics."""
import argparse, concurrent.futures, datetime, json, subprocess, urllib.request
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--season',type=int,default=2026);year=parser.parse_args().season
BASE='https://site.api.espn.com/apis/site/v2/sports/football/college-football/'
url=f'https://www.espn.com/college-football/rankings/_/week/1/year/{year}/seasontype/1'
def get(url):
    with urllib.request.urlopen(url,timeout=30) as response:return json.load(response)
with urllib.request.urlopen(url,timeout=30) as response:html=response.read().decode()
marker=html.index('"type":"ap"');start=html.rfind('{"$ref":',0,marker)
ap,_=json.JSONDecoder().raw_decode(html[start:])
if ap['season']['year']!=year or f'/seasons/{year}/types/1/weeks/1/rankings/1' not in ap['$ref'] or ap['occurrence']['displayValue']!='Preseason':raise ValueError('ESPN did not return the requested preseason poll')
if len(ap['ranks'])!=25 or any(x.get('recordSummary')!='0-0' for x in ap['ranks']):raise ValueError('Not a complete preseason poll')
roster=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {teams} from './src/data.js';console.log(JSON.stringify(teams));"],text=True))
def fetch(t):
    tid=t['espn'];schedule=get(BASE+f'teams/{tid}/schedule?season={year-1}&seasontype=2');stats=get(BASE+f'teams/{tid}/statistics?season={year-1}&seasontype=2');events=schedule.get('events',[])
    if schedule.get('requestedSeason',{}).get('year')!=year-1 or any(e.get('season',{}).get('year')!=year-1 for e in events):raise ValueError('Wrong historical season: '+t['id'])
    if stats.get('requestedSeason',{}).get('year')!=year-1:raise ValueError('Wrong statistics season: '+t['id'])
    values={x['name']:x['value'] for c in stats.get('results',{}).get('stats',{}).get('categories',[]) for x in c.get('stats',[]) if x.get('value') is not None}
    w=l=points=allowed=0;opponents=[]
    for event in events:
        game=event['competitions'][0]
        if not game.get('status',{}).get('type',{}).get('completed'):continue
        own=next(x for x in game['competitors'] if str(x['id'])==tid);opp=next(x for x in game['competitors'] if str(x['id'])!=tid)
        if 'winner' not in own:continue
        w+=int(own['winner']);l+=int(not own['winner']);opponents.append(str(opp['id']))
        def score(x):
            v=x.get('score');return float(v.get('value',v.get('displayValue'))) if isinstance(v,dict) else float(v)
        points+=score(own);allowed+=score(opp)
    if not w+l:raise ValueError('Missing historical games: '+t['id'])
    old=t['stats']
    return t['id'],{'espn':tid,'displayName':old['displayName'],'logo':old['logo'],'conferenceId':old.get('conferenceId'),'w':0,'l':0,'statsSeason':year-1,'ppg':round(points/(w+l),2),'allowed':round(allowed/(w+l),2),'passingYpg':values.get('passingYardsPerGame'),'rushingYpg':values.get('rushingYardsPerGame'),'turnoverMargin':values.get('turnOverDifferential'),'historicalW':w,'historicalL':l,'opponents':opponents}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:entries=dict(pool.map(fetch,roster))
byid={t['espn']:t for t in entries.values()}
for t in entries.values():
    wp=t['historicalW']/(t['historicalW']+t['historicalL']);foes=[byid[x] for x in t.pop('opponents') if x in byid];sos=sum(x['historicalW']/(x['historicalW']+x['historicalL']) for x in foes)/len(foes) if foes else .5
    t['opponentWinPct']=round(sos,3);t['historicalStrength']=round(35+wp*50,2);t['performanceStrength']=round(max(25,min(96,35+wp*30+max(-28,min(28,t['ppg']-t['allowed']))*.65+(sos-.5)*12)),2)
names={t['espn']:t['id'] for t in roster}
def normalize(x):return {'id':names[str(x['team']['id'])],'rank':x.get('current',0),'previous':0,'points':int(x.get('points',0)),'first':int(x.get('firstPlaceVotes',0)),'record':'0-0'}
snapshot={'season':year,'week':0,'phase':'preseason','statsSeason':year-1,'pollDate':ap['date'],'fetchedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'source':url,'voters':sum(x.get('firstPlaceVotes',0) for x in ap['ranks']),'poll':[normalize(x) for x in ap['ranks']],'others':[normalize(x) for x in ap.get('others',[])],'dropped':[],'teams':entries}
if len(entries)!=138:raise ValueError('Incomplete roster')
Path('src/espn-snapshot.json').write_text(json.dumps(snapshot,indent=2)+'\n')
print(f'Saved verified {year} preseason poll: {len(entries)} teams, {len(snapshot["others"])} others receiving votes, all 0–0. Team metrics use {year-1} games.')
