"""Refresh Gridiron Golf's player stats from nflverse.

Run weekly (see .github/workflows/gridiron-stats.yml), then run build_site.py.

What it changes in players.json:
  - players who have played this season get fresh career totals from nflverse
  - new players who reach the minimums are added
  - "asof" is set to the latest week in the data
Everything else is left alone: retired players (whose numbers were checked against
Pro Football Reference) and the pre-1999 "L:" rows never change.
"""
import csv, datetime, io, json, os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'players.json')
REL = 'https://github.com/nflverse/nflverse-data/releases/download'
STATS = ['passtd', 'rush', 'recyds', 'sacks']
COLS = {'passtd': 'passing_tds', 'rush': 'rushing_yards', 'recyds': 'receiving_yards', 'sacks': 'def_sacks'}


def fetch(url):
    try:
        with urllib.request.urlopen(url, timeout=120) as r:
            return r.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def rows(text):
    return list(csv.DictReader(io.StringIO(text)))


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0


def clean(x):
    x = round(x, 1)
    return int(x) if float(x).is_integer() else x


def main():
    doc = json.load(open(DATA))
    have = {r[0]: r for r in doc['players']}

    today = datetime.date.today()
    season = today.year if today.month >= 8 else today.year - 1
    if fetch(f'{REL}/stats_player/stats_player_reg_{season}.csv') is None:
        season -= 1  # this season's file isn't published yet

    # Career regular-season totals for everyone since 1999
    tot = {}
    for y in range(1999, season + 1):
        text = fetch(f'{REL}/stats_player/stats_player_reg_{y}.csv')
        if text is None:
            sys.exit(f'Missing nflverse data for {y}; leaving players.json unchanged.')
        for r in rows(text):
            if r.get('season_type') != 'REG':
                continue
            t = tot.setdefault(r['player_id'], {'name': r['player_display_name'], 'pos': r.get('position') or '',
                                                'first': y, 'last': y, **{s: 0.0 for s in STATS}})
            t['name'] = r['player_display_name'] or t['name']
            t['last'] = y
            for s in STATS:
                t[s] += num(r.get(COLS[s]))

    rookie = {r['gsis_id']: r.get('rookie_season', '') for r in rows(fetch(f'{REL}/players/players.csv'))}

    # Latest week in the data, for the "as of" note
    asof = doc.get('asof', '')
    week_text = fetch(f'{REL}/stats_player/stats_player_week_{season}.csv')
    if week_text:
        weeks = [int(r['week']) for r in rows(week_text) if r.get('season_type') == 'REG' and r.get('week', '').isdigit()]
        post = any(r.get('season_type') == 'POST' for r in rows(week_text))
        if weeks:
            asof = f'the end of the {season} regular season' if post or max(weeks) >= 18 else f'Week {max(weeks)}, {season}'

    taken = set()
    for r in doc['players']:
        taken.add(r[1].split(' (')[0])

    updated = added = 0
    for pid, t in tot.items():
        rk = rookie.get(pid, '')
        if rk in ('', 'NA'):
            if t['first'] <= 1999:
                continue  # can't tell whether the career started before 1999
        elif int(rk) < 1999:
            continue  # pre-1999 careers are handled by hand (the L: rows)
        if not (t['rush'] >= 200 or t['recyds'] >= 200 or t['passtd'] >= 2 or t['sacks'] >= 5):
            continue
        active = t['last'] == season
        old = have.get(pid)
        if old and not active and not old[6]:
            continue  # retired and already final
        vals = [clean(t[s]) for s in STATS]
        if old:
            if old[2:6] != vals or bool(old[6]) != active:
                updated += 1
            old[2:6] = vals
            old[6] = 1 if active else 0
        else:
            label = t['name']
            if label in taken:
                label = f"{label} ({t['pos'] or 'NFL'}, {t['first']}–{'' if active else t['last']})"
            taken.add(t['name'])
            row = [pid, label] + vals + [1 if active else 0]
            doc['players'].append(row)
            have[pid] = row
            added += 1

    if len(doc['players']) < 3000:
        sys.exit('Player list looks too small; leaving players.json unchanged.')
    doc['asof'] = asof
    doc['players'].sort(key=lambda r: r[1])
    json.dump(doc, open(DATA, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'Stats through {asof}: {updated} players updated, {added} added, {len(doc["players"])} total.')


if __name__ == '__main__':
    main()
