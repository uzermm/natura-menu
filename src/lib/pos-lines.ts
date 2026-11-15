import type { Ticket,TicketLine,SelectedItem } from './pos-types.ts';
export const lineKey=(line:Pick<TicketLine,'item_id'|'name'|'variant'|'unit_price'|'note'>)=>JSON.stringify([line.item_id,line.name,line.variant,line.unit_price,line.note]);
export interface GroupedLine extends TicketLine {pending_quantity:number;}
export function groupLines(lines:TicketLine[]):GroupedLine[]{
 const groups=new Map<string,GroupedLine>();
 for(const line of lines){const key=JSON.stringify([lineKey(line),!!line.voided_at,line.voided_at?line.void_reason:'']);const old=groups.get(key),pending=line.id.startsWith('pending-')?line.quantity:0;
  if(old){old.quantity+=line.quantity;old.paid_quantity=(old.paid_quantity||0)+(line.paid_quantity||0);old.paid_amount=(old.paid_amount||0)+(line.paid_amount||0);old.pending_quantity+=pending;}
  else groups.set(key,{...line,paid_quantity:line.paid_quantity||0,paid_amount:line.paid_amount||0,pending_quantity:pending});
 }return [...groups.values()];
}
// Allocate the remaining balance across unpaid units in integer cents. This also
// accounts for ticket discounts and earlier payments entered by amount.
export function quoteItemPayment(t:Pick<Ticket,'lines'|'remaining'>,selection:SelectedItem[]){
 const requested=new Map<string,number>();
 for(const item of selection){const line=t.lines.find(l=>l.id===item.line_id&&!l.voided_at);if(!line)throw Error('Ürün bulunamadı. Adisyonu yenileyin.');const key=lineKey(line);if(requested.has(key))throw Error('Aynı ürün iki kez seçilemez.');if(!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>999)throw Error('Geçerli bir adet seçin.');requested.set(key,item.quantity);}
 const active=t.lines.filter(l=>!l.voided_at),available=new Map<string,number>();let gross=0;
 for(const line of active){const qty=line.quantity-(line.paid_quantity||0);gross+=qty*line.unit_price;available.set(lineKey(line),(available.get(lineKey(line))||0)+qty);}
 for(const [key,qty] of requested)if(qty>(available.get(key)||0))throw Error('Seçilen adet ödenmemiş ürün adedini aşıyor.');
 if(!selection.length)return {amount:0,quantity:0,allocations:[] as {line_id:string;quantity:number;amount:number}[]};
 if(gross<=0||t.remaining<=0)throw Error('Seçilen ürünler için ödenecek tutar yok.');
 const budget=BigInt(t.remaining),denominator=BigInt(gross),allocations:{line_id:string;quantity:number;amount:number}[]=[];let prefix=0,total=0,quantity=0;
 for(const line of active){const unpaid=line.quantity-(line.paid_quantity||0),key=lineKey(line),take=Math.min(requested.get(key)||0,unpaid);
  if(take){const cost=Number((BigInt(prefix+take*line.unit_price)*budget)/denominator-(BigInt(prefix)*budget)/denominator);allocations.push({line_id:line.id,quantity:take,amount:cost});total+=cost;quantity+=take;requested.set(key,(requested.get(key)||0)-take);}
  prefix+=unpaid*line.unit_price;
 }return {amount:total,quantity,allocations};
}
