import {requireOrigin,errorResponse,HttpError} from '@/lib/api';
export async function POST(req:Request){try{requireOrigin(req);throw new HttpError(403,'Çalışan girişi ve yetkileri henüz açılmadı.');}catch(error){return errorResponse(error);}}
