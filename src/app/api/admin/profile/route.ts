import {cookies} from 'next/headers';
import {z} from 'zod';
import {db,transaction} from '@/lib/db';
import {requireAdmin,jsonBody,HttpError,noStore,limited,clientKey} from '@/lib/api';
import {validPassword,makeSession} from '@/lib/auth';
import {adminUsername,renameAdmin,usernameSchema} from '@/lib/usernames';
import {posErrorResponse} from '@/lib/pos-response';
export async function GET(){try{await requireAdmin();return Response.json({username:adminUsername(db())},{headers:noStore});}catch(e){return posErrorResponse(e);}}
export async function POST(req:Request){try{await requireAdmin(req);if(limited('profile:'+clientKey(req),5,15*60*1000))throw new HttpError(429,'Çok fazla deneme. 15 dakika sonra tekrar deneyin.');const v=z.object({username:usernameSchema,currentPassword:z.string().min(1).max(256)}).parse(await jsonBody(req));transaction(()=>{if(!validPassword(v.currentPassword))throw new HttpError(400,'Mevcut şifre yanlış.');renameAdmin(db(),v.username);});(await cookies()).set('natura_session',makeSession(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:12*60*60});return Response.json({ok:true,username:v.username});}catch(e){return posErrorResponse(e);}}
