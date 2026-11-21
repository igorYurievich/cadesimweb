import { isVfd2d, isVfdDrive, vfdControlFor, vfdSettings } from '@model/vfd';
import type { Schema, SchemaElement } from '@model/types';
import { vfdKey } from '@model/vfd';
import type { SimulationState } from './types';

/**
 * Преобразователь частоты в симуляции: дисплей «xx.x Hz ▶/◀» у силовой части; классы is-vfd-ready (есть питание)
 * и is-vfd-run (выдаёт частоту) — у силовой части и у блока управления с тем же именем.
 */
export function applyVfdVisuals(state: SimulationState, element: SchemaElement, node: SVGGElement, schema: Schema): void {
  const drive = isVfdDrive(element.typeCode)
    ? element
    : element.typeCode === 1056
      ? schema.elements.find((candidate) => isVfdDrive(candidate.typeCode) && vfdControlFor(schema, candidate)?.id === element.id)
      : undefined;
  if (!drive) return;
  const result = state.result;
  const ready = result !== undefined && (result.coils[vfdKey(drive, 'ON')] ?? false);
  const timer = result?.memory.timers[drive.id];
  const hz = ready ? Math.max(0, timer?.hz ?? 0) : 0;
  node.classList.toggle('is-vfd-ready', ready);
  node.classList.toggle('is-vfd-run', hz > 0);
  const text = node.querySelector<SVGTextElement>('.vfd-display-text');
  if (text) text.textContent = `${hz.toFixed(1)} Hz${hz > 0 ? (timer?.dir === -1 ? ' ◀' : ' ▶') : ''}`;
  if (isVfd2d(element.typeCode)) applyPanel(node, ready, hz, timer?.dir === -1, vfdSettings(element).aiHz);
}

/**
 * Панель 2D: на дисплее при ходе — выходная частота, на стопе — задание (как у настоящего преобразователя);
 * светодиоды R/S (ход), F/R (назад), Hz (питание); ручка повёрнута по заданию (0…50 Гц → −135…+135°).
 */
function applyPanel(node: SVGGElement, ready: boolean, hz: number, reverse: boolean, setpoint: number): void {
  const digits = node.querySelector<SVGTextElement>('.vfd2d-digits');
  const decimals = Number(digits?.dataset.decimals ?? 2);
  if (digits) digits.textContent = ready ? (hz > 0 ? hz : setpoint).toFixed(decimals).padStart(decimals + 3, ' ') : '';
  node.classList.toggle('is-vfd-stopped', ready && hz <= 0);
  node.querySelector('.vfd2d-led-run')?.classList.toggle('is-on', hz > 0);
  node.querySelector('.vfd2d-led-rev')?.classList.toggle('is-on', hz > 0 && reverse);
  node.querySelector('.vfd2d-led-hz')?.classList.toggle('is-on', ready);
  node.querySelector('.vfd2d-led-fwd')?.classList.toggle('is-on', hz > 0 && !reverse);
  node.querySelector('.vfd2d-led-mod')?.classList.toggle('is-on', ready);
  const mark = node.querySelector<SVGPathElement>('.vfd2d-knob-mark');
  const angle = -135 + 270 * Math.min(1, Math.max(0, setpoint / 50));
  const cx = Number(mark?.dataset.cx ?? 35.2); const cy = Number(mark?.dataset.cy ?? 25.2);
  mark?.setAttribute('transform', `rotate(${angle.toFixed(1)} ${cx} ${cy})`);
}
