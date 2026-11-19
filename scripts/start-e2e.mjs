import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const port=process.env.E2E_PORT||'3124',data=await mkdtemp(path.join(tmpdir(),'natura-e2e-'));
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',port],{stdio:'inherit',env:{...process.env,NODE_ENV:'production',APP_URL:'http://127.0.0.1:'+port,DATA_DIR:data,ADMIN_PASSWORD:process.env.E2E_PASSWORD||'natura-e2e-local-12345',SESSION_SECRET:randomBytes(32).toString('hex')}});
process.on('SIGINT',()=>child.kill());process.on('SIGTERM',()=>child.kill());child.on('exit',async code=>{const resolved=path.resolve(data);if(resolved.startsWith(path.resolve(tmpdir())+path.sep)&&path.basename(resolved).startsWith('natura-e2e-'))await rm(resolved,{recursive:true,force:true});process.exit(code||0);});
