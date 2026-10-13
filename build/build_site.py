import json, os, re, shutil, datetime
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, '..', 'docs')
DOMAIN = 'https://playsproutle.com'
LAUNCH = (2026, 9, 12)           # puzzle No. 1 (30 bonus archive days before the Oct 12 launch)
PLUS_ENABLED = False             # flip to True once payments are live
VERSION = datetime.datetime.now().strftime('%Y%m%d%H%M')

src = open(os.path.join(D, 'sprout.src.html')).read()
js = open(os.path.join(D, 'sprout.js')).read()
P = json.load(open(os.path.join(D, 'puzzles8.json')))
PR = json.load(open(os.path.join(D, 'practice.json')))
DICT = json.load(open(os.path.join(D, 'reach_all.json')))
COMMON = json.load(open(os.path.join(D, 'common.json')))

js = (js.replace('/*PUZ*/', json.dumps(P, separators=(',', ':')))
        .replace('/*PRAC*/', json.dumps(PR, separators=(',', ':')))
        .replace('/*DICT*/', ' '.join(DICT))
        .replace('/*COMMON*/', ' '.join(COMMON))
        .replace('/*LAUNCH*/', f'new Date({LAUNCH[0]},{LAUNCH[1]-1},{LAUNCH[2]})')
        .replace('/*PLUS*/', 'true' if PLUS_ENABLED else 'false'))
js += '''
if("serviceWorker" in navigator&&location.protocol==="https:"){addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").catch(()=>{});});}
'''

