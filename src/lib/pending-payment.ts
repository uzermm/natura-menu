import {z} from 'zod';
import {commandSchema} from './pos-validation.ts';
import {draftStorageKey} from './order-draft.ts';
const schema=z.object({id:z.string().uuid(),dayId:z.string().uuid(),command:commandSchema});
export type PendingPayment=z.infer<typeof schema>;
export function readPendingPayment():PendingPayment|null{try{const key=draftStorageKey('pending-payment-v1'),raw=key&&localStorage.getItem(key);return raw?schema.parse(JSON.parse(raw)):null;}catch{return null;}}
export function savePendingPayment(value:PendingPayment){try{const key=draftStorageKey('pending-payment-v1');if(!key)return false;localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
export function clearPendingPayment(){try{const key=draftStorageKey('pending-payment-v1');if(key)localStorage.removeItem(key);}catch{}}
