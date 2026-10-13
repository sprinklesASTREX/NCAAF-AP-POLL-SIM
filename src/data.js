import snapshot from './espn-snapshot.json' with { type: 'json' };
export const espnSnapshot = snapshot;
// 2026 FBS field, including North Dakota State and Sacramento State.
const groups = {
ACC: 'Boston College:103|California:25|Clemson:228|Duke:150|Florida State:52|Georgia Tech:59|Louisville:97|Miami:2390|NC State:152|North Carolina:153|Pittsburgh:221|SMU:2567|Stanford:24|Syracuse:183|Virginia:258|Virginia Tech:259|Wake Forest:154',
'Big Ten': 'Illinois:356|Indiana:84|Iowa:2294|Maryland:120|Michigan:130|Michigan State:127|Minnesota:135|Nebraska:158|Northwestern:77|Ohio State:194|Oregon:248|Penn State:213|Purdue:2509|Rutgers:164|UCLA:26|USC:30|Washington:264|Wisconsin:275',
'Big 12': 'Arizona:12|Arizona State:9|Baylor:239|BYU:252|Cincinnati:2132|Colorado:38|Houston:248|Iowa State:66|Kansas:2305|Kansas State:2306|Oklahoma State:197|TCU:2628|Texas Tech:2641|UCF:2116|Utah:254|West Virginia:277',
SEC: 'Alabama:333|Arkansas:8|Auburn:2|Florida:57|Georgia:61|Kentucky:96|LSU:99|Mississippi State:344|Missouri:142|Oklahoma:201|Ole Miss:145|South Carolina:2579|Tennessee:2633|Texas:251|Texas A&M:245|Vanderbilt:238',
American: 'Army:349|Charlotte:2429|East Carolina:151|Florida Atlantic:2226|Memphis:235|Navy:2426|North Texas:249|Rice:242|South Florida:58|Temple:218|Tulane:2655|Tulsa:202|UAB:5|UTSA:2636',
'Conference USA': 'Delaware:48|FIU:2229|Jacksonville State:55|Kennesaw State:338|Liberty:2335|Louisiana Tech:2348|Middle Tennessee:2393|Missouri State:2623|New Mexico State:166|Sam Houston:2534|Western Kentucky:98',
MAC: 'Akron:2006|Ball State:2050|Bowling Green:189|Buffalo:2084|Central Michigan:2117|Eastern Michigan:2199|Kent State:2309|Miami (OH):193|Ohio:195|Toledo:2649|UMass:113|Western Michigan:2711|Sacramento State:16',
'Mountain West': 'Air Force:2005|Hawaii:62|Nevada:2440|New Mexico:167|Northern Illinois:2459|San José State:23|UNLV:2439|UTEP:2638|Wyoming:2751|North Dakota State:2449',
'Pac-12': 'Boise State:68|Colorado State:36|Fresno State:278|Oregon State:204|San Diego State:21|Utah State:328|Washington State:265|Texas State:326',
'Sun Belt': 'App State:2026|Arkansas State:2032|Coastal Carolina:324|Georgia Southern:290|Georgia State:2247|James Madison:256|Louisiana:309|Louisiana Monroe:2433|Marshall:276|Old Dominion:295|South Alabama:6|Southern Miss:2572|Troy:2653',
Independent: 'Notre Dame:87|UConn:41'
};
export const preseason = snapshot.poll.map(t=>t.id);
const strong = ['USC','Utah','Louisville','Auburn','Missouri','Iowa','Washington','Nebraska','Baylor','TCU','Tulane','Georgia Tech','Duke','Florida State','Oklahoma State','Wisconsin','Michigan State','Arkansas','Memphis','UNLV','Vanderbilt','Pittsburgh'];
export const teams = Object.entries(groups).flatMap(([conference,list])=>list.split('|').map(pair=>{const [name,espn]=pair.split(':');const rank=preseason.indexOf(name); const tier=strong.indexOf(name);return {id:name,name,conference,espn: name==='Oregon'?'248':name==='Houston'?'248':espn, strength:rank>=0?94-rank*.87:tier>=0?72-tier*.38:conference==='SEC'||conference==='Big Ten'||conference==='Big 12'||conference==='ACC'?61:48};}));
// Houston uses ESPN 248; Oregon uses 2483.
teams.find(t=>t.name==='Oregon').espn='2483';
for (const team of teams) {
  const stats = snapshot.teams[team.id];
  team.stats = stats;
  team.strength = stats.historicalStrength;
  team.performanceStrength = stats.performanceStrength;
}
export const logo = t=>`./logos/${t.espn}.png`;
export const currentSeed = snapshot.poll.map(t=>t.id);
