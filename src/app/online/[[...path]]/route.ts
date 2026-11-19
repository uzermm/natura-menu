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
 return app.onlineRequest(request,operator);
 }catch(error){return errorResponse(error);}
}
export {dispatch as GET,dispatch as POST,dispatch as PUT,dispatch as PATCH,dispatch as DELETE};
