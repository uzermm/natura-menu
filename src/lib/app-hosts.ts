// Domain separation is opt-in until the combined service has both tunnel routes.
export function panelOrigin(){return process.env.PANEL_URL?new URL(process.env.PANEL_URL).origin:null;}
export function menuOrigin(){return new URL(process.env.MENU_URL||process.env.APP_URL||'http://localhost:3000').origin;}
export function unifiedDestination(url:URL):{kind:'redirect'|'rewrite'|'reject';url?:URL}|null{
 const panel=panelOrigin();if(!panel)return null;
 const onPanel=url.host===new URL(panel).host,onMenu=url.host===new URL(menuOrigin()).host;
 const admin=url.pathname==='/admin'||url.pathname.startsWith('/admin/')||url.pathname==='/garson'||url.pathname.startsWith('/garson/');
 const panelPath=url.pathname.startsWith('/admin/adisyon/')?url.pathname.replace('/admin',''):url.pathname.includes('login')?'/login':'/';
 if(onMenu&&admin){const dest=new URL(panelPath,panel);dest.search=url.search;return {kind:'redirect',url:dest};}
 if(onMenu&&(url.pathname.startsWith('/online')||/^\/api\/(admin|pos|auth|staff|printer|notifications)(\/|$)/.test(url.pathname)))return {kind:'reject'};
 if(onPanel&&admin){const dest=new URL(panelPath,panel);dest.search=url.search;return {kind:'redirect',url:dest};}
 if(onPanel&&url.pathname.startsWith('/adisyon/')){const dest=new URL(url);dest.pathname='/admin'+url.pathname;return {kind:'rewrite',url:dest};}
 if(onPanel&&(url.pathname==='/'||url.pathname==='/login')){const dest=new URL(url);dest.pathname=url.pathname==='/login'?'/admin/login':'/admin';return {kind:'rewrite',url:dest};}
 return null;
}
