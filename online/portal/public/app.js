import {createPrintJournal,printStatus} from './print-journal.js';
import {setupPhoneNotifications} from './phone-notifications.js';
import {patchHTML} from './dom-update.js';
import {productPricing,orderTotals} from './product-pricing.js';
import {createReviewsView} from './reviews-ui.js';
import {inPeriod,restaurantGroups,summarize,summarizeDiscounts} from './summary.js';
import {createOrderNotifier,playOrderBell,createSoundController} from './notifications.js';
import {orderTiming,accountHealth,PREPARATION_WARNING_MINUTES} from './operations.js';
const $=s=>document.querySelector(s);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n===null?'Tutar belirtilmedi':new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:2}).format(n);
const date=n=>n?new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'}).format(Number(n)):'Saat belirtilmedi';
const day=n=>n?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(Number(n)):'';
const labels={Created:'Yeni sipariş',Picking:'Hazırlanıyor',Invoiced:'Hazır',Shipped:'Yolda',Delivered:'Teslim edildi',Cancelled:'İptal edildi',UnSupplied:'Tedarik edilemedi',Unknown:'Bilinmeyen durum'};
const active=o=>['Created','Picking','Invoiced','Shipped'].includes(o.status);
let state={accounts:[],orders:[],interval:15},tab='active',view='orders',connected=false;
let workspaceVisible=true;
const newOrders=createOrderNotifier();
const localOrderActions=new Set();
const highlights=new Map();
const discountCarouselQuery=matchMedia('(max-width:1100px)');let discountCardIndex=0;
const mobileQuery=matchMedia('(max-width:700px)');
let summaryInitialized=false;let summaryIndex=0;
function ring(){if(sound.ready)void playOrderBell(sound.context).catch(()=>toast('Sipariş zili çalınamadı.'));}
function soundUI(){const ready=sound.ready,pending=sound.enabled&&!ready;$('#soundMenuLabel').classList.toggle('sound-is-off',!ready);$('#soundButton').textContent=sound.enabled?'♫ Sesi kapat':'♫ Sesi aç';$('#soundButton').setAttribute('aria-pressed',String(sound.enabled));const label=ready?'Sipariş sesi açık':pending?'Sipariş sesini etkinleştirmek için dokunun':'Sipariş sesi kapalı';const menuLabel=$('#soundMenuLabel');menuLabel.setAttribute('aria-label',label);menuLabel.title=label;$('#soundBellSlash').setAttribute('visibility',ready?'hidden':'visible');$('#testSoundButton').hidden=!ready;$('#soundStatus').textContent=ready?'Ses açık':pending?'Ses açık olarak ayarlı; tarayıcı etkinleştirmesi bekleniyor.':'Ses kapalı';}
const sound=createSoundController({onChange:soundUI});
async function enableSound(){return sound.enable();}
async function playNotification(){if(sound.ready)ring();}
async function alertOrders(fresh){
 if(!fresh.length)return;for(const o of fresh)highlights.set(o.id,Date.now()+90000);
 toast(fresh.length===1?'Yeni Trendyol Go siparişi geldi.':fresh.length+' yeni Trendyol Go siparişi geldi.');
 if(!sound.ready)return;
 const emit=()=>{let claimed=false;try{const cache=JSON.parse(localStorage.getItem('bm-alerted')||'{}');for(const o of fresh)if(!cache[o.id]){cache[o.id]=Date.now();claimed=true;}const entries=Object.entries(cache).filter(([,at])=>Date.now()-at<86400000).slice(-1000);localStorage.setItem('bm-alerted',JSON.stringify(Object.fromEntries(entries)));}catch{claimed=true;}if(claimed)void playNotification();};
 if(navigator.locks)await navigator.locks.request('bulut-order-sound',emit);else emit();
}
let currentStateRequest;
async function api(url,method='GET',body,retry=0){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),method==='GET'?15000:30000);if(url==='/api/state')currentStateRequest=controller;try{const r=await fetch(url,{method,headers:{'Content-Type':'application/json','X-Panel-Request':'1'},body:body?JSON.stringify(body):undefined,signal:controller.signal});const data=await r.json();if(r.status===409&&retry<5&&((method==='GET'&&url==='/api/reviews')||(method==='POST'&&url==='/api/reviews/sync'))){await new Promise(resolve=>setTimeout(resolve,1000));return api(url,method,body,retry+1);}if(r.status===401){parent.postMessage({type:'online:login'},location.origin);throw Error('Oturum sona erdi.');}if(!r.ok)throw Error(data.error||'İşlem tamamlanamadı.');return data;}catch(error){if(controller.signal.aborted)throw Error(method==='GET'?'Bağlantı yeniden kuruluyor.':'İşlemin sonucu doğrulanamadı. Güncel durumu kontrol edin.');throw error;}finally{clearTimeout(timer);if(currentStateRequest===controller)currentStateRequest=null;}}
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,6000);}
const statusIcons={
 Created:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M12 2V1"/>',
 Picking:'<path d="M4 12h16l-1 8H5l-1-8ZM2 12h20M9 8c-3-3 3-3 0-6M15 8c-3-3 3-3 0-6"/>',
 Invoiced:'<path d="m3 7 9-4 9 4v13H3V7Zm0 0 9 4 9-4M12 11v9m-5-5 2 2 4-4"/>',
 Shipped:'<circle cx="5" cy="17" r="4"/><circle cx="19" cy="17" r="4"/><path d="m5 17 5-8h5l4 8M10 9l4 8H5M14 5h3l2 8M7 8h4M14 17h1"/>',
 Delivered:'<circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/>',
 Cancelled:'<circle cx="12" cy="12" r="9"/><path d="m8 8 8 8m0-8-8 8"/>',
 UnSupplied:'<path d="m12 3 10 18H2L12 3ZM12 9v4m0 4h.01"/>',
 Unknown:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>'
};
function badge(status){const key=Object.hasOwn(labels,status)?status:'Unknown';return `<span class="badge order-status ${key}"><svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${statusIcons[key]}</svg><span>${escape(labels[status]||status)}</span></span>`;}
function itemPrice(item){
 const unit=Number(item.unitPrice);
 if(item.unitPrice==null||!Number.isFinite(unit))return '<span class="product-pricing">Fiyat paylaşılmadı</span>';
 const quantity=item.quantity;
 if(!Number.isInteger(quantity)||quantity<0)return `<span class="product-pricing"><strong>${money(unit)}</strong><small>Birim fiyat</small></span>`;
 const total=Math.round(unit*100)*quantity/100;
 return `<span class="product-pricing"><strong>${money(total)}</strong>${quantity>1?`<small>${quantity} × ${money(unit)}</small>`:quantity===0?'<small>İptal edilen ürün</small>':''}</span>`;
}
function mainItemPrice(item){const pricing=productPricing(item);return itemPrice({...item,unitPrice:pricing.displayUnitPrice})+(!pricing.split&&pricing.hasPaidModifiers?'<small class="modifier-included-note">Seçenekler dahil</small>':'');}
function modifierPrices(item){const pricing=productPricing(item);if(!pricing.modifiers.length)return item.options?.length?'<div class="modifier-fallback">'+escape(item.options.join(' · '))+'</div>':'';return '<div class="modifier-list">'+pricing.modifiers.map(mod=>'<div class="modifier-row modifier-depth-'+Math.min(3,mod.depth||0)+'"><span><span aria-hidden="true">↳</span> '+escape(mod.name)+'</span><strong>'+(mod.total===null?'Fiyat paylaşılmadı':mod.unitPrice===0?'Dahil':(pricing.split?'+ ':'')+money(mod.total))+(mod.total!==null&&pricing.quantity===null?'<small> / adet</small>':'')+'</strong></div>').join('')+'</div>';}
function paymentVisual(label){
 const n=String(label||'').toLowerCase();
 const brand=n.includes('setcard')?'setcard':n.includes('pluxee')||n.includes('sodexo')?'pluxee':n.includes('multinet')?'multinet':n.includes('edenred')||n.includes('ticket restaurant')?'edenred':null;
 const icon=brand?`<img src="/payments/${brand}.svg?v=2" alt="${brand} logosu" class="payment-logo payment-${brand}" width="58" height="25">`:n.includes('nakit')?'<svg class="payment-symbol" viewBox="0 0 24 24" width="24" height="24" aria-label="Nakit" role="img" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 9v6m14-6v6"/></svg>':'<svg class="credit-card-icon" viewBox="0 0 48 34" width="42" height="30" role="img" aria-label="Kredi kartı"><rect x="1" y="1" width="46" height="32" rx="6" fill="#244b83"/><path d="M7 1h34a6 6 0 0 1 6 6v5H1V7a6 6 0 0 1 6-6Z" fill="#3364a4"/><path d="M1 10h46v6H1z" fill="#142d50"/><rect x="7" y="20" width="10" height="7" rx="1.7" fill="#efcd78"/><path d="M10.5 20v7m3-7v7M7 23.5h10" stroke="#c09540" stroke-width=".7"/><path d="M22 22h9m-9 4h5" stroke="#dbe9ff" stroke-width="2" stroke-linecap="round"/><path d="M36 21a5 5 0 0 1 0 7m3-9a8 8 0 0 1 0 11" stroke="#dbe9ff" stroke-width="1.5" stroke-linecap="round" fill="none"/><rect x="1" y="1" width="46" height="32" rx="6" fill="none" stroke="#18385f"/></svg>';
 const mode=n.includes('kapıda')?'Kapıda':n.includes('online')?'Online':brand?'Tür belirtilmedi':label||'Ödeme bilgisi paylaşılmadı';
 return `<span class="payment-identity" title="${escape(label||'Ödeme bilgisi paylaşılmadı')}">${icon}<span>${escape(mode)}</span></span>`;
}
function paymentRow(p){const n=String(p.label||'').toLowerCase();const brand=n.includes('setcard')?'setcard':n.includes('pluxee')||n.includes('sodexo')?'pluxee':n.includes('multinet')?'multinet':n.includes('edenred')||n.includes('ticket restaurant')?'edenred':n.includes('nakit')?'cash':'card';return `<div class="payment-row pay-${brand}">${paymentVisual(p.label)}<span class="payment-count" title="Sipariş sayısı" aria-label="${p.count} sipariş">${p.count}</span><strong class="payment-amount">${money(p.total)}</strong></div>`;}
function identity(name){
 const n=String(name).toLocaleLowerCase('tr').replace(/ı/g,'i');
 const brand=n.includes('dürüm')||n.includes('durum')?'durum':n.includes('fastfood')||n.includes('fast food')?'fastfood':n.includes('beyo')?'beyoglu':null;
 return {brand:brand||'other',logo:brand?`<img class="restaurant-logo" src="/logos/${brand}.jpeg" alt="${escape(name)} logosu" width="60" height="60">`:'<span class="restaurant-logo logo-fallback">Ş</span>'};
}
function branchHeader(name){const b=identity(name);return `<div class="branch-identity">${b.logo}<span><small>RESTORAN</small><strong>${escape(name)}</strong></span></div>`;}
function discountRatio(discount,gross){return '<span class="discount-ratio"><span>'+(discount===null?'—':money(discount))+'</span><i>/</i><span>'+(gross===null?'—':money(gross))+'</span></span>';}
function discountSummaryCard(name,orders,brand,total=false){const summary=summarizeDiscounts(orders);const header=total?'<div class="branch-identity"><span class="discount-total-icon" aria-hidden="true">%</span><span><strong>Tüm Restoranlar</strong></span></div>':branchHeader(name);return '<article class="discount-summary branch-'+brand+(total?' discount-all':'')+'"><div class="discount-summary-head">'+header+'</div><div class="discount-summary-metrics"><div><small>İndirim / Sipariş Tutarı</small><strong>'+discountRatio(summary.total,summary.grossTotal)+'</strong></div><div><small>İndirimli / Toplam</small><strong>'+summary.count+'/'+summary.orderCount+'</strong><small>Sipariş</small></div></div><div class="discount-campaigns">'+(summary.campaigns.length?summary.campaigns.map(campaign=>'<div class="discount-campaign"><strong>'+escape(campaign.title)+'</strong><div><span class="discount-usage">'+campaign.count+'/'+summary.orderCount+' Sipariş</span><b>'+discountRatio(campaign.total,summary.grossTotal)+'</b></div></div>').join(''):'<p class="discount-empty">Bu dönemde kampanya / kupon kaydı yok.</p>')+'</div></article>';}
function orderTotalPrice(order){const total=orderTotals(order);return '<span class="order-total-price">'+(total.discount>0&&total.gross!==null?'<small class="order-price-breakdown"><del>'+money(total.gross)+'</del><span>−'+money(total.discount)+'</span></small>':'')+'<strong class="order-price">'+(total.invalid?'Kontrol edin':money(total.net))+'</strong>'+(total.discount>0?'<small class="order-net-label">İndirim sonrası</small>':'')+(total.invalid?'<small class="order-total-warning">İndirim, API tutarını aşıyor.</small>':total.partial?'<small class="order-total-warning">API’de paylaşılan indirimler esas alındı.</small>':'')+'</span>';}
function orderDiscounts(order){const entries=order.discounts?.entries||[];if(!entries.length)return '';return '<section class="order-discounts"><h4><span aria-hidden="true">◇</span> Kampanya ve Kupon</h4>'+entries.map(entry=>{const amount=Number.isFinite(entry.total)?entry.total:entry.seller>0?entry.seller:entry.trendyol>0?entry.trendyol:null;const label=Number.isFinite(entry.total)?'İndirim':entry.seller>0?'Restoran payı':entry.trendyol>0?'Trendyol payı':'Tutar paylaşılmadı';return '<div class="order-discount-row"><div><strong>'+escape(entry.title)+'</strong><small>'+escape(entry.kind==='coupon'?'Kupon':'Kampanya')+(entry.products?.length?' · '+escape(entry.products.join(', ')):'')+'</small></div><span><b>'+(amount===null?'—':'−'+money(amount))+'</b><small>'+label+'</small></span></div>';}).join('')+'<p>Sipariş toplamında bu kampanya ve kuponlar bir kez düşülür.</p></section>';}
function orderActionBlock(o){if(!state.canManageOrders||!['admin','viewer'].includes(state.user?.role))return '';const pending=state.orderActions?.[o.id],action=pending?'check':o.status==='Created'?'accept':o.status==='Picking'?'ready':null;if(!action)return '';const busy=localOrderActions.has(o.id);const label=busy?'İşlem sürüyor…':action==='accept'?'Kabul et':action==='ready'?'Hazırlandı':'Durumu kontrol et';return `<div class="order-actions"><button type="button" class="order-action-button action-${action}" data-order-action="${action}" ${busy?'disabled':''}><span aria-hidden="true">${action==='accept'?'✓':action==='ready'?'✓':'↻'}</span> ${label}</button>${pending?'<small>Trendyol durum doğrulaması bekleniyor.</small>':action==='accept'?'<small>Hazırlama süresi: '+PREPARATION_WARNING_MINUTES+' dk</small>':''}</div>`;}
const autoPrintHash = '#otomatik-yazdir';
const nativePrintStation = window.onlineMutfakPrintStation === true && window.chrome?.webview;
const installedApp = matchMedia('(display-mode: standalone)').matches;
const appPrintKey = 'om-installed-app-print';
const printPreferences = installedApp ? localStorage : sessionStorage;
let appPrint = false;
try { appPrint = printPreferences.getItem(appPrintKey) === '1'; } catch {}
const autoPrintEnabled = () => !mobileQuery.matches && Boolean(navigator.locks) &&
 (location.hash === autoPrintHash || appPrint);
