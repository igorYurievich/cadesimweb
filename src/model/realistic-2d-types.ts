/**
 * Символы 2D (панель «Símbolos realistas — barra A»). Образец 2d-simbolos.cad и скриншоты simbolos_2d.zip.
 * Смещения клемм сняты со скриншотов по сетке (шаг 3) относительно клеммы 1 (или .1). Позиция записи в .cad —
 * левый край корпуса, поэтому таблица сдвигается на REALISTIC_2D_ORIGIN_DX
 * [проверено по Actividad 1.7 из CADe_SIMU 4.2:
 * концы проводов попадают в клеммы только с этим сдвигом].
 * Порядок клемм — порядок слотов записи; у контактора и дисюнтора клеммы после шестой лежат в хвосте
 * записи (cad-tail-terminals.ts).
 */

import type { CadTypeInfo } from './cad-types';
import { SWITCH_2D_CODES, SWITCH_2D_LABELS, SWITCH_2D_ORIGIN_DX, SWITCH_2D_TYPES } from './switch-2d';
import { TERMINAL_2D, TERMINAL_2D_LABELS, TERMINAL_2D_ORIGIN_DX, TERMINAL_2D_TYPE } from './terminal-2d';

export const PUSHBUTTON_2D = 8100;
export const CONTACTOR_2D = 7018;
export const BREAKER_2D = 6015;
/** Пилот 2D: образец 2d-simbolos.cad (-H, X1 X2, 6×21). */
export const PILOT_2D = 8101;
/** Тепловое реле 2D: образец rleeter.cad (слоты 1 3 5 2 4 6 97 98, хвост 97 98 95 96). */
export const THERMAL_RELAY_2D = 6016;

/**
 * Автомат 6017 и дифавтомат 6018: в файле один код, вариант — в nums[16] (0 → IN 15×30, 18 → IIN 21×30,
 * 9 → IIIN 27×30) [образец: F1/F2/F3 и F4/F5]. Внутри программы у каждого варианта свой код (6017/6018 — IN),
 * импорт и экспорт переводят их (cad-variants.ts). Дифавтомат в образце только IN и IIIN.
 */
export const AUTOMATIC_2D = { IN: 6017, IIN: 60171, IIIN: 60172 } as const;
export const DIFFERENTIAL_2D = { IN: 6018, IIIN: 60182 } as const;

/**
 * Блоки контактов с выдержкой 7020 (ON delay) и 7021 (OFF delay), 27×30. В записи нет флагов клемм:
 * texts[2..3] пусты, texts[4..8] = `0#<время>#9#1#5` [образец: `0#5#9#1#5` и `0#1#9#1#5`]. Как у таймера 9004
 * (`A1#A2#0#5`), первое число считаем шкалой, второе — выдержкой в секундах; 9#1#5 не разгаданы и пишутся как
 * в образце. Клеммы постоянные: у ON delay 57-58 НЗ и 65-66 НО, у OFF delay наоборот (cad-delay-blocks.ts).
 */
export const DELAY_BLOCK_2D = { ON: 7020, OFF: 7021 } as const;
export const DELAY_BLOCK_LABELS: readonly string[] = ['57', '58', '65', '66'];
/** Выдержка нового блока, с: в образце у свежих блоков 1 (у одного 5). */
export const DELAY_BLOCK_DEFAULT_TIME = 1;
export const isDelayBlock2d = (code: number): boolean => code === DELAY_BLOCK_2D.ON || code === DELAY_BLOCK_2D.OFF;

/**
 * Блок вспомогательных контактов 7019, 27×30 (кнопка 33380): 53-54 НО, 61-62 НЗ, 71-72 НЗ, 83-84 НО
 * [скриншот пользователя]. В записи образца ни флагов, ни текстов: клеммы постоянные, как у 7020/7021.
 */
export const AUX_BLOCK_2D = 7019;
export const AUX_BLOCK_LABELS: readonly string[] = ['53', '54', '61', '62', '71', '72', '83', '84'];

