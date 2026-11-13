import { cookies } from 'next/headers';
import { errorResponse, requireAdmin } from '@/lib/api';
export async function POST(req:Request) {try {await requireAdmin(req);(await cookies()).delete('natura_session');return Response.json({ok:true});}catch(e){return errorResponse(e);}}
