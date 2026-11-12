import { icons } from '../lib/interfaceIcons';
export function Icon({ name, className = '', ...props }) {
  const icon = icons[name] || icons.sun;
  return <i className={`original-icon ${className}`} aria-hidden="true" {...props}><svg viewBox={icon.viewBox} fill="currentColor">{icon.paths.map((path,index)=><path key={index} d={path}/>)}</svg></i>;
}
