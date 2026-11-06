/** Таблица внутренних связей CAD-типов. Здесь только данные, без расчёта состояния. */

import { allCadTypes } from '../model/cad-types';

export type ControlMode = 'pressed' | 'toggled' | 'coil-name' | 'thermal' | 'position' | 'always';
export type BehaviorLinkKind = 'switch' | 'load' | 'source-strip' | 'none';

/** Индексы относятся к SchemaElement.terminals, метки клемм на них не влияют. */
export interface BehaviorLink {
  terminals: number[];
  kind: BehaviorLinkKind;
  control: ControlMode;
  /** Для switch: исходное состояние контакта без управляющего сигнала. */
  normallyClosed?: boolean;
  /** Для аппаратов с ручным выключателем: без входа положение включено. */
  defaultClosed?: boolean;
  /** Для control 'position': контакт замкнут, только пока переключатель стоит в этой позиции (индекс в POSITION_SPECS.labels). */
  position?: number;
  /** Размыкать полюс при ручной имитации срабатывания защиты. */
  opensWhenTripped?: boolean;
  /** Для source-strip: потенциалы клемм по порядку, если в файле нет меток. */
  potentials?: string[];
}

export interface TypeBehavior {
  typeCode: number;
  links: BehaviorLink[];
  warning?: 'unknown-type';
}

const switches = (
  pairs: ReadonlyArray<readonly [number, number]>,
  control: ControlMode,
  options: Pick<BehaviorLink, 'normallyClosed' | 'defaultClosed' | 'opensWhenTripped'> = {},
): BehaviorLink[] => pairs.map(([a, b]) => ({ terminals: [a, b], kind: 'switch', control, ...options }));

/** Контакты многопозиционного переключателя: пары клемм замкнуты только в позиции position. */
const inPosition = (pairs: ReadonlyArray<readonly [number, number]>, position: number): BehaviorLink[] =>
  pairs.map(([a, b]) => ({ terminals: [a, b], kind: 'switch', control: 'position', position }));

/** Многопозиционный переключатель: подписи позиций, позиция покоя и порядок обхода кликом. */
export interface PositionSpec {
  /** Подписи позиций; индекс в массиве = номер позиции (его хранит UserInputs.positions). */
  labels: readonly string[];
  /** Позиция без входа (пользователь ничего не нажимал). */
  rest: number;
  /** Порядок обхода по кругу, начиная с позиции покоя. */
  cycle: readonly number[];
}

/**
 * Позиции Conmutador по образцу accionamientos.cad и скриншотам (confidence 'inferred', см. note в cad-types.ts):
 *  - 8020 I-0-II: общий 1; I = 1-2, 0 = ничего, II = 1-3; покой — 0, клик: 0 → I → II → 0;
 *  - 8021 I-II-III: общий 1; I = 1-2, II = 1-3, III = 1-4; покой — I (лопасть наклонена к 2), клик по кругу;
 *  - 8022 cruce: покой — перекрёст (1-4 и 2-3), активное положение — прямо (1-3 и 2-4).
 */
export const POSITION_SPECS: Readonly<Record<number, PositionSpec>> = {
  8020: { labels: ['I', '0', 'II'], rest: 1, cycle: [1, 0, 2] },
  8021: { labels: ['I', 'II', 'III'], rest: 0, cycle: [0, 1, 2] },
  8022: { labels: ['cruzado', 'recto'], rest: 0, cycle: [0, 1] },
};

/** Текущая позиция переключателя: сохранённая, если она допустима, иначе позиция покоя. */
export function currentPosition(typeCode: number, stored: number | undefined): number {
  const spec = POSITION_SPECS[typeCode];
  if (!spec) return 0;
  return stored !== undefined && stored >= 0 && stored < spec.labels.length ? stored : spec.rest;
}

/** Следующая позиция по кругу (клик по переключателю). */
export function nextPosition(typeCode: number, stored: number | undefined): number {
  const spec = POSITION_SPECS[typeCode];
  if (!spec) return 0;
  const now = currentPosition(typeCode, stored);
  const at = spec.cycle.indexOf(now);
  return spec.cycle[(at + 1) % spec.cycle.length] ?? spec.rest;
}

