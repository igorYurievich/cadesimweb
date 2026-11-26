import {
  DETECTOR_CODES,
  DETECTOR_FRAMES,
  DETECTOR_LABELS,
  EMITTER_TYPE,
  detectorSpec,
} from '@model/detector-types';
import { REFLEX_FRAME, REFLEX_LABELS, REFLEX_TYPE } from '@model/reflex-sensor';

interface PlaceDefault { prefix: string; size: { w: number; h: number }; labels: string[] }

const SIDE_LABEL_OFFSET = { x: -30, y: -3 } as const;
const TOP_LABEL_OFFSET = { x: -18, y: -3 } as const;

/** Шаблоны размещения датчиков (рамка, метки клемм) по всем вариантам подключения и излучателю. */
export const DETECTOR_PLACE_DEFAULTS: Readonly<Record<number, PlaceDefault>> = Object.fromEntries([
  ...DETECTOR_CODES.map((code): [number, PlaceDefault] => {
    const wiring = detectorSpec(code)?.wiring ?? '2';
    return [code, { prefix: '-B', size: { ...DETECTOR_FRAMES[wiring] }, labels: [...DETECTOR_LABELS[wiring]] }];
  }),
  [EMITTER_TYPE, { prefix: '-B', size: { ...DETECTOR_FRAMES['2'] }, labels: ['1', '2'] }],
  [REFLEX_TYPE, { prefix: '-B', size: { ...REFLEX_FRAME }, labels: [...REFLEX_LABELS] }],
]);

/** Смещение подписи в записи .cad: как в образце detectores.cad (−18 у вариантов сверху/снизу, −30 у боковых). */
export const DETECTOR_LABEL_OFFSETS: Readonly<Record<number, { x: number; y: number }>> = Object.fromEntries(
  [...DETECTOR_CODES, EMITTER_TYPE, REFLEX_TYPE].map((code) => {
    const side = detectorSpec(code)?.wiring.endsWith('side') ?? false;
    return [code, { ...(side ? SIDE_LABEL_OFFSET : TOP_LABEL_OFFSET) }];
  }),
);

/** Варианты для списка «Разместить элемент»: по одному на датчик (2 провода), излучатель и фотодатчик Réflex. */
export const DETECTOR_PLACEABLE_TYPES: readonly number[] = [
  ...DETECTOR_CODES.filter((code) => detectorSpec(code)?.wiring === '2'),
  EMITTER_TYPE,
  REFLEX_TYPE,
];
