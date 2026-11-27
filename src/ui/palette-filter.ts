/**
 * Что показывает палитра: по умолчанию только компоненты с зелёной меткой (проверенные).
 * «Вид → Показать все компоненты» снимает фильтр; выбор хранится в localStorage.
 */

import type { GroupKey } from '@model/catalog';
import { hasVerifiedBadge } from '@model/catalog-verification';
import { VERIFIED_ONLY_KEY } from './constants';

/**
 * Временно скрыты из палитры (ещё не сделаны): реле давления 33253/33254, вакуумное реле 33255/33256,
 * термостат 33346/33347; из реалистичных символов 2D и 3D — реле в колодке (обычное и с выдержкой), светодиод,
 * кнопочный пост и компоненты малого, среднего и большого размера; а также элементы, которые делать не будут
 * (см. конец списка). В каталоге и при чтении .cad они остаются.
 */
export const HIDDEN_PALETTE_COMMANDS: ReadonlySet<number> = new Set([
  33253, 33254, 33255, 33256, 33346, 33347,
  // Símbolos realistas 2D: Rele zócalo, Rele temporizado zócalo, Diodo LED, Botonera, Componente S/M/L
  // (клемма «Borna» 33319 уже сделана, model/terminal-2d.ts).
  33313, 33314, 33371, 33323, 33363, 33364, 33365,
  // Те же в 3D: Rele zócalo, Rele temporizado zócalo, Diodo led, Borna (Botonera и Componente — общие коды).
  33315, 33316, 33375, 33322,
  // Убраны насовсем (делать не планируется, 2026-11-27): провода «+» / «−» (Ladder, Lógica, Cables),
  // GRAFCET «0», «Y», входная/выходная связь, макрошаг; обмен входами/выходами с PC_SIMU, модуль
  // входов/выходов S7-1500, питание цифровых входов/выходов ПЛК (две кнопки), Arduino Uno,
  // одноканальное реле (2D и 3D), электрический линейный привод.
  33035, 33037,
  33101, 33102, 33090, 33091, 33096,
  33108, 33109, 33328, 33275, 33276, 33324,
  33374, 33376,
  33257,
]);

export function readVerifiedOnly(): boolean {
  try { return localStorage.getItem(VERIFIED_ONLY_KEY) !== 'off'; } catch { return true; }
}

export function writeVerifiedOnly(value: boolean): void {
  try { localStorage.setItem(VERIFIED_ONLY_KEY, value ? 'on' : 'off'); } catch { /* Выбор действует до перезагрузки. */ }
}

/** Показывать ли кнопку команды id в категории group. */
export function isPaletteItemShown(group: GroupKey, id: number, verifiedOnly: boolean): boolean {
  if (HIDDEN_PALETTE_COMMANDS.has(id)) return false;
  return !verifiedOnly || hasVerifiedBadge(group, id);
}
