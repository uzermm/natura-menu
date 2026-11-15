export interface Variant { name:string; price:number }
export interface Item {
 id:string; category_id:string; name:string; description:string; price:number;
 image_url:string; image_generated:boolean; display_order:number; is_active:boolean; qr_visible?:boolean;
 sold_out:boolean; featured:boolean; allergens:string[]; allergens_verified:boolean;
 tags:string[]; variants:Variant[]; original_price:number|null;
}
export interface Category { id:string; name:string; image_url:string; display_order:number; is_active:boolean; qr_visible?:boolean; items:Item[] }
export interface Campaign { item_id:string; variant:string; price:number; title?:string }
export interface Settings { table_count:number; address:string; hours:string; campaign:Campaign|null; }
export interface WaiterCall { id:string; table_number:number; created_at:string; resolved_at:string|null }
export interface MenuData { categories:Category[]; settings:Settings }
export const money=(cents:number)=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:cents%100?2:0}).format(cents/100);
export function thumbnail(url:string) { return url.replace(/\.webp$/, '-sm.webp'); }
