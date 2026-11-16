import { useEffect, useState } from 'react';
import { ambientWind, daylightTint, particleCounts, precipitationIntensity } from '../lib/weatherAmbience';
import './weather-background.css';

function describeWeather(current) {
  const code = current?.condition?.iconCode || '';
  const kind = code.slice(0, 2);
  const rainy = ['09', '10', '11'].includes(kind);
  const snowy = kind === '13';
  const night = code.endsWith('n');
  const dark = kind === '04' || /overcast|broken clouds/i.test(current?.condition?.text || '');
  const condition = !current ? '' : rainy ? 'rainy' : snowy ? 'snowy' : kind === '50' ? 'foggy' : ['02', '03', '04'].includes(kind) ? 'cloudy' : night ? 'clear-night' : 'clear-day';
  const atmosphere = condition === 'clear-day' || (kind === '02' && !night) ? 'sunlight' : condition === 'clear-night' || (kind === '02' && night) ? 'starlight' : condition === 'foggy' ? 'mist' : kind === '11' ? 'storm-glow' : 'cloud-shimmer';
  const intensity = rainy || snowy ? precipitationIntensity(current) : 'medium';
  const classes = [condition, dark && 'dark-clouds', kind === '11' && 'stormy', kind === '02' && 'partly-cloudy', night ? 'at-night' : 'at-day', 'precip-' + intensity].filter(Boolean).join(' ');
  return { key: classes, classes, condition, atmosphere, intensity, particles: rainy ? 'rain' : snowy ? 'snow' : atmosphere === 'starlight' && current ? 'stars' : '' };
}

// Stable variation avoids animation jumps when readings or the clock update.
const particles = Array.from({ length: 56 }, (_, i) => ({
  left: ((i * 61.803 + 7) % 100).toFixed(3) + '%',
  top: ((i * 37.917 + 11) % 100).toFixed(3) + '%',
  variation: ((i * 17 + 3) % 23) / 23,
  delay: -((i * 7.31 + 1.7) % 29),
  drift: ((i * 13) % 61) - 30
}));

function WeatherScene({ scene, leaving }) {
  const count = particleCounts[scene.particles]?.[scene.intensity] || 0;
  const sizeFactor = scene.intensity === 'light' ? .65 : scene.intensity === 'heavy' ? 1.15 : 1;
  return <div className={'weather-scene ' + scene.classes + (leaving ? ' is-leaving' : ' is-current')}>
    <div className={'background-animation ' + scene.condition}/>
    {count > 0 && <div className={'weather-particles ' + scene.particles}>
      {particles.slice(0, count).map((p, i) => <span key={i} className="weather-particle" style={{
        left: scene.particles !== 'stars' && i % 4 < 2 ? (i % 4 === 0 ? 'calc(var(--weather-gutter) * ' + (.15 + p.variation * .7) + ')' : 'calc(100% - var(--weather-gutter) * ' + (.15 + p.variation * .7) + ')') : p.left,
        top: scene.particles === 'stars' ? p.top : 0,
        '--duration': (scene.particles === 'rain' ? (1.15 + p.variation * 1.3) / sizeFactor : scene.particles === 'snow' ? (9 + p.variation * 11) / sizeFactor : 4 + p.variation * 6) + 's',
        '--delay': p.delay + 's', '--size': (scene.particles === 'rain' ? (12 + p.variation * 18) * sizeFactor : scene.particles === 'snow' ? (2 + p.variation * 3) * sizeFactor : 1 + p.variation * 1.5) + 'px',
        '--drift': p.drift + 'px', '--particle-opacity': .25 + p.variation * .4
      }}/>)}
    </div>}
    {scene.condition && <div className={'weather-atmosphere ' + scene.atmosphere}/>}
  </div>;
}

export function WeatherBackground({ current, now }) {
  const next = describeWeather(current);
  const wind = ambientWind(current), daylight = daylightTint(current, now);
  const [scenes, setScenes] = useState(() => ({ current: next, previous: null }));
  const { key, classes, condition, atmosphere, intensity, particles: particleKind } = next;
  useEffect(() => {
    const scene = { key, classes, condition, atmosphere, intensity, particles: particleKind };
    setScenes(old => old.current.key === key ? old : { current: scene, previous: old.current });
    const timer = setTimeout(() => setScenes(old => ({ current: old.current, previous: null })), 1000);
    return () => clearTimeout(timer);
  }, [key, classes, condition, atmosphere, intensity, particleKind]);
  return <div className={'background-container weather-backdrop ' + classes} aria-hidden="true" style={{'--wind-x':wind.drift + 'vw','--wind-tilt':wind.tilt + 'deg','--daylight-warmth':daylight.warmth,'--sun-edge':daylight.edge}}>
    {scenes.previous && <WeatherScene key={scenes.previous.key} scene={scenes.previous} leaving/>}
    <WeatherScene key={scenes.current.key} scene={scenes.current}/>
  </div>;
}
