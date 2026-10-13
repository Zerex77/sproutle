"""Refresh Gridiron Golf's player stats from nflverse.

Run weekly (see .github/workflows/gridiron-stats.yml), then run build_site.py.

What it changes in players.json:
  - players who have played this season get fresh career totals in every category
  - new players with at least 16 games are added
  - a category newly added to categories.json gets filled in for every player since 1999,
    and gets a pin range
  - "asof" is set to the latest week in the data
Everything else is left alone: retired players (whose numbers were checked against
Pro Football Reference) and the pre-1999 "L:" rows never change.
"""
import csv, datetime, io, json, math, os, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'players.json')
CATS = json.load(open(os.path.join(HERE, 'categories.json')))['categories']
REL = 'https://github.com/nflverse/nflverse-data/releases/download'


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
    if x is None:
        return None
    x = round(x, 1)
    return int(x) if float(x).is_integer() else x


def nice(x):
    if x <= 0:
        return 1
    e = 10 ** math.floor(math.log10(x))
    for m in (1, 2, 5, 10):
        if m * e >= x:
            return m * e


def pin_range(values):
    v = sorted((x for x in values if x is not None and x > 0), reverse=True)
    if not v:
        return [1, 10, 1]
    hi = 5 * v[min(8, len(v) - 1)] * 0.9
    lo = 5 * v[min(60, len(v) - 1)]
    if lo >= hi * 0.8:
        lo = hi * 0.75
    step = max(1, nice((hi - lo) / 40))
    return [int(max(step, round(lo / step) * step)), int(round(hi / step) * step), int(step)]


def main():
    doc = json.load(open(DATA))
    keys = [c['key'] for c in CATS]
    old_keys = doc['cats']
    added_cats = [k for k in keys if k not in old_keys]

    # Re-shape every row to the current category order (new categories start as unknown)
    for r in doc['players']:
        vals = dict(zip(old_keys, r[3:]))
        r[3:] = [vals.get(k) for k in keys]
    doc['cats'] = keys
    have = {r[0]: r for r in doc['players']}

    today = datetime.date.today()
    season = today.year if today.month >= 8 else today.year - 1
    if fetch(f'{REL}/stats_player/stats_player_reg_{season}.csv') is None:
        season -= 1  # this season's file isn't published yet

    tot = {}
    for y in range(1999, season + 1):
        text = fetch(f'{REL}/stats_player/stats_player_reg_{y}.csv')
        if text is None:
            sys.exit(f'Missing nflverse data for {y}; leaving players.json unchanged.')
        for r in rows(text):
            if r.get('season_type') != 'REG':
                continue
            t = tot.setdefault(r['player_id'], {'name': r['player_display_name'], 'pos': r.get('position') or '',
                                                'first': y, 'last': y, 'v': {k: 0.0 for k in keys}})
            t['name'] = r['player_display_name'] or t['name']
            t['last'] = y
            for c in CATS:
                v = sum(num(r.get(col)) for col in c['cols'])
                t['v'][c['key']] = max(t['v'][c['key']], v) if c.get('agg') == 'max' else t['v'][c['key']] + v

    rookie = {r['gsis_id']: r.get('rookie_season', '') for r in rows(fetch(f'{REL}/players/players.csv'))}

    asof = doc.get('asof', '')
    week_text = fetch(f'{REL}/stats_player/stats_player_week_{season}.csv')
    if week_text:
        wr = rows(week_text)
        weeks = [int(r['week']) for r in wr if r.get('season_type') == 'REG' and r.get('week', '').isdigit()]
        post = any(r.get('season_type') == 'POST' for r in wr)
        if weeks:
            asof = f'the end of the {season} regular season' if post or max(weeks) >= 18 else f'Week {max(weeks)}, {season}'

    taken = {r[1].split(' (')[0] for r in doc['players']}
    updated = added = 0
    for pid, t in tot.items():
        rk = rookie.get(pid, '')
        if rk in ('', 'NA'):
            if t['first'] <= 1999:
                continue  # can't tell whether the career started before 1999
        elif int(rk) < 1999:
            continue  # pre-1999 careers are handled by hand (the L: rows)
        active = t['last'] == season
        old = have.get(pid)
        if not old and t['v']['games'] < 16:
            continue
        fresh = [clean(t['v'][k]) for k in keys]
        if old and not active and not old[2]:
            # retired: keep the checked numbers, only fill in brand-new categories
            for k in added_cats:
                old[3 + keys.index(k)] = fresh[keys.index(k)]
            continue
        if old:
            if old[3:] != fresh or bool(old[2]) != active:
                updated += 1
            old[2] = 1 if active else 0
            old[3:] = fresh
        else:
            label = t['name']
            if label in taken:
                label = f"{label} ({t['pos'] or 'NFL'}, {t['first']}–{'' if active else t['last']})"
            taken.add(t['name'])
            row = [pid, label, 1 if active else 0] + fresh
            doc['players'].append(row)
            have[pid] = row
            added += 1

    if len(doc['players']) < 6000:
        sys.exit('Player list looks too small; leaving players.json unchanged.')
    for k in keys:
        if k not in doc['pins']:
            doc['pins'][k] = pin_range(r[3 + keys.index(k)] for r in doc['players'])
    doc['asof'] = asof
    doc['players'].sort(key=lambda r: r[1])
    json.dump(doc, open(DATA, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'Stats through {asof}: {updated} players updated, {added} added, '
          f'{len(added_cats)} new categories, {len(doc["players"])} total.')


if __name__ == '__main__':
    main()
