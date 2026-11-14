import { useEffect, useRef } from 'react';

// Animate changed readings in place. Never remount controls or move their containers.
export function useReadingFade(container, weather, unit) {
  const previous = useRef(new WeakMap());
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animations = [];
    const readings = container.current?.querySelectorAll('#currentTemp, #currentCondition, #feelsLike, #todayHigh, #todayLow, .detail-value, .air-pm25, #currentWeatherIcon') || [];
    for (const reading of readings) {
      const value = reading.tagName === 'IMG' ? reading.getAttribute('src') : reading.textContent;
      if (previous.current.get(reading) !== value && !reducedMotion && reading.animate) {
        animations.push(reading.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' }));
      }
      previous.current.set(reading, value);
    }
    return () => animations.forEach(animation=>animation.cancel());
  }, [container, weather, unit]);
}
