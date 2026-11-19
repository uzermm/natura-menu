import type {DatabaseSync} from 'node:sqlite';
import {ticketsBatch} from './pos-core.ts';
import {businessDay} from './pos-operations.ts';
import {PosError} from './pos-error.ts';
import type {AccountEntry} from './pos-types.ts';
export function accountHistoryPage(d:DatabaseSync,id:string,before?:string,limit=60){
 if(!d.prepare('SELECT 1 FROM pos_accounts WHERE id=?').get(id))throw new PosError('Cari hesap bulunamadı.',404);
 let date='',cursor='';if(before){try{const v=JSON.parse(Buffer.from(before,'base64url').toString());if(typeof v.date!=='string'||typeof v.id!=='string'||before.length>400)throw Error();date=v.date;cursor=v.id;}catch{throw new PosError('Geçersiz sayfa.');}}
 const rows=d.prepare(`WITH history AS (
 SELECT id,created_at,'ledger' AS kind FROM pos_ledger WHERE account_id=?
 UNION ALL SELECT id,opened_at,'ticket' FROM pos_tickets WHERE linked_account_id=?
 UNION ALL SELECT p.id,p.created_at,'payment' FROM pos_payments p JOIN pos_tickets t ON t.id=p.ticket_id WHERE t.linked_account_id=? AND p.amount-COALESCE((SELECT SUM(a.amount) FROM pos_payment_adjustments a WHERE a.payment_id=p.id),0)>0)
 SELECT * FROM history WHERE ?='' OR created_at<? OR (created_at=? AND id<?) ORDER BY created_at DESC,id DESC LIMIT ?`).all(id,id,id,date,date,date,cursor,limit+1);
 const page=rows.slice(0,limit),entries:AccountEntry[]=[];
 const ticketIds=page.filter(r=>r.kind==='ticket').map(r=>String(r.id));const tickets=new Map(ticketsBatch(d,ticketIds).map(t=>[t.id,t]));
 const ledgerIds=page.filter(r=>r.kind==='ledger').map(r=>String(r.id)),paymentIds=page.filter(r=>r.kind==='payment').map(r=>String(r.id));
 const ledger=new Map((ledgerIds.length?d.prepare(`SELECT l.*,CASE WHEN ticket_id IS NULL AND amount<0 AND method IN ('cash','card','meal_card') THEN -amount-COALESCE((SELECT SUM(a.amount) FROM pos_collection_adjustments a WHERE a.ledger_id=l.id),0) ELSE 0 END AS collection_available FROM pos_ledger l WHERE id IN (${ledgerIds.map(()=>'?').join(',')})`).all(...ledgerIds):[]).map(r=>[String(r.id),r]));
 const payments=new Map((paymentIds.length?d.prepare(`SELECT p.*,p.amount-COALESCE((SELECT SUM(a.amount) FROM pos_payment_adjustments a WHERE a.payment_id=p.id),0) AS net FROM pos_payments p WHERE id IN (${paymentIds.map(()=>'?').join(',')})`).all(...paymentIds):[]).map(r=>[String(r.id),r]));
 for(const row of page){if(row.kind==='ledger'){entries.push(ledger.get(String(row.id)) as unknown as AccountEntry);}else if(row.kind==='ticket'){const t=tickets.get(String(row.id))!;entries.push({id:t.id,account_id:id,ticket_id:t.id,amount:t.total,method:'account',note:'Cari siparişi #'+t.number+' · '+(t.status==='open'?'Açık':'Kapandı'),actor:'Kasa',created_at:t.opened_at});}else{const p=payments.get(String(row.id))!;entries.push({id:String(p.id),account_id:id,ticket_id:String(p.ticket_id),amount:-Number(p.net),method:String(p.method),note:String(p.reference)||'Cari sipariş tahsilatı',actor:String(p.actor),created_at:String(p.created_at)});}}
 const last=page.at(-1);return {entries,day_id:businessDay(d).day_id,next:rows.length>limit&&last?Buffer.from(JSON.stringify({date:last.created_at,id:last.id})).toString('base64url'):null};
}
