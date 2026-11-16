import { test, expect } from '@playwright/test';
import { providers, forecast } from './fixtures';

test('real current conditions select ambient motion without moving dashboard cards', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'no-preference' });
  await providers(page);
  let code=0,day=1;
  await page.route('https://api.open-meteo.com/**', route=>{
    const data=forecast();
    data.current.weather_code=code;
    data.current.is_day=day;
    return route.fulfill({ json:data });
  });
  await page.goto('/');
  const backdrop=page.locator('.weather-backdrop');
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  for (const [weatherCode,isDay,kind,extra] of [[0,1,'clear-day','at-day'],[0,0,'clear-night','at-night'],[2,1,'cloudy','partly-cloudy'],[3,1,'cloudy','dark-clouds'],[45,1,'foggy','at-day'],[61,1,'rainy','at-day'],[71,1,'snowy','at-day'],[95,0,'rainy','stormy']]) {
    code=weatherCode; day=isDay;
    await page.locator('#refreshBtn').click();
    await expect(page.locator('#refreshBtn')).toBeEnabled();
    await expect(backdrop).toHaveClass(new RegExp(kind));
    await expect(backdrop).toHaveClass(new RegExp(extra));
    const card=page.locator('.current-weather-card');
    await card.hover();
    const before=await card.boundingBox();
    const animation=await backdrop.evaluate(el=>el.getAnimations({subtree:true}).find(a=>a.playState==='running')?.currentTime);
    expect(animation).toBeGreaterThanOrEqual(0);
    await expect.poll(()=>backdrop.evaluate(el=>el.getAnimations({subtree:true}).find(a=>a.playState==='running')?.currentTime)).toBeGreaterThan(animation);
    expect(await card.boundingBox()).toEqual(before);
    expect(await backdrop.evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(await page.evaluate(()=>innerWidth));
  }
  await page.locator('#themeToggle').click();
  await expect(page.locator('#refreshBtn')).toBeVisible();
});

test('ambient weather respects reduced motion and pauses in hidden pages', async ({page})=>{
  await providers(page); await page.goto('/');
  await expect(page.locator('#currentTemp')).toHaveText('15°C');
  const backdrop=page.locator('.weather-backdrop');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(()=>backdrop.evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>document.documentElement.dataset.pageHidden='true');
  expect(await backdrop.evaluate(el=>el.getAnimations({subtree:true}).every(a=>a.playState==='paused'))).toBe(true);
});

test('weather scenes crossfade, discard old layers and use lighter particle density on phones', async ({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await providers(page);
  let code=0,day=1;
  await page.route('https://api.open-meteo.com/**',route=>{
    const data=forecast();data.current.weather_code=code;data.current.is_day=day;
    return route.fulfill({json:data});
  });
  await page.goto('/');await expect(page.locator('#currentTemp')).toHaveText('15°C');
  for(const [weatherCode,isDay,kind,desktopCount,phoneCount] of [[61,1,'rain',48,18],[71,1,'snow',36,16],[0,0,'stars',22,12]]) {
    code=weatherCode;day=isDay;await page.locator('#refreshBtn').click();await expect(page.locator('#refreshBtn')).toBeEnabled();
    const scene=page.locator('.weather-scene.is-current');
    await expect(scene.locator('.'+kind)).toBeAttached();
    expect(await scene.evaluate(el=>getComputedStyle(el).animationName)).toBe('weather-scene-enter');
    expect(await page.locator('.weather-scene').count()).toBeLessThanOrEqual(2);
    await expect(page.locator('.weather-scene.is-leaving')).toHaveCount(0);
    for(const [width,count] of [[1440,desktopCount],[390,phoneCount]]) {
      await page.setViewportSize({width,height:900});
      expect(await scene.locator('.weather-particle').evaluateAll(elements=>elements.filter(el=>getComputedStyle(el).display!=='none').length)).toBe(count);
    }
    const variations=await scene.locator('.weather-particle').evaluateAll(elements=>elements.slice(0,12).map(el=>getComputedStyle(el).animationDuration));
    expect(new Set(variations).size).toBeGreaterThan(5);
    const particle=await scene.locator('.weather-particle').first().elementHandle();
    await page.locator('#refreshBtn').click();await expect(page.locator('#refreshBtn')).toBeEnabled();
    expect(await particle.evaluate(el=>el.isConnected)).toBe(true);
  }
  for(const weatherCode of [2,3]) {
    code=weatherCode;day=1;await page.locator('#refreshBtn').click();await expect(page.locator('#refreshBtn')).toBeEnabled();
    const durations=await page.locator('.weather-scene.is-current').evaluate(el=>[getComputedStyle(el,'::before').animationDuration,getComputedStyle(el,'::after').animationDuration]);
    expect(durations[0]).not.toBe(durations[1]);
  }
  for(const weatherCode of [61,45,0]) {
    code=weatherCode;await page.locator('#refreshBtn').click();await expect(page.locator('#refreshBtn')).toBeEnabled();
    expect(await page.locator('.weather-scene').count()).toBeLessThanOrEqual(2);
  }
  await expect(page.locator('.weather-scene.is-current')).toHaveClass(/clear-day/);
  await expect(page.locator('.weather-scene.is-leaving')).toHaveCount(0);
});