HEAD = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#2fc25f">
<link rel="icon" type="image/png" href="/favicon.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<meta property="og:site_name" content="Sproutle">
<meta property="og:image" content="{DOMAIN}/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{DOMAIN}/og-image.png">
<!-- Visitor stats: paste your Plausible or GoatCounter snippet on the next line -->
'''
RESET = '<style>*,*::before,*::after{box-sizing:border-box}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'

def meta(title, desc, path):
    return (f'<title>{title}</title>\n<meta name="description" content="{desc}">\n'
            f'<link rel="canonical" href="{DOMAIN}{path}">\n<meta property="og:title" content="{title}">\n'
            f'<meta property="og:description" content="{desc}">\n<meta property="og:url" content="{DOMAIN}{path}">\n'
            '<meta property="og:type" content="website">\n')

FOOT = '<nav class="sitefoot"><a href="/about">About</a><span>·</span><a href="/">All games</a><span>·</span><a href="/privacy">Privacy</a></nav>'

# ---------- game page ----------
game = src.replace('<!--SITEFOOT-->', FOOT).replace('/*JS*/', '\n' + js)
game = re.sub(r'^<title>.*?</title>\n', '', game)
i = game.index('<style>'); fonts = game[:i]
k = game.index('</style>', i) + len('</style>')
style = game[i:k].replace('@media (max-width:420px){',
    '.sitefoot{display:flex;justify-content:center;gap:8px;font-size:.8rem;color:var(--muted);padding-top:4px}.sitefoot a{color:var(--muted)}\n@media (max-width:420px){', 1)
index = (HEAD + meta('Sproutle: grow a word, one letter at a time',
                     'A free daily word game. Grow today\'s seed into a long word one letter at a time, without rearranging. New puzzle every day.', '/sproutle/')
         + RESET + fonts + style + '\n</head>\n<body>\n' + game[k:] + '\n</body>\n</html>\n')

# ---------- shared look for content pages ----------
TOKENS = style[style.index(':root{'):style.index('html,body{')]
PAGE_CSS = TOKENS + '''
html,body{min-height:100%}
body{background:var(--bg);background-image:radial-gradient(120% 50% at 50% 0%,color-mix(in srgb,var(--sun-glow) 45%,transparent),transparent 70%);color:var(--ink);font:16px/1.6 var(--f-body);padding-inline:16px}
.page{max-width:680px;margin:0 auto;padding-block:20px 48px;display:flex;flex-direction:column;gap:20px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;color:var(--leaf-deep);font:700 1.7rem/1 var(--f-display)}
.brand img{width:40px;height:40px;border-radius:10px}
.play{background:var(--leaf);color:#fff;text-decoration:none;font:700 .95rem var(--f-body);padding:10px 18px;border-radius:16px;box-shadow:0 4px 0 var(--leaf-deep)}
.card{background:var(--card);border-radius:24px;box-shadow:var(--shadow);padding:24px 22px;display:flex;flex-direction:column;gap:14px}
h1{font:700 2.1rem/1.15 var(--f-display);margin:0;text-wrap:balance}
h2{font:700 1.3rem/1.2 var(--f-display);margin:8px 0 0;color:var(--leaf-deep)}
p,ul,ol{margin:0}
ul,ol{padding-left:22px;display:flex;flex-direction:column;gap:6px}
.chain{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font:700 1rem var(--f-display);letter-spacing:.08em}
.chain span{background:var(--leaf-soft);border-radius:999px;padding:4px 12px}
.chain b{color:var(--leaf-deep)}
.chain i{font-style:normal;color:var(--muted)}
.muted{color:var(--muted);font-size:.9rem}
a{color:var(--leaf-deep)}
.sitefoot{display:flex;justify-content:center;gap:8px;font-size:.85rem;color:var(--muted)}
.sitefoot a{color:var(--muted)}
.big404{font:700 5rem/1 var(--f-display);color:var(--leaf)}
.games{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px}
.game{background:var(--card);border-radius:24px;box-shadow:var(--shadow);padding:20px;display:flex;flex-direction:column;gap:12px}
.game-head{display:flex;align-items:center;gap:14px}
.game-head img{width:64px;height:64px;border-radius:16px;flex:none}
.game h2{margin:0;color:var(--ink)}
.game .tag{font-size:.85rem;color:var(--muted);font-weight:600}
.game p{flex:1}
.game .play{align-self:flex-start}
'''
FONTS = fonts

def page(title, desc, path, body, button='<a class="play" href="/sproutle/">Play Sproutle</a>'):
    return (HEAD + meta(title, desc, path) + RESET + FONTS + '<style>' + PAGE_CSS + '</style>\n</head>\n<body>\n'
            '<div class="page">\n<header class="top"><a class="brand" href="/"><img src="/icon-192.png" alt="">Sproutle</a>'
            + button +'</header>\n' + body + '\n' + FOOT + '\n</div>\n</body>\n</html>\n')

about = page('About Sproutle', 'How to play Sproutle, the daily word game where you grow a short word into a long one, one letter at a time.', '/about', '''
<main class="card">
<h1>Grow a word, one letter at a time</h1>
<p>Sproutle is a free daily word game. Everyone gets the same short seed word. Your job is to grow it into a long word by adding one letter at a time, and every step has to be a real word.</p>
<div class="chain"><span>ORE</span><i>→</i><span><b>C</b>ORE</span><i>→</i><span><b>S</b>CORE</span><i>→</i><span>SCORE<b>D</b></span><i>→</i><span>SCO<b>U</b>RED</span></div>
<h2>How to play</h2>
<ol>
<li>Type your next word: today's word plus one new letter, added anywhere. Then press Grow.</li>
<li>You can't rearrange the letters you already have, and every word must be real.</li>
<li>Keep growing until you reach the target length: 7 letters early in the week, longer on weekends.</li>
<li>No easy endings: you can't add S, D, R or Y to the end of a word, so no plurals and no -ED or -ER.</li>
<li>Every word must still be able to grow to the target. A real word that can't bounces back 🟨 and costs one of your 5 leaves. A word that isn't real just shakes, with no penalty.</li>
<li>Stuck? A hint shows where a letter fits, and a second hint shows the letter.</li>
</ol>
<h2>Scoring</h2>
<p>Every bounce and every hint adds 1 to your score. A perfect bloom is zero: no bounces, no hints. Share your result with friends without spoiling the answer.</p>
<h2>A new seed every day</h2>
<p>A new puzzle sprouts at midnight in your time zone. Missed a day? Open the Archive from the game to catch up. Your streak counts only the puzzle of the day.</p>
<h2>Questions or ideas</h2>
<p>Sproutle is an independent game. Spotted a word that should count, or one that shouldn't? We'd love to hear about it.</p>
<p class="muted">Word list based on the Spell Checker Oriented Word Lists (SCOWL) by Kevin Atkinson, used under its MIT-style license.</p>
</main>''')

privacy = page('Privacy | Sproutle', 'Sproutle privacy policy. No accounts, no ads, and your game progress stays on your device.', '/privacy', '''
<main class="card">
<h1>Privacy</h1>
<p class="muted">Last updated October 12, 2026</p>
<p>Sproutle is built to need as little of your information as possible.</p>
<h2>What stays on your device</h2>
<p>Your puzzles, scores, streaks and settings are saved in your browser's local storage. They never leave your device, and we can't see them. Clearing your browser data erases them.</p>
<h2>What we don't collect</h2>
<ul><li>No accounts, names or email addresses.</li><li>No advertising and no ad trackers.</li><li>We don't sell or share personal data.</li></ul>
<h2>Visitor counts</h2>
<p>We may use a privacy-friendly analytics service to count visits and see which pages are popular. It doesn't use cookies and doesn't identify you personally.</p>
<h2>Fonts</h2>
<p>The site loads its fonts from Google Fonts, which receives your IP address when the fonts download.</p>
<h2>Changes</h2>
<p>If this policy changes, for example when optional paid features are added, we'll update this page and the date above.</p>
</main>''')

notfound = page('Page not found | Sproutle', 'This page does not exist.', '/404', '''
<main class="card" style="align-items:center;text-align:center">
<div class="big404">404</div>
<h1>This seed didn't sprout</h1>
<p>The page you were looking for isn't here. Today's puzzles are waiting, though.</p>
<p><a class="play" href="/">See all games</a></p>
</main>''')

# ---------- homepage: showcase of every game ----------
GAMES = [
    # slug, name, tag, blurb, button, icon, daily?
    ('sproutle', 'Sproutle', 'Daily word puzzle · 2 min', "Grow today's seed into a long word one letter at a time, without rearranging.", 'Play Sproutle', '/icon-192.png', True),
    ('ranked', 'Ranked', 'Daily ordering puzzle · 3 min', 'Six items, one rule. Put planets, skyscrapers, inventions and more in order in four tries.', 'Play Ranked', '/ranked/icon-192.png', True),
    ('trailhead', 'Trailhead', 'Daily word climb · 3 min', 'Climb a spring mountain one word at a time, solving a hidden five-letter word at every stop.', 'Play Trailhead', '/trailhead/icon-192.png', True),
    ('keystone', 'Keystone', 'Daily missing-word puzzle · 3 min', 'Find the word that joins both sides of six bridges. Their first letters spell the keystone.', 'Play Keystone', '/keystone/icon-192.png', True),
    ('critter-collector', 'Critter Collector', 'Zoo merge game · play anytime', "Merge chicks into bunnies and lions into elephants, and grow a zoo that earns while you're away.", 'Play Critter Collector', '/critter-collector/icon-192.png', False),
]

def card(g):
    slug, name, tag, blurb, btn, icon, daily = g
    status = f'<span class="badge" data-status="{slug}">New today</span>' if daily else '<span class="badge any">Play anytime</span>'
    return (f'<a class="game" href="/{slug}/"><div class="game-head"><img src="{icon}" alt="" width="64" height="64">'
            f'<div><h2>{name}</h2><div class="tag">{tag}</div></div></div><p>{blurb}</p>'
            f'<div class="game-foot">{status}<span class="play">{btn}</span></div></a>')

HOME_CSS = """<style>
.hero{display:flex;flex-direction:column;gap:8px;padding-top:4px}
.hero .date{font-size:.85rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.hero p{color:var(--muted);max-width:52ch}
.sect{font:700 1.1rem var(--f-display);color:var(--leaf-deep);margin:4px 0 -6px}
a.game{color:var(--ink);text-decoration:none;transition:transform .15s ease}
a.game:hover{transform:translateY(-3px)}
a.game:focus-visible{outline:3px solid var(--leaf);outline-offset:3px}
.game-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.badge{font-size:.8rem;font-weight:700;border-radius:999px;padding:4px 10px;background:var(--leaf-soft);color:var(--leaf-deep)}
.badge.done{background:var(--leaf);color:#fff}
.badge.prog{background:var(--bloom-soft);color:var(--bloom-deep)}
.badge.any{background:transparent;border:1.5px solid var(--line);color:var(--muted)}
.hero .progress{font-weight:700;color:var(--leaf-deep)}
.hero .progress:empty{display:none}
@media (prefers-reduced-motion:reduce){a.game{transition:none}a.game:hover{transform:none}}
</style>
"""

HOME_JS = """<script>
(function(){
  const day=d=>Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5);
  const now=new Date(), td=day(now);
  const get=k=>{try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}};
  const iso=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  const spNo=Math.max(1,td-day(new Date(LAUNCH_Y,LAUNCH_M,LAUNCH_D))+1);
  const dailyNo=Math.max(1,td-day(new Date(2026,9,13))+1);
  // 0 = not started, 1 = in progress, 2 = finished today
  const status={
    sproutle(){const s=get("sproutle-day-"+spNo);return !s?0:s.done?2:(s.hist&&s.hist.length>1)?1:0},
    ranked(){const s=get("ranked-v1");const d=s&&s.day;return !d||d.n!==dailyNo?0:d.status!=="playing"?2:d.guesses.length?1:0},
    keystone(){const s=get("keystone-v1");const d=s&&s.day;return !d||d.n!==dailyNo?0:d.status!=="playing"?2:(d.cracks||d.solved.some(Boolean)||d.rev.some(Boolean))?1:0},
    trailhead(){const s=get("fogline-climb");return !s||!s.daily||s.seed!==iso?0:s.path.length>=5?2:s.path.length?1:0}
  };
  let done=0,total=0;
  document.querySelectorAll("[data-status]").forEach(b=>{
    total++; let v=0; try{v=status[b.dataset.status]()}catch(e){}
    if(v===2){b.textContent="✓ Done today";b.classList.add("done");done++}
    else if(v===1){b.textContent="In progress";b.classList.add("prog")}
  });
  document.getElementById("today").textContent=now.toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
  document.getElementById("progress").textContent = done===total ? "You've finished every daily puzzle today. See you tomorrow!" : done ? done+" of "+total+" daily puzzles done today." : "";
})();
if("serviceWorker" in navigator&&location.protocol==="https:"){addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").catch(()=>{});});}
</script>
""".replace('LAUNCH_Y', str(LAUNCH[0])).replace('LAUNCH_M', str(LAUNCH[1]-1)).replace('LAUNCH_D', str(LAUNCH[2]))

HOME_BODY = ('''
<main style="display:flex;flex-direction:column;gap:18px">
<section class="hero">
<div class="date" id="today">Today's puzzles</div>
<h1>Quick, free games with a new puzzle every day</h1>
<p>No accounts and no ads. Your progress and streaks stay on your device.</p>
<p class="progress" id="progress"></p>
</section>
<h2 class="sect">Daily puzzles</h2>
<div class="games">
''' + '\n'.join(card(g) for g in GAMES if g[6]) + '''
</div>
<h2 class="sect">Play anytime</h2>
<div class="games">
''' + '\n'.join(card(g) for g in GAMES if not g[6]) + '''
</div>
</main>''')

home = page('Sproutle: free daily puzzle games',
            'Free daily puzzle games: grow a word in Sproutle, put things in order in Ranked, climb a mountain in Trailhead, build bridges in Keystone, and merge animals in Critter Collector.',
            '/', HOME_BODY, button='')
home = home.replace('</head>', HOME_CSS + '</head>', 1).replace('</body>', HOME_JS + '</body>', 1)

# The old More games page forwards to the homepage so existing links keep working
games = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Sproutle games</title>\n'
         f'<link rel="canonical" href="{DOMAIN}/">\n<meta http-equiv="refresh" content="0; url=/">\n'
         '<meta name="robots" content="noindex">\n<script>location.replace("/")</script>\n'
         '</head><body><p><a href="/">See all games</a></p></body></html>\n')

manifest = {
    "name": "Sproutle", "short_name": "Sproutle",
    "description": "Grow a word, one letter at a time. A new puzzle every day.",
    "start_url": "/sproutle/", "scope": "/", "display": "standalone",
    "background_color": "#d9f7c4", "theme_color": "#2fc25f",
    "icons": [
        {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}

sw = f'''// Sproutle offline support. The version changes on every build so players get updates.
const CACHE="sproutle-{VERSION}";
const SHELL=["/","/sproutle/","/about","/privacy","/manifest.webmanifest","/icon-192.png","/icon-512.png","/favicon.png"];
self.addEventListener("install",e=>{{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));}});
self.addEventListener("activate",e=>{{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));}});
self.addEventListener("fetch",e=>{{
  const r=e.request; if(r.method!=="GET")return;
  const url=new URL(r.url);
  if(url.origin===location.origin&&r.mode==="navigate"){{
    e.respondWith(fetch(r).then(res=>{{const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));return res;}}).catch(()=>caches.match(r).then(m=>m||caches.match("/"))));return;}}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{{if(res.ok&&(url.origin===location.origin||url.host.endsWith("gstatic.com")||url.host.endsWith("googleapis.com"))){{const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));}}return res;}})));
}});
'''

robots = f'User-agent: *\nAllow: /\nSitemap: {DOMAIN}/sitemap.xml\n'
today = datetime.date.today().isoformat()
sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + ''.join(f'  <url><loc>{DOMAIN}{p}</loc><lastmod>{today}</lastmod></url>\n' for p in ['/', '/sproutle/', '/ranked/', '/trailhead/', '/keystone/', '/critter-collector/', '/about', '/privacy'])
           + '</urlset>\n')
headers = '''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
/sw.js
  Cache-Control: no-cache