/** Метки клемм для типов, у которых в записи нет флагов (клеммы постоянные). */
export const FIXED_2D_LABELS: Readonly<Record<number, readonly string[]>> = {
  [DELAY_BLOCK_2D.ON]: DELAY_BLOCK_LABELS, [DELAY_BLOCK_2D.OFF]: DELAY_BLOCK_LABELS, [AUX_BLOCK_2D]: AUX_BLOCK_LABELS,
  ...SWITCH_2D_LABELS, // Interruptor и Seccionador 2D (switch-2d.ts)
  [TERMINAL_2D]: TERMINAL_2D_LABELS, // клемма 2D (terminal-2d.ts)
};

/**
 * Моторы 2D (кнопки 33311 и 33393) пишутся в файл как обычные 1000 и 1001, отличие — nums[16] = 1
 * [образец motores.cad; у обычных моторов во всех образцах 0]. В программе это тот же тип с params.motor2d;
 * коды MOTOR_2D — только для кнопок палитры, при размещении они превращаются в 1000/1001 (ui/helpers.ts).
 */
export const MOTOR_2D: Readonly<Record<number, number>> = { 10000: 1000, 10010: 1001 };
export const MOTOR_2D_FILE_PARAM = 1;

/**
 * Цветной вид символов 2D (по фото аппаратов) или простой линейный. По умолчанию цветной;
 * «Vista simple» в свойствах пишет params.view2d = 'simple' (только в схеме веб-версии, в .cad не попадает).
 */
export const COLOR_VIEW_TYPES: ReadonlySet<number> = new Set([
  8100, 8101, 7018, 6015, 6016, 7019, 7020, 7021, ...SWITCH_2D_CODES, TERMINAL_2D,
  ...Object.values(AUTOMATIC_2D), ...Object.values(DIFFERENTIAL_2D),
  10202, 10214, // LOGO и DM8 (plc-types.ts)
  10220, // блок питания 24 V на DIN-рейку (plc-power-supply.ts)
  8110, // автомат лестничного освещения Alst 8 (stair-timer.ts)
  10230, // ПЛК S7-1200 (s7-1200.ts)
  8120, 8121, 8122, 8123, 8124, 8125, // механизмы Niessen и лампочка (mechanisms.ts)
]);

export const hasViewChoice = (element: { typeCode: number; params: Record<string, unknown> }): boolean =>
  COLOR_VIEW_TYPES.has(element.typeCode) || element.params.motor2d === true;

export const isSimpleView = (element: { params: Record<string, unknown> }): boolean =>
  element.params.view2d === 'simple';

export type PoleVariant = 'IN' | 'IIN' | 'IIIN';

/** Метки клемм варианта: сначала верхние слева направо, затем нижние. */
export const POLE_LABELS: Readonly<Record<PoleVariant, readonly string[]>> = {
  IN: ['N', '1', 'N', '2'],
  IIN: ['1', '3', '5', '2', '4', '6'],
  IIIN: ['N', '1', '3', '5', 'N', '2', '4', '6'],
};

/** Число полюсов и рамка варианта: полюса с шагом 6, верхние клеммы на y = 0, нижние на y = 27. */
export const POLE_COUNT: Readonly<Record<PoleVariant, number>> = { IN: 2, IIN: 3, IIIN: 4 };

const polePoints = (variant: PoleVariant) => {
  const xs = Array.from({ length: POLE_COUNT[variant] }, (_, k) => 6 * k);
  return [...xs.map((x) => ({ x, y: 0 })), ...xs.map((x) => ({ x, y: 27 }))];
};

const poleType = (code: number, label: string, variant: PoleVariant, commandId: number | undefined): CadTypeInfo => ({
  code,
  family: 'protection',
  label: `${label} ${variant} 2D (-F)`,
  layout: { kind: 'points', points: polePoints(variant) },
  terminalCount: POLE_LABELS[variant].length,
  // Кнопка палитры ставит IN; остальные варианты выбираются в свойствах элемента.
  commandIds: commandId === undefined ? [] : [commandId],
  confidence: 'probable',
  note: `${6 * POLE_COUNT[variant] + 3}×30: полюса ${POLE_LABELS[variant].join(' ')}; в файле код ${label === 'Interruptor automático' ? 6017 : 6018}.`,
});

