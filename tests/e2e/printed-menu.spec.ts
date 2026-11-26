import {test,expect} from '@playwright/test';
test('printed menu stays on two A4 pages with working assets and safe overflow guard',async({page})=>{
 await page.goto('/printed-menu');await expect(page.getByRole('button',{name:'Yazdır / PDF kaydet'})).toBeEnabled();
 await expect(page.locator('.menu-paper')).toHaveCount(2);await expect(page.locator('h1')).toHaveText(['İçecekler','Yiyecekler']);
 const sizes=await page.locator('.menu-paper').evaluateAll(rows=>rows.map(row=>({w:row.getBoundingClientRect().width,h:row.getBoundingClientRect().height})));for(const size of sizes){expect(Math.abs(size.w-793.7)).toBeLessThan(2);expect(Math.abs(size.h-1122.5)).toBeLessThan(2);}
 expect(await page.locator('img').evaluateAll(images=>images.every(img=>img instanceof HTMLImageElement&&img.complete&&img.naturalWidth>0))).toBe(true);
 await page.emulateMedia({media:'print'});const pdf=await page.pdf({preferCSSPageSize:true,printBackground:true});expect(pdf.toString('latin1').match(/\/Type\s*\/Page\b/g)?.length).toBe(2);
 await page.screenshot({path:'test-results/printed-menu.png',fullPage:true});
});


