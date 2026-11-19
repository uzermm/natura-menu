import ExcelJS from 'exceljs';
import {PassThrough} from 'node:stream';
import type {DatabaseSync} from 'node:sqlite';
import {accounts,ticketsBatch} from './pos-core.ts';
import {accountHistoryPage} from './account-history.ts';
import {keepCariTickets} from './pos-operations.ts';
import {paymentLabels,ticketLabel} from './pos-types.ts';
export function cariExcelStream(d:DatabaseSync,closeDatabase=false){
 const output=new PassThrough({highWaterMark:65536});let cancelled=false;output.on('close',()=>{cancelled=true;});
 const book=new ExcelJS.stream.xlsx.WorkbookWriter({stream:output,useStyles:true,useSharedStrings:false});book.creator='Natura Bistro';book.created=new Date();
 let transaction=false,count=0;
 async function row(s:ExcelJS.Worksheet,values:(string|number)[]){if(cancelled)throw Error('Excel indirme iptal edildi.');s.addRow(values).commit();if(++count%64===0){await new Promise<void>(resolve=>setImmediate(resolve));if(output.writableNeedDrain)await new Promise<void>((resolve,reject)=>{const cleanup=()=>{output.off('drain',drain);output.off('close',close);};const drain=()=>{cleanup();resolve();},close=()=>{cleanup();reject(Error('Excel indirme iptal edildi.'));};output.once('drain',drain);output.once('close',close);});}}
 function sheet(name:string,headers:string[],currency:number[]=[]){const s=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1}]});s.columns=headers.map((_,i)=>({width:i===0?26:24}));for(const col of currency)s.getColumn(col).numFmt='#,##0.00 "₺";[Red]-#,##0.00 "₺"';const h=s.addRow(headers);h.font={bold:true,color:{argb:'FFFFFFFF'}};h.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF305C3E'}};h.height=26;h.commit();s.autoFilter={from:{row:1,column:1},to:{row:1,column:headers.length}};return s;}
 async function* receipts(){let cursor='';while(true){const rows=d.prepare('SELECT id FROM pos_keep_tickets WHERE id>? ORDER BY id LIMIT 100').all(cursor);if(!rows.length)return;const batch=ticketsBatch(d,rows.map(r=>String(r.id)));for(const t of batch)yield t;cursor=String(rows.at(-1)!.id);}}
 async function produce(){try{
  d.exec('BEGIN');transaction=true;keepCariTickets(d);const all=d.prepare('SELECT * FROM pos_accounts ORDER BY name,id').all(),live=new Map(accounts(d).map(a=>[a.id,a])),names=new Map(all.map(a=>[String(a.id),String(a.name).toLocaleUpperCase('tr-TR')]));
  let s=sheet('Cari Hesaplar',['Cari kimliği','Cari adı','Telefon','Bakiye (TL)','Durum','Not'],[4]);for(const a of all)await row(s,[String(a.id),names.get(String(a.id))!,String(a.phone),Number(live.get(String(a.id))?.balance??0)/100,a.deleted_at?'Silinmiş':a.is_active?'Aktif':'Pasif',String(a.note)]);s.commit();
  s=sheet('Hesap Hareketleri',['Cari adı','Tarih','Adisyon kimliği','Hareket','Tutar (TL)','Ödeme türü','Çalışan'],[5]);for(const a of all){let cursor:string|undefined;do{const page=accountHistoryPage(d,String(a.id),cursor,100);for(const e of page.entries)await row(s,[names.get(String(a.id))!,e.created_at,e.ticket_id||'',e.note,e.amount/100,paymentLabels[e.method as keyof typeof paymentLabels]||e.method,e.actor]);cursor=page.next||undefined;}while(cursor);}s.commit();
  s=sheet('Fişler',['Adisyon kimliği','Fiş no','Hesap / masa','Cari adı','Açılış','Kapanış','Durum','Toplam (TL)','İndirim (TL)','Ödenen (TL)','Kalan (TL)','Not'],[8,9,10,11]);for await(const t of receipts())await row(s,[t.id,t.number,ticketLabel(t),t.linked_account_id?names.get(t.linked_account_id)||'':'',t.opened_at,t.closed_at||'',t.status==='open'?'Açık':'Kapalı',t.total/100,t.discount/100,t.paid/100,t.remaining/100,t.note]);s.commit();
  s=sheet('Ürün Detayları',['Adisyon kimliği','Fiş no','Ürün','Porsiyon','Adet','Ödenen adet','Birim fiyat (TL)','Satır tutarı (TL)','Durum','Not','Çalışan'],[7,8]);for await(const t of receipts())for(const l of t.lines)await row(s,[t.id,t.number,l.name,l.variant,l.quantity,l.paid_quantity||0,l.unit_price/100,l.quantity*l.unit_price/100,l.voided_at?'İptal':'Aktif',l.note,l.actor]);s.commit();
  s=sheet('Ödemeler',['Adisyon kimliği','Fiş no','Tarih','Yöntem','Cari adı','Tutar (TL)','Çalışan'],[6]);for await(const t of receipts())for(const p of t.payments)await row(s,[t.id,t.number,p.created_at,paymentLabels[p.method],p.account_name||'',p.amount/100,p.actor]);s.commit();
  s=sheet('İade ve Düzeltmeler',['Adisyon kimliği','Fiş no','Tarih','İşlem','Tutar (TL)','Yöntem','Neden','Çalışan'],[5]);for await(const t of receipts())for(const a of t.adjustments||[])await row(s,[t.id,t.number,a.created_at,a.kind==='refund'?'İade':'Ödeme düzeltmesi',a.amount/100,paymentLabels[a.method],a.reason,a.actor]);for(const a of d.prepare('SELECT * FROM pos_collection_adjustments ORDER BY created_at,id').iterate())await row(s,[String(a.ledger_id),0,String(a.created_at),a.kind==='refund'?'Cari tahsilat iadesi':'Cari tahsilat düzeltmesi',Number(a.amount)/100,paymentLabels[a.method as keyof typeof paymentLabels],String(a.reason),String(a.actor)]);s.commit();
  d.exec('COMMIT');transaction=false;await book.commit();
 }catch(error){if(transaction)try{d.exec('ROLLBACK');}catch{}output.destroy(error as Error);}finally{if(closeDatabase)d.close();}}
 setImmediate(()=>void produce());return output;
}
export async function cariExcel(d:DatabaseSync){const stream=cariExcelStream(d),chunks:Buffer[]=[];for await(const chunk of stream)chunks.push(Buffer.from(chunk));return Buffer.concat(chunks) as unknown as ExcelJS.Buffer;}
