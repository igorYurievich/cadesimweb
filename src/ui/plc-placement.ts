import { LADDER_COIL, LADDER_NC, LADDER_NO, LOGO_LABELS, LOGO_TYPE } from '@model/plc-types';
import { DM8_LABELS, LOGO_DM8 } from '@model/plc-modules';
import {
  LADDER_FALL, LADDER_FIRST_SCAN, LADDER_RESET, LADDER_RISE, LADDER_SET, PLC_BLOCK, PLC_BLOCK_LABELS, plcBlockParams,
  plcBlockSize,
} from '@model/plc-blocks';

// Размещение LOGO и элементов Ladder: размеры и смещения подписи из образцов CADe_S1.cad и ladder.cad.
// Имя элемента Ladder — операнд: контакты начинаются с I1, катушки с Q1, блоки как в CADe (-U, -T, -C).

type PlaceDefault = { prefix: string; size: { w: number; h: number }; labels: string[]; bareFirst?: boolean };

const BLOCK_PREFIX: Readonly<Record<number, string>> = {
  [PLC_BLOCK.bistable]: '-U', [PLC_BLOCK.divider]: '-U', [PLC_BLOCK.counter]: '-C', [PLC_BLOCK.updown]: '-C',
};
const ladderPrefix = (code: number): string => {
  if (code === LADDER_FIRST_SCAN) return 'FIRST';
  if ([LADDER_NO, LADDER_NC, LADDER_RISE, LADDER_FALL].includes(code)) return 'I';
  if ([LADDER_COIL, LADDER_SET, LADDER_RESET].includes(code)) return 'Q';
  return BLOCK_PREFIX[code] ?? '-T';
};

const LADDER_CODES = [LADDER_NO, LADDER_NC, LADDER_COIL, ...Object.keys(PLC_BLOCK_LABELS).map(Number)];

export const PLC_PLACEABLE_TYPES = [LOGO_TYPE, LOGO_DM8, ...LADDER_CODES];

export const PLC_PLACE_DEFAULTS: Record<number, PlaceDefault> = {
  [LOGO_TYPE]: { prefix: 'LOGO', size: { w: 87, h: 105 }, labels: [...LOGO_LABELS], bareFirst: true },
  [LOGO_DM8]: { prefix: 'LOGO', size: { w: 54, h: 105 }, labels: [...DM8_LABELS], bareFirst: true },
  ...Object.fromEntries(LADDER_CODES.map((code) => [code, {
    prefix: ladderPrefix(code), size: plcBlockSize(code),
    labels: [...(PLC_BLOCK_LABELS[code] ?? ['', ''])], bareFirst: code === LADDER_FIRST_SCAN,
  }])),
};

export const PLC_LABEL_OFFSETS: Record<number, { x: number; y: number }> = {
  [LOGO_TYPE]: { x: -3, y: -3 }, [LOGO_DM8]: { x: -3, y: -3 },
  ...Object.fromEntries(LADDER_CODES.map((code) => [code, { x: -3, y: -9 }])),
};

/** Поля нового элемента LOGO / Ladder: функция и параметры по умолчанию. */
export function plcPlacedFields(typeCode: number): { func: string; params: Record<string, number> } {
  return { func: typeCode === LADDER_FIRST_SCAN ? 'SCAN' : '', params: plcBlockParams(typeCode, []) };
}
