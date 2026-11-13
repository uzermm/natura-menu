import { getCategories,getSettings } from '@/lib/db';
import { validTable } from '@/lib/security';
import Menu from '@/components/menu';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{table?:string;key?:string}>}) {
 const params=await searchParams,settings=getSettings();const table=Number(params.table),key=params.key||'';
 const verified=validTable(table,key,settings.table_count);
 return <Menu categories={getCategories()} settings={settings} table={verified?table:0} invalidTable={!!params.table&&!verified}/>;
}
