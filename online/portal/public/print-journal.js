export function createPrintJournal(storage,now=()=>Date.now()){
 const storageKey='naturapp-print-journal';
 function read(){let rows;try{rows=JSON.parse(storage.getItem(storageKey)||'[]');}catch{throw Error('Baskı geçmişi okunamadı. Tarayıcı depolamasını kontrol edin.');}if(!Array.isArray(rows))throw Error('Baskı geçmişi geçersiz.');return rows.filter(r=>r&&typeof r.id==='string'&&typeof r.key==='string'&&typeof r.at==='number').slice(-100);}
 function save(rows){try{storage.setItem(storageKey,JSON.stringify(rows.slice(-100)));}catch{throw Error('Baskı kaydı saklanamadı. Çift çıktı oluşmaması için işlem durduruldu.');}}
 return {read,hasAutomatic:key=>read().some(r=>r.key===key&&r.automatic),begin(order,{automatic=false,test=false}={}){const job={id:crypto.randomUUID(),key:JSON.stringify([order.accountId,order.number||order.id]),orderId:String(order.id||''),code:String(order.orderCode||order.number||'—'),restaurant:String(order.restaurant||''),at:now(),updatedAt:now(),status:'queued',automatic,test};save([...read(),job]);return job;},update(id,status){save(read().map(r=>r.id===id?{...r,status,updatedAt:now()}:r));}};
}
export const printStatus={queued:'Bekliyor',sending:'Gönderiliyor',submitted:'Tarayıcıya gönderildi',failed:'Gönderilemedi',uncertain:'Sonucu belirsiz'};
