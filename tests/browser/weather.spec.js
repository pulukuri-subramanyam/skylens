import { test, expect } from '@playwright/test';
import { providers, forecast } from './fixtures';

test.beforeEach(async ({page})=>{ await providers(page); });

test('keyboard suggestions select exact places; units and all forecast days work', async ({page})=>{
  await page.goto('/');
  await expect(page.locator('#locationName')).toHaveText('London, England');
  await expect(page.getByRole('button',{name:'Share weather'})).toHaveCount(0);
  const input = page.getByRole('combobox');
  await input.fill('Nandyal');
  await expect(page.getByRole('option').first()).toBeVisible();
  await input.press('ArrowDown'); await input.press('Enter');
  await expect(page.locator('#locationName')).toHaveText('Nandyal, Andhra Pradesh');
  await expect(page.locator('#currentTemp')).toHaveText('28°C');
  await page.getByRole('button',{name:'Use Fahrenheit'}).click();
  await expect(page.locator('#currentTemp')).toHaveText('82°F');
  for(let i=0;i<7;i++) {
    await page.locator('.forecast-item').nth(i).click();
    await expect(page.locator('.forecast-item').nth(i)).toHaveAttribute('aria-pressed','true');
    await expect(page.locator('#temperatureChart')).toBeVisible();
  }
  await page.getByRole('button',{name:'Rain chance',exact:true}).click();
  await expect(page.locator('#temperatureChart')).toHaveAttribute('data-metric','rain');
});

test('saved cities can be reordered and removed and survive reload', async ({page})=>{
  await page.goto('/');await expect(page.locator('#locationName')).toBeVisible();
  await page.locator('#saveCityBtn').click();
  await page.getByRole('combobox').fill('Nandyal');
  await page.getByRole('combobox').press('Enter');
  await expect(page.locator('#locationName')).toContainText('Nandyal');await page.locator('#saveCityBtn').click();
  await page.locator('#savedCitiesBtn').click();
  await page.getByRole('button',{name:'Reorder Nandyal, Andhra Pradesh',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.saved-city-chip').first()).toContainText('London');
  await page.reload();await page.locator('#savedCitiesBtn').click();await expect(page.locator('.saved-city-chip')).toHaveCount(2);
  await page.getByRole('button',{name:'Remove London, England',exact:false}).last().click();
  await expect(page.locator('.saved-city-chip')).toHaveCount(1);
});

test('failed refresh retains the last result and announces failure', async ({page})=>{
  await page.goto('/');await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await page.route('https://api.open-meteo.com/**',r=>r.fulfill({status:503,json:{}}));
  await page.locator('#refreshBtn').click();
  await expect(page.getByRole('alert')).toContainText('Refresh failed');
  await expect(page.getByRole('alert')).toHaveClass('weather-notice');
  await expect(page.locator('.error-title')).toHaveCount(0);
  await expect(page.locator('#dataFreshness')).toHaveCount(0);
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await page.reload();await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('a failed first load keeps the full error panel and can retry', async ({page})=>{
  let failed=true;
  await page.route('https://api.open-meteo.com/**',route=>failed?route.fulfill({status:503,json:{}}):route.fulfill({json:forecast()}));
  await page.goto('/');
  await expect(page.locator('.error-title')).toHaveText("Weather couldn't be loaded");
  await expect(page.locator('.weather-notice')).toHaveCount(0);
  await expect(page.locator('#currentTemp')).toHaveCount(0);
  failed=false;await page.locator('#retryBtn').click();
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('invalid optional readings never become fake zeroes', async ({page})=>{
  await page.route('https://api.open-meteo.com/**',r=>{const data=forecast();data.current.relative_humidity_2m=null;data.current.wind_speed_10m=null;delete data.hourly.visibility;delete data.hourly.uv_index;return r.fulfill({json:data});});
  await page.goto('/');await expect(page.locator('#humidity')).toHaveText('Unavailable');await expect(page.locator('#windSpeed')).toHaveText('Unavailable');await expect(page.locator('#visibility')).toHaveText('Unavailable');await expect(page.locator('#uvIndex')).toHaveText('Unavailable');
});

test('location permission errors keep search usable', async ({page})=>{
  await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=(_ok,fail)=>fail({code:1});});
  await page.goto('/');await expect(page.locator('#currentTemp')).toBeVisible();
  await page.locator('#locationBtn').click();await expect(page.getByRole('alert')).toContainText('Location access was denied');
  await page.getByRole('combobox').fill('Nandyal');await page.getByRole('combobox').press('Enter');await expect(page.locator('#locationName')).toContainText('Nandyal');
});

test('late responses from an old city cannot replace a newer search', async ({page})=>{
  await page.goto('/');await expect(page.locator('#locationName')).toContainText('London');
  await page.route('https://api.open-meteo.com/**',async r=>{const lat=Number(new URL(r.request().url()).searchParams.get('latitude'));if(lat<30)await new Promise(resolve=>setTimeout(resolve,800));try{await r.fulfill({json:forecast(lat)});}catch{ /* Cancelled old request. */ }});
  await page.getByRole('combobox').fill('Nandyal');await page.getByRole('combobox').press('Enter');
  await page.getByRole('combobox').fill('London');await page.getByRole('combobox').press('Enter');
  await expect(page.locator('#locationName')).toContainText('London');await page.waitForTimeout(1100);await expect(page.locator('#locationName')).toContainText('London');
});
