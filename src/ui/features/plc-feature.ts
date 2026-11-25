/** Кусок сборки «ПЛК»: символы Ladder, блоков, LOGO, DM8, блока питания DIN, S7-1200 и их подсветка. */
import { LADDER_EXTRA, PLC_BLOCK } from '@model/plc-blocks';
import { LOGO_DM8 } from '@model/plc-modules';
import { LADDER_COIL, LADDER_NC, LADDER_NO, LOGO_TYPE } from '@model/plc-types';
import { S7_1200 } from '@model/s7-1200';
import { registerBodyDrawers } from '../symbols/body';
import { drawLadder } from '../symbols/ladder';
import { drawLadderBlock } from '../symbols/ladder-blocks';
import { drawLogo } from '../symbols/logo-symbol';
import { drawDm8 } from '../symbols/dm8-symbol';
import { drawDinPowerSupply } from '../symbols/din-psu-symbol';
import { drawS7 } from '../symbols/s7-1200-symbol';
import { applyPlcVisuals } from '../simulation/element-plc';
import { appendLogoSupplyField, appendPlcFields } from '../plc-properties';
import { DIN_PSU_SYMBOL_TYPE } from './feature-codes';
import type { FeatureHooks } from './loader';

registerBodyDrawers([LADDER_NO, LADDER_NC, LADDER_COIL, ...LADDER_EXTRA], drawLadder);
registerBodyDrawers(Object.values(PLC_BLOCK), drawLadderBlock);
registerBodyDrawers([LOGO_TYPE], drawLogo);
registerBodyDrawers([LOGO_DM8], drawDm8);
registerBodyDrawers([DIN_PSU_SYMBOL_TYPE], drawDinPowerSupply);
registerBodyDrawers([S7_1200], drawS7);

export const hooks: FeatureHooks = {
  applyVisuals: (state, element, node) => applyPlcVisuals(state, element, node),
  appendProperties: (schema, element, deps) => {
    appendLogoSupplyField(schema, element, deps);
    appendPlcFields(schema, element, deps);
  },
};
