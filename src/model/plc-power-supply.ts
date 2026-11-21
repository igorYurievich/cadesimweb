import type { CadTypeInfo } from './cad-types';

// ── Блок питания на DIN-рейку 230 В~ → 24 В= для LOGO (только веб-версия) ────────────────────
// В CADe_SIMU такого элемента нет: код типа и кнопки свои, вне диапазонов оригинала (кнопки 32828…33394).
// По фото модуля 1 TE (18 мм): сверху клеммы выхода «+V» «−V», снизу вход «N» «L». Масштаб как у LOGO 10202
// (корпус 94 по высоте): рамка 18×105, клеммы на шаге 6, верх y = 0, низ y = 102.
// Порядок клемм как у блока питания 3014: 0–1 вход (L, N), 2 «+», 3 «−» — движок общий (relay-pass.ts).

export const DIN_PSU_TYPE = 10220;
/** Кнопка палитры: своя, в панели «Entrada/Salida, PLC, LOGO, Arduino». */
export const DIN_PSU_COMMAND = 34001;

export const DIN_PSU_LABELS: readonly string[] = ['L', 'N', '+V', '-V'];

export const DIN_PSU_POINTS = [
  { x: 12, y: 102 }, { x: 6, y: 102 },
  { x: 6, y: 0 }, { x: 12, y: 0 },
];

export const DIN_PSU_SIZE = { w: 18, h: 105 } as const;

export const DIN_PSU_CAD_TYPE: CadTypeInfo = {
  code: DIN_PSU_TYPE, family: 'power-supply', label: 'Fuente de alimentación 24 V DC (carril DIN)',
  layout: { kind: 'points', points: DIN_PSU_POINTS }, terminalCount: DIN_PSU_POINTS.length,
  commandIds: [DIN_PSU_COMMAND], confidence: 'probable',
  note: 'Только веб: 18×105, вход N L снизу, выход +V −V сверху; «+»/«−» есть, пока на входе фаза и нейтраль.',
};
