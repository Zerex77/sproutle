// Shared leaderboards for every game on playsproutle.com, backed by Supabase.
// Games call SLB.start / SLB.stop for the tie-break timer, then SLB.mount (inline) or SLB.open (pop-up).
(function(){
  const API = "https://eiftinbzwcuxalnnmjra.supabase.co/rest/v1/rpc/";
  const KEY = "sb_publishable_w64F-Z-J_Gx0rwIPMl-V3w_e5BJmUE0";
  const BAD = ["ASS","CUM","COK","CNT","DIC","DIK","DIX","FAG","FCK","FUC","FUK","FUQ","FKU","HOE","JIZ","KKK","KYS","NAZ","NIG","NGR","PIS","SEX","SHT","SUK","TIT","VAG","WTF","XXX","ANL"];

  const ls = {
    get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
    set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  };
  function device(){
    let d = ls.get("slb-device");
    if(!d || !/^[a-z0-9]{16,40}$/.test(d)){
      const r = (window.crypto && crypto.getRandomValues) ? crypto.getRandomValues(new Uint8Array(16)) : Array.from({length:16},()=>Math.random()*256|0);
      d = Array.from(r, b=>(b%36).toString(36)).join("") + Date.now().toString(36);
      ls.set("slb-device", d);
    }
    return d;
  }
  async function rpc(name, body){
    const ctl = new AbortController(), t = setTimeout(()=>ctl.abort(), 9000);
    try{
      const res = await fetch(API + name, {method:"POST", signal:ctl.signal,
        headers:{"apikey":KEY, "Content-Type":"application/json"}, body:JSON.stringify(body)});
      const txt = await res.text();
      if(!res.ok){ const e = new Error("rpc"); try{ e.msg = JSON.parse(txt).message; }catch(_){} throw e; }
      return txt ? JSON.parse(txt) : null;
    } finally { clearTimeout(t); }
  }

  // Puzzle number shared by Ranked, Trailhead, Keystone, Ballpark and Imposter (No. 1 = Oct 13, 2026, local date)
  function dayNo(){
    const d = new Date(), u = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.max(1, Math.round((u - Date.UTC(2026,9,13)) / 864e5) + 1);
  }

  // ---- Timer: from first move to finish, used only to break ties
  const tkey = (g,d)=>"slb-t:"+g+":"+d;
  function start(game, day){ const k=tkey(game,day), t=ls.get(k); if(!t || !t.s) ls.set(k, {s:Date.now()}); }
  function stop(game, day){
    const k=tkey(game,day), t=ls.get(k)||{};
    if(t.s && !t.e){ t.e = Date.now(); ls.set(k, t); }
    return (t.s && t.e) ? t.e - t.s : null;
  }
  function elapsed(game, day){ const t=ls.get(tkey(game,day))||{}; return (t.s&&t.e) ? t.e-t.s : null; }
  const clock = ms => { if(!ms || ms>=86399000) return ""; const s=Math.round(ms/1000); return s>=3600 ? Math.floor(s/3600)+"h "+Math.floor(s%3600/60)+"m" : Math.floor(s/60)+":"+String(s%60).padStart(2,"0"); };

  const postedKey = (g,d)=>"slb-posted:"+g+":"+d;
  const esc = s => String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  let cssDone = false;
  function css(){
    if(cssDone) return; cssDone = true;
    const s = document.createElement("style");
    s.textContent = `
.slb,.slb *{text-transform:none;letter-spacing:normal;box-sizing:border-box}
.slb span:empty{display:inline}
.slb{--slb-a:currentColor;display:flex;flex-direction:column;gap:10px;text-align:left;color:inherit;font:inherit}
.slb-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
.slb-h b{font-size:1.05em}
.slb-sub{font-size:.8em;opacity:.7}
.slb-note{font-size:.8em;opacity:.7;margin:-6px 0 0}
.slb-f{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px;border-radius:12px;background:color-mix(in srgb,var(--slb-a) 12%,transparent)}
.slb-f label{font-weight:700;font-size:.9em;flex:1 1 100%}
.slb-f input{width:5.2em;height:44px;border-radius:10px;border:2px solid color-mix(in srgb,currentColor 30%,transparent);background:transparent;color:inherit;font:800 1.3em ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.3em!important;text-align:center;text-transform:uppercase;padding:0 0 0 .3em}
.slb-f input:focus{outline:none;border-color:var(--slb-a)}
.slb-f button{height:44px;padding:0 18px;border:none;border-radius:10px;background:var(--slb-a);color:var(--slb-ai,#fff);font-weight:800;font-size:.95em;cursor:pointer}
.slb-f button:disabled{opacity:.5}
.slb-err{flex:1 1 100%;font-size:.85em;font-weight:600;color:#d9442f;min-height:1em;margin:0}
.slb-l{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;font-variant-numeric:tabular-nums}
.slb-l li{display:grid;grid-template-columns:2em 1fr auto 3.6em;gap:8px;align-items:center;padding:6px 10px;border-radius:8px;background:color-mix(in srgb,currentColor 6%,transparent)}
.slb-l li.gap{background:none;padding:0 10px;opacity:.5;display:block;text-align:center;line-height:.8}
.slb-l li .slb-r{font-weight:800;opacity:.75}
.slb-l li:nth-child(1) .slb-r{color:#d4a017;opacity:1}
.slb-l li .slb-n{font:800 1em ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em!important}
.slb-l li .slb-s{font-weight:700}
.slb-l li .slb-t{font-size:.8em;opacity:.65;text-align:right}
.slb-l li.me{background:var(--slb-a);color:var(--slb-ai,#fff)}
.slb-l li.me .slb-r{color:inherit}
.slb-m{margin:0;font-size:.85em;opacity:.75;text-align:center}
.slb-scrim{position:fixed;inset:0;z-index:9999;background:rgba(10,12,10,.55);display:grid;place-items:center;padding:16px}
.slb-panel{width:100%;max-width:400px;max-height:88vh;overflow:auto;border-radius:18px;padding:18px;box-shadow:0 20px 50px rgba(0,0,0,.35)}
.slb-x{align-self:flex-end;height:42px;padding:0 20px;border-radius:10px;border:none;background:color-mix(in srgb,currentColor 12%,transparent);color:inherit;font-weight:700;cursor:pointer}`;
    document.head.appendChild(s);
  }

  // opts: {game, day, score, eligible, fmt(score)->string, title, note, accent, accentInk, refresh}
  function mount(el, o){
    css();
    const dev = device(), key = postedKey(o.game, o.day);
    const fmt = o.fmt || (n=>String(n));
    const box = document.createElement("div"); box.className = "slb";
    if(o.accent) box.style.setProperty("--slb-a", o.accent);
    if(o.accentInk) box.style.setProperty("--slb-ai", o.accentInk);
    el.innerHTML = ""; el.appendChild(box);
    const title = o.title || "Today's top 10";
    let posted = ls.get(key);
    const last = ls.get("slb-initials") || "";
    box.innerHTML = `<div class="slb-h"><b>🏆 ${esc(title)}</b><span class="slb-sub">${o.day ? "No. "+o.day : ""}</span></div>`
      + (o.note ? `<p class="slb-note">${esc(o.note)}</p>` : "")
      + `<form class="slb-f" hidden><label for="slbIn">You scored ${esc(fmt(o.score))}. Add your initials to the board:</label>
         <input id="slbIn" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" value="${esc(last)}" aria-label="Your initials">
         <button type="submit">Post</button><p class="slb-err"></p></form>
         <ol class="slb-l"><li class="gap">Loading…</li></ol><p class="slb-m"></p>`;
    const form = box.querySelector("form"), input = box.querySelector("input"), err = box.querySelector(".slb-err"),
          list = box.querySelector("ol"), msg = box.querySelector(".slb-m"), btn = form.querySelector("button");
    form.hidden = !(o.eligible && !posted);
    input.addEventListener("input", ()=>{ input.value = input.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3); err.textContent=""; });
    input.addEventListener("keydown", e=>e.stopPropagation()); // keep game keyboards from grabbing letters

    async function load(){
      try{
        const rows = await rpc("top_scores", {p_game:o.game, p_day:o.day, p_device:dev});
        if(!rows || !rows.length){ list.innerHTML = `<li class="gap">No scores yet. Be the first!</li>`; msg.textContent=""; return; }
        let html = "", prev = 0;
        rows.forEach(r=>{
          if(r.rank > prev+1) html += `<li class="gap">⋮</li>`;
          prev = r.rank;
          html += `<li class="${r.mine?"me":""}"><span class="slb-r">${r.rank}</span><span class="slb-n">${esc(r.initials)}</span><span class="slb-s">${esc(fmt(r.score))}</span><span class="slb-t">${clock(r.ms)}</span></li>`;
        });
        list.innerHTML = html;
        const me = rows.find(r=>r.mine), total = rows[0].total;
        msg.textContent = me ? `You're #${me.rank} of ${total} player${total==1?"":"s"}${o.day? " today":""}.` : `${total} player${total==1?"":"s"} on the board.`;
      }catch(e){
        list.innerHTML = `<li class="gap">The leaderboard couldn't load. Check your connection.</li>`; msg.textContent="";
      }
    }
    async function post(initials, quiet){
      const ms = o.day ? (elapsed(o.game, o.day) ?? 86399000) : 0;
      await rpc("submit_score", {p_game:o.game, p_day:o.day, p_initials:initials, p_score:o.score, p_ms:Math.max(2000, Math.min(ms, 86399000)), p_device:dev});
      ls.set(key, initials); ls.set("slb-initials", initials); posted = initials;
    }
    form.addEventListener("submit", async e=>{
      e.preventDefault();
      const v = input.value.toUpperCase();
      if(!/^[A-Z]{3}$/.test(v)){ err.textContent = "Use three letters, A to Z."; return; }
      if(BAD.includes(v)){ err.textContent = "Let's pick different initials."; return; }
      btn.disabled = true; btn.textContent = "Posting…";
      try{ await post(v); form.hidden = true; await load(); }
      catch(ex){ err.textContent = ex && ex.msg === "bad initials" ? "Let's pick different initials." : "Couldn't post right now. Try again in a moment."; }
      btn.disabled = false; btn.textContent = "Post";
    });
    // All-time boards keep a posted score up to date
    (async ()=>{
      if(o.refresh && posted && o.eligible){ try{ await post(posted, true); }catch(e){} }
      load();
    })();
    return box;
  }

  function open(o){
    css();
    const scrim = document.createElement("div"); scrim.className = "slb-scrim";
    const panel = document.createElement("div"); panel.className = "slb-panel";
    panel.style.background = o.panelBg || "#fff"; panel.style.color = o.panelInk || "#1a1a1a";
    panel.style.display = "flex"; panel.style.flexDirection = "column"; panel.style.gap = "12px";
    const inner = document.createElement("div"), x = document.createElement("button");
    x.className = "slb-x"; x.type = "button"; x.textContent = "Close";
    panel.append(inner, x); scrim.appendChild(panel); document.body.appendChild(scrim);
    const close = ()=>{ scrim.remove(); document.removeEventListener("keydown", esck, true); };
    const esck = e=>{ if(e.key==="Escape"){ e.stopPropagation(); close(); } };
    document.addEventListener("keydown", esck, true);
    scrim.addEventListener("click", e=>{ if(e.target===scrim) close(); });
    x.onclick = close;
    mount(inner, o);
    return close;
  }

  const wasPosted = (g,d)=>!!ls.get(postedKey(g,d));
  window.SLB = {start, stop, mount, open, dayNo, wasPosted};
})();
