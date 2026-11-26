import {test,expect} from '@playwright/test';
test('printed menu stays on two A4 pages with working assets and safe overflow guard',async({page})=>{
 await page.goto('/printed-menu');await expect(page.getByRole('button',{name:'Yazdır / PDF kaydet'})).toBeEnabled();
 await expect(page.locator('.menu-paper')).toHaveCount(2);await expect(page.locator('.paper-qr')).toHaveCount(0);await expect(page.locator('h1')).toHaveText(['İçecekler','Yemek & Tatlı']);
 const breakfast=page.getByRole('region',{name:'Hafta sonu kahvaltısı'});await expect(breakfast).toBeVisible();await expect(breakfast.getByText('Sadece hafta sonları',{exact:true})).toBeVisible();await expect(page.getByText('SERPME KAHVALTI',{exact:true})).toHaveCount(1);
 const position=await page.locator('.paper-breakfast').evaluate(e=>{const b=e.getBoundingClientRect(),content=e.closest('.paper-content')!.getBoundingClientRect();return {rightHalf:b.left>=content.left+content.width/2,bottomGap:Math.abs(b.bottom-content.bottom)};});expect(position.rightHalf).toBe(true);expect(position.bottomGap).toBeLessThan(2);
 const sizes=await page.locator('.menu-paper').evaluateAll(rows=>rows.map(row=>({w:row.getBoundingClientRect().width,h:row.getBoundingClientRect().height})));for(const size of sizes){expect(Math.abs(size.w-793.7)).toBeLessThan(2);expect(Math.abs(size.h-1122.5)).toBeLessThan(2);}
 expect(await page.locator('img').evaluateAll(images=>images.every(img=>img instanceof HTMLImageElement&&img.complete&&img.naturalWidth>0))).toBe(true);
 await page.emulateMedia({media:'print'});const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(2);
 await page.screenshot({path:'test-results/printed-menu.png',fullPage:true});
});



test('menu notes are editable and the same saved note appears in digital and printed menus',async({page})=>{
 const origin='http://127.0.0.1:'+(process.env.E2E_PORT||'3124');
 const auth=await page.request.post('/api/auth/login',{headers:{Origin:origin},data:{username:'beyoglumutfagi@gmail.com',password:process.env.E2E_PASSWORD||'natura-e2e-local-12345'}});expect(auth.status()).toBe(200);
 const state=await(await page.request.get('/api/admin/state')).json();const category=state.categories.find((c:any)=>c.items.some((i:any)=>i.name==='Milkshake'));const item=category.items.find((i:any)=>i.name==='Milkshake');
 expect(item.menu_note).toContain('Çikolata');const note='Çikolata, Muz, Çilek • Güncel çeşitler';
 const save=await page.request.post('/api/admin/items',{headers:{Origin:origin},data:{...item,menu_note:note}});expect(save.status(),await save.text()).toBe(200);
 await page.goto('/printed-menu');await expect(page.getByText(note,{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Yazdır / PDF kaydet'})).toBeEnabled();
 await page.goto('/menu');await page.getByRole('button',{name:/Soğuk İçecekler/}).click();await expect(page.getByText(note,{exact:true})).toBeVisible();
});



