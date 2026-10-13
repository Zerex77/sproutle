const PUZZLES=/*PUZ*/;
const PRACTICE=/*PRAC*/;
const DICT=new Set("/*DICT*/".split(" "));
const COMMON=new Set("/*COMMON*/".split(" "));   // everyday words: the ones that count as growing tall
/* ---- settings ---- */
const LAUNCH=/*LAUNCH*/;      // the date of puzzle No. 1
const PLUS_ENABLED=/*PLUS*/;   // turn on once payments are connected
const FREE_ARCHIVE_DAYS=7;            // free players can replay this many past days
const PRICES={month:"$2.99",year:"$19.99"};
/* ------------------ */
const $=id=>document.getElementById(id);
const REDUCED=matchMedia("(prefers-reduced-motion: reduce)").matches;
function today(){const n=new Date();return new Date(n.getFullYear(),n.getMonth(),n.getDate());}
const TODAY=Math.max(1,Math.round((today()-LAUNCH)/864e5)+1);
const dateOf=n=>new Date(LAUNCH.getFullYear(),LAUNCH.getMonth(),LAUNCH.getDate()+n-1);
const store={get(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}};
const STATS="sproutle-stats";
const isPlus=()=>PLUS_ENABLED&&!!store.get("sproutle-plus");
const ABC="abcdefghijklmnopqrstuvwxyz";

let MODE, SEED, PAR, PERFECT, PATH, KEY, S, RULE=false;
const BLOCKED="sdry";   // with the rule on, these letters can't be added to the end
const blockedMove=(w,i,c)=>RULE&&i===w.length&&BLOCKED.includes(c);
let typed="", fresh=false, armed=-1, hintFor="", hintStage=0, hintMove=null, warned={};
function cur(){return S.hist[S.hist.length-1].w;}
const MAX_BOUNCES=5;
const fresh0=()=>({hist:[{w:SEED,at:-1}],log:[],misses:0,wilts:0,snips:0,hints:0,tried:[],done:false,end:null});
const save=()=>{if(MODE.kind==="practice")store.set("sproutle-practice",{idx:MODE.idx,S});else store.set(KEY,S);};

function load(mode){
  MODE=mode;
  const pz=mode.kind==="practice"?PRACTICE[mode.idx%PRACTICE.length]:PUZZLES[(mode.num-1)%PUZZLES.length];
  [SEED,PAR,PERFECT,PATH]=pz;RULE=pz[4]===1;
  if(mode.kind==="practice"){const sp=store.get("sproutle-practice");S=sp&&sp.idx===mode.idx?sp.S:fresh0();}
  else{KEY="sproutle-day-"+mode.num;S=store.get(KEY)||fresh0();}
  if(!S.hist||!S.hist.length||S.hist[0].w!==SEED)S=fresh0();
  S.hints=S.hints||0;typed="";armed=-1;fresh=false;hintFor="";hintStage=0;hintMove=null;warned={};reachMemo=new Map();meadowCount=-1;parts=[];
  save();renderMode();render();
}
const isToday=()=>MODE.kind==="daily"&&MODE.num===TODAY;

function canGrow(w){for(let i=0;i<=w.length;i++)for(const c of ABC)if(!blockedMove(w,i,c)&&DICT.has(w.slice(0,i)+c+w.slice(i)))return true;return false;}
function buzz(ms){try{navigator.vibrate&&navigator.vibrate(ms);}catch(e){}}
const bounces=()=>S.misses+(S.wilts||0);
const score=()=>(S.snips||0)+bounces()+(S.hints||0);
/* can this word still grow to the target? */
let reachMemo=new Map();
function kids(w){const out=[];for(let i=0;i<=w.length;i++)for(const c of ABC){if(blockedMove(w,i,c))continue;const n=w.slice(0,i)+c+w.slice(i);if(DICT.has(n)&&!out.includes(n))out.push(n);}return out;}
function kidsC(w){return kids(w).filter(k=>COMMON.has(k));}
function goodWays(w){return kidsC(w).filter(canReach);}
function canReach(w){if(w.length>=PAR)return true;if(reachMemo.has(w))return reachMemo.get(w);reachMemo.set(w,false);const ok=kidsC(w).some(canReach);reachMemo.set(w,ok);return ok;}
function insertAt(a,b){if(b.length!==a.length+1)return -1;for(let i=0;i<=a.length;i++)if(b.slice(0,i)+b.slice(i+1)===a)return i;return -1;}
const dead=()=>!S.done&&!canGrow(cur());
const sick=w=>!canReach(w);
const mark=h=>h.at<0?h.w.toUpperCase():[...h.w].map((c,i)=>i===h.at?`<b>${c.toUpperCase()}</b>`:c.toUpperCase()).join("");
const fmt=d=>d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});

