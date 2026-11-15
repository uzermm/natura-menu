import { getCategories,getSettings } from '@/lib/db';
import { requireOperator } from '@/lib/operator';
import { noStore } from '@/lib/api';
import { posErrorResponse } from '@/lib/pos-response';
export async function GET(req:Request){try{await requireOperator(req);return Response.json({categories:getCategories(true),table_count:getSettings().table_count},{headers:noStore});}catch(error){return posErrorResponse(error);}}
