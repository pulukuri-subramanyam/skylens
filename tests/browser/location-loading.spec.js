import { test, expect } from '@playwright/test';
import { providers } from './fixtures';

async function delayedCityWeather(page) {
  let release, started;
  const gate = new Promise((resolve) => (release = resolve)),
    requested = new Promise((resolve) => (started = resolve));
  await page.route('https://api.open-meteo.com/**', async (route) => {
    if (Number(new URL(route.request().url()).searchParams.get('latitude')) < 30) {
      started();
      await gate;
    }
    return route.fallback();
  });
  return { release, requested };
}
async function controlledLocation(page) {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (ok, fail) => {
      window.locationSuccess = ok;
      window.locationFailure = fail;
    };
  });
}

test('manual city loading never spins or disables the current-location button', async ({
  page,
}) => {
  await providers(page);
  await page.goto('/');
  await expect(page.locator('#currentTemp')).toBeVisible();
  const delayed = await delayedCityWeather(page);
  await page.getByRole('combobox').fill('Nandyal');
  await page.getByRole('combobox').press('Enter');
  await delayed.requested;
  await expect(page.locator('#locationBtn')).toBeEnabled();
  await expect(page.locator('#locationBtn .animate-spin')).toHaveCount(0);
  delayed.release();
  await expect(page.locator('#locationName')).toHaveText('Nandyal, Andhra Pradesh');
});

test('location spinner covers geolocation and weather fetching, then stops', async ({ page }) => {
  await providers(page);
  await controlledLocation(page);
  await page.goto('/');
  await expect(page.locator('#currentTemp')).toBeVisible();
  const delayed = await delayedCityWeather(page);
  await page.locator('#locationBtn').click();
  await expect(page.locator('#locationBtn')).toBeDisabled();
  await expect(page.locator('#locationBtn .animate-spin')).toHaveCount(1);
  await page.evaluate(() =>
    window.locationSuccess({ coords: { latitude: 15.48, longitude: 78.48 } }),
  );
  await delayed.requested;
  await expect(page.locator('#locationBtn .animate-spin')).toHaveCount(1);
  delayed.release();
  await expect(page.locator('#locationName')).toHaveText('Nandyal, Andhra Pradesh');
  await expect(page.locator('#locationBtn')).toBeEnabled();
  await expect(page.locator('#locationBtn .animate-spin')).toHaveCount(0);
});

test('a manual search cancels location feedback and ignores late geolocation callbacks', async ({
  page,
}) => {
  await providers(page);
  await controlledLocation(page);
  await page.goto('/');
  await expect(page.locator('#currentTemp')).toBeVisible();
  await page.locator('#locationBtn').click();
  await expect(page.locator('#locationBtn .animate-spin')).toHaveCount(1);
  await page.getByRole('combobox').fill('Nandyal');
  await page.getByRole('combobox').press('Enter');
  await expect(page.locator('#locationName')).toHaveText('Nandyal, Andhra Pradesh');
  await expect(page.locator('#locationBtn .animate-spin')).toHaveCount(0);
  let requests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/weather?') || request.url().includes('api.open-meteo.com'))
      requests++;
  });
  await page.evaluate(() => {
    window.locationSuccess({ coords: { latitude: 51.5, longitude: -0.12 } });
    window.locationFailure({ code: 1 });
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(requests).toBe(0);
  await expect(page.locator('#locationName')).toHaveText('Nandyal, Andhra Pradesh');
  await expect(page.locator('#locationBtn')).toBeEnabled();
});
