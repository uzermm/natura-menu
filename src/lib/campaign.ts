import type { Campaign,Category } from './types';

// Resolve against the current menu on every render: stale, hidden and sold-out
// products must never be advertised as an available discount.
export function resolveCampaign(categories:Category[],campaign:Campaign|null) {
 if(!campaign)return null;
 const item=categories.filter(c=>c.is_active&&c.qr_visible!==false).flatMap(c=>c.items).find(i=>i.id===campaign.item_id&&i.is_active&&i.qr_visible!==false&&!i.sold_out&&i.image_url);
 if(!item)return null;
 const variant=item.variants.find(v=>v.name===campaign.variant);
 if(item.variants.length?!variant:!!campaign.variant)return null;
 const regularPrice=variant?.price??item.price;
 if(!Number.isInteger(campaign.price)||campaign.price<=0||campaign.price>=regularPrice)return null;
 return {item,variant:variant?.name||'',regularPrice,campaignPrice:campaign.price,title:campaign.title?.trim()||'Natura fırsatı'};
}

export function campaignUnitPrice(item:{id:string;price:number;image_url?:string;is_active:unknown;qr_visible?:unknown;sold_out:unknown;variants:{name:string;price:number}[]},categoryVisible:unknown,campaign:Campaign|null,variant:string){
 const regular=item.variants.find(v=>v.name===variant)?.price??item.price;
 if(!campaign||campaign.item_id!==item.id||campaign.variant!==variant||!item.is_active||item.qr_visible===false||item.qr_visible===0||!categoryVisible||item.sold_out||!item.image_url)return regular;
 return Number.isSafeInteger(campaign.price)&&campaign.price>0&&campaign.price<regular?campaign.price:regular;
}
export function saleCategories(categories:Category[],campaign:Campaign|null):Category[]{return categories.map(c=>({...c,items:c.items.map(i=>({...i,price:campaignUnitPrice(i,c.is_active&&c.qr_visible!==false,campaign,''),variants:i.variants.map(v=>({...v,price:campaignUnitPrice(i,c.is_active&&c.qr_visible!==false,campaign,v.name)})),original_price:!i.variants.length&&campaignUnitPrice(i,c.is_active&&c.qr_visible!==false,campaign,'')<i.price?i.price:i.original_price}))}));}
