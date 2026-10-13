# Sproutle

A daily word game: grow today's seed word into a long word, one letter at a time.
Live at https://playsproutle.com

- `docs/` is the published website (served by GitHub Pages).
- `build/` holds the game source, puzzle lists and word list.
  Run `python3 build/build_site.py` to rebuild `docs/`.
  Settings such as the launch date and Sproutle+ live at the top of `build_site.py`.
- `build/critter/` holds Critter Collector, which the build copies to `docs/critter-collector/`. The More games page is in `build_site.py`.
- `build/ranked/` holds Ranked, the daily ordering puzzle, which the build copies to `docs/ranked/`.

Word list based on SCOWL by Kevin Atkinson (MIT-style license).
