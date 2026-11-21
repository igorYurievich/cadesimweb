import type { CadTypeInfo } from './cad-types';

// ── Механизмы электроустановки (серия Niessen Zenit по фото пользователя), только веб ───────────────────
// Белая рамка 24×24 с клавишей (или розеткой Schuko). Клеммы — по маркировке механизмов:
//  - выключатель (interruptor): L сверху, 1 снизу; клик в симуляции включает / выключает;
//  - переключатель проходной (conmutador): L сверху, 1 и 2 снизу; покой L–1, включён L–2;
//  - перекрёстный (cruzamiento): 1 2 сверху, 3 4 снизу; покой прямо 1–3, 2–4, включён накрест 1–4, 2–3;
//  - кнопка (pulsador): L сверху, 1 снизу, замкнута, пока зажата мышью (звонок, минутник);
//  - розетка Schuko: L, PE, N снизу; под напряжением подсвечивается (нагрузки у неё нет);
//  - лампочка накаливания E27 (по фото): L и N снизу из цоколя, горит под напряжением, как сигнальная лампа.
// В CADe_SIMU таких элементов нет: коды типов и кнопки свои (кнопки от 34001 — только веб-версия).

export const MECH_SWITCH = 8120;
export const MECH_TWO_WAY = 8121;
export const MECH_CROSS = 8122;
export const MECH_PUSH = 8123;
export const MECH_SOCKET = 8124;
export const MECH_BULB = 8125;

export const MECHANISM_TYPES = [MECH_SWITCH, MECH_TWO_WAY, MECH_CROSS, MECH_PUSH, MECH_SOCKET, MECH_BULB] as const;
export const isMechanism = (typeCode: number): boolean => (MECHANISM_TYPES as readonly number[]).includes(typeCode);

/** Кнопки палитры (категория «Механизмы»). */
export const MECHANISM_COMMANDS: Readonly<Record<number, number>> = {
  [MECH_SWITCH]: 34003, [MECH_TWO_WAY]: 34004, [MECH_CROSS]: 34005, [MECH_PUSH]: 34006, [MECH_SOCKET]: 34007,
  [MECH_BULB]: 34008,
};

/** Рамка 24×30: корпус y = 3…27, выводы до y = 0 и y = 30 (у лампочки 18×27, выводы снизу). */
export const MECHANISM_SIZE = { w: 24, h: 30 } as const;
export const BULB_SIZE = { w: 18, h: 27 } as const;
export const mechanismSize = (code: number) => (code === MECH_BULB ? BULB_SIZE : MECHANISM_SIZE);

interface MechanismSpec {
  labels: readonly string[];
  points: readonly { x: number; y: number }[];
  prefix: string;
  label: string;
  note: string;
}

export const MECHANISM_SPECS: Readonly<Record<number, MechanismSpec>> = {
  [MECH_SWITCH]: {
    labels: ['L', '1'], points: [{ x: 12, y: 0 }, { x: 12, y: 30 }], prefix: 'S', label: 'Interruptor (mecanismo)',
    note: 'Только веб: выключатель Niessen, L сверху, 1 снизу; L–1 замкнут, пока включён (клик).',
  },
  [MECH_TWO_WAY]: {
    labels: ['L', '1', '2'], points: [{ x: 12, y: 0 }, { x: 6, y: 30 }, { x: 18, y: 30 }], prefix: 'S',
    label: 'Conmutador (mecanismo)', note: 'Только веб: проходной переключатель, L сверху; покой L–1, включён L–2.',
  },
  [MECH_CROSS]: {
    labels: ['1', '2', '3', '4'], points: [{ x: 6, y: 0 }, { x: 18, y: 0 }, { x: 6, y: 30 }, { x: 18, y: 30 }],
    prefix: 'S', label: 'Interruptor de cruce (mecanismo)',
    note: 'Только веб: перекрёстный, 1 2 сверху, 3 4 снизу; покой 1–3 и 2–4, включён 1–4 и 2–3.',
  },
  [MECH_PUSH]: {
    labels: ['L', '1'], points: [{ x: 12, y: 0 }, { x: 12, y: 30 }], prefix: 'S', label: 'Pulsador (mecanismo)',
    note: 'Только веб: кнопка Niessen, L–1 замкнут, пока нажата.',
  },
  [MECH_SOCKET]: {
    labels: ['L', 'PE', 'N'], points: [{ x: 6, y: 30 }, { x: 12, y: 30 }, { x: 18, y: 30 }], prefix: 'XS',
    label: 'Base de enchufe Schuko (mecanismo)', note: 'Только веб: розетка Schuko, L PE N снизу; без нагрузки.',
  },
  [MECH_BULB]: {
    labels: ['L', 'N'], points: [{ x: 6, y: 27 }, { x: 12, y: 27 }], prefix: 'E',
    label: 'Lámpara incandescente E27',
    note: 'Только веб: лампочка накаливания E27, L и N снизу; нагрузка, горит под напряжением.',
  },
};

export const MECHANISM_CAD_TYPES: readonly CadTypeInfo[] = MECHANISM_TYPES.map((code): CadTypeInfo => {
  const spec = MECHANISM_SPECS[code]!;
  return {
    code, label: spec.label,
    family: code === MECH_SOCKET ? 'outlet' : code === MECH_PUSH ? 'pushbutton'
      : code === MECH_BULB ? 'lamp' : 'switch',
    layout: { kind: 'points', points: [...spec.points] }, terminalCount: spec.points.length,
    commandIds: [MECHANISM_COMMANDS[code]!], confidence: 'probable', note: spec.note,
  };
});
