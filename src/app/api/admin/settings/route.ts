import { db,getCategories } from '@/lib/db';
import { settingsSchema } from '@/lib/validation';
import { resolveCampaign } from '@/lib/campaign';
import { requireAdmin,errorResponse,jsonBody,HttpError } from '@/lib/api';
export async function POST(req:Request){try {await requireAdmin(req);const settings=settingsSchema.parse(await jsonBody(req));if(settings.campaign&&!resolveCampaign(getCategories(),settings.campaign))throw new HttpError(400,'Kampanya için görseli bulunan, satıştaki bir ürün ve geçerli porsiyon seçin. Kampanya fiyatı menü fiyatından düşük olmalı.');if(!settings.version||!db().prepare('UPDATE settings SET value=?,version=version+1 WHERE id=1 AND version=?').run(JSON.stringify(settings),settings.version).changes)throw new HttpError(409,'Ayarlar başka bir ekranda değişti. Sayfayı yenileyin.');return Response.json({ok:true});}catch(e){return errorResponse(e);}}
