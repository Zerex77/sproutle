(function(){var C={"ads": "", "goat": "sproutle", "friend": "sproutfam", "noAds": ["/animalmatch/", "/bugsquish/", "/superrescue/"], "v": "202610151153"};
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
  var kids=C.noAds.some(function(p){return location.pathname.indexOf(p)===0})||location.pathname.indexOf("/live-admin")===0;
  if(location.pathname.indexOf("/live-admin")!==0)add("/live.js?v="+C.v,{});
  if(C.ads&&!adFree&&!kids)add("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+C.ads,{crossorigin:"anonymous"});
}
if(document.body)go();else document.addEventListener("DOMContentLoaded",go);
})();
