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

Word list based on SCOWL by Kevin Atkinson (MIT-style license).
