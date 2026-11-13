'use client';
import { useState } from 'react';
import { ArrowDown,ArrowUp,ChefHat,ChevronDown,Eye,EyeOff,Layers,Pencil,Plus,Search,Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { money,thumbnail,type Category,type Item } from '@/lib/types';

type Props={
 categories:Category[];busy:boolean;
 onEditCategory:(category:Category)=>void;onDeleteCategory:(category:Category)=>void;
 onAddItem:(category:Category)=>void;onEditItem:(item:Item)=>void;onDeleteItem:(item:Item)=>void;
 onToggleItem:(item:Item)=>void;onMoveCategory:(id:string,direction:number)=>void;
 onMoveItem:(item:Item,direction:number)=>void;onBulkPrices:(categoryId:string)=>void;
};
const normalize=(text:string)=>text.toLocaleLowerCase('tr-TR');

export default function AdminMenuManager({categories,busy,onEditCategory,onDeleteCategory,onAddItem,onEditItem,onDeleteItem,onToggleItem,onMoveCategory,onMoveItem,onBulkPrices}:Props){
 const [query,setQuery]=useState(''),[expanded,setExpanded]=useState<string[]>([]);
 const search=normalize(query.trim());
 const matchesItem=(item:Item,text=search)=>normalize(`${item.name} ${item.description}`).includes(text);
 const matchesCategory=(category:Category,text=search)=>normalize(category.name).includes(text)||category.items.some(i=>matchesItem(i,text));
 const visible=categories.filter(c=>!search||matchesCategory(c));
 function toggle(id:string){setExpanded(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]);}
 return <div className="space-y-4">
  <div className="flex flex-wrap gap-3"><div className="relative min-w-48 flex-1"><Search size={17} className="absolute left-3 top-3.5 text-muted-foreground"/><Input aria-label="Kategori veya ürün ara" className="h-11 bg-white pl-10" placeholder="Kategori veya ürün ara…" value={query} onChange={e=>{const value=e.target.value;setQuery(value);const text=normalize(value.trim());setExpanded(text?categories.filter(c=>matchesCategory(c,text)).map(c=>c.id):[]);}}/></div><Button variant="outline" className="h-11 bg-white" disabled={busy||!categories.length} onClick={()=>onBulkPrices('')}>Toplu fiyat güncelle</Button></div>
  {visible.map(c=>{
   const index=categories.findIndex(category=>category.id===c.id),open=expanded.includes(c.id);
   const items=search&&!normalize(c.name).includes(search)?c.items.filter(i=>matchesItem(i)):c.items;
   return <section key={c.id} className="overflow-hidden rounded-2xl border bg-white">
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-3 md:p-4 ${open?'bg-[#f0f4e9]':'bg-white'}`}>
     <h2 className="min-w-0 flex-1"><button type="button" aria-expanded={open} aria-controls={`admin-category-${c.id}`} onClick={()=>toggle(c.id)} className="flex min-h-14 w-full items-center gap-3 text-left">
      {c.image_url?<img src={thumbnail(c.image_url)} alt="" width={48} height={48} loading="lazy" className="h-12 w-12 shrink-0 rounded-xl object-cover"/>:<span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted"><Layers size={20}/></span>}
      <span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold">{c.name}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{search?`${items.length} / `:''}{c.items.length} ürün · {c.is_active?'Görünür':'Gizli'}</span></span><ChevronDown size={20} aria-hidden="true" className={`shrink-0 text-[#668456] transition-transform ${open?'rotate-180':''}`}/>
     </button></h2>
     <div className="flex w-full items-center justify-end gap-1 border-t pt-2 sm:w-auto sm:border-0 sm:pt-0">
      <Button variant="ghost" size="icon" disabled={busy||index===0} aria-label={`${c.name} yukarı taşı`} onClick={()=>onMoveCategory(c.id,-1)}><ArrowUp size={16}/></Button>
      <Button variant="ghost" size="icon" disabled={busy||index===categories.length-1} aria-label={`${c.name} aşağı taşı`} onClick={()=>onMoveCategory(c.id,1)}><ArrowDown size={16}/></Button>
      <Button variant="outline" disabled={busy} aria-label={`${c.name} kategorisini düzenle`} onClick={()=>onEditCategory(c)}><Pencil size={15}/>Düzenle</Button>
      <Button variant="ghost" size="icon" disabled={busy} className="text-red-600" aria-label={`${c.name} kategorisini sil`} onClick={()=>onDeleteCategory(c)}><Trash2 size={16}/></Button>
     </div>
    </div>
    <div id={`admin-category-${c.id}`} role="region" aria-label={`${c.name} ürünleri`} hidden={!open}>
     {open&&<div className="space-y-3 border-t bg-[#fafbf7] p-3 md:p-4">
      <div className="flex flex-wrap justify-between gap-2 pb-1"><Button disabled={busy} className="h-10 rounded-xl" aria-label={`${c.name} kategorisine ürün ekle`} onClick={()=>onAddItem(c)}><Plus size={16}/>Ürün ekle</Button><Button disabled={busy||!c.items.length} variant="ghost" className="h-10 text-xs" onClick={()=>onBulkPrices(c.id)}>Kategori fiyatlarını güncelle</Button></div>
      {items.map(item=><article key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3">
       {item.image_url?<img src={thumbnail(item.image_url)} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 shrink-0 rounded-lg object-cover"/>:<span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted"><ChefHat size={20}/></span>}
       <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{item.name}</h3><div className="mt-1.5 flex flex-wrap gap-1">{!item.is_active&&<Badge variant="secondary">Gizli</Badge>}{item.sold_out&&<Badge variant="destructive">Tükendi</Badge>}{item.featured&&<Badge variant="secondary">Öneri</Badge>}{item.image_generated&&<Badge variant="outline">Temsili görsel</Badge>}</div></div>
       <span className="text-sm font-bold">{money(item.price)}</span>
       <div className="flex w-full flex-wrap items-center justify-end gap-1 border-t pt-2 sm:w-auto sm:border-0 sm:pt-0">
        <Button variant="ghost" size="icon" disabled={busy||c.items[0]?.id===item.id} aria-label={`${item.name} yukarı taşı`} onClick={()=>onMoveItem(item,-1)}><ArrowUp size={16}/></Button>
        <Button variant="ghost" size="icon" disabled={busy||c.items.at(-1)?.id===item.id} aria-label={`${item.name} aşağı taşı`} onClick={()=>onMoveItem(item,1)}><ArrowDown size={16}/></Button>
        <Button variant="ghost" size="icon" disabled={busy} aria-label={`${item.name} ${item.is_active?'gizle':'göster'}`} onClick={()=>onToggleItem(item)}>{item.is_active?<Eye size={16}/>:<EyeOff size={16}/>}</Button>
        <Button variant="outline" disabled={busy} className="max-[359px]:size-9 max-[359px]:p-0" aria-label={`${item.name} ürününü düzenle`} onClick={()=>onEditItem(item)}><Pencil size={15}/><span className="hidden min-[360px]:inline">Düzenle</span></Button>
        <Button variant="ghost" size="icon" disabled={busy} className="text-red-600" aria-label={`${item.name} ürününü sil`} onClick={()=>onDeleteItem(item)}><Trash2 size={16}/></Button>
       </div>
      </article>)}
      {!items.length&&<p className="rounded-xl border border-dashed p-7 text-center text-sm text-muted-foreground">{c.items.length?'Bu aramada eşleşen ürün yok.':'Bu kategoride henüz ürün yok. Ürün ekleyerek başlayın.'}</p>}
     </div>}
    </div>
   </section>;
  })}
  {!visible.length&&<div className="rounded-2xl border border-dashed p-10 text-center"><p className="font-semibold">{categories.length?'Eşleşen kategori veya ürün bulunamadı.':'Henüz kategori yok.'}</p><p className="mt-2 text-sm text-muted-foreground">{categories.length?'Başka bir arama deneyin.':'Kategori ekle düğmesiyle menünüzü oluşturmaya başlayın.'}</p></div>}
 </div>;
}
