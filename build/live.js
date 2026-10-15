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
    rainbow(){
      const h = document.documentElement;
      try{ h.animate([{filter:"hue-rotate(0deg) saturate(1.6)"},{filter:"hue-rotate(360deg) saturate(1.6)"}], {duration:2000, iterations:5}); }catch(e){}
    },
  };
  function effect(name, p){
    const f = EFFECTS[name]; if(!f) return;
    if(fxBusy && name !== "confetti" && name !== "emoji"){ setTimeout(()=>effect(name, p), 1500); return; }
    fxBusy = true; setTimeout(()=>{ fxBusy = false; }, 1200);
    f(p || {});
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
  const NAMES = {sproutle:"Sproutle", greenhouse:"Greenhouse", waterworks:"Waterworks", keystone:"Keystone", daisychain:"Daisy Chain"};
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

  window.PSLive = {device: DEV, game: GAME, test: handle};
  const start = ()=>{ drainQueue(); setTimeout(checkin, 600); setTimeout(realtime, 1500); };
  if(document.readyState === "complete") start(); else addEventListener("load", start);
})();
