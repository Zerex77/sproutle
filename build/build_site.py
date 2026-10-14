import json, os, re, shutil, datetime
D = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(D, '..', 'docs')
DOMAIN = 'https://playsproutle.com'
LAUNCH = (2026, 9, 12)           # puzzle No. 1 (30 bonus archive days before the Oct 12 launch)
PLUS_ENABLED = False             # flip to True once payments are live

# ---- Money and stats (all off until filled in) ----
ADSENSE_CLIENT = ''              # e.g. 'ca-pub-1234567890123456' once AdSense approves the site. Turns on ads + writes ads.txt
GOATCOUNTER = ''                 # e.g. 'sproutle' if your stats page is sproutle.goatcounter.com
FRIEND_CODE = 'sproutfam'        # friends open playsproutle.com/?friend=sproutfam once and never see ads on that device
NO_AD_PATHS = ['/animalmatch/', '/bugsquish/']   # pages that never load ads (games for little kids)
ADS = bool(ADSENSE_CLIENT)
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
<!-- Visitor stats and ads are loaded by /site.js (settings at the top of build_site.py) -->
'''
RESET = '<style>*,*::before,*::after{box-sizing:border-box}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'

def meta(title, desc, path):
    return (f'<title>{title}</title>\n<meta name="description" content="{desc}">\n'
            f'<link rel="canonical" href="{DOMAIN}{path}">\n<meta property="og:title" content="{title}">\n'
            f'<meta property="og:description" content="{desc}">\n<meta property="og:url" content="{DOMAIN}{path}">\n'
            '<meta property="og:type" content="website">\n')

FOOT = '<nav class="sitefoot"><a href="/about">About</a><span>·</span><a href="/">All games</a><span>·</span><a href="/privacy">Privacy</a></nav>'

ADS_PRIVACY = '''<h2>Advertising</h2>
<p>The site is free because it shows ads from Google AdSense. Google and its partners may use cookies to show ads and measure them, including ads based on your visits to this and other sites. You can turn off personalized ads at <a href="https://adssettings.google.com">Google Ad Settings</a>, and Google explains how it uses data at <a href="https://policies.google.com/technologies/partner-sites">How Google uses information from sites that use its services</a>. Visitors in the EU and UK are asked for consent first. The games for little kids never show ads.</p>
'''

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

privacy = page('Privacy | Sproutle', 'Sproutle privacy policy. No accounts, and your game progress stays on your device.', '/privacy', '''
<main class="card">
<h1>Privacy</h1>
<p class="muted">Last updated October 12, 2026</p>
<p>Sproutle is built to need as little of your information as possible.</p>
<h2>What stays on your device</h2>
<p>Your puzzles, scores, streaks and settings are saved in your browser's local storage. They never leave your device, and we can't see them. Clearing your browser data erases them.</p>
<h2>What we don't collect</h2>
<ul><li>No accounts, names or email addresses.</li>''' + ('' if ADS else '<li>No advertising and no ad trackers.</li>') + '''<li>We don't sell or share personal data.</li></ul>
<h2>Leaderboards</h2>
<p>If you choose to post a score, we store the three initials you enter, your score, how long the puzzle took, and a random ID created on your device so you can only post once per puzzle. Leaderboard data is stored with our database provider, Supabase. Nothing is posted unless you press Post.</p>
''' + (ADS_PRIVACY if ADS else '') + '''<h2>Visitor counts</h2>
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
    ('ballpark', 'Ballpark', 'Daily number puzzle · 1 min', 'One question, five guesses. Get close enough to the real number and you\'re in the ballpark.', 'Play Ballpark', '/ballpark/icon-192.png', True),
    ('imposter', 'Imposter', 'Daily odd-one-out · 2 min', 'Five rows of four suspects. Three share a secret. Spot the one that doesn\'t belong.', 'Play Imposter', '/imposter/icon-192.png', True),
    ('gridiron', 'Gridiron Golf', 'Daily NFL trivia · 3 min', 'One stat, one pin. Name five NFL players whose career totals land closest to it. Endless mode too.', 'Play Gridiron Golf', '/gridiron/icon-192.png', True),
    ('almamater', 'Alma Mater', 'Daily NFL puzzle · 2 min', "Eleven starters drawn up in their college colors. Name the NFL team in four guesses. Endless mode too.", 'Play Alma Mater', '/almamater/icon-192.png', True),
    ('critter-collector', 'Critter Collector', 'Zoo merge game · play anytime', "Merge chicks into bunnies and lions into elephants, and grow a zoo that earns while you're away.", 'Play Critter Collector', '/critter-collector/icon-192.png', False),
]
# Games for little kids get their own homepage section
KIDS = [
    ('animalmatch', 'Animal Match', 'Memory game for ages 2 to 4', 'Flip big cards to find matching dinosaurs, unicorns, fairies and animals. Each card says its name, and every finish ends in a dance party.', 'Play Animal Match', '/animalmatch/icon-192.png', False),
    ('bugsquish', 'Bug Squish', 'Tapping game for ages 2 to 4', "Pesky ants, roaches and hornets are munching the unicorn's flowers. Squish them, catch sparkly surprise bugs for rainbows and fireworks, and tap the watering can to grow a garden.", 'Play Bug Squish', '/bugsquish/icon-192.png', False),
]