function renderMode(){
  const bar=$("modebar");
  if(isToday()){bar.hidden=true;return;}
  bar.hidden=false;
  if(MODE.kind==="practice")bar.innerHTML=`<span><b>Practice garden</b> · round ${MODE.idx+1}</span><span class="mb-btns"><button class="chipbtn" type="button" id="newSeed">New seed</button><button class="chipbtn" type="button" id="backToday">Today</button></span>`;
  else bar.innerHTML=`<span><b>Archive</b> · No. ${MODE.num} · ${fmt(dateOf(MODE.num))}</span><span class="mb-btns"><button class="chipbtn" type="button" id="backToday">Today</button></span>`;
  $("backToday").onclick=()=>load({kind:"daily",num:TODAY});
  const ns=$("newSeed");if(ns)ns.onclick=newPractice;
}
function newPractice(){const n=(store.get("sproutle-practice-next")||0);store.set("sproutle-practice-next",n+1);closeModal();load({kind:"practice",idx:n});}

function renderPlant(){
  const w=cur(), plant=$("plant");
  const grown=S.hist.length-1, buds=S.end==="bloom"?0:Math.max(0,PAR-w.length);
  const total=Math.max(1,grown+buds);
  const room=Math.max(60,$("scene").clientHeight-42-52-(S.end==="bloom"?60:14));
  const nh=Math.max(12,Math.min(30,Math.floor(room/total)));
  let html=`<div class="pot"><div class="rim"></div><div class="body"><span>${SEED}</span></div></div>`;
  S.hist.slice(1).forEach((h,i)=>{const side=i%2?"l":"r";const top=i===grown-1;
    html+=`<div class="node ${side}${top?" top":""}${top&&fresh?" grow":""}" data-h="${i+1}" style="--nh:${nh}px;--k:${i}"><span class="leaf"></span><span class="chip${armed===i+1?" arm":""}">${armed===i+1?"✂️ Cut here?":mark(h)}</span></div>`;});
  for(let b=0;b<buds;b++)html+=`<div class="node bud${b===0&&!dead()?" nextbud":""}" style="--nh:${nh}px"><span class="budball"></span></div>`;
  if(S.end==="bloom")html+=`<div class="flower${score()===0?" over":""}">${Array.from({length:6},(_,k)=>`<i style="rotate:${k*60}deg;animation-delay:${k*60}ms"></i>`).join("")}<b></b></div>`;
  plant.innerHTML=html;
  const life=Math.max(0,Math.min(1,(w.length-SEED.length)/(PAR-SEED.length)));
  const sc=$("scene");sc.style.setProperty("--life",life.toFixed(3));
  renderMeadow(grown);
  $("bf1").classList.toggle("on",life>=.3);$("bf2").classList.toggle("on",life>=.6);$("bee").classList.toggle("on",life>=.85||S.end==="bloom");
  sc.classList.toggle("wilt",dead()||S.end==="gave");sc.classList.toggle("done",S.end==="bloom");
  $("dead").hidden=!dead();
}

