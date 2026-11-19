import {discountEntryAmount} from './product-pricing.js';
export const dayKey=n=>n?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Istanbul'}).format(Number(n)):'';
export function inPeriod(order,period,now=Date.now()) {
 if(period==='all')return true;
 const today=dayKey(now), d=dayKey(order.createdAt);
 const midnight=Date.parse(`${today}T00:00:00+03:00`);
 if(period==='yesterday')return d===dayKey(midnight-86400000);
 if(period==='week')return d>=dayKey(midnight-6*86400000)&&d<=today;
 return d===today;
}
export function restaurantGroups(accounts,orders) {
 const groups=new Map();
 for(const a of accounts){
  const stores=new Map((a.stores||[]).map(s=>[String(s.id),s.name]));
  for(const o of orders.filter(o=>o.accountId===a.id))if(!stores.has(o.storeId))stores.set(o.storeId,null);
  if(!stores.size)groups.set(`${a.id}:`,{id:`${a.id}:`,accountId:a.id,name:a.label,storeId:'',environment:a.environment});
  for(const [id,name]of stores)groups.set(`${a.id}:${id}`,{id:`${a.id}:${id}`,accountId:a.id,storeId:id,name:name||(stores.size===1?a.label:`${a.label} · Şube ${id}`),environment:a.environment});
 }
 for(const o of orders){const id=`${o.accountId}:${o.storeId}`;if(!groups.has(id))groups.set(id,{id,accountId:o.accountId,storeId:o.storeId,name:o.restaurant});}
 return [...groups.values()];
}
export function summarize(orders,{includeTest=false}={}) {
 const eligible=orders.filter(o=>!['Cancelled','UnSupplied'].includes(o.status)&&(includeTest||!o.test));
 const payments=new Map();let cents=0,missing=0;
 for(const o of eligible){
  if(typeof o.total!=='number'||!Number.isFinite(o.total)){missing++;continue;}
  const amount=Math.round(o.total*100);cents+=amount;
  const label=o.payment||'Ödeme bilgisi paylaşılmadı';const row=payments.get(label)||{label,cents:0,count:0};row.cents+=amount;row.count++;payments.set(label,row);
 }
 return {total:cents/100,count:eligible.length,missing,payments:[...payments.values()].map(p=>({label:p.label,total:p.cents/100,count:p.count})).sort((a,b)=>b.total-a.total)};
}


export function summarizeDiscounts(orders){
 const campaigns=new Map(),usedOrders=new Set();let cents=0,known=0,missing=0,partial=false;
 const unique=new Map(orders.filter(o=>!o.test&&!['Cancelled','UnSupplied'].includes(o.status)).map(o=>[o.id,o]));
 let grossCents=0,grossMissing=false;for(const order of unique.values()){if(typeof order.total!=='number'||!Number.isFinite(order.total))grossMissing=true;else grossCents+=Math.round(order.total*100);for(const entry of order.discounts?.entries||[]){const title=String(entry.title||'Kampanya'),kind=entry.kind==='coupon'?'coupon':'promotion',key=kind+':'+title.normalize('NFKC').trim().toLocaleLowerCase('tr'),price=discountEntryAmount(entry);usedOrders.add(order.id);const row=campaigns.get(key)||{key,title,kind,cents:0,known:0,missing:0,partial:false,orders:new Set()};row.orders.add(order.id);if(price.amount===null){row.missing++;missing++;}else{const value=Math.round(price.amount*100);row.cents+=value;cents+=value;row.known++;known++;}row.partial||=price.partial;partial||=price.partial;campaigns.set(key,row);}}
 return {total:known?cents/100:missing?null:0,count:usedOrders.size,orderCount:unique.size,grossTotal:grossMissing?null:grossCents/100,missing,partial,campaigns:[...campaigns.values()].map(row=>({key:row.key,title:row.title,kind:row.kind,total:row.known?row.cents/100:null,count:row.orders.size,missing:row.missing,partial:row.partial})).sort((a,b)=>(b.total??-1)-(a.total??-1)||a.title.localeCompare(b.title,'tr'))};
}
