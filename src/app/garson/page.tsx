import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { readStaffSession } from '@/lib/operator';
import { getCategories,getSettings } from '@/lib/db';
import { StaffPanel } from '@/components/staff-panel';
export const dynamic='force-dynamic';
export const metadata={title:'Garson | Natura Bistro',robots:{index:false,follow:false}};
export default async function Page(){const staff=readStaffSession((await cookies()).get('natura_staff')?.value);if(!staff)redirect('/garson/giris');return <StaffPanel name={staff.name} categories={getCategories()} tableCount={getSettings().table_count}/>;}