const inert = (): BehaviorLink[] => [{ terminals: [], kind: 'none', control: 'always' }];

const strip = (potentials: string[] = ['L1', 'L2', 'L3', 'N', 'PE']): BehaviorLink[] => [{
  terminals: potentials.map((_, index) => index),
  kind: 'source-strip',
  control: 'always',
  potentials,
}];

const TABLE: readonly TypeBehavior[] = [
  { typeCode: 1000, links: [{ terminals: [0, 1, 2, 3], kind: 'load', control: 'always' }] },
  { typeCode: 1001, links: [{ terminals: [0, 1, 2, 3, 4, 5, 6], kind: 'load', control: 'always' }] },
  // Остальные двигатели панели «Motores»: клеммы нагрузки, расчёт вращения в motors.ts; шаговые и тормоз пока только символы.
  { typeCode: 1002, links: [{ terminals: [0, 1, 2], kind: 'load', control: 'always' }] },
  { typeCode: 1008, links: [{ terminals: [0, 1, 2, 3, 4], kind: 'load', control: 'always' }] },
  { typeCode: 1010, links: [{ terminals: [0, 1, 2, 3], kind: 'load', control: 'always' }] },
  { typeCode: 1003, links: [{ terminals: [0, 1, 2, 3, 4, 5, 6], kind: 'load', control: 'always' }] },
  { typeCode: 1005, links: [{ terminals: [0, 1, 2, 3, 4, 5, 6], kind: 'load', control: 'always' }] },
  { typeCode: 1004, links: [{ terminals: [0, 1, 2, 3, 4, 5, 6], kind: 'load', control: 'always' }] },
  { typeCode: 1006, links: [{ terminals: [0, 1, 2], kind: 'load', control: 'always' }] },
  { typeCode: 1007, links: [{ terminals: [0, 1, 2, 3, 4], kind: 'load', control: 'always' }] },
  { typeCode: 1011, links: inert() },
  { typeCode: 1012, links: inert() },
  { typeCode: 1009, links: inert() },
  // Контакторы: силовые полюса следуют за катушкой с тем же именем. Сопоставление «верхний ряд, нижний ряд».
  { typeCode: 2006, links: switches([[0, 1]], 'coil-name') },
  { typeCode: 2000, links: switches([[0, 2], [1, 3]], 'coil-name') },
  { typeCode: 2001, links: switches([[0, 3], [1, 4], [2, 5]], 'coil-name') },
  { typeCode: 2002, links: switches([[0, 4], [1, 5], [2, 6], [3, 7]], 'coil-name') },
  { typeCode: 2008, links: switches([[0, 3], [1, 4], [2, 5]], 'coil-name') },
  // Выключатели: включаются кликом в симуляции, стартуют выключенными (см. latchedTypes в app.ts).
  { typeCode: 2007, links: switches([[0, 1]], 'toggled') },
  { typeCode: 2003, links: switches([[0, 2], [1, 3]], 'toggled') },
  { typeCode: 2004, links: switches([[0, 3], [1, 4], [2, 5]], 'toggled') },
  { typeCode: 2005, links: switches([[0, 4], [1, 5], [2, 6], [3, 7]], 'toggled') },
  // Блокировка: клемм нет, действует в релейном проходе (relay-pass.ts) по именам двух контакторов.
  { typeCode: 2009, links: inert() },
  // Источники питания: колодки и земля отдают потенциалы в сеть.
  { typeCode: 3000, links: strip(['L1']) },
  { typeCode: 3001, links: strip(['N']) },
  { typeCode: 3002, links: strip(['PE']) },
  { typeCode: 3003, links: strip(['L1', 'N']) },
  { typeCode: 3011, links: strip(['L1', 'N', 'PE']) },
  { typeCode: 3004, links: strip(['L1', 'L2', 'L3']) },
  { typeCode: 3005, links: strip(['L1', 'L2', 'L3', 'PE']) },
  { typeCode: 3006, links: strip(['L1', 'L2', 'L3', 'N']) },
  { typeCode: 3007, links: strip() },
  { typeCode: 3008, links: strip(['+']) },
  { typeCode: 3009, links: strip(['-']) },
  { typeCode: 3010, links: strip(['+', '-']) },
  { typeCode: 3015, links: strip(['PE']) },
  // Трансформаторы, диод, выпрямитель, блоки питания, батарея и розетка пока только символы:
  // клеммы есть, проводимость и преобразование напряжения не моделируются.
  { typeCode: 3012, links: inert() },
  { typeCode: 3017, links: inert() },
  { typeCode: 3016, links: inert() },
  { typeCode: 3013, links: inert() },
  { typeCode: 3014, links: inert() },
  { typeCode: 3018, links: inert() },
  { typeCode: 3019, links: inert() },
  { typeCode: 3020, links: inert() },
  // Силовая электроника, часть 1: резисторы 1050/1051 проводят между парами клемм (сопротивление не моделируется, падения напряжения нет);
  // автотрансформатор, электронный пускатель, блоки управления и преобразователь 1052–1054, 1062, 1063 пока только символы.
  { typeCode: 1050, links: switches([[0, 1]], 'always') },
  { typeCode: 1051, links: switches([[0, 3], [1, 4], [2, 5]], 'always') },
  { typeCode: 1052, links: inert() },
  { typeCode: 1053, links: inert() },
  { typeCode: 1062, links: inert() },
  { typeCode: 1063, links: inert() },
  { typeCode: 1054, links: inert() },
  { typeCode: 1055, links: inert() },
  { typeCode: 1056, links: inert() },
  { typeCode: 1057, links: inert() },
  { typeCode: 1058, links: inert() },
  { typeCode: 1059, links: inert() },
  // Предохранители 5000–5004 всегда проводят (перегорание не моделируется); разъединители 5005–5009 включаются кликом, стартуют отключёнными; сопоставление клемм по порядку «верхний ряд, нижний ряд».
  { typeCode: 5000, links: switches([[0, 1]], 'always') },
  { typeCode: 5001, links: switches([[0, 2], [1, 3]], 'always') },
  { typeCode: 5002, links: switches([[0, 2], [1, 3]], 'always') },
  { typeCode: 5003, links: switches([[0, 3], [1, 4], [2, 5]], 'always') },
  { typeCode: 5004, links: switches([[0, 4], [1, 5], [2, 6], [3, 7]], 'always') },
  { typeCode: 5005, links: switches([[0, 1]], 'toggled') },
  { typeCode: 5006, links: switches([[0, 2], [1, 3]], 'toggled') },
  { typeCode: 5007, links: switches([[0, 2], [1, 3]], 'toggled') },
  { typeCode: 5008, links: switches([[0, 3], [1, 4], [2, 5]], 'toggled') },
  { typeCode: 5009, links: switches([[0, 4], [1, 5], [2, 6], [3, 7]], 'toggled') },
  { typeCode: 6000, links: switches([[0, 1]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6001, links: switches([[0, 2], [1, 3]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6002, links: switches([[0, 2], [1, 3]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6003, links: switches([[0, 3], [1, 4], [2, 5]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6004, links: switches([[0, 4], [1, 5], [2, 6], [3, 7]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6005, links: switches([[0, 2], [1, 3]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6006, links: switches([[0, 4], [1, 5], [2, 6], [3, 7]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6007, links: switches([[0, 3], [1, 4], [2, 5]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6008, links: switches([[0, 2], [1, 3]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6009, links: switches([[0, 3], [1, 4], [2, 5]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6010, links: switches([[0, 1]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6011, links: switches([[0, 2], [1, 3]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  { typeCode: 6012, links: switches([[0, 4], [1, 5], [2, 6], [3, 7]], 'toggled', { defaultClosed: true, opensWhenTripped: true }) },
  // Ограничители перенапряжения: символы, проводимость и срабатывание не моделируются.
  { typeCode: 6013, links: inert() },
  { typeCode: 6014, links: inert() },
  // Вспомогательные контакты: мгновенные 7000–7003 следуют за катушкой с тем же именем, 7004–7007 ждут таймер 9004 (см. switching.ts).
  // Порядок клемм: NA+NC — 11 13 / 12 14 (НЗ 0-2, НО 1-3); CON — общий 0, НЗ 1, НО 2.
  { typeCode: 7000, links: switches([[0, 1]], 'coil-name') },
  { typeCode: 7001, links: switches([[0, 1]], 'coil-name', { normallyClosed: true }) },
  { typeCode: 7002, links: [...switches([[0, 2]], 'coil-name', { normallyClosed: true }), ...switches([[1, 3]], 'coil-name')] },
  { typeCode: 7003, links: [...switches([[0, 1]], 'coil-name', { normallyClosed: true }), ...switches([[0, 2]], 'coil-name')] },
  { typeCode: 7004, links: switches([[0, 1]], 'coil-name') },
  { typeCode: 7005, links: switches([[0, 1]], 'coil-name', { normallyClosed: true }) },
  // Звезда–треугольник: клеммы по порядку 55 57 56 58; 55-56 НЗ (звезда), 57-58 НО (треугольник).
  { typeCode: 7006, links: [...switches([[0, 2]], 'coil-name', { normallyClosed: true }), ...switches([[1, 3]], 'coil-name')] },
  { typeCode: 7007, links: [...switches([[0, 1]], 'coil-name', { normallyClosed: true }), ...switches([[0, 2]], 'coil-name')] },
  // Выдержка на отключение и на включение-отключение: катушек этих реле в ростере пока нет, поэтому только символы.
  { typeCode: 7008, links: inert() },
  { typeCode: 7009, links: inert() },
  { typeCode: 7010, links: inert() },
  { typeCode: 7011, links: inert() },
  { typeCode: 7012, links: inert() },
  { typeCode: 7013, links: inert() },
  { typeCode: 7014, links: inert() },
  { typeCode: 7015, links: inert() },
  // Кнопки панели «Accionamientos»: контакт переключается, пока кнопка нажата. Клеммы: NA-NC — 11 13 / 12 14 (НЗ 0-2, НО 1-3);
  // CON — общий 0, НЗ 1, НО 2. 8023 (круг-индикатор) без клемм и без поведения.
  { typeCode: 8023, links: inert() },
  { typeCode: 8000, links: switches([[0, 1]], 'pressed') },
  { typeCode: 8001, links: switches([[0, 1]], 'pressed', { normallyClosed: true }) },
  { typeCode: 8002, links: [...switches([[0, 2]], 'pressed', { normallyClosed: true }), ...switches([[1, 3]], 'pressed')] },
  { typeCode: 8003, links: [...switches([[0, 1]], 'pressed', { normallyClosed: true }), ...switches([[0, 2]], 'pressed')] },
  { typeCode: 8004, links: switches([[0, 1]], 'pressed') },
  { typeCode: 8005, links: switches([[0, 1]], 'pressed', { normallyClosed: true }) },
  { typeCode: 8006, links: [...switches([[0, 2]], 'pressed', { normallyClosed: true }), ...switches([[1, 3]], 'pressed')] },
  { typeCode: 8013, links: switches([[0, 1]], 'pressed', { normallyClosed: true }) },
  // Seta CON и концевики 8012/8014/8015: как кнопки, нажатие с удержанием.
  { typeCode: 8007, links: [...switches([[0, 1]], 'pressed', { normallyClosed: true }), ...switches([[0, 2]], 'pressed')] },
  { typeCode: 8012, links: switches([[0, 1]], 'pressed') },
  { typeCode: 8014, links: [...switches([[0, 2]], 'pressed', { normallyClosed: true }), ...switches([[1, 3]], 'pressed')] },
  { typeCode: 8015, links: [...switches([[0, 1]], 'pressed', { normallyClosed: true }), ...switches([[0, 2]], 'pressed')] },
  // Interruptor 8008–8011: тот же контактный состав, но с фиксацией. toggled = «привод включён» (у НЗ контакт при этом разомкнут),
  // без входа — положение покоя. Не путать с latchedTypes в app.ts (там toggled = аппарат замкнут).
  { typeCode: 8008, links: switches([[0, 1]], 'toggled') },
  { typeCode: 8009, links: switches([[0, 1]], 'toggled', { normallyClosed: true }) },
  { typeCode: 8010, links: [...switches([[0, 2]], 'toggled', { normallyClosed: true }), ...switches([[1, 3]], 'toggled')] },
  { typeCode: 8011, links: [...switches([[0, 1]], 'toggled', { normallyClosed: true }), ...switches([[0, 2]], 'toggled')] },
  { typeCode: 8018, links: [
    ...switches([[0, 2]], 'thermal', { normallyClosed: true }),
    ...switches([[1, 3]], 'thermal'),
  ] },
  // Тепловые контакты 8016/8017/8019: как 8018, срабатывают от моторной защиты или ручной имитации (control 'thermal').
  // НО замыкается при срабатывании, НЗ размыкается; CON — общий 95, НЗ 96, НО 98.
  { typeCode: 8016, links: switches([[0, 1]], 'thermal') },
  { typeCode: 8017, links: switches([[0, 1]], 'thermal', { normallyClosed: true }) },
  { typeCode: 8019, links: [...switches([[0, 1]], 'thermal', { normallyClosed: true }), ...switches([[0, 2]], 'thermal')] },
  // Conmutador: позиции описаны в POSITION_SPECS. Клеммы 8020 — 1 (общий) 2 3; 8021 — 1 2 3 4; 8022 — 1 2 / 3 4 (верхний ряд, нижний ряд).
  { typeCode: 8020, links: [...inPosition([[0, 1]], 0), ...inPosition([[0, 2]], 2)] },
  { typeCode: 8021, links: [...inPosition([[0, 1]], 0), ...inPosition([[0, 2]], 1), ...inPosition([[0, 3]], 2)] },
  { typeCode: 8022, links: [...inPosition([[0, 3], [1, 2]], 0), ...inPosition([[0, 2], [1, 3]], 1)] },
  { typeCode: 9000, links: [{ terminals: [0, 1], kind: 'load', control: 'always' }] },
  { typeCode: 9004, links: [{ terminals: [0, 1], kind: 'load', control: 'always' }] },
  { typeCode: 9008, links: [{ terminals: [0, 1], kind: 'load', control: 'always' }] },
  // Остальные катушки, реле и сигнальные приборы панели: пока только символы (логика реле времени, биестабильных катушек и т. д. в шаге 9.2).
  { typeCode: 9001, links: inert() },
  { typeCode: 9002, links: inert() },
  { typeCode: 9003, links: inert() },
  { typeCode: 9005, links: inert() },
  { typeCode: 9006, links: inert() },
  { typeCode: 9007, links: inert() },
  { typeCode: 9009, links: inert() },
  { typeCode: 9010, links: inert() },
  { typeCode: 9011, links: inert() },
  { typeCode: 9012, links: inert() },
  { typeCode: 9013, links: inert() },
  { typeCode: 9014, links: inert() },
  { typeCode: 9015, links: inert() },
  { typeCode: 9016, links: inert() },
  { typeCode: 4000, links: [{ terminals: [], kind: 'none', control: 'always' }] },
  { typeCode: 4009, links: [{ terminals: [], kind: 'none', control: 'always' }] },
  { typeCode: 4010, links: [{ terminals: [], kind: 'none', control: 'always' }] },
  { typeCode: 4001, links: [{ terminals: [], kind: 'none', control: 'always' }] },
  { typeCode: 20000, links: [{ terminals: [], kind: 'none', control: 'always' }] },
];

const BY_CODE = new Map(TABLE.map((behavior) => [behavior.typeCode, behavior]));

/** Поведение известного CAD-кода либо безопасная заглушка с предупреждением. */
export function getBehavior(typeCode: number): TypeBehavior {
  return BY_CODE.get(typeCode) ?? { typeCode, links: [], warning: 'unknown-type' };
}

/** Полный список поведений для проверки соответствия cad-types.ts. */
export function allBehaviors(): readonly TypeBehavior[] {
  return TABLE;
}

/** CAD-типы, для которых ещё нет строки в таблице. */
export function missingBehaviors(): number[] {
  return allCadTypes().map(({ code }) => code).filter((code) => !BY_CODE.has(code));
}

/** Индексы клемм вне диапазона для типа с заданным количеством клемм. */
export function invalidTerminalIndexes(typeCode: number, terminalCount: number): number[] {
  const invalid = new Set<number>();
  for (const link of getBehavior(typeCode).links) {
    for (const index of link.terminals) if (index < 0 || index >= terminalCount) invalid.add(index);
  }
  return [...invalid].sort((a, b) => a - b);
}
