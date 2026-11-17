import { test, expect } from '@playwright/test';
import { providers, forecast } from './fixtures';

test('theme switches reuse the chart without replacing its drawing context ownership', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.setFixedTime(new Date());
  await providers(page);
  await page.goto('/');
  const canvas = page.locator('#temperatureChart');
  await expect(canvas).toBeVisible();
  for (const metric of ['temperature', 'rain']) {
    await page.locator(metric === 'rain' ? '#chartRainBtn' : '#chartTemperatureBtn').click();
    // Chart.js replaces this ownership record when it destroys/recreates a chart.
    const owner = await canvas.evaluateHandle((element) => element.$chartjs);
    expect(await owner.evaluate((record) => Boolean(record))).toBe(true);
    const readings = await page.locator('.chart-section table').innerText();
    for (const theme of ['dark', 'light', 'dark', 'light']) {
      await page.locator('#themeToggle').click();
      const durations = await page
        .locator('.app-shell,.header,.search-row,.forecast-section,.chart-section,.weather-hero')
        .evaluateAll((elements) =>
          elements.map((element) => getComputedStyle(element).transitionDuration),
        );
      expect(durations.every((duration) => duration === '0.08s, 0.08s')).toBe(true);
      await expect
        .poll(() =>
          page.evaluate(() =>
            ['.app-shell', '.forecast-section', '.chart-section'].map(
              (selector) => getComputedStyle(document.querySelector(selector)).backgroundColor,
            ),
          ),
        )
        .toEqual(
          theme === 'dark'
            ? ['rgb(13, 20, 34)', 'rgb(19, 30, 47)', 'rgb(19, 30, 47)']
            : ['rgb(242, 247, 251)', 'rgb(255, 255, 255)', 'rgb(255, 255, 255)'],
        );
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(
        await owner.evaluate(
          (record) => record === document.querySelector('#temperatureChart').$chartjs,
        ),
      ).toBe(true);
      await expect(canvas).toHaveAttribute('data-metric', metric);
      await expect(page.locator('.chart-section table')).toHaveText(readings, {
        useInnerText: true,
      });
    }
    await owner.dispose();
  }
});

test('all weather conditions retain a static page background in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await providers(page);
  let code = 0;
  await page.route('https://api.open-meteo.com/**', (route) => {
    const data = forecast();
    data.current.weather_code = code;
    return route.fulfill({ json: data });
  });
  await page.goto('/');
  await expect(page.locator('#temperatureChart')).toBeVisible();
  for (const weatherCode of [0, 2, 3, 45, 65, 75, 95]) {
    code = weatherCode;
    await page.locator('#refreshBtn').click();
    await expect(page.locator('#refreshBtn')).toBeEnabled();
    for (const theme of ['dark', 'light']) {
      await page.locator('#themeToggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await expect(
        page.locator(
          '.weather-backdrop,.weather-scene,.weather-particle,.weather-atmosphere,.cloud-evolution',
        ),
      ).toHaveCount(0);
      expect(
        await page
          .locator('.forecast-section,.chart-section')
          .evaluateAll((elements) =>
            elements.every((el) => getComputedStyle(el, '::before').content === 'none'),
          ),
      ).toBe(true);
      expect(
        await page.evaluate(() =>
          document
            .getAnimations()
            .some((animation) => animation.animationName?.startsWith('weather-')),
        ),
      ).toBe(false);
      await expect
        .poll(() =>
          page.locator('.app-shell').evaluate((el) => getComputedStyle(el).backgroundColor),
        )
        .toBe(theme === 'dark' ? 'rgb(13, 20, 34)' : 'rgb(242, 247, 251)');
    }
  }
});
