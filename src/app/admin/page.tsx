import {currentOperator} from '@/lib/operator';
import { redirect } from 'next/navigation';
import { getCategories,getSettings,getCalls } from '@/lib/db';
import AdminPanel from '@/components/admin-panel';
export const dynamic='force-dynamic';
export const metadata={title:'Yönetim | Natura Bistro',robots:{index:false,follow:false}};
export default async function AdminPage(){const operator=await currentOperator();if(!operator)redirect('/admin/login');return <AdminPanel operator={operator} initial={{categories:getCategories(true),settings:getSettings(),calls:getCalls()}}/>;}
