/**
 * Механизмы электроустановки (model/mechanisms.ts): выключатель, проходной и перекрёстный переключатели —
 * как выключатели 'toggled' (клик в симуляции, стартуют выключенными), кнопка — 'pressed', розетка без нагрузки.
 */

import { MECH_BULB, MECH_CROSS, MECH_PUSH, MECH_SOCKET, MECH_SWITCH, MECH_TWO_WAY } from '../model/mechanisms';
import type { BehaviorLink, TypeBehavior } from './behaviors';

const sw = (terminals: [number, number], control: BehaviorLink['control'], normallyClosed = false): BehaviorLink => ({
  terminals, kind: 'switch', control, ...(normallyClosed ? { normallyClosed } : {}),
});

export const MECHANISM_BEHAVIORS: readonly TypeBehavior[] = [
  // L 1: L–1, пока включён.
  { typeCode: MECH_SWITCH, links: [sw([0, 1], 'toggled')] },
  // L 1 2: покой L–1, включён L–2.
  { typeCode: MECH_TWO_WAY, links: [sw([0, 1], 'toggled', true), sw([0, 2], 'toggled')] },
  // 1 3 / 2 4 (метки по порядку клемм: 1, 3, 2, 4): покой прямо 1–2 и 3–4, включён накрест 1–4 и 3–2.
  {
    typeCode: MECH_CROSS,
    links: [sw([0, 2], 'toggled', true), sw([1, 3], 'toggled', true), sw([0, 3], 'toggled'), sw([1, 2], 'toggled')],
  },
  // L 1: L–1, пока кнопка зажата.
  { typeCode: MECH_PUSH, links: [sw([0, 1], 'pressed')] },
  // L PE N: только клеммы.
  { typeCode: MECH_SOCKET, links: [{ terminals: [], kind: 'none', control: 'always' }] },
  // Лампочка L N: нагрузка, горит под напряжением (loads.ts, LAMP_TYPES).
  { typeCode: MECH_BULB, links: [{ terminals: [0, 1], kind: 'load', control: 'always' }] },
];
