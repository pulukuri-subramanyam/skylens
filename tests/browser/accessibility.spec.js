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
