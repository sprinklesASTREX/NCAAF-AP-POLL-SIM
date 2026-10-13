# Saturday — College Football Poll Simulator

Live: https://sprinklesastrex.github.io/NCAAF-AP-POLL-SIM/

138 teams, a Top 25, first-place votes, others receiving votes, dropped teams, manual scores, fictional weekly slates, and browser-saved seasons.

## Run and validate

Requires Node.js 22.12+.

```sh
npm ci --cache /tmp/ncaaf-npm
npm run dev
```

Open `/app.html` on the development server. `npm test` checks rankings, blowout penalties, voting points, and weekly accounting. `npm run build` builds the production app.

## Starting poll: 2026 preseason

The starting rankings and voting points come from ESPN's archived **2026 preseason AP poll**, dated August 17, 2026. Ohio State, Oregon, and Georgia lead the field. The source's tie at No. 14 and all 25 other teams receiving votes are preserved exactly. Every team starts at 0–0. Team strength and scoring estimates use **2025 regular-season** records and stats, avoiding results from the season being simulated.

Source: https://www.espn.com/college-football/rankings/_/week/1/year/2026/seasontype/1

This is a checked-in snapshot, not an automatic live feed. The importer verifies the preseason-specific reference, season, zero records, and prior-season event dates. ESPN's general rankings API can ignore historical week parameters, so it is not used for the starting poll.

This version starts a fresh preseason under browser storage key `saturday-season-v2`. Previous version data remains in `saturday-season-v1` without being overwritten.

## Game entry and settings

**Update poll after each game** is on by default. Adding or removing a result recalculates the current week's rankings and records immediately. All results use the same start-of-week baseline, so adding another game does not count earlier games twice or advance the week. A team may play once per week.

Turn automatic updates off to queue results and use **Update poll** when ready. Turning it off keeps the last displayed poll; turning it back on applies all queued results. **Next week** applies the whole slate and advances once. Results, the displayed slate, and the setting survive refreshes.

## Ranking model

The initial poll reproduces ESPN's reported rankings and points. Subsequent polls use deterministic simulated voters, each awarding 25–1 points. The voter count is the source's first-place vote total (69 in this snapshot); custom seeds use 63. Voter preferences differ more around the Top 25 cutoff. This awards actual ballot points to additional teams without inventing votes or violating the total available points.

Preseason rank establishes ranked-team ratings. Others receiving votes and prior-season performance establish the rest of the field. Losses account for opponent rating, expected outcome, home advantage, and prior performance. Blowout penalties increase above a 10-point margin, become substantial at 21+, and cap at roughly 48 points. Losses to unranked teams carry a larger blowout penalty than losses to ranked teams. A top team can fall out of the Top 25 after an unranked blowout. Idle teams keep their ratings but may move as other teams change.

This is an original transparent simulation model, not ESPN FPI or an official AP prediction model. Simulated scores use 2025 points scored and allowed plus ratings and randomness. Matchups are fictional. Team cards show the 2025 source stats; records count simulated games.

## Refresh and publish

With HTTPS access to `www.espn.com`, `site.api.espn.com`, and `a.espncdn.com`:

```sh
python3 scripts/update-preseason.py --season 2026
python3 scripts/update-logos.py
npm test
npm run prepare-pages
```

`python3 scripts/update-espn.py` is a compatible alias for the preseason refresh. Logos are cached locally for all 138 teams; Google Fonts has system fallbacks.

GitHub Pages publishes committed `index.html`, `assets/`, and `logos/` from the root of `main`. Commit and push source and regenerated output after an authorized update. The Check simulator workflow runs tests and builds. The app requires no backend or credentials.
