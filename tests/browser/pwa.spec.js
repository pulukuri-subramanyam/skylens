import { test, expect } from '@playwright/test';
import { providers } from './fixtures';

test('installed app shell reloads offline with cached weather and a clear stale warning',async({page,context})=>{
  const state = await providers(page);
  await page.goto('/');await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>Boolean(navigator.serviceWorker.controller))).toBe(true);
  state.failWeather = true;
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await expect(page.getByRole('alert')).toContainText('last successful weather');
});
