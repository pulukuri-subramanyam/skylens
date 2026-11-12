const names = {"brand": "cloud-sun", "search": "magnifying-glass", "location": "location-crosshairs", "sun": "sun", "moon": "moon", "refresh": "rotate", "star": "star", "share": "share-nodes", "wind": "wind", "eye": "eye", "drop": "droplet", "pressure": "temperature-half", "air": "lungs", "left": "arrow-left", "right": "arrow-right", "close": "xmark", "warning": "triangle-exclamation", "check": "check", "github": "github", "linkedin": "linkedin"};
export function Icon({ name, className = '', ...props }) {
  return <i className={`${name==='github'||name==='linkedin'?'fab':'fas'} fa-${names[name]||'sun'} ${className}`} aria-hidden="true" {...props}/>;
}
