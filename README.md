# Skylens

A weather dashboard with current conditions, a seven-day forecast, an hourly temperature/rain chart, city suggestions, saved cities with drag and arrow reordering, air quality and daylight progress.

[Open Skylens](https://www.skylens.live)

## Stack

- JavaScript (ES modules and JSX)
- React for components and state
- Vite for development and production builds
- Tailwind CSS with custom component styles and responsive themes
- Chart.js for the hourly chart
- Locally bundled Font Awesome icons and a self-hosted Inter web font
- Open-Meteo for current weather and seven days of daily/hourly forecasts
- OpenWeather for geocoding and air quality; Photon supplements city suggestions
- A Vercel Function in `api/weather.mjs` keeps the OpenWeather key on the server
- Browser storage for saved/recent cities, preferences and the last weather result

## Run locally

Use Node.js 22.12 or newer in the Node 22 release line, or Node 24+.

```sh
npm ci
```

Copy `.env.example` to `.env.local` and set `OPENWEATHER_API_KEY` there. Do not prefix the key with `VITE_`, and never commit `.env.local`.

```sh
npm run dev
```

Vite serves the React app and runs the existing weather handler through a local development middleware. Both the local app and production use `/api/weather`. The OpenWeather proxy needs this key for location lookup and air quality. Open-Meteo forecasts do not require an API key; they are fetched directly using the selected coordinates.

## Build and check

```sh
npm test
npm run build
npm run preview
```

`preview` serves the production frontend only. Use `npm run dev` for the local weather API, or test the built app in a Vercel preview.

Run `npx playwright install chromium firefox` once, then `npm run test:e2e` for browser and accessibility checks. Tests mock provider data and do not require a provider key. `npm run monitor` checks the deployed production site and providers.

See [operations and release checklist](docs/operations.md) for security limits, monitoring, rollback and account settings that still require configuration. JavaScript is retained; TypeScript is not required.

## Project layout

```text
src/components/   Search, saved cities, weather card, forecasts, chart and footer
src/hooks/        Weather loading, city suggestions and reading transitions
src/lib/          Provider normalization, location ranking, storage, icons and error reporting
src/index.css     Tailwind layers, themes, responsive styles and animations
public/           Manifest, favicon, self-hosted font and social preview image
api/weather.mjs   Server-only OpenWeather proxy
api/health.mjs    Readiness and release endpoint
api/events.mjs    Allowlisted client error events
server/           Request guards and sanitized logging
build/            Service-worker generation and local icon bundling
scripts/          Production health-check script
tests/            Unit, browser, accessibility and offline checks
.github/workflows/ Automated quality checks and scheduled production health checks
docs/             Operations, security limits and release checklist
```

React renders the dashboard and manages interaction state. Tailwind's component layer contains the custom CSS for layout, typography, weather animations and light/dark themes. Tailwind utilities are available; its reset is disabled to preserve these styles.

## Deployment

Vercel runs `npm run build`, serves `dist/`, and runs the handlers in `api/` as Vercel Functions. Set `OPENWEATHER_API_KEY` as a Secret for Production and the relevant Preview branches. A new branch can need its own Preview variable if keys are branch-scoped.

Upgrades are developed on a separate branch and reviewed in a preview. Merge into `main` only after the owner's explicit approval.

## Offline behaviour

The production service worker caches the built application and self-hosted font. The last successful weather result remains available offline with its update time and a failed-refresh message. API responses are not cached by the service worker, so a stale API response cannot silently look fresh. Weather readings still require an internet connection for updates.

Saved cities and preferences are stored locally in the browser. PWA installation uses the browser's native install interface when supported.

## Reliability and release checks

Requests have bounded timeouts, cancellation and limited retries for transient failures. Provider and cached data are validated, and a failed refresh keeps the last successful result with a warning. Missing optional readings show `Unavailable`.

GitHub Actions runs dependency auditing, unit tests, production builds and Playwright browser checks, including accessibility and offline reloads. A separate scheduled workflow checks production health hourly; GitHub may delay scheduled runs.

Vercel Firewall enforces a fixed-window limit of **300 GET requests to `/api/weather` per 60 seconds per IP, per region**, returning HTTP 429 above the limit. Counters are shared across instances in a region, not a worldwide quota. This rule is configured in Vercel, not deployed from this repository. `/api/events` has only the application's per-instance guard. See [operations](docs/operations.md) for the limits and verification details.

## API key security

Only the server reads `OPENWEATHER_API_KEY`. Browser code calls `/api/weather` without the key. Rotate any key that has been exposed in earlier code or shared publicly; removing it from the current source does not erase Git history.

## Author

[Subramanyam Pulukuri](https://github.com/pulukuri-subramanyam)
