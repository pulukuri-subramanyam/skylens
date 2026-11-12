const paths = {
  search: 'm21 21-4.4-4.4 M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0',
  location: 'M12 2v3m0 14v3M2 12h3m14 0h3M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  moon: 'M20.5 14.5A9 9 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z',
  refresh: 'M20 7v5h-5M4 17v-5h5M5.5 7a7.5 7.5 0 0 1 12.4-1L20 9M4 15l2.1 3A7.5 7.5 0 0 0 18.5 17',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.5 10.5l7-4M8.5 13.5l7 4',
  wind: 'M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h6a3 3 0 1 1-3 3',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  drop: 'M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13ZM8 15a4 4 0 0 0 4 4',
  pressure: 'M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0ZM12 7v11',
  air: 'M12 4v9m-2-7C6 5 3 12 3 17c0 2 2 3 4 2l3-2V6Zm4 0c4-1 7 6 7 11 0 2-2 3-4 2l-3-2V6Z',
  left: 'm14 6-6 6 6 6M8 12h12',
  right: 'm10 6 6 6-6 6M16 12H4',
  close: 'm6 6 12 12M6 18 18 6',
  warning: 'm12 3 10 18H2L12 3ZM12 9v5m0 3v1',
  check: 'm5 12 4 4L19 6'
};
export function Icon({ name, className = '', ...props }) {
  if (name === 'brand') return <svg viewBox="0 0 40 40" className={className} fill="currentColor" aria-hidden="true" {...props}><path d="M17 1.5 20 7l6-2-.5 6 5.5 3-5 4 1 6-6-1-4 5-3-5.5-6 .5 2-6-5.5-3 5.5-3-1-6 6 1ZM17 10a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z" fillRule="evenodd"/><path d="M14 35h19a6 6 0 0 0 0-12h-1a8 8 0 0 0-15-1.5A7 7 0 0 0 14 35Z" stroke="var(--surface)" strokeWidth="1.5"/></svg>;
  if (name === 'linkedin') return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true" {...props}><path d="M20.45 2H3.55C2.69 2 2 2.68 2 3.52v16.96c0 .84.69 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.74H4.98V9.19h2.95ZM6.45 7.88a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.29 10.86h-2.95v-4.65c0-1.11-.02-2.54-1.55-2.54-1.55 0-1.79 1.21-1.79 2.46v4.73H9.5V9.19h2.83v1.3h.04c.39-.74 1.36-1.52 2.79-1.52 2.99 0 3.58 1.97 3.58 4.54Z"/></svg>;
  if (name === 'github') return <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true" {...props}><path d="M12 .8a11.3 11.3 0 0 0-3.57 22c.57.1.77-.25.77-.55v-2.1c-3.14.68-3.8-1.33-3.8-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.03-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1.01 1.73 2.65 1.23 3.3.94.1-.73.4-1.23.72-1.51-2.51-.29-5.15-1.26-5.15-5.59 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.43.11-2.99 0 0 .95-.3 3.11 1.16A10.9 10.9 0 0 1 12 6.24c.96 0 1.92.13 2.82.38 2.16-1.46 3.11-1.16 3.11-1.16.61 1.56.23 2.71.11 2.99.72.79 1.16 1.8 1.16 3.03 0 4.34-2.64 5.3-5.16 5.58.41.35.77 1.04.77 2.1v3.09c0 .3.2.66.78.55A11.3 11.3 0 0 0 12 .8Z"/></svg>;
  return <svg viewBox="0 0 24 24" fill={name === 'star' && props['data-filled'] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true" {...props}><path d={paths[name] || paths.sun}/></svg>;
}
