/**
 * Крупная подсказка с названием элемента для плиток палитры (системная подсказка браузера мелкая
 * и появляется с задержкой — для слабовидящих не годится). Текст берётся из data-tip плитки.
 */
export function setupPaletteTooltip(container: HTMLElement): void {
  const tip = document.createElement('div');
  tip.className = 'palette-tooltip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.append(tip);
  const show = (target: EventTarget | null): void => {
    const tile = target instanceof Element ? target.closest<HTMLElement>('.palette-tile[data-tip]') : null;
    if (!tile || !container.contains(tile)) { tip.hidden = true; return; }
    tip.textContent = tile.dataset.tip ?? '';
    tip.hidden = false;
    const box = tile.getBoundingClientRect();
    const left = Math.min(box.left, window.innerWidth - tip.offsetWidth - 8);
    const below = box.bottom + 6;
    const top = below + tip.offsetHeight > window.innerHeight ? box.top - tip.offsetHeight - 6 : below;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${Math.max(8, top)}px`;
  };
  const hide = (): void => { tip.hidden = true; };
  container.addEventListener('pointerover', (event) => show(event.target));
  container.addEventListener('pointerleave', hide);
  container.addEventListener('focusin', (event) => show(event.target));
  container.addEventListener('focusout', hide);
  container.addEventListener('scroll', hide, { passive: true });
  container.addEventListener('dragstart', hide);
}
