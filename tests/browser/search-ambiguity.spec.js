import {test,expect} from '@playwright/test';
import {providers,nandyal} from './fixtures';

for(const method of ['Enter','button']) {
  test(`ambiguous ${method} submission waits for results and requires an explicit place`,async({page})=>{
    await providers(page);
    await page.addInitScript(city=>localStorage.setItem('weatherapp-saved-cities',JSON.stringify([{...city,id:'ap',label:'Nandyal, Andhra Pradesh',query:'Nandyal'}])),nandyal);
    await page.goto('/');await expect(page.locator('#locationName')).toHaveText('London, England');
    let release,started;
    const gate=new Promise(resolve=>release=resolve),requestStarted=new Promise(resolve=>started=resolve);
    await page.route('**/api/weather?**',async route=>{
      if(new URL(route.request().url()).searchParams.get('q')!=='Nandyal')return route.fallback();
      started();await gate;
      return route.fulfill({json:[{...nandyal,state:'Maharashtra',lat:20.5,lon:75.5},nandyal]});
    });
    const input=page.getByRole('combobox');await input.fill('Nandyal');
    if(method==='Enter')await input.press('Enter');else await page.locator('#searchBtn').click();
    await requestStarted;await expect(page.locator('#locationName')).toHaveText('London, England');
    release();
    await expect(page.getByText('Choose a location to see its weather.',{exact:true})).toBeVisible();
    await expect(page.getByRole('option')).toHaveCount(2);
    await expect(page.locator('#locationName')).toHaveText('London, England');
    if(method==='Enter') {
      const options=await page.getByRole('option').allTextContents();
      const index=options.findIndex(text=>text.includes('Andhra Pradesh'));
      expect(index).toBeGreaterThanOrEqual(0);
      for(let i=0;i<=index;i++)await input.press('ArrowDown');
      await input.press('Enter');
    } else await page.getByRole('option').filter({hasText:'Andhra Pradesh'}).click();
    await expect(page.locator('#locationName')).toHaveText('Nandyal, Andhra Pradesh');
    await expect(page.locator('#currentTemp')).toHaveText('28'+String.fromCharCode(176)+'C');
    await expect(page.locator('.city-suggestions')).toHaveCount(0);
  });
}


for(const action of ['Escape','edit']) {
  test(`pending search is cancelled when the user chooses to ${action}`,async({page})=>{
    await providers(page);await page.goto('/');await expect(page.locator('#locationName')).toHaveText('London, England');
    let release,started,finished,weatherRequests=0;
    const gate=new Promise(resolve=>release=resolve),requestStarted=new Promise(resolve=>started=resolve),requestFinished=new Promise(resolve=>finished=resolve);
    page.on('request',request=>{const url=new URL(request.url());if(url.hostname==='api.open-meteo.com'&&Number(url.searchParams.get('latitude'))===nandyal.lat)weatherRequests++;});
    await page.route('**/api/weather?**',async route=>{
      if(new URL(route.request().url()).searchParams.get('q')!=='Nandyal')return route.fallback();
      started();await gate;try{await route.fulfill({json:[nandyal]});}catch{/* Editing or closing aborts this request. */}finally{finished();}
    });
    const input=page.getByRole('combobox');await input.fill('Nandyal');await input.press('Enter');await requestStarted;
    if(action==='Escape')await input.press('Escape');else await input.fill('London');
    release();await requestFinished;
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    expect(weatherRequests).toBe(0);await expect(page.locator('#locationName')).toHaveText('London, England');
    if(action==='Escape')await expect(input).toHaveAttribute('aria-expanded','false');
  });
}
