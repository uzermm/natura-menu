import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import ExcelJS from 'exceljs';
import {initPos,saveAccount,executePos,collectAccount,deleteAccount} from '../src/lib/pos-core.ts';
import {cariExcel} from '../src/lib/cari-excel.ts';
test('Excel export retains numeric balances, phone text, open product details, ledger, receipts and literal formula-like customer text',async()=>{
 const d=new DatabaseSync(':memory:');try{
 d.exec(`PRAGMA foreign_keys=ON;CREATE TABLE settings(id INTEGER PRIMARY KEY,value TEXT);INSERT INTO settings VALUES(1,'{"table_count":35}');CREATE TABLE categories(id TEXT PRIMARY KEY,is_active INTEGER);INSERT INTO categories VALUES('food',1);CREATE TABLE items(id TEXT PRIMARY KEY,category_id TEXT,name TEXT,price INTEGER,variants TEXT,is_active INTEGER,sold_out INTEGER);INSERT INTO items VALUES('tea','food','Çay',3000,'[]',1,0);`);initPos(d);
 const a=saveAccount(d,{name:'=1+1',phone:'05513700989',note:'Not',is_active:true},'Kasa');executePos(d,randomUUID(),{action:'open_account',account_id:a.id,lines:[{item_id:'tea',quantity:4,variant:'',note:'Az şekerli'}]});collectAccount(d,a.id,6000,'cash','İki çay',randomUUID(),'Kasiyer');const archived=saveAccount(d,{name:'Silinen',phone:'',note:'',is_active:true},'Kasa');deleteAccount(d,archived.id,'Kasa');
 const buffer=await cariExcel(d),book=new ExcelJS.Workbook();await book.xlsx.load(buffer);assert.equal(book.worksheets.length,6);const accounts=book.getWorksheet('Cari Hesaplar')!;assert.equal(accounts.getCell('B2').value,'=1+1');assert.equal(accounts.getCell('C2').value,'05513700989');assert.equal(accounts.getCell('D2').value,60);assert.equal(accounts.getCell('E3').value,'Silinmiş');assert.equal(book.getWorksheet('Ürün Detayları')!.getCell('E2').value,4);assert.equal(book.getWorksheet('Ürün Detayları')!.getCell('G2').value,30);assert.equal(book.getWorksheet('Fişler')!.getCell('K2').value,60);assert.ok(book.getWorksheet('Hesap Hareketleri')!.rowCount>1);assert.equal(book.getWorksheet('Ödemeler')!.getCell('F2').value,60);assert.equal(accounts.views[0].state,'frozen');
 }finally{d.close();}
});
