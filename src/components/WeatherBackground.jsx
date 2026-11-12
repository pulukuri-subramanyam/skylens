export function WeatherBackground({ current }) {
  const code = current?.condition?.iconCode || '';
  const kind = code.slice(0, 2);
  const rainy = ['09', '10', '11'].includes(kind);
  const snowy = kind === '13';
  const night = code.endsWith('n');
  const darkClouds = kind === '04' || /overcast|broken clouds/i.test(current?.condition?.text || '');
  const condition = rainy ? 'rainy' : snowy ? 'snowy' : kind === '50' ? 'foggy' : ['02', '03', '04'].includes(kind) ? 'cloudy' : night ? 'clear-night' : 'clear-day';
  return <div className={`background-container weather-backdrop ${current ? condition : ''} ${darkClouds ? 'dark-clouds' : ''} ${kind === '11' ? 'stormy' : ''} ${kind === '02' ? 'partly-cloudy' : ''} ${night ? 'at-night' : 'at-day'}`} aria-hidden="true">
    <div className={`background-animation ${current ? condition : ''}`}/>
    <div className={`weather-particles ${rainy ? 'rain' : snowy ? 'snow' : ''}`}/>
    {current && <div className={`weather-atmosphere ${condition === 'clear-day' || (kind === '02' && !night) ? 'sunlight' : condition === 'clear-night' || (kind === '02' && night) ? 'starlight' : condition === 'foggy' ? 'mist' : kind === '11' ? 'storm-glow' : 'cloud-shimmer'}`}/>}
  </div>;
}