const delayBlockType = (code: number, label: string, commandId: number, note: string): CadTypeInfo => ({
  code,
  family: 'aux-contact',
  label: `${label} 2D (-KM)`,
  layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 0, y: 27 }, { x: 18, y: 0 }, { x: 18, y: 27 }] },
  terminalCount: DELAY_BLOCK_LABELS.length,
  commandIds: [commandId],
  confidence: 'probable',
  note: `27×30: 57-58 слева, 65-66 справа (шаг 18); ${note}`,
});

const TYPES_FROM_TERMINAL_1: readonly CadTypeInfo[] = [
  ...SWITCH_2D_TYPES,
  TERMINAL_2D_TYPE,
  {
    code: 10000, family: 'motor', label: 'Motor trifásico 2D (-M)', layout: { kind: 'rows', rows: 1, pitchX: 6 },
    terminalCount: 4, commandIds: [33311], confidence: 'probable',
    note: '24×24, U1 V1 W1 PE как у 1000; в файле 1000 с nums[16] = 1.',
  },
  {
    code: 10010, family: 'motor', label: 'Motor trifásico YD 2D (-M)', layout: { kind: 'rows', rows: 2, pitchX: 6 },
    terminalCount: 7, commandIds: [33393], confidence: 'probable',
    note: '24×27, U1 V1 W1 PE сверху, W2 U2 V2 снизу как у 1001; в файле 1001 с nums[16] = 1.',
  },
  {
    code: THERMAL_RELAY_2D,
    family: 'protection',
    label: 'Relé térmico 2D (-F)',
    layout: {
      kind: 'points',
      points: [
        // 1 3 5 / 2 4 6
        { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 36 }, { x: 6, y: 36 }, { x: 12, y: 36 },
        { x: -3, y: 33 }, { x: 3, y: 33 }, { x: 9, y: 33 }, { x: 15, y: 33 }, // 97 98 НО, 95 96 НЗ снизу
      ],
    },
    terminalCount: 10,
    commandIds: [33340],
    confidence: 'confirmed',
    note: '27×39: полюса 1-2 3-4 5-6 с нагревателями, 97-98 НО и 95-96 НЗ снизу; клеммы 7..10 в хвосте записи.',
  },
  {
    code: AUX_BLOCK_2D,
    family: 'aux-contact',
    label: 'Contactos auxiliares 2D (-KM)',
    layout: {
      kind: 'points',
      points: [0, 6, 12, 18].flatMap((x) => [{ x, y: 0 }, { x, y: 27 }]),
    },
    terminalCount: AUX_BLOCK_LABELS.length,
    commandIds: [33380],
    confidence: 'probable',
    note: '27×30: 53-54 НО, 61-62 НЗ, 71-72 НЗ, 83-84 НО (шаг 6); следуют за катушкой с тем же именем.',
  },
  delayBlockType(DELAY_BLOCK_2D.ON, 'Contactos auxiliares ON delay', 33381,
    '57-58 НЗ, 65-66 НО; переключаются через выдержку после включения катушки с тем же именем.'),
  delayBlockType(DELAY_BLOCK_2D.OFF, 'Contactos auxiliares OFF delay', 33382,
    '57-58 НО, 65-66 НЗ; переключаются сразу с катушкой с тем же именем '
      + 'и возвращаются через выдержку после её отключения.'),
  poleType(AUTOMATIC_2D.IN, 'Interruptor automático', 'IN', 33352),
  poleType(AUTOMATIC_2D.IIN, 'Interruptor automático', 'IIN', undefined),
  poleType(AUTOMATIC_2D.IIIN, 'Interruptor automático', 'IIIN', undefined),
  poleType(DIFFERENTIAL_2D.IN, 'Interruptor diferencial', 'IN', 33354),
  poleType(DIFFERENTIAL_2D.IIIN, 'Interruptor diferencial', 'IIIN', undefined),
  {
    code: PUSHBUTTON_2D,
    family: 'pushbutton',
    label: 'Pulsador 2D (-S)',
    layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 0, y: 27 }, { x: 9, y: 27 }] },
    terminalCount: 4,
    commandIds: [33317],
    confidence: 'confirmed',
    note: '21×30: .1 .3 сверху, .2 .4 снизу (шаг 9); .1-.2 НЗ, .3-.4 НО, кнопка «E» слева.',
  },
  {
    code: PILOT_2D,
    family: 'lamp',
    label: 'Piloto 2D (-H)',
    layout: { kind: 'points', points: [{ x: 0, y: 0 }, { x: 0, y: 21 }] },
    terminalCount: 2,
    commandIds: [33318],
    confidence: 'probable',
    note: '6×21: X1 сверху, X2 снизу по центру; цвет — текстовое поле после клемм, как у лампы 9008 (у CADe_SIMU не сверено).',
  },
  {
    code: CONTACTOR_2D,
    family: 'coil',
    label: 'Contactor 2D (-KM)',
    layout: {
      kind: 'points',
      points: [
        // A1 на клетку ниже полюсов, как 13 и 21 [Actividad 1.7: провод катушки приходит в (15, 3)].
        { x: 15, y: 3 }, { x: 15, y: 45 }, // A1 A2
        // 1-2 3-4 5-6
        { x: 0, y: 0 }, { x: 0, y: 45 }, { x: 6, y: 0 }, { x: 6, y: 45 }, { x: 12, y: 0 }, { x: 12, y: 45 },
        { x: 3, y: 3 }, { x: 3, y: 42 }, { x: 9, y: 3 }, { x: 9, y: 42 }, // 13-14 НО, 21-22 НЗ
      ],
    },
    terminalCount: 12,
    commandIds: [33338],
    confidence: 'confirmed',
    note: '27×48: катушка A1-A2, полюса 1-2 3-4 5-6, 13-14 НО и 21-22 НЗ; клеммы 7..12 в хвосте записи.',
  },
  {
    code: BREAKER_2D,
    family: 'protection',
    label: 'Disyuntor 2D (-Q)',
    layout: {
      kind: 'points',
      points: [
        // 1 3 5 / 2 4 6
        { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 0, y: 51 }, { x: 6, y: 51 }, { x: 12, y: 51 },
        { x: 9, y: 3 }, { x: 15, y: 3 }, { x: -3, y: 3 }, { x: 3, y: 3 }, // 13 14 НО, 21 22 НЗ
      ],
    },
    terminalCount: 10,
    commandIds: [33339],
    confidence: 'confirmed',
    note: '27×54: полюса 1-2 3-4 5-6 с расцепителями, 13-14 НО и 21-22 НЗ сверху; клеммы 7..10 в хвосте записи.',
  },
];

