import type { Point } from './viewport';
import type { WireSegment } from '@model/types';
import { SVG_NS, IDLE_WIRE_COLORS } from './constants';

export function svgPoint(event: MouseEvent | WheelEvent, svg: SVGSVGElement, viewSize: Point): Point {
  const rect = svg.getBoundingClientRect();
  return {
    x: rect.width > 0 ? (event.clientX - rect.left) * viewSize.x / rect.width : viewSize.x / 2,
    y: rect.height > 0 ? (event.clientY - rect.top) * viewSize.y / rect.height : viewSize.y / 2,
  };
}

export function lineElement(wire: WireSegment): SVGLineElement {
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', String(wire.from.x));
  line.setAttribute('y1', String(wire.from.y));
  line.setAttribute('x2', String(wire.to.x));
  line.setAttribute('y2', String(wire.to.y));
  line.setAttribute('stroke', IDLE_WIRE_COLORS[wire.kind]);
  const strokeWidth = Math.max(1, wire.thickness || 1) * 1.35;
  line.setAttribute('stroke-width', String(strokeWidth));
  line.style.setProperty('--wire-stroke-width', `${strokeWidth}px`);
  line.setAttribute('stroke-linecap', 'square');
  line.setAttribute('vector-effect', 'non-scaling-stroke');
  line.setAttribute('data-wire-id', String(wire.id));
  return line;
}

export function junctionElement(wire: WireSegment): SVGCircleElement {
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('cx', String(wire.from.x));
  dot.setAttribute('cy', String(wire.from.y));
  dot.setAttribute('r', '1.15');
  dot.setAttribute('fill', IDLE_WIRE_COLORS.junction);
  dot.setAttribute('data-junction-id', String(wire.id));
  dot.setAttribute('data-wire-id', String(wire.id));
  return dot;
}
