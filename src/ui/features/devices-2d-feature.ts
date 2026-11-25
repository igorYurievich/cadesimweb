/**
 * Кусок сборки «Редкие 2D-устройства»: механизмы электроустановки (выключатели, розетки, лампа),
 * автомат лестничного освещения и преобразователь частоты 2D. Подсветка в симуляции и свойства
 * этих элементов остаются в основной сборке — здесь только их крупные рисунки.
 */
import { registerBodyDrawers } from '../symbols/body';
import { drawMechanism } from '../symbols/mechanism-symbol';
import { drawStairTimer } from '../symbols/stair-timer-symbol';
import { drawVfd2d, drawVfd2dMono } from '../symbols/vfd-2d-symbol';
import { MECHANISM_TYPES, STAIR_TIMER_SYMBOL_TYPE, VFD_2D_SYMBOL_TYPES } from './feature-codes';
import type { FeatureHooks } from './loader';

registerBodyDrawers(MECHANISM_TYPES, drawMechanism);
registerBodyDrawers([STAIR_TIMER_SYMBOL_TYPE], drawStairTimer);
registerBodyDrawers([VFD_2D_SYMBOL_TYPES.threePhase], drawVfd2d);
registerBodyDrawers([VFD_2D_SYMBOL_TYPES.singlePhase], drawVfd2dMono);

export const hooks: FeatureHooks = {};
