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


// Keep Axe scans in this suite so Firefox uses its dedicated single-worker job.
test('empty city suggestions have no serious accessibility violations in both themes',async({page})=>{
  await page.route('**/api/weather?**',route=>new URL(route.request().url()).searchParams.get('q')==='Qzznomatch'?route.fulfill({json:[]}):route.fallback());
  await page.goto('/');await expect(page.locator('#currentTemp')).toBeVisible();
  await page.getByRole('combobox').fill('Qzznomatch');
  for(let i=0;i<2;i++){
    await page.getByRole('combobox').focus();
    await expect(page.getByText('No suggestions found',{exact:true})).toBeVisible();
    await expect(page.getByRole('option')).toHaveCount(0);
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(page.getByRole('combobox')).toHaveAttribute('aria-expanded','false');
    await page.waitForTimeout(600); // Match the settled-theme audit above.
    const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(scan.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
    await page.locator('#themeToggle').click();
  }
});
