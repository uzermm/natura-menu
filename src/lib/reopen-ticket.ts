import type {DatabaseSync} from 'node:sqlite';
import type {Ticket} from './pos-types.ts';
import {PosError} from './pos-error.ts';
export function reopenTicket(d:DatabaseSync,t:Ticket,dayId:string,reason:string){
 if(!reason.trim()||reason.length>500)throw new PosError('Yeniden açma nedenini yazın.');
 if(t.status!=='closed'||t.merged_into)throw new PosError('Yalnız kapatılmış, birleştirilmemiş adisyon yeniden açılabilir.');
 if(d.prepare('SELECT closed_day_id FROM pos_tickets WHERE id=?').get(t.id)?.closed_day_id!==dayId)throw new PosError('Yalnız açık gün içinde kapanan adisyonlar yeniden açılabilir.');
 if(t.service_type==='table'&&d.prepare("SELECT 1 FROM pos_tickets WHERE table_number=? AND service_type='table' AND status='open'").get(t.table_number))throw new PosError('Bu masada başka bir açık adisyon var. Önce o hesabı kapatın veya taşıyın.',409);
 if(t.linked_account_id){if(!d.prepare('SELECT 1 FROM pos_accounts WHERE id=? AND is_active=1 AND deleted_at IS NULL').get(t.linked_account_id))throw new PosError('Cari hesap aktif değil.');if(d.prepare("SELECT 1 FROM pos_tickets WHERE linked_account_id=? AND status='open'").get(t.linked_account_id))throw new PosError('Bu caride başka bir açık adisyon var.',409);}
 d.prepare("UPDATE pos_tickets SET status='open',closed_at=NULL,closed_day_id='' WHERE id=?").run(t.id);
}
