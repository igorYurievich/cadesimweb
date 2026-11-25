/**
 * Какие элементы относятся к отдельно загружаемым частям программы (features/loader.ts):
 * ПЛК (Ladder, блоки, LOGO, DM8, блок питания DIN, S7-1200), GRAFCET, лифт и редкие 2D-устройства
 * (механизмы электроустановки, автомат лестничного освещения, преобразователь частоты 2D).
 * Здесь только номера типов: сами символы и анимация лежат в отдельных кусках сборки.
 */
import { GRAFCET_TYPES } from '@model/grafcet';
import { LIFT_TYPE } from '@model/lift';
import { LADDER_EXTRA, PLC_BLOCK } from '@model/plc-blocks';
import { LOGO_DM8 } from '@model/plc-modules';
import { LADDER_COIL, LADDER_NC, LADDER_NO, LOGO_TYPE } from '@model/plc-types';
import { S7_1200 } from '@model/s7-1200';

export type FeatureKey = 'plc' | 'grafcet' | 'lift' | 'devices2d';

/** Блок питания DIN 24 V (din-psu-symbol.ts) — рисуется вместе с ПЛК. */
export const DIN_PSU_SYMBOL_TYPE = 10220;

export const PLC_FEATURE_TYPES: readonly number[] = [
  LADDER_NO, LADDER_NC, LADDER_COIL, ...LADDER_EXTRA, ...Object.values(PLC_BLOCK),
  LOGO_TYPE, LOGO_DM8, DIN_PSU_SYMBOL_TYPE, S7_1200,
];

/** Механизмы 8120…8125, автомат лестничного освещения 8110, преобразователь частоты 2D 10240 / 10241. */
export const MECHANISM_TYPES: readonly number[] = [8120, 8121, 8122, 8123, 8124, 8125];
export const STAIR_TIMER_SYMBOL_TYPE = 8110;
export const VFD_2D_SYMBOL_TYPES = { threePhase: 10240, singlePhase: 10241 } as const;
const DEVICES_2D_TYPES: readonly number[] = [
  ...MECHANISM_TYPES, STAIR_TIMER_SYMBOL_TYPE, VFD_2D_SYMBOL_TYPES.threePhase, VFD_2D_SYMBOL_TYPES.singlePhase,
];

const FEATURE_BY_TYPE: ReadonlyMap<number, FeatureKey> = new Map<number, FeatureKey>([
  ...PLC_FEATURE_TYPES.map((type) => [type, 'plc'] as [number, FeatureKey]),
  ...GRAFCET_TYPES.map((type) => [type, 'grafcet'] as [number, FeatureKey]),
  [LIFT_TYPE, 'lift'],
  ...DEVICES_2D_TYPES.map((type) => [type, 'devices2d'] as [number, FeatureKey]),
]);

export function featureOfType(typeCode: number): FeatureKey | undefined {
  return FEATURE_BY_TYPE.get(typeCode);
}