let receiptQueue = Promise.resolve();
const printJournal=createPrintJournal(localStorage);
const printToggle = $('#printToggle');

function showPrintMode() {
 const enabled = autoPrintEnabled();
 const available = Boolean(navigator.locks);
 const label = available ? 'Otomatik yazdırma ' + (enabled ? 'aktif' : 'kapalı') : 'Otomatik yazdırma desteklenmiyor';
 printToggle.hidden = mobileQuery.matches;
 printToggle.disabled = !available;
 printToggle.setAttribute('aria-pressed', String(enabled));
 printToggle.setAttribute('aria-label', label);
 printToggle.title = label;
 const sidebarStatus = $('#sidebarPrintStatus');
 sidebarStatus.hidden = mobileQuery.matches;
 sidebarStatus.classList.toggle('is-active', enabled);
 $('#sidebarPrintState').textContent = enabled ? 'Aktif' : 'Kapalı';
 $('.online-kitchen-brand').href = location.hash === autoPrintHash ? '/' + autoPrintHash : '/';
}
printToggle.onclick = () => {
 const enabled = autoPrintEnabled();
 const message = enabled
  ? 'Otomatik yazdırma kapatılsın mı?'
  : 'Otomatik yazdırma açılsın ve deneme fişi yazdırılsın mı?';
 if (!window.confirm(message)) return;
 appPrint = !enabled;
 if (!appPrint && location.hash === autoPrintHash) {
  history.replaceState(null, '', location.pathname + location.search);
 }
 try { printPreferences.setItem(appPrintKey, appPrint ? '1' : '0'); } catch {}
 showPrintMode();
 if (appPrint) {
  void queueReceipt({
   id:'printer-test', number:'DENEME', orderCode:'TEST', restaurant:'Yazıcı denemesi',
   customer:'Online Mutfak', createdAt:Date.now(), note:'Bu fiş yazıcı kontrolü içindir.',
   items:[{name:'Deneme fişi', quantity:1, unitPrice:0}], total:0
  }, false, true);
 }
};
window.addEventListener('hashchange', showPrintMode);
mobileQuery.addEventListener('change', showPrintMode);
showPrintMode();

