import type { AppContext } from './context';
import type { ExportCommands } from './export-lazy';
import { fullSheet } from './helpers';

// Предпросмотр печати (Файл → «Предпросмотр печати»): тот же лист, что уйдёт на принтер или в PDF
// (без сетки, провода и лампы как при печати — export.ts, printSheetSvg), на белой странице в пропорциях
// бумаги. Клик по странице увеличивает её вдвое (прокрутка), повторный — обратно. Кнопка «Печать / PDF»
// закрывает окно и открывает обычную печать.

const PAPER: Readonly<Record<string, string>> = { '297x210': 'A4', '210x297': 'A4', '420x297': 'A3', '297x420': 'A3' };

const mm = (value: number): string => String(Math.round(value * 10) / 10).replace('.', ',');

export function setupPrintPreview(ctx: AppContext, root: HTMLElement, actions: ExportCommands): void {
  const dialog = root.querySelector<HTMLDialogElement>('#print-preview-dialog');
  const page = dialog?.querySelector<HTMLDivElement>('#print-preview-page');
  const info = dialog?.querySelector<HTMLElement>('#print-preview-info');
  if (!dialog || !page || !info) return;

  const open = async (): Promise<void> => {
    const svg = await actions.printSheetSvg(); // Кусок «экспорт» может ещё качаться.
    const { width, height: sheetHeight } = ctx.schema.sheet;
    const height = fullSheet(ctx.schema.sheet).height;
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    page.replaceChildren(svg);
    page.classList.remove('is-zoomed');
    page.style.setProperty('--ratio', String(width / height));
    const paper = PAPER[`${width}x${sheetHeight}`];
    info.textContent = `${paper ? `${paper} · ` : ''}${mm(width)} × ${mm(height)} mm`;
    dialog.showModal();
  };

  root.querySelector<HTMLElement>('.app-menu')?.addEventListener('click', (event) => {
    if ((event.target as Element).closest('[data-command="print-preview"]')) open().catch(() => undefined);
  });
  page.addEventListener('click', () => page.classList.toggle('is-zoomed'));
  dialog.querySelector<HTMLButtonElement>('#print-preview-print')?.addEventListener('click', () => {
    dialog.close();
    actions.printPdf();
  });
}
