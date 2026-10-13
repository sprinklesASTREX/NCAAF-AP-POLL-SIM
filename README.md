# Saturday — College Football Poll Simulator

A responsive, browser-based 138-team college football poll simulator. Includes a Top 25, first-place votes, others receiving votes, dropped teams, game entry, random weekly slates, results history, and local saved seasons.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci --cache /tmp/ncaaf-npm
npm run dev
```

`npm test` checks the ranking model; `npm run build` builds the production app.

## Starting data

Defaults to a Week 7 sandbox using the 2025 preseason Top 25 order as a reference. **This is not the official 2026 Week 7 poll.** Use “Set Week 7 poll” to paste 25 roster names in order. Records count games entered after the seed, not historical season records. The 138-program field includes North Dakota State and Sacramento State. Conference assignments and historical strengths are reference data, not a live feed.

## Ranking model

63 deterministic voter ballots distribute 25–1 points; maximum 1,575 points per team. Small voter preferences can change the seed order. Ratings adjust for expected outcomes, opponent strength, home advantage, capped margins (28 points), and historically weak opponents. Historical strength is a heuristic, not a trained model or verified current statistics. Random weekly matchups are fictional, not the official schedule. A team may play once per week; idle teams retain ratings.

Team logos load from ESPN's CDN (`a.espncdn.com`); initials appear when blocked or unavailable. Fonts use Google Fonts with system fallbacks. No credentials or backend required. Season data is stored only in this browser. Resetting or clearing browser storage removes it.

## GitHub Pages

Live site: https://sprinklesastrex.github.io/NCAAF-AP-POLL-SIM/

Pages publishes the compiled `index.html` and `assets/` from `main` at the repository root. The development HTML entry is `app.html`; open `/app.html` on the development server. Before publishing a source change, run `npm test` and `npm run prepare-pages`, then commit and push the regenerated `index.html` and `assets/` with the source. GitHub's existing Pages workflow publishes the site; the Check simulator workflow validates the source. Keeping the generated files in the repository avoids needing access to change Pages publishing settings.
