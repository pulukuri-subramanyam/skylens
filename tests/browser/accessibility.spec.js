import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

import { providers } from './fixtures';

test.beforeEach(async ({page})=>{ await providers(page); });

test('both themes have no serious accessibility violations or page overflow', async ({page})=>{
  await page.goto('/');await expect(page.locator('#currentTemp')).toBeVisible();
  for(let i=0;i<2;i++) {
    await page.waitForTimeout(600); // Audit the settled theme, not intermediate transition colours.
    const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(results.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight <= Math.max(innerHeight,document.querySelector('footer').getBoundingClientRect().bottom+scrollY+80))).toBe(true);
    await page.locator('#themeToggle').click();
  }
});


// Use CSS locators in this Axe test to avoid Firefox build 1572's cross-world
// ARIA reflection crash: https://github.com/microsoft/playwright/issues/43967.
// Role-based interaction assertions remain in search-empty.spec.js.
test('empty city suggestions have no serious accessibility violations in both themes',async({page})=>{
  await page.route('**/api/weather?**',route=>new URL(route.request().url()).searchParams.get('q')==='Qzznomatch'?route.fulfill({json:[]}):route.fallback());
  await page.goto('/');await expect(page.locator('#currentTemp')).toBeVisible();
  await page.locator('#cityInput').fill('Qzznomatch');
  for(let i=0;i<2;i++){
    await page.locator('#cityInput').focus();
    await expect(page.getByText('No suggestions found',{exact:true})).toBeVisible();
    await expect(page.locator('[role=option]')).toHaveCount(0);
    await expect(page.locator('[role=listbox]')).toHaveCount(0);
    await expect(page.locator('#cityInput')).toHaveAttribute('aria-expanded','false');
    await page.waitForTimeout(600);
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(scan.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
    await page.locator('#themeToggle').click();
  }
});
