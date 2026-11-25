'use client';
import { SlidersHorizontal,UtensilsCrossed } from 'lucide-react';
import { money,thumbnail,type Item } from '@/lib/types';
export function PosProductCard({item,count,disabled,eager,onAdd,onOptions}:{item:Item;count:number;disabled:boolean;eager:boolean;onAdd:()=>void;onOptions:()=>void}){
 const price=money(item.variants[0]?.price??item.price);
 return <article className={`group relative min-w-0 overflow-hidden rounded-xl border bg-white shadow-sm lg:rounded-2xl ${item.sold_out?'opacity-50':''}`}>
  <button type="button" disabled={disabled||item.sold_out} aria-label={`${item.name}, ${price}, masaya ekle`} title={item.name} onClick={onAdd} className="block w-full touch-manipulation text-left">
   <div className="relative h-[52px] overflow-hidden bg-[#d6e2c9] min-[380px]:h-[60px] sm:h-[76px] lg:aspect-[1.65] lg:h-auto">
    {item.image_url?<img src={thumbnail(item.image_url)} alt="" width={480} height={300} loading={eager?'eager':'lazy'} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center bg-gradient-to-br from-[#b1c49f] to-[#527240]"><UtensilsCrossed size={28} className="text-white/35"/></div>}

    {count>0&&<span className="absolute left-1 top-1 rounded bg-[#305c3e] px-1 text-[9px] font-bold leading-4 text-white">{count}×</span>}
    {item.sold_out&&<span className="absolute bottom-1 left-1 rounded bg-white px-1 text-[9px] font-bold">Tükendi</span>}
   </div>
   <h3 className="h-10 min-h-10 overflow-hidden line-clamp-2 px-1.5 pt-1 text-[11px] font-bold leading-[14px] lg:h-12 lg:min-h-12 lg:px-3 lg:pt-3 lg:text-[13px] lg:leading-[18px]">{item.name}</h3>
  </button>
  <div className="lg:flex lg:items-center lg:justify-between lg:px-3 lg:pb-3"><strong className="block px-1.5 pb-1 text-xs font-bold text-[#305c3e] lg:px-0 lg:pb-0 lg:text-sm">{price}{item.variants.length>0&&'+'}</strong><button type="button" aria-label={`${item.name} seçenekleri`} disabled={disabled||item.sold_out} onClick={onOptions} className="absolute right-0 top-0 flex h-10 w-10 touch-manipulation items-start justify-end p-1 text-[#527240] lg:static lg:h-11 lg:w-11 lg:items-center lg:justify-center lg:rounded-lg lg:bg-[#eff3e9]"><span className="rounded-md bg-white/90 p-1 lg:bg-transparent lg:p-0"><SlidersHorizontal size={13}/></span></button></div>
 </article>;
}
