import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { validSession } from '@/lib/auth';
import { getCategories,getSettings,getCalls } from '@/lib/db';
import AdminPanel from '@/components/admin-panel';
export const dynamic='force-dynamic';
export const metadata={title:'Yönetim | Natura Bistro',robots:{index:false,follow:false}};
export default async function AdminPage(){if(!validSession((await cookies()).get('natura_session')?.value))redirect('/admin/login');return <AdminPanel initial={{categories:getCategories(true),settings:getSettings(),calls:getCalls()}}/>;}
