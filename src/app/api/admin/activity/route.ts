import { db,getCalls } from '@/lib/db';
import { requireAdmin,errorResponse,noStore } from '@/lib/api';
export async function GET(){try{await requireAdmin();return Response.json({calls:getCalls(),pending_order_ids:db().prepare("SELECT id FROM pos_orders WHERE status='pending'").all().map(row=>String(row.id))},{headers:noStore});}catch(error){return errorResponse(error);}}
