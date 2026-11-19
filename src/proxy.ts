import {NextResponse,type NextRequest} from 'next/server';
import {unifiedDestination} from './lib/app-hosts';
export function proxy(request:NextRequest){
 const url=new URL(request.url);
 // Next's standalone server can use its internal hostname in request.url.
 // Domain routing must use the actual Host supplied to the reverse proxy.
 const host=request.headers.get('host');if(host){const external=new URL(url.protocol+'//'+host);url.hostname=external.hostname;url.port=external.port;}
 const route=unifiedDestination(url);
 if(route?.kind==='redirect')return NextResponse.redirect(route.url!,307);
 if(route?.kind==='rewrite'){
  const internal=new URL(request.url);internal.pathname=route.url!.pathname;internal.search=route.url!.search;
  return NextResponse.rewrite(internal);
 }
 if(route?.kind==='reject')return NextResponse.json({error:'Bu adres müşteri menüsüne ayrılmıştır.'},{status:404});
 return NextResponse.next();
}
export const config={matcher:['/','/login','/admin/:path*','/adisyon/:path*','/garson/:path*','/online/:path*','/api/:path*']};
