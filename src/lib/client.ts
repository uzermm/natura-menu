export async function api<T=Record<string,unknown>>(url:string,body?:unknown,method='POST'):Promise<T> {
 const res=await fetch(url,{method,headers:{...(body instanceof FormData?{}:{'Content-Type':'application/json'}),...(location.pathname.startsWith('/garson')?{'X-Natura-Staff':'1'}:{})},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const data=await res.json();if(!res.ok){if(res.status===401&&location.pathname.startsWith('/admin')&&!location.pathname.endsWith('/login'))location.href='/admin/login';throw Object.assign(new Error(data.error||'İşlem tamamlanamadı.'),{status:res.status});}return data;
}
