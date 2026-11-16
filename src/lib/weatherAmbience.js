const directions = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
export const particleCounts = {
  rain: { light:24, medium:40, heavy:56 },
  snow: { light:20, medium:32, heavy:44 },
  stars: { medium:22 }
};

export function precipitationIntensity(current) {
  const text = current?.condition?.text || '';
  if (/heavy|hail|thunderstorm/i.test(text)) return 'heavy';
  if (/light|drizzle|grains/i.test(text)) return 'light';
  return 'medium';
}

export function ambientWind(current) {
  const speed = Number.isFinite(current?.wind_kph) ? Math.max(0, Math.min(50, current.wind_kph)) : 0;
  const index = directions.indexOf(current?.wind_dir);
  // Provider direction describes where wind comes FROM. This is a visual screen drift,
  // not a geographic vector: easterly wind moves particles left, westerly right.
  const across = index < 0 ? 0 : Math.round(-Math.sin(index * Math.PI / 8) * speed / 50 * 600) / 100 || 0;
  return { drift:across, tilt:-across * 2 };
}

export function daylightTint(current, now) {
  const rise = Date.parse(current?.sunrise), set = Date.parse(current?.sunset);
  if (!Number.isFinite(rise) || !Number.isFinite(set) || set <= rise || !Number.isFinite(now)) return { warmth:0, edge:'12%' };
  const window = Math.min(90 * 60000, (set - rise) / 4);
  const sunrise = Math.abs(now - rise) <= Math.abs(now - set);
  const distance = Math.abs(now - (sunrise ? rise : set));
  const proximity = Math.max(0, 1 - distance / window);
  return { warmth:proximity * proximity * (3 - 2 * proximity), edge:sunrise ? '12%' : '88%' };
}
