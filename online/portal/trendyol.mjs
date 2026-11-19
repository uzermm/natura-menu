import {Buffer} from 'node:buffer';
import {normalizeDiscounts} from './discounts.mjs';
export function paymentLabel(payment) {
  if (!payment?.paymentType) return 'Ödeme bilgisi paylaşılmadı';
  if (payment.paymentType === 'PAY_WITH_ON_DELIVERY') {
    const type=payment.onDelivery?.paymentType;
    const names={CASH:'Nakit',CARD:'Kredi / banka kartı',SODEXO_CARD:'Pluxee kart',SODEXO_CODE:'Pluxee kod',MULTINET_CARD:'Multinet kart',MULTINET_CODE:'Multinet kod',EDENRED_CARD:'Edenred kart',EDENRED_CODE:'Edenred kod',SETCARD_CARD:'Setcard kart',SETCARD_CODE:'Setcard kod',METROPOL_CARD:'MetropolCard kart',METROPOL_CODE:'MetropolCard kod',TOKENFLEX_MOBILE:'Tokenflex mobil',TOKENFLEX_CODE:'Tokenflex kod',PAYEKART_CARD:'Paye kart',PAYEKART_CODE:'Paye kod',IWALLET_CODE:'iWallet kod'};
    return `Kapıda ödeme · ${names[type] || type || 'Ödeme türü belirtilmedi'}`;
  }
  const card=typeof payment.mealCard==='string'?payment.mealCard:payment.mealCard?.cardSourceType || payment.mealCard?.name || payment.mealCard?.paymentType || payment.mealCard?.cardType;
  if(card) return `Yemek kartı · ${String(card).replace(/[-_ ]+ONLINE$/i,' Online').replace(/^SETCARD/i,'Setcard')}`;
  if(payment.paymentType==='PAY_WITH_MEAL_CARD') return 'Yemek kartı · Sağlayıcı belirtilmedi';
  if(payment.paymentType==='PAY_WITH_CARD') return 'Online ödeme · Kart';
  return `Ödeme türü · ${payment.paymentType}`;
}
export function normalize(p, account) {
  if (!p.id) throw new Error('Sipariş cevabında paket kimliği eksik.');
  return {
    id: `${account.id}:${p.id}`, packageId: String(p.id), accountId: account.id,
    number: String(p.orderNumber || p.orderCode || p.id), orderCode: String(p.orderCode ?? ''), pin: p.pinCode || p.address?.pinCode || p.orderCode || '',
    storeId: String(p.storeId ?? ''), restaurant: account.stores?.find(s => String(s.id) === String(p.storeId))?.name || `Şube ${p.storeId ?? ''}`,
    status: p.packageStatus || 'Unknown', createdAt: p.packageCreationDate || null,
    modifiedAt: p.packageModificationDate || p.lastModifiedDate || p.packageCreationDate || null,
    total: (typeof p.totalPrice==='number'||typeof p.totalPrice==='string'&&p.totalPrice.trim()!=='')&&Number.isFinite(Number(p.totalPrice)) ? Number(p.totalPrice) : null,
    customer: [p.customer?.firstName, p.customer?.lastName].filter(Boolean).join(' ') || 'Müşteri bilgisi paylaşılmadı',
    address: p.address?.address1 || '', district: p.address?.district || '',
    note: p.customerNote || '', delivery: p.storePickupSelected ? 'Gel-al' : p.deliveryType === 'GO' ? 'Trendyol Go kuryesi' : 'Restoran kuryesi',
    payment: paymentLabel(p.payment), discounts: normalizeDiscounts(p),
    courierNearby: !!p.isCourierNearby, test: !!p.testPackage,
    items: (p.lines || []).map(l => ({name:l.name || 'Ürün', quantity: Array.isArray(l.items) ? l.items.filter(i=>!i.isCancelled).length : null,
      cancelled: Array.isArray(l.items) ? l.items.filter(i=>i.isCancelled).length : 0,
      unitPrice: l.unitSellingPrice ?? l.price ?? null, baseUnitPrice: numericPrice(l.price), modifiers: describeModifiers(l.modifierProducts),
      options: describe(l.modifierProducts), extras: (l.extraIngredients || []).map(i=>i.name).filter(Boolean), removed: (l.removedIngredients || []).map(i=>i.name).filter(Boolean)}))
  };
}
function numericPrice(value){return (typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))?Number(value):null;}
function describeModifiers(items=[],depth=0){return (items||[]).flatMap(item=>[...(item.name?[{name:item.name,unitPrice:numericPrice(item.price),depth}]:[]),...describeModifiers(item.modifierProducts||[],depth+1)]);}
function describe(items = []) { return items.flatMap(i=>[i.name, ...describe(i.modifierProducts)].filter(Boolean)); }
export async function fetchPackages(account, {fetcher=fetch, start=Date.now()-48*3600000, end=Date.now()}={}) {
  const base = account.environment === 'stage' ? 'https://stageapi.tgoapis.com' : 'https://api.tgoapis.com';
  const all=[];
  for(let page=0;page<1000;page++) {
    const url=new URL(`${base}/integrator/order/meal/suppliers/${encodeURIComponent(account.supplierId)}/packages`);
    Object.entries({page,size:50,packageModificationStartDate:start,packageModificationEndDate:end}).forEach(([k,v])=>url.searchParams.set(k,v));
    const r=await fetcher(url,{headers:{Authorization:`Basic ${Buffer.from(`${account.apiKey}:${account.apiSecret}`).toString('base64')}`,...(account.agentName?{'x-agentname':account.agentName}:{}),...(account.executorEmail?{'x-executor-user':account.executorEmail}:{}),Accept:'application/json'},signal:AbortSignal.timeout(20000),redirect:'manual'});
    if(!r.ok) {
      const e=new Error(r.status===401?'API anahtarı, secret veya Supplier ID doğrulanamadı.':r.status===403?'Bu hesap için API erişimi reddedildi. Entegrasyon yetkisini kontrol edin.':r.status===429?'API istek sınırı aşıldı; otomatik olarak tekrar denenecek.':`Trendyol Go yanıtı: HTTP ${r.status}`);
      const retry=Number(r.headers.get('retry-after')); e.retryAfter=Number.isFinite(retry)&&retry>0?Math.min(retry,3600):0; throw e;
    }
    const body=await r.json();
    if(!Array.isArray(body.content)||!Number.isInteger(body.totalPages)||body.totalPages<0) throw new Error('Beklenmeyen API yanıtı. Hesabınızın Yemek API sürümünü doğrulayın.');
    all.push(...body.content.map(p=>normalize(p,account)));
    if(page+1>=body.totalPages) return all;
  }
  throw new Error('Sayfa sınırı aşıldı; senkronizasyon tamamlanmadı.');
}


