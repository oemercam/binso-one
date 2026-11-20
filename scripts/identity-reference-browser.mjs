import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyCanonicalFieldRegression} from './shared-control-browser.mjs';
/** Check the live login layout and preserve the archived comparison screenshot. */
export async function assertIdentityReference({page,context,width,output}){
  await page.getByRole('button',{name:'Anmelden',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Mit Passkey anmelden',exact:true}).count(),0,'The approved login uses the native password manager without a separate passkey button');
  assert.equal(await page.locator('input[name="username"][autocomplete="username"]').count(),1);
  assert.equal(await page.locator('input[name="password"][autocomplete="current-password"]').count(),1);
  assert.equal(await page.locator('.auth-workspace-intro').count(),0,'Revision7 identity has one quiet column, without the retired promotional panel');
  await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>[...document.fonts].some(face=>face.family==='Inter'&&face.status==='loaded')),true,'Inter is genuinely loaded from the project, not merely named in CSS');
  const actual=await page.locator('.auth-card').evaluate(card=>{const box=card.getBoundingClientRect(),heading=card.querySelector('h1'),input=card.querySelector('input[type="email"]'),passkey=card.querySelector('.auth-passkey'),form=card.querySelector('form');return {width:box.width,center:box.x+box.width/2,font:getComputedStyle(heading).fontSize,inputHeight:input.getBoundingClientRect().height,inputFont:getComputedStyle(input).fontSize,passkeyBeforeForm:passkey?!!(passkey.compareDocumentPosition(form)&Node.DOCUMENT_POSITION_FOLLOWING):null}});
  assert.equal(actual.passkeyBeforeForm,null,'The password form is the canonical login entry');
  await verifyCanonicalFieldRegression(page);
  const reference=await context.newPage();await reference.setViewportSize({width,height:page.viewportSize()?.height??900});await reference.setContent((await fs.readFile('docs/audit/v25-revision7/identity-reference.html','utf8')).replace('../../../public/brand/logo-black.svg','data:image/svg+xml;base64,'+(await fs.readFile('public/brand/logo-black.svg')).toString('base64')).replace('../../../public/fonts/inter/inter-latin-wght-normal.woff2','data:font/woff2;base64,'+(await fs.readFile('public/fonts/inter/inter-latin-wght-normal.woff2')).toString('base64')));
  const rootFont=await page.locator("html").evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  const expected={width:Math.min(400,width-32),center:width/2,inputHeight:width<=760?48:52,font:Math.min(2.5*rootFont,Math.max(1.875*rootFont,width*.04)),inputFont:16};
  for(const key of Object.keys(expected)){const delta=Math.abs(parseFloat(actual[key])-expected[key]);assert.ok(delta<=1,"Login "+key+" at "+width+": "+actual[key]+" (expected "+expected[key]+")");}
  await reference.screenshot({path:path.join(output,`identity-reference-${width}.png`),animations:'disabled'});await page.screenshot({path:path.join(output,`identity-actual-${width}.png`),animations:'disabled'});await reference.close();
}
