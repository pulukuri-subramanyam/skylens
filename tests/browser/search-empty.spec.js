import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { providers } from './fixtures';

test('empty search stays visible, can be dismissed, and recovers to keyboard selection', async ({page}) => {
  await providers(page);
  await page.route('**/api/weather?**', route => new URL(route.request().url()).searchParams.get('q') === 'Qzznomatch' ? route.fulfill({json:[]}) : route.fallback());
  await page.goto('/'); await expect(page.locator('#locationName')).toBeVisible();
  const input = page.getByRole('combobox');
  await input.fill('Qzznomatch');
  const message = page.getByText('No suggestions found', {exact:true});
  await expect(message).toBeVisible();
  await expect(input).toHaveAttribute('aria-expanded','true');
  await expect(page.getByRole('option')).toHaveCount(0);
  const scan = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(scan.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
  await input.press('Escape'); await expect(message).toBeHidden();
  await page.locator('#locationName').click(); await input.focus(); await expect(message).toBeVisible();
  await input.fill('Q'); await expect(page.locator('.city-suggestions')).toHaveCount(0);
  await input.fill('51.5, -0.12'); await expect(page.locator('.city-suggestions')).toHaveCount(0);
  await input.fill('Nandyal'); await expect(page.getByRole('option').first()).toBeVisible();
  await expect(message).toBeHidden();
  await input.press('ArrowDown'); await input.press('Enter');
  await expect(page.locator('#locationName')).toHaveText('Nandyal, Andhra Pradesh');
  await expect(page.locator('.city-suggestions')).toHaveCount(0);
});

test('failed suggestion providers are distinguished from an empty search', async ({page}) => {
  await providers(page); await page.goto('/'); await expect(page.locator('#locationName')).toBeVisible();
  await page.route('**/api/weather?**', route => new URL(route.request().url()).searchParams.get('q') === 'Qzzfailed' ? route.fulfill({status:400,json:{error:'unavailable'}}) : route.fallback());
  await page.route('https://photon.komoot.io/**', route => route.fulfill({status:400,json:{}}));
  await page.getByRole('combobox').fill('Qzzfailed');
  await expect(page.getByText('Could not load suggestions. Try again or search by city and state.',{exact:true})).toBeVisible();
  await expect(page.getByText('No suggestions found',{exact:true})).toHaveCount(0);
  await page.locator('#locationName').click(); await expect(page.locator('.city-suggestions')).toHaveCount(0);
});
