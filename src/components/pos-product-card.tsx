'use client';
import { SlidersHorizontal,UtensilsCrossed } from 'lucide-react';
import { money,thumbnail,type Item } from '@/lib/types';
export function PosProductCard({item,count,disabled,eager,onAdd,onOptions}:{item:Item;count:number;disabled:boolean;eager:boolean;onAdd:()=>void;onOptions:()=>void}){
 const price=money(item.variants[0]?.price??item.price);
 return <article className={`group relative min-w-0 overflow-hidden rounded-xl border bg-white shadow-sm lg:rounded-2xl ${item.sold_out?'opacity-50':''}`}>
  <button type="button" disabled={disabled||item.sold_out} aria-label={`${item.name}, ${price}, masaya ekle`} title={item.name} onClick={onAdd} className="block w-full touch-manipulation text-left">
   <div className="relative h-[80px] overflow-hidden bg-[#d6e2c9] min-[380px]:h-[100px] sm:h-[116px] lg:aspect-[1.65] lg:h-auto">
    {item.image_url?<img src={thumbnail(item.image_url)} alt="" width={480} height={300} loading={eager?'eager':'lazy'} className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center bg-gradient-to-br from-[#b1c49f] to-[#527240]"><UtensilsCrossed size={28} className="text-white/35"/></div>}
    <span className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/35 to-black/75 lg:hidden"/>
    <h3 className="absolute left-1 right-1 top-1/2 -translate-y-1/2 line-clamp-3 text-center text-[10px] font-bold leading-3 text-white [text-shadow:0_1px_3px_#000] min-[380px]:text-[11px] min-[380px]:leading-[14px] sm:text-xs lg:hidden">{item.name}</h3>
    <strong className="absolute bottom-1 right-1 text-[10px] font-bold text-white [text-shadow:0_1px_3px_#000] min-[380px]:text-xs lg:hidden">{price}</strong>
    {count>0&&<span className="absolute left-1 top-1 rounded bg-[#305c3e] px-1 text-[9px] font-bold leading-4 text-white">{count}×</span>}
    {item.sold_out&&<span className="absolute bottom-1 left-1 rounded bg-white px-1 text-[9px] font-bold">Tükendi</span>}
   </div>
   <h3 className="hidden min-h-12 px-3 pt-3 text-[13px] font-bold leading-[18px] lg:line-clamp-2 lg:block">{item.name}</h3>
  </button>
  <div className="lg:flex lg:items-center lg:justify-between lg:px-3 lg:pb-3"><strong className="hidden text-sm text-[#305c3e] lg:block">{price}{item.variants.length>0&&'+'}</strong><button type="button" aria-label={`${item.name} seçenekleri`} disabled={disabled||item.sold_out} onClick={onOptions} className="absolute right-0 top-0 flex h-7 w-7 touch-manipulation items-center justify-center rounded-bl-xl bg-white/90 text-[#527240] lg:static lg:h-8 lg:w-8 lg:rounded-lg lg:bg-[#eff3e9]"><SlidersHorizontal size={13}/></button></div>
 </article>;
}
