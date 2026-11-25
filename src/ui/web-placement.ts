import { MECHANISM_SPECS, MECHANISM_TYPES, mechanismSize } from '@model/mechanisms';
import { S7_1200, S7_LABELS, S7_SIZE } from '@model/s7-1200';
import { STAIR_TIMER_2D, STAIR_TIMER_LABELS, STAIR_TIMER_SIZE } from '@model/stair-timer';
import { VFD_2D, VFD_2D_1PH, VFD_2D_1PH_LABELS, VFD_2D_LABELS, VFD_2D_SIZE } from '@model/vfd';
import { GRAFCET_SIZES, GRAFCET_TYPES } from '@model/grafcet';
import { SWITCH_2D_CODES, SWITCH_2D_SPECS } from '@model/switch-2d';
import { TERMINAL_2D, TERMINAL_2D_LABELS, TERMINAL_2D_SIZE } from '@model/terminal-2d';
import { LIFT_SIZE, LIFT_TYPE } from '@model/lift';
import { PLC_LABEL_OFFSETS, PLC_PLACE_DEFAULTS, PLC_PLACEABLE_TYPES } from './plc-placement';

// Размещение элементов, которые constants.ts берёт целыми таблицами: LOGO, блок питания и Ladder (plc-placement.ts)
// и минутник Alst 8 (только веб, model/stair-timer.ts; имя -KT, как у реле времени), ПЛК S7-1200 и механизмы
// (выключатели, розетка; только веб, model/mechanisms.ts), Interruptor и Seccionador 2D (realistic-2d-types.ts).

export const WEB_PLACEABLE_TYPES = [
  ...PLC_PLACEABLE_TYPES, STAIR_TIMER_2D, S7_1200, VFD_2D, VFD_2D_1PH, ...MECHANISM_TYPES, ...GRAFCET_TYPES,
  ...SWITCH_2D_CODES, LIFT_TYPE, TERMINAL_2D,
];

export const WEB_PLACE_DEFAULTS: typeof PLC_PLACE_DEFAULTS = {
  ...PLC_PLACE_DEFAULTS,
  [STAIR_TIMER_2D]: { prefix: '-KT', size: { ...STAIR_TIMER_SIZE }, labels: [...STAIR_TIMER_LABELS] },
  [S7_1200]: { prefix: 'PLC', size: { ...S7_SIZE }, labels: [...S7_LABELS], bareFirst: true },
  [VFD_2D]: { prefix: '-G', size: { ...VFD_2D_SIZE }, labels: [...VFD_2D_LABELS] },
  [VFD_2D_1PH]: { prefix: '-G', size: { ...VFD_2D_SIZE }, labels: [...VFD_2D_1PH_LABELS] },
  ...Object.fromEntries(MECHANISM_TYPES.map((code) => [code, {
    prefix: MECHANISM_SPECS[code]!.prefix, size: { ...mechanismSize(code) }, labels: [...MECHANISM_SPECS[code]!.labels],
  }])),
  ...Object.fromEntries(SWITCH_2D_CODES.map((code) => [code, {
    prefix: '-S', size: { ...SWITCH_2D_SPECS[code]!.size }, labels: [...SWITCH_2D_SPECS[code]!.labels],
  }])),
  // Клемма 2D «Borna» (model/terminal-2d.ts): имя -X, как у клеммных колодок.
  [TERMINAL_2D]: { prefix: '-X', size: { ...TERMINAL_2D_SIZE }, labels: [...TERMINAL_2D_LABELS], bareFirst: true },
  // Лифт (только веб, model/lift.ts): клемм нет, имена встроенных элементов — в свойствах.
  [LIFT_TYPE]: { prefix: 'LIFT', size: { ...LIFT_SIZE }, labels: [], bareFirst: true },
  // GRAFCET (model/grafcet.ts): номер этапа, условие и действие задаёт grafcetPlacedFields (helpers.ts).
  ...Object.fromEntries(GRAFCET_TYPES.map((code) => [code, {
    prefix: '', size: { ...GRAFCET_SIZES[code]! }, labels: [],
  }])),
};

export const WEB_LABEL_OFFSETS: typeof PLC_LABEL_OFFSETS = {
  ...PLC_LABEL_OFFSETS,
  [STAIR_TIMER_2D]: { x: -12, y: -3 },
  [S7_1200]: { x: -3, y: -3 },
  [VFD_2D]: { x: -12, y: 3 },
  [VFD_2D_1PH]: { x: -12, y: 3 },
  ...Object.fromEntries(MECHANISM_TYPES.map((code) => [code, { x: -12, y: -3 }])),
  ...Object.fromEntries(GRAFCET_TYPES.map((code) => [code, { x: 0, y: 0 }])),
  [LIFT_TYPE]: { x: 0, y: -3 },
  // Interruptor и Seccionador 2D: смещение подписи из образцов inystec.cad и inystec2.cad.
  ...Object.fromEntries(SWITCH_2D_CODES.map((code) => [code, { x: -12, y: -3 }])),
  [TERMINAL_2D]: { x: -12, y: -3 }, // клемма 2D: из образца borneras.cad
};