function render(){
  const w=cur();
  $("num").textContent=MODE.kind==="practice"?"Practice":"No. "+MODE.num;$("par").textContent=PAR;$("len").textContent=w.length;
  $("lives").innerHTML=Array.from({length:MAX_BOUNCES},(_,i)=>`<i class="${i<MAX_BOUNCES-bounces()?"":"gone"}"></i>`).join("");$("lives").setAttribute("aria-label",`${MAX_BOUNCES-bounces()} of ${MAX_BOUNCES} leaves left`);$("hints").textContent=S.hints||0;
  renderPlant();
  const last=S.hist[S.hist.length-1];const locked=S.done||dead();
  const showGap=hintFor===w&&hintStage>=1&&hintMove;
  // today's word, with a glowing marker where a hint says a letter fits
  let html="";
  for(let i=0;i<=w.length;i++){
    if(showGap&&hintMove.at===i)html+=`<span class="hintmark" aria-label="A letter fits here">${hintStage>=2?hintMove.c:"+"}</span>`;
    if(i<w.length)html+=`<span class="t${fresh&&i===last.at?" new":""}" style="--i:${i}">${w[i]}</span>`;
  }
  const box=$("word");box.innerHTML=html;box.classList.toggle("bloom",S.end==="bloom");
  // the row the player types into
  const n=w.length+1, row=$("typed");
  row.hidden=locked;
  row.innerHTML=Array.from({length:n},(_,i)=>`<span class="slot${i<typed.length?" on":""}${i===typed.length?" cursor":""}">${typed[i]||""}</span>`).join("");
  fresh=false;
  $("hint").textContent=S.done?"":typed?"Press Grow when your word is ready.":`Type a ${n}-letter word: ${w.toUpperCase()} plus one letter.`;
  const ways=$("ways");
  if(S.done||locked){ways.hidden=true;}else{const g=goodWays(w).length;ways.hidden=false;ways.innerHTML=`🌱 <b>${g}</b> good way${g===1?"":"s"} to grow`;}
  const hb=$("hintBtn");hb.disabled=locked;hb.textContent=hintFor===w&&hintStage===1?"💡 Show letter":"💡 Hint";
  $("stopBtn").disabled=S.done;
  document.querySelectorAll(".k").forEach(k=>k.disabled=locked);
  const go=document.querySelector(".k.go");if(go)go.classList.toggle("ready",typed.length===n&&!locked);
}

/* ---------- scene life ---------- */
const FCOL=["--bloom","--petal-y","--petal-w","--wing-b","--wing-a"];
let meadowCount=-1;
function renderMeadow(n){
  if(n===meadowCount)return;const m=$("meadow");
  const spots=[[6,10],[88,14],[16,22],[78,6],[26,8],[70,24],[10,30],[92,30],[22,4],[82,20],[4,4],[95,8]];
  let html=[[3,2],[30,3],[64,2],[97,4],[46,0]].map(([x,y])=>`<span class="tuft" style="--x:${x}%;--y:${y}px"></span>`).join("");
  for(let i=0;i<Math.min(n,spots.length);i++){const [x,y]=spots[i];html+=`<span class="fl" style="--x:${x}%;--y:${y}px;--c:var(${FCOL[i%FCOL.length]})"></span>`;}
  m.innerHTML=html;meadowCount=n;
}
const fx=$("fx"),ctx=fx.getContext("2d");let parts=[],running=false;
function sizeFx(){const d=devicePixelRatio||1;fx.width=innerWidth*d;fx.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0);}
addEventListener("resize",sizeFx);sizeFx();
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}
function water(){
  if(REDUCED)return;const pl=$("plant").getBoundingClientRect(),sc=$("scene").getBoundingClientRect();
  const cx=pl.left+pl.width/2;
  for(let i=0;i<16;i++)parts.push({x:cx+(Math.random()-.5)*60,y:sc.top+30+Math.random()*30,vx:(Math.random()-.5)*.6,vy:2+Math.random()*2,r:3.5+Math.random()*2,rot:Math.PI/2,vr:0,c:css("--water"),life:38+Math.random()*12,g:.32,sway:0,t:0});
  if(!running){running=true;requestAnimationFrame(tick);}
  const s=$("scene");s.classList.remove("splash");void s.offsetWidth;s.classList.add("splash");
}
function burst(x,y,n,colors,opts={}){
  if(REDUCED)return;
  for(let i=0;i<n;i++){const a=opts.rain?Math.PI/2+(Math.random()-.5)*.6:Math.random()*Math.PI*2, s=opts.rain?1+Math.random()*2:2+Math.random()*4.5;
    parts.push({x:opts.rain?Math.random()*innerWidth:x,y:opts.rain?-20-Math.random()*innerHeight*.6:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(opts.rain?0:2.5),
      r:opts.size||(5+Math.random()*5),rot:Math.random()*6,vr:(Math.random()-.5)*.3,c:colors[i%colors.length],life:opts.rain?320:70+Math.random()*30,g:opts.rain?.02:.18,sway:opts.rain?Math.random()*6:0,t:0});}
  if(!running){running=true;requestAnimationFrame(tick);}
}
function tick(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  parts=parts.filter(p=>p.t<p.life&&p.y<innerHeight+40);
  for(const p of parts){p.t++;p.vy+=p.g;p.x+=p.vx+Math.sin((p.t+p.sway*10)/18)*(p.sway?.8:0);p.y+=p.vy;p.rot+=p.vr;
    const fade=Math.min(1,(p.life-p.t)/25);ctx.save();ctx.globalAlpha=fade;ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.c;
    ctx.beginPath();ctx.ellipse(0,0,p.r,p.r*.55,0,0,Math.PI*2);ctx.fill();ctx.restore();}
  if(parts.length)requestAnimationFrame(tick);else{running=false;ctx.clearRect(0,0,innerWidth,innerHeight);}
}
function wave(){const w=$("word");w.classList.remove("wave");void w.offsetWidth;w.classList.add("wave");}

