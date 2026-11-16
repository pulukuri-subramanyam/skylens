# Operating Skylens

Skylens remains React, Vite and JavaScript. These changes harden the existing app; they do not replace its design or weather providers.

## Release checklist

1. Work in a feature branch and open a pull request.
2. Confirm both `Quality / Tests, build and browser checks` and `Quality / Firefox accessibility checks` pass. It runs dependency auditing, unit tests, a production build, desktop/mobile browser checks, Firefox checks, accessibility scans and an offline reload test.
3. Review the Vercel preview with a real API key, including current location on an actual device.
4. Merge only with the owner's explicit approval. Production deploys from `main`.
5. Run `MONITOR_URL=https://www.skylens.live npm run monitor` (PowerShell: set `$env:MONITOR_URL` first).

In GitHub Settings → Rules → Rulesets, require a pull request and both the `Tests, build and browser checks` and `Firefox accessibility checks` statuses for `main`. The workflow supplies the status; repository enforcement is a separate account setting and is not enabled merely by committing YAML.

Firefox accessibility scans run in a separate CI job with one worker and no automatic retries. The regular browser job retains Chromium/mobile accessibility checks and Firefox interaction checks. For the November 16, 2026 release, [Quality](https://github.com/pulukuri-subramanyam/skylens/actions/runs/43914872225) passed both Firefox accessibility tests and the browser suite (136 passed, one conditional skip). The separate [chart resize workflow](https://github.com/pulukuri-subramanyam/skylens/actions/runs/43914872203) passed all 20 repeated checks without retries. These results supersede the earlier pending Firefox verification; they do not guarantee that intermittent failures cannot recur. The manually triggered `Firefox stability checks` workflow remains available for repeated verification.

The owner approved merging [PR #16](https://github.com/pulukuri-subramanyam/skylens/pull/16) into `main`. Production release `c76149cc919768c371450fe22b17adacc2195b16` was verified at [skylens.live](https://skylens.live), including live weather, unit/theme controls, the hourly chart and the production monitor. See [redesign integration notes](redesign-integration.md#release-verification) for verification scope and limitations.

## Monitoring

Playwright is pinned to stable 1.64.1 because 1.65 bundles Firefox build 1572, which has a [cross-world ARIA reflection crash](https://github.com/microsoft/playwright/issues/43967) during role/name lookups and Axe scans. Keep the full accessibility scans and role-based interaction checks. Revisit the pin when the Firefox fix reaches a stable Playwright release.

- `GET /api/health` reports API-key readiness and a short release identifier. It does not return the key or call a paid provider.
- The `Production health` GitHub workflow checks the page, readiness, geocoding and Open-Meteo every hour after this workflow reaches the default branch. It also supports manual runs. GitHub schedules can be delayed and are not a continuous uptime guarantee.
- Review failed workflow runs in GitHub Actions. Enable GitHub's failed-workflow notifications in your account if you want notifications; no external messaging service is configured.
- Vercel runtime logs contain `weather_request`, `weather_upstream_failed`, `weather_request_failed`, and fixed `client_*` events. Filter by deployment/release. No application code logs user coordinates, city queries, IP addresses, API URLs, secrets or raw exception text. Vercel's own platform request logs have their own retention policy.
- Browser error reporting sends only an allowlisted event name once per event per page session. It is not an analytics or user-tracking service. It does not provide stack traces or a paid error dashboard.

## Request protection and limits

The function allows only known request types and GET requests, validates coordinates and city-name length, blocks browser cross-site requests, has an eight-second upstream budget, prevents redirects to unexpected hosts, strips pagination URLs, and returns generic errors. Successful responses retain CDN caching; errors and monitoring endpoints are not cached.

The code includes a bounded, per-instance burst guard (90 requests/minute/client for weather and 10/minute/client for error events). Warm instances do not share memory. This is **not a globally enforced quota** and does not stop distributed abuse. Origin/Fetch Metadata checks are browser protections, not authentication.

Vercel Firewall is enabled with an active rule for `GET /api/weather`: a fixed window of **300 requests per 60 seconds per IP, per region**, with HTTP **429** for requests above the limit. The rule applies to Preview and Production; it does not match pages, static assets, `/api/health` or `/api/events`. It is configured in the Vercel project and is not created by this repository's deployment.

The Firewall counter is shared across instances within each region, not across all regions. The application guard remains separate and may reject uncached requests earlier on a busy instance. `/api/events` currently has only its per-instance guard, not a Firewall rate-limit rule.

The active Firewall configuration was read back as valid after enabling enforcement. Preview routing and production page/readiness checks passed, but a burst test of the 300-request threshold was not performed and Firewall traffic logs were not reviewed through the connector. Review matches in the Vercel Firewall dashboard before changing thresholds. Check current plan limits and pricing before adding rules or paid features.

## Incident response

1. Check the production health workflow and Vercel logs for the failing release.
2. For provider failures, verify the provider status, key configuration and usage quota. Do not paste credentials into logs or tickets.
3. For a bad release, use Vercel's previous successful Production deployment to roll back, then prepare the code correction on a branch. Rolling back production requires the owner's instruction.
4. For abuse, review matches and blocked requests in Vercel Firewall. Adjust the rule only after checking legitimate traffic; per-instance limits alone are insufficient.
5. Rotate an exposed provider key and update Production and the active Preview branch variables. Rebuild deployments after changing variables.

## Data and cache behavior

Requests stop after a bounded timeout. Only transient network/502/503/504 errors receive one retry; 429 and validation failures are not retried automatically. An obsolete search aborts its location lookup and forecast. Late results cannot replace the selected city.

Malformed core weather responses are rejected. Missing optional metrics render `Unavailable`, not zero. Corrupt caches and results older than seven days are discarded. A failed refresh keeps the last valid result with an explicit warning. The service worker caches the app shell, not API responses. City suggestion caching is in-memory only, bounded to 100 queries and 60 seconds.

## Accessibility and styling

The dashboard retains its layout. Keyboard users have a skip link, visible focus states, operable suggestions/forecast controls and screen-reader chart readings. Light-theme text controls use a slightly darker teal to meet contrast thresholds. Automated accessibility tests do not replace manual screen-reader and device testing.

Background animations pause in hidden tabs and continue respecting reduced-motion preferences. Obsolete overridden metric hover rules were removed. Broader CSS restructuring is deliberately deferred until individual changes can be verified against the current design.

The GitHub and LinkedIn footer logos use inline SVG artwork from Font Awesome Free 6.4.0. Attribution and the original license are retained in `public/assets/licenses/font-awesome.txt`. These drawings are bundled with the app code and cached with the app shell. No icon font, icon stylesheet, Font Awesome package or icon CDN is required.
