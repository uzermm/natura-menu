import { test } from 'node:test';
import assert from 'node:assert/strict';
import { priceCart } from '../src/lib/order.ts';
import { cartSchema,itemSchema,settingsSchema } from '../src/lib/validation.ts';
import type { Category,Item } from '../src/lib/types.ts';
const item:Item={id:'food',category_id:'c',name:'Tost',description:'',price:10000,image_url:'',image_generated:false,display_order:0,is_active:true,sold_out:false,featured:false,allergens:[],allergens_verified:false,tags:[],variants:[],original_price:null};
const menu=(i:Item=item):Category[]=>[{id:'c',name:'Tostlar',image_url:'',display_order:0,is_active:true,items:[i]}];
test('cart totals use canonical prices and portions',()=>{
 assert.equal(priceCart(menu(),[{id:'food',variant:'',quantity:2}])[0].unitPrice,10000);
 assert.equal(priceCart(menu({...item,variants:[{name:'Büyük',price:15000}]}),[{id:'food',variant:'Büyük',quantity:2}])[0].unitPrice,15000);
});
test('hidden categories, sold out items, invalid variants and duplicate lines cannot be ordered',()=>{
 const line={id:'food',variant:'',quantity:1};
 for(const categories of [menu({...item,sold_out:true}),menu({...item,is_active:false}),[{...menu()[0],is_active:false}]])assert.throws(()=>priceCart(categories,[line]));
 assert.throws(()=>priceCart(menu(),[{...line,variant:'Uydurma'}]));
 assert.throws(()=>priceCart(menu({...item,variants:[{name:'Büyük',price:15000}]}),[line]));
 assert.throws(()=>priceCart(menu(),[line,line]));
});
test('invalid quantities and unsafe image paths are rejected at API boundaries',()=>{
 for(const quantity of [-1,0,1.5,51])assert.equal(cartSchema.safeParse({lines:[{id:'food',variant:'',quantity}],note:'',table:0,key:''}).success,false);
 assert.equal(itemSchema.safeParse({...item,image_url:'https://evil.example/x.svg'}).success,false);
 assert.equal(itemSchema.safeParse({...item,variants:[{name:'Büyük',price:100},{name:'Büyük',price:200}]}).success,false);
 assert.equal(itemSchema.safeParse({...item,price:1000,original_price:500}).success,false);
 assert.equal(settingsSchema.safeParse({whatsapp:'905513700989',table_count:0,subtitle:'',address:'',hours:'',announcement:''}).success,false);
});
