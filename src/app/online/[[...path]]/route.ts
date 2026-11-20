import {audit} from '@/lib/audit-log';
import {db} from '@/lib/db';
import {currentOperator} from '@/lib/operator';
import {onlineRuntime} from '@/lib/online-runtime';
import {requireOrigin,errorResponse} from '@/lib/api';
export const runtime='nodejs';
export const dynamic='force-dynamic';
async function dispatch(request:Request){
 try{
 if(!['GET','HEAD'].includes(request.method))requireOrigin(request);
 const operator=await currentOperator();
 const app=await onlineRuntime();
 let action='';if(operator&&request.method==='POST'&&/\/orders\/[^/]+\/actions$/.test(new URL(request.url).pathname)){try{const input=await request.clone().json();if(['accept','ready','check'].includes(input.action))action=input.action;}catch{}}
 const response=await app.onlineRequest(request,operator);
 const target=new URL(request.url).pathname.match(/\/api\/(orders|reviews)\/([^/]+)\/(actions|answer)$/);
 if(operator&&request.method==='POST'&&target)audit(db(),operator.username,'online.'+target[1]+'.'+(action||target[3]),decodeURIComponent(target[2]),response.ok?'ok':'rejected');
 return response;
 }catch(error){return errorResponse(error);}
}
export {dispatch as GET,dispatch as POST,dispatch as PUT,dispatch as PATCH,dispatch as DELETE};
