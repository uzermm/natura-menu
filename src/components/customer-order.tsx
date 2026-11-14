'use client';
import { useRef,useState } from 'react';
import { Check,ShoppingBag } from 'lucide-react';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle } from './ui/sheet';
import { OrderPicker,type CartLine } from './order-picker';
import { api } from '@/lib/client';
import type { Category } from '@/lib/types';
export function CustomerOrder({categories,tableCount,initialTable}:{categories:Category[];tableCount:number;initialTable:number}){
 const [open,setOpen]=useState(false),[table,setTable]=useState(initialTable?String(initialTable):''),[note,setNote]=useState(''),[lines,setLines]=useState<CartLine[]>([]),[busy,setBusy]=useState(false),[number,setNumber]=useState<number|null>(null);
 const request=useRef<{payload:string;id:string}|null>(null);
 return <><Button className="h-14 flex-1 rounded-2xl text-sm font-semibold shadow-sm" onClick={()=>{setNumber(null);setOpen(true);}}><ShoppingBag size={18}/>Sipariş ver{lines.length>0&&<span className="rounded-lg bg-white/15 px-2 py-1 text-xs">{lines.reduce((sum,l)=>sum+l.quantity,0)}</span>}</Button><Sheet open={open} onOpenChange={next=>!busy&&setOpen(next)}><SheetContent side="bottom" className="mx-auto max-h-[94dvh] max-w-2xl overflow-y-auto rounded-t-3xl px-5 pb-8"><SheetHeader className="px-0"><SheetTitle className="serif text-2xl">{number?'Sipariş isteğin iletildi':'Masana sipariş ver'}</SheetTitle><SheetDescription>{number?'Ekibimiz masa numaranı kontrol ederek siparişini onaylayacak.':'Masa numaranı seç, ürünlerini ekle. Siparişin ekibimizin onayından sonra hazırlanır.'}</SheetDescription></SheetHeader>{number?<div className="space-y-5 py-6 text-center"><Check className="mx-auto h-12 w-12 text-[#305c3e]"/><p className="text-xl font-bold">Masa {table} · Sipariş #{number}</p><p className="text-sm text-muted-foreground">Değişiklik veya bilgi almak için ekibimize bu numarayı söyleyebilirsin.</p><Button className="h-12 w-full" onClick={()=>setOpen(false)}>Menüye dön</Button></div>:<div className="mt-3 space-y-5"><div className="space-y-2"><Label htmlFor="customer-table">Masa numaran</Label><select id="customer-table" value={table} onChange={e=>setTable(e.target.value)} disabled={busy} className="min-h-12 w-full rounded-xl border bg-white px-3 text-sm"><option value="">Masa numaranı seç</option>{Array.from({length:tableCount},(_,i)=>i+1).map(n=><option key={n} value={n}>Masa {n}</option>)}</select></div><Textarea aria-label="Sipariş notu" placeholder="Sipariş notu (isteğe bağlı)" maxLength={500} value={note} onChange={e=>setNote(e.target.value)} disabled={busy}/><OrderPicker categories={categories} busy={busy} initialLines={lines} onDraft={setLines} submitLabel="Siparişi onaya gönder" onSubmit={async lines=>{
 if(!table)throw Error('Önce masa numaranı seç.');
 const data={table:Number(table),note,lines:lines.map(({item_id,variant,quantity,note,unit_price})=>({item_id,variant,quantity,note,expected_unit_price:unit_price}))},payload=JSON.stringify(data);if(request.current?.payload!==payload)request.current={payload,id:crypto.randomUUID()};
 setBusy(true);try{const result=await api<{number:number}>('/api/orders',{...data,request_id:request.current.id});setNumber(result.number);setLines([]);setNote('');request.current=null;}finally{setBusy(false);}
 }}/></div>}</SheetContent></Sheet></>;
}
