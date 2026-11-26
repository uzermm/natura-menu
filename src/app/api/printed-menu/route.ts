import {printedMenuSnapshot} from '@/lib/printed-menu-snapshot';
import {errorResponse,noStore} from '@/lib/api';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(printedMenuSnapshot(),{headers:noStore});}catch(error){return errorResponse(error);}}
