import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderPrintedFood,isPrintedDessert} from '../src/lib/printed-menu-layout.ts';
test('new categories stay above desserts without changing the source menu order',()=>{
 const source=[{id:'a',name:'Kahvaltı'},{id:'d',name:'TATLILAR'},{id:'b',name:'Yeni eklenen kategori'},{id:'c',name:'Bir başka kategori'}];
 const result=orderPrintedFood(source);assert.deepEqual(result.categories.map(c=>c.id),['a','b','c','d']);assert.equal(result.pinnedTail,1);assert.deepEqual(source.map(c=>c.id),['a','d','b','c']);
});
test('renamed dessert category stays pinned by identity and empty menus remain valid',()=>{
 const dessert={id:'949fb7f3-c1a4-4a19-b585-4b05e2bd8ced',name:'Tatlı Seçkisi'};assert.equal(isPrintedDessert({...dessert,name:'Yeni isim'}),true);
 assert.equal(orderPrintedFood([dessert,{id:'late',name:'Sonradan eklenen yemekler'}]).categories.at(-1)?.id,dessert.id);assert.deepEqual(orderPrintedFood([]),{categories:[],pinnedTail:0});
});
