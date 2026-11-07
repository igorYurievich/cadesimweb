import type { Schema } from '@model/types';
import type { AppContext } from './context';
import type { Viewport } from './viewport';
import type { StampKey } from './constants';
import { STAMP_CELLS } from './constants';
import { cloneSchema, stampMetrics, stampValue } from './helpers';

export interface StampEditorSetup {
  stage: HTMLElement | null; viewport(): Viewport;
  commitSchema(before: Schema): void; renderSchema(): void;
}

export function setupStampEditor(ctx: AppContext, deps: StampEditorSetup) {
  const stampOrder = STAMP_CELLS.filter((cell) => cell.key);
  let stampEditor: { input: HTMLInputElement; key: StampKey; before: Schema } | undefined;
  const close = (commit = true): void => {
    const editor = stampEditor;
    if (!editor) return;
    stampEditor = undefined;
    const value = editor.input.value; editor.input.remove();
    if (commit && value !== stampValue(ctx.schema.sheet, editor.key)) {
      (ctx.schema.sheet as unknown as Record<string, string>)[editor.key] = value;
      deps.commitSchema(editor.before);
    }
    deps.renderSchema();
  };
  const open = (key: StampKey): void => {
    const stage = deps.stage;
    if (!stage) return;
    close(true);
    const cell = stampOrder.find((candidate) => candidate.key === key);
    if (!cell) return;
    const viewport = deps.viewport(); const sheet = ctx.schema.sheet;
    const metrics = stampMetrics(sheet.width, sheet.height);
    const left = viewport.offsetX + (metrics.margin + cell.x0 * metrics.stampWidth) * viewport.scale;
    const top = viewport.offsetY + (sheet.height + metrics.gap + cell.r0 * metrics.rowH) * viewport.scale;
    const input = document.createElement('input');
    input.type = 'text'; input.className = 'stamp-editor'; input.value = stampValue(sheet, key);
    input.setAttribute('aria-label', cell.hint ?? cell.label ?? 'Графа штампа');
    input.title = `${cell.hint ?? cell.label ?? ''} · Enter — готово, Tab — следующая графа, Esc — отмена`;
    Object.assign(input.style, {
      left: `${left}px`, top: `${top}px`,
      width: `${Math.max(60, (cell.x1 - cell.x0) * metrics.stampWidth * viewport.scale)}px`,
      height: `${Math.max(22, (cell.r1 - cell.r0) * metrics.rowH * viewport.scale)}px`,
      fontSize: `${Math.max(12, metrics.rowH * 0.42 * viewport.scale)}px`,
    });
    stage.append(input); stampEditor = { input, key, before: cloneSchema(ctx.schema) };
    input.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter') { close(true); event.preventDefault(); }
      else if (event.key === 'Escape') { close(false); event.preventDefault(); }
      else if (event.key === 'Tab') {
        event.preventDefault();
        const index = stampOrder.findIndex((candidate) => candidate.key === key);
        const next = stampOrder[(index + (event.shiftKey ? -1 : 1) + stampOrder.length) % stampOrder.length];
        close(true);
        if (next?.key) open(next.key);
      }
    });
    input.addEventListener('blur', () => { if (stampEditor?.input === input) close(true); });
    input.focus(); input.select();
  };
  return { open, close, isOpen: () => stampEditor !== undefined };
}
