const sign={Sale:1,Return:-1,Discount:-1,DiscountCancel:1,Coupon:-1,CouponCancel:1,ProvisionPositive:1,ProvisionNegative:-1,ManualRefund:-1,ManualRefundCancel:1,DeliveryFee:1,DeliveryFeeCancel:-1};
const valid=n=>typeof n==='number'&&Number.isFinite(n);
const cents=n=>Math.round((n+Number.EPSILON)*100);
export function summarizeFinance(records){
 let net=0,commission=0,gross=0,discount=0,missing=0,payments=0,invoices=0,stoppage=0;
 const orders=new Map();
 for(const r of records){
  if(r.service!=='settlements'){
   const debit=valid(r.debt)?cents(r.debt):0,credit=valid(r.credit)?cents(r.credit):0;
   if(r.type==='PaymentOrder')payments+=debit-credit;
   if(r.type==='DeductionInvoices')invoices+=debit-credit;
   if(r.type==='Stoppage')stoppage+=debit-credit;
   continue;
  }
  const direction=sign[r.type];if(direction===undefined)continue;
  const key=r.orderNumber?`${r.accountId}:${r.orderNumber}`:null;
  if(key&&!orders.has(key))orders.set(key,{key,accountId:r.accountId,orderNumber:r.orderNumber,storeId:r.storeId,orderDate:r.orderDate,net:0,commission:0,gross:0,discount:0,missing:0,saleCount:0,records:[]});
  const o=orders.get(key);if(o)o.records.push(r);
  if(valid(r.sellerRevenue)){const value=direction*Math.abs(cents(r.sellerRevenue));net+=value;if(o)o.net+=value;}else{missing++;if(o)o.missing++;}
  if(valid(r.commissionAmount)){const value=direction*Math.abs(cents(r.commissionAmount));commission+=value;if(o)o.commission+=value;}
  if(r.type==='Sale'){const value=valid(r.credit)?cents(r.credit):0;gross+=value;if(o){o.gross+=value;o.saleCount++;}}
  if(['Discount','Coupon','DiscountCancel','CouponCancel'].includes(r.type)){const amount=Math.abs(cents((r.debt||0)-(r.credit||0)))*-direction;discount+=amount;if(o)o.discount+=amount;}
 }
 return {net:net/100,commission:commission/100,gross:gross/100,discount:discount/100,missing,payments:payments/100,invoices:invoices/100,stoppage:stoppage/100,
  orders:[...orders.values()].map(o=>({...o,net:o.net/100,commission:o.commission/100,gross:o.gross/100,discount:o.discount/100})).sort((a,b)=>(b.orderDate||0)-(a.orderDate||0))};
}
export function summarizeProducts(orders){const groups=new Map();for(const o of orders){if(o.test||['Cancelled','UnSupplied'].includes(o.status))continue;for(const i of o.items||[]){if(!Number.isInteger(i.quantity)||i.quantity<=0)continue;const key=JSON.stringify([o.accountId,i.name]);const p=groups.get(key)||{accountId:o.accountId,name:i.name,quantity:0,total:0,missing:0};p.quantity+=i.quantity;if(valid(i.unitPrice))p.total+=cents(i.unitPrice)*i.quantity;else p.missing++;groups.set(key,p);}}return [...groups.values()].map(p=>({...p,total:p.total/100})).sort((a,b)=>b.total-a.total);}
