import '../icon-fonts.css';
export function Icon({ name, className = '', ...props }) {
  return <i className={`original-icon icon-${name} ${name==='github'||name==='linkedin'?'brand-icon':''} ${className}`} aria-hidden="true" {...props}/>;
}