/* ---------- input ---------- */
function buildKB(){
  const rows=["qwertyuiop","asdfghjkl","+zxcvbnm-"];
  $("kb").innerHTML=rows.map(r=>`<div class="kr">${[...r].map(c=>c==="+"?`<button class="k wide go" type="button" data-k="enter">💧 GROW</button>`:c==="-"?`<button class="k wide" type="button" data-k="back" aria-label="Delete">⌫</button>`:`<button class="k" type="button" data-k="${c}">${c}</button>`).join("")}</div>`).join("");
  $("kb").addEventListener("click",e=>{const b=e.target.closest(".k");if(b)press(b.dataset.k);});
}
function press(k){
  if(S.done||dead())return;
  if(isToday()&&window.SLB)SLB.start("sproutle",TODAY);
  if(armed>=0){armed=-1;}
  const n=cur().length+1;
  if(k==="enter")return grow();
  if(k==="back"){typed=typed.slice(0,-1);render();return;}
  if(/^[a-z]$/.test(k)){$("typed").classList.remove("warn","bad","shake");if(typed.length>=n){toast(`Your next word has ${n} letters.`,1400);return;}typed+=k;buzz(5);render();}
}
let tt;function toast(m,ms=2100,kind=""){const t=$("toast");t.textContent=m;t.className="toast show "+kind;clearTimeout(tt);tt=setTimeout(()=>t.classList.remove("show"),ms);}

const CHEERS=["It's growing!","A fresh leaf!","Reaching for the sun!","Look at it go!","Thriving!","The bees noticed!","Blooming soon!"];
function grow(){
  const w=cur(), n=w.length+1;
  if(typed.length<n){toast(`Type all ${n} letters of your next word.`);return;}
  const nw=typed, at=insertAt(w,nw);
  if(at<0){toast(`Keep ${w.toUpperCase()} in order and add just one letter.`,2400);shakeRow();return;}
  if(blockedMove(w,at,nw[at])){buzz(20);shakeRow("warn");toast(`No adding ${nw[at].toUpperCase()} to the end. Try somewhere else.`,2400);return;}
  if(DICT.has(nw)&&!canReach(nw)){
    if(S.tried.includes(nw)){toast(nw.toUpperCase()+" won't grow tall enough. You already tried it.");return;}
    S.tried.push(nw);S.wilts=(S.wilts||0)+1;S.log.push("y");buzz([30,40,30]);typed="";
    shakeRow("warn");dropLeaf();
    if(bounces()>=MAX_BOUNCES){save();render();setTimeout(()=>finish("wilted"),500);return;}
    toast(`${nw.toUpperCase()} is a word, but it won't grow tall enough. +1`,2600);save();render();return;
  }
  if(DICT.has(nw)){
    S.hist.push({w:nw,at});S.log.push("g");typed="";fresh=true;hintFor="";hintStage=0;hintMove=null;buzz(15);
    if(nw.length>=PAR){S.done=true;S.end="bloom";record();}
    save();render();water();
    const tile=$("word").querySelectorAll(".t")[at];
    if(tile){const r=tile.getBoundingClientRect();burst(r.left+r.width/2,r.top+r.height/2,18,[css("--leaf"),css("--leaf-deep"),css("--hill-a")]);}
    if(S.end==="bloom"){bloom();return;}
    toast(PAR-nw.length===1?"One more letter to bloom!":CHEERS[S.hist.length%CHEERS.length],1400,"good");
    return;
  }
  // like Wordle: a word that isn't real just shakes, costs nothing, and stays so you can fix it
  buzz(20);shakeRow("warn");toast("Not in word list",1400);
}
function shakeRow(kind){const box=$("typed");box.classList.remove("shake","warn","bad");void box.offsetWidth;box.classList.add("shake");if(kind)box.classList.add(kind);}
function dropLeaf(){
  if(REDUCED)return;const icons=$("lives").querySelectorAll("i");const src=icons[MAX_BOUNCES-bounces()];if(!src)return;
  const r=src.getBoundingClientRect();const el=document.createElement("div");el.className="falling";
  el.style.left=r.left+"px";el.style.top=r.top+"px";document.body.appendChild(el);
  el.animate([{transform:"translate(0,0) rotate(0)",opacity:1},{transform:"translate(-24px,110px) rotate(-120deg)",opacity:.9,offset:.5},{transform:"translate(18px,260px) rotate(-260deg)",opacity:0}],{duration:1300,easing:"ease-in"}).onfinish=()=>el.remove();
}
function finish(end){if(S.done)return;S.done=true;S.end=end;typed="";record();save();render();
  toast(end==="wilted"?"Out of leaves. The plant wilted.":"",1800);setTimeout(showResults,1300);}
