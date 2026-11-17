import {requireCashier} from '@/lib/operator';
import { randomUUID } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { dataDir } from '@/lib/db';
import { errorResponse,HttpError } from '@/lib/api';
export const runtime='nodejs';
export async function POST(req:Request){try{
 await requireCashier(req);
 if(Number(req.headers.get('content-length')||0)>12*1024*1024)throw new HttpError(413,'Görsel en fazla 10 MB olmalı.');
 const data=await req.formData();const file=data.get('file');
 if(!(file instanceof File)||file.size>10*1024*1024||file.size===0)throw new HttpError(400,'En fazla 10 MB boyutunda bir görsel seçin.');
 const buffer=Buffer.from(await file.arrayBuffer());
 const metadata=await sharp(buffer,{limitInputPixels:40000000}).metadata();
 if(!['jpeg','png','webp','avif','heif'].includes(metadata.format||''))throw new HttpError(400,'JPG, PNG, WebP veya AVIF kullanın.');
 const id=randomUUID(),dir=path.join(dataDir,'uploads');await mkdir(dir,{recursive:true});
 const large=await sharp(buffer,{limitInputPixels:40000000}).rotate().resize(1000,1000,{fit:'inside',withoutEnlargement:true}).webp({quality:84,effort:6}).toBuffer();
 const small=await sharp(buffer,{limitInputPixels:40000000}).rotate().resize(480,480,{fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:6}).toBuffer();
 await writeFile(path.join(dir,`${id}.webp`),large);await writeFile(path.join(dir,`${id}-sm.webp`),small);
 return Response.json({url:`/media/${id}.webp`,bytes:large.length+small.length,originalBytes:file.size});
}catch(e){return errorResponse(e);}}
