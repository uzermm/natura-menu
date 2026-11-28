// One alert per close request, including across restarts. Ambiguous deliveries
// are recorded rather than blindly repeated in the restaurant's Telegram group.
export async function notifyClosureFailures({store,accounts,send,now=Date.now}) {
 const plans=await store.get('restaurant-closures',{});
 for(const [branchId,plan] of Object.entries(plans)) {
  if(!plan.until||now()<plan.until||!plan.error||plan.state==='completed'||plan.alert?.requestId===plan.requestId)continue;
  const account=accounts.find(a=>a.id===plan.accountId);
  const name=account?.stores?.find(s=>String(s.id)===plan.storeId)?.name||account?.label||'Restoran';
  plan.alert={requestId:plan.requestId,status:'sending',at:now()};
  await store.set('restaurant-closures',plans);
  try {await send('⚠️ Mağaza açılışı kontrol edilmeli\n'+name+'\nSüreli kapatma sona erdi; mağazanın açıldığı doğrulanamadı.\n'+plan.error);plan.alert.status='sent';}
  catch {plan.alert.status='uncertain';}
  await store.set('restaurant-closures',plans);
 }
}