/**
 * На сколько клемма 1 правее позиции элемента (левого края корпуса): кнопка, контактор, дисюнтор и термореле —
 * две клетки (6), автомат, дифавтомат и блоки с выдержкой — одна (3). Рисунки сдвигаются так же (symbols/body.ts).
 */
export const REALISTIC_2D_ORIGIN_DX: Readonly<Record<number, number>> = {
  8100: 6, 7018: 6, 6015: 6, 6016: 6, 8101: 3,
  6017: 3, 60171: 3, 60172: 3, 6018: 3, 60182: 3, 7020: 3, 7021: 3, 7019: 3,
  ...SWITCH_2D_ORIGIN_DX, // Interruptor и Seccionador 2D (switch-2d.ts)
  [TERMINAL_2D]: TERMINAL_2D_ORIGIN_DX, // клемма 2D (terminal-2d.ts)
};

const shiftType = (info: CadTypeInfo): CadTypeInfo => {
  const dx = REALISTIC_2D_ORIGIN_DX[info.code] ?? 0;
  if (info.layout.kind !== 'points' || dx === 0) return info;
  return { ...info, layout: { kind: 'points', points: info.layout.points.map((p) => ({ x: p.x + dx, y: p.y })) } };
};

export const REALISTIC_2D_TYPES: readonly CadTypeInfo[] = TYPES_FROM_TERMINAL_1.map(shiftType);

/** Вариант полюсов по внутреннему коду автомата или дифавтомата. */
export const POLE_VARIANT_OF: Readonly<Record<number, PoleVariant>> = {
  [AUTOMATIC_2D.IN]: 'IN', [AUTOMATIC_2D.IIN]: 'IIN', [AUTOMATIC_2D.IIIN]: 'IIIN',
  [DIFFERENTIAL_2D.IN]: 'IN', [DIFFERENTIAL_2D.IIIN]: 'IIIN',
};

export const isDifferential2d = (code: number): boolean => code === DIFFERENTIAL_2D.IN || code === DIFFERENTIAL_2D.IIIN;
