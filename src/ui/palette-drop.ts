import { cadTypeForCommand } from '@model/cad-types';
import type { AppContext } from './context';
import type { Point, Viewport } from './viewport';
import type { Selectable } from './constants';
import { createPlacedElement, cloneSchema, selectionKey } from './helpers';
import { screenToSheet } from './viewport';
import { svgPoint } from './canvas-primitives';

export interface PaletteDropSetup {
  svg: SVGSVGElement; viewSize(): Point; viewport(): Viewport; placementType(): number | undefined;
  setPlacementType(value: number | undefined): void; setActiveCommand(value: number | undefined): void;
  setPlacementRotation(value: 0 | 1 | 2 | 3): void; leaveNodeTool(): void;
  moveGhost(event: MouseEvent): void;
  selected: Map<string, Selectable>; commitSchema(before: ReturnType<typeof cloneSchema>): void;
  renderSchema(): void; status: HTMLElement;
}

export function setupPaletteDrop(ctx: AppContext, deps: PaletteDropSetup): void {
  deps.svg.addEventListener('dragover', (event) => {
    if (deps.placementType() === undefined) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
    deps.moveGhost(event);
  });
  deps.svg.addEventListener('drop', (event) => {
    const commandId = Number(event.dataTransfer?.getData('text/plain'));
    const cadType = cadTypeForCommand(commandId);
    if (!cadType) return;
    event.preventDefault(); deps.leaveNodeTool();
    deps.setPlacementType(cadType.code); deps.setActiveCommand(commandId); deps.setPlacementRotation(0);
    const point = screenToSheet(svgPoint(event, deps.svg, deps.viewSize()), deps.viewport());
    const before = cloneSchema(ctx.schema);
    const element = createPlacedElement(cadType.code, point, 0, ctx.schema);
    ctx.schema.elements.push(element);
    const item: Selectable = { kind: 'element', id: element.id };
    deps.selected.clear(); deps.selected.set(selectionKey(item), item);
    deps.commitSchema(before); deps.renderSchema();
    deps.status.textContent = `Добавлен ${element.name}. Режим размещения продолжается; R — поворот, Esc — завершить.`;
  });
}
