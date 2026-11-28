import {inPeriod,restaurantGroups,summarize,summarizeDiscounts,dayKey} from './public/summary.js';
const active=o=>['Created','Picking','Invoiced','Shipped'].includes(o.status);
export function recentOrders(orders,now=Date.now()) {return orders.filter(o=>active(o)||inPeriod(o,'today',now));}
export function orderOverview(accounts,orders,now=Date.now()) {
 const groups=restaurantGroups(accounts,orders),eligible=orders.filter(o=>accounts.find(a=>a.id===o.accountId)?.environment!=='stage');
 return Object.fromEntries(['today','yesterday','week','all'].map(period=>{
  const rows=eligible.filter(o=>inPeriod(o,period,now));
  return [period,Object.fromEntries([{id:'',name:'Tüm Restoranlar'},...groups].map(group=>{
   const subset=group.id?rows.filter(o=>o.accountId+':'+o.storeId===group.id):rows;
   return [group.id,{sales:summarize(subset),discounts:summarizeDiscounts(subset)}];
  }))];
 }));
}
export function historyPage(orders,query,now=Date.now(),groups=[]) {
 const names=new Map(groups.map(group=>[group.id,group.name]));if(names.size)orders=orders.map(o=>({...o,restaurant:names.get(o.accountId+':'+o.storeId)||o.restaurant}));
 const period=['today','yesterday','week','all'].includes(query.get('period'))?query.get('period'):'all',store=query.get('store')||'',q=(query.get('q')||'').slice(0,100).toLocaleLowerCase('tr'),status=query.get('status')||'all';
 const rows=orders.filter(o=>inPeriod(o,period,now)&&(!store||o.accountId+':'+o.storeId===store)&&(!q||[o.number,o.orderCode,o.customer,o.restaurant,...(o.items||[]).map(i=>i.name)].join(' ').toLocaleLowerCase('tr').includes(q)));
 const counts=Object.fromEntries(['all','active','Created','Picking','Invoiced','Shipped'].map(s=>[s,rows.filter(o=>s==='all'||(s==='active'?active(o):o.status===s)).length]));
 const sorted=rows.filter(o=>status==='all'||(status==='active'?active(o):o.status===status)).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0)||String(b.id).localeCompare(String(a.id)));
 const cursor=query.get('cursor'),index=cursor?sorted.findIndex(o=>o.id===cursor):-1;
 if(cursor&&index<0)throw Object.assign(Error('Geçmiş listesi değişti. Yenileyip tekrar deneyin.'),{status:409});
 const offset=index+1,items=sorted.slice(offset,offset+60);
 return {orders:items,total:sorted.length,counts,next:offset+items.length<sorted.length?items.at(-1).id:null,day:dayKey(now)};
}
