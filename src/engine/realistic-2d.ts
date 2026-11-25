/**
 * Поведение символов 2D. Схема та же, что у обычных символов: кнопка — как Pulsador NA-NC,
 * контактор — катушка A1-A2 со своими контактами по имени (как катушка 9000 и контакты KM),
 * дисюнтор, автомат и дифавтомат — как Disyuntor III / Interruptor automático (включены по умолчанию,
 * размыкаются при срабатывании; в симуляции стартуют выключенными). Блоки 7020/7021 — контакты по имени
 * катушки с выдержкой (delay-blocks.ts). Interruptor и Seccionador 2D — как Interruptor 2003–2005: полюса
 * переключаются кликом, стартуют выключенными.
 */

import {
  AUX_BLOCK_2D, BREAKER_2D, CONTACTOR_2D, DELAY_BLOCK_2D, POLE_COUNT, POLE_VARIANT_OF, PILOT_2D,
  PUSHBUTTON_2D, THERMAL_RELAY_2D,
} from '../model/realistic-2d-types';
import { SWITCH_2D_CODES, SWITCH_2D_SPECS } from '../model/switch-2d';
import { TERMINAL_2D } from '../model/terminal-2d';
import type { BehaviorLink, TypeBehavior } from './behaviors';

type Control = BehaviorLink['control'];

const sw = (terminals: [number, number], control: Control, extra: Partial<BehaviorLink> = {}): BehaviorLink => ({
  terminals, kind: 'switch', control, ...extra,
});

const breaker = { defaultClosed: true, opensWhenTripped: true } as const;

export const REALISTIC_2D_BEHAVIORS: readonly TypeBehavior[] = [
  // .1 .3 .2 .4: .1-.2 НЗ, .3-.4 НО, пока кнопка нажата.
  { typeCode: PUSHBUTTON_2D, links: [sw([0, 2], 'pressed', { normallyClosed: true }), sw([1, 3], 'pressed')] },
  // A1 A2 1 2 3 4 5 6 13 14 21 22: катушка — нагрузка A1-A2, контакты следуют катушке с тем же именем.
  {
    typeCode: CONTACTOR_2D,
    links: [
      { terminals: [0, 1], kind: 'load', control: 'always' },
      sw([2, 3], 'coil-name'), sw([4, 5], 'coil-name'), sw([6, 7], 'coil-name'),
      sw([8, 9], 'coil-name'), sw([10, 11], 'coil-name', { normallyClosed: true }),
    ],
  },
  // 1 3 5 2 4 6 13 14 21 22: полюса и 13-14 замкнуты, пока дисюнтор включён; 21-22 — наоборот.
  {
    typeCode: BREAKER_2D,
    links: [
      sw([0, 3], 'toggled', breaker), sw([1, 4], 'toggled', breaker), sw([2, 5], 'toggled', breaker),
      sw([6, 7], 'toggled', breaker), sw([8, 9], 'toggled', { defaultClosed: true, normallyClosed: true }),
    ],
  },
  // Тепловое реле 1 3 5 2 4 6 97 98 95 96: полюса всегда проводят, при срабатывании (как у 6007)
  // 97-98 замыкается, 95-96 размыкается.
  {
    typeCode: THERMAL_RELAY_2D,
    links: [
      sw([0, 3], 'always'), sw([1, 4], 'always'), sw([2, 5], 'always'),
      sw([6, 7], 'thermal'), sw([8, 9], 'thermal', { normallyClosed: true }),
    ],
  },
  // Клемма 2D: верхний и нижний вывод соединены всегда (terminal-2d.ts).
  { typeCode: TERMINAL_2D, links: [sw([0, 1], 'always')] },
  // Пилот 2D X1 X2: лампа, горит под напряжением (loads.ts).
  { typeCode: PILOT_2D, links: [{ terminals: [0, 1], kind: 'load', control: 'always' }] },
  // Кнопки моторов 2D: при размещении становятся 1000/1001 (ui/helpers.ts); строки нужны таблице типов.
  { typeCode: 10000, links: [{ terminals: [0, 1, 2, 3], kind: 'load', control: 'always' }] },
  { typeCode: 10010, links: [{ terminals: [0, 1, 2, 3, 4, 5, 6], kind: 'load', control: 'always' }] },
  // Блок контактов 53 54 61 62 71 72 83 84: следует за катушкой с тем же именем, 61-62 и 71-72 — НЗ.
  {
    typeCode: AUX_BLOCK_2D,
    links: [
      sw([0, 1], 'coil-name'), sw([2, 3], 'coil-name', { normallyClosed: true }),
      sw([4, 5], 'coil-name', { normallyClosed: true }), sw([6, 7], 'coil-name'),
    ],
  },
  // Блоки с выдержкой 57 58 65 66: у ON delay 57-58 НЗ и 65-66 НО, у OFF delay наоборот (57-58 НО, 65-66 НЗ).
  // Когда переключаться, решает delay-blocks.ts.
  ...Object.values(DELAY_BLOCK_2D).map((typeCode): TypeBehavior => {
    const leftNc = typeCode === DELAY_BLOCK_2D.ON;
    return {
      typeCode,
      links: [
        sw([0, 1], 'coil-name', { normallyClosed: leftNc }),
        sw([2, 3], 'coil-name', { normallyClosed: !leftNc }),
      ],
    };
  }),
  // Interruptor и Seccionador 2D: верхние клеммы 0..n−1, нижние n..2n−1; полюса замкнуты, пока ручка в ON.
  ...SWITCH_2D_CODES.map((typeCode): TypeBehavior => {
    const n = SWITCH_2D_SPECS[typeCode]!.poles;
    return { typeCode, links: Array.from({ length: n }, (_, k) => sw([k, k + n], 'toggled')) };
  }),
  // Автомат и дифавтомат: верхние клеммы 0..n−1, нижние n..2n−1, полюс k — k ↔ k+n.
  ...Object.entries(POLE_VARIANT_OF).map(([code, variant]): TypeBehavior => {
    const n = POLE_COUNT[variant];
    return { typeCode: Number(code), links: Array.from({ length: n }, (_, k) => sw([k, k + n], 'toggled', breaker)) };
  }),
];
