export const PREPARATION_WARNING_MINUTES=15;
export function orderTiming(order,threshold=PREPARATION_WARNING_MINUTES,now=Date.now()){
 const age=order.createdAt?Math.max(0,Math.floor((now-Number(order.createdAt))/60000)):null;
 const preparing=['Created','Picking'].includes(order.status);
 return {minutes:age,label:age===null?'Saat bilinmiyor':age<1?'Az önce geldi':`${age} dk önce geldi`,late:preparing&&age!==null&&age>=threshold};
}
export function accountHealth(account,interval=30,now=Date.now()){
 const s=account.status||{},age=s.lastSuccess?Math.max(0,Math.floor((now-s.lastSuccess)/1000)):null;
 const stale=age===null||age>Math.max(90,interval*3);
 return {stale,ok:s.state==='ok'&&!stale,label:s.state==='error'?'Bağlantı hatası':stale?'Veri güncel değil':'Güncel',ageLabel:age===null?'Başarılı kontrol yok':age<60?`${age} sn önce`:`${Math.floor(age/60)} dk önce`};
}