def card(g):
    slug, name, tag, blurb, btn, icon, daily = g
    status = f'<span class="badge" data-status="{slug}">New today</span>' if daily else '<span class="badge any">Play anytime</span>'
    return (f'<a class="game" href="/{slug}/"><div class="game-head"><img src="{icon}" alt="" width="64" height="64">'
            f'<div><h2>{name}</h2><div class="tag">{tag}</div></div></div><p>{blurb}</p>'
            f'<div class="game-foot">{status}<span class="play">{btn}</span></div></a>')

HOME_CSS = """<style>
.zb{display:inline-flex;align-items:center;gap:8px;padding:6px 14px 6px 6px;border-radius:999px;text-decoration:none;background:#1f1240;color:#fff8ec;border:3px solid #120a24;
  box-shadow:3px 3px 0 #ff3d9a,6px 6px 0 #8c5cff;transform:rotate(-4deg);transition:transform .15s,box-shadow .15s;animation:zbwig 4s ease-in-out infinite}
.zb:hover,.zb:focus-visible{transform:rotate(3deg) scale(1.08);box-shadow:4px 4px 0 #c6ff3d,8px 8px 0 #ff3d9a;animation:none}
.zb:focus-visible{outline:3px solid #c6ff3d;outline-offset:4px}
.zb-eye{width:36px;height:36px;border-radius:50%;background:#ff6b2c;display:grid;place-items:center;flex:none;position:relative}
.zb-eye::before{content:"";position:absolute;top:-9px;left:12px;border:6px solid transparent;border-bottom:11px solid #8c5cff;border-top:0}
.zb-eye i{width:20px;height:20px;border-radius:50%;background:#fff8ec;border:2px solid #120a24;display:grid;place-items:center}
.zb-eye i::after{content:"";width:9px;height:9px;border-radius:50%;background:#120a24;animation:zblook 3s ease-in-out infinite}
.zb-t{display:flex;flex-direction:column;line-height:1}
.zb-t b{font:900 1rem/1 "Arial Black",Impact,system-ui,sans-serif;letter-spacing:.01em;color:#c6ff3d;text-shadow:2px 2px 0 #ff3d9a}
.zb-t small{font-size:.7rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#ffb38f}
@keyframes zbwig{0%,82%,100%{rotate:0deg}85%{rotate:-6deg}88%{rotate:5deg}91%{rotate:-3deg}94%{rotate:2deg}}
@keyframes zblook{0%,100%{translate:0 0}30%{translate:3px -2px}60%{translate:-3px 1px}}
@media (prefers-reduced-motion:reduce){.zb,.zb-eye i::after{animation:none}.zb{transition:none}}
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
    trailhead(){const s=get("trailhead-daily")||get("fogline-climb");return !s||!s.daily||s.seed!==iso?0:s.path.length>=5?2:s.path.length?1:0},
    ballpark(){const s=get("ballpark-v1");const d=s&&s.day;return !d||d.n!==dailyNo?0:d.status!=="playing"?2:d.guesses.length?1:0},
    imposter(){const s=get("imposter-v1");const d=s&&s.day;return !d||d.n!==dailyNo?0:d.status!=="playing"?2:d.picks.length?1:0},
    gridiron(){const s=get("gridiron-v2");const d=s&&s.day;return !d||d.n!==dailyNo?0:d.status!=="playing"?2:d.picks.length?1:0},
    almamater(){const s=get("almamater-v1");const d=s&&s.day;return !d||d.n!==dailyNo?0:d.status!=="playing"?2:d.guesses.length?1:0}
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
<p>''' + ('No accounts. Your progress and streaks stay on your device.' if ADS else 'No accounts and no ads. Your progress and streaks stay on your device.') + '''</p>
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
<h2 class="sect">For little kids</h2>
<div class="games">
''' + '\n'.join(card(g) for g in KIDS) + '''
</div>
</main>''')

home = page('Sproutle: free daily puzzle games',
            'Free daily puzzle games: grow a word in Sproutle, put things in order in Ranked, climb a mountain in Trailhead, build bridges in Keystone, guess the number in Ballpark, spot the odd one out in Imposter, play NFL trivia golf in Gridiron Golf, name the team from its colleges in Alma Mater, merge animals in Critter Collector, and match dinosaurs and unicorns in Animal Match or help a unicorn squish garden pests in Bug Squish for little kids.',
            '/', HOME_BODY, button='<a class="zb" href="/zachbox/" aria-label="Zach Box party games"><span class="zb-eye" aria-hidden="true"><i></i></span><span class="zb-t"><b>Zach Box</b><small>party games!</small></span></a>')
home = home.replace('</head>', HOME_CSS + '</head>', 1).replace('</body>', HOME_JS + '</body>', 1)

# ---------- About: the whole site, built from GAMES so new games show up automatically ----------
ABOUT_CSS = """<style>
.alist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.alist li{display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:start}
.alist img{width:48px;height:48px;border-radius:12px}
.alist a{font:700 1.05rem var(--f-body);text-decoration:none;color:var(--ink)}
.alist a:hover{text-decoration:underline}
.alist .t{font-size:.82rem;color:var(--muted);font-weight:600}
.alist p{margin:2px 0 0;font-size:.95rem}
.alist div{min-width:0}
</style>
"""
def about_item(g):
    slug, name, tag, blurb, btn, icon, daily = g
    return (f'<li><img src="{icon}" alt="" width="48" height="48"><div><a href="/{slug}/">{name}</a>'
            f'<div class="t">{tag}</div><p>{blurb}</p></div></li>')
about = page('About | Sproutle', 'About playsproutle.com: free, quick daily puzzle games with no accounts, from word puzzles to NFL trivia.', '/about', '''
<main class="card">
<h1>Small games, new every day</h1>
<p>playsproutle.com is an independent collection of free games. Most are daily puzzles: everyone gets the same puzzle, a new one arrives at midnight in your time zone, and a game takes a few minutes. There's a word puzzle, a number puzzle, a couple of football games and more, plus one game you can play anytime.</p>
<h2>The games</h2>
<ul class="alist">
''' + '\n'.join(about_item(g) for g in GAMES + KIDS) + '''
</ul>
<h2>How the daily games work</h2>
<ul>
<li>Everyone plays the same puzzle each day, so you can compare results with friends.</li>
<li>Each game has a <b>?</b> button with its own rules, and a stats button with your record and streaks.</li>
<li>Share buttons copy your result without giving away the answer.</li>
<li>Your progress saves as you play, so you can close a game and finish it later today.</li>
</ul>
<h2>Leaderboards</h2>
<p>When you finish a daily puzzle you can add three initials to that day's top 10. Ties go to whoever finished faster. Posting is optional, and nothing is shared unless you press Post. In Gridiron Golf you can tap a player on the board to see the round they played.</p>
<h2>''' + ('No accounts' if ADS else 'No accounts, no ads') + '''</h2>
<p>You don't sign up for anything. Your scores, streaks and settings stay in your browser on your device. The <a href="/privacy">privacy page</a> has the details.</p>
<h2>Play it like an app</h2>
<p>On your phone, open the site and choose Add to Home Screen from your browser's share or menu button. It opens full screen, like an app.</p>
<h2>Questions or ideas</h2>
<p>Spotted a word that should count, a stat that looks off, or have an idea for a new game? We'd love to hear about it.</p>
<h2>Credits</h2>
<p class="muted">Sproutle and Trailhead use word lists based on the Spell Checker Oriented Word Lists (SCOWL) by Kevin Atkinson, under its MIT-style license. Gridiron Golf's player stats come from nflverse (1999 to today) and Pro Football Reference (earlier careers).</p>
</main>''', button='<a class="play" href="/">All games</a>')
about = about.replace('</head>', ABOUT_CSS + '</head>', 1)

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
           + ''.join(f'  <url><loc>{DOMAIN}{p}</loc><lastmod>{today}</lastmod></url>\n' for p in ['/', '/sproutle/', '/ranked/', '/trailhead/', '/keystone/', '/ballpark/', '/imposter/', '/gridiron/', '/almamater/', '/zachbox/', '/groupchat/', '/blendin/', '/badtranslation/', '/whosaidthat/', '/critter-collector/', '/animalmatch/', '/bugsquish/', '/about', '/privacy'])
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
# Shared leaderboard script used by every game
shutil.copy(os.path.join(D, 'lb.js'), os.path.join(OUT, 'lb.js'))
# Ranked is a separate daily game, copied as-is from build/ranked/
shutil.copytree(os.path.join(D, 'ranked'), os.path.join(OUT, 'ranked'), dirs_exist_ok=True)
# Trailhead is a separate daily game, copied as-is from build/trailhead/
shutil.copytree(os.path.join(D, 'trailhead'), os.path.join(OUT, 'trailhead'), dirs_exist_ok=True)
# Keystone is a separate daily game, copied as-is from build/keystone/
shutil.copytree(os.path.join(D, 'keystone'), os.path.join(OUT, 'keystone'), dirs_exist_ok=True)
# Ballpark, Imposter and Alma Mater are separate daily games, copied as-is from build/<slug>/
for g in ('ballpark', 'imposter', 'almamater', 'groupchat', 'zachbox', 'blendin', 'badtranslation', 'whosaidthat', 'animalmatch', 'bugsquish'):
    shutil.copytree(os.path.join(D, g), os.path.join(OUT, g), dirs_exist_ok=True)
# Gridiron Golf: fill the page template with every category and player (players.json is refreshed weekly by gridiron/update_stats.py)
G = os.path.join(D, 'gridiron')
gcats = json.load(open(os.path.join(G, 'categories.json')))['categories']
gdata = json.load(open(os.path.join(G, 'players.json')))
gidx = {k: i for i, k in enumerate(gdata['cats'])}
gcats = [c for c in gcats if c['key'] in gidx and c['key'] in gdata['pins']]
FAME = {'games': 5, 'pass_yds': .05, 'rush': 1, 'recyds': 1, 'sacks': 60, 'def_int': 80, 'fg_made': 20, 'solo': 3, 'punts': 4, 'kr_yds': .3}
def gnum(v):
    if v is None: return '-'
    if v == 0: return ''
    return str(int(v)) if float(v).is_integer() else str(v)
grows = []
for r in gdata['players']:
    vals = r[3:]
    fame = int(sum(abs(vals[gidx[k]] or 0) * w for k, w in FAME.items()))
    flag = '1' if r[2] else ('p' if r[0][:2] in ('L:', 'P:') else '0')   # active, or a career that began before 1999
    grows.append(f"{r[1]}|{flag}|{fame}|" + ','.join(gnum(vals[gidx[c['key']]]) for c in gcats))
# "since" (from categories.json) lets the hole card say "since 1999"
gmeta = [{'key': c['key'], 'name': c['name'], 'unit': c['unit'], 'group': c['group'], 'pin': gdata['pins'][c['key']],
          'since': c.get('since', 0)} for c in gcats]
gpage = (open(os.path.join(G, 'index.src.html')).read()
         .replace('/*CATS*/', json.dumps(gmeta, separators=(',', ':'), ensure_ascii=False))
         .replace('/*DATA*/', json.dumps(grows, separators=(',', ':'), ensure_ascii=False))
         .replace('/*ASOF*/', gdata['asof']))
os.makedirs(os.path.join(OUT, 'gridiron'), exist_ok=True)
open(os.path.join(OUT, 'gridiron', 'index.html'), 'w').write(gpage)
for f in ('icon-192.png', 'icon-512.png', 'apple-touch-icon.png'):
    shutil.copy(os.path.join(G, f), os.path.join(OUT, 'gridiron', f))
# Critter Collector is a separate game, copied as-is from build/critter/
shutil.copytree(os.path.join(D, 'critter'), os.path.join(OUT, 'critter-collector'), dirs_exist_ok=True)

# ---------- shared site script: friend no-ads link, visitor stats, ads ----------
site_cfg = json.dumps({'ads': ADSENSE_CLIENT, 'goat': GOATCOUNTER, 'friend': FRIEND_CODE, 'noAds': NO_AD_PATHS})
site_js = '(function(){var C=' + site_cfg + r''';
var K="ps-adfree",ls={get:function(){try{return localStorage.getItem(K)}catch(e){return null}},
  set:function(v){try{v?localStorage.setItem(K,"1"):localStorage.removeItem(K)}catch(e){}}};
var q=new URLSearchParams(location.search),f=q.get("friend"),msg=null;
if(f!==null){
  if(f==="off"){ls.set(false);msg="Ads are back on for this device";}
  else if(f===C.friend){ls.set(true);msg="You're on the friends list. No ads on this device 💚";}
  q.delete("friend");var u=location.pathname+(q.toString()?"?"+q:"")+location.hash;
  try{history.replaceState(null,"",u)}catch(e){}
}
var adFree=ls.get()==="1";
window.psSite={adFree:adFree};
function toast(t){var d=document.createElement("div");d.textContent=t;
  d.style.cssText="position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;background:#1f7a3a;color:#fff;font:600 15px/1.3 system-ui,sans-serif;padding:10px 18px;border-radius:999px;width:max-content;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90vw;text-align:center";
  document.body.appendChild(d);setTimeout(function(){d.style.transition="opacity .4s";d.style.opacity="0"},2600);setTimeout(function(){d.remove()},3100);}
function add(src,attrs){var s=document.createElement("script");s.async=true;s.src=src;for(var a in attrs)s.setAttribute(a,attrs[a]);document.head.appendChild(s);}
function go(){
  if(msg)toast(msg);
  if(C.goat)add("https://gc.zgo.at/count.js",{"data-goatcounter":"https://"+C.goat+".goatcounter.com/count"});
  var kids=C.noAds.some(function(p){return location.pathname.indexOf(p)===0});
  if(C.ads&&!adFree&&!kids)add("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+C.ads,{crossorigin:"anonymous"});
}
if(document.body)go();else document.addEventListener("DOMContentLoaded",go);
})();
'''
open(os.path.join(OUT, 'site.js'), 'w').write(site_js)
ads_txt = os.path.join(OUT, 'ads.txt')
if ADS:
    open(ads_txt, 'w').write(f"google.com, {ADSENSE_CLIENT.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n")
elif os.path.exists(ads_txt):
    os.remove(ads_txt)
# Load it on every page (idempotent, so rebuilding never adds it twice)
TAG = f'<script src="/site.js?v={VERSION}" defer></script>'
for root, _, names in os.walk(OUT):
    for n in names:
        if not n.endswith('.html'):
            continue
        fp = os.path.join(root, n)
        h = open(fp).read()
        h2 = re.sub(r'<script src="/site\.js[^"]*" defer></script>\n?', '', h)
        if '</head>' in h2:
            h2 = h2.replace('</head>', TAG + '\n</head>', 1)
            if h2 != h:
                open(fp, 'w').write(h2)

print('built', sorted(os.listdir(OUT)))
