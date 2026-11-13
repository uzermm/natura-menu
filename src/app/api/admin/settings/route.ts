import { db } from '@/lib/db';
import { settingsSchema } from '@/lib/validation';
import { requireAdmin,errorResponse,jsonBody } from '@/lib/api';
export async function POST(req:Request){try {await requireAdmin(req);const settings=settingsSchema.parse(await jsonBody(req));db().prepare('UPDATE settings SET value=? WHERE id=1').run(JSON.stringify(settings));return Response.json({ok:true});}catch(e){return errorResponse(e);}}
