import {cookies} from 'next/headers';
import {db} from './db';
import {validSession} from './auth';
import {employeeSession} from './employee-session';
import {sameOrigin} from './security';
import {HttpError} from './api';
import {adminUsername} from './usernames';
export async function currentOperator(){const c=await cookies();if(validSession(c.get('natura_session')?.value))return {id:'admin',username:adminUsername(db()),role:'admin' as const,actor:'Kasa',name:'Yönetici'};return employeeSession(db(),c.get('natura_staff')?.value);}
export async function requireOperator(req?:Request){const op=await currentOperator();if(!op)throw new HttpError(401,'Lütfen giriş yapın.');if(req&&!['GET','HEAD'].includes(req.method)&&!sameOrigin(req))throw new HttpError(403,'Geçersiz istek kaynağı.');return op;}
export async function requireCashier(req?:Request){const op=await requireOperator(req);if(op.role==='waiter')throw new HttpError(403,'Bu işlem için kasiyer yetkisi gerekiyor.');return op;}
