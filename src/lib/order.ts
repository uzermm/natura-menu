import type { Category,CartLine } from './types';
export function priceCart(categories:Category[],lines:CartLine[]) {
 const seen=new Set<string>();
 return lines.map(line=>{
  const key=JSON.stringify([line.id,line.variant]);if(seen.has(key))throw new Error('Sepette tekrarlanan ürün var.');seen.add(key);
  const item=categories.filter(c=>c.is_active).flatMap(c=>c.items).find(i=>i.id===line.id&&i.is_active&&!i.sold_out);
  if(!item)throw new Error('Sepetteki bir ürün artık satışta değil. Sepeti güncelleyin.');
  const variant=item.variants.find(v=>v.name===line.variant);
  if((item.variants.length&&!variant)||(!item.variants.length&&line.variant))throw new Error('Porsiyon seçenekleri değişti. Ürünü yeniden ekleyin.');
  return {name:item.name,variant:line.variant,quantity:line.quantity,unitPrice:variant?.price??item.price};
 });
}
