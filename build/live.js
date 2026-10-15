// Live messages, screen effects and power-ups sent from the private admin page (/live-admin/).
// Loaded on every page by site.js. Each browser checks in with Supabase so it shows up on the admin page,
// listens on its own realtime channel for a "ping", then picks up anything waiting in its inbox.
// Games register their own power-ups in window.PSPowers: {id: {label, run() -> message | {ok:false, msg}}}.
(function(){
  if(window.PSLive || /^\/live-admin/.test(location.pathname)) return;
  const URL_ = "https://eiftinbzwcuxalnnmjra.supabase.co", KEY = "sb_publishable_w64F-Z-J_Gx0rwIPMl-V3w_e5BJmUE0";
  const SBJS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.100.0/dist/umd/supabase.js";
  const ls = {
    get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  };
  // Same device ID the leaderboards use (lb.js), so a player is one person across both
  function device(){
    let d = ls.get("slb-device");
    if(!d || !/^[a-z0-9]{16,40}$/.test(d)){
      const r = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(16)) : Array.from({length:16},()=>Math.random()*256|0);
      d = Array.from(r, b=>(b%36).toString(36)).join("") + Date.now().toString(36);
      ls.set("slb-device", d);
    }
    return d;
  }
  const DEV = device();
  const GAME = (location.pathname.split("/").filter(Boolean)[0] || "home").replace(/\.html$/,"").toLowerCase().slice(0,30);
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

  async function rpc(name, body){
    const ctl = new AbortController(), t = setTimeout(()=>ctl.abort(), 9000);
    try{
      const res = await fetch(URL_ + "/rest/v1/rpc/" + name, {method:"POST", signal:ctl.signal,
        headers:{"apikey":KEY, "Content-Type":"application/json"}, body:JSON.stringify(body)});
      if(!res.ok) throw new Error("rpc " + res.status);
      const txt = await res.text();
      return txt ? JSON.parse(txt) : null;
    } finally { clearTimeout(t); }
  }

  // ---------- Check in: say "I'm here", and collect anything waiting
  let busy = false, lastCheck = 0, timer = 0, rtOk = false;
  async function checkin(){
    if(busy) return; busy = true; lastCheck = Date.now();
    try{
      const ini = ls.get("slb-initials");
      const rows = await rpc("live_checkin", {p_device:DEV, p_initials: /^[A-Z]{3}$/.test(ini||"") ? ini : null, p_game:GAME});
      if(Array.isArray(rows)) rows.sort((a,b)=>a.id-b.id).forEach(handle);
    }catch(e){}
    busy = false;
    schedule();
  }
  function schedule(){
    clearTimeout(timer);
    // Realtime pings deliver right away; the regular check-in keeps the admin page's "online" dot fresh
    // and is the backup if realtime can't connect
    timer = setTimeout(()=>{ if(!document.hidden) checkin(); else schedule(); }, rtOk ? 60000 : 25000);
  }
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden && Date.now()-lastCheck > 5000) checkin(); });

  function realtime(){
    const go = ()=>{
      try{
        const sb = window.supabase.createClient(URL_, KEY, {auth:{persistSession:false, autoRefreshToken:false, detectSessionInUrl:false}});
        sb.channel("live:" + DEV, {config:{broadcast:{self:false, ack:false}}})
          .on("broadcast", {event:"ping"}, ()=>checkin())
          .subscribe(s=>{ const was = rtOk; rtOk = s === "SUBSCRIBED"; if(rtOk && !was) checkin(); });
      }catch(e){}
    };
    if(window.supabase && window.supabase.createClient) return go();
    const s = document.createElement("script"); s.async = true; s.src = SBJS; s.onload = go; document.head.appendChild(s);
  }

  // ---------- Inbox items
  function handle(it){
    const p = it.payload || {};
    try{
      if(it.kind === "message") message(p);
      else if(it.kind === "effect") effect(p.name, p);
      else if(it.kind === "power") power(p);
    }catch(e){}
  }

  // ---------- Styles
  let cssDone = false;
  function css(){
    if(cssDone) return; cssDone = true;
    const s = document.createElement("style");
    s.textContent = `
.psl,.psl *{box-sizing:border-box;text-transform:none;letter-spacing:normal}
.psl{font:16px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#17301f}
.psl-toast{position:fixed;left:50%;top:max(16px,env(safe-area-inset-top));transform:translateX(-50%);z-index:2147483646;background:#1f7a3a;color:#fff;font-weight:600;padding:10px 18px;border-radius:999px;max-width:min(92vw,520px);width:max-content;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25);white-space:pre-wrap;animation:psl-in .3s ease-out}
.psl-banner{position:fixed;left:0;right:0;top:0;z-index:2147483646;background:linear-gradient(90deg,#1f7a3a,#2fc25f);color:#fff;padding:max(12px,env(safe-area-inset-top)) 52px 12px 16px;font-weight:600;box-shadow:0 6px 20px rgba(0,0,0,.25);white-space:pre-wrap;animation:psl-drop .35s ease-out}
.psl-banner small,.psl-card small{display:block;font-size:.78em;font-weight:700;opacity:.8;margin-bottom:2px}
.psl-banner button{position:absolute;right:8px;bottom:6px;width:40px;height:40px;border:none;border-radius:10px;background:rgba(255,255,255,.18);color:#fff;font-size:20px;cursor:pointer}
.psl-scrim{position:fixed;inset:0;z-index:2147483646;background:rgba(10,20,12,.55);display:grid;place-items:center;padding:16px;animation:psl-fade .2s}
.psl-card{background:#fffdf6;color:#17301f;border-radius:20px;padding:22px 20px 18px;width:100%;max-width:360px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.35);animation:psl-pop .35s cubic-bezier(.2,1.4,.4,1)}
.psl-card .big{font-size:52px;line-height:1;margin-bottom:8px}
.psl-card h2{margin:0 0 6px;font-size:21px}
.psl-card p{margin:6px 0;white-space:pre-wrap}
.psl-card .note{font-style:italic;opacity:.8}
.psl-card a,.psl-card button{display:block;width:100%;margin-top:14px;height:48px;border:none;border-radius:12px;background:#1f7a3a;color:#fff;font:700 17px system-ui,sans-serif;cursor:pointer;text-decoration:none;line-height:48px}
.psl-card a + button{background:#e6efe3;color:#17301f;margin-top:8px}
.psl-shout{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;pointer-events:none;padding:16px}
.psl-shout span{font:900 clamp(40px,13vw,120px)/1 system-ui,sans-serif;color:#fff;text-align:center;-webkit-text-stroke:3px #1f7a3a;paint-order:stroke fill;text-shadow:0 8px 0 #1f7a3a,0 14px 30px rgba(0,0,0,.4);animation:psl-shout 3.2s ease-out forwards;word-break:break-word}
.psl-emoji{position:fixed;top:-60px;z-index:2147483645;pointer-events:none;font-size:36px;line-height:1;will-change:transform}
.psl-scare{position:fixed;inset:0;z-index:2147483647;background:radial-gradient(circle,#3a0000 0%,#000 70%);display:grid;place-items:center;overflow:hidden;animation:psl-flash .12s steps(2) 3}
.psl-scare.out{transition:opacity .35s;opacity:0}
.psl-scare-e{font-size:min(80vw,80vh);line-height:1;animation:psl-lunge 1.5s cubic-bezier(.2,1.6,.4,1) forwards;filter:drop-shadow(0 0 40px rgba(255,0,0,.6))}
.psl-scare-t{position:absolute;bottom:12vh;left:0;right:0;text-align:center;font:900 clamp(44px,14vw,110px)/1 system-ui,sans-serif;color:#ff2a2a;-webkit-text-stroke:2px #000;animation:psl-jitter .08s infinite}
.psl-scream{position:fixed;inset:0;z-index:2147483647;background:#000;overflow:hidden;animation:psl-strobe .09s steps(1) 6}
.psl-scream.out{transition:opacity .35s;opacity:0}
.psl-scream-f{position:absolute;inset:-4%;width:108%;height:108%;object-fit:cover;animation:psl-violent .06s infinite,psl-push 1.9s ease-in forwards}
@keyframes psl-strobe{0%{filter:invert(1) contrast(2)}50%{filter:none;background:#600}}
@keyframes psl-violent{0%{translate:0 0}25%{translate:-12px 8px}50%{translate:10px -10px}75%{translate:-8px -6px}100%{translate:9px 7px}}
@keyframes psl-push{0%{transform:scale(1)}100%{transform:scale(1.15)}}
@keyframes psl-lunge{0%{transform:scale(.15) rotate(-10deg)}18%{transform:scale(1.25) rotate(4deg)}24%{transform:scale(1.1) rotate(-3deg)}30%{transform:scale(1.2) rotate(2deg)}100%{transform:scale(1.15) rotate(0)}}
@keyframes psl-jitter{50%{transform:translate(3px,-2px)}}
@keyframes psl-flash{50%{background:#fff}}
@keyframes psl-in{from{opacity:0;transform:translate(-50%,-12px)}}
@keyframes psl-drop{from{transform:translateY(-100%)}}
@keyframes psl-fade{from{opacity:0}}
@keyframes psl-pop{from{transform:scale(.7);opacity:0}}
@keyframes psl-shout{0%{transform:scale(.2) rotate(-8deg);opacity:0}12%{transform:scale(1.15) rotate(3deg);opacity:1}20%{transform:scale(1) rotate(0)}85%{opacity:1}100%{transform:scale(1.05);opacity:0}}
@keyframes psl-rainbow{to{filter:hue-rotate(360deg) saturate(1.6)}}`;
    document.head.appendChild(s);
  }
  function el(tag, cls, text){ const e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }

  // ---------- Messages: toast, banner, popup, shout
  function message(p){
    css();
    const text = String(p.text || "").slice(0, 500), from = String(p.from || "").slice(0, 40);
    if(!text) return;
    const style = p.style || "popup";
    if(style === "toast"){
      const t = el("div", "psl psl-toast", (from ? from + ": " : "") + text);
      document.body.appendChild(t);
      const ms = Math.min(9000, 2500 + text.length * 60);
      setTimeout(()=>{ t.style.transition = "opacity .4s"; t.style.opacity = "0"; }, ms);
      setTimeout(()=>t.remove(), ms + 450);
    } else if(style === "banner"){
      const b = el("div", "psl psl-banner");
      if(from) b.appendChild(el("small", "", "💬 " + from));
      b.appendChild(document.createTextNode(text));
      const x = el("button", "", "×"); x.type = "button"; x.setAttribute("aria-label", "Close"); x.onclick = ()=>b.remove();
      b.appendChild(x); document.body.appendChild(b);
      setTimeout(()=>b.remove(), 20000);
    } else if(style === "shout"){
      const s = el("div", "psl psl-shout"); s.appendChild(el("span", "", text));
      document.body.appendChild(s); setTimeout(()=>s.remove(), 3300);
    } else {
      card({big: p.emoji || "💬", title: from ? "From " + from : "A message for you", body: text});
    }
  }

  // Pop-up cards wait their turn so two never stack
  const cards = []; let cardUp = false;
  function card(o){ cards.push(o); if(!cardUp) nextCard(); }
  function nextCard(){
    const o = cards.shift(); if(!o){ cardUp = false; return; }
    cardUp = true; css();
    const scrim = el("div", "psl psl-scrim"), c = el("div", "psl-card");
    c.setAttribute("role", "dialog"); c.setAttribute("aria-modal", "true");
    c.appendChild(el("div", "big", o.big || "💬"));
    c.appendChild(el("h2", "", o.title || ""));
    if(o.body) c.appendChild(el("p", "", o.body));
    if(o.note) c.appendChild(el("p", "note", "“" + o.note + "”"));
    if(o.link){ const a = el("a", "", o.link.text); a.href = o.link.href; c.appendChild(a); }
    const ok = el("button", "", o.link ? "Later" : "OK"); ok.type = "button"; c.appendChild(ok);
    scrim.appendChild(c); document.body.appendChild(scrim);
    // Keep the game's keyboard shortcuts from firing behind the card
    const keys = e=>{ e.stopPropagation(); if(e.key === "Escape" || e.key === "Enter"){ e.preventDefault(); close(); } };
    const close = ()=>{ scrim.remove(); document.removeEventListener("keydown", keys, true); setTimeout(nextCard, 250); };
    document.addEventListener("keydown", keys, true);
    ok.onclick = close; scrim.addEventListener("click", e=>{ if(e.target === scrim) close(); });
    setTimeout(()=>ok.focus(), 50);
  }

  // ---------- Screen effects. Everything undoes itself after a few seconds.
  let fxBusy = false;
  function onBody(frames, opts){
    const b = document.body;
    try{ return b.animate(frames, opts); }catch(e){ return null; }
  }
  function onRoot(filter, ms){
    const h = document.documentElement, was = h.style.filter;
    h.style.transition = "filter .6s"; h.style.filter = filter;
    setTimeout(()=>{ h.style.filter = was; setTimeout(()=>{ h.style.transition = ""; }, 700); }, ms);
  }
  const EFFECTS = {
    confetti(){ confetti(); },
    emoji(p){ rain(p.emoji || "🌱"); },
    shake(){ onBody([{transform:"translate(0,0)"},{transform:"translate(-14px,6px) rotate(-1.5deg)"},{transform:"translate(12px,-8px) rotate(1.5deg)"},{transform:"translate(-10px,4px)"},{transform:"translate(8px,-2px)"},{transform:"translate(0,0)"}], {duration: REDUCED ? 300 : 650, iterations: REDUCED ? 1 : 2}); },
    flip(){ onBody([{transform:"rotate(0)"},{transform:"rotate(180deg)",offset:.08},{transform:"rotate(180deg)",offset:.92},{transform:"rotate(360deg)"}], {duration:9000, easing:"ease-in-out"}); },
    spin(){ onBody([{transform:"rotate(0) scale(1)"},{transform:"rotate(360deg) scale(.85)",offset:.5},{transform:"rotate(720deg) scale(1)"}], {duration:1600, easing:"ease-in-out"}); },
    tiny(){ onBody([{transform:"scale(1)"},{transform:"scale(.45)",offset:.08},{transform:"scale(.45)",offset:.92},{transform:"scale(1)"}], {duration:8000}); },
    mirror(){ onBody([{transform:"scaleX(1)"},{transform:"scaleX(-1)",offset:.06},{transform:"scaleX(-1)",offset:.94},{transform:"scaleX(1)"}], {duration:10000}); },
    invert(){ onRoot("invert(1) hue-rotate(180deg)", 8000); },
    blur(){ onRoot("blur(5px)", 5000); },
    gray(){ onRoot("grayscale(1)", 10000); },
    jumpscare(p){ scare(p.emoji, p.quiet); },
  screamer(p){ screamer(p.quiet); },
  rainbow(){
      const h = document.documentElement;
      try{ h.animate([{filter:"hue-rotate(0deg) saturate(1.6)"},{filter:"hue-rotate(360deg) saturate(1.6)"}], {duration:2000, iterations:5}); }catch(e){}
    },
  };
  // Little-kids games never get the jump scare
  const KIDS = ["animalmatch", "bugsquish", "superrescue"];
  function effect(name, p){
    const f = EFFECTS[name]; if(!f) return;
    if((name === "jumpscare" || name === "screamer") && KIDS.includes(GAME)) return;
    if(fxBusy && name !== "confetti" && name !== "emoji"){ setTimeout(()=>effect(name, p), 1500); return; }
    fxBusy = true; setTimeout(()=>{ fxBusy = false; }, 1200);
    f(p || {});
  }
  // Jump scare: the screen goes dark, a giant critter lunges at them with a roar, then it's gone
  function scare(emoji, quiet){
    if(KIDS.includes(GAME)) return;
    css();
    const o = el("div", "psl psl-scare"), e = el("div", "psl-scare-e", String(emoji || "👹").slice(0, 8)), t = el("div", "psl-scare-t", "RAAAWR!");
    o.append(e, t); document.body.appendChild(o);
    if(!quiet) roar();
    try{ navigator.vibrate && navigator.vibrate([400, 60, 300]); }catch(err){}
    setTimeout(()=>o.classList.add("out"), 1500);
    setTimeout(()=>o.remove(), 1900);
  }
  // Screamer: a classic internet jump scare. A ghoul's face fills the screen instantly, shaking and
  // strobing, with a shriek. The face is an original drawing (SVG), so there's nothing to download first.
  const GHOUL = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice"> <defs> <radialGradient id="sk" cx="50%" cy="40%" r="62%"> <stop offset="0" stop-color="#e3ddd0"/><stop offset=".45" stop-color="#b9b2a2"/><stop offset=".78" stop-color="#5d574c"/><stop offset="1" stop-color="#14120f"/> </radialGradient> <radialGradient id="sock" cx="50%" cy="50%" r="55%"> <stop offset="0" stop-color="#000"/><stop offset=".6" stop-color="#050303"/><stop offset=".85" stop-color="#2a1612" stop-opacity=".85"/><stop offset="1" stop-color="#4a2a22" stop-opacity="0"/> </radialGradient> <radialGradient id="mo" cx="50%" cy="40%" r="60%"> <stop offset="0" stop-color="#000"/><stop offset=".7" stop-color="#0a0202"/><stop offset="1" stop-color="#3b0606"/> </radialGradient> <radialGradient id="vig" cx="50%" cy="45%" r="70%"> <stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".95"/> </radialGradient> <filter id="warp" x="-20%" y="-20%" width="140%" height="140%"> <feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="3" seed="7" result="n"/> <feDisplacementMap in="SourceGraphic" in2="n" scale="26" xChannelSelector="R" yChannelSelector="G"/> </filter> <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter> <filter id="tear"><feGaussianBlur stdDeviation="1.2"/></filter> <filter id="soft2"><feGaussianBlur stdDeviation="2.2"/></filter> <filter id="grain" x="0" y="0" width="100%" height="100%"> <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/> <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/> <feComposite in2="SourceGraphic" operator="in"/> </filter> <filter id="blotch" x="0" y="0" width="100%" height="100%"> <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="4" seed="11"/> <feColorMatrix values="0 0 0 0 .25  0 0 0 0 .2  0 0 0 0 .14  0 0 0 1.4 -.55"/> <feComposite in2="SourceGraphic" operator="in"/> </filter> <clipPath id="headclip"><path id="hp" d="M200 18 C 300 20 352 110 348 215 C 345 300 318 360 286 420 C 262 466 232 506 200 508 C 166 506 138 466 114 420 C 82 360 52 300 52 210 C 50 110 102 18 200 18 Z"/></clipPath> </defs> <rect width="400" height="520" fill="#000"/> <g filter="url(#warp)"> <use href="#hp" fill="url(#sk)"/> <g clip-path="url(#headclip)"> <rect width="400" height="520" fill="#fff" filter="url(#blotch)"/>  <ellipse cx="118" cy="300" rx="40" ry="90" fill="#2b241c" opacity=".55" filter="url(#soft)"/> <ellipse cx="284" cy="300" rx="40" ry="90" fill="#2b241c" opacity=".55" filter="url(#soft)"/>  <ellipse cx="200" cy="150" rx="150" ry="40" fill="#3a3228" opacity=".45" filter="url(#soft)"/>  <ellipse cx="135" cy="190" rx="58" ry="66" fill="url(#sock)" filter="url(#soft2)" transform="rotate(-12 135 190)"/> <ellipse cx="268" cy="182" rx="54" ry="72" fill="url(#sock)" filter="url(#soft2)" transform="rotate(14 268 182)"/>  <circle cx="140" cy="196" r="6" fill="#f4efe2"/><circle cx="140" cy="196" r="2.4" fill="#000"/> <circle cx="262" cy="186" r="5" fill="#f4efe2"/><circle cx="262" cy="186" r="2" fill="#000"/>  <g filter="url(#tear)"><path d="M128 248 C 126 290 132 320 126 368 C 124 380 136 382 136 368 C 138 330 134 290 138 250 Z" fill="#5a0404" opacity=".9"/> <path d="M276 250 C 280 280 274 300 280 336 C 282 346 292 344 290 334 C 286 300 290 278 286 248 Z" fill="#5a0404" opacity=".85"/></g>  <path d="M190 252 C 184 270 182 288 192 292 C 196 284 198 270 196 252 Z" fill="#000" filter="url(#soft2)"/> <path d="M212 252 C 218 270 220 288 210 292 C 206 284 204 270 206 252 Z" fill="#000" filter="url(#soft2)"/>  <ellipse cx="200" cy="398" rx="62" ry="98" fill="#1a0b08" opacity=".7" filter="url(#soft)"/> <path d="M200 318 C 248 318 262 380 252 430 C 244 470 224 492 200 492 C 176 492 156 470 148 430 C 138 380 152 318 200 318 Z" fill="url(#mo)"/>  <path d="M152 350 C 180 330 220 330 248 350 L244 362 C 220 344 180 344 156 362 Z" fill="#4a0d0a"/> <path d="M154 352 L166 372 L174 340 L184 368 L192 332 L200 364 L208 330 L216 366 L226 338 L234 370 L246 350 L240 336 C 220 322 180 322 160 336 Z" fill="#cfc4a6"/> <path d="M160 452 L170 430 L180 462 L190 438 L200 470 L210 440 L220 464 L230 432 L240 452 C 232 478 214 490 200 490 C 186 490 168 478 160 452 Z" fill="#b9ad8c"/>  <g fill="none" stroke="#3a0d0a" stroke-width="1.6" opacity=".75"> <path d="M80 120 L100 150 L94 176 L112 210"/><path d="M320 110 L300 140 L310 168 L292 196 L300 214"/> <path d="M190 40 L196 80 L186 110 L200 136"/><path d="M90 330 L110 352 L104 380"/><path d="M318 320 L298 350 L306 384"/> </g> <rect width="400" height="520" fill="#fff" filter="url(#grain)" opacity=".5"/> </g> </g> <rect width="400" height="520" fill="url(#vig)"/> </svg>`;
  let ghoulUrl = "";
  function screamer(quiet){
    if(KIDS.includes(GAME)) return;
    css();
    ghoulUrl = ghoulUrl || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(GHOUL);
    const o = el("div", "psl psl-scream"), img = el("img", "psl-scream-f");
    img.src = ghoulUrl; img.alt = ""; o.appendChild(img); document.body.appendChild(o);
    if(!quiet) shriek();
    try{ navigator.vibrate && navigator.vibrate([600, 80, 500, 80, 300]); }catch(err){}
    setTimeout(()=>o.classList.add("out"), 1900);
    setTimeout(()=>o.remove(), 2300);
  }
  let actx = null;
  function audio(){
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if(actx.state === "suspended") actx.resume();
    return actx;
  }
  function shriek(){
    try{
      const a = audio(), t = a.currentTime, len = 1.9;
      const out = a.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.7, t + 0.02); out.gain.setValueAtTime(0.7, t + len - .5); out.gain.exponentialRampToValueAtTime(0.0001, t + len);
      const shaper = a.createWaveShaper(), curve = new Float32Array(256);
      for(let i = 0; i < 256; i++){ const x = i / 128 - 1; curve[i] = Math.tanh(x * 6); }
      shaper.curve = curve; shaper.connect(out); out.connect(a.destination);
      // A wavering, rising scream: detuned saws with a fast wobble
      const lfo = a.createOscillator(), depth = a.createGain(); lfo.frequency.value = 23; depth.gain.value = 60; lfo.connect(depth); lfo.start(t); lfo.stop(t + len);
      [620, 655, 1240].forEach((f, k)=>{ const o = a.createOscillator(), g = a.createGain(); o.type = "sawtooth";
        o.frequency.setValueAtTime(f * .8, t); o.frequency.exponentialRampToValueAtTime(f * 1.25, t + .35); o.frequency.exponentialRampToValueAtTime(f * 1.05, t + len);
        depth.connect(o.frequency); g.gain.value = k === 2 ? .35 : .6; o.connect(g).connect(shaper); o.start(t); o.stop(t + len); });
      // Hiss on top
      const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate), d = buf.getChannelData(0);
      for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const n = a.createBufferSource(), bp = a.createBiquadFilter(), ng = a.createGain(); n.buffer = buf; bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = .8; ng.gain.value = .5;
      n.connect(bp).connect(ng).connect(out); n.start(t);
    }catch(err){}
  }
  function roar(){
    try{
      const a = audio(), t = a.currentTime, len = 1.3;
      const out = a.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.55, t + 0.04); out.gain.exponentialRampToValueAtTime(0.0001, t + len);
      out.connect(a.destination);
      // Growl: two detuned saws sliding down, through a crunchy wave shaper
      const shaper = a.createWaveShaper(), curve = new Float32Array(256);
      for(let i = 0; i < 256; i++){ const x = i / 128 - 1; curve[i] = Math.tanh(x * 4); }
      shaper.curve = curve; shaper.connect(out);
      [95, 101].forEach(f=>{ const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f * .45, t + len);
        o.connect(shaper); o.start(t); o.stop(t + len); });
      // Breath: filtered noise
      const buf = a.createBuffer(1, Math.floor(a.sampleRate * len), a.sampleRate), d = buf.getChannelData(0);
      for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const n = a.createBufferSource(), lp = a.createBiquadFilter(); n.buffer = buf; lp.type = "lowpass"; lp.frequency.setValueAtTime(1800, t); lp.frequency.exponentialRampToValueAtTime(300, t + len);
      n.connect(lp).connect(out); n.start(t);
    }catch(err){}
  }
  function rain(emoji){
    css();
    const n = REDUCED ? 14 : 40, H = innerHeight + 120;
    for(let i = 0; i < n; i++){
      const s = el("div", "psl-emoji", String(emoji).slice(0, 8));
      s.style.left = (Math.random() * 96) + "vw"; s.style.fontSize = (26 + Math.random() * 26) + "px";
      document.body.appendChild(s);
      const dur = 2200 + Math.random() * 2200, delay = Math.random() * 1600, drift = (Math.random() - .5) * 120;
      const a = s.animate([{transform:"translate(0,0) rotate(0)"},{transform:`translate(${drift}px,${H}px) rotate(${(Math.random()-.5)*540}deg)`}], {duration:dur, delay, easing:"cubic-bezier(.4,.1,.7,1)", fill:"backwards"});
      a.onfinish = ()=>s.remove();
    }
  }
  function confetti(){
    const c = el("canvas"), d = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
    c.width = W * d; c.height = H * d;
    c.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483645";
    document.body.appendChild(c);
    const x = c.getContext("2d"); x.scale(d, d);
    const cols = ["#2fc25f","#f7c531","#f0508c","#3fb6e8","#9b5de5","#ff8a2b","#ffffff"];
    const ps = Array.from({length: REDUCED ? 60 : 180}, ()=>({x:W/2 + (Math.random()-.5)*W*.3, y:H*.35, vx:(Math.random()-.5)*16, vy:-Math.random()*16-4,
      r:Math.random()*Math.PI, vr:(Math.random()-.5)*.4, w:6+Math.random()*6, h:4+Math.random()*6, c:cols[Math.random()*cols.length|0]}));
    const t0 = performance.now();
    (function tick(t){
      x.clearRect(0, 0, W, H);
      for(const p of ps){ p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w/2, -p.h/2, p.w, p.h); x.restore(); }
      if(t - t0 < 4000) requestAnimationFrame(tick); else c.remove();
    })(t0);
  }

  // ---------- Power-ups. Each one belongs to a game; if the player is somewhere else it waits for them.
  const QK = "pslive-q";
  const NAMES = {sproutle:"Sproutle", greenhouse:"Greenhouse", waterworks:"Waterworks", keystone:"Keystone", daisychain:"Daisy Chain", "critter-collector":"Critter Collector"};
  function power(p){
    if(!p.game || !p.id) return;
    if(p.game === GAME && window.PSPowers && window.PSPowers[p.id]) return usePower(p);
    const q = (ls.get(QK) || []).filter(x=>Date.now() - x.t < 3*864e5).slice(-19);
    q.push({game:p.game, id:p.id, note:p.note || "", from:p.from || "", label:p.label || "", t:Date.now()}); ls.set(QK, q);
    const name = NAMES[p.game] || p.game;
    card({big:"🎁", title:"You got a power-up!", body:(p.label ? p.label + "\n" : "") + "It's waiting for you in " + name + ".", note:p.note,
      link:{href:"/" + p.game + "/", text:"Open " + name}});
  }
  function usePower(p){
    const pw = window.PSPowers[p.id];
    let r;
    try{ r = pw.run(); }catch(e){ r = {ok:false, msg:"Something went wrong, so this one fizzled."}; }
    if(r && r.quiet) return;
    const ok = !(r && r.ok === false), msg = r && typeof r === "object" ? r.msg : r;
    card({big: ok ? (pw.emoji || "🎁") : "💨", title: ok ? (pw.label || "Power-up!") : "It fizzled", body: msg || "", note: p.note});
    if(ok && !REDUCED && pw.good !== false) confetti();
  }
  function drainQueue(){
    const q = ls.get(QK) || [], keep = [], mine = [];
    q.forEach(x=>{ if(Date.now() - x.t >= 3*864e5) return; (x.game === GAME ? mine : keep).push(x); });
    if(!mine.length) return;
    ls.set(QK, keep);
    if(!window.PSPowers) return;
    mine.forEach((x, i)=>setTimeout(()=>{ if(window.PSPowers[x.id]) usePower(x); }, 600 + i*200));
  }

  window.PSLive = {device: DEV, game: GAME, test: handle, scare, screamer};
  const start = ()=>{ drainQueue(); setTimeout(checkin, 600); setTimeout(realtime, 1500); };
  if(document.readyState === "complete") start(); else addEventListener("load", start);
})();
