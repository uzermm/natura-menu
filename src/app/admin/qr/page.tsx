import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validSession } from '@/lib/auth';
import { getSettings } from '@/lib/db';
import PrintQr from '@/components/print-qr';
export const dynamic='force-dynamic';
export const metadata={title:'Masa QR Kodları | Natura Bistro',robots:{index:false,follow:false}};
export default async function QrPage(){if(!validSession((await cookies()).get('natura_session')?.value))redirect('/admin/login');return <PrintQr count={getSettings().table_count}/>;}
