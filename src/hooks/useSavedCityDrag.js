import { useRef, useState } from 'react';

export function useSavedCityDrag(onReorder) {
  const list = useRef(null);
  const gesture = useRef(null);
  const [drag, setDrag] = useState(null);
  const cancel = () => {
    const previous = gesture.current;
    gesture.current = null;
    setDrag(null);
    if (previous?.handle.hasPointerCapture(previous.pointerId)) {
      previous.handle.releasePointerCapture(previous.pointerId);
    }
  };
  const start = (event, sourceId) => {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    gesture.current = { sourceId, targetId: sourceId, pointerId: event.pointerId,
      x: event.clientX, y: event.clientY, handle, active: false };
  };
  const move = event => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointerId) return;
    if (!current.active && Math.hypot(event.clientX-current.x,event.clientY-current.y) < 6) return;
    current.active = true;
    const box = list.current.getBoundingClientRect();
    let targetId = null;
    if (event.clientX >= box.left && event.clientX <= box.right &&
        event.clientY >= box.top && event.clientY <= box.bottom) {
      const candidates = [...list.current.querySelectorAll('[data-city-id]')];
      const target = candidates.reduce((nearest, element) => {
        const rect = element.getBoundingClientRect();
        const distance = Math.hypot(event.clientX-(rect.left+rect.width/2),event.clientY-(rect.top+rect.height/2));
        return !nearest || distance < nearest.distance ? {element,distance} : nearest;
      }, null);
      targetId = target?.element.dataset.cityId || null;
    }
    current.targetId = targetId;
    setDrag({sourceId:current.sourceId,targetId});
  };
  const finish = event => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointerId) return;
    cancel();
    if (current.active && current.targetId && current.sourceId !== current.targetId) {
      onReorder(current.sourceId,current.targetId);
    }
  };
  return {list,drag,start,move,finish,cancel};
}
