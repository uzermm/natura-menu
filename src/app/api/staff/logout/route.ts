import { cookies } from 'next/headers';
import { requireOrigin,errorResponse } from '@/lib/api';
export async function POST(req:Request){try{requireOrigin(req);(await cookies()).delete('natura_staff');return Response.json({ok:true});}catch(error){return errorResponse(error);}}