function findHint(){
  const w=cur();
  const onPath=PATH.indexOf(w);
  if(onPath>=0&&onPath<PATH.length-1){const nx=PATH[onPath+1];return{w:nx,at:insertAt(w,nx),c:nx[insertAt(w,nx)]};}
  const good=goodWays(w);
  if(!good.length)return null;
  const nx=good[0];return{w:nx,at:insertAt(w,nx),c:nx[insertAt(w,nx)]};
}
function hint(){
  if(S.done||dead())return;
  const w=cur();
  if(hintFor!==w){hintFor=w;hintStage=0;hintMove=findHint();}
  if(!hintMove)return;
  if(hintStage>=2){toast(`Type ${hintMove.w.toUpperCase()} and press Grow.`,2000);return;}
  hintStage++;S.hints=(S.hints||0)+1;S.log.push("h");buzz(10);
  if(hintStage===2)typed="";
  save();render();
  toast(hintStage===1?"A letter fits where the glow is. +1":`The letter is ${hintMove.c.toUpperCase()}. +1`,2000,"good");
}
function pruneTo(h){
  if(S.done||h<0||h>=S.hist.length-1)return;
  $("plant").querySelectorAll(".node[data-h]").forEach(n=>{if(+n.dataset.h>h)n.classList.add("cut");});
  buzz(25);
  setTimeout(()=>{
    const removed=S.hist.length-1-h;
    S.hist=S.hist.slice(0,h+1);S.snips++;S.log.push("s");typed="";armed=-1;hintFor="";hintStage=0;hintMove=null;save();render();
    toast(`Pruned back to ${cur().toUpperCase()}${removed>1?` (${removed} leaves)`:""}. +1 cut.`,1800);
  },REDUCED?0:380);
}
function chipTap(h){
  if(S.done)return;
  if(armed===h){pruneTo(h);return;}
  armed=h;render();setTimeout(()=>{if(armed===h){armed=-1;render();}},3000);
}
function bloom(){
  wave();
  burst(innerWidth/2,innerHeight*.3,score()===0?150:110,[css("--bloom"),css("--bloom-deep"),css("--petal-y"),"#ffffff"],{rain:true,size:7});
  toast(score()===0?"Perfect bloom! No cuts, no misses.":"Full bloom!",2400,"pink");
  setTimeout(showResults,1700);
}
function record(){
  if(!isToday())return;
  if(window.SLB)SLB.stop("sproutle",TODAY);
  const st=store.get(STATS)||{played:0,blooms:0,perfect:0,streak:0,max:0,last:0,dist:[0,0,0,0,0,0]};
  if(st.rec===TODAY)return;
  st.played++;
  if(S.end==="bloom"){st.blooms++;if(score()===0)st.perfect++;st.dist[Math.min(4,score())]++;st.streak=st.last===TODAY-1?st.streak+1:1;st.last=TODAY;st.max=Math.max(st.max,st.streak);}
  else{st.dist[5]++;st.streak=0;}
  st.rec=TODAY;store.set(STATS,st);
}
function giveUp(){S.done=true;S.end="gave";typed="";record();save();render();toast("Here's how it could grow.",1600);setTimeout(showResults,900);}
const label=()=>S.end!=="bloom"?"Wilted":score()===0?"Perfect bloom":"Full bloom";
function trail(){return "🌱"+S.log.map(c=>c==="g"?"🟩":c==="x"?"🟥":c==="y"?"🟨":c==="h"?"💡":"✂️").join("")+(S.end==="bloom"?"🌸":"🥀");}
function shareText(){
  const res=S.end!=="bloom"?"🥀 wilted":score()===0?"🌸 Perfect!":`🌸 +${score()}`;
  return `Sproutle No. ${MODE.num} · ${PAR} letters · ${res}\n${trail()}`;
}

