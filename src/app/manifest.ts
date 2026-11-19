import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';
export default async function manifest():Promise<MetadataRoute.Manifest>{
 const host=(await headers()).get('host');
 const panel=process.env.PANEL_URL&&new URL(process.env.PANEL_URL).host===host;
 return {id:panel?'/':'/admin',name:panel?'NaturApp':'Natura Bistro',short_name:panel?'NaturApp':'Natura',description:panel?'Kafe ve online sipariş yönetimi':'Masa, sipariş ve kasa yönetimi',start_url:panel?'/':'/admin',scope:'/',display:'standalone',background_color:'#f6f7f3',theme_color:'#305c3e',lang:'tr',icons:panel?[{src:'/icons/naturapp-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/naturapp-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/naturapp-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]:[{src:'/icons/app-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icons/app-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icons/app-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
}
