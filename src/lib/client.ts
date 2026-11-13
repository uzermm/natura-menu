export async function api<T=Record<string,unknown>>(url:string,body?:unknown,method='POST'):Promise<T> {
 const res=await fetch(url,{method,headers:body instanceof FormData?undefined:{'Content-Type':'application/json'},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const data=await res.json();if(!res.ok){if(res.status===401&&location.pathname.startsWith('/admin')&&!location.pathname.endsWith('/login'))location.href='/admin/login';throw new Error(data.error||'İşlem tamamlanamadı.');}return data;
}
