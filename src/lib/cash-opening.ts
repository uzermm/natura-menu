import type {DatabaseSync} from 'node:sqlite';
import {cashBreakdownSchema,cashTotal,type CashBreakdown} from './cash-breakdown.ts';
import {PosError} from './pos-error.ts';

export function openingPreset(d:DatabaseSync){const row=d.prepare('SELECT breakdown,version FROM pos_cash_settings WHERE id=1').get()!;return {breakdown:cashBreakdownSchema.parse(JSON.parse(String(row.breakdown))),version:Number(row.version)};}
export function saveOpeningPreset(d:DatabaseSync,breakdown:CashBreakdown,version:number){const rows=cashBreakdownSchema.parse(breakdown);if(!d.prepare('UPDATE pos_cash_settings SET breakdown=?,version=version+1 WHERE id=1 AND version=?').run(JSON.stringify(rows),version).changes)throw new PosError('Açılış şablonu değişti. Yenileyip tekrar kontrol edin.',409);return openingPreset(d);}
// The caller wraps this operation and its event/idempotency entry in one transaction.
export function recordOpeningCash(d:DatabaseSync,amount:number,breakdown:CashBreakdown|undefined,version:number|undefined,note:string){
 const day=d.prepare('SELECT opening_cash,opening_version FROM pos_day WHERE id=1').get()!;
 if(!Number.isSafeInteger(amount)||amount<0||amount>100000000)throw new PosError('Geçerli bir açılış tutarı girin.');
 const rows=breakdown===undefined?null:cashBreakdownSchema.parse(breakdown);
 if(rows&&cashTotal(rows)!==amount)throw new PosError('Açılış tutarı para dökümüyle uyuşmuyor.');
 if(day.opening_cash!==null&&version===undefined)throw new PosError('Açılış kasası zaten girilmiş.');
 if((version??0)!==Number(day.opening_version))throw new PosError('Açılış kasası değişti. Yenileyip tekrar kontrol edin.',409);
 if(day.opening_cash!==null&&Number(day.opening_cash)!==amount&&!note.trim())throw new PosError('Açılış tutarı değişikliği için açıklama girin.');
 d.prepare('UPDATE pos_day SET opening_cash=?,opening_breakdown=?,opening_version=opening_version+1 WHERE id=1').run(amount,rows?JSON.stringify(rows):null);
}
