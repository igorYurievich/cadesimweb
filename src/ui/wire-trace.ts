/**
 * Лупа (кнопка «Проверка соединений» в верхней панели): при наведении на провод подсвечивает всю его
 * электрическую связь — все провода, соединённые с ним напрямую (концами, узлами, через совпадающие клеммы),
 * и все клеммы, к которым он приходит. Через элементы (контакты, катушки) подсветка не идёт: это ровно
 * одна сеть движка (engine/graph.ts), поэтому лишнее соединение сразу видно. Список клемм — в строке состояния.
 */

import { buildNets } from '@engine/graph';
import { terminalKey } from '@engine/types';
import { buildWireLinks, pointOnSegment } from '@engine/wire-links';
import { terminalPosition } from '@model/geometry';
import type { Point as SheetPoint, Schema } from '@model/types';
import { SVG_NS } from './constants';
import { svgPoint } from './canvas-primitives';
import { screenToSheet } from './viewport';
import type { Point, Viewport } from './viewport';

export interface WireTrace {
  wireIds: Set<number>;
  terminals: { point: SheetPoint; label: string }[];
}

/** Всё, что электрически связано с проводом wireId (без прохода через элементы). */
export function traceWire(schema: Schema, wireId: number): WireTrace {
  const links = buildWireLinks(schema.wires);
  const startGroup = links.groupOf.get(wireId);
  const result: WireTrace = { wireIds: new Set([wireId]), terminals: [] };
  if (startGroup === undefined) return result;
  const { terminalNet } = buildNets(schema);
  // Сеть каждой группы проводов — по клеммам, лежащим на её проводах.
  const groupNet = new Map<number, number>();
  const terminalsOnGroup = new Map<number, { point: SheetPoint; label: string; net: number | undefined }[]>();
  const allTerminals: { point: SheetPoint; label: string; net: number | undefined }[] = [];
  for (const element of schema.elements) {
    if (element.typeCode === 20000) continue;
    element.terminals.forEach((terminal, index) => {
      const point = terminalPosition(element, index);
      if (!point) return;
      const net = terminalNet[terminalKey(element.id, index)];
      const name = element.name.trim();
      const entry = { point, label: name ? `${name}:${terminal.label}` : terminal.label || '?', net };
      allTerminals.push(entry);
      for (const wire of schema.wires) {
        if (!pointOnSegment(point, wire.from, wire.to)) continue;
        const group = links.groupOf.get(wire.id);
        if (group === undefined) continue;
        if (net !== undefined) groupNet.set(group, net);
        const list = terminalsOnGroup.get(group) ?? [];
        list.push(entry);
        terminalsOnGroup.set(group, list);
      }
    });
  }
  const net = groupNet.get(startGroup);
  const groups = net === undefined
    ? new Set([startGroup])
    : new Set([...links.groupOf.values()].filter((group) => group === startGroup || groupNet.get(group) === net));
  for (const wire of schema.wires) {
    const group = links.groupOf.get(wire.id);
    if (group !== undefined && groups.has(group)) result.wireIds.add(wire.id);
  }
  const terminals = net === undefined ? terminalsOnGroup.get(startGroup) ?? [] : allTerminals.filter((entry) => entry.net === net);
  const seen = new Set<string>();
  for (const entry of terminals) {
    const key = `${entry.point.x},${entry.point.y},${entry.label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.terminals.push({ point: entry.point, label: entry.label });
  }
  return result;
}

/** Ближайший к точке провод (не узел) в пределах tolerance. */
export function wireNear(schema: Schema, point: SheetPoint, tolerance: number): number | undefined {
  let best: { id: number; distance: number } | undefined;
  for (const wire of schema.wires) {
    if (wire.kind === 'junction') continue;
    const distance = distanceToSegment(point, wire.from, wire.to);
    if (distance <= tolerance && (!best || distance < best.distance)) best = { id: wire.id, distance };
  }
  return best?.id;
}

function distanceToSegment(p: SheetPoint, a: SheetPoint, b: SheetPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export interface WireTraceSetup {
  schema(): Schema;
  svg: SVGSVGElement;
  button: HTMLButtonElement | null;
  elementLayer: SVGGElement;
  status: HTMLElement;
  viewSize(): Point;
  viewport(): Viewport;
  /** Подписи: «Соединение», «провода», «клеммы», «не подключено». */
  text(): { title: string; wires: string; terminals: string; none: string; hint: string };
}

export function setupWireTrace(deps: WireTraceSetup): void {
  const layer = document.createElementNS(SVG_NS, 'g');
  layer.setAttribute('id', 'wire-trace-layer');
  layer.setAttribute('pointer-events', 'none');
  deps.elementLayer.after(layer);
  let active = false;
  let hovered: number | undefined;
  let previousStatus: string | undefined;

  const clear = (): void => {
    layer.replaceChildren();
    if (hovered !== undefined && previousStatus !== undefined) deps.status.textContent = previousStatus;
    hovered = undefined;
    previousStatus = undefined;
  };

  const draw = (wireId: number): void => {
    const schema = deps.schema();
    const trace = traceWire(schema, wireId);
    layer.replaceChildren();
    for (const wire of schema.wires) {
      if (!trace.wireIds.has(wire.id) || wire.kind === 'junction') continue;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(wire.from.x)); line.setAttribute('y1', String(wire.from.y));
      line.setAttribute('x2', String(wire.to.x)); line.setAttribute('y2', String(wire.to.y));
      line.setAttribute('class', 'wire-trace-line');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      layer.append(line);
    }
    for (const terminal of trace.terminals) {
      const ring = document.createElementNS(SVG_NS, 'circle');
      ring.setAttribute('cx', String(terminal.point.x)); ring.setAttribute('cy', String(terminal.point.y));
      ring.setAttribute('r', '2.4');
      ring.setAttribute('class', 'wire-trace-terminal');
      ring.setAttribute('vector-effect', 'non-scaling-stroke');
      layer.append(ring);
    }
    const t = deps.text();
    const segments = [...trace.wireIds].filter((id) => schema.wires.find((wire) => wire.id === id)?.kind !== 'junction').length;
    const labels = trace.terminals.map((terminal) => terminal.label);
    previousStatus ??= deps.status.textContent ?? '';
    deps.status.textContent = `${t.title}: ${segments} ${t.wires} · ${t.terminals}: ${labels.length ? labels.join(', ') : t.none}`;
  };

  const setActive = (on: boolean): void => {
    active = on;
    deps.svg.classList.toggle('is-wire-trace', on);
    deps.button?.classList.toggle('is-active', on);
    deps.button?.setAttribute('aria-pressed', String(on));
    clear();
    if (on) deps.status.textContent = deps.text().hint;
  };

  deps.button?.addEventListener('click', () => { setActive(!active); deps.button?.blur(); });
  // Esc выключает лупу (если не открыт диалог: там Esc закрывает его).
  window.addEventListener('keydown', (event) => {
    if (!active || event.key !== 'Escape' || deps.svg.ownerDocument.querySelector('dialog[open]')) return;
    setActive(false);
    deps.status.textContent = '';
  });
  deps.svg.addEventListener('pointermove', (event) => {
    if (!active) return;
    const viewport = deps.viewport();
    const point = screenToSheet(svgPoint(event, deps.svg, deps.viewSize()), viewport);
    // Захват ~7 экранных пикселей при любом масштабе.
    const wireId = wireNear(deps.schema(), point, 7 / Math.max(0.01, viewport.scale));
    if (wireId === hovered) return;
    if (wireId === undefined) { clear(); return; }
    draw(wireId);
    hovered = wireId;
  });
  deps.svg.addEventListener('pointerleave', () => { if (active) clear(); });
  // Клик или перетаскивание могут изменить схему: подсветка пересчитается при следующем движении мыши.
  deps.svg.addEventListener('pointerdown', () => { if (active) clear(); });
}
