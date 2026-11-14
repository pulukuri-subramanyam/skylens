import { test, expect } from '@playwright/test';
import { providers, forecast } from './fixtures';

test('refresh keeps existing controls while updated readings fade', async ({page}, testInfo)=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await providers(page);await page.goto('/');await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await page.waitForTimeout(250);
  const refresh=page.locator('#refreshBtn');
  const control=await refresh.elementHandle();
  await page.route('https://api.open-meteo.com/**',async route=>{
    await new Promise(resolve=>setTimeout(resolve,350));const data=forecast();data.current.temperature_2m=16;await route.fulfill({json:data});
  });
  await refresh.click();await expect(refresh).toBeDisabled();
  await expect(page.locator('#currentTemp')).toHaveText('16°C');
  await expect(refresh).toBeEnabled();
  expect(await control.evaluate(element=>element.isConnected)).toBe(true);
  await page.locator('#fahrenheitBtn').click();await expect(page.locator('#currentTemp')).toHaveText('61°F');
  await expect(page.locator('#fahrenheitBtn')).toBeFocused();
  await page.waitForTimeout(220);
  for(const width of [1440,768,390,320]) {
    await page.setViewportSize({width,height:1000});await page.waitForTimeout(250);
    const tiles=await page.locator('.detail-item').evaluateAll(es=>es.map(e=>({w:e.offsetWidth,h:e.offsetHeight,label:e.querySelector('.detail-label').getBoundingClientRect().top-e.getBoundingClientRect().top})));
    for(const tile of tiles){expect(Math.abs(tile.w-tiles[0].w)).toBeLessThanOrEqual(1);expect(Math.abs(tile.h-tiles[0].h)).toBeLessThanOrEqual(1);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  }
  await page.screenshot({path:testInfo.outputPath('visual-polish.png'),fullPage:true});
});

test('reduced motion keeps value updates immediate with no reading animation',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await providers(page);await page.goto('/');
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await page.locator('#fahrenheitBtn').click();await expect(page.locator('#currentTemp')).toHaveText('59°F');
  expect(await page.locator('#currentTemp').evaluate(el=>el.getAnimations().length)).toBe(0);
});
