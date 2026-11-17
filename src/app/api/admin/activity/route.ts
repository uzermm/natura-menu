import {requireOperator} from '@/lib/operator';
import {liveSnapshot} from '@/lib/live-hub';
import { errorResponse,noStore } from '@/lib/api';
export async function GET(){try{await requireOperator();return Response.json(liveSnapshot(),{headers:noStore});}catch(error){return errorResponse(error);}}
