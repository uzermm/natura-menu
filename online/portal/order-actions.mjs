const transitions={accept:{from:'Created',to:'Picking'},ready:{from:'Picking',to:'Invoiced'}};
export function createOrderActions({initial={},getOrder,getAccount,refresh,send,persist,record=async()=>{},notify=()=>{},now=Date.now}){
 let pending={...initial},writes=Promise.resolve();const locks=new Set();
 function mutate(change){const result=writes.then(async()=>{const next=change({...pending});await persist(next);pending=next;notify();});writes=result.catch(()=>{});return result;}
 function setPending(id,value){return mutate(next=>{if(value)next[id]=value;else delete next[id];return next;});}
 function error(message,status=409){return Object.assign(new Error(message),{status});}
 return {
  get busy(){return locks.size>0;},
  snapshot(){return Object.fromEntries(Object.entries(pending).map(([id,{action,from,target,at}])=>[id,{action,from,target,at}]));},
  async reconcile(orders){if(!orders.some(order=>pending[order.id]&&order.status!==pending[order.id].from&&!locks.has(order.id)))return;await mutate(next=>{for(const order of orders)if(next[order.id]&&order.status!==next[order.id].from&&!locks.has(order.id))delete next[order.id];return next;});},
  async run(id,action,user){
   if(!['admin','viewer'].includes(user?.role))throw error('Sipariş işlemi için giriş yapın.',403);
   if(!Object.hasOwn(transitions,action)&&action!=='check')throw error('Geçersiz sipariş işlemi.',400);
   if(locks.has(id))throw error('Bu sipariş için işlem sürüyor.');
   const local=getOrder(id);if(!local)throw error('Sipariş bulunamadı.',404);
   const account=getAccount(local.accountId);if(!account)throw error('Restoran bağlantısı bulunamadı.',404);
   locks.add(id);
   try{
    const current=await refresh(account,local.packageId);
    if(action==='check'){
     if(pending[id]&&current.status!==pending[id].from)await setPending(id,null);
     return {ok:true,pending:!!pending[id],message:pending[id]?'İşlem henüz doğrulanmadı. Yeniden gönderilmedi; Trendyol panelinden de kontrol edebilirsiniz.':'Siparişin güncel durumu alındı.'};
    }
    if(pending[id]){
     if(current.status!==pending[id].from)await setPending(id,null);
     else throw error('Önceki işlemin sonucu bekleniyor. Durumu kontrol edin; aynı işlem tekrar gönderilmedi.');
    }
    const transition=transitions[action];
    if(current.status!==transition.from)throw error('Siparişin durumu değişmiş. Güncel durum ekrana aktarıldı.');
    const entry={action,from:transition.from,target:transition.to,at:now(),actor:user.username||user.email||user.id};
    // Save intent before the external write, so a restart cannot silently retry it.
    await setPending(id,entry);
    try{await send(account,local.packageId,action);}catch(e){if(!e.uncertain)await setPending(id,null);await record({orderId:id,...entry,result:e.uncertain?'uncertain':'rejected'});throw e;}
    await record({orderId:id,...entry,result:'accepted'});
    let updated;try{updated=await refresh(account,local.packageId);}catch{return {ok:true,pending:true,message:'Trendyol işlemi aldı. Güncel durumun alınması bekleniyor; tekrar gönderilmedi.'};}
    if(updated.status!==transition.from)await setPending(id,null);
    return {ok:true,pending:!!pending[id],message:pending[id]?'Trendyol işlemi aldı. Durum güncellemesi bekleniyor.':'Sipariş durumu güncellendi.'};
   }finally{locks.delete(id);notify();}
  }
 };
}
