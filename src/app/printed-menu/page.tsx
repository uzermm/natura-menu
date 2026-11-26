import {printedMenuSnapshot} from '@/lib/printed-menu-snapshot';
import PrintedMenu from './printed-menu';
export const dynamic='force-dynamic';
export const metadata={title:'Natura Bistro • Basılı Menü',robots:{index:false,follow:false}};
export default function Page(){return <PrintedMenu initial={printedMenuSnapshot()}/>;}
