# SkyLens redesign integration

Implemented from the approved `origin/design/skylens-redesign` reference, reviewed on `updates`, and merged into `main` with the owner's approval on November 16, 2026 through [PR #16](https://github.com/pulukuri-subramanyam/skylens/pull/16). Release commit `c76149cc919768c371450fe22b17adacc2195b16` is deployed at [skylens.live](https://skylens.live).

## Scope and adaptations

This is a presentation change in the existing JavaScript React/Vite/Tailwind application. The reference's sample city, clock, weather and simulated geolocation were replaced with existing application data and handlers. No TypeScript or runtime dependencies were added. API handlers, provider normalization, request management, storage keys, cached-result recovery and the single-page architecture remain unchanged.

The reference was split into reusable `CityMenu`, `WeatherMetrics` and `DaylightBar` components and the existing header/search/weather/forecast/chart components. Existing realistic weather icons are retained because they cover night, fog, snow and other conditions beyond the prototype's small icon set. The existing footer, saved-city drag/keyboard reorder, missing-value labels, stale/error states and next-24-hours chart default are retained. Weather background animations were subsequently removed at the owner's request. The page now uses a static light/dark background; chart, loading and reading-update animations remain.

Saved and recent city menus use real stored city objects and coordinates. Saving/removing, selecting cities, outside-click/Escape dismissal and pointer/touch/keyboard dragging remain functional. Drag auto-scrolling now operates inside the menu. The selected forecast day still controls the real hourly chart; selecting it again returns to the next 24 hours. Chart.js remains responsible for tooltips, real samples and resizing rather than adopting the reference's static SVG plot.

## Real-data mapping

Ambient animation refinement adds varied individual drops/flakes, independently twinkling stars, irregular overlapping cloud banks and two mist layers at different speeds. Weather changes crossfade over 900ms with at most two scenes; the outgoing scene is removed after one second. Same-condition refreshes retain particle positions. Provider condition descriptions set qualitative light/medium/heavy intensity, not rainfall-rate estimates: desktop rain counts are 24/40/56 and snow 20/32/44; phones use 10/16/22 and 8/12/16. Stars use 22 on desktop and 12 on phones. Wind speed and compass direction control screen drift capped at 6vw and rain tilt capped at 12 degrees. Clear-sky warmth follows the city's absolute sunrise/sunset timestamps and existing minute clock; missing timings produce no invented tint. More precipitation particles are distributed in page margins, with opaque cards shielding all readings. No new API fields or requests are required. All effects retain reduced-motion and hidden-page support.

| Redesigned surface | Existing source |
| --- | --- |
| City | `weather.currentCity.label` |
| Local time/date | Application clock formatted with `currentWeatherData.location.timezone` |
| Updated/refresh status | `current.last_updated`, `lastFetchedAt`, existing refresh/error state |
| Temperature and units | `current.temp_c` / `temp_f`, stored unit preference |
| Condition and weather image | `current.condition.text` / `iconCode`, existing weather-icon utility |
| Feels like | `current.feelslike_c`, existing unit formatter |
| Today's high/low | First normalized forecast day's `maxtemp_c` / `mintemp_c` |
| Humidity | `current.humidity` |
| Wind | `current.wind_kph` / `wind_dir` |
| Visibility | `current.vis_km` |
| Pressure | `current.pressure_mb`, rounded display with thousands separator |
| UV | `current.uv` |
| Air quality | `lastAirQuality.label` / `pm25` |
| Daylight | `current.sunrise` / `sunset`, location timezone and application clock |
| Seven days | `forecastData.forecast.forecastday[].date` and `.day` |
| Hourly temperature/rain | Normalized forecast `.hour[]`, selected date or next 24 hours |

Missing optional readings continue to show `Unavailable`. Sunrise/sunset progress is clamped and handles nighttime or missing timestamps. Temperature/rain tooltips use the actual hovered sample. No reference sample weather values were copied into production components.

Performance follow-up (verified with all 17 unit tests, production build and 14 desktop/mobile background/theme browser checks): shortened theme fades to 180ms, removed large-area blur filters and per-particle colour interpolation, paused inactive particle animations, and memoized the background so unrelated theme/control renders do not rebuild its particle tree. Soft radial gradients, weather intensity, wind and daylight behaviour remain.

## Changed files

Theme balance uses a 180ms opacity crossfade between light and dark sky palettes, with smooth particle colour/opacity changes. It keeps the existing scene and particle nodes mounted, including their animation clocks. Snow uses a more muted sky and lower flake opacity to avoid dominating rain and clouds. Cloud drift names remain consistent across themes to prevent position resets. Reduced motion switches colours immediately.

Focus-aware polish uses existing search/menu expanded states to soften the backdrop while a city menu is open. On phones, small decorative accents are clipped to the existing 16px section gaps; they add no layout space and cannot cover or intercept readings. These accents stop for reduced motion and pause in hidden pages. A 19s transform-only easing cycle adds decorative wind variation; it does not claim measured gust data or change the wind reading. Fall drift plus easing remains within the existing cap.

