import {requireOperator} from '@/lib/operator';
import { getCalls,getCategories,getSettings } from '@/lib/db';
import { errorResponse,noStore } from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(){try {await requireOperator();return Response.json({categories:getCategories(true),settings:getSettings(),calls:getCalls()},{headers:noStore});}catch(e){return errorResponse(e);}}