/
  Cache-Control: no-cache
'''

os.makedirs(os.path.join(OUT, 'sproutle'), exist_ok=True)
files = {'index.html': home, 'sproutle/index.html': index, 'about.html': about, 'games.html': games, 'privacy.html': privacy, '404.html': notfound,
         'manifest.webmanifest': json.dumps(manifest, indent=2), 'sw.js': sw, 'robots.txt': robots,
         'sitemap.xml': sitemap, '_headers': headers}
for name, text in files.items():
    open(os.path.join(OUT, name), 'w').write(text)
# Ranked is a separate daily game, copied as-is from build/ranked/
shutil.copytree(os.path.join(D, 'ranked'), os.path.join(OUT, 'ranked'), dirs_exist_ok=True)
# Trailhead is a separate daily game, copied as-is from build/trailhead/
shutil.copytree(os.path.join(D, 'trailhead'), os.path.join(OUT, 'trailhead'), dirs_exist_ok=True)
# Keystone is a separate daily game, copied as-is from build/keystone/
shutil.copytree(os.path.join(D, 'keystone'), os.path.join(OUT, 'keystone'), dirs_exist_ok=True)
# Critter Collector is a separate game, copied as-is from build/critter/
shutil.copytree(os.path.join(D, 'critter'), os.path.join(OUT, 'critter-collector'), dirs_exist_ok=True)
print('built', sorted(os.listdir(OUT)))
