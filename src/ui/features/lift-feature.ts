/** Кусок сборки «Лифт»: символ шахты с кабиной, анимация и сообщения об авариях лифта. */
import { LIFT_TYPE } from '@model/lift';
import { registerBodyDrawers } from '../symbols/body';
import { drawLift } from '../symbols/lift-symbol';
import { applyLiftVisuals } from '../simulation/element-lift';
import { liftFaultMessages, liftWarnings } from '../simulation/lift-diagnostics';
import { appendLiftFields } from '../lift-properties';
import type { FeatureHooks } from './loader';

registerBodyDrawers([LIFT_TYPE], drawLift);

export const hooks: FeatureHooks = {
  applyVisuals: (state, element, node, _schema, text) => applyLiftVisuals(state, element, node, text),
  faultMessages: liftFaultMessages,
  warnings: liftWarnings,
  appendProperties: appendLiftFields,
};
