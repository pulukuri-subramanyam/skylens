export function WeatherBackground({ current }) {
  const code = current?.condition?.iconCode || '';
  const kind = code.slice(0, 2);
  const rainy = ['09', '10', '11'].includes(kind);
  const snowy = kind === '13';
  const condition = rainy ? 'rainy' : snowy ? 'snowy' : ['02', '03', '04', '50'].includes(kind) ? 'cloudy' : code.endsWith('n') ? 'clear-night' : 'clear-day';
  return <div className={`background-container weather-backdrop ${current ? condition : ''}`} aria-hidden="true">
    <div className={`background-animation ${current ? condition : ''}`}/>
    <div className={`weather-particles ${rainy ? 'rain' : snowy ? 'snow' : ''}`}/>
  </div>;
}
