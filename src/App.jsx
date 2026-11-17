import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
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
import { readCities, readPreference, writeStorage } from './lib/storage';



export default function App() {
  const [unit, setUnit] = useState(() => readPreference('weatherapp-temperature-unit', ['C', 'F'], 'C'));
  const [theme, setTheme] = useState(() => readPreference('weatherapp-theme', ['light', 'dark'], 'light'));
  const [saved, setSaved] = useState(() => readCities('weatherapp-saved-cities'));
  const [now, setNow] = useState(Date.now);
  const { weather, recent, loading, locating, refreshing, error, status, setStatus, load, locate, retry, requestLabel } = useWeather();
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0d1422' : '#f2f7fb');
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
    const update = () => { document.documentElement.dataset.pageHidden = String(document.hidden); };
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
    return () => window.removeEventListener('load', register);
  }, []);

  const isSaved = Boolean(weather && saved.some(city => city.id === weather.currentCity.id));
  const toggleSave = useCallback(() => {
    if (!weather) return;
    const city = weather.currentCity;
    setSaved(cities => isSaved ? cities.filter(item => item.id !== city.id) : [city, ...cities]);
    setStatus(city.label + (isSaved ? ' removed from saved cities.' : ' saved.'));
  }, [weather, isSaved, setStatus]);
  const refreshWeather = useCallback(() => {
    if (weather) load(weather.currentCity, { refresh: true });
  }, [weather, load]);
  const move = (index, direction) => {
    setSaved(cities => {
      const target = index + direction;
      if (target < 0 || target >= cities.length) return cities;
      const next = [...cities]; [next[index], next[target]] = [next[target], next[index]]; return next;
    });
    setStatus('Saved city order updated.');
  };
  const reorder = (sourceId, targetIndex) => {
    setSaved(cities => {
      const from = cities.findIndex(city=>city.id===sourceId);
      const to = targetIndex;
      if (from < 0 || !Number.isInteger(to) || to < 0 || to >= cities.length || from === to) return cities;
      const next = [...cities];
      const [city] = next.splice(from,1);
      next.splice(to,0,city);
      return next;
    });
    setStatus('Saved city order updated.');
  };
  return <div className="app-shell">
    <WeatherBackground current={weather?.currentWeatherData.current} now={now}/>
    <a className="skip-link" href="#weatherContent">Skip to weather</a>
    <Header unit={unit} onUnit={setUnit} theme={theme} onTheme={() => setTheme(value => value === 'light' ? 'dark' : 'light')}/>
    <div className="search-row"><div className="toolbar-inner">
    <SearchBar saved={saved} recent={recent} onSearch={load} onLocate={locate} locating={locating}/>
    <SavedCities saved={saved} recent={recent} current={weather} unit={unit} onSelect={load} onMove={move} onReorder={reorder} onRemove={id => { setSaved(cities => cities.filter(city => city.id !== id)); setStatus('Saved city removed.'); }}/>
    </div></div>
    <div className="app-container">
    <p className="sr-only" role="status" aria-live="polite">{status}</p>
    {error && (weather ? <div className="weather-notice" id="errorContainer" role="alert">
      <Icon name="warning" className="weather-notice-icon"/><p id="errorMessage">{error}</p>
      <button type="button" className="weather-notice-retry" id="retryBtn" onClick={retry} disabled={loading || refreshing}><Icon name="refresh"/>Try Again</button>
    </div> : <div className="error-container" id="errorContainer" role="alert"><div className="error-content"><Icon name="warning" className="error-icon"/><h3 className="error-title">Weather couldn't be loaded</h3><p className="error-message" id="errorMessage">{error}</p><button type="button" className="retry-btn" id="retryBtn" onClick={retry}><Icon name="refresh"/>Try Again</button></div></div>)}
    {loading || (!weather && !error) ? <LoadingWeather city={requestLabel}/> : weather ? <main className="weather-content" id="weatherContent" tabIndex={-1}>
      <WeatherCard weather={weather} unit={unit} now={now} saved={isSaved} onSave={toggleSave} onRefresh={refreshWeather} refreshing={refreshing} error={error}/>
      <ForecastExplorer key={weather.currentCity.id} days={weather.forecastData.forecast.forecastday} unit={unit} theme={theme} timeZone={weather.currentWeatherData.location.timezone}/>
    </main> : null}
    {!loading && (weather || error) && <Footer/>}
    </div>
  </div>;
}
