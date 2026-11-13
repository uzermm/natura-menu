import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCampaign } from '../src/lib/campaign.ts';
import { settingsSchema } from '../src/lib/validation.ts';
import type { Category,Item } from '../src/lib/types.ts';
const item:Item={id:'food',category_id:'c',name:'Tost',description:'',price:12000,image_url:'/menu/food.webp',image_generated:false,display_order:0,is_active:true,sold_out:false,featured:false,allergens:[],allergens_verified:false,tags:[],variants:[],original_price:null};
const menu=(i:Item=item):Category[]=>[{id:'c',name:'Tostlar',image_url:'',display_order:0,is_active:true,items:[i]}];
const campaign={item_id:'food',variant:'',price:9000};
test('campaign uses current menu photo and regular price without mutating the product',()=>{
 const offer=resolveCampaign(menu(),campaign)!;assert.equal(offer.regularPrice,12000);assert.equal(offer.campaignPrice,9000);assert.equal(offer.item.image_url,item.image_url);assert.equal(item.price,12000);
 assert.equal(resolveCampaign(menu({...item,price:15000}),campaign)?.regularPrice,15000);
});
test('disabled, unavailable or no longer discounted offers are not shown',()=>{
 assert.equal(resolveCampaign(menu(),null),null);
 for(const i of [{...item,is_active:false},{...item,sold_out:true},{...item,image_url:''},{...item,price:8000}])assert.equal(resolveCampaign(menu(i),campaign),null);
 assert.equal(resolveCampaign([{...menu()[0],is_active:false}],campaign),null);
 for(const price of [0,-1,9000.5,12000,13000])assert.equal(resolveCampaign(menu(),{...campaign,price}),null);
 assert.equal(resolveCampaign(menu(),{...campaign,item_id:'deleted'}),null);
});
test('portion campaigns use the selected portion price and reject stale selections',()=>{
 const categories=menu({...item,variants:[{name:'Büyük',price:18000}]});
 assert.equal(resolveCampaign(categories,{...campaign,variant:'Büyük'})?.regularPrice,18000);
 assert.equal(resolveCampaign(categories,campaign),null);
 assert.equal(resolveCampaign(categories,{...campaign,variant:'Silinmiş porsiyon'}),null);
 assert.equal(resolveCampaign(menu(),{...campaign,variant:'Büyük'}),null);
});
test('existing business settings default to having no banner',()=>{
 const settings=settingsSchema.parse({table_count:35,address:'',hours:''});assert.equal(settings.campaign,null);
 assert.equal(settingsSchema.safeParse({...settings,campaign:{...campaign,price:0}}).success,false);
});
