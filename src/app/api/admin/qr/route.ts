import QRCode from 'qrcode';
import { getSettings } from '@/lib/db';
import { tableKey } from '@/lib/security';
import { requireAdmin,errorResponse,HttpError,noStore } from '@/lib/api';
export async function GET(req:Request){try{
 await requireAdmin();const table=Number(new URL(req.url).searchParams.get('table'));
 if(!Number.isInteger(table)||table<1||table>getSettings().table_count)throw new HttpError(400,'Geçersiz masa.');
 const url=new URL(process.env.APP_URL||new URL(req.url).origin);url.searchParams.set('table',String(table));url.searchParams.set('key',tableKey(table));
 const svg=await QRCode.toString(url.toString(),{type:'svg',width:320,margin:3,errorCorrectionLevel:'M',color:{dark:'#243d2d',light:'#ffffff'}});
 return new Response(svg,{headers:{...noStore,'Content-Type':'image/svg+xml','Content-Disposition':`inline; filename="natura-masa-${table}.svg"`}});
}catch(e){return errorResponse(e);}}