Motion polish keeps a stable bounded particle pool within each weather family. Light/heavy changes fade visibility and size over 1200ms without restarting falling motion or crossfading the whole scene. A vertical mask softens precipitation at viewport edges. Snow has independently timed sway, with smaller, softer distant flakes falling more slowly. Three subtle cloud wisps (two on phones) evolve at different speeds. Storm ambience uses low-opacity 37s and 61s offset glow cycles rather than rapid flashes. Responsive checks use browser-emulated viewports; they do not establish physical-phone performance.

| File | Change |
| --- | --- |
| `src/App.jsx` | Reference shell and toolbar composition; new browser theme colors; retains state/handlers and status surfaces. |
| `src/components/Header.jsx` | Brand tile, unit switch and theme control presentation. |
| `src/components/Icon.jsx` | Reusable line SVG interface icons; social icon fallback retained. |
| `src/components/SearchBar.jsx` | Reference search/location controls around existing search and geolocation logic. |
| `src/components/SavedCities.jsx` | Recent/Saved dropdown composition with existing readings, selection, removal and reorder. |
| `src/components/CityMenu.jsx` (new) | Shared accessible dropdown trigger, dismissal and focus behavior. |
| `src/components/WeatherCard.jsx` | Real-data hero, timezone date, separate update timestamp and Refresh action, condition and temperatures. |
| `src/components/WeatherMetrics.jsx` (new) | Six consistently sized actual-weather metrics. |
| `src/components/DaylightBar.jsx` (new) | Actual sunrise/sunset times and progress. |
| `src/components/DailyForecast.jsx` | Reference weekly heading and responsive forecast presentation. |
| `src/components/HourlyChart.jsx` | Reference colors, gradient, points, axis styling and actual temperature/rain tooltip content. |
| `src/hooks/useSavedCityDrag.js` | Safe handling of closed menus and clipped menu drag/scroll bounds. |
| `src/index.css` | Reference typography, palette, spacing, light/dark and responsive component styles; retained loading states. |
| `tests/browser/weather-theme.spec.js` (new) | Chart reuse and preserved readings during theme changes; static backgrounds across weather conditions and both themes. |
| `public/assets/fonts/plus-jakarta-sans-latin.woff2` (new) | Self-hosted variable Latin web font. |
| `public/assets/fonts/PLUS-JAKARTA-OFL.txt` (new) | Font license. |
| `build/serviceWorker.js` | Cache the new font for offline use. |
| `tests/browser/weather.spec.js` | Open Saved menu before existing reorder assertions. |
| `tests/browser/saved-drag.spec.js` | Adapt existing drag tests to menus; cover long-menu auto-scroll and cancellation. |
| `tests/browser/redesign.spec.js` (new) | Verify provider mappings, menus, geolocation, tooltip interaction and persisted unit/theme settings. |
| `tests/weather.test.js` | Freeze a midnight-sensitive fixture's clock, preserving existing assertions. |
| `README.md` | Current font/icon stack and integration documentation link. |
| `docs/redesign-integration.md` (new) | This mapping, file inventory and verification report. |

## Release verification

The final pre-merge checks ran against `09dffb459ceb93c16eeb8e04fd8eb0b0617b8825`, which PR #16 merged into the production release above.

- [Quality workflow](https://github.com/pulukuri-subramanyam/skylens/actions/runs/43914872225): all 18 unit tests, production build and dependency audit passed. The audit reported zero vulnerabilities.
- The same workflow's `chromium`, `mobile`, `firefox` and `pwa` browser suite passed 136 tests with one conditional skip. That skip is the Chromium-CDP-only touch dispatch test in Firefox; Firefox pointer interactions remain tested. Browser tests use mocked provider data.
- Both dedicated Firefox accessibility tests passed, covering the default dashboard and empty-search feedback in both themes with the full configured WCAG A/AA rule set. No accessibility rules were disabled. Playwright is pinned to stable 1.64.1 to avoid the [upstream Firefox ARIA reflection regression](https://github.com/microsoft/playwright/issues/43967) in 1.65.
- [Firefox chart resize verification](https://github.com/pulukuri-subramanyam/skylens/actions/runs/43914872203): all 20 repeated checks passed with one worker and no retries.
- Live preview and production browser checks loaded real London weather, switched Celsius/Fahrenheit and light/dark themes, and displayed the hourly chart without page errors. No horizontal overflow appeared at 390, 768 or 1440 pixels.
- After deployment, `/api/health` returned `ok` with release `c76149cc9197`. `npm run monitor` passed for the production website, API readiness, geocoding and Open-Meteo.
- Local Windows Firefox could not launch during earlier checks; Linux CI supplied the completed Firefox verification. Mobile Chrome viewport emulation does not establish actual iPhone/Safari behaviour, physical-device performance or device location-permission behaviour.
- The repository defines no lint, formatting or TypeScript-check command. JavaScript is intentionally retained.

## Review and release

The approved redesign is released on `main` and production. The `updates` branch was retained. Future changes still require a separate branch, preview review and the owner's explicit approval before merging into `main`. Live API authentication and account settings were not changed by this UI work.
