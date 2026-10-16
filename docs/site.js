(function(){var C={"ads": "", "goat": "sproutle", "friend": "sproutfam", "noAds": ["/animalmatch/", "/bugsquish/", "/superrescue/"], "v": "202610160103"};
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
// Share buttons: open the phone's share sheet (Messages, WhatsApp, etc.). If there isn't one, or it fails, copy instead.
// In-app browsers (links opened inside Instagram, Facebook, the Claude app...) often have no share sheet,
// so those get our own: Messages, WhatsApp, Email and Copy.
window.psShareThen=function(text,copy){
  if(navigator.share){
    try{ navigator.share({text:text}).catch(function(e){ if(!e||e.name!=="AbortError") sheet(text,copy); }); return; }catch(e){}
  }
  sheet(text,copy);
};
function sheet(text,copy){
  var old=document.getElementById("ps-sheet"); if(old) old.remove();
  var e=encodeURIComponent(text), ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  var opts=[["💬","Messages",(ios?"sms:&body=":"sms:?body=")+e],["🟢","WhatsApp","https://wa.me/?text="+e],["✉️","Email","mailto:?body="+e],["📋","Copy",null]];
  var sc=document.createElement("div"); sc.id="ps-sheet";
  sc.style.cssText="position:fixed;inset:0;z-index:2147483646;background:rgba(10,12,20,.55);display:flex;align-items:flex-end;justify-content:center";
  var box=document.createElement("div");
  box.style.cssText="width:100%;max-width:460px;background:#fff;color:#1d2433;border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));font:600 15px/1.3 system-ui,-apple-system,sans-serif;box-shadow:0 -10px 30px rgba(0,0,0,.25)";
  box.innerHTML='<div style="font-weight:800;font-size:17px;margin:0 4px 14px">Share</div>';
  var row=document.createElement("div"); row.style.cssText="display:grid;grid-template-columns:repeat(4,1fr);gap:8px";
  opts.forEach(function(o){
    var a=document.createElement(o[2]?"a":"button"); if(o[2]){ a.href=o[2]; if(o[1]==="WhatsApp"){ a.target="_blank"; a.rel="noopener"; } }
    a.style.cssText="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:none;border-radius:14px;background:#f1f3f7;color:inherit;text-decoration:none;font:inherit;font-size:13px;cursor:pointer";
    a.innerHTML='<span style="font-size:28px;line-height:1">'+o[0]+'</span>'+o[1];
    a.addEventListener("click",function(){ setTimeout(function(){ sc.remove(); },50); if(!o[2]) copy(); });
    row.appendChild(a);
  });
  var cancel=document.createElement("button"); cancel.textContent="Cancel";
  cancel.style.cssText="margin-top:12px;width:100%;height:46px;border:none;border-radius:12px;background:#e6e9f0;color:inherit;font:inherit;font-weight:700;cursor:pointer";
  cancel.onclick=function(){ sc.remove(); };
  box.appendChild(row); box.appendChild(cancel); sc.appendChild(box);
  sc.addEventListener("click",function(ev){ if(ev.target===sc) sc.remove(); });
  document.body.appendChild(sc);
}
window.psSite={adFree:adFree};
function toast(t){var d=document.createElement("div");d.textContent=t;
  d.style.cssText="position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;background:#1f7a3a;color:#fff;font:600 15px/1.3 system-ui,sans-serif;padding:10px 18px;border-radius:999px;width:max-content;box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90vw;text-align:center";
  document.body.appendChild(d);setTimeout(function(){d.style.transition="opacity .4s";d.style.opacity="0"},2600);setTimeout(function(){d.remove()},3100);}
function add(src,attrs){var s=document.createElement("script");s.async=true;s.src=src;for(var a in attrs)s.setAttribute(a,attrs[a]);document.head.appendChild(s);}
function go(){
  if(msg)toast(msg);
  if(C.goat)add("https://gc.zgo.at/count.js",{"data-goatcounter":"https://"+C.goat+".goatcounter.com/count"});
  var kids=C.noAds.some(function(p){return location.pathname.indexOf(p)===0})||location.pathname.indexOf("/live-admin")===0;
  if(location.pathname.indexOf("/live-admin")!==0)add("/live.js?v="+C.v,{});
  if(C.ads&&!adFree&&!kids)add("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+C.ads,{crossorigin:"anonymous"});
}
if(document.body)go();else document.addEventListener("DOMContentLoaded",go);
})();
