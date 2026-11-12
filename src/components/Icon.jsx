import { icons } from '../lib/interfaceIcons';

export function Icon({ name, className = '', ...props }) {
  const icon = icons[name] || icons.sun;
  return <svg viewBox={icon.viewBox} fill="currentColor" className={className} aria-hidden="true" {...props}>
    {icon.paths.map((path, index) => <path key={index} d={path}/>)}
  </svg>;
}
