'use client';
import { useEffect,useState } from 'react';
import { Minus,Plus,Search,ShoppingBag,Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { money,thumbnail,type Category,type Item } from '@/lib/types';
import type { AddLine } from '@/lib/pos-core';

export interface CartLine extends AddLine {name:string;unit_price:number;}
export function OrderPicker({categories,busy,onSubmit,submitLabel='Siparişi masaya ekle',initialLines=[],onDraft}:{categories:Category[];busy:boolean;onSubmit:(lines:CartLine[])=>Promise<void>;submitLabel?:string;initialLines?:CartLine[];onDraft?:(lines:CartLine[])=>void}){
 const [error,setError]=useState('');
 const [lines,setLines]=useState<CartLine[]>(initialLines),[category,setCategory]=useState(''),[search,setSearch]=useState(''),[selected,setSelected]=useState<Item|null>(null),[variant,setVariant]=useState(''),[quantity,setQuantity]=useState(1),[note,setNote]=useState('');
 useEffect(()=>{onDraft?.(lines);},[lines,onDraft]);
 const visible=categories.filter(c=>c.is_active&&(!category||c.id===category)).flatMap(c=>c.items.filter(i=>i.is_active&&!i.sold_out&&i.name.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))));
 function add(){if(!selected)return;const v=selected.variants.find(v=>v.name===variant);if(selected.variants.length&&!v)return;setLines(prev=>[...prev,{item_id:selected.id,name:selected.name,variant:v?.name||'',quantity,unit_price:v?.price??selected.price,note}]);setSelected(null);}
 return <div className="space-y-4">
  <div className="relative"><Search size={17} className="absolute left-3 top-3.5 text-muted-foreground"/><Input aria-label="Sipariş için ürün ara" placeholder="Ürün ara…" className="h-11 pl-10" value={search} onChange={e=>setSearch(e.target.value)}/></div>
  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">{[{id:'',name:'Tümü'},...categories.filter(c=>c.is_active)].map(c=><button type="button" key={c.id} onClick={()=>setCategory(c.id)} className={`shrink-0 rounded-xl px-3 py-2 text-xs ${category===c.id?'bg-[#305c3e] text-white':'border bg-white'}`}>{c.name}</button>)}</div>
  <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">{visible.map(item=><button disabled={busy} key={item.id} type="button" onClick={()=>{setSelected(item);setVariant(item.variants[0]?.name||'');setQuantity(1);setNote('');}} className={`flex min-h-20 min-w-0 flex-col gap-1 rounded-xl border p-3 text-left ${selected?.id===item.id?'border-[#305c3e] bg-[#eaf0e4]':'bg-white'}`}><span className="text-xs font-semibold">{item.name}</span><span className="mt-auto text-xs text-[#55704a]">{money(item.variants[0]?.price??item.price)}{item.variants.length?' +':''}</span></button>)}</div>
  {selected&&<div className="space-y-3 rounded-xl border border-[#b6c7a9] bg-[#f0f5e8] p-4">
   <div className="flex items-center gap-3">{selected.image_url&&<img src={thumbnail(selected.image_url)} alt="" width={48} height={48} className="h-12 w-12 rounded-lg object-cover"/>}<strong className="text-sm">{selected.name}</strong></div>
   {!!selected.variants.length&&<div><Label htmlFor="order-variant">Porsiyon / boy</Label><select id="order-variant" className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3 text-sm" value={variant} onChange={e=>setVariant(e.target.value)}>{selected.variants.map(v=><option key={v.name} value={v.name}>{v.name} · {money(v.price)}</option>)}</select></div>}
   <div className="flex items-center gap-3"><Button type="button" variant="outline" size="icon" aria-label="Adedi azalt" disabled={quantity<=1} onClick={()=>setQuantity(q=>q-1)}><Minus size={16}/></Button><span className="min-w-8 text-center font-bold">{quantity}</span><Button type="button" variant="outline" size="icon" aria-label="Adedi artır" disabled={quantity>=999} onClick={()=>setQuantity(q=>q+1)}><Plus size={16}/></Button><span className="ml-auto text-sm font-bold">{money((selected.variants.find(v=>v.name===variant)?.price??selected.price)*quantity)}</span></div>
   <Textarea aria-label="Ürün notu" placeholder="Ürün notu (isteğe bağlı)" maxLength={300} value={note} onChange={e=>setNote(e.target.value)}/>
   <div className="flex gap-2"><Button type="button" variant="outline" onClick={()=>setSelected(null)}>Vazgeç</Button><Button type="button" onClick={add} disabled={busy||lines.length>=50} className="flex-1"><Plus size={16}/>Listeye ekle</Button></div>
  </div>}
  {!!lines.length&&<div className="rounded-xl border bg-white p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><ShoppingBag size={17}/>Eklenecek ürünler</h3><div className="divide-y">{lines.map((line,index)=><div key={index} className="flex items-start gap-2 py-3"><div className="min-w-0 flex-1"><p className="break-words text-sm">{line.quantity} × {line.name}{line.variant&&` · ${line.variant}`}</p>{line.note&&<p className="mt-1 text-xs text-muted-foreground">{line.note}</p>}</div><span className="text-sm font-semibold">{money(line.unit_price*line.quantity)}</span><button disabled={busy} type="button" aria-label={`${line.name} listeden çıkar`} onClick={()=>setLines(prev=>prev.filter((_,i)=>i!==index))} className="flex h-8 w-8 shrink-0 items-center justify-center text-red-600"><Trash2 size={15}/></button></div>)}</div><div className="mt-3 flex justify-between border-t pt-3 text-sm font-bold"><span>Toplam</span><span>{money(lines.reduce((sum,l)=>sum+l.quantity*l.unit_price,0))}</span></div>{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}<Button className="mt-4 h-12 w-full rounded-xl" disabled={busy} onClick={async()=>{setError('');try{await onSubmit(lines);setLines([]);}catch(error){setError((error as Error).message);}}}>{busy?'Gönderiliyor…':submitLabel}</Button></div>}
 </div>;
}