function queueReceipt(order, automatic = false, test = false) {
 let record;const key=JSON.stringify([order.accountId,order.number||order.id]);
 try{if(automatic&&(Object.hasOwn(JSON.parse(localStorage.getItem('om-auto-receipts')||'{}'),key)||printJournal.hasAutomatic(key)))return Promise.resolve();record=printJournal.begin(order,{automatic,test});}catch(error){toast(error.message);return Promise.resolve();}
 const job=async()=>{let started=false;
  try{if((automatic||test)&&!autoPrintEnabled()){printJournal.update(record.id,'failed');return;}
   if(automatic&&Object.hasOwn(JSON.parse(localStorage.getItem('om-auto-receipts')||'{}'),key)){printJournal.update(record.id,'submitted');return;}
   await printOrder(order,()=>{if((automatic||test)&&!autoPrintEnabled())return false;printJournal.update(record.id,'sending');started=true;
    if(automatic){const submitted=JSON.parse(localStorage.getItem('om-auto-receipts')||'{}'),cutoff=Date.now()-2*86400000,recent=Object.entries(submitted).filter(([,at])=>at>cutoff);localStorage.setItem('om-auto-receipts',JSON.stringify(Object.fromEntries([...recent,[key,Date.now()]])));}return true;});
   printJournal.update(record.id,started?'submitted':'failed');
  }catch(error){printJournal.update(record.id,started?'uncertain':'failed');throw error;}
 };
 receiptQueue=receiptQueue.then(()=>navigator.locks?navigator.locks.request('om-receipt-printing',job):job()).catch(error=>toast(error.message||'Fiş gönderilemedi. Yazdırma geçmişinden kontrol edin.'));return receiptQueue;
}

function printReceiptPage() {
 if (nativePrintStation && autoPrintEnabled()) {
  return new Promise((resolve, reject) => {
   const id = crypto.randomUUID();
   const receive = event => {
    if (event.data?.type !== 'print-receipt-result' || event.data.id !== id) return;
    cleanup();
    if (event.data.error) reject(Error(event.data.error));
    else resolve();
   };
   const cleanup = () => {
    clearTimeout(timer);
    nativePrintStation.removeEventListener('message', receive);
   };
   const timer = setTimeout(() => {
    cleanup();
    reject(Error('Windows baskı yanıtı alınamadı. Yazıcı kuyruğunu kontrol edin.'));
   },90000);
   nativePrintStation.addEventListener('message',receive);
   try { nativePrintStation.postMessage({type:'print-receipt',id}); }
   catch (error) { cleanup(); reject(error); }
  });
 }
 return new Promise((resolve, reject) => {
  const finish = () => {
   clearTimeout(timer);
   resolve();
  };
  const timer = setTimeout(() => {
   window.removeEventListener('afterprint', finish);
   reject(Error('Baskı penceresi kapanmadı. Yazıcıyı ve baskı kuyruğunu kontrol edin.'));
  }, 60000);
  window.addEventListener('afterprint', finish, {once:true});
  try {
   window.print();
  } catch (error) {
   clearTimeout(timer);
   window.removeEventListener('afterprint', finish);
   reject(error);
  }
 });
}

