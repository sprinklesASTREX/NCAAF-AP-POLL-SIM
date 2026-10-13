# Saturday — College Football Poll Simulator

Live: https://sprinklesastrex.github.io/NCAAF-AP-POLL-SIM/

138 teams, a Top 25, first-place votes, others receiving votes, recently dropped teams, real starting records, manual results, fictional weekly slates, and browser-saved seasons.

## Run and validate

Requires Node.js 22.12+.

```sh
npm ci --cache /tmp/ncaaf-npm
npm run dev
```

Open `/app.html` on the development server. `npm test` checks model behavior and exact ESPN snapshot preservation. `npm run build` builds the production app.

## ESPN snapshot

The checked-in snapshot is the **2026 Week 7 AP poll** returned by ESPN, published October 11, 2026 and fetched October 13, 2026. It includes ESPN's exact Top 25 points, first-place votes, others receiving votes, and dropped teams. All 138 teams have season wins/losses, points scored/allowed per game, passing/rushing yards per game, 2025 regular-season records, and completed-opponent win percentages. This is a dated snapshot, not an automatically updating feed. Links to ESPN rankings and team statistics are in the app.

Existing saved seasons remain intact. Click **Start from ESPN Week 7** to use the new official snapshot and real records; confirm replacement if you have simulated games. Custom Top 25 seeds start with 0–0 records.

## Model

The initial ESPN poll is reproduced exactly. Subsequent polls use deterministic simulated voters, each awarding 25–1 points. The number of voters comes from the source's first-place vote total (70 in this snapshot, maximum 1,750 points). Custom seasons use 63 voters.

Current performance strength uses win percentage, scoring margin capped at 28, completed FBS-opponent win percentage, and prior regular-season win percentage. Historical strength uses 2025 regular-season win percentage. These transparent heuristics are not ESPN FPI or an AP prediction model. AP rank establishes the starting rating of ranked teams; performance strength sets the unranked baseline. Unexpected losses, weaker current/historical opponents, opponent quality, home advantage, and capped margins drive updates. Idle teams retain ratings.

Simulated scores use each team's real points scored and its opponent's real points allowed, plus rating differences and randomness. Matchups are fictional, not the real schedule. Records retain real starting wins/losses and add simulated outcomes. Stats cards continue to show the source snapshot, not simulated season totals.

## Refresh data and publish

With HTTPS access to `site.api.espn.com` and `a.espncdn.com`:

```sh
python3 scripts/update-espn.py
python3 scripts/update-logos.py
npm test
npm run prepare-pages
```

The updater validates seasons and completeness before replacing the snapshot. Logos are cached locally for all 138 teams, so the deployed site does not need ESPN access to display them. Google Fonts has system fallbacks.

GitHub Pages publishes the committed root `index.html`, `assets/`, and `logos/` from `main`. Commit and push source and regenerated output after an authorized update. The Check simulator workflow runs tests and a build. No backend or credentials are required by the app; saved seasons remain in the user's browser.
