import type {WaiterCall} from './types.ts';

export function tableGroups(tableCount:number,openTables:number[],calls:WaiterCall[]){
 const opened=new Set(openTables);
 const oldest=new Map<number,number>();
 for(const call of calls){
  if(call.resolved_at)continue;
  const time=Date.parse(call.created_at);
  oldest.set(call.table_number,Math.min(oldest.get(call.table_number)??Infinity,Number.isFinite(time)?time:Infinity));
 }
 const numbers=[...new Set([...Array.from({length:tableCount},(_,i)=>i+1),...opened,...oldest.keys()])].sort((a,b)=>a-b);
 return {
  calling:numbers.filter(n=>oldest.has(n)).sort((a,b)=>(oldest.get(a)!-oldest.get(b)!)||a-b),
  open:numbers.filter(n=>opened.has(n)&&!oldest.has(n)),
  empty:numbers.filter(n=>!opened.has(n)&&!oldest.has(n)),
 };
}
