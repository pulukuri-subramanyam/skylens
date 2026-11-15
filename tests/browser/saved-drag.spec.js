import {test,expect} from '@playwright/test';
import {providers} from './fixtures';
const cities=['London','Nandyal','Bengaluru','Mumbai','Hyderabad','Chennai'].map((name,i)=>({
  id:'saved-'+i,name,label:name+', Test region',query:name,lat:51.5+i/100,lon:-.12
}));
test.beforeEach(async({page})=>{
  await providers(page);
  await page.addInitScript(seed=>{
    if(!localStorage.getItem('drag-test-seeded')){
      localStorage.setItem('weatherapp-saved-cities',JSON.stringify(seed));
      localStorage.setItem('drag-test-seeded','yes');
    }
  },cities);
  await page.goto('/');
  await expect(page.locator('#currentTemp')).toBeVisible();
});
const order=page=>page.locator('[aria-label="Saved cities"] .saved-city-chip').evaluateAll(es=>es.map(e=>e.dataset.cityId));
async function points(page,from,to){
  const a=await page.locator(`[data-city-id="saved-${from}"] .saved-city-drag`).boundingBox();
  const b=await page.locator(`[data-city-id="saved-${to}"]`).boundingBox();
  return {a:{x:a.x+a.width/2,y:a.y+a.height/2},b:{x:b.x+b.width/2,y:b.y+b.height/2}};
}
test('mouse drag reorders wrapped saved cities, persists, and does not select a city',async({page})=>{
  await page.setViewportSize({width:600,height:1000});
  const {a,b}=await points(page,0,5);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});
  await expect.poll(()=>order(page)).toEqual(['saved-1','saved-2','saved-3','saved-4','saved-5','saved-0']);
  await expect(page.locator('.saved-city-drag-overlay')).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('weatherapp-saved-cities')).map(city=>city.id))).toEqual(cities.map(city=>city.id));
  await page.mouse.up();
  expect(await order(page)).toEqual(['saved-1','saved-2','saved-3','saved-4','saved-5','saved-0']);
  await expect(page.locator('#locationName')).toHaveText('London, England');
  await page.reload();await expect(page.locator('#currentTemp')).toBeVisible();
  expect(await order(page)).toEqual(['saved-1','saved-2','saved-3','saved-4','saved-5','saved-0']);
});
test('visible arrows are absent; drag-handle keyboard controls and remove still work',async({page})=>{
  await expect(page.getByRole('group',{name:'Saved cities',exact:true}).getByRole('button',{name:/^Move /})).toHaveCount(0);
  const handle=page.getByRole('button',{name:'Reorder London, Test region',exact:true});
  await handle.focus();await page.keyboard.press('ArrowRight');
  expect((await order(page)).slice(0,2)).toEqual(['saved-1','saved-0']);
  await page.keyboard.press('ArrowLeft');
  expect((await order(page))[0]).toBe('saved-0');await expect(handle).toBeFocused();
  await page.getByRole('button',{name:'Remove London, Test region from saved cities',exact:true}).click();
  expect(await order(page)).not.toContain('saved-0');
});
test('Escape, pointer cancellation, and dropping outside keep the saved order',async({page})=>{
  const original=await order(page);
  for(const mode of ['escape','outside','cancel']){
    const {a,b}=await points(page,0,1);
    await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});
    if(mode==='escape')await page.keyboard.press('Escape');
    if(mode==='outside')await page.mouse.move(1,1,{steps:8});
    if(mode==='cancel')await page.locator('[aria-label="Saved cities"]').dispatchEvent('pointercancel',{pointerId:1});
    await page.mouse.up();expect(await order(page)).toEqual(original);
    await expect(page.locator('[data-dragging]')).toHaveCount(0);
    await expect(page.locator('.saved-city-drag-overlay')).toHaveCount(0);
  }
});
test('touch drag reorders on a narrow screen without hiding existing controls',async({page,browserName})=>{
  test.skip(browserName!=='chromium','Real touch dispatch uses Chromium CDP; pointer behavior is tested in Firefox above.');
  await page.setViewportSize({width:390,height:1000});
  const {a,b}=await points(page,0,3);const session=await page.context().newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});
  for(let i=1;i<=12;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/12,y:a.y+(b.y-a.y)*i/12,id:1}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
  expect((await order(page)).slice(0,4)).toEqual(['saved-1','saved-2','saved-3','saved-0']);
  await expect(page.getByRole('button',{name:'Remove London, Test region from saved cities',exact:true})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('[data-city-id="saved-0"] > .city-chip')).toHaveCSS('touch-action','auto');
});

test('dragged chip follows the pointer and neighbours move before release',async({page})=>{
  await page.setViewportSize({width:900,height:1000});
  const {a,b}=await points(page,0,2);
  const chip=await page.locator('[data-city-id="saved-0"]').boundingBox();
  await page.mouse.move(a.x,a.y);await page.mouse.down();
  await page.mouse.move(b.x,b.y,{steps:16});
  await expect(page.locator('.saved-city-drag-overlay')).toBeVisible();
  await expect.poll(async()=>{
    const box=await page.locator('.saved-city-drag-overlay').boundingBox();
    return Math.abs(box.x-(b.x-(a.x-chip.x)))+Math.abs(box.y-(b.y-(a.y-chip.y)));
  }).toBeLessThan(3);
  await expect.poll(()=>order(page)).toEqual(['saved-1','saved-2','saved-0','saved-3','saved-4','saved-5']);
  await page.mouse.up();
  await expect(page.locator('.saved-city-drag-overlay')).toHaveCount(0);
  expect((await order(page))[2]).toBe('saved-0');
});

test('reduced motion preserves live dragging without neighbour animations',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  const {a,b}=await points(page,0,1);
  await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:10});
  await expect.poll(()=>order(page)).toEqual(['saved-1','saved-0','saved-2','saved-3','saved-4','saved-5']);
  expect(await page.locator('.saved-city-list [data-city-id]').evaluateAll(es=>es.some(e=>e.getAnimations().length>0))).toBe(false);
  await page.mouse.up();
});
