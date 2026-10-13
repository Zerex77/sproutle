// Sproutle offline support. The version changes on every build so players get updates.
const CACHE="sproutle-202610131649";
const SHELL=["/","/sproutle/","/about","/privacy","/manifest.webmanifest","/icon-192.png","/icon-512.png","/favicon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener("fetch",e=>{
  const r=e.request; if(r.method!=="GET")return;
  const url=new URL(r.url);
  if(url.origin===location.origin&&r.mode==="navigate"){
    e.respondWith(fetch(r).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));return res;}).catch(()=>caches.match(r).then(m=>m||caches.match("/"))));return;}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok&&(url.origin===location.origin||url.host.endsWith("gstatic.com")||url.host.endsWith("googleapis.com"))){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy));}return res;})));
});
