import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { applyGeneratedImageUpdates } from '../src/lib/image-updates.ts';

test('image update fills missing photos and old placeholders without replacing owner photos or business data',()=>{
 const database=new DatabaseSync(':memory:');
 database.exec('CREATE TABLE items(id TEXT PRIMARY KEY,name TEXT,price INTEGER,image_url TEXT,image_generated INTEGER DEFAULT 0)');
 const insert=database.prepare('INSERT INTO items(id,name,price,image_url) VALUES(?,?,?,?)');
 insert.run('missing','Owner edited name',25000,'');insert.run('placeholder','Pasta',32000,'/menu/old-placeholder.webp');insert.run('custom','Custom photo product',40000,'/media/owner-photo.webp');
 const updates=['missing','placeholder','custom'].map(id=>({id,previous_image_url:'/menu/old-placeholder.webp',image_url:`/menu/new-${id}.webp`}));
 assert.equal(applyGeneratedImageUpdates(database,updates),2);
 assert.deepEqual({...database.prepare('SELECT * FROM items WHERE id=?').get('missing')},{id:'missing',name:'Owner edited name',price:25000,image_url:'/menu/new-missing.webp',image_generated:1});
 assert.equal(database.prepare('SELECT image_url FROM items WHERE id=?').get('placeholder')!.image_url,'/menu/new-placeholder.webp');
 assert.equal(database.prepare('SELECT image_url FROM items WHERE id=?').get('custom')!.image_url,'/media/owner-photo.webp');
 assert.equal(applyGeneratedImageUpdates(database,updates),0);
 database.close();
});
