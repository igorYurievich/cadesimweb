/** Кусок сборки «GRAFCET»: символы этапов, переходов, действий, черт, таблицы и их подсветка. */
import { GRAFCET_TYPES } from '@model/grafcet';
import { registerBodyDrawers } from '../symbols/body';
import { drawGrafcet } from '../symbols/grafcet-symbol';
import { applyGrafcetVisuals } from '../simulation/element-grafcet';
import { appendGrafcetFields } from '../grafcet-properties';
import type { FeatureHooks } from './loader';

registerBodyDrawers(GRAFCET_TYPES, drawGrafcet);

export const hooks: FeatureHooks = {
  applyVisuals: (state, element, node, schema) => applyGrafcetVisuals(state, element, node, schema),
  replaceProperties: appendGrafcetFields,
};
