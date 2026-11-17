import ExcelJS from 'exceljs';
import type {DatabaseSync} from 'node:sqlite';
import {accounts,accountHistory,ticket} from './pos-core.ts';
import {cariExport} from './pos-operations.ts';
import {paymentLabels,ticketLabel} from './pos-types.ts';
export async function cariExcel(d:DatabaseSync){
 const snapshot=cariExport(d),book=new ExcelJS.Workbook();book.creator='Natura Bistro';book.created=new Date();
 function sheet(name:string,headers:string[],rows:(string|number)[][],currency:number[]=[]){const s=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1}]});s.addRow(headers);s.addRows(rows);s.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,s.rowCount),column:headers.length}};s.columns.forEach((c,i)=>{c.width=i===0?26:24;});s.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};s.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF305C3E'}};s.getRow(1).height=26;for(const col of currency)s.getColumn(col).numFmt='#,##0.00 "₺";[Red]-#,##0.00 "₺"';return s;}
 const live=new Map(accounts(d).map(a=>[a.id,a]));const names=new Map(snapshot.tables.accounts.map(a=>[String(a.id),String(a.name).toLocaleUpperCase('tr-TR')]));
 sheet('Cari Hesaplar',['Cari kimliği','Cari adı','Telefon','Bakiye (TL)','Durum','Not'],snapshot.tables.accounts.map(a=>[String(a.id),names.get(String(a.id))!,String(a.phone),Number(live.get(String(a.id))?.balance??0)/100,a.deleted_at?'Silinmiş':a.is_active?'Aktif':'Pasif',String(a.note)]),[4]);
 sheet('Hesap Hareketleri',['Cari adı','Tarih','Adisyon kimliği','Hareket','Tutar (TL)','Ödeme türü','Çalışan'],snapshot.tables.accounts.flatMap(a=>accountHistory(d,String(a.id)).map(e=>[names.get(String(a.id))!,e.created_at,e.ticket_id||'',e.note,e.amount/100,paymentLabels[e.method as keyof typeof paymentLabels]||e.method,e.actor])),[5]);
 const receipts=snapshot.tables.tickets.map(t=>ticket(d,String(t.id)));
 sheet('Fişler',['Adisyon kimliği','Fiş no','Hesap / masa','Cari adı','Açılış','Kapanış','Durum','Toplam (TL)','İndirim (TL)','Ödenen (TL)','Kalan (TL)','Not'],receipts.map(t=>[t.id,t.number,ticketLabel(t),t.linked_account_id?names.get(t.linked_account_id)||'':'',t.opened_at,t.closed_at||'',t.status==='open'?'Açık':'Kapalı',t.total/100,t.discount/100,t.paid/100,t.remaining/100,t.note]),[8,9,10,11]);
 sheet('Ürün Detayları',['Adisyon kimliği','Fiş no','Ürün','Porsiyon','Adet','Ödenen adet','Birim fiyat (TL)','Satır tutarı (TL)','Durum','Not','Çalışan'],receipts.flatMap(t=>t.lines.map(l=>[t.id,t.number,l.name,l.variant,l.quantity,l.paid_quantity||0,l.unit_price/100,l.quantity*l.unit_price/100,l.voided_at?'İptal':'Aktif',l.note,l.actor])),[7,8]);
 sheet('Ödemeler',['Adisyon kimliği','Fiş no','Tarih','Yöntem','Cari adı','Tutar (TL)','Çalışan'],receipts.flatMap(t=>t.payments.map(p=>[t.id,t.number,p.created_at,paymentLabels[p.method],p.account_name||'',p.amount/100,p.actor])),[6]);
 sheet('İade ve Düzeltmeler',['Adisyon kimliği','Fiş no','Tarih','İşlem','Tutar (TL)','Yöntem','Neden','Çalışan'],receipts.flatMap(t=>(t.adjustments||[]).map(a=>[t.id,t.number,a.created_at,a.kind==='refund'?'İade':'Ödeme düzeltmesi',a.amount/100,paymentLabels[a.method],a.reason,a.actor])),[5]);
 return book.xlsx.writeBuffer();
}
