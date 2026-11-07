import type { AppContext } from './context';
import type { DragState } from './constants';

export interface MovePreviewSetup {
  drag(): DragState | undefined; wireLayer: SVGGElement; elementLayer: SVGGElement; selectionLayer: SVGGElement;
}

export function setupMovePreview(ctx: AppContext, deps: MovePreviewSetup) {
  let frame: number | undefined;
  const apply = (): void => {
    frame = undefined;
    const drag = deps.drag();
    if (!drag || drag.mode !== 'move') return;
    for (const object of drag.objects) {
      if (object.item.kind === 'element') {
        const id = object.item.id;
        const element = ctx.schema.elements.find((candidate) => candidate.id === id);
        if (!element) continue;
        deps.elementLayer.querySelector(`[data-element-id="${id}"]`)?.setAttribute('transform', `translate(${element.position.x} ${element.position.y}) rotate(${element.rotation * 90})`);
        const box = deps.selectionLayer.querySelector(`[data-box-for="${id}"]`);
        box?.setAttribute('x', String(element.position.x - 1.5)); box?.setAttribute('y', String(element.position.y - 1.5));
      } else {
        const id = object.item.id;
        const wire = ctx.schema.wires.find((candidate) => candidate.id === id);
        if (!wire) continue;
        const node = deps.wireLayer.querySelector(`[data-wire-id="${id}"]`);
        if (wire.kind === 'junction') { node?.setAttribute('cx', String(wire.from.x)); node?.setAttribute('cy', String(wire.from.y)); }
        else {
          node?.setAttribute('x1', String(wire.from.x)); node?.setAttribute('y1', String(wire.from.y));
          node?.setAttribute('x2', String(wire.to.x)); node?.setAttribute('y2', String(wire.to.y));
          for (const handle of deps.selectionLayer.querySelectorAll(`[data-wire-end="${id}"]`)) {
            const end = handle.getAttribute('data-end') === 'to' ? wire.to : wire.from;
            handle.setAttribute('cx', String(end.x)); handle.setAttribute('cy', String(end.y));
          }
        }
      }
    }
  };
  return {
    schedule: () => { if (frame === undefined) frame = requestAnimationFrame(apply); },
    cancel: () => { if (frame !== undefined) cancelAnimationFrame(frame); frame = undefined; },
  };
}
