import {requireAdmin,errorResponse,HttpError} from '@/lib/api';
async function disabled(req?:Request){try{await requireAdmin(req);throw new HttpError(410,'Eski garson hesapları servisi kaldırıldı. Çalışanlar bölümünü kullanın.');}catch(error){return errorResponse(error);}}
export const GET=()=>disabled();
export const POST=(req:Request)=>disabled(req);
