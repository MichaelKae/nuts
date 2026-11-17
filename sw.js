/* Nuts · service worker: сначала сеть (всегда свежая версия), офлайн — из кэша. © MichaelKae, CC BY-NC 4.0 */
const V='4.19';
const C='nuts-'+V,VOICE='nuts-voice';
const CORE=['./','index.html','css/style.css?v='+V,'js/net.js?v='+V,'js/app.js?v='+V,'js/remote.js?v='+V,'firebase-config.js','voice/manifest.js','lib/qrcode.js','manifest.webmanifest','icons/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(CORE.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('nuts-')&&k!==C&&k!==VOICE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;let u;try{u=new URL(r.url);}catch(x){return;}if(u.origin!==location.origin)return;
  if(/\/voice\/.+\.mp3$/.test(u.pathname)){e.respondWith(caches.open(VOICE).then(c=>c.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok)c.put(r,res.clone());return res;}))));return;}
  const nav=r.mode==='navigate';
  e.respondWith(fetch(nav?new Request(r,{cache:'no-cache'}):r).then(res=>{if(res.ok&&res.type==='basic'){const cl=res.clone();caches.open(C).then(c=>c.put(nav?'index.html':r,cl));}return res;})
    .catch(()=>caches.match(nav?'index.html':r).then(m=>m||caches.match(r,{ignoreSearch:true})).then(m=>m||(nav?caches.match('./'):undefined)).then(m=>m||Response.error())));});
