import type { Schema, SchemaElement } from '@model/types';
import type { InterfaceText } from './i18n';
import { svgPoint } from './canvas-primitives';
import { cloneSchema } from './helpers';
import { clampPointToSheet } from './bounds';
import { screenToSheet, snapPointToGrid } from './viewport';
import type { Point, Viewport } from './viewport';
import type { AppContext } from './context';

// Текст на схеме: ПКМ по листу в режиме редактора → «Текст» (новая надпись в точке щелчка) или
// «Изменить текст» по существующей надписи. Надпись — элемент типа 8, как в CADe_SIMU (текст после записи).

export interface TextToolSetup {
  svg: SVGSVGElement;
  viewSize(): Point;
  viewport(): Viewport;
  editMode(): boolean;
  wireDrawing(): boolean;
  uiText(): InterfaceText;
  commitSchema(before: Schema): void;
  renderSchema(): void;
}

/** Символы, которые нельзя записать в .cad (разделители записи), заменяются. */
export const cleanText = (value: string): string => value.replace(/[#*$&]/g, ' ').replace(/\s+/g, ' ').trim();

/** Высота рамки надписи: 4 — обычный текст CADe_SIMU; от неё зависит размер шрифта. */
export const TEXT_HEIGHT = { base: 4, min: 2, max: 40 };

/** Рамка надписи как в образцах CADe_SIMU: при высоте 4 — 2 единицы на символ. */
export const textSize = (text: string, h = TEXT_HEIGHT.base): { w: number; h: number } =>
  ({ w: Math.max(3, Math.ceil((text.length * h) / 2)), h });

/**
 * «+» / «−» при выделенных надписях: меняет высоту рамки (а с ней шрифт) на 1.
 * Возвращает true, если среди выделенного были надписи и размер изменился.
 */
export function resizeTexts(schema: Schema, ids: Iterable<number>, direction: 1 | -1): boolean {
  let changed = false;
  for (const id of ids) {
    const element = schema.elements.find((e) => e.id === id);
    if (element?.typeCode !== 8) continue;
    const h = Math.min(TEXT_HEIGHT.max, Math.max(TEXT_HEIGHT.min, (element.size.h || TEXT_HEIGHT.base) + direction));
    if (h === element.size.h) continue;
    element.size = textSize(String(element.params.text ?? ''), h);
    changed = true;
  }
  return changed;
}

/** Новая надпись в точке листа. */
export function createTextElement(schema: Schema, at: Point, text: string): SchemaElement {
  const id = Math.max(0, ...schema.elements.map((e) => e.id), ...schema.wires.map((w) => w.id)) + 1;
  return {
    id, typeCode: 8, name: '', func: '', position: { ...at }, rotation: 0, size: textSize(text),
    labelOffset: { x: 0, y: 0 }, terminals: [], params: { text },
  };
}

function button(label: string): HTMLButtonElement {
  const item = document.createElement('button');
  item.type = 'button';
  item.setAttribute('role', 'menuitem');
  item.textContent = label;
  return item;
}

export function setupTextTool(ctx: AppContext, deps: TextToolSetup): void {
  const menu = document.createElement('div');
  menu.className = 'simulation-context-menu';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  const addItem = button('');
  const editItem = button('');
  menu.append(addItem, editItem);
  const dialog = document.createElement('dialog');
  dialog.className = 'app-dialog text-dialog';
  const title = document.createElement('h2');
  const input = document.createElement('input');
  input.type = 'text';
  input.maxLength = 120;
  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  const cancel = button('');
  const ok = button('');
  ok.className = 'primary-action';
  actions.append(cancel, ok);
  dialog.append(title, input, actions);
  ctx.root.append(menu, dialog);

  let point: Point = { x: 0, y: 0 };
  let editing: SchemaElement | undefined;

  const openDialog = (target: SchemaElement | undefined): void => {
    const text = deps.uiText();
    editing = target;
    title.textContent = target ? text.textEdit : text.textDialogTitle;
    cancel.textContent = text.cancel;
    ok.textContent = text.done;
    input.value = target ? String(target.params.text ?? '') : '';
    menu.hidden = true;
    dialog.showModal();
    input.focus();
  };

  const apply = (): void => {
    const value = cleanText(input.value);
    dialog.close();
    if (!value) return;
    const before = cloneSchema(ctx.schema);
    if (editing) {
      const target = ctx.schema.elements.find((e) => e.id === editing?.id);
      if (!target) return;
      target.params.text = value;
      target.size = textSize(value, target.size.h || TEXT_HEIGHT.base);
    } else {
      ctx.schema.elements.push(createTextElement(ctx.schema, point, value));
    }
    deps.commitSchema(before);
    deps.renderSchema();
  };

  addItem.addEventListener('click', () => openDialog(undefined));
  editItem.addEventListener('click', () => openDialog(editing));
  ok.addEventListener('click', apply);
  cancel.addEventListener('click', () => dialog.close());
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); apply(); } });
  window.addEventListener('pointerdown', (event) => {
    if (!menu.hidden && !menu.contains(event.target as Node)) menu.hidden = true;
  });
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') menu.hidden = true; });

  deps.svg.addEventListener('contextmenu', (event) => {
    if (!deps.editMode() || deps.wireDrawing()) return;
    event.preventDefault();
    const text = deps.uiText();
    const target = event.target instanceof Element ? event.target.closest<SVGGElement>('[data-element-id]') : null;
    const element = target ? ctx.schema.elements.find((e) => e.id === Number(target.dataset.elementId)) : undefined;
    editing = element?.typeCode === 8 ? element : undefined;
    const sheet = screenToSheet(svgPoint(event, deps.svg, deps.viewSize()), deps.viewport());
    point = snapPointToGrid(clampPointToSheet(sheet, ctx.schema.sheet), 3);
    addItem.textContent = text.textMenu;
    editItem.textContent = text.textEdit;
    editItem.hidden = !editing;
    menu.hidden = false;
    const bounds = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth - bounds.width - 8))}px`;
    menu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight - bounds.height - 8))}px`;
  });
}
