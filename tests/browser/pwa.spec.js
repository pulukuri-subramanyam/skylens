import { test, expect } from '@playwright/test';
import { providers } from './fixtures';

test('installed app shell reloads offline with cached weather and a clear stale warning', async ({
  page,
  context,
}) => {
  const state = await providers(page);
  await page.goto('/');
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  state.failWeather = true;
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  const notice = page.getByRole('alert');
  await expect(notice).toHaveCount(1);
  await expect(notice).toHaveClass('weather-notice');
  await expect(notice).toContainText("You're offline. Showing saved weather.");
  await expect(page.locator('.error-title')).toHaveCount(0);
  await expect(page.locator('#dataFreshness')).toHaveCount(0);
  await page.locator('#fahrenheitBtn').click();
  await expect(page.locator('#currentTemp')).toHaveText('59°F');
  await page.locator('#themeToggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.forecast-item').nth(1).click();
  await page.getByRole('button', { name: 'Rain chance', exact: true }).click();
  await expect(page.locator('#temperatureChart')).toHaveAttribute('data-metric', 'rain');
  state.failWeather = false;
  await context.setOffline(false);
  await page.locator('#retryBtn').click();
  await expect(notice).toHaveCount(0);
  await expect(page.locator('.app-container > [role="status"]')).toHaveText(
    'Weather loaded for London, England.',
  );
  await expect(page.locator('#refreshBtn')).toBeEnabled();
  await expect(page.locator('#dataFreshness')).toHaveCount(1);
  await expect(page.locator('#currentTemp')).toHaveText('59°F');
});
