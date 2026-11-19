import {z} from 'zod';
import {requireAdmin,jsonBody,noStore} from '@/lib/api';
import {listUsers,saveUser,removeUser} from '@/lib/users';
import {posErrorResponse} from '@/lib/pos-response';
const schema=z.object({id:z.string().max(120).optional(),name:z.string().trim().min(1).max(80),username:z.string().trim().min(1).max(254).regex(/^[\p{L}\p{N}][\p{L}\p{N}._@+\-]*$/u,'Geçerli bir kullanıcı adı girin.'),role:z.enum(['admin','cashier','waiter','kitchen']),is_active:z.boolean(),password:z.string().max(128).optional()}).strict();
export async function GET(){try{await requireAdmin();return Response.json(await listUsers(),{headers:noStore});}catch(error){return posErrorResponse(error);}}
export async function POST(req:Request){try{const actor=await requireAdmin(req);const input=schema.parse(await jsonBody(req));await saveUser(input,actor.id);return Response.json({ok:true,reauthenticate:input.id===actor.id});}catch(error){return posErrorResponse(error);}}
export async function DELETE(req:Request){try{const actor=await requireAdmin(req),input=z.object({id:z.string().min(1).max(120)}).parse(await jsonBody(req));await removeUser(input.id,actor.id);return Response.json({ok:true});}catch(error){return posErrorResponse(error);}}
