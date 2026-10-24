# skylens

**Live conditions, made clear.** Skylens is a responsive weather dashboard for checking current conditions and upcoming weather at a glance.

[Open Skylens](https://skylens.live)

## Features

- Current conditions, including temperature, feels-like temperature, humidity, wind, visibility, pressure, wind direction, and UV index
- Selected city's local time, sunrise, and sunset shown in that location's timezone
- Seven-day forecast with daily rain chances and an hourly temperature trend chart
- City search with live location suggestions
- Current-location weather using the browser's location permission
- Saved and recently viewed cities, with controls to remove or reorder saved places
- Air-quality label and PM2.5 reading for the selected city
- Sunrise-to-sunset daylight progress, local time, and a one-click weather share summary
- Offline-friendly last-result cache, plus installable PWA support
- Celsius/Fahrenheit toggle, light/dark themes, and manual refresh
- Responsive layout, weather-themed backgrounds, and loading/error states

## Built with

- HTML, CSS, and vanilla JavaScript
- OpenWeather One Call 4.0 and Geocoding APIs
- Photon for location suggestions
- Chart.js for the hourly chart
- Font Awesome icons and the Inter font, loaded from CDNs

## Run locally

Skylens is a static website with a small Vercel Function for weather requests.

1. Install the [Vercel CLI](https://vercel.com/docs/cli) and open the repository folder.
2. Link the folder to the Skylens Vercel project with `vercel link`.
3. Add `OPENWEATHER_API_KEY` as a **Secret** in Vercel Project Settings → Environment Variables for Development, Preview, and Production. For local-only work, put it in `.env.local` (never commit that file).
4. Run `vercel dev` and open the local URL it prints. A plain static server such as `python -m http.server` cannot run the API Function.

## API key security

The browser calls the same-origin `/api/weather` function; only that server-side function reads `OPENWEATHER_API_KEY`. The function accepts a small set of weather/geocoding request types and validates its inputs. Never add the key to `script.js`, a browser-exposed variable such as `VITE_*`, or a committed environment file.

If a key has ever been committed or shared, rotate it with OpenWeather and replace it in Vercel. Removing a key from the current source does not remove it from earlier Git history, so revoke the old key rather than relying on source cleanup.

## Quick manual checks

- Search for a city and choose a suggestion; confirm the weather and location label update.
- Try current location with permission allowed and denied; confirm success or a helpful retry message.
- Switch between °C and °F; confirm current and forecast temperatures update.
- Check the forecast rain chance and sunrise/sunset for a city, then compare the display with its local time.
- Reload the page and confirm saved cities and display preferences remain available.
- Check the page at desktop, tablet, and phone widths; confirm the forecast cards remain readable without horizontal overflow.

## Deployment

The project is connected to Vercel. Pull requests create preview deployments; changes merged into `main` deploy to production.

## Author

Built by [Subramanyam Pulukuri](https://github.com/pulukuri-subramanyam).

