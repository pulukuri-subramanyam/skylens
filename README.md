# Skylens

A weather dashboard with current conditions, a seven-day forecast, an hourly temperature/rain chart, city suggestions, saved cities, air quality and daylight progress.

[Open Skylens](https://www.skylens.live)

## Stack

- React for components and state
- Vite for development and production builds
- Tailwind CSS for responsive layouts, colours and themes
- Chart.js for the hourly chart
- OpenWeather for forecasts, geocoding and air quality; Photon supplements city suggestions
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

Vite serves the React app and runs the existing weather handler through a local development middleware. Both the local app and production use `/api/weather`. Without a key, the page runs but weather requests return a configuration error.

## Build and check

```sh
npm test
npm run build
npm run preview
```

`preview` serves the production frontend only. Use `npm run dev` for the local weather API, or test the built app in a Vercel preview.

## Project layout

```text
src/components/    Search, saved cities, weather card, forecasts, chart and footer
src/hooks/         Weather loading and city-suggestion state
src/lib/           Provider normalization, location ranking, storage and weather icons
src/index.css      Tailwind import, theme variables and shared controls
src/loader.css     Original weather loading animation
public/           Manifest, favicon, self-hosted font and sharing image
api/weather.mjs   Server-only OpenWeather proxy
build/            Generates the service worker with Vite's hashed asset names
tests/            Location ranking and weather-data normalization checks
```

## Deployment

Vercel runs `npm run build` and serves `dist/`; `api/weather.mjs` stays a Vercel Function. Set `OPENWEATHER_API_KEY` as a Secret for Production and the relevant Preview branches. A new branch can need its own Preview variable if keys are branch-scoped.

Upgrades are developed on a separate branch and reviewed in a preview. Merge into `main` only after the owner's explicit approval.

## Offline behaviour

The production service worker caches the built application and self-hosted font. The last successful weather result remains available offline with its update time and a failed-refresh message. API responses are not cached by the service worker, so a stale API response cannot silently look fresh. Weather readings still require an internet connection for updates.

Saved cities and preferences keep their existing storage keys during migration. PWA installation uses the browser's native install interface when supported.

## API key security

Only the server reads `OPENWEATHER_API_KEY`. Browser code calls `/api/weather` without the key. Rotate any key that has been exposed in earlier code or shared publicly; removing it from the current source does not erase Git history.

## Author

[Subramanyam Pulukuri](https://github.com/pulukuri-subramanyam)
