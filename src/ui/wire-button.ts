// Кнопка «Провод»: вместо текста — свой значок: два изогнутых провода (красный и синий) с зачищенными
// медными концами справа.
// Во время рисования провода кнопка подсвечена (is-active), а подсказка говорит «Отмена (C)».

const SVG_NS = 'http://www.w3.org/2000/svg';

const WIRE_ICON = `<svg class="wire-icon" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M3 17.5 C8 17.5 8 10.5 12 10.5 C15.6 10.5 15.6 5 19 5" stroke="#ef4444"/>
  <path d="M5 21.5 C10.4 21.5 10.4 14.5 14 14.5 C17.6 14.5 17.6 9 21 9" stroke="#3b82f6"/>
  <path d="M19 5 H22 M21 9 H23.4" stroke="#f59e0b" stroke-width="1.5"/>
</svg>`;

let template: SVGSVGElement | undefined;

function icon(): SVGSVGElement {
  if (!template) {
    const holder = document.createElementNS(SVG_NS, 'svg');
    holder.innerHTML = WIRE_ICON.replace(/^<svg[^>]*>|<\/svg>$/g, '');
    holder.setAttribute('class', 'wire-icon');
    holder.setAttribute('viewBox', '0 0 24 24');
    holder.setAttribute('aria-hidden', 'true');
    template = holder;
  }
  return template.cloneNode(true) as SVGSVGElement;
}

/** Значок, подсказка и состояние кнопки по режиму рисования. */
export function renderWireButton(
  button: HTMLButtonElement, drawing: boolean, text: { wire: string; cancel: string },
): void {
  if (!button.querySelector('.wire-icon')) button.replaceChildren(icon());
  const label = drawing ? text.cancel : text.wire;
  button.setAttribute('aria-label', label);
  button.setAttribute('title', `${label} (C)`);
  button.setAttribute('aria-pressed', String(drawing));
  button.classList.add('icon-btn');
  button.classList.toggle('is-active', drawing);
}
