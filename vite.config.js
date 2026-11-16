import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import weatherHandler from './api/weather.mjs';
import healthHandler from './api/health.mjs';
import eventsHandler from './api/events.mjs';
import { serviceWorkerPlugin } from './build/serviceWorker.js';

export default defineConfig(({ mode }) => {
  // Server-only configuration. Vite exposes only VITE_* variables to browser code.
  const env = loadEnv(mode, process.cwd(), '');
  if (env.OPENWEATHER_API_KEY) process.env.OPENWEATHER_API_KEY = env.OPENWEATHER_API_KEY;
  return {
    plugins: [react(), tailwindcss(), serviceWorkerPlugin(), {
      name: 'skylens-local-weather-api',
      configureServer(server) {
        for (const [path, handler] of [['/api/weather', weatherHandler], ['/api/health', healthHandler], ['/api/events', eventsHandler]]) server.middlewares.use(path, async (request, response) => {
          request.query = Object.fromEntries(new URL(request.url, 'http://localhost').searchParams);
          response.status = code => { response.statusCode = code; return response; };
          response.json = payload => {
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(payload));
          };
          try {
            if (request.method === 'POST') {
              let body = '';
              for await (const chunk of request) {
                body += chunk;
                if (body.length > 512) return response.status(413).json({ message: 'Request too large.' });
              }
              request.body = body;
            }
            await handler(request, response);
          } catch { response.status(500).json({ message: 'Weather service is unavailable.' }); }
        });
      }
    }],
    build: { chunkSizeWarningLimit: 400 }
  };
});
