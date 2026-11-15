import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

export function CityMenu({ name, icon, count, open, onToggle, onClose, children }) {
  const root = useRef(null);
  const trigger = useRef(null);
  const id = name.toLowerCase() + 'CitiesMenu';
  useEffect(() => {
    if (!open) return;
    const outside = event => {
      if (!root.current?.contains(event.target)) onClose();
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('pointerdown', outside);
    };
  }, [open, onClose]);
  return <div ref={root} className="city-menu-container" onKeyDown={event=>{
    if (event.defaultPrevented || event.key!=='Escape' || root.current?.querySelector('[data-dragging]')) return;
    event.preventDefault(); onClose(); trigger.current?.focus();
  }} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget) && !event.currentTarget.querySelector('[data-dragging]')) onClose();
  }}>
    <button ref={trigger} type="button" id={name.toLowerCase()+'CitiesBtn'} className="city-menu-trigger" aria-expanded={open} aria-controls={id} onClick={onToggle}>
      <Icon name={icon}/><span>{name}</span>{count > 0 && name==='Saved' && <span className="city-menu-count">{count}</span>}<Icon name="chevron" className={open?'is-open':''}/>
    </button>
    {open && <div id={id} className="city-menu">{children}</div>}
  </div>;
}
