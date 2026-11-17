// Financial data stays on the server: no response cache and no offline writes.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode==='navigate')event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="tr"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Bağlantı yok | Natura</title><body style="font-family:system-ui;background:#f6f7f3;padding:32px;color:#244b39"><h1>İnternet bağlantısı yok</h1><p>Sipariş ve ödeme işlemleri için bağlantınızı kontrol edin.</p><button onclick="location.reload()" style="padding:14px;border-radius:12px">Tekrar dene</button></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}})));
});
