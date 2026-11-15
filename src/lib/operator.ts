import {requireAdmin} from './api';
export async function requireOperator(req?:Request){await requireAdmin(req&&!['GET','HEAD'].includes(req.method)?req:undefined);return {role:'admin' as const,actor:'Kasa',name:'Kasa'};}
