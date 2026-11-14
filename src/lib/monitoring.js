const sent = new Set();

export function reportEvent(event) {
  if (!import.meta.env.PROD || sent.has(event)) return;
  sent.add(event);
  // Only fixed event names leave the device. No location, URL, stack trace or text.
  fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }), keepalive: true }).catch(() => {});
}

export function startMonitoring() {
  window.addEventListener('error', event => { if (event.error) reportEvent('unhandled_error'); });
  window.addEventListener('unhandledrejection', event => { if (event.reason?.name !== 'AbortError') reportEvent('unhandled_error'); });
}
