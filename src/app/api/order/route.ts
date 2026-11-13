import { getCategories,getSettings } from '@/lib/db';
import { cartSchema } from '@/lib/validation';
import { priceCart } from '@/lib/order';
import { validTable } from '@/lib/security';
import { money } from '@/lib/types';
import { requireOrigin,errorResponse,jsonBody,limited,clientKey,HttpError } from '@/lib/api';
export async function POST(req:Request){try{
 requireOrigin(req);if(limited(`order:${clientKey(req)}`,20,60000))throw new HttpError(429,'Lütfen biraz bekleyin.');
 const input=cartSchema.parse(await jsonBody(req));const settings=getSettings();
 if(input.table&&!validTable(input.table,input.key,settings.table_count))throw new HttpError(400,'Masa bilgisi geçersiz. QR kodu yeniden okutun.');
 let lines;try{lines=priceCart(getCategories(),input.lines);}catch(e){throw new HttpError(409,(e as Error).message);}
 const total=lines.reduce((sum,l)=>sum+l.unitPrice*l.quantity,0);
 const message=['Merhaba Natura Bistro! 🌿',input.table?`Masa: ${input.table}`:'Paket sipariş talebi', '',...lines.map(l=>`${l.quantity} × ${l.name}${l.variant?` (${l.variant})`:''} — ${money(l.unitPrice*l.quantity)}`),'',`Toplam: ${money(total)}`,input.note?`Not: ${input.note}`:'','Siparişimi onaylar mısınız?'].filter(Boolean).join('\n');
 return Response.json({url:`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(message)}`,total});
}catch(e){return errorResponse(e);}}