/* ---------- modals ---------- */
function openModal(html){$("modal").innerHTML='<button class="close" type="button" aria-label="Close">×</button>'+html;$("scrim").hidden=false;$("modal").querySelector(".close").onclick=closeModal;}
function closeModal(){$("scrim").hidden=true;clearInterval(cd);}
$("scrim").addEventListener("click",e=>{if(e.target.id==="scrim")closeModal();});

function help(){
  openModal(`<h2>How to play Sproutle</h2>
  <div class="demo"><span>ORE</span><span class="arrow">→</span><span><b>C</b>ORE</span><span class="arrow">→</span><span><b>S</b>CORE</span><span class="arrow">→</span><span>SCORE<b>D</b></span><span class="arrow">→</span><span>SCO<b>U</b>RED</span></div>
  <ol class="steps">
   <li><b class="n">1</b><span>Type a new word that's today's word plus one letter, added anywhere. You can't rearrange the letters, and every word must be real.</span></li>
   <li><b class="n">2</b><span>Grow it to the target length. Each bud on the stem is one letter to go. No easy endings: you can't add S, D, R or Y to the end of a word.</span></li>
   <li><b class="n">3</b><span>Every word must still be able to grow to the target. A real word that can't bounces back 🟨 and costs one of your 5 leaves. A made-up word just shakes, with no penalty.</span></li>
   <li><b class="n">4</b><span>Stuck? Tap Hint to see where a letter fits, then tap again to see the letter. Every hint and bounce adds 1 to your score. A perfect bloom is zero.</span></li>
  </ol>
  <p>Everyone gets the same seed. A new one sprouts every day at midnight. Missed a day? Open the Archive.</p>
  <button class="btn primary" type="button" id="goBtn">Start growing</button>
  <p class="note" style="text-align:center"><a href="/about">About Sproutle</a> · <a href="/">All games</a> · <a href="/privacy">Privacy</a></p>`);
  $("goBtn").onclick=closeModal;
}

function dayStatus(n){const s=store.get("sproutle-day-"+n);if(!s)return{c:"",t:""};
  if(s.end==="bloom"){const sc=(s.snips||0)+s.misses+(s.wilts||0)+(s.hints||0);return{c:"won",t:sc===0?"🌸 Perfect":"🌸 +"+sc};}
  if(s.end==="gave")return{c:"lost",t:"🥀"};
  return s.hist.length>1||s.log.length?{c:"prog",t:"Growing"}:{c:"",t:""};}
const unlocked=n=>!PLUS_ENABLED||n===TODAY||isPlus()||TODAY-n<=FREE_ARCHIVE_DAYS;

function archive(){
  const plus=isPlus();
  let cells="";
  for(let n=TODAY;n>=1;n--){const st=dayStatus(n),open=unlocked(n),d=dateOf(n);
    cells+=`<button class="day ${st.c}${open?"":" locked"}${MODE.kind==="daily"&&MODE.num===n?" here":""}" type="button" data-n="${n}">
      <span class="dn">No. ${n}</span><span class="dd">${n===TODAY?"Today":fmt(d)}</span><span class="ds">${open?(st.t||"Play"):"🔒 Plus"}</span></button>`;}
  openModal(`<h2>Archive</h2>
    ${!PLUS_ENABLED?"":plus?`<div class="pluscard on"><div><b>Sproutle+ is on</b><span>Full archive and unlimited practice.</span></div><button class="btn primary" type="button" id="pracBtn">Practice garden</button></div>`
      :`<div class="pluscard"><div><b>Sproutle+</b><span>Unlock every past puzzle and unlimited practice seeds.</span></div><button class="btn primary" type="button" id="plusBtn">See plans</button></div>`}
    <p class="note">${PLUS_ENABLED?`The last ${FREE_ARCHIVE_DAYS} days are free for everyone. `:""}Archive plays don't change your streak.</p>
    <div class="days">${cells}</div>`);
  $("modal").querySelectorAll(".day").forEach(b=>b.onclick=()=>{const n=+b.dataset.n;if(!unlocked(n)){paywall();return;}closeModal();load({kind:"daily",num:n});});
  const pb=$("plusBtn");if(pb)pb.onclick=paywall;
  const pr=$("pracBtn");if(pr)pr.onclick=()=>{const sp=store.get("sproutle-practice");closeModal();load({kind:"practice",idx:sp?sp.idx:0});};
}

