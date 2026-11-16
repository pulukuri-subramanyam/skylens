import { test, expect } from '@playwright/test';
import { providers, forecast } from './fixtures';

async function rainyWeather(page) {
  await page.emulateMedia({reducedMotion:'no-preference'});await providers(page);
  await page.route('https://api.open-meteo.com/**',route=>{const data=forecast();data.current.weather_code=65;data.current.wind_speed_10m=20;data.current.wind_direction_10m=90;return route.fulfill({json:data});});
  await page.goto('/');await expect(page.locator('#temperatureChart')).toBeVisible();
}

test('open city menus soften only the background and closing them restores it', async ({page})=>{
  await rainyWeather(page);const backdrop=page.locator('.weather-backdrop');
  const opacity=()=>backdrop.evaluate(el=>Number(getComputedStyle(el).opacity));
  for(const id of ['recentCitiesBtn','savedCitiesBtn']) {
    await page.locator('#'+id).click();await expect.poll(opacity).toBe(.35);
    expect(await page.locator('.current-weather-card').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
    await page.keyboard.press('Escape');await expect.poll(opacity).toBe(1);
  }
  await page.locator('#cityInput').fill('London');await expect(page.locator('#citySuggestions')).toBeVisible();
  await expect.poll(opacity).toBe(.35);
  await page.locator('#cityInput').press('Escape');await expect.poll(opacity).toBe(1);
  await page.locator('#currentCondition').click();await page.locator('#cityInput').click();await expect(page.locator('#citySuggestions')).toBeVisible();
  await expect.poll(opacity).toBe(.35);
  await page.locator('#currentCondition').click();await expect.poll(opacity).toBe(1);
});

test('phone accents are clipped to existing section gaps and stop for reduced motion', async ({page})=>{
  await rainyWeather(page);
  for(const width of [320,390]) {
    await page.setViewportSize({width,height:900});
    const gaps=await page.locator('.forecast-section,.chart-section').evaluateAll(sections=>sections.map(el=>{
      const bounds=el.getBoundingClientRect(),previous=el.previousElementSibling.getBoundingClientRect(),style=getComputedStyle(el,'::before');
      return {gap:bounds.top-previous.bottom,top:parseFloat(style.top),height:parseFloat(style.height),pointer:style.pointerEvents,content:style.content,mask:style.maskImage};
    }));
    for(const gap of gaps) {
      expect(gap.gap).toBeCloseTo(16,0);expect(gap.top).toBe(-16);expect(gap.height).toBe(16);
      expect(gap.pointer).toBe('none');expect(gap.content).not.toBe('none');expect(gap.mask).not.toBe('none');
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBe(0);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.locator('.forecast-section').evaluate(el=>getComputedStyle(el,'::before').display)).toBe('none');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:900});
  expect(await page.locator('.forecast-section').evaluate(el=>getComputedStyle(el,'::before').content)).toBe('none');
});

test('decorative wind eases without changing the reported wind or moving the card', async ({page})=>{
  await rainyWeather(page);await expect(page.locator('#windSpeed')).toHaveText('20 km/h');
  const layer=page.locator('.weather-scene.is-current .weather-particles.rain');
  const before=await layer.evaluate(el=>getComputedStyle(el).transform);
  const card=await page.locator('.current-weather-card').boundingBox();
  await expect.poll(()=>layer.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
  await expect(page.locator('#windSpeed')).toHaveText('20 km/h');await expect(page.locator('#windDirection')).toHaveText('E');
  expect(await page.locator('.current-weather-card').boundingBox()).toEqual(card);
  expect(await page.locator('.weather-backdrop').evaluate(el=>el.style.getPropertyValue('--wind-x'))).toBe('-2.4vw');
});
