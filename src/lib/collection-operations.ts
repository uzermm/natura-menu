import {randomUUID} from 'node:crypto';
import type {DatabaseSync} from 'node:sqlite';
import {PosError} from './pos-error.ts';
import {businessDay,rejectExpiredRequest} from './pos-operations.ts';
export function initCollections(d:DatabaseSync){d.exec(`CREATE TABLE IF NOT EXISTS pos_collection_adjustments(id TEXT PRIMARY KEY,ledger_id TEXT NOT NULL REFERENCES pos_ledger(id),kind TEXT NOT NULL CHECK(kind IN ('refund','correction')),amount INTEGER NOT NULL CHECK(amount>0),method TEXT NOT NULL,reason TEXT NOT NULL,actor TEXT NOT NULL,created_at TEXT NOT NULL,day_id TEXT NOT NULL,replacement_id TEXT REFERENCES pos_ledger(id));CREATE INDEX IF NOT EXISTS pos_collection_adjustment_ledger ON pos_collection_adjustments(ledger_id);CREATE INDEX IF NOT EXISTS pos_collection_adjustment_day ON pos_collection_adjustments(day_id,method);`);}
export type CollectionChange={request_id:string;day_id:string;ledger_id:string;action:'refund'|'correct';amount?:number;method?:'cash'|'card'|'meal_card';reason:string};
export function adjustCollection(d:DatabaseSync,c:CollectionChange,actor:string){d.exec('BEGIN IMMEDIATE');try{
 rejectExpiredRequest(d,c.request_id);const payload=JSON.stringify({c,actor}),old=d.prepare('SELECT payload FROM pos_requests WHERE id=?').get(c.request_id);if(old){if(old.payload!==payload)throw new PosError('İşlem anahtarı kullanılmış.',409);d.exec('COMMIT');return {ok:true};}
 const day=businessDay(d);if(c.day_id!==day.day_id)throw new PosError('Gün değişti. Ekranı yenileyin.',409);
 const entry=d.prepare(`SELECT l.*, -l.amount-COALESCE((SELECT SUM(a.amount) FROM pos_collection_adjustments a WHERE a.ledger_id=l.id),0) AS available FROM pos_ledger l WHERE l.id=? AND l.ticket_id IS NULL AND l.amount<0 AND l.method IN ('cash','card','meal_card')`).get(c.ledger_id);if(!entry)throw new PosError('Tahsilat bulunamadı.',404);
 const amount=c.action==='refund'?c.amount!:Number(entry.available);if(!Number.isSafeInteger(amount)||amount<=0||amount>Number(entry.available))throw new PosError('Tutar kalan tahsilatı aşıyor.');
 const reason=c.reason.trim();if(!reason||reason.length>500)throw new PosError('İşlem nedenini yazın.');if(c.action==='correct'&&(entry.day_id!==day.day_id||!c.method||!['cash','card','meal_card'].includes(c.method)||c.method===entry.method))throw new PosError('Açık günün tahsilatı için farklı bir ödeme türü seçin.');
 const now=new Date().toISOString(),id=randomUUID(),replacement=c.action==='correct'?randomUUID():null;
 d.prepare('UPDATE pos_accounts SET deleted_at=NULL,is_active=0 WHERE id=? AND deleted_at IS NOT NULL').run(entry.account_id);
 d.prepare('INSERT INTO pos_ledger(id,account_id,ticket_id,amount,method,note,actor,created_at,day_id) VALUES(?,?,NULL,?,?,?,?,?,?)').run(randomUUID(),entry.account_id,amount,c.action==='refund'?'collection_refund':'collection_correction',reason,actor,now,day.day_id);
 if(replacement)d.prepare('INSERT INTO pos_ledger(id,account_id,ticket_id,amount,method,note,actor,created_at,day_id) VALUES(?,?,NULL,?,?,?,?,?,?)').run(replacement,entry.account_id,-amount,c.method!,reason,actor,now,day.day_id);
 d.prepare('INSERT INTO pos_collection_adjustments VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,c.ledger_id,c.action==='refund'?'refund':'correction',amount,entry.method,reason,actor,now,day.day_id,replacement);
 d.prepare('INSERT INTO pos_events VALUES(?,NULL,?,?,?,?)').run(randomUUID(),'collection_'+c.action,actor,JSON.stringify(c),now);d.prepare('INSERT INTO pos_requests VALUES(?,?,?,?)').run(c.request_id,payload,'collection',now);d.exec('COMMIT');return {ok:true};
 }catch(error){d.exec('ROLLBACK');throw error;}}
