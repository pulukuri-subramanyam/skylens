import { test, expect } from '@playwright/test';
import { providers } from './fixtures';

test('the page preloads its rendered font without downloading Inter', async ({ page }) => {
  await providers(page);
  const fonts = [];
  page.on('request', (request) => {
    if (request.url().includes('/assets/fonts/')) fonts.push(new URL(request.url()).pathname);
  });
  await page.goto('/');
  await expect(page.locator('#temperatureChart')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveAttribute(
    'href',
    '/assets/fonts/plus-jakarta-sans-latin.woff2',
  );
  expect(
    await page.locator('.app-title').evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain('Plus Jakarta Sans');
  expect(fonts.filter((path) => path.endsWith('plus-jakarta-sans-latin.woff2'))).toHaveLength(1);
  expect(fonts.some((path) => path.includes('inter-variable'))).toBe(false);
});
