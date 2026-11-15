import {z} from 'zod';
import {commandSchema} from './pos-validation';
import type {Ticket,TicketLine} from './pos-types';
import type {PosCommand} from './pos-core';
const line=z.object({id:z.string().startsWith('pending-'),ticket_id:z.string(),item_id:z.string().min(1).max(80),name:z.string().max(120),variant:z.string().max(120),unit_price:z.number().int().min(0).max(100000000),quantity:z.number().int().min(1).max(999),note:z.string().max(500),source:z.enum(['cashier','waiter','customer']),actor:z.string(),created_at:z.string(),voided_at:z.null(),void_reason:z.string()});
const schema=z.object({version:z.literal(1),dayId:z.string(),savedAt:z.number(),ticket:z.object({linked_account_id:z.string().uuid().nullable().optional(),id:z.string(),number:z.number(),table_number:z.number().nullable(),service_type:z.enum(['table','counter','takeaway']),account_name:z.string().max(120),version:z.number(),opened_at:z.string(),note:z.string().max(5000)}),pending:z.array(line).max(100),tableNote:z.string().max(500),quickName:z.string().max(120),quickType:z.enum(['counter','takeaway']),submission:z.object({id:z.string().uuid(),command:commandSchema}).nullable()});
export type OrderDraft={version:1;dayId:string;savedAt:number;ticket:Pick<Ticket,'id'|'number'|'table_number'|'service_type'|'account_name'|'version'|'opened_at'|'note'|'linked_account_id'>;pending:TicketLine[];tableNote:string;quickName:string;quickType:'counter'|'takeaway';submission:{id:string;command:PosCommand}|null};
const KEY='natura-pos-draft-v1';
export function readDraft():OrderDraft|null{try{const raw=localStorage.getItem(KEY);if(!raw||raw.length>250000)return null;const data=schema.parse(JSON.parse(raw));if(Date.now()-data.savedAt>12*60*60*1000||data.savedAt>Date.now()+60000){clearDraft();return null;}return data as OrderDraft;}catch{clearDraft();return null;}}
export function saveDraft(draft:OrderDraft){try{localStorage.setItem(KEY,JSON.stringify(draft));return true;}catch{return false;}}
export function clearDraft(){try{localStorage.removeItem(KEY);}catch{/* Storage can be disabled by the browser. */}}
