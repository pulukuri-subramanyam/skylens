import { test, expect } from '@playwright/test';
import { providers, forecast } from './fixtures';

const startedAt = new Date('2026-11-18T10:00:00Z');
async function age(page, minutes) {
  await page.clock.setFixedTime(new Date(startedAt.getTime() + minutes * 60000));
}
async function visibility(page, state = 'visible') {
  await page.evaluate((state) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}
async function settle(page) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
async function setup(page) {
  await page.clock.setFixedTime(startedAt);
  await providers(page);
  const requests = [];
  page.on('request', (request) => {
    if (request.url().startsWith('https://api.open-meteo.com/')) requests.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await expect(page.locator('#refreshBtn')).toBeEnabled();
  return requests;
}

test('returning to stale weather refreshes once, keeps readings visible and preserves forecast controls', async ({
  page,
}) => {
  await page.clock.install({ time: startedAt });
  const requests = await setup(page);
  await age(page, 14);
  await visibility(page);
  await settle(page);
  expect(requests).toHaveLength(1);
  await page.locator('.forecast-item').nth(1).click();
  await page.locator('#chartRainBtn').click();
  await page.locator('#fahrenheitBtn').click();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('https://api.open-meteo.com/**', async (route) => {
    await gate;
    const data = forecast();
    data.current.temperature_2m = 16;
    await route.fulfill({ json: data });
  });
  await age(page, 16);
  await page.clock.runFor(60000);
  await visibility(page, 'hidden');
  await settle(page);
  expect(requests).toHaveLength(1);
  await visibility(page);
  await expect(page.locator('#refreshBtn')).toBeDisabled();
  await expect(page.locator('#lastUpdated')).toContainText('May be outdated');
  await expect(page.locator('#dataFreshness')).toHaveCount(0);
  await expect(page.locator('#currentTemp')).toHaveText('59°F');
  await expect(page.locator('#locationBtn')).toBeEnabled();
  await visibility(page);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await settle(page);
  expect(requests).toHaveLength(2);
  release();
  await expect(page.locator('#currentTemp')).toHaveText('61°F');
  await expect(page.locator('#lastUpdated')).not.toContainText('May be outdated');
  await expect(page.locator('#refreshBtn')).toBeEnabled();
  await expect(page.locator('#locationName')).toHaveText('London, England');
  await expect(page.locator('.forecast-item').nth(1)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#temperatureChart')).toHaveAttribute('data-metric', 'rain');
  expect(new URL(requests[1]).searchParams.get('latitude')).toBe('51.5');
  await visibility(page);
  await settle(page);
  expect(requests).toHaveLength(2);
});

test('offline returns do not fetch; a later online return refreshes stale weather', async ({
  page,
  context,
}) => {
  const requests = await setup(page);
  await age(page, 16);
  await context.setOffline(true);
  await visibility(page);
  await settle(page);
  expect(requests).toHaveLength(1);
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await context.setOffline(false);
  await visibility(page);
  await expect.poll(() => requests.length).toBe(2);
  await expect(page.locator('#refreshBtn')).toBeEnabled();
});

test('typing or leaving an unfinished search prevents automatic refresh', async ({ page }) => {
  const requests = await setup(page);
  await age(page, 16);
  const input = page.getByRole('combobox');
  await input.fill('Nandyal');
  await visibility(page);
  await settle(page);
  expect(requests).toHaveLength(1);
  await page.locator('#currentCondition').click();
  await visibility(page);
  await settle(page);
  expect(requests).toHaveLength(1);
  await expect(input).toHaveValue('Nandyal');
  await input.fill('');
  await page.locator('#currentCondition').click();
  await visibility(page);
  await expect.poll(() => requests.length).toBe(2);
});

test('returning does not replace an in-flight city search with the previous city', async ({
  page,
}) => {
  const requests = await setup(page);
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route('https://api.open-meteo.com/**', async (route) => {
    if (Number(new URL(route.request().url()).searchParams.get('latitude')) < 30) await gate;
    await route.fallback();
  });
  await page.getByRole('combobox').fill('Nandyal');
  await page.getByRole('combobox').press('Enter');
  await expect.poll(() => requests.length).toBe(2);
  await age(page, 21);
  await visibility(page);
  await settle(page);
  expect(requests).toHaveLength(2);
  release();
  await expect(page.locator('#locationName')).toHaveText('Nandyal, Andhra Pradesh');
});

test('pending geolocation and its error are not interrupted by stale-weather refresh', async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, failure) => {
      window.failLocation = failure;
    };
  });
  const requests = await setup(page);
  await page.locator('#locationBtn').click();
  await age(page, 21);
  await visibility(page);
  await settle(page);
  expect(requests).toHaveLength(1);
  await expect(page.locator('#locationBtn')).toBeDisabled();
  await page.evaluate(() => window.failLocation({ code: 1 }));
  await visibility(page);
  await settle(page);
  expect(requests).toHaveLength(1);
  await expect(page.getByRole('alert')).toContainText('Location access was denied');
});

test('failed automatic refresh keeps cached weather and cools down repeated returns', async ({
  page,
}) => {
  const requests = await setup(page);
  let fail = true;
  await page.route('https://api.open-meteo.com/**', (route) =>
    fail ? route.fulfill({ status: 429, json: {} }) : route.fulfill({ json: forecast() }),
  );
  await age(page, 16);
  await visibility(page);
  await expect(page.getByRole('alert')).toContainText('Refresh failed');
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  expect(requests).toHaveLength(2);
  await visibility(page);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await age(page, 20);
  await visibility(page);
  await settle(page);
  expect(requests).toHaveLength(2);
  fail = false;
  await age(page, 22);
  await visibility(page);
  await expect.poll(() => requests.length).toBe(3);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a failed manual city search is preserved instead of silently refreshing the old city', async ({
  page,
}) => {
  const requests = await setup(page);
  let fail = true;
  await page.route('https://api.open-meteo.com/**', (route) =>
    fail ? route.fulfill({ status: 429, json: {} }) : route.fallback(),
  );
  await page.getByRole('combobox').fill('Nandyal');
  await page.getByRole('combobox').press('Enter');
  await expect(page.getByRole('alert')).toContainText('Too many requests');
  await age(page, 21);
  await visibility(page);
  await settle(page);
  expect(requests).toHaveLength(2);
  fail = false;
  await page.locator('#retryBtn').click();
  await expect(page.locator('#locationName')).toHaveText('Nandyal, Andhra Pradesh');
});
