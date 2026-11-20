/** Строки таблицы поведения, вынесенные из behaviors.ts по панелям: датчики, символы 2D, LOGO и Ladder. */

import type { TypeBehavior } from './behaviors';
import { REALISTIC_2D_BEHAVIORS } from './realistic-2d';
import { SENSOR_BEHAVIORS } from './sensors';
import { PLC_BEHAVIORS } from './plc';

export const PANEL_BEHAVIORS: readonly TypeBehavior[] = [
  ...SENSOR_BEHAVIORS, ...REALISTIC_2D_BEHAVIORS, ...PLC_BEHAVIORS,
];
