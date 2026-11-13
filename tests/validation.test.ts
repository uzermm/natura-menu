import { test } from 'node:test';
import assert from 'node:assert/strict';
import { itemSchema,settingsSchema,waiterCallSchema } from '../src/lib/validation.ts';
import type { Item } from '../src/lib/types.ts';
const item:Item={id:'food',category_id:'c',name:'Tost',description:'',price:10000,image_url:'',image_generated:false,display_order:0,is_active:true,sold_out:false,featured:false,allergens:[],allergens_verified:false,tags:[],variants:[],original_price:null};
test('unsafe image paths, duplicate portions and invalid discounts are rejected',()=>{
 assert.equal(itemSchema.safeParse({...item,image_url:'https://evil.example/x.svg'}).success,false);
 assert.equal(itemSchema.safeParse({...item,variants:[{name:'Büyük',price:100},{name:'Büyük',price:200}]}).success,false);
 assert.equal(itemSchema.safeParse({...item,price:1000,original_price:500}).success,false);
});
test('business settings no longer require ordering configuration',()=>{
 const settings={table_count:35,subtitle:'',address:'',hours:'',announcement:''};
 assert.equal(settingsSchema.safeParse(settings).success,true);
 assert.equal(settingsSchema.safeParse({...settings,table_count:0}).success,false);
});
test('waiter calls accept a selected table without a QR key and reject invalid numbers',()=>{
 assert.deepEqual(waiterCallSchema.parse({table:7}),{table:7});
 for(const table of [0,-1,1.5,201,'7',null,undefined])assert.equal(waiterCallSchema.safeParse({table}).success,false);
});
