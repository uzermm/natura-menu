import {test,expect} from '@playwright/test';
import {historyPage,orderOverview} from '../../online/portal/order-window.mjs';
test('history loads on demand, pages and searches server-side while overview totals stay complete',async({page})=>{
 const origin='http://127.0.0.1:'+(process.env.E2E_PORT||'3124');await page.request.post('/api/auth/login',{headers:{Origin:origin},data:{username:'beyoglumutfagi@gmail.com',password:process.env.E2E_PASSWORD||'natura-e2e-local-12345'}});
 const now=Date.now(),accounts=[{id:'qa',label:'Beyoğlu Mutfağı',environment:'prod',stores:[{id:'1',name:'Beyoğlu Mutfağı'}],status:{state:'ok',lastSuccess:now}}],orders=Array.from({length:145},(_,i)=>({id:'order-'+String(i).padStart(3,'0'),accountId:'qa',storeId:'1',number:String(i),orderCode:'007',restaurant:'Beyoğlu Mutfağı',customer:'Deneme',createdAt:now-86400000,status:'Delivered',total:100,payment:'Online ödeme · Kart',items:[{name:i===0?'Aranan özel ürün':'Çay',quantity:1,unitPrice:100}],discounts:{entries:[]}}));let reads=0;
 await page.route('**/online/api/state',route=>route.fulfill({json:{user:{role:'admin'},accounts,orders:[],orderWindow:{mode:'recent',revision:'1'},overview:orderOverview(accounts,orders,now),interval:15}}));
 await page.route('**/online/api/orders/history?*',route=>{reads++;return route.fulfill({json:historyPage(orders,new URL(route.request().url()).searchParams,now)});});
 await page.addInitScript(()=>{(window as any).print=()=>{(window as any).__printed=true;window.dispatchEvent(new Event('afterprint'));};});
 await page.goto('/admin?section=onlineOrders');const frame=page.frameLocator('iframe[title="Online sipariş yönetimi"]');await expect(frame.locator('.restaurant-summary')).toHaveCount(2);expect(reads).toBe(0);
 await frame.getByRole('combobox',{name:'Tarih seç'}).selectOption('yesterday');await expect(frame.locator('#orders [data-order]')).toHaveCount(60);await expect(frame.locator('#restaurantSummaries .metric-revenue').first()).toContainText('14.500');
 await frame.getByRole('button',{name:'Daha fazla sipariş göster'}).click();await expect(frame.locator('#orders [data-order]')).toHaveCount(120);await expect(frame.locator('#restaurantSummaries .metric-revenue').first()).toContainText('14.500');
 await frame.getByRole('textbox',{name:'Sipariş ara'}).fill('Aranan özel ürün');await expect(frame.locator('#orders [data-order]')).toHaveCount(1);await expect(frame.locator('#historyControls')).toContainText('1 / 1');
 await page.setViewportSize({width:1440,height:900});await frame.getByRole('button',{name:'Sipariş fişini yazdır'}).click();await expect.poll(()=>frame.locator('body').evaluate(()=>(window as any).__printed)).toBe(true);
 await page.unrouteAll({behavior:'wait'});
});

test('long customer descriptions expand without hiding portions, service notes or prices',async({page})=>{
 const origin='http://127.0.0.1:'+(process.env.E2E_PORT||'3124');await page.request.post('/api/auth/login',{headers:{Origin:origin},data:{username:'beyoglumutfagi@gmail.com',password:process.env.E2E_PASSWORD||'natura-e2e-local-12345'}});
 const state=await(await page.request.get('/api/admin/state')).json(),category=state.categories.find((c:any)=>c.qr_visible!==false&&c.is_active&&c.items.some((i:any)=>i.is_active&&i.qr_visible!==false)),item=category.items.find((i:any)=>i.is_active&&i.qr_visible!==false);
 const description='Uzun ürün açıklaması. '.repeat(25)+'Açıklamanın sonu.';
 try{
  expect((await page.request.post('/api/admin/items',{headers:{Origin:origin},data:{...item,description,menu_note:'Çeşitler: Muz, Çilek',service_note:'Hafta sonu'}})).ok()).toBeTruthy();
  await page.setViewportSize({width:390,height:844});await page.goto('/menu');await page.locator('#menu-category-'+category.id+' > h2 button').click();const card=page.locator('article').filter({has:page.getByRole('heading',{name:item.name,exact:true})});
  await expect(card.getByText('Çeşitler: Muz, Çilek',{exact:true})).toBeVisible();await expect(card.getByText('Hafta sonu',{exact:true})).toBeVisible();const toggle=card.getByRole('button',{name:item.name+' açıklamasının tamamını göster'});await expect(toggle).toHaveAttribute('aria-expanded','false');await toggle.click();await expect(card.locator('.menu-description')).not.toHaveClass(/line-clamp/);await expect(card.locator('.menu-product-price')).toBeVisible();
 }finally{const latest=await(await page.request.get('/api/admin/state')).json(),fresh=latest.categories.flatMap((c:any)=>c.items).find((i:any)=>i.id===item.id);expect((await page.request.post('/api/admin/items',{headers:{Origin:origin},data:{...item,version:fresh.version}})).ok()).toBeTruthy();}
});
