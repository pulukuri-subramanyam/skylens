import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function useSavedCityDrag(saved, onReorder) {
  const list = useRef(null);
  const gesture = useRef(null);
  const frame = useRef(null);
  const before = useRef(null);
  const animations = useRef(new Map());
  const [drag, setDrag] = useState(null);
  const rememberPositions = () => {
    before.current = new Map([...list.current.querySelectorAll('[data-city-id]')].map(element=>
      [element.dataset.cityId,element.getBoundingClientRect()]));
    animations.current.forEach(animation=>animation.cancel());
    animations.current.clear();
  };
  useLayoutEffect(() => {
    const previous = before.current;
    before.current = null;
    if (!previous || !list.current || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const element of list.current.querySelectorAll('[data-city-id]')) {
      if (element.dataset.cityId === drag?.sourceId) continue;
      const from = previous.get(element.dataset.cityId), to = element.getBoundingClientRect();
      if (!from || (Math.abs(from.left-to.left)<1 && Math.abs(from.top-to.top)<1)) continue;
      const animation = element.animate([
        {transform:`translate(${from.left-to.left}px,${from.top-to.top}px)`},
        {transform:'translate(0,0)'}
      ],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});
      animations.current.set(element,animation);
    }
  },[drag,saved]);
  useEffect(() => {
    const escape = event => {
      if (event.key==='Escape' && gesture.current) { event.preventDefault(); cancel(); }
    };
    window.addEventListener('keydown',escape);
    return () => {
      window.removeEventListener('keydown',escape);
      if (frame.current != null) cancelAnimationFrame(frame.current);
      gesture.current?.ghost?.remove();
      animations.current.forEach(animation=>animation.cancel());
    };
  },[]);
  const cancel = () => {
    const previous = gesture.current;
    if (!previous) return;
    if (previous.active) rememberPositions();
    gesture.current = null;
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
    previous.ghost?.remove();
    setDrag(null);
    if (previous.capture.hasPointerCapture(previous.pointerId)) {
      previous.capture.releasePointerCapture(previous.pointerId);
    }
  };
  useEffect(() => {
    // External changes, such as removing a city in another interaction, cancel a drag.
    if (gesture.current) cancel();
  },[saved]);
  const preview = current => {
    const box = list.current.getBoundingClientRect();
    const menu = list.current.closest('.city-menu')?.getBoundingClientRect();
    const top = menu ? Math.max(box.top,menu.top) : box.top;
    const bottom = menu ? Math.min(box.bottom,menu.bottom) : box.bottom;
    current.valid = current.x>=box.left && current.x<=box.right && current.y>=top && current.y<=bottom;
    if (!current.valid) return;
    const target = [...list.current.querySelectorAll('[data-city-id]')].reduce((nearest,element)=>{
      // Layout offsets ignore the slide animation, avoiding targets that chase the pointer.
      const distance=Math.hypot(current.x-(box.left+element.offsetLeft+element.offsetWidth/2),
        current.y-(box.top+element.offsetTop+element.offsetHeight/2));
      return !nearest || distance<nearest.distance ? {element,distance} : nearest;
    },null)?.element.dataset.cityId;
    if (!target || target===current.sourceId) return;
    const from=current.ids.indexOf(current.sourceId),to=current.ids.indexOf(target);
    if (from===to || to<0) return;
    rememberPositions();
    const next=[...current.ids];
    next.splice(to,0,...next.splice(from,1));
    current.ids=next;
    current.targetId=target;
    setDrag({sourceId:current.sourceId,targetId:target,ids:next});
  };
  const paint = () => {
    frame.current = null;
    const current=gesture.current;
    if (!current?.active) return;
    current.ghost.style.transform=`translate3d(${current.x-current.offsetX}px,${current.y-current.offsetY}px,0)`;
    const menu=list.current.closest('.city-menu');
    const bounds=menu?.getBoundingClientRect();
    const top=bounds?.top||0,bottom=bounds?.bottom||innerHeight;
    if (current.y>=top && current.y<=bottom && (!bounds || (current.x>=bounds.left && current.x<=bounds.right))) {
      const amount=current.y<top+32?-10:current.y>bottom-32?10:0;
      if (amount) (menu||window).scrollBy(0,amount);
    }
    preview(current);
    frame.current=requestAnimationFrame(paint);
  };
  const start = (event, sourceId) => {
    if (!event.isPrimary || event.button!==0 || gesture.current) return;
    const capture=list.current;
    const element=event.currentTarget.closest('[data-city-id]');
    const rect=element.getBoundingClientRect();
    capture.setPointerCapture(event.pointerId);
    gesture.current={sourceId,targetId:sourceId,ids:saved.map(city=>city.id),pointerId:event.pointerId,
      startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,
      offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top,capture,element,active:false,valid:true};
  };
  const move = event => {
    const current=gesture.current;
    if (!current || event.pointerId!==current.pointerId) return;
    current.x=event.clientX;current.y=event.clientY;
    if (!current.active) {
      if (Math.hypot(current.x-current.startX,current.y-current.startY)<6) return;
      const rect=current.element.getBoundingClientRect();
      const ghost=current.element.cloneNode(true);
      ghost.removeAttribute('data-city-id');
      ghost.removeAttribute('data-dragging');
      ghost.removeAttribute('data-drop-target');
      ghost.setAttribute('aria-hidden','true');
      ghost.inert=true;
      ghost.classList.add('saved-city-drag-overlay');
      ghost.style.width=rect.width+'px';
      ghost.style.height=rect.height+'px';
      document.body.appendChild(ghost);
      current.ghost=ghost;current.active=true;
      setDrag({sourceId:current.sourceId,targetId:current.sourceId,ids:current.ids});
      paint();
    }
  };
  const finish = event => {
    const current=gesture.current;
    if (!current || event.pointerId!==current.pointerId) return;
    current.x=event.clientX;current.y=event.clientY;
    if (current.active) preview(current);
    const index=current.ids.indexOf(current.sourceId);
    const shouldCommit=current.active && current.valid && index!==saved.findIndex(city=>city.id===current.sourceId);
    cancel();
    if (shouldCommit) onReorder(current.sourceId,index);
  };
  const byId=new Map(saved.map(city=>[city.id,city]));
  const ordered=drag ? drag.ids.map(id=>byId.get(id)).filter(Boolean) : saved;
  return {list,drag,ordered,start,move,finish,cancel};
}
