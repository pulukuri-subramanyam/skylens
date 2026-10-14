# skylens

**Live conditions, made clear.** Skylens is a responsive weather dashboard for checking current conditions and upcoming weather at a glance.

[Open Skylens](https://skylens.live)

## Features

- Current conditions, including temperature, feels-like temperature, humidity, wind, visibility, pressure, wind direction, and UV index
- Seven-day forecast and an hourly temperature trend chart
- City search with live location suggestions
- Current-location weather using the browser's location permission
- Saved and recently viewed cities
- Celsius/Fahrenheit toggle, light/dark themes, and manual refresh
- Responsive layout, weather-themed backgrounds, and loading/error states

## Built with

- HTML, CSS, and vanilla JavaScript
- OpenWeather One Call 4.0 and Geocoding APIs
- Photon for location suggestions
- Chart.js for the hourly chart
- Font Awesome icons and the Inter font, loaded from CDNs

## Run locally

Skylens is a static website; there is no build step or package installation.

1. Clone this repository and open its root folder.
2. Add your OpenWeather API key to the `API_KEY` setting in `script.js`.
3. Serve the folder locally, for example:

   ```sh
   python -m http.server 8000
   ```

4. Open [http://localhost:8000](http://localhost:8000).

You can also use a local static-server extension such as Live Server in VS Code.

## API key security

The current frontend calls OpenWeather directly, so a key placed in `script.js` is visible to anyone using the site. Use a restricted key and monitor its quota. For a public production app, move weather requests behind a server-side or serverless endpoint and store the key as a server-only environment variable. Never commit a private key to a public repository.

## Deployment

The project is connected to Vercel. Pull requests create preview deployments; changes merged into `main` deploy to production.

## Author

Built by [Subramanyam Pulukuri](https://github.com/pulukuri-subramanyam).

