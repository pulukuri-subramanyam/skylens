import { test, expect } from '@playwright/test';
import { providers, forecast } from './fixtures';

test('redesigned surfaces use provider readings, units and the returned time zone',async({page})=>{
  await providers(page);
  await page.route('https://api.open-meteo.com/**',route=>{
    const data=forecast();
    data.timezone='Asia/Kolkata';
    Object.assign(data.current,{temperature_2m:31,apparent_temperature:34,relative_humidity_2m:83,pressure_msl:1002,wind_speed_10m:18,weather_code:95});
    data.hourly.visibility.fill(12300);data.hourly.uv_index.fill(7.3);
    data.daily.temperature_2m_max[0]=35;data.daily.temperature_2m_min[0]=24;
    return route.fulfill({json:data});
  });
  await page.goto('/');
  for(const [id,value] of Object.entries({currentTemp:'31°C',currentCondition:'Thunderstorm',feelsLike:'34°',todayHigh:'35°',todayLow:'24°',humidity:'83%',windSpeed:'18 km/h',visibility:'12.3 km',pressure:'1,002 hPa',uvIndex:'7.3',airQuality:'Fair'})) await expect(page.locator('#'+id)).toHaveText(value);
  const date=await page.evaluate(()=>new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kolkata',weekday:'long',month:'long',day:'numeric'}).format(Date.now()));
  await expect(page.locator('#cityLocalDate')).toHaveText(date);
  await expect(page.locator('#cityLocalTime')).not.toHaveText('Unavailable');
  await expect(page.locator('#lastUpdated')).toContainText('Last updated:');
  await expect(page.locator('#sunriseTime')).not.toHaveText('Unavailable');
  await expect(page.locator('#sunsetTime')).not.toHaveText('Unavailable');
  await page.locator('#fahrenheitBtn').click();await expect(page.locator('#currentTemp')).toHaveText('88°F');
  await expect(page.locator('#feelsLike')).toHaveText('93°');
  await expect(page.locator('#todayHigh')).toHaveText('95°');
});

test('city dropdowns support empty states, selection, removal, outside click and Escape',async({page})=>{
  await providers(page);await page.goto('/');await expect(page.locator('#currentTemp')).toBeVisible();
  const saved=page.locator('#savedCitiesBtn'),recent=page.locator('#recentCitiesBtn');
  await saved.click();await expect(page.getByText('No saved cities yet.',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(saved).toHaveAttribute('aria-expanded','false');await expect(saved).toBeFocused();
  await page.locator('#saveCityBtn').click();await saved.click();
  await expect(page.getByRole('group',{name:'Saved cities',exact:true}).getByRole('button',{name:'Show weather for London, England',exact:true})).toBeVisible();
  await recent.click();await expect(saved).toHaveAttribute('aria-expanded','false');
  await page.getByRole('group',{name:'Recent cities',exact:true}).getByRole('button',{name:'London, England',exact:true}).click();
  await expect(recent).toHaveAttribute('aria-expanded','false');await expect(page.locator('#currentTemp')).toBeVisible();
  await saved.click();await page.getByRole('group',{name:'Saved cities',exact:true}).getByRole('button',{name:'Remove London, England from saved cities',exact:true}).click();
  await expect(page.getByText('No saved cities yet.',{exact:true})).toBeVisible();
  await page.locator('#cityInput').click();await expect(saved).toHaveAttribute('aria-expanded','false');
});

test('current location uses returned coordinates, not a prototype city label',async({page})=>{
  await providers(page);
  await page.addInitScript(()=>{navigator.geolocation.getCurrentPosition=ok=>ok({coords:{latitude:15.48,longitude:78.48}});});
  await page.goto('/');await expect(page.locator('#currentTemp')).toBeVisible();
  await page.locator('#locationBtn').click();await expect(page.locator('#locationName')).toHaveText('Nandyal, Andhra Pradesh');
  await expect(page.locator('#currentTemp')).toHaveText('28°C');
});

test('chart hover tooltips remain interactive and preferences survive reload',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await providers(page);await page.goto('/');
  const chart=page.locator('#temperatureChart');await expect(chart).toBeVisible();await chart.scrollIntoViewIfNeeded();
  const before=await chart.evaluate(canvas=>canvas.toDataURL());
  const rect=await chart.boundingBox();await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5);
  await expect.poll(()=>chart.evaluate(canvas=>canvas.toDataURL())).not.toBe(before);
  await page.locator('#chartRainBtn').click();await expect(chart).toHaveAttribute('data-metric','rain');
  await page.locator('#fahrenheitBtn').click();await page.locator('#themeToggle').click();
  await page.reload();await expect(page.locator('#currentTemp')).toHaveText('59°F');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});


test('both city panels align with the shared Recent and Saved button edges', async ({page}) => {
  await providers(page);await page.goto('/');await expect(page.locator('#currentTemp')).toBeVisible();
  for (const width of [320,768,1440]) {
    await page.setViewportSize({width,height:900});
    for (const theme of ['light','dark']) {
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('#themeToggle').click();
      for (const name of ['recent','saved']) {
        await page.locator('#'+name+'CitiesBtn').click();
        const panel=page.locator('#'+name+'CitiesMenu');await expect(panel).toBeVisible();
        const box=await panel.boundingBox(),left=await page.locator('#recentCitiesBtn').boundingBox(),right=await page.locator('#savedCitiesBtn').boundingBox();
        expect(Math.abs(box.x-left.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(box.x+box.width-right.x-right.width)).toBeLessThanOrEqual(1);
        expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);
        await page.keyboard.press('Escape');await expect(panel).toHaveCount(0);
      }
    }
  }
});
