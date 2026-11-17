import {usernameSchema,assertUsernameAvailable} from '@/lib/usernames';
import {posErrorResponse} from '@/lib/pos-response';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {db,transaction} from '@/lib/db';
import {requireAdmin,jsonBody,HttpError,noStore} from '@/lib/api';
import {hashPassword} from '@/lib/security';
import {recordPosEvent} from '@/lib/pos-core';
const schema=z.object({id:z.string().uuid().optional(),name:z.string().trim().min(1).max(80),username:usernameSchema,password:z.string().min(8).max(256).optional(),role:z.enum(['cashier','waiter']),is_active:z.boolean()}).strict();
export async function GET(){try{await requireAdmin();return Response.json(db().prepare('SELECT id,name,username,role,is_active FROM employees ORDER BY name').all().map(e=>({...e,is_active:!!e.is_active,permissions:[]})),{headers:noStore});}catch(error){return posErrorResponse(error);}}
export async function POST(req:Request){try{await requireAdmin(req);const v=schema.parse(await jsonBody(req)),d=db();return transaction(()=>{const old=v.id?d.prepare('SELECT * FROM employees WHERE id=?').get(v.id):undefined;if(v.id&&!old)throw new HttpError(404,'Çalışan bulunamadı.');if(!old&&!v.password)throw new HttpError(400,'Yeni çalışan için şifre girin.');assertUsernameAvailable(d,v.username,v.id);d.prepare("INSERT INTO employees(id,username,name,password_hash,role,is_active,permissions) VALUES(?,?,?,?,?,?,'[]') ON CONFLICT(id) DO UPDATE SET username=excluded.username,name=excluded.name,password_hash=excluded.password_hash,role=excluded.role,is_active=excluded.is_active,permissions='[]'").run(v.id||randomUUID(),v.username,v.name,v.password?hashPassword(v.password):String(old!.password_hash),v.role,Number(v.is_active));recordPosEvent(d,'employee_save','Kasa',{username:v.username,role:v.role,permissions:[]});return Response.json({ok:true,permissions:[]});});}catch(error){return posErrorResponse(error);}}
