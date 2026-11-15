const paths = {
  brand: <path d="M6.8 18h9.4a4.8 4.8 0 0 0 .4-9.6A6.5 6.5 0 0 0 4 10.3 3.9 3.9 0 0 0 6.8 18Z"/>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m20 20-4.4-4.4"/></>,
  wind: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a2 2 0 1 1-2 2M3 16h8"/>,
  drop: <path d="M12 2S5.5 9.4 5.5 15a6.5 6.5 0 0 0 13 0C18.5 9.4 12 2 12 2Z"/>,
  eye: <><path d="M2 12s3.5-5.5 10-5.5S22 12 22 12s-3.5 5.5-10 5.5S2 12 2 12Z"/><circle cx="12" cy="12" r="2.4"/></>,
  sun: <><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  moon: <path d="M20.6 15.5A8.6 8.6 0 0 1 8.5 3.4 8.7 8.7 0 1 0 20.6 15.5Z"/>,
  pressure: <><circle cx="12" cy="12" r="8"/><path d="M12 12 16.5 8M7 17h10"/></>,
  air: <path d="M4 8h10.5a2.5 2.5 0 1 0-2.2-3.7M4 12h15M4 16h9.5a2.5 2.5 0 1 1-2.2 3.7"/>,
  refresh: <><path d="M20 7v5h-5"/><path d="M4 17v-5h5M6.1 8.2a7 7 0 0 1 11.3-1.4L20 12M4 12l2.6 5.2a7 7 0 0 0 11.3-1.4"/></>,
  location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  close: <path d="m7 7 10 10M17 7 7 17"/>,
  chevron: <path d="m7 9 5 5 5-5"/>,
  check: <path d="m5 12 4 4L19 6"/>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>,
  warning: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5m0 3v.1"/></>,
  grip: <><circle cx="9" cy="6" r=".8"/><circle cx="15" cy="6" r=".8"/><circle cx="9" cy="12" r=".8"/><circle cx="15" cy="12" r=".8"/><circle cx="9" cy="18" r=".8"/><circle cx="15" cy="18" r=".8"/></>
};
export function Icon({ name, className = '', ...props }) {
  if (name==='github'||name==='linkedin') return <i className={`fab fa-${name} ${className}`} aria-hidden="true" {...props}/>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={`ui-icon ${className}`} aria-hidden="true" {...props}>{paths[name]||paths.sun}</svg>;
}
