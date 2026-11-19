import type {OperatorRole} from './employee-session.ts';
import type {PosCommand} from './pos-core.ts';
import type {Ticket} from './pos-types.ts';
import {PosError} from './pos-error.ts';
export function assertOrderPermission(role:OperatorRole,c:PosCommand,t?:Ticket){
 if(c.action==='reopen'&&role!=='admin')throw new PosError('Adisyon yeniden açma yetkisi yalnız yöneticiye ait.',403);
 if(role!=='waiter')return;
 if(!['open_order','add','note','line_note','quantity'].includes(c.action)||c.quick||t&&(t.service_type!=='table'||t.linked_account_id))throw new PosError('Garson masa siparişi, ürün adedi ve masa notunu düzenleyebilir.',403);
}
export function assertWaiterTicket(t:Ticket){if(t.service_type!=='table'||t.linked_account_id||t.status!=='open')throw new PosError('Bu adisyona erişim yetkiniz yok.',403);}
