# College Poll

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

Seasons use browser storage key `saturday-season-v2`. Ranking model upgrades replay saved results with the revised rules, preserving scores, records, and the week. The previous model state is backed up under `saturday-season-v2-before-v3`. The older v1 season is also left untouched.

## Layout and settings

The main screen has only the poll, score entry, and Top 25 / Teams / Playoff / Results tabs. On phones, score entry comes first. Settings contains the automatic-update toggle, dark mode, starting-poll editor, new-season button, and ranking rules. Additional team stats and result explanations are collapsed by default.

## Game entry

**Update poll after each game** is on by default. Adding or removing a result recalculates the current week's rankings and records immediately. All results use the same start-of-week baseline, so adding another game does not count earlier games twice or advance the week. A team may play once per week.

Dark mode is available in Settings and in the header. The choice is saved in this browser.

Turn automatic updates off to queue results and use **Update poll** when ready. Turning it off keeps the last displayed poll; turning it back on applies all queued results. **Next week** applies the whole slate and advances once. Results, the displayed slate, and the setting survive refreshes.

## Ranking model

The initial poll reproduces ESPN's reported rankings and points. Subsequent polls use deterministic simulated voters, each awarding 25–1 points. The voter count is the source's first-place vote total (69 in this snapshot); custom seeds use 63. Voter preferences differ more around the Top 25 cutoff. This awards actual ballot points to additional teams without inventing votes or violating the total available points.

Wins are weighted by opponent rating and rank at the start of the week. Top-ten and Top-25 victories earn extra credit even with a one-point margin. Routine wins against much weaker unranked opponents add little or no rating; there is no five-win bonus or conference-based qualification rule. Teams from every conference can earn a ranking through quality wins.

Preseason rank establishes ranked-team ratings. Others receiving votes and prior-season performance establish the rest of the field. Losses account for opponent rating, expected outcome, home advantage, and prior performance. Blowout penalties increase above a 10-point margin, become substantial at 21+, and cap at roughly 48 points. Losses to unranked teams carry a larger blowout penalty than losses to ranked teams. A top team can fall out of the Top 25 after an unranked blowout. Idle teams keep their ratings but may move as other teams change.

This is an original transparent simulation model, not ESPN FPI or an official AP prediction model. Simulated scores use 2025 points scored and allowed plus ratings and randomness. Matchups are fictional. Team cards show the 2025 source stats; records count simulated games.

## Custom teams

Open **Teams → Add team**. Set a name, conference, color, and starting strength from 25 to 99. Custom teams use a colored initials badge and a generated scoring profile; they are not assigned historical ESPN statistics. They appear in the poll, score dropdowns, weekly simulation, and playoff eligibility.

Edit a custom team from its card. IDs stay stable, so name changes preserve records. New seasons retain custom teams and reset their records. An unused custom team can be removed; teams with recorded games or an active playoff seed are protected from removal. Custom teams are stored with the season in this browser.

## Playoff

Open **Playoff** to freeze the current Top 12 as seeds. Seeds 1–4 receive first-round byes. First-round matchups are 8–9, 5–12, 6–11, and 7–10, feeding seeds 1, 4, 3, and 2 respectively. The bracket uses fixed paths without reseeding or conference auto-bids.

Pick a team to advance it, or enter both final scores and select **Save score**. **Simulate round** fills the next unfinished round; **Simulate rest** fills all remaining games while retaining results already entered. Changing an earlier winner clears affected later results. The bracket is saved separately from the regular-season poll and records. **Use current Top 12** reseeds the bracket; starting a new season clears it.

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
