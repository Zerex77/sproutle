# Sproutle

A daily word game: grow today's seed word into a long word, one letter at a time.
Live at https://playsproutle.com

- `docs/` is the published website (served by GitHub Pages). The homepage is a showcase of every game; Sproutle itself lives at `/sproutle/`. Edit the `GAMES` list in `build_site.py` to add a game to the homepage.
- `build/` holds the game source, puzzle lists and word list.
  Run `python3 build/build_site.py` to rebuild `docs/`.
  Settings such as the launch date and Sproutle+ live at the top of `build_site.py`.
- `build/critter/` holds Critter Collector, which the build copies to `docs/critter-collector/`. The More games page is in `build_site.py`.
- `build/ranked/` holds Ranked, the daily ordering puzzle, which the build copies to `docs/ranked/`.
- `build/lb.js` is the shared leaderboard script (Supabase). The build copies it to `docs/lb.js`; every game loads it.
- `build/keystone/` holds Keystone, the daily missing-word puzzle, which the build copies to `docs/keystone/`. Add puzzles to the `PUZZLES` list at the top of its script.
- `build/ballpark/` holds Ballpark, the daily number-guess puzzle (`PUZZLES` list: question, answer, unit, and `tol`, how close counts as a win). Copied to `docs/ballpark/`.
- `build/imposter/` holds Imposter, the daily odd-one-out puzzle (`CASES` list, five rows per day, easiest first). Copied to `docs/imposter/`.
- `build/gridiron/` holds Gridiron Golf, the daily NFL trivia game (a seeded daily hole plus an endless mode). Every category is listed in `categories.json` (add one there and the weekly update fills it in for every player since 1999). The page is `index.src.html`; the build fills it with `players.json`. Stats since 1999 come from nflverse, and pre-1999 careers (the `L:` rows) come from Pro Football Reference's career leaders. Every Tuesday the `Update Gridiron Golf stats` GitHub Action runs `update_stats.py` to refresh active players and republish. Run it by hand from the Actions tab any time.
- `build/almamater/` holds Alma Mater, the daily guess-the-team puzzle: an NFL starting offense drawn as O's in each player's college colors. Lineups are the `L` list in its script, and school colors and codes are the `S` map. Copied to `docs/almamater/`.
- `build/shortorder/` holds Short Order, the daily diner game: eight seeded tickets cooked on a grill, fryer, cold rail and drink fountain. Orders are generated from the date, so there's no puzzle list to maintain. Copied to `docs/shortorder/`.

Word list based on SCOWL by Kevin Atkinson (MIT-style license).

## Ads, stats and the friends list
Settings live at the top of `build_site.py`; every page loads the generated `docs/site.js`.
- `ADSENSE_CLIENT`: paste your `ca-pub-...` ID to turn on Google AdSense (auto ads). This also writes `docs/ads.txt` and switches the "no ads" wording on the homepage, About and Privacy pages. Pages in `NO_AD_PATHS` (the little-kids games) never load ads.
- `GOATCOUNTER`: your GoatCounter site code for cookie-free visitor stats.
- `FRIEND_CODE`: anyone who opens `playsproutle.com/?friend=<code>` once never sees ads on that device. `?friend=off` turns ads back on.