function paywall(){
  const plus=isPlus();
  openModal(`<div class="plushead"><span class="badge">Sproutle+</span><h2>Grow as much as you like</h2></div>
   <ul class="perks">
    <li><b>🌱</b><span><strong>Unlimited practice garden.</strong> Hundreds of extra seeds, any time.</span></li>
    <li><b>📅</b><span><strong>The full archive.</strong> Every daily puzzle since No. 1.</span></li>
    <li><b>💚</b><span><strong>Keep Sproutle growing.</strong> Your support pays for new puzzles.</span></li>
   </ul>
   <div class="plans">
    <button class="plan" type="button" data-p="year"><span class="pt">Yearly</span><span class="pp">${PRICES.year}</span><span class="ps">Best value</span></button>
    <button class="plan sel" type="button" data-p="month"><span class="pt">Monthly</span><span class="pp">${PRICES.month}</span><span class="ps">Cancel anytime</span></button>
   </div>
   <button class="btn primary wide" type="button" id="subBtn">${plus?"You're a member":"Subscribe"}</button>
   <p class="note">Today's puzzle and the last ${FREE_ARCHIVE_DAYS} days always stay free.</p>
   <div class="testing"><span>Testing only: payments connect when the site launches.</span><button class="link" type="button" id="prevBtn">${plus?"Turn off Sproutle+ preview":"Preview Sproutle+ on this device"}</button></div>`);
  $("modal").querySelectorAll(".plan").forEach(p=>p.onclick=()=>{$("modal").querySelectorAll(".plan").forEach(q=>q.classList.toggle("sel",q===p));});
  $("subBtn").onclick=()=>{if(plus)return;toast("Payments aren't connected yet. They go live with the website.",2600);};
  $("prevBtn").onclick=()=>{store.set("sproutle-plus",!plus);toast(!plus?"Sproutle+ preview is on.":"Sproutle+ preview is off.",1800,"good");
    if(plus&&(MODE.kind==="practice"||!unlocked(MODE.num)))load({kind:"daily",num:TODAY});
    archive();};
}

