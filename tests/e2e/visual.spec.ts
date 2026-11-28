import {test,expect} from '@playwright/test';
const origin='http://127.0.0.1:'+(process.env.E2E_PORT||'3124');
// Reviewed Windows/Edge baselines have their own CI job; do not compare fonts
// rendered by a different operating system against these references.
for(const width of [390,1440])test('reviewed visual references at '+width,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.goto('/menu');
 await expect(page.getByRole('button',{name:/Başlangıç.*Kahvaltılık/})).toBeVisible();
 await expect(page).toHaveScreenshot('customer-'+width+'.png',{animations:'disabled',maxDiffPixelRatio:0.012,threshold:0.25});
 const response=await page.request.post('/api/auth/login',{headers:{Origin:origin},data:{username:'beyoglumutfagi@gmail.com',password:process.env.E2E_PASSWORD||'natura-e2e-local-12345'}});expect(response.ok()).toBeTruthy();
 await page.goto('/admin?section=accounts');await expect(page.getByRole('region',{name:'Cari özeti'})).toBeVisible();
 await expect(page.locator('[aria-label="Cari özeti"]')).toHaveScreenshot('cari-'+width+'.png',{animations:'disabled',maxDiffPixelRatio:0.012,threshold:0.25});
 const accounts=[['a','Beyoğlu Mutfağı'],['b','Natura Fast Food'],['c','Natura Dürüm']].map(([id,label])=>({id,label,stores:[{id:'1',name:label}],environment:'prod',status:{state:'ok',lastSuccess:Date.now()}}));
 const orders=[['a','Online ödeme · Kart',250],['a','Yemek kartı · Setcard Online',200],['b','Kapıda ödeme · Nakit',300]].map(([accountId,payment,total],index)=>({id:'visual-'+index,accountId,storeId:'1',number:String(index),orderCode:'007',restaurant:accounts.find(a=>a.id===accountId)!.label,customer:'Deneme',createdAt:Date.now(),status:'Delivered',total,payment,items:[]}));
 await page.route('**/online/api/state',route=>route.fulfill({json:{user:{role:'admin'},accounts,orders,interval:15}}));
 await page.goto('/admin?section=onlineOrders');const frame=page.frameLocator('iframe[title="Online sipariş yönetimi"]');await expect(frame.locator('.restaurant-summary')).toHaveCount(4);
 await expect(frame.locator('#restaurantSummaries')).toHaveScreenshot('restaurants-'+width+'.png',{animations:'disabled',maxDiffPixelRatio:0.012,threshold:0.25});
 await page.unrouteAll({behavior:'wait'});
});
