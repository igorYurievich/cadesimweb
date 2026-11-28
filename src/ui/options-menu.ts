/**
 * Меню «Opciones» (справа от «Ayuda»): настройки, которые хранятся в браузере.
 *  - «Автоматы выбивают при КЗ» (engine/cc-trip.ts): по умолчанию выключено.
 *  - «Умная прокладка кабеля» (wire-routing.ts, straightenFromAnchor): по умолчанию включено.
 *    Выключена — каждый отрезок провода прямой: только по вертикали или только по горизонтали.
 */

const BREAKERS_TRIP_CC_KEY = 'cadesimu-breakers-trip-cc';
const SMART_WIRE_KEY = 'cadesimu-smart-wire';

let breakersTripCc = ((): boolean => {
  try { return localStorage.getItem(BREAKERS_TRIP_CC_KEY) === '1'; } catch { return false; }
})();

let smartWire = readSmartWireRouting();

/** Включена ли опция «Автоматы выбивают при КЗ». */
export const breakersTripOnShortCircuit = (): boolean => breakersTripCc;

/** Включена ли «Умная прокладка кабеля» (провод с изгибом следует за мышью). */
export const smartWireRouting = (): boolean => smartWire;

export function readSmartWireRouting(): boolean {
  try { return localStorage.getItem(SMART_WIRE_KEY) !== '0'; } catch { return true; }
}

function bindToggle(root: HTMLElement, id: string, value: boolean, onChange: (checked: boolean) => void): void {
  const checkbox = root.querySelector<HTMLInputElement>(`#${id}`);
  if (!checkbox) return;
  checkbox.checked = value;
  checkbox.addEventListener('change', () => onChange(checkbox.checked));
}

export function setupOptionsMenu(root: HTMLElement): void {
  bindToggle(root, 'option-breakers-trip-cc', breakersTripCc, (checked) => {
    breakersTripCc = checked;
    try { localStorage.setItem(BREAKERS_TRIP_CC_KEY, checked ? '1' : '0'); } catch { /* Работает до перезагрузки. */ }
  });
  bindToggle(root, 'option-smart-wire', smartWire, (checked) => {
    smartWire = checked;
    try { localStorage.setItem(SMART_WIRE_KEY, checked ? '1' : '0'); } catch { /* Работает до перезагрузки. */ }
  });
}
