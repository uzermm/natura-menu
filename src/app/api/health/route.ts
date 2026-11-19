import pkg from '../../../../package.json';
import {after} from 'next/server';
import {flushPush} from '@/lib/push-worker';
import { db } from '@/lib/db';
export const dynamic='force-dynamic';
export async function GET(){try{db().prepare('SELECT 1').get();after(flushPush);return Response.json({status:'ok',version:pkg.version});}catch{return Response.json({status:'error'},{status:503});}}