let cd;
function showResults(){
  const st=store.get(STATS)||{played:0,blooms:0,perfect:0,streak:0,max:0,dist:[0,0,0,0,0,0]};
  const maxD=Math.max(1,...st.dist);
  const names=["Perfect","+1","+2","+3","+4 or more","Wilted"];
  const mine=S.end==="bloom"?Math.min(4,score()):5;
  const rows=names.map((nm,k)=>`<div class="drow${S.done&&isToday()&&mine===k?" cur":""}"><span>${nm}</span><div style="width:${Math.max(8,st.dist[k]/maxD*100)}%">${st.dist[k]}</div></div>`).join("");
  const yours=S.hist.map(h=>h.w.toUpperCase()).join(" → ");
  const sub=S.end==="bloom"?(score()===0?"No bounces, no hints":[S.wilts?`${S.wilts} 🟨 dead-end word${S.wilts===1?"":"s"}`:"",S.misses?`${S.misses} 🟥 non-word${S.misses===1?"":"s"}`:"",S.hints?`${S.hints} hint${S.hints===1?"":"s"}`:""].filter(Boolean).join(" · ")+` · score +${score()}`):`Stopped at ${cur().length} of ${PAR} letters`;
  const where=MODE.kind==="practice"?"Practice garden":isToday()?"":`Archive · No. ${MODE.num}`;
  const actions=MODE.kind==="practice"
    ?`<button class="btn" type="button" id="todayBtn">Today's puzzle</button><button class="btn primary" type="button" id="moreBtn">New seed</button>`
    :`<button class="btn" type="button" id="moreBtn">Play more</button><button class="btn primary" type="button" id="shareBtn">Share</button>`;
  openModal(`${S.done?`${where?`<p class="where">${where}</p>`:""}<div class="big${S.end==="bloom"&&score()===0?" over":""}">${label()}<small>${sub}</small></div>
   <div class="trail" aria-label="Your growth">${trail()}</div>
   ${isToday()?`<div id="slbMount" style="margin:14px 0"></div>`:""}
   <div class="path"><h3>Your sprout</h3><p>${yours}</p></div>
   <div class="path"><h3>A perfect path</h3><p>${PATH.map(x=>x.toUpperCase()).join(" → ")}</p><small>${PERFECT===1?"This was the only path with everyday words.":`There are ${PERFECT} paths with everyday words.`}</small></div>`:"<h2>Statistics</h2>"}
   <div class="stats"><div><b>${st.played}</b><span>Played</span></div><div><b>${st.played?Math.round((st.perfect||0)/st.played*100):0}</b><span>Perfect %</span></div><div><b>${st.streak}</b><span>Streak</span></div><div><b>${st.max}</b><span>Best streak</span></div></div>
   <h3>Daily scores</h3><div class="dist">${rows}</div>
   <div class="next"><div><h3 style="margin:0">Next seed</h3><b id="cd">--:--:--</b></div>${S.done?`<div class="acts">${actions}</div>`:""}</div>
   <a class="promo" href="/critter-collector/"><img src="/critter-collector/icon-192.png" alt=""><span><small>${S.done?"While you wait for tomorrow":"Try our other game"}</small><b>Critter Collector</b><em>Merge animals and build an endless zoo</em></span><i>Play</i></a>
   <p class="morelink"><a href="/">See all games</a></p>`);
  const tick2=()=>{const n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1),s=Math.max(0,Math.floor((t-n)/1000));
    const el=$("cd");if(el)el.textContent=[s/3600,s%3600/60,s%60].map(x=>String(Math.floor(x)).padStart(2,"0")).join(":");};
  tick2();clearInterval(cd);cd=setInterval(tick2,1000);
  if(window.SLB&&$("slbMount"))SLB.mount($("slbMount"),{game:"sproutle",day:TODAY,score:score(),eligible:S.end==="bloom",fmt:n=>n===0?"Perfect":"+"+n,note:"Lowest score wins. Ties go to the fastest grower.",accent:"var(--leaf-deep)",accentInk:"#fff"});
  const mb=$("moreBtn");if(mb)mb.onclick=MODE.kind==="practice"?newPractice:archive;
  const tb=$("todayBtn");if(tb)tb.onclick=()=>{closeModal();load({kind:"daily",num:TODAY});};
  const sb=$("shareBtn");if(sb)sb.onclick=()=>{const txt=shareText();
    const fb=()=>{let box=$("modal").querySelector(".sharebox");if(!box){box=document.createElement("div");box.className="sharebox";$("modal").appendChild(box);}
      box.textContent=txt;const rg=document.createRange();rg.selectNodeContents(box);const sl=getSelection();sl.removeAllRanges();sl.addRange(rg);toast("Selected. Copy it to share.");};
    try{navigator.clipboard.writeText(txt).then(()=>toast("Copied to clipboard",1800,"good"),fb);}catch(e){fb();}};
}

document.addEventListener("keydown",e=>{
  if(!$("scrim").hidden){if(e.key==="Escape")closeModal();return;}
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  const k=e.key==="Enter"?"enter":e.key==="Backspace"?"back":e.key.length===1?e.key.toLowerCase():null;
  if(k&&(k.length>1||/[a-z]/.test(k))){e.preventDefault();press(k);}
});
$("hintBtn").onclick=hint;
$("stopBtn").onclick=()=>{if(S.done)return;const b=$("stopBtn");
  if(b.dataset.arm){delete b.dataset.arm;giveUp();}
  else{b.dataset.arm=1;b.textContent="Tap again to give up";setTimeout(()=>{delete b.dataset.arm;b.textContent="Give up";},3000);}};
$("archiveBtn").onclick=archive;$("helpBtn").onclick=help;$("statsBtn").onclick=showResults;$("plusHdr").onclick=paywall;if(!PLUS_ENABLED)$("plusHdr").hidden=true;

/* one-time move: launch-day results saved as No. 1 now belong to No. 31 */
(function(){if(store.get("sproutle-mig30"))return;
  const old=store.get("sproutle-day-1");
  if(old&&old.hist&&old.hist[0].w==="star"){store.set("sproutle-day-31",old);try{localStorage.removeItem("sproutle-day-1");}catch(e){}}
  const st=store.get(STATS);if(st){if(st.rec===1)st.rec=31;if(st.last===1)st.last=31;store.set(STATS,st);}
  store.set("sproutle-mig30",1);})();
addEventListener("resize",()=>{if(S)renderPlant();});
buildKB();load({kind:"daily",num:TODAY});
if(!store.get("sproutle-seen")){store.set("sproutle-seen",1);help();}
else if(S.done)setTimeout(showResults,300);
