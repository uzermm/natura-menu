import type { Campaign,Category } from './types';

// Resolve against the current menu on every render: stale, hidden and sold-out
// products must never be advertised as an available discount.
export function resolveCampaign(categories:Category[],campaign:Campaign|null) {
 if(!campaign)return null;
 const item=categories.filter(c=>c.is_active).flatMap(c=>c.items).find(i=>i.id===campaign.item_id&&i.is_active&&!i.sold_out&&i.image_url);
 if(!item)return null;
 const variant=item.variants.find(v=>v.name===campaign.variant);
 if(item.variants.length?!variant:!!campaign.variant)return null;
 const regularPrice=variant?.price??item.price;
 if(!Number.isInteger(campaign.price)||campaign.price<=0||campaign.price>=regularPrice)return null;
 return {item,variant:variant?.name||'',regularPrice,campaignPrice:campaign.price,title:campaign.title?.trim()||'Natura fırsatı'};
}
