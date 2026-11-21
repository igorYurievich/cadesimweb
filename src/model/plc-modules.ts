import type { Schema, SchemaElement } from './types';

// ── Модули LOGO: базовый 10202 и расширение DM8 10214 ───────────────────────
// DM8 (кнопка «LOGO 4DI/4DO» 33336), образец plcextendedor.cad:
// `*24*10214#LOGO##9#5######*0…0*147*69*0*0*-3*-3*54*105*3*0*0*1*0*0*0#LOGO` — флагов клемм нет,
// texts[2] = номер первого входа (9), texts[3] = номер первого выхода (5), после записи «LOGO».
// Клеммы сняты со скриншота пользователя (6,1 px на единицу, корпус шириной 42 при рамке 54):
// сверху на y = 0 — P1 (6), P2 (12), I1…I4 (18, 24, 30, 36); снизу на y = 102 — X11: Q1 (9/15), Q2 (27/33),
// X12: Q3 (6/12), Q4 (30/36), у каждого выхода контакт 1-2.
// Адреса: при базовом LOGO на листе DM8 продолжают нумерацию (первый — I9…I12, Q5…Q8, второй — I13…, Q9…);
// без базового модуля DM8 идут с I1 и Q1 (по порядку на листе слева направо).

export const LOGO_BASE = 10202;
export const LOGO_DM8 = 10214;
export const LOGO_MODULE_TYPES: ReadonlySet<number> = new Set([LOGO_BASE, LOGO_DM8]);
/** После записи DM8 образец пишет «LOGO». */
export const DM8_DEFAULT_TAIL = 'LOGO';

export interface ModuleShape { inputs: number; outputs: number }

export const MODULE_SHAPE: Readonly<Record<number, ModuleShape>> = {
  [LOGO_BASE]: { inputs: 8, outputs: 4 },
  [LOGO_DM8]: { inputs: 4, outputs: 4 },
};

/** Индексы клемм модуля: 0 P1 (L), 1 P2 (N), затем входы, затем выходы парами 1-2. */
export const moduleInputIndex = (k: number): number => 2 + k;
export const moduleOutputPair = (typeCode: number, k: number): [number, number] => {
  const base = 2 + (MODULE_SHAPE[typeCode]?.inputs ?? 0);
  return [base + 2 * k, base + 1 + 2 * k];
};

export const DM8_POINTS = [
  { x: 6, y: 0 }, { x: 12, y: 0 }, { x: 18, y: 0 }, { x: 24, y: 0 }, { x: 30, y: 0 }, { x: 36, y: 0 },
  ...[9, 27, 6, 30].flatMap((x) => [{ x, y: 102 }, { x: x + 6, y: 102 }]),
];
export const DM8_LABELS: readonly string[] = [
  'P1', 'P2', 'I1', 'I2', 'I3', 'I4', ...['Q1', 'Q2', 'Q3', 'Q4'].flatMap((q) => [`${q}.1`, `${q}.2`]),
];

export interface ModuleAddress { firstInput: number; firstOutput: number; inputs: string[]; outputs: string[] }

const address = (shape: ModuleShape, firstInput: number, firstOutput: number): ModuleAddress => ({
  firstInput, firstOutput,
  inputs: Array.from({ length: shape.inputs }, (_, k) => `I${firstInput + k}`),
  outputs: Array.from({ length: shape.outputs }, (_, k) => `Q${firstOutput + k}`),
});

/** Адреса входов и выходов всех модулей листа по id. */
export function plcAddresses(schema: Pick<Schema, 'elements'>): Map<number, ModuleAddress> {
  const result = new Map<number, ModuleAddress>();
  const base = schema.elements.filter((element) => element.typeCode === LOGO_BASE);
  for (const element of base) result.set(element.id, address(MODULE_SHAPE[LOGO_BASE] as ModuleShape, 1, 1));
  const shape = MODULE_SHAPE[LOGO_DM8] as ModuleShape;
  let nextInput = base.length > 0 ? 9 : 1;
  let nextOutput = base.length > 0 ? 5 : 1;
  const extensions = schema.elements
    .filter((element) => element.typeCode === LOGO_DM8)
    .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y || a.id - b.id);
  for (const element of extensions) {
    result.set(element.id, address(shape, nextInput, nextOutput));
    nextInput += shape.inputs;
    nextOutput += shape.outputs;
  }
  return result;
}

/** Адрес одного модуля без листа (превью в палитре): DM8 как без базового модуля. */
export const standaloneAddress = (element: SchemaElement): ModuleAddress | undefined =>
  plcAddresses({ elements: [element] }).get(element.id);

/** Метки клемм модуля по его адресам: P1 P2, входы (I9…), выходы парами (Q5.1 Q5.2 …). */
export const moduleLabels = (address: ModuleAddress): string[] =>
  ['P1', 'P2', ...address.inputs, ...address.outputs.flatMap((q) => [`${q}.1`, `${q}.2`])];

/**
 * Подписывает клеммы модулей LOGO по текущей адресации (DM8 рядом с базовым — I9…, Q5…).
 * Метки клемм модулей в .cad не пишутся, так что это влияет только на свойства и подписи.
 */
export function syncModuleLabels(schema: Pick<Schema, 'elements'>): void {
  const addresses = plcAddresses(schema);
  for (const element of schema.elements) {
    const address = addresses.get(element.id);
    if (!address) continue;
    moduleLabels(address).forEach((label, index) => {
      const terminal = element.terminals[index];
      if (terminal) terminal.label = label;
    });
  }
}

/**
 * Питание модуля (свойство «Питание», params.supply). В .cad — «24V» / «230V» в последнем текстовом поле записи
 * (у LOGO texts[19], у DM8 короче; в образцах CADe_SIMU оно пустое; nums[16] = 3 у LOGO не трогаем):
 * 24 — LOGO! 24RCE / DM8 24R, работает от блока питания 24 V (от сети 230 В тоже, но с предупреждением);
 * 230 — LOGO! 230RCE / DM8 230R, питание и входы от L и N; от 24 V не запускается.
 */
export type LogoSupply = 24 | 230;

/** «230V» / «24V» из .cad → params.supply; пустое поле (файлы CADe_SIMU и старые) — без свойства (24 V). */
export function logoSupplyFromFile(text: string | undefined): LogoSupply | undefined {
  const value = Number.parseInt(text ?? '', 10);
  return value === 230 || value === 24 ? value : undefined;
}
export const logoSupply = (element: { params: Record<string, unknown> }): LogoSupply =>
  Number(element.params.supply) === 230 ? 230 : 24;

/** Название модели на корпусе и в свойствах. */
export const logoModelName = (typeCode: number, supply: LogoSupply): string =>
  typeCode === LOGO_DM8 ? `DM8 ${supply}R` : `${supply}RCE`;
