import {test,expect} from '@playwright/test';
test('printed menu stays on two A4 pages with working assets and safe overflow guard',async({page})=>{
 await page.goto('/printed-menu');await expect(page.getByRole('button',{name:'Yazdır / PDF kaydet'})).toBeEnabled();
 await expect(page.locator('.menu-paper')).toHaveCount(2);await expect(page.locator('.paper-qr')).toHaveCount(0);await expect(page.locator('h1')).toHaveText(['İçecekler','Yemek & Tatlı']);
 const breakfast=page.getByRole('region',{name:'Hafta sonu kahvaltısı'});await expect(breakfast).toBeVisible();await expect(breakfast.getByText('Sadece hafta sonları',{exact:true})).toBeVisible();await expect(page.getByText('SERPME KAHVALTI',{exact:true})).toHaveCount(1);
 const position=await page.locator('.paper-breakfast').evaluate(e=>{const b=e.getBoundingClientRect(),content=e.closest('.paper-content')!.getBoundingClientRect();return {rightHalf:b.left>=content.left+content.width/2,bottomGap:Math.abs(b.bottom-content.bottom)};});expect(position.rightHalf).toBe(true);expect(position.bottomGap).toBeLessThan(2);
 const sizes=await page.locator('.menu-paper').evaluateAll(rows=>rows.map(row=>({w:row.getBoundingClientRect().width,h:row.getBoundingClientRect().height})));for(const size of sizes){expect(Math.abs(size.w-793.7)).toBeLessThan(2);expect(Math.abs(size.h-1122.5)).toBeLessThan(2);}
 expect(await page.locator('img').evaluateAll(images=>images.every(img=>img instanceof HTMLImageElement&&img.complete&&img.naturalWidth>0))).toBe(true);
 await page.evaluate(()=>{window.print=()=>{};});await page.getByRole('button',{name:'Yazdır / PDF kaydet'}).click();await expect(page.locator('.print-menu-root')).toHaveClass(/print-authorized/);await page.emulateMedia({media:'print'});await page.screenshot({path:'test-results/printed-menu-verified.png',fullPage:true});const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(2);
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




const auditOrigin='http://127.0.0.1:'+(process.env.E2E_PORT||'3124');
async function admin(page:any){expect((await page.request.post('/api/auth/login',{headers:{Origin:auditOrigin},data:{username:'beyoglumutfagi@gmail.com',password:process.env.E2E_PASSWORD||'natura-e2e-local-12345'}})).status()).toBe(200);}
test('print checks current prices and refuses a failed current-menu request',async({page})=>{
 await admin(page);await page.goto('/printed-menu');await expect(page.getByRole('button',{name:'Yazdır / PDF kaydet'})).toBeEnabled();await page.evaluate(()=>{window.print=()=>{};});
 const state=await(await page.request.get('/api/admin/state')).json();const item=state.categories.flatMap((c:any)=>c.items).find((i:any)=>i.name==='Milkshake');
 expect((await page.request.post('/api/admin/items',{headers:{Origin:auditOrigin},data:{...item,price:item.price+1234}})).status()).toBe(200);
 await page.getByRole('button',{name:'Yazdır / PDF kaydet'}).click();await expect(page.locator('.print-menu-root')).toHaveClass(/print-authorized/);await expect(page.locator('.paper-item').filter({hasText:'Milkshake'})).toContainText(new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format((item.price+1234)/100)+' ₺');
 await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await page.route('**/api/printed-menu',route=>route.abort());await page.getByRole('button',{name:'Yazdır / PDF kaydet'}).click();await expect(page.locator('.paper-warning')).toContainText('Güncel fiyatlar doğrulanamadığı');await expect(page.locator('.print-menu-root')).not.toHaveClass(/print-authorized/);
});
test('broken images block printing and mobile preview fits without changing A4',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.route('**/printed-menu/coffee-print.webp',route=>route.abort());await page.goto('/printed-menu');await expect(page.locator('.paper-warning')).toContainText('görsel yüklenemedi');await expect(page.getByRole('button',{name:'Yazdır / PDF kaydet'})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 await page.unroute('**/printed-menu/coffee-print.webp');await page.reload();await expect(page.getByRole('button',{name:'Yazdır / PDF kaydet'})).toBeEnabled();
 await page.evaluate(()=>{window.print=()=>{};});await page.getByRole('button',{name:'Yazdır / PDF kaydet'}).click();await expect(page.locator('.print-menu-root')).toHaveClass(/print-authorized/);await page.emulateMedia({media:'print'});const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(2);
});
test('category page and service days remain editable independently of names',async({page})=>{
 await admin(page);const state=await(await page.request.get('/api/admin/state')).json(),category=state.categories.find((c:any)=>c.name==='SICAK İÇECEKLER'),breakfast=state.categories.flatMap((c:any)=>c.items).find((i:any)=>i.name==='Serpme Kahvaltı');
 expect((await page.request.post('/api/admin/categories',{headers:{Origin:auditOrigin},data:{...category,name:'KAHVELER',print_page:'drinks'}})).status()).toBe(200);expect((await page.request.post('/api/admin/items',{headers:{Origin:auditOrigin},data:{...breakfast,service_note:'Cumartesi ve pazar'}})).status()).toBe(200);
 await page.goto('/printed-menu');await expect(page.locator('.paper-drinks').getByRole('heading',{name:'KAHVELER',exact:true})).toBeVisible();await expect(page.locator('.paper-breakfast')).toContainText('Cumartesi ve pazar');
 const fresh=await(await page.request.get('/api/admin/state')).json();const c=fresh.categories.find((c:any)=>c.id===category.id),i=fresh.categories.flatMap((c:any)=>c.items).find((i:any)=>i.id===breakfast.id);
 await page.request.post('/api/admin/categories',{headers:{Origin:auditOrigin},data:{...c,name:category.name}});await page.request.post('/api/admin/items',{headers:{Origin:auditOrigin},data:{...i,service_note:breakfast.service_note}});
});

test('safe edge proof keeps two A4 pages and readable explanatory type',async({page})=>{
 await admin(page);const source=await(await page.request.get('/api/admin/state')).json();const added:string[]=[];
 for(const category of source.categories.filter((c:any)=>/KAHVALTILIK|MAKARNALAR/.test(c.name))){const base=category.items.find((i:any)=>i.is_active&&i.qr_visible);const r=await page.request.post('/api/admin/items',{headers:{Origin:auditOrigin},data:{...base,id:undefined,version:undefined,name:'Prova ek ürün '+added.length,description:'',menu_note:'',service_note:'',price:10000,original_price:null,variants:[],image_url:'',display_order:1000}});expect(r.status()).toBe(200);added.push((await r.json()).id);}
 await page.goto('/printed-menu');await page.getByText('Baskı provası ve yazıcı ayarları',{exact:true}).click();await page.getByLabel('Baskı kenarı',{exact:true}).selectOption('safe');await expect(page.getByRole('button',{name:'Yazdır / PDF kaydet'})).toBeEnabled();
 const notes=await page.locator('.paper-note').evaluateAll(rows=>rows.map(e=>Number.parseFloat(getComputedStyle(e).fontSize)*.75));expect(notes.every(n=>n>=8.99)).toBe(true);
 await page.evaluate(()=>{window.print=()=>{};});await page.getByRole('button',{name:'Yazdır / PDF kaydet'}).click();await expect(page.locator('.print-menu-root')).toHaveClass(/print-authorized/);await page.emulateMedia({media:'print'});const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(2);
 const current=await(await page.request.get('/api/admin/state')).json();for(const id of added){const item=current.categories.flatMap((c:any)=>c.items).find((i:any)=>i.id===id);expect((await page.request.delete('/api/admin/items',{headers:{Origin:auditOrigin},data:{id,version:item.version}})).status()).toBe(200);}
});
