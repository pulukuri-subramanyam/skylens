# SkyLens redesign integration

Implemented from the approved `origin/design/skylens-redesign` reference on `feat/integrate-skylens-redesign`, then prepared for the owner's requested `updates` branch preview. Main is unchanged; no merge or pull request was made.

## Scope and adaptations

This is a presentation change in the existing JavaScript React/Vite/Tailwind application. The reference's sample city, clock, weather and simulated geolocation were replaced with existing application data and handlers. No TypeScript or runtime dependencies were added. API handlers, provider normalization, request management, storage keys, cached-result recovery and the single-page architecture remain unchanged.

The reference was split into reusable `CityMenu`, `WeatherMetrics` and `DaylightBar` components and the existing header/search/weather/forecast/chart components. Existing realistic weather icons are retained because they cover night, fog, snow and other conditions beyond the prototype's small icon set. The existing footer, saved-city drag/keyboard reorder, missing-value labels, stale/error states and next-24-hours chart default are retained. After review, the owner requested restoration of condition-based background animations. `WeatherBackground` now renders behind the opaque dashboard cards using the actual current condition; its isolated stylesheet restores clouds, rain, snow, sunlight, stars, fog and storm ambience without moving cards or intercepting input. Motion stops for reduced-motion preferences and pauses while the page is hidden.

Saved and recent city menus use real stored city objects and coordinates. Saving/removing, selecting cities, outside-click/Escape dismissal and pointer/touch/keyboard dragging remain functional. Drag auto-scrolling now operates inside the menu. The selected forecast day still controls the real hourly chart; selecting it again returns to the next 24 hours. Chart.js remains responsible for tooltips, real samples and resizing rather than adopting the reference's static SVG plot.

## Real-data mapping

Ambient animation refinement adds varied individual drops/flakes, independently twinkling stars, two cloud/mist layers at different speeds and a slow low-opacity storm glow. Weather changes crossfade over 900ms with at most two scenes; the outgoing scene is removed after one second. Same-condition refreshes retain particle positions. Phones display fewer particles (rain 18, snow 16, stars 12) than desktops (48, 36, 22). All effects remain behind opaque cards and retain reduced-motion and hidden-page support.

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

## Changed files

| File | Change |
| --- | --- |
| `src/App.jsx` | Reference shell and toolbar composition; new browser theme colors; retains state/handlers and status surfaces. |
| `src/components/Header.jsx` | Brand tile, unit switch and theme control presentation. |
| `src/components/Icon.jsx` | Reusable line SVG interface icons; social icon fallback retained. |
| `src/components/SearchBar.jsx` | Reference search/location controls around existing search and geolocation logic. |
| `src/components/SavedCities.jsx` | Recent/Saved dropdown composition with existing readings, selection, removal and reorder. |
| `src/components/CityMenu.jsx` (new) | Shared accessible dropdown trigger, dismissal and focus behavior. |
| `src/components/WeatherCard.jsx` | Real-data hero, timezone date, refresh badge, condition and temperatures. |
| `src/components/WeatherMetrics.jsx` (new) | Six consistently sized actual-weather metrics. |
| `src/components/DaylightBar.jsx` (new) | Actual sunrise/sunset times and progress. |
| `src/components/DailyForecast.jsx` | Reference weekly heading and responsive forecast presentation. |
| `src/components/HourlyChart.jsx` | Reference colors, gradient, points, axis styling and actual temperature/rain tooltip content. |
| `src/hooks/useSavedCityDrag.js` | Safe handling of closed menus and clipped menu drag/scroll bounds. |
| `src/index.css` | Reference typography, palette, spacing, light/dark and responsive component styles; retained loading states. |
| `src/components/WeatherBackground.jsx` | Restored current-condition background component and isolated CSS import. |
| `src/components/weather-background.css` (new) | Condition-specific ambient layers, themes, motion and safe background stacking. |
| `tests/browser/weather-background.spec.js` (new) | Real-condition switching, stationary cards, pointer passthrough, reduced motion and background pausing. |
| `public/assets/fonts/plus-jakarta-sans-latin.woff2` (new) | Self-hosted variable Latin web font. |
| `public/assets/fonts/PLUS-JAKARTA-OFL.txt` (new) | Font license. |
| `build/serviceWorker.js` | Cache the new font for offline use. |
| `tests/browser/weather.spec.js` | Open Saved menu before existing reorder assertions. |
| `tests/browser/saved-drag.spec.js` | Adapt existing drag tests to menus; cover long-menu auto-scroll and cancellation. |
| `tests/browser/redesign.spec.js` (new) | Verify provider mappings, menus, geolocation, tooltip interaction and persisted unit/theme settings. |
| `tests/weather.test.js` | Freeze a midnight-sensitive fixture's clock, preserving existing assertions. |
| `README.md` | Current font/icon stack and integration documentation link. |
| `docs/redesign-integration.md` (new) | This mapping, file inventory and verification report. |

## Verification

- `npm run check`: all 14 unit tests and production build passed.
- Playwright `chromium`, `mobile` and `pwa` projects: all 51 tests passed using installed Chrome after refining weather backgrounds. Six focused browser checks passed again after the final cloud-layer adjustment. Coverage includes search, errors, geolocation, saved-city pointer/touch/keyboard drag, chart interaction/resizing, real-condition background motion, crossfades, particle density, reduced motion, accessibility, persistence and offline recovery. A local wrapper starts the production preview and runs the repository test suite with mocked providers.
- Visual checks at 320, 390, 640, 768, 1024 and 1440 pixels in both themes: no document horizontal overflow. Decorative hero rings are intentionally clipped. Screenshots use deterministic provider fixtures, not live observations.
- Additional WCAG A/AA Axe scans at desktop and phone widths in both themes: no serious/critical violations.
- `npm audit --omit=dev --audit-level=high`: zero vulnerabilities.
- `git diff --check`: passed.
- `npm run monitor`: existing deployed website, API readiness, geocoding and Open-Meteo checks passed. This is a production/provider check, not a deployment of these local changes.
- Firefox/Firefox-accessibility projects were attempted with a freshly installed Playwright Firefox. The browser process exits with code 1 before opening a page on this Windows environment. These projects remain unverified and need a working Firefox environment before release. No test was weakened or removed to conceal this limitation.
- The repository defines no lint, formatting or TypeScript-check command. JavaScript is intentionally retained.

## Review and release

The owner authorized publishing the `updates` branch for preview; production remains unchanged. Review desktop, tablet and phone layouts in both themes, then resolve Firefox verification before an approved production release. Live API authentication and account settings were not changed by this UI work.
