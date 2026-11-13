import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { dataDir } from '@/lib/db';
export async function GET(_req:Request,{params}:{params:Promise<{name:string}>}) {
 const {name}=await params;
 if(!/^[a-f0-9-]{36}(-sm)?\.webp$/.test(name))return new Response(null,{status:404});
 try {const data=await readFile(path.join(dataDir,'uploads',name));return new Response(data,{headers:{'Content-Type':'image/webp','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'}});}catch{return new Response(null,{status:404});}
}
