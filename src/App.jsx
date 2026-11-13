import { useEffect, useLayoutEffect, useState } from 'react';
import { Header } from './components/Header';
import { WeatherBackground } from './components/WeatherBackground';
import { SearchBar } from './components/SearchBar';
import { SavedCities } from './components/SavedCities';
import { WeatherCard } from './components/WeatherCard';
import { ForecastExplorer } from './components/ForecastExplorer';
import { LoadingWeather } from './components/LoadingWeather';
import { Footer } from './components/Footer';
import { Icon } from './components/Icon';
import { useWeather } from './hooks/useWeather';
import { formatTemperature, readCities, readPreference, writeStorage } from './lib/storage';



export default function App() {
  const [unit, setUnit] = useState(() => readPreference('weatherapp-temperature-unit', ['C', 'F'], 'C'));
  const [theme, setTheme] = useState(() => readPreference('weatherapp-theme', ['light', 'dark'], 'light'));
  const [saved, setSaved] = useState(() => readCities('weatherapp-saved-cities'));
  const [now, setNow] = useState(Date.now);
  const [shareText, setShareText] = useState('');
  const { weather, recent, loading, refreshing, error, status, setStatus, load, locate, retry, requestLabel } = useWeather();
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101a28' : '#eaf0f5');
    try { localStorage.setItem('weatherapp-theme', theme); } catch { /* Storage can be disabled by the browser. */ }
  }, [theme]);
  useEffect(() => { try { localStorage.setItem('weatherapp-temperature-unit', unit); } catch { /* Keep the session preference. */ } }, [unit]);
  useEffect(() => {
    if (!writeStorage('weatherapp-saved-cities', saved)) setStatus('Your browser could not save these cities on this device.');
  }, [saved, setStatus]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  const isSaved = Boolean(weather && saved.some(city => city.id === weather.currentCity.id));
  const toggleSave = () => {
    if (!weather) return;
    const city = weather.currentCity;
    setSaved(cities => isSaved ? cities.filter(item => item.id !== city.id) : [city, ...cities]);
    setStatus(city.label + (isSaved ? ' removed from saved cities.' : ' saved.'));
  };
  const move = (index, direction) => {
    setSaved(cities => {
      const target = index + direction;
      if (target < 0 || target >= cities.length) return cities;
      const next = [...cities]; [next[index], next[target]] = [next[target], next[index]]; return next;
    });
    setStatus('Saved city order updated.');
  };
  const share = async () => {
    if (!weather) return;
    const current = weather.currentWeatherData.current;
    const summary = `${weather.currentCity.label}: ${formatTemperature(current.temp_c, unit)}${unit}, ${current.condition.text}. Check it on Skylens: ${location.origin}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Skylens weather', text: summary, url: location.href });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(summary); setStatus('Weather summary copied to your clipboard.'); }
      else setShareText(summary);
    } catch (cause) { if (cause.name !== 'AbortError') { setShareText(summary); setStatus('Select and copy this weather summary.'); } }
  };

  return <div className="app-container">
    <WeatherBackground current={weather?.currentWeatherData.current}/>
    <Header unit={unit} onUnit={setUnit} theme={theme} onTheme={() => setTheme(value => value === 'light' ? 'dark' : 'light')}/>
    <div className="search-toolbar"><SearchBar saved={saved} recent={recent} onSearch={load} onLocate={locate} locating={loading}/>
    <SavedCities saved={saved} recent={recent} current={weather} unit={unit} onSelect={load} onMove={move} onRemove={id => { setSaved(cities => cities.filter(city => city.id !== id)); setStatus('Saved city removed.'); }}/>
    </div><p className="sr-only" role="status" aria-live="polite">{status}</p>
    {shareText && <div className="panel mb-5 p-4"><label className="block text-sm font-medium" htmlFor="shareSummary">Copy weather summary</label><textarea id="shareSummary" readOnly value={shareText} onFocus={event => event.target.select()} className="mt-2 w-full rounded-lg border border-line bg-canvas p-2 text-sm"/><button type="button" onClick={() => setShareText('')} className="control mt-2 px-3 py-1 text-xs">Close</button></div>}
    {error && <div className="error-container" id="errorContainer" role="alert"><div className="error-content"><Icon name="warning" className="error-icon"/><h3 className="error-title">Weather couldn't be loaded</h3><p className="error-message" id="errorMessage">{error}</p><button type="button" className="retry-btn" id="retryBtn" onClick={retry}><Icon name="refresh"/>Try Again</button></div></div>}
    {loading || (!weather && !error) ? <LoadingWeather city={requestLabel}/> : weather ? <main className="weather-content" id="weatherContent">
      <WeatherCard weather={weather} unit={unit} now={now} saved={isSaved} onSave={toggleSave} onShare={share} onRefresh={() => load(weather.currentCity, { refresh: true })} refreshing={refreshing} error={error}/>
      <ForecastExplorer key={weather.currentCity.id} days={weather.forecastData.forecast.forecastday} unit={unit} theme={theme} timeZone={weather.currentWeatherData.location.timezone}/>
    </main> : null}
    {!loading && (weather || error) && <Footer/>}
  </div>;
}
