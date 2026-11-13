'use client';
import { useEffect,useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle } from './ui/sheet';
import { api } from '@/lib/client';

export function WaiterSheet({open,onOpenChange,tableCount,initialTable,onCalled}:{open:boolean;onOpenChange:(open:boolean)=>void;tableCount:number;initialTable:number;onCalled:(table:number,message:string)=>void}) {
 const [selected,setSelected]=useState(initialTable),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(open){setSelected(initialTable>=1&&initialTable<=tableCount?initialTable:0);setError('');}},[open,initialTable,tableCount]);
 async function send(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(!selected||busy)return;setBusy(true);setError('');
  try{const result=await api<{message:string}>('/api/waiter',{table:selected});onCalled(selected,result.message);onOpenChange(false);}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-xl gap-0 overflow-y-auto rounded-t-3xl px-5 pb-0">
  <SheetHeader className="px-0 pr-8"><SheetTitle className="serif text-3xl">Hangi masadasınız?</SheetTitle><SheetDescription>Masa numaranızı seçip çağrınızı iletin. Ekibimiz sizinle ilgilensin.</SheetDescription></SheetHeader>
  <form onSubmit={send} className="min-h-0">
   <fieldset disabled={busy} className="min-w-0"><legend className="mb-3 text-xs font-semibold">Masa numaranız</legend><div className="grid max-h-[44dvh] grid-cols-5 gap-2 overflow-y-auto p-1 sm:grid-cols-6">{Array.from({length:tableCount},(_,i)=>i+1).map(n=><label key={n} className="relative cursor-pointer"><input type="radio" name="waiter-table" value={n} checked={selected===n} onChange={()=>{setSelected(n);setError('');}} aria-label={`Masa ${n}`} className="peer sr-only"/><span className="flex h-12 items-center justify-center rounded-xl border bg-white text-sm font-semibold transition peer-checked:border-[#305c3e] peer-checked:bg-[#305c3e] peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-[#a1b99a] peer-disabled:opacity-60">{n}</span></label>)}</div></fieldset>
   {error&&<p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
   <div className="safe-bottom sticky bottom-0 mt-4 bg-background pt-3"><Button disabled={!selected||busy} className="h-13 w-full rounded-xl" type="submit"><Bell size={18}/>{busy?'Çağrı iletiliyor…':selected?`Masa ${selected} için garson çağır`:'Önce masa numaranızı seçin'}</Button></div>
  </form>
 </SheetContent></Sheet>;
}
