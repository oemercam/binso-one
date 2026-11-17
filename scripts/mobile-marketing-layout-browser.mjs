import assert from 'node:assert/strict';

export async function verifyMobileMarketingLayout(page, base, navigate = url => page.goto(url)) {
 const paths=[['/','.reference-hero>div:first-child'],['/produkt','.product-subhero'],['/preise','.subhero']];
 const topGaps=[];
 for(const [path,selector] of paths){
  await navigate(base+path+'?lang=de');
  await page.locator(selector).waitFor({state:'visible'});
  const geometry=await page.evaluate(selector=>{
   const header=document.querySelector('.marketing-header').getBoundingClientRect();
   const intro=document.querySelector(selector).getBoundingClientRect();
   return {gap:intro.top-header.bottom,overflow:document.documentElement.scrollWidth>innerWidth+1};
  },selector);
  assert.equal(geometry.overflow,false,path+' fits the mobile viewport');
  topGaps.push(geometry.gap);
 }
 assert.ok(topGaps.every(gap=>Math.abs(gap-topGaps[0])<=1),'Landing, product and pricing share the page start gap');
 assert.ok(topGaps[0]>=24&&topGaps[0]<=40,'Intro has one compact page start gap');

 await navigate(base+'/produkt?lang=de');
 const product=page.locator('.product-subhero');
 const header=page.locator('.marketing-header');
 const menu=page.locator('.marketing-mobile-menu');
 const toggle=header.locator('.marketing-menu-button');
 const clickVisibleToggle=async()=>{
  const bounds=await toggle.boundingBox();
  assert.ok(bounds && bounds.y>=0,'The scrolled header toggle is visible');
  // Click where the control is rendered without scrolling it into view.
  await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
 };
 const spacing=await product.evaluate(hero=>{
  const rect=selector=>hero.querySelector(selector).getBoundingClientRect();
  return {
   title:rect('h1').top-rect('.eyebrow').bottom,
   buttons:rect('.reference-actions').top-rect('p').bottom,
   preview:rect('.product-capture').top-rect('.reference-actions').bottom
  };
 });
 assert.ok(Math.abs(spacing.title-spacing.buttons)<=1,'Title and actions use the same spacing');
 assert.ok(spacing.preview>=20,'Preview has clearance below the buttons');

 await page.evaluate(()=>window.scrollTo(0,Math.min(480,document.documentElement.scrollHeight-innerHeight)));
 await page.waitForFunction(()=>scrollY>100);
 const scrollBefore=await page.evaluate(()=>scrollY);
 await clickVisibleToggle();
 await menu.waitFor({state:'visible'});
 assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 await page.waitForFunction(()=>{
  const header=document.querySelector('.marketing-header').getBoundingClientRect();
  const menu=document.querySelector('.marketing-mobile-menu').getBoundingClientRect();
  return Math.abs(header.top)<=1&&Math.abs(menu.top-header.bottom)<=2&&menu.bottom>=innerHeight-2;
 });
 await page.keyboard.press('Escape');
 await menu.waitFor({state:'hidden'});
 await page.waitForFunction(scroll=>Math.abs(scrollY-scroll)<=1,scrollBefore);
 assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 assert.equal(await toggle.evaluate(button=>document.activeElement===button),true,'Escape returns focus to the toggle');

 await clickVisibleToggle();
 await menu.waitFor({state:'visible'});
 await clickVisibleToggle();
 await menu.waitFor({state:'hidden'});
 await page.waitForFunction(scroll=>Math.abs(scrollY-scroll)<=1,scrollBefore);
 console.log('Mobile marketing: header and close control stay visible over the menu; scroll and spacing verified.');
}