async function printOrder(order, beforePrint = null) {
 let code = order.orderCode;
 if (code === undefined) {
  try {
   const result = await api('/api/orders/' + encodeURIComponent(order.id) + '/receipt-code');
   code = result.orderCode;
  } catch {
   throw Error('Kısa sipariş kodu alınamadı.');
  }
 }
 const printDate = order.createdAt ? new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short'
 }).format(Number(order.createdAt)) : '—';
 const account = state.accounts.find(account => account.id === order.accountId);
 const branch = restaurantGroups(state.accounts,state.orders)
  .find(group => group.id === order.accountId + ':' + order.storeId)?.name || order.restaurant;
 const totals = orderTotals(order);
 const items = order.items.map(item => {
  const pricing = productPricing(item);
  const unit = pricing.split ? pricing.displayUnitPrice +
   pricing.modifiers.reduce((sum, modifier) => sum + modifier.unitPrice, 0) : pricing.displayUnitPrice;
  const amount = unit === null || pricing.quantity === null ? '—' : money(Math.round(unit * 100) * pricing.quantity / 100);
  const options = pricing.modifiers.length ? pricing.modifiers.map(modifier => modifier.name) : item.options || [];
  const notes = [...options, ...(item.extras || []).map(extra => 'Ekstra: ' + extra),
   ...(item.removed || []).map(removed => 'Çıkarılacak: ' + removed)];
  if (item.cancelled) notes.push(item.cancelled + ' adet iptal');
  return '<tr><td><strong>' + escape(item.name) + '</strong>' +
   notes.map(note => '<div>(' + escape(note) + ')</div>').join('') +
   '</td><td>' + (pricing.quantity ?? '—') + '</td><td>' + amount + '</td></tr>';
 }).join('');
 $('#printReceipt').innerHTML =
  $('#receiptBrand').innerHTML +
  '<h1 aria-label="Sipariş kodu"><strong>' + escape(code || '—') + '</strong></h1>' +
  '<p>' + escape(printDate) + '</p>' +
  '<div class="receipt-meta"><div>Müşteri<br>Bilgisi<br><strong>' + escape(order.customer || '—') + '</strong>' +
  '</div><div>Ödeme<br>Yöntemi<br>' + escape(order.payment || '—') +
  '</div><div class="receipt-order-number">Sipariş<br>Numarası<br><span>' + escape(order.number) + '</span></div></div>' +
  (order.note ? '<p class="receipt-note">Sipariş Notu: ' + escape(order.note) + '</p>' : '') +
  '<table><thead><tr><th>Ürün</th><th>Adet</th><th>Tutar</th></tr></thead><tbody>' + items + '</tbody></table>' +
  '<div class="receipt-total"><span>Toplam:</span><strong>' +
  (totals.net === null ? '—' : money(totals.net)) + '</strong></div>' +
  '<footer><p><strong>Restoran:</strong> ' + escape(branch) +
  (account?.supplierId ? ' / ' + escape(account.supplierId) : '') + '</p>' +
  '<p><strong>Restoran Destek Hattı:</strong> +90 850 210 7555</p>' +
  '<p><strong>Müşteri İletişim:</strong> 0212 365 34 03 / ' + escape(order.number) + '</p>' +
  '<p>Siparişle ilgili kullanıcıyla iletişime geçmek için 0212 365 34 03 numarasını arayarak, ' +
  escape(order.number) + ' no’lu sipariş numarasını tuşlayabilirsiniz.</p></footer>';
 if (beforePrint && !beforePrint()) return false;
 await printReceiptPage();
 return true;
}
function orderCard(o){const b=identity(o.restaurant),timing=orderTiming(o,PREPARATION_WARNING_MINUTES);return `<article class="order branch-${b.brand} ${timing.late?'order-late':''} ${(highlights.get(o.id)||0)>Date.now()?'order-new':''}" data-order="${escape(o.id)}"><div class="order-branch">${branchHeader(o.restaurant)}<div class="order-header-meta"><span class="order-header-payment">${paymentVisual(o.payment)}</span>${badge(o.status)}</div></div><div class="order-reference"><div class="order-reference-identity"><strong>#${escape(o.number)}</strong>${o.customer?`<span class="order-customer-name">${escape(o.customer)}</span>`:''}</div><time>${date(o.createdAt)}</time>${o.test?'<span class="badge">TEST</span>':''}</div><div class="order-age ${timing.late?'late':''}">${active(o)?escape(timing.label):'Sipariş tamamlandı'}${timing.late?' · Hazırlama süresi uyarısı':''}${(highlights.get(o.id)||0)>Date.now()?' · YENİ GELDİ':''}</div><div class="order-products">${o.items.map(i=>`<div class="product-row"><span class="product-quantity">${i.quantity??'?'}<small>adet</small></span><div class="product-description"><strong>${escape(i.name)}</strong>${mainItemPrice(i)}${modifierPrices(i)}${i.removed?.length?`<small class="removed">Çıkarılacak: ${escape(i.removed.join(', '))}</small>`:''}${i.extras?.length?`<small>Ekstra: ${escape(i.extras.join(', '))}</small>`:''}${i.cancelled?`<small class="removed">${i.cancelled} adet iptal</small>`:''}</div></div>`).join('')}</div>${o.note?`<div class="order-customer-note"><strong>Müşteri notu</strong> ${escape(o.note)}</div>`:''}${orderDiscounts(o)}<div class="order-bottom"><span>${escape(o.delivery)}${o.courierNearby&&active(o)?'<br><b class="courier-nearby">Kurye yakında</b>':''}</span>${orderTotalPrice(o)}</div>${orderActionBlock(o)}<button type="button" class="order-card-print" data-order-print aria-label="Sipariş fişini yazdır"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/><path d="M18 12h.01"/></svg>Yazdır</button></article>`;}
function fitDiscountCarousel(){$('#discountSummaries').style.removeProperty('height');}
const discountSizeObserver=new ResizeObserver(()=>fitDiscountCarousel());
function updateDiscountPager(){const container=$('#discountSummaries'),cards=[...container.children];discountCardIndex=Math.max(0,Math.min(discountCardIndex,cards.length-1));$('#discountPager').querySelectorAll('button').forEach((button,index)=>{button.classList.toggle('current',index===discountCardIndex);button.setAttribute('aria-current',index===discountCardIndex?'true':'false');});$('#discountPagerName').textContent=cards[discountCardIndex]?.querySelector('.branch-identity strong')?.textContent||'';fitDiscountCarousel();}
function renderDiscountPager(){const container=$('#discountSummaries'),cards=[...container.children],key=cards.map(card=>card.querySelector('.branch-identity strong')?.textContent).join('|');if($('#discountPager').dataset.cards!==key){$('#discountPager').dataset.cards=key;$('#discountPager').innerHTML='<div class="restaurant-dots">'+cards.map((card,index)=>'<button type="button" data-discount-index="'+index+'" aria-label="'+escape(card.querySelector('.branch-identity strong')?.textContent||'Restoran')+' indirimlerini göster"></button>').join('')+'</div><span id="discountPagerName"></span>';}discountSizeObserver.disconnect();for(const card of cards)discountSizeObserver.observe(card);updateDiscountPager();}
function syncCarouselPager(rail, media, onActiveCard) {
 let frame = 0;
 rail.addEventListener('scroll', () => {
  if (!media.matches || frame) return;
  frame = requestAnimationFrame(() => {
   frame = 0;
   if (!media.matches || !rail.firstElementChild) return;
   const firstLeft = rail.firstElementChild.getBoundingClientRect().left;
   let nearestIndex = 0;
   let nearestDistance = Infinity;
   Array.from(rail.children).forEach((card, index) => {
    const distance = Math.abs(card.getBoundingClientRect().left - firstLeft - rail.scrollLeft);
    if (distance < nearestDistance) {
     nearestIndex = index;
     nearestDistance = distance;
    }
   });
   onActiveCard(nearestIndex);
  });
 }, {passive:true});
}
syncCarouselPager($('#discountSummaries'),discountCarouselQuery,index=>{
 if(index===discountCardIndex)return;
 discountCardIndex=index;
 updateDiscountPager();
});
$('#discountPager').onclick=e=>{const button=e.target.closest('[data-discount-index]');if(!button)return;const container=$('#discountSummaries'),card=container.children[Number(button.dataset.discountIndex)];if(card)container.scrollTo({left:card.offsetLeft-container.firstElementChild.offsetLeft,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});};
discountCarouselQuery.addEventListener('change',()=>{discountCardIndex=0;$('#discountSummaries').scrollLeft=0;updateDiscountPager();});
function updateTabRail(){const el=$('#tabs'),more=el.scrollWidth>el.clientWidth+2&&el.scrollLeft+el.clientWidth<el.scrollWidth-3;$('#tabsNext').hidden=!more;el.parentElement.classList.toggle('has-more',more);}
$('#tabs').addEventListener('scroll',updateTabRail,{passive:true});new ResizeObserver(updateTabRail).observe($('#tabs'));
$('#tabsNext').onclick=()=>$('#tabs').scrollBy({left:Math.max(130,$('#tabs').clientWidth*.6),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
function updateRestaurantPager(){const cards=[...$('#restaurantSummaries').children];const activeCard=cards[summaryIndex];$('#restaurantPager').querySelectorAll('button').forEach((button,index)=>{button.classList.toggle('current',index===summaryIndex);button.setAttribute('aria-current',index===summaryIndex?'true':'false');});$('#restaurantPagerName').textContent=activeCard?.querySelector('.branch-identity strong')?.textContent||'';}
function renderRestaurantPager(){const cards=[...$('#restaurantSummaries').children];const key=cards.map(card=>card.querySelector('.branch-identity strong')?.textContent||'Restoran').join('|');if($('#restaurantPager').dataset.cards!==key){$('#restaurantPager').dataset.cards=key;$('#restaurantPager').innerHTML='<div class="restaurant-dots">'+cards.map((card,index)=>'<button type="button" data-summary-index="'+index+'" aria-label="'+escape(card.querySelector('.branch-identity strong')?.textContent||'Restoran')+' kartını göster"></button>').join('')+'</div><span id="restaurantPagerName"></span>';}summaryIndex=Math.min(summaryIndex,Math.max(0,cards.length-1));updateRestaurantPager();}
syncCarouselPager($('#restaurantSummaries'),mobileQuery,index=>{
 if(index===summaryIndex)return;
 summaryIndex=index;
 updateRestaurantPager();
});
$('#restaurantPager').onclick=e=>{const button=e.target.closest('[data-summary-index]');if(!button)return;const container=$('#restaurantSummaries'),index=Number(button.dataset.summaryIndex),card=container.children[index];if(card){container.scrollTo({left:card.offsetLeft-container.firstElementChild.offsetLeft,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}};
// Preserve the selected restaurant across rotation, zoom and viewport resizing.
let restaurantRailWidth=0;
new ResizeObserver(()=>{
 const rail=$('#restaurantSummaries');
 const width=rail.clientWidth;
 if(!width||width===restaurantRailWidth)return;
 restaurantRailWidth=width;
 if(!mobileQuery.matches)return;
 const card=rail.children[summaryIndex];
 if(card)rail.scrollTo({left:card.offsetLeft-rail.firstElementChild.offsetLeft,behavior:'instant'});
 updateRestaurantPager();
}).observe($('#restaurantSummaries'));
let reviewsLoading=false,manualRefreshing=false;
function updateRefreshButton(){
 const busy=manualRefreshing||(view==='reviews'&&reviewsLoading);
 $('#refreshButton').dataset.busy=String(busy);
 $('#refreshButton').disabled=busy;
 $('#refreshButton').textContent=view==='reviews'
  ? (busy?'↻ Yorumlar yenileniyor…':'↻ Yorumları yenile')
  : (busy?'↻ Kontrol ediliyor…':'↻ Şimdi yenile');
}
const reviewsView=createReviewsView({api,escape,branchHeader,identity,date,toast,getState:()=>state,onLoadingChange:value=>{reviewsLoading=value;updateRefreshButton();}});
function showView(v){if(v==='settings'&&state.user?.role!=='admin')v='orders';const changed=view!==v;view=v;for(const name of ['orders','reviews','settings']){$('#'+name+'View').hidden=v!==name;$('#'+name+'Nav')?.classList.toggle('active',v===name);}$('.portal-title').textContent=v==='reviews'?'Değerlendirmeler':'Sipariş Merkezi';updateRefreshButton();if(v==='settings'){loadSettings();}if(v==='reviews')void reviewsView.load();if(changed)render();}
function render(){
 document.dispatchEvent(new CustomEvent('online:accounts',{detail:state.accounts.map(account=>({id:account.id,name:account.label,state:account.status?.state||'waiting',lastSuccess:account.status?.lastSuccess||null,message:account.status?.message||''}))}));


 const isAdmin=state.user?.role==='admin';document.querySelectorAll('.admin-only').forEach(el=>el.hidden=!isAdmin);if(!isAdmin&&view==='settings')showView('orders');
 $('#currentRole').textContent=state.user?(isAdmin?'Hesabım':'Kullanıcı'):'';
 if(workspaceVisible&&!document.hidden&&view==='orders'){
 const source=state.orders;
 const groups=restaurantGroups(state.accounts,source);
 const names=new Map(groups.map(g=>[g.id,g.name]));
 const all=source.map(o=>({...o,restaurant:names.get(`${o.accountId}:${o.storeId}`)||o.restaurant}));
 const selectedStore=$('#storeFilter').value;
 const stores=new Map(groups.map(g=>[g.id,g.name]));
 patchHTML($('#storeFilter'),'<option value="">Tüm restoranlar</option>'+[...stores].map(([id,name])=>`<option value="${escape(id)}">${escape(name)}</option>`).join(''));
 if(stores.has(selectedStore))$('#storeFilter').value=selectedStore;
 const byStore=all.filter(o=>!$('#storeFilter').value||`${o.accountId}:${o.storeId}`===$('#storeFilter').value);
 const period=$('#dateFilter').value;
 const scope=byStore.filter(o=>inPeriod(o,period));
 const financial=scope.filter(o=>!o.test&&state.accounts.find(a=>a.id===o.accountId)?.environment!=='stage');
 const summary=summarize(financial,{includeTest:false});
 $('#summaryPeriod').textContent=$('#dateFilter').selectedOptions[0].textContent;
 const combined=summarize(all.filter(o=>inPeriod(o,period)&&!o.test&&state.accounts.find(a=>a.id===o.accountId)?.environment!=='stage'));
 const totalCard=`<article class="restaurant-summary all-restaurants"><div class="restaurant-summary-head"><div class="branch-identity"><span class="all-restaurants-icon" aria-hidden="true"><svg class="online-kitchen-symbol" viewBox="0 0 64 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M21 9a17 17 0 0 1 22 0M26 14a9 9 0 0 1 12 0" stroke="#c4dc8e" stroke-width="3" stroke-linecap="round"/><circle cx="32" cy="19" r="2" fill="#c4dc8e"/><path d="M13 35a19 16 0 0 1 38 0H13Z" fill="currentColor"/><path d="M9 40h46" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M22 30a11 11 0 0 1 5-6" stroke="#23513c" stroke-width="2" stroke-linecap="round"/></svg></span><span><small>ONLINE MUTFAK</small><strong>Tüm Restoranlar</strong></span></div><button class="restaurant-focus" data-store="" aria-label="Tüm restoranların siparişlerini filtrele">Siparişleri göster <svg class="ui-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></button></div><div class="restaurant-metrics"><div class="restaurant-metric metric-revenue"><small>Brüt Ciro</small><strong>${money(combined.total)}</strong></div><div class="restaurant-metric metric-orders"><small>Sipariş</small><strong>${combined.count}</strong></div></div><span class="restaurant-context">${groups.length} Restoran</span><div class="summary-drawer"><div class="payment-breakdown-title">Ödeme kırılımı</div><div class="payment-breakdown">${combined.payments.length?combined.payments.map(paymentRow).join(''):'<p>Seçili dönemde sipariş yok.</p>'}</div></div>${combined.missing?`<small class="missing">${combined.missing} siparişin tutarı paylaşılmadı.</small>`:''}</article>`;
 patchHTML($('#restaurantSummaries'),totalCard+groups.map(g=>{
  const rows=all.filter(o=>`${o.accountId}:${o.storeId}`===g.id&&inPeriod(o,period));
  const s=summarize(rows.filter(o=>g.environment!=='stage'),{includeTest:false});
  return `<article class="restaurant-summary branch-${identity(g.name).brand} ${selectedStore===g.id?'chosen':''}"><div class="restaurant-summary-head">${branchHeader(g.name)}<button class="restaurant-focus" data-store="${escape(g.id)}" aria-label="${escape(g.name)} siparişlerini filtrele">Siparişleri göster <svg class="ui-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></button></div><div class="restaurant-metrics"><div class="restaurant-metric metric-revenue"><small>Brüt Ciro</small><strong>${money(s.total)}</strong></div><div class="restaurant-metric metric-orders"><small>Sipariş</small><strong>${s.count}</strong></div></div>${g.environment==='stage'?'<span class="restaurant-context">Test Hesabı</span>':''}<div class="summary-drawer"><div class="payment-breakdown-title">Ödeme kırılımı</div><div class="payment-breakdown">${s.payments.length?s.payments.map(paymentRow).join(''):'<p>Seçili dönemde sipariş yok.</p>'}</div></div>${s.missing?`<small class="missing">${s.missing} siparişin tutarı paylaşılmadı.</small>`:''}</article>`;
 }).join('')||'<div class="empty">Restoran hesabınızı bağladığınızda ciro ve ödeme kırılımları burada görünür.</div>');
 renderRestaurantPager();
 if(!summaryInitialized&&groups.length){$('#restaurantSummaries').scrollLeft=0;summaryInitialized=true;}
 const discountOrders=all.filter(o=>inPeriod(o,period)&&state.accounts.find(a=>a.id===o.accountId)?.environment!=='stage');
 patchHTML($('#discountSummaries'),discountSummaryCard('Tüm Restoranlar',discountOrders,'other',true)+groups.map(group=>discountSummaryCard(group.name,discountOrders.filter(o=>o.accountId===group.accountId&&o.storeId===group.storeId),identity(group.name).brand)).join(''));
 renderDiscountPager();fitDiscountCarousel();
 $('#discountSummaryPeriod').textContent=$('#dateFilter').selectedOptions[0].textContent;
 $('#summaryMissing').textContent=summary.missing?`${summary.missing} siparişin tutarı eksik. `:'';
 const q=$('#search').value.toLocaleLowerCase('tr');
 const tabLabels={active:'Aktif',Created:'Yeni',Picking:'Hazırlanıyor',Invoiced:'Hazır',Shipped:'Yolda',all:'Tümü'};
 document.querySelectorAll('#tabs [data-status]').forEach(button=>{const status=button.dataset.status;const count=scope.filter(o=>(status==='all'||(status==='active'?active(o):o.status===status))&&[o.number,o.customer,o.restaurant,...o.items.map(i=>i.name)].join(' ').toLocaleLowerCase('tr').includes(q)).length;button.innerHTML='<span class="tab-label">'+tabLabels[status]+'</span><span class="tab-count">'+count+'</span>';button.setAttribute('aria-pressed',String(tab===status));});
 const shown=scope.filter(o=>(tab==='all'||(tab==='active'?active(o):o.status===tab))&&[o.number,o.customer,o.restaurant,...o.items.map(i=>i.name)].join(' ').toLocaleLowerCase('tr').includes(q)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 updateTabRail();
 $('#resultCount').textContent=shown.length;
 patchHTML($('#orders'),shown.length?shown.map(orderCard).join(''):`<div class="empty"><div class="empty-icon">▤</div><h3>${state.accounts.length?'Bu görünümde sipariş yok':'İlk restoranınızı bağlayın'}</h3><p>${state.accounts.length?'Filtreleri değiştirebilir veya yeni siparişleri burada bekleyebilirsiniz.':'API bilgilerinizi Bağlantılar ekranına girin.'}</p></div>`);
 }
 const ok=state.accounts.filter(a=>accountHealth(a,state.interval).ok).length;const errors=state.accounts.filter(a=>!accountHealth(a,state.interval).ok);
 const last=Math.max(0,...state.accounts.map(a=>a.status.lastSuccess||0));
 $('#updateLabel').textContent=state.busy?'Siparişler kontrol ediliyor…':last?`Son başarılı kontrol: ${date(last)} · ${state.interval} sn aralıkla`:'Henüz başarılı senkronizasyon yok';
 updateRefreshButton();
 $('#sidebarConnectionCount').textContent=`${ok}/${state.accounts.length}`;
 $('#notice').hidden=connected&&!errors.length&&state.accounts.length>0;
 $('#notice').classList.toggle('error',!connected||!!errors.length);
 $('#notice').textContent=!connected?'Sites bağlantısı kesildi. Ekrandaki bilgiler güncel olmayabilir.':errors.length?errors.map(a=>`${a.label}: ${accountHealth(a,state.interval).label} · ${a.status.message}`).join(' · '):!state.accounts.length?'Portal hazır. Canlı siparişleri görmek için Trendyol Go API hesabınızı bağlayın.':'';
 $('#connectionBadge').textContent=ok?'Bağlı':errors.length?'Kontrol gerekli':'Kurulum gerekli';$('#connectionBadge').className=`badge ${ok?'ok':errors.length?'error':''}`;
 $('#connectionSummary').innerHTML=state.accounts.length?state.accounts.map(a=>{const h=accountHealth(a,state.interval);return `<p class="health ${h.ok?'healthy':'unhealthy'}"><strong>${escape(a.label)} · ${h.label}</strong><br>Son kontrol: ${h.ageLabel}${a.status.nextAt>Date.now()&&!h.ok?` · Yeniden deneme ${Math.ceil((a.status.nextAt-Date.now())/1000)} sn`:''}</p>`;}).join(''):'<p>API hesabınızı bağlayarak siparişlerinizi buradan takip etmeye başlayın.</p>';
 $('#connectionBadge').textContent=errors.length?'Kontrol gerekli':ok?'Güncel':'Bekliyor';$('#connectionBadge').className=`badge ${errors.length?'error':ok?'ok':''}`;
 patchHTML($('#accounts'),state.accounts.length?state.accounts.map(a=>`<article class="account-card"><h2>${escape(a.label)}</h2><span class="badge ${escape(a.status.state)}">${a.environment==='prod'?'Canlı':'Test'} · ${a.status.state==='ok'?'Bağlı':a.status.state==='error'?'Hata':'Bekliyor'}</span><p>Supplier ID: ${escape(a.supplierId)}<br>${escape(a.status.message)}${a.status.lastSuccess?`<br>Son başarı: ${date(a.status.lastSuccess)}`:''}</p><button class="button" data-edit="${escape(a.id)}">Düzenle</button><button class="button" data-delete="${escape(a.id)}">Bağlantıyı kaldır</button></article>`).join(''):'<div class="account-card"><p>Henüz hesap eklenmedi.</p></div>');
}
$('#reviewsNav').onclick=()=>showView('reviews');
$('#ordersNav').onclick=()=>showView('orders');
function refreshFeedback(message,error=false,pending=false){toast(message);parent.postMessage({type:'online:feedback',message,error,pending},location.origin);}
$('#refreshButton').onclick=async()=>{
 if(manualRefreshing||reviewsLoading)return;
 manualRefreshing=true;updateRefreshButton();refreshFeedback(view==='reviews'?'Yorumlar yenileniyor…':'Siparişler yenileniyor…',false,true);
 try{
  if(!state.accounts.length){applyState(await api('/api/state'));render();if(!state.accounts.length){refreshFeedback('Bağlı restoran hesabı bulunamadı.',true);return;}}
  if(view==='reviews'){const ok=await reviewsView.load(true);refreshFeedback(ok?'Yorumlar güncellendi.':$('#reviewsStatus').textContent||'Yorumlar yenilenemedi.',!ok);return;}
  const result=await api('/api/sync','POST');applyState(await api('/api/state'));render();
  const failed=state.accounts.filter(account=>account.status?.state==='error').length;
  refreshFeedback(failed?failed+' restoran bağlantısında hata var. Son kayıtlar korunuyor.':result.cached?'Son güncel veriler gösteriliyor.':'Siparişler güncellendi.',failed>0);
 }catch(error){refreshFeedback(error.message||'Siparişler yenilenemedi. Tekrar deneyin.',true);}
 finally{manualRefreshing=false;updateRefreshButton();}
};
$('#search').oninput=render;$('#storeFilter').onchange=render;$('#dateFilter').onchange=()=>{tab=$('#dateFilter').value==='today'?'active':'all';document.querySelectorAll('#tabs button').forEach(button=>button.classList.toggle('selected',button.dataset.status===tab));render();};
$('#restaurantSummaries').onclick=e=>{const b=e.target.closest('[data-store]');if(!b)return;$('#storeFilter').value=$('#storeFilter').value===b.dataset.store?'':b.dataset.store;render();};
$('#tabs').onclick=e=>{const b=e.target.closest('[data-status]');if(!b)return;tab=b.dataset.status;document.querySelectorAll('#tabs button').forEach(el=>el.classList.toggle('selected',el===b));render();};
async function handleOrderAction(button){const card=button.closest('[data-order]'),id=card?.dataset.order,order=state.orders.find(o=>o.id===id),action=button.dataset.orderAction;if(!order||localOrderActions.has(id))return;if(action!=='check'&&!confirm(order.restaurant+' · #'+order.number+'\n'+(action==='accept'?'Sipariş kabul edilsin mi? Hazırlama süresi '+PREPARATION_WARNING_MINUTES+' dakika olarak gönderilecek.':'Siparişin hazırlandığı Trendyol Go’ya bildirilsin mi?')))return;localOrderActions.add(id);render();try{const result=await api('/api/orders/'+encodeURIComponent(id)+'/actions','POST',{action});toast(result.message);state=await api('/api/state');}catch(error){toast(error.message);}finally{localOrderActions.delete(id);render();}}
$('#orders').onclick=e=>{const actionButton=e.target.closest('[data-order-action]');if(actionButton){void handleOrderAction(actionButton);return;}const b=e.target.closest('[data-order]');if(!b)return;const raw=(state.orders).find(o=>o.id===b.dataset.order);if(!raw)return;if(e.target.closest("[data-order-print]")){void queueReceipt(raw);return;}const group=restaurantGroups(state.accounts,state.orders).find(g=>g.id===`${raw.accountId}:${raw.storeId}`);const o={...raw,restaurant:group?.name||raw.restaurant};$('#detailBody').innerHTML=`${branchHeader(o.restaurant)}<h2>#${escape(o.number)}</h2>${badge(o.status)}<p>${escape(o.restaurant)} · ${date(o.createdAt)}<br>${escape(o.delivery)}<br>${paymentVisual(o.payment)}${o.pin?`<br>Teslimat kodu: <strong>${escape(o.pin)}</strong>`:''}</p>${o.items.map(i=>`<div class="detail-item"><div class="detail-product-head"><strong>${i.quantity??'?'} × ${escape(i.name)}</strong>${mainItemPrice(i)}</div>${modifierPrices(i)}<small>${i.extras.length?`<br>Ekstra: ${escape(i.extras.join(', '))}`:''}${i.removed.length?`<br>Çıkarılan: ${escape(i.removed.join(', '))}`:''}${i.cancelled?`<br>İptal edilen adet: ${i.cancelled}`:''}</small></div>`).join('')}<div class="total-line"><span>Sipariş tutarı</span>${orderTotalPrice(o)}</div>${orderDiscounts(o)}${o.note?`<p class="note">${escape(o.note)}</p>`:''}<p><strong>${escape(o.customer)}</strong><br>${escape(o.address)}<br>${escape(o.district)}</p>`;document.dispatchEvent(new Event('online:dialog-opening'));$('#detail').showModal();};
$('#closeDetail').onclick=()=>$('#detail').close();
const form=$('#accountForm');
function resetForm(){form.reset();$('#accountId').value='';form.elements.apiKey.required=true;form.elements.apiSecret.required=true;$('#cancelEdit').hidden=true;$('#formMessage').textContent='';}
$('#cancelEdit').onclick=resetForm;
form.onsubmit=async e=>{e.preventDefault();const input=Object.fromEntries(new FormData(form));input.id=$('#accountId').value;input.stores=input.stores.split('\n').filter(s=>s.trim()).map(s=>{const at=s.indexOf('=');return{id:at<0?'':s.slice(0,at).trim(),name:at<0?'':s.slice(at+1).trim()};});$('#saveButton').disabled=true;try{await api('/api/accounts','POST',input);await pollState();resetForm();toast('Hesap kaydedildi. Canlı bağlantı sonucu hesap kartında görünecek.');}catch(e){$('#formMessage').textContent=e.message;}finally{$('#saveButton').disabled=false;}};
$('#accounts').onclick=async e=>{const edit=e.target.closest('[data-edit]');if(edit){const a=state.accounts.find(a=>a.id===edit.dataset.edit);resetForm();$('#accountId').value=a.id;for(const name of ['label','supplierId','environment','agentName','executorEmail'])form.elements[name].value=a[name];form.elements.stores.value=(a.stores||[]).map(s=>`${s.id}=${s.name}`).join('\n');form.elements.apiKey.required=false;form.elements.apiSecret.required=false;form.elements.apiKey.placeholder='Değiştirmek için girin; boşsa korunur';form.elements.apiSecret.placeholder='Değiştirmek için girin; boşsa korunur';$('#cancelEdit').hidden=false;form.scrollIntoView({behavior:'smooth'});return;}
 const del=e.target.closest('[data-delete]');if(del&&confirm('Bu hesabın bağlantısı ve bu kopyadaki sipariş kayıtları kaldırılsın mı?')){try{await api(`/api/accounts/${encodeURIComponent(del.dataset.delete)}`,'DELETE');toast('Bağlantı kaldırıldı.');}catch(e){toast(e.message);}}
};
function clock(){$('#clock').textContent=new Intl.DateTimeFormat('tr-TR',{timeZone:'Europe/Istanbul',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date());}clock();setInterval(clock,30000);
const events={close(){clearTimeout(pollTimer);}};let pollTimer,polling=false,stopped=false,pollAgain=false;
let nextPrintSessionRenewal=0;
function renewPrintSession(){
 if (!nativePrintStation || !autoPrintEnabled() || Date.now() < nextPrintSessionRenewal) return;
 nextPrintSessionRenewal=Date.now()+1800000;
 void api('/api/auth/renew-print-session','POST').catch(()=>{nextPrintSessionRenewal=Date.now()+60000;});
}
function applyState(next){state=next;document.dispatchEvent(new Event('online:state'));connected=true;renewPrintSession();const fresh=newOrders(state);void alertOrders(fresh);if(autoPrintEnabled())for(const order of fresh)void queueReceipt(order,true);}
async function pollState(){if(stopped)return;if(polling){pollAgain=true;return;}clearTimeout(pollTimer);polling=true;try{applyState(await api('/api/state'));}catch{connected=false;}finally{polling=false;render();const delay=pollAgain?0:connected&&state.busy?2000:liveOnline?60000:state.interval*1000;pollAgain=false;pollTimer=setTimeout(pollState,delay);}}
let liveOnline=false,onlineEvents;
function connectOnline(){if(onlineEvents||!('EventSource' in window))return;onlineEvents=new EventSource('/api'+'/online-events');onlineEvents.onopen=()=>{liveOnline=true;};onlineEvents.onmessage=()=>{liveOnline=true;void pollState();};onlineEvents.onerror=()=>{liveOnline=false;};}
function wakeOnline(){if(document.hidden)return;currentStateRequest?.abort();onlineEvents?.close();onlineEvents=null;liveOnline=false;connectOnline();void pollState();}
document.addEventListener('visibilitychange',wakeOnline);window.addEventListener('pageshow',wakeOnline);window.addEventListener('online',wakeOnline);window.addEventListener('pagehide',()=>{onlineEvents?.close();onlineEvents=null;liveOnline=false;});connectOnline();void pollState();render();


$('#soundButton').onclick=async()=>{try{if(sound.enabled){sound.disable();toast('Sipariş sesi kapatıldı.');}else if(await enableSound()){ring();toast('Yeni siparişler için ses açık.');}}catch{soundUI();toast('Ses başlatılamadı. Tarayıcının ses iznini kontrol edin.');}};
$('#testSoundButton').onclick=()=>void playNotification();
soundUI();
$('#settingsNav').onclick=()=>showView('settings');
async function loadSettings(){
 if(state.user?.role!=='admin')return;

 $('#signedInAs').textContent=state.user?.username||state.user?.email||'';
 $('#storageInfo').innerHTML=state.storage?`<p><strong>${escape(state.storage.engine)}</strong> · ${state.storage.backups} yedek<br>Son başarılı yedek: ${state.storage.lastBackupAt?escape(date(state.storage.lastBackupAt)):'Henüz yok'}<br>Otomatik yedekleme: Sayfa açıkken saatte bir · Son 48 yedek saklanır${state.storage.lastBackupAt&&Date.now()-state.storage.lastBackupAt>7200000?'<br><strong>Yedek gecikti. Şimdi yedek alın.</strong>':''}${state.storage.error?`<br>${escape(state.storage.error)}`:''}</p>`:'';
}
$('#passwordForm').onsubmit=async e=>{e.preventDefault();const f=e.target,p=Object.fromEntries(new FormData(f));if(p.password!==p.confirm){$('#passwordMessage').textContent='Yeni şifreler eşleşmiyor.';return;}const b=f.querySelector('button');b.disabled=true;try{await api('/api/auth/password','POST',{currentPassword:p.currentPassword,password:p.password});f.reset();$('#passwordMessage').textContent='Şifre değiştirildi. Diğer oturumlar kapatıldı.';stopped=true;events.close();location.reload();}catch(e){$('#passwordMessage').textContent=e.message;}finally{b.disabled=false;}};
$('#backupButton').onclick=async e=>{e.target.disabled=true;try{const info=await api('/api/backup','POST');state.storage=info;await loadSettings();toast('Veritabanı yedeği alındı.');}catch(e){toast(e.message);}finally{e.target.disabled=false;}};
setInterval(()=>{if(workspaceVisible&&!document.hidden&&state.accounts.length)render();},15000);

mobileQuery.addEventListener('change',()=>render());


$('#logoutButton').onclick=async()=>{try{await api('/api/auth/logout','POST');events.close();if(sound.context)void sound.context.close();document.body.replaceChildren();location.replace('/login' + location.hash);}catch(e){toast(e.message);}};





// Try immediately; a real page interaction retries when browser autoplay is blocked.
void sound.prime();
for(const event of ['pointerdown','keydown'])document.addEventListener(event,e=>{if(e.isTrusted&&sound.enabled&&!sound.ready)void sound.prime();},{capture:true,passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&sound.enabled&&!sound.ready)void sound.prime();});

// Keep the sound panel open while using its controls; close on mouse exit.
let soundMenuCloseTimer;
const soundMenu=$('#soundMenu');
soundMenu.addEventListener('pointerenter',()=>clearTimeout(soundMenuCloseTimer));
soundMenu.addEventListener('pointerleave',event=>{if(event.pointerType!=='mouse')return;clearTimeout(soundMenuCloseTimer);soundMenuCloseTimer=setTimeout(()=>{if(!soundMenu.matches(':hover'))soundMenu.open=false;},160);});
document.addEventListener('pointerdown',event=>{if(!soundMenu.contains(event.target))soundMenu.open=false;});
soundMenu.addEventListener('keydown',event=>{if(event.key==='Escape'){soundMenu.open=false;$('#soundMenuLabel').focus();}});

async function loadUsers(){if(state.user?.role!=='admin')return;try{const result=await api('/api/users');$('#userMessage').textContent='';$('#userList').innerHTML='<h3>Kayıtlı kullanıcılar</h3>'+result.users.map(user=>'<div class="portal-user-row"><div><strong>'+escape(user.username||user.email)+'</strong><small>'+(user.role==='admin'?'Yönetici':user.enabled?'Sipariş yönetimi':'Devre dışı')+'</small></div>'+(user.role==='viewer'?'<div class="portal-user-actions"><button class="button" data-user-id="'+escape(user.id)+'" data-user-enable="'+String(!user.enabled)+'">'+(user.enabled?'Devre dışı bırak':'Etkinleştir')+'</button><button class="button user-delete" data-user-delete="'+escape(user.id)+'" data-user-name="'+escape(user.username||user.email)+'">Sil</button></div>':'')+'</div>').join('');}catch(e){$('#userMessage').textContent=e.message;}}
$('#userForm').onsubmit=async e=>{e.preventDefault();const form=e.target,button=form.querySelector('button');button.disabled=true;$('#userMessage').textContent='';try{const input=Object.fromEntries(new FormData(form));await api('/api/users','POST',input);form.reset();$('#userMessage').textContent='Kullanıcı eklendi. Kullanıcı adı ve şifresiyle giriş yapabilir.';await loadUsers();}catch(e){$('#userMessage').textContent=e.message;}finally{button.disabled=false;}};
$('#userList').onclick=async e=>{const remove=e.target.closest('[data-user-delete]');if(remove){if(!confirm('“'+remove.dataset.userName+'” kullanıcısı silinsin mi? Bu kullanıcı tekrar giriş yapamaz ve açık oturumları kapanır.'))return;remove.disabled=true;try{await api('/api/users/'+encodeURIComponent(remove.dataset.userDelete),'DELETE');await loadUsers();toast('Kullanıcı silindi.');}catch(error){toast(error.message);remove.disabled=false;}return;}const button=e.target.closest('[data-user-id]');if(!button)return;button.disabled=true;try{await api('/api/users/enabled','POST',{id:button.dataset.userId,enabled:button.dataset.userEnable==='true'});await loadUsers();toast('Kullanıcı erişimi güncellendi.');}catch(error){toast(error.message);button.disabled=false;}};

if(parent===window)setupPhoneNotifications($('#phoneNotifications'), api, toast);

let embeddedView='orders';
document.addEventListener('online:visibility',event=>{workspaceVisible=!!event.detail;if(workspaceVisible)render();});
document.addEventListener('online:navigate',event=>{embeddedView=event.detail;if(state.user)showView(embeddedView);});
document.addEventListener('online:state',()=>{if(view!==embeddedView)showView(embeddedView);});
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='online:sound')return;if(event.data.enabled)void sound.enable();else sound.disable();});
document.addEventListener('online:sound',event=>{if(event.detail)void sound.enable();else sound.disable();});
window.onlineAppReady=true;window.dispatchEvent(new Event('online:app-ready'));

// Unified panel toolbar: select a receipt without repeating controls on every card.
document.addEventListener('online:print-menu',()=>{
 const body=$('#detailBody');let history='';try{history=printJournal.read().slice(-20).reverse().map(job=>'<li><div><strong>'+escape(job.restaurant)+' · #'+escape(job.code)+'</strong><small>'+escape(date(job.at))+' · '+escape(printStatus[job.status]||'Sonucu belirsiz')+'</small></div>'+(!job.test&&state.orders.some(o=>o.id===job.orderId)?'<button class="button" data-toolbar-retry="'+escape(job.orderId)+'">Yeniden yazdır</button>':'')+'</li>').join('');}catch(error){history='<li>'+escape(error.message)+'</li>';}
 body.innerHTML='<h2>Yazdırma</h2>'+(!mobileQuery.matches?'<button type="button" class="button toolbar-print-option" data-toolbar-auto>Otomatik yazdırma · '+(autoPrintEnabled()?'Aktif':'Kapalı')+'</button>':'')+'<p class="print-explanation">Gönderildi bilgisi kâğıt çıktısını doğrulamaz. Yazıcıyı kontrol ederek yeniden yazdırabilirsiniz.</p><h3>Son baskılar</h3><ul class="print-history">'+(history||'<li>Bu cihazda henüz baskı kaydı yok.</li>')+'</ul><h3>Sipariş fişi seçin</h3><input class="print-search" aria-label="Yazdırılacak siparişi ara" placeholder="Şube, kod veya müşteri ara…"><div class="print-order-list">'+state.orders.map(o=>'<button type="button" class="button toolbar-print-option" data-toolbar-receipt="'+escape(o.id)+'">'+escape(o.restaurant)+' · #'+escape(o.orderCode||o.number)+(o.customer?' · '+escape(o.customer):'')+'</button>').join('')+(state.orders.length?'':'<p>Yazdırılacak sipariş yok.</p>')+'</div>';document.dispatchEvent(new Event('online:dialog-opening'));if(!$('#detail').open)$('#detail').showModal();
});
$('#detailBody').addEventListener('input',event=>{if(!event.target.matches('.print-search'))return;const query=event.target.value.toLocaleLowerCase('tr-TR');for(const button of document.querySelectorAll('[data-toolbar-receipt]'))button.hidden=!button.textContent.toLocaleLowerCase('tr-TR').includes(query);});
$('#detailBody').addEventListener('click',event=>{if(event.target.closest('[data-toolbar-auto]')){$('#detail').close();printToggle.click();return;}const button=event.target.closest('[data-toolbar-receipt],[data-toolbar-retry]');if(!button)return;const order=state.orders.find(o=>o.id===(button.dataset.toolbarReceipt||button.dataset.toolbarRetry));if(!order)return;let previous=false;try{previous=printJournal.read().some(job=>job.orderId===order.id);}catch(error){toast(error.message);return;}if((previous||button.dataset.toolbarRetry)&&!confirm('Bu sipariş için baskı kaydı var. Aynı fiş tekrar yazdırılsın mı?'))return;$('#detail').close();void queueReceipt(order);});
