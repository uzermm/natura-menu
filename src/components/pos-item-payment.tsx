'use client';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { groupLines,quoteItemPayment } from '@/lib/pos-lines';
import { paymentLabels,type PaymentMethod,type PosSummary,type Ticket } from '@/lib/pos-types';
import { money } from '@/lib/types';
import type { PosCommand } from '@/lib/pos-core';
export function PosItemPayment({ticket:t,accounts,disabled,onCommand}:{ticket:Ticket;accounts:PosSummary['accounts'];disabled:boolean;onCommand:(command:PosCommand)=>Promise<boolean>}){
 const [selection,setSelection]=useState<Record<string,number>>({}),[method,setMethod]=useState<PaymentMethod>('cash'),[account,setAccount]=useState(''),[reference,setReference]=useState('');
 const unpaid=groupLines(t.lines).filter(l=>!l.voided_at&&l.quantity>(l.paid_quantity||0));
 const selectedQuantity=(line:typeof unpaid[number])=>Math.min(selection[line.id]??line.quantity-(line.paid_quantity||0),line.quantity-(line.paid_quantity||0));
 const items=unpaid.flatMap(l=>selectedQuantity(l)>0?[{line_id:l.id,quantity:selectedQuantity(l)}]:[]);
 let amount=0,quoteError='';try{amount=quoteItemPayment(t,items).amount;}catch(error){quoteError=(error as Error).message;}
 return <form className="space-y-4" onSubmit={e=>{e.preventDefault();void onCommand({action:'pay_items',ticket_id:t.id,version:t.version,method,items,...(method==='account'?{account_id:account}:{}),reference});}}>
  <p className="text-xs text-muted-foreground">Ödenmemiş adetler hazır gelir; ödenecek adetleri azaltabilirsiniz. Ödenen ürünler alta taşınır; kalan ürünlerle masa açık kalır.</p>
  <div className="max-h-[35dvh] space-y-2 overflow-y-auto">{unpaid.map(line=><div key={line.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><span className="text-xs font-semibold">{line.name}{line.variant&&` · ${line.variant}`}<small className="mt-1 block font-normal text-muted-foreground">{line.quantity-(line.paid_quantity||0)} adet ödenmedi · {money(line.unit_price)} / adet{line.note&&` · ${line.note}`}</small></span><Input aria-label={`${line.name} ödenecek adet`} disabled={disabled} type="number" min={0} max={line.quantity-(line.paid_quantity||0)} value={selectedQuantity(line)} onChange={e=>setSelection(old=>({...old,[line.id]:Math.max(0,Math.min(line.quantity-(line.paid_quantity||0),Math.floor(Number(e.target.value)||0)))}))} className="w-20 shrink-0 text-center"/></div>)}</div>
  <div className="grid grid-cols-2 gap-2">{(Object.keys(paymentLabels) as PaymentMethod[]).map(m=><Button key={m} type="button" disabled={disabled} variant={method===m?'default':'outline'} aria-pressed={method===m} onClick={()=>setMethod(m)}>{paymentLabels[m]}</Button>)}</div>
  {method==='account'&&<select aria-label="Cari hesap" required disabled={disabled} className="min-h-11 w-full rounded-xl border px-3 text-sm" value={account} onChange={e=>setAccount(e.target.value)}><option value="">Cari hesap seçin</option>{accounts.filter(a=>a.is_active).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select>}
  {method==='meal_card'&&<Input aria-label="Yemek kartı firması veya not" disabled={disabled} placeholder="Yemek kartı firması / not" value={reference} onChange={e=>setReference(e.target.value)} maxLength={120}/>}
  <p className="flex justify-between rounded-xl bg-[#f2f6eb] p-3 text-sm font-bold"><span>Seçilen ürünler</span><span>{money(amount)}</span></p>
  {(t.discount>0||t.paid>0)&&<p className="text-[10px] text-muted-foreground">İndirim ve önceki tutar ödemeleri, ödenmemiş ürünlere orantılı yansıtılır.</p>}
  {quoteError&&<p role="alert" className="text-xs text-red-700">{quoteError}</p>}
  <Button type="submit" disabled={disabled||amount<=0||!!quoteError||method==='account'&&!account} className="h-12 w-full">{method==='account'?'Cariye aktar':'Ödemeyi kaydet'}{amount>0&&amount===t.remaining?' ve kapat':''}</Button>
 </form>;
}
