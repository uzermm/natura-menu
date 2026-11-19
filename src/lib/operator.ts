import {cookies} from 'next/headers';
import {db} from './db';
import {validSession} from './auth';
import {employeeSession} from './employee-session';
import {sameOrigin} from './security';
import {HttpError} from './api';
import {adminUsername} from './usernames';
import {onlineRuntime} from './online-runtime';
export async function currentOperator(){const c=await cookies();if(validSession(c.get('natura_session')?.value))return {id:'admin',username:adminUsername(db()),role:'admin' as const,actor:'Kasa',name:'Yönetici',onlineAdmin:true,onlineUserId:undefined as string|undefined};const employee=employeeSession(db(),c.get('natura_staff')?.value),token=c.get('__Host-om_session')?.value,portal=token?await(await onlineRuntime()).legacyOperator(token):null;if(employee){if(portal&&portal.username.normalize('NFKC').toLowerCase()===employee.username.normalize('NFKC').toLowerCase())return {...employee,onlineAdmin:portal.role==='online_admin',onlineUserId:portal.id.slice(7)};return employee;}return portal;}
export function isCafeOperator(role:string){return ['admin','cashier','waiter'].includes(role);}
export async function requireOperator(req?:Request){const op=await currentOperator();if(!op)throw new HttpError(401,'Lütfen giriş yapın.');if(!isCafeOperator(op.role))throw new HttpError(403,'Bu hesap yalnız online sipariş bölümüne erişebilir.');if(req&&!['GET','HEAD'].includes(req.method)&&!sameOrigin(req))throw new HttpError(403,'Geçersiz istek kaynağı.');return op;}
export async function requireCashier(req?:Request){const op=await requireOperator(req);if(!['admin','cashier'].includes(op.role))throw new HttpError(403,'Bu işlem için kasiyer yetkisi gerekiyor.');return op;}
