import { test, expect } from '@playwright/test';
import { providers, forecast } from './fixtures';

test('theme switches reuse the chart without replacing its drawing context ownership', async ({page})=>{
  await page.clock.setFixedTime(new Date());
  await providers(page);await page.goto('/');
  const canvas=page.locator('#temperatureChart');await expect(canvas).toBeVisible();
  for(const metric of ['temperature','rain']) {
    await page.locator(metric==='rain'?'#chartRainBtn':'#chartTemperatureBtn').click();
    // Chart.js replaces this ownership record when it destroys/recreates a chart.
    const owner=await canvas.evaluateHandle(element=>element.$chartjs);
    expect(await owner.evaluate(record=>Boolean(record))).toBe(true);
    const readings=await page.locator('.chart-section table').innerText();
    for(const theme of ['dark','light','dark','light']) {
      await page.locator('#themeToggle').click();
      await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
      expect(await owner.evaluate(record=>record===document.querySelector('#temperatureChart').$chartjs)).toBe(true);
      await expect(canvas).toHaveAttribute('data-metric',metric);
      await expect(page.locator('.chart-section table')).toHaveText(readings,{useInnerText:true});
    }
    await owner.dispose();
  }
});

test('theme colours blend in both directions without replacing weather particles or resetting motion', async ({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await providers(page);let code=65;
  await page.route('https://api.open-meteo.com/**',route=>{const data=forecast();data.current.weather_code=code;return route.fulfill({json:data});});
  await page.goto('/');await expect(page.locator('#temperatureChart')).toBeVisible();
  for(const weatherCode of [65,75,3,2,0]) {
    code=weatherCode;await page.locator('#refreshBtn').click();await expect(page.locator('#refreshBtn')).toBeEnabled();
    await expect(page.locator('.weather-scene.is-leaving')).toHaveCount(0);
    const scene=await page.locator('.weather-scene.is-current').elementHandle();
    const selector=weatherCode===0 ? '.weather-atmosphere' : [2,3].includes(weatherCode) ? '.cloud-evolution span' : '.weather-particle';
    const moving=await page.locator('.weather-scene.is-current '+selector).first().elementHandle();
    const started=await moving.evaluate(el=>el.getAnimations().find(a=>a instanceof CSSAnimation)?.startTime);
    for(const [theme,target] of [['dark',1],['light',0]]) {
      await page.locator('#themeToggle').click();await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
      const intermediate=await page.waitForFunction(target=>{
        const el=document.querySelector('.weather-scene.is-current .background-animation');
        const animation=el.getAnimations({subtree:true}).find(a=>a instanceof CSSTransition && a.transitionProperty==='opacity' && Number(a.effect.getKeyframes().at(-1).opacity)===target && Number(a.effect.getKeyframes()[0].opacity)===1-target);
        if(!animation)return false;
        animation.pause();animation.currentTime=Number(animation.effect.getTiming().duration)/2;
        return Number(getComputedStyle(el,'::before').opacity);
      },target);
      const opacity=await intermediate.jsonValue();expect(opacity).toBeGreaterThan(0);expect(opacity).toBeLessThan(1);
      expect(await scene.evaluate(el=>el===document.querySelector('.weather-scene.is-current'))).toBe(true);
      expect(await moving.evaluate(el=>el.isConnected)).toBe(true);
      expect(await moving.evaluate(el=>el.getAnimations().find(a=>a instanceof CSSAnimation)?.startTime)).toBe(started);
      await page.locator('.weather-scene.is-current .background-animation').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a instanceof CSSTransition && a.playState==='paused').forEach(a=>a.play()));
      await expect.poll(()=>page.locator('.weather-scene.is-current .background-animation').evaluate(el=>Number(getComputedStyle(el,'::before').opacity))).toBe(target);
    }
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#themeToggle').click();
  await expect.poll(()=>page.locator('.weather-scene.is-current .background-animation').evaluate(el=>Number(getComputedStyle(el,'::before').opacity))).toBe(1);
  expect(await page.locator('.weather-backdrop').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
});
