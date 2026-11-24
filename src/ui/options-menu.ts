/**
 * Меню «Opciones» (справа от «Ayuda»): настройки симуляции, которые хранятся в браузере.
 *  - «Автоматы выбивают при КЗ» (engine/cc-trip.ts): по умолчанию выключено.
 */

const BREAKERS_TRIP_CC_KEY = 'cadesimu-breakers-trip-cc';

let breakersTripCc = ((): boolean => {
  try { return localStorage.getItem(BREAKERS_TRIP_CC_KEY) === '1'; } catch { return false; }
})();

/** Включена ли опция «Автоматы выбивают при КЗ». */
export const breakersTripOnShortCircuit = (): boolean => breakersTripCc;

export function setupOptionsMenu(root: HTMLElement): void {
  const checkbox = root.querySelector<HTMLInputElement>('#option-breakers-trip-cc');
  if (!checkbox) return;
  checkbox.checked = breakersTripCc;
  checkbox.addEventListener('change', () => {
    breakersTripCc = checkbox.checked;
    try { localStorage.setItem(BREAKERS_TRIP_CC_KEY, breakersTripCc ? '1' : '0'); } catch { /* Работает до перезагрузки. */ }
  });
}
