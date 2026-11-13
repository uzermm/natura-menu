import type { Metadata,Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Natura Bistro | Menü',description:'Natura Bistro dijital menü. Lezzetleri keşfedin, ürün bilgilerine göz atın ve masanızdan garson çağırın.',robots:{index:true,follow:true},icons:{icon:'/icon.svg'},appleWebApp:{capable:true,statusBarStyle:'default',title:'Natura Bistro'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#f9f8f3'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="tr"><body>{children}</body></html>;}
