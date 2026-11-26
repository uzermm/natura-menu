import {getCategories} from '@/lib/db';
import PrintedMenu from './printed-menu';
export const dynamic='force-dynamic';
export const metadata={title:'Natura Bistro • Basılı Menü',robots:{index:false,follow:false}};
export default function Page(){return <PrintedMenu categories={getCategories()}/>;}