function actionHeaders(account){return {Authorization:'Basic '+Buffer.from(account.apiKey+':'+account.apiSecret).toString('base64'),'x-agentname':account.agentName,'x-executor-user':account.executorEmail,Accept:'application/json'};}
function actionError(response){const error=new Error(response.status===401?'Trendyol API bilgileri doğrulanamadı.':response.status===403?'Bu hesap sipariş üzerinde işlem yapmaya yetkili değil.':response.status===404?'Sipariş Trendyol üzerinde bulunamadı.':response.status===409?'Siparişin durumu değişmiş; yeniden kontrol edin.':response.status===429?'Trendyol istek sınırına ulaşıldı. Biraz sonra tekrar deneyin.':'Trendyol işlem yanıtı: HTTP '+response.status);error.uncertain=response.status>=500;return error;}
export async function fetchPackage(account,packageId,{fetcher=fetch}={}){
 const base=account.environment==='stage'?'https://stageapi.tgoapis.com':'https://api.tgoapis.com';
 const response=await fetcher(base+'/integrator/order/meal/suppliers/'+encodeURIComponent(account.supplierId)+'/packages/'+encodeURIComponent(packageId),{headers:actionHeaders(account),signal:AbortSignal.timeout(20000),redirect:'manual'});
 if(!response.ok)throw actionError(response);const body=await response.json();const raw=body?.id?body:Array.isArray(body?.content)?body.content.find(p=>String(p.id)===String(packageId)):null;
 if(!raw||String(raw.id)!==String(packageId))throw Error('Tek sipariş yanıtı doğrulanamadı. İşlem gönderilmedi.');return normalize(raw,account);
}
export async function updatePackage(account,packageId,action,{preparationTime=15,fetcher=fetch}={}){
 if(!['accept','ready'].includes(action))throw Error('Geçersiz sipariş işlemi.');
 if(action==='accept'&&(!Number.isInteger(preparationTime)||preparationTime<1))throw Error('Geçersiz hazırlama süresi.');
 const base=account.environment==='stage'?'https://stageapi.tgoapis.com':'https://api.tgoapis.com';
 const payload=action==='accept'?{packageId:String(packageId),preparationTime}:{packageId:String(packageId)};
 let response;try{response=await fetcher(base+'/integrator/order/meal/suppliers/'+encodeURIComponent(account.supplierId)+'/packages/'+(action==='accept'?'picked':'invoiced'),{method:'PUT',headers:{...actionHeaders(account),'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(20000),redirect:'manual'});}catch{const error=new Error('Trendyol işlem yanıtı alınamadı. Tekrar göndermeden önce durumu kontrol edin.');error.uncertain=true;throw error;}
 if(!response.ok)throw actionError(response);
}
