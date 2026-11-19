export function setupPhoneNotifications(button, api, toast) {
 if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
 const registration = navigator.serviceWorker.register('/push-worker.js')
  .then(async worker => {if(!worker.active)await new Promise(resolve=>{const timer=setInterval(()=>{if(worker.active){clearInterval(timer);resolve();}},100);});return worker;});
 let enabled = false;
 const update = () => {
  button.textContent = enabled ? 'Telefon bildirimlerini kapat' : 'Telefon bildirimlerini aç';
  button.setAttribute('aria-pressed', String(enabled));
 };
 registration.then(async worker => {
  enabled = Boolean(await worker.pushManager.getSubscription());
  update();
  button.hidden = false;
 }).catch(() => {});
 button.onclick = async () => {
  button.disabled = true;
  try {
   if (!enabled && await Notification.requestPermission() !== 'granted') {
    toast('Telefon bildirimleri için cihaz ayarlarından izin verin.');
    return;
   }
   const worker = await registration;
   let subscription = await worker.pushManager.getSubscription();
   if (enabled && subscription) {
    await api('/api/push','DELETE',{endpoint:subscription.endpoint});
    await subscription.unsubscribe();
    enabled = false;
   } else {
    const {publicKey} = await api('/api/push');
    subscription ||= await worker.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:publicKey});
    try {
     await api('/api/push','POST',subscription.toJSON());
    } catch (error) {
     await subscription.unsubscribe();
     throw error;
    }
    enabled = true;
   }
   update();
   toast(enabled ? 'Telefon bildirimleri açıldı.' : 'Telefon bildirimleri kapatıldı.');
  } catch (error) {
   toast(error.message || 'Bildirim ayarı değiştirilemedi.');
  } finally {
   button.disabled = false;
  }
 };
}
