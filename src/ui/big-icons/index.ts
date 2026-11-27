/**
 * Крупные упрощённые значки для вида палитры «Значки» (для слабовидящих).
 * Каждая категория — свой файл; элементы без крупного значка показывают обычный.
 */
import { BLOCK_BIG_ICONS } from './blocks';
import { CONTACT_COIL_BIG_ICONS } from './contacts-coils';
import { DEVICE_BIG_ICONS } from './devices';
import { ELECTRONIC_RELAY_BIG_ICONS } from './electronic-relays';
import { MACHINE_BIG_ICONS } from './machines';
import { MANUAL_CONTROL_BIG_ICONS } from './manual-controls';
import { PLC_2D_BIG_ICONS } from './plc-2d';
import { POWER_BIG_ICONS } from './power';
import { PROTECTION_BIG_ICONS_ALL } from './protection';
import { REALISTIC_2D_BIG_ICONS } from './realistic-2d';
import { SENSOR_BIG_ICONS } from './sensors';

const BIG_ICONS: Readonly<Record<number, () => SVGSVGElement>> = {
  ...POWER_BIG_ICONS,
  ...PROTECTION_BIG_ICONS_ALL,
  ...MACHINE_BIG_ICONS,
  ...CONTACT_COIL_BIG_ICONS,
  ...MANUAL_CONTROL_BIG_ICONS,
  ...SENSOR_BIG_ICONS,
  ...DEVICE_BIG_ICONS,
  ...REALISTIC_2D_BIG_ICONS,
  ...BLOCK_BIG_ICONS,
  ...PLC_2D_BIG_ICONS,
  ...ELECTRONIC_RELAY_BIG_ICONS,
};

/** Крупный значок команды каталога или undefined, если его ещё не нарисовали. */
export function createBigPaletteIcon(commandId: number): SVGSVGElement | undefined {
  return BIG_ICONS[commandId]?.();
}

/** Есть ли у команды крупный значок (для тестов и проверки полноты категорий). */
export function hasBigPaletteIcon(commandId: number): boolean {
  return commandId in BIG_ICONS;
}
