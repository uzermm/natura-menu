import type { Metadata,Viewport } from 'next';
import './globals.css';
import {AppRegistration} from '@/components/app-install';
export const metadata:Metadata={title:'Natura Bistro | Menü',description:'Natura Bistro dijital menü. Lezzetleri keşfedin, ürün bilgilerine göz atın ve masanızdan garson çağırın.',robots:{index:true,follow:true},manifest:'/manifest.webmanifest',icons:{icon:'/icon.svg',apple:'/icons/apple-touch-icon.png'},appleWebApp:{capable:true,statusBarStyle:'default',title:'Natura Bistro'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f9f8f3'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="tr"><body><AppRegistration/>{children}</body></html>;}
