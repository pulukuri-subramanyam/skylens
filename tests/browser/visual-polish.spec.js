import { test, expect } from '@playwright/test';
import { providers, forecast } from './fixtures';

test('refresh keeps existing controls while updated readings fade', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await providers(page);
  await page.goto('/');
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await page.waitForTimeout(250);
  const refresh = page.locator('#refreshBtn');
  const control = await refresh.elementHandle();
  await page.route('https://api.open-meteo.com/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const data = forecast();
    data.current.temperature_2m = 16;
    await route.fulfill({ json: data });
  });
  await refresh.click();
  await expect(refresh).toBeDisabled();
  await expect(page.locator('#currentTemp')).toHaveText('16°C');
  await expect(refresh).toBeEnabled();
  expect(await control.evaluate((element) => element.isConnected)).toBe(true);
  await page.locator('#fahrenheitBtn').click();
  await expect(page.locator('#currentTemp')).toHaveText('61°F');
  await expect(page.locator('#fahrenheitBtn')).toBeFocused();
  await page.waitForTimeout(220);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(250);
    const tiles = await page.locator('.detail-item').evaluateAll((es) =>
      es.map((e) => ({
        w: e.offsetWidth,
        h: e.offsetHeight,
        label:
          e.querySelector('.detail-label').getBoundingClientRect().top -
          e.getBoundingClientRect().top,
      })),
    );
    for (const tile of tiles) {
      expect(Math.abs(tile.w - tiles[0].w)).toBeLessThanOrEqual(1);
      expect(Math.abs(tile.h - tiles[0].h)).toBeLessThanOrEqual(1);
    }
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth), {
        message: `Page overflows at ${width}px`,
      })
      .toBeLessThanOrEqual(0);
  }
  await page.screenshot({ path: testInfo.outputPath('visual-polish.png'), fullPage: true });
});

test('reduced motion keeps value updates immediate with no reading animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await providers(page);
  await page.goto('/');
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await page.locator('#fahrenheitBtn').click();
  await expect(page.locator('#currentTemp')).toHaveText('59°F');
  expect(await page.locator('#currentTemp').evaluate((el) => el.getAnimations().length)).toBe(0);
});

test('hourly canvas stays inside its wrapper while desktop and mobile widths change', async ({
  page,
}) => {
  await providers(page);
  await page.goto('/');
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await page.evaluate(() => document.fonts.ready);
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => (document.documentElement.dataset.theme = value), theme);
    for (const width of [1440, 768, 390, 320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(
          () =>
            page
              .locator('#temperatureChart')
              .evaluate((canvas) =>
                Math.abs(canvas.width / devicePixelRatio - canvas.parentElement.clientWidth),
              ),
          { message: `Chart backing size did not resize at ${width}px` },
        )
        .toBeLessThanOrEqual(1);
      // Restore the original managed width in the same task as the overflow probe.
      const bounds = await page.locator('#temperatureChart').evaluate((canvas) => {
        const original = canvas.style.width;
        try {
          canvas.style.width = '1400px';
          const child = canvas.getBoundingClientRect(),
            parent = canvas.parentElement.getBoundingClientRect();
          return {
            right: child.right,
            parentRight: parent.right,
            width: child.width,
            parentWidth: parent.width,
          };
        } finally {
          canvas.style.width = original;
        }
      });
      expect(bounds.right).toBeLessThanOrEqual(bounds.parentRight + 1);
      expect(bounds.width).toBeLessThanOrEqual(bounds.parentWidth + 1);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
        .toBeLessThanOrEqual(0);
    }
  }
});

test('hourly chart drawing buffer follows container-only resizes and chart recreation', async ({
  page,
}) => {
  await providers(page);
  await page.goto('/');
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  for (const width of [1440, 768, 390, 320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const control of ['#chartRainBtn', '#chartTemperatureBtn']) {
      await page.locator(control).click();
      await expect(page.locator(control)).toHaveAttribute('aria-pressed', 'true');
      for (const percent of ['65%', '100%']) {
        await page
          .locator('.chart-container')
          .evaluate((container, value) => (container.style.width = value), percent);
        await expect
          .poll(() =>
            page.locator('#temperatureChart').evaluate((canvas) => {
              const box = canvas.parentElement;
              return Math.max(
                Math.abs(canvas.width / devicePixelRatio - box.clientWidth),
                Math.abs(canvas.height / devicePixelRatio - box.clientHeight),
              );
            }),
          )
          .toBeLessThanOrEqual(1);
      }
    }
  }
});
