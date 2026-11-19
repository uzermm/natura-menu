import {statfs,stat} from 'node:fs/promises';
import path from 'node:path';
import {db,dataDir} from '@/lib/db';
import {requireAdmin,errorResponse,jsonBody,noStore,HttpError} from '@/lib/api';
import {unusedImages} from '@/lib/image-cleanup';
import {diagnostics,recordDiagnostic} from '@/lib/diagnostics';
import pkg from '../../../../../package.json';
export async function GET(){try{await requireAdmin();const d=db(),disk=await statfs(dataDir);const files=await Promise.all(['natura.sqlite','natura.sqlite-wal'].map(async name=>{try{return (await stat(path.join(dataDir,name))).size;}catch{return 0;}}));return Response.json({version:pkg.version,uptime_seconds:Math.floor(process.uptime()),memory_bytes:process.memoryUsage().rss,database_bytes:files.reduce((s,n)=>s+n,0),disk_available_bytes:disk.bavail*disk.bsize,images:await unusedImages(d,path.join(dataDir,'uploads')),diagnostics:diagnostics()},{headers:noStore});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{await requireAdmin(req);const data=await jsonBody(req);if(data.action!=='clean_images'||data.confirm!==true)throw new HttpError(400,'Temizleme işlemini onaylayın.');const result=await unusedImages(db(),path.join(dataDir,'uploads'),true);recordDiagnostic('maintenance.images');return Response.json(result,{headers:noStore});}catch(e){return errorResponse(e);}}
