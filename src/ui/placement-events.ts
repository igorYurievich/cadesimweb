import { getCadType } from '@model/cad-types';

export interface PlacementEventsOptions {
  select: HTMLSelectElement | null;
  svg: SVGSVGElement;
  status: HTMLElement;
  leaveNodeTool: () => void;
  wireDrawing: () => boolean;
  cancelWireDrawing: () => void;
  clearActivePaletteCommand: () => void;
  setPlacementType: (type: number | undefined) => void;
  setPlacementRotation: (rotation: 0) => void;
  drawGhost: () => void;
}

export function setupPlacementEvents(options: PlacementEventsOptions): void {
  options.select?.addEventListener('change', () => {
    if (options.select?.value) options.leaveNodeTool();
    if (options.wireDrawing()) options.cancelWireDrawing();
    options.clearActivePaletteCommand();
    const type = options.select?.value ? Number(options.select.value) : undefined;
    options.setPlacementType(type);
    options.setPlacementRotation(0);
    options.svg.classList.toggle('is-placing', type !== undefined);
    options.drawGhost();
    if (type !== undefined) {
      options.status.textContent = `Размещение: ${getCadType(type).label} · щёлкните по листу; R — поворот; Esc — отмена.`;
    } else {
      options.status.textContent = 'Режим выбора. Выберите объект или рамкой выделите область.';
    }
  });
}
