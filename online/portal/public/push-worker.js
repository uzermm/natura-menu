self.addEventListener('push', event => {
 const message = event.data?.json();
 if (!message) return;
 event.waitUntil(self.registration.showNotification(message.title, {
  body:message.body, tag:message.tag, icon:new URL('../icons/naturapp-192.png',self.registration.scope).href,
  data:{orderId:message.tag},
  actions:message.accept ? [{action:'accept', title:'Kabul et'}] : []
 }));
});

self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil(handleNotificationClick(event.action, event.notification.data?.orderId));
});

async function handleNotificationClick(action, orderId) {
 if (action === 'accept' && orderId) {
  try {
   const response = await fetch('/api/orders/' + encodeURIComponent(orderId) + '/actions', {
    method:'POST',
    credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-Panel-Request':'1'},
    body:JSON.stringify({action:'accept'})
   });
   if (response.ok) {
    const result = await response.json();
    if (result.ok && !result.pending) return;
   }
  } catch {
   // Open the portal so the operator can check the latest order status.
  }
 }
 const target=new URL('/?section=onlineOrders',self.location.origin).href;
 for(const client of await clients.matchAll({type:'window',includeUncontrolled:true})){const url=new URL(client.url);if(url.origin===self.location.origin&&(url.pathname==='/'||url.pathname.startsWith('/admin'))){await client.navigate(target);await client.focus();return;}}
 await clients.openWindow(target);
}
