import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:5173/#/kb');
await page.waitForTimeout(1200);
const links=page.locator('a[href*="/files/"]');
const count=await links.count(); if(count!==10)throw new Error(`Expected 10 document links, got ${count}`);
for(let i=0;i<count;i++){
 const href=await links.nth(i).getAttribute('href');
 const popupPromise=page.waitForEvent('popup');await links.nth(i).click();const popup=await popupPromise;await popup.waitForLoadState();
 if(!(await popup.locator('h1').textContent()))throw new Error('Missing preview title');
 const download=popup.locator('a[download]');const res=await popup.request.get(new URL(await download.getAttribute('href'),popup.url()).href);
 if(!res.ok()||(await res.body()).length<100)throw new Error(`Broken file ${href}`);
 await popup.close();
}
const imgs=await page.locator('img[src*="/assets/generated/"]').evaluateAll(imgs=>imgs.map(x=>({src:x.src,ok:x.complete&&x.naturalWidth>0})));
if(!await page.locator('button img[src*="jiangwan.png"]').first().isVisible())throw new Error('Sidebar avatar missing');
if(imgs.some(x=>!x.ok))throw new Error('Broken generated image');
await page.screenshot({path:'tools/file-assets/qa/app.png',fullPage:true});
console.log(JSON.stringify({documentLinks:count,images:imgs.length,errors}));if(errors.length)throw new Error(errors.join('\n'));
await browser.close();
