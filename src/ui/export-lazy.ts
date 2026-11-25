/**
 * Сохранение и экспорт (export.ts: JSON, .cad, SVG, PNG, печать) — отдельный кусок сборки.
 * Он не входит в стартовую загрузку: скачивается при первой команде меню (или заранее в фоне,
 * preloadExport), поэтому команды здесь асинхронные.
 */
import type { AppContext } from './context';
import type { ExportActions } from './export';
import { currentText, fillText } from './i18n';
import { errorReason } from './helpers';

export interface ExportCommands {
  saveJson(): void;
  /** true — файл записан (пользователь не отменил). */
  exportCadFile(): Promise<boolean>;
  exportSvgFile(): void;
  exportPngFile(): void;
  printPdf(): void;
  /** Лист в том виде, в каком он уходит на печать (без сетки): для предпросмотра печати. */
  printSheetSvg(): Promise<SVGSVGElement>;
}

export function setupLazyExport(
  ctx: AppContext, root: HTMLElement, svg: SVGSVGElement, status: HTMLElement, onSaved: () => void,
): ExportCommands & { preload(): Promise<unknown> } {
  let actions: Promise<ExportActions> | undefined;
  const load = (): Promise<ExportActions> => {
    actions ??= import('./export').then((module) =>
      module.setupExport(ctx, svg, status, module.setupCadExportConfirmation(root), onSaved));
    // Без сети кусок не скачался: следующая команда попробует снова.
    actions.catch(() => { actions = undefined; });
    return actions;
  };
  const failed = (error: unknown): void => {
    status.textContent = fillText(currentText().exportLoadFailed, { reason: errorReason(error) });
  };
  const run = (action: (loaded: ExportActions) => void) => (): void => { load().then(action, failed); };
  return {
    saveJson: run((loaded) => loaded.saveJson()),
    exportCadFile: () => load().then(
      (loaded) => loaded.exportCadFile(),
      (error: unknown) => { failed(error); return false; },
    ),
    exportSvgFile: run((loaded) => loaded.exportSvgFile()),
    exportPngFile: run((loaded) => loaded.exportPngFile()),
    printPdf: run((loaded) => loaded.printPdf()),
    printSheetSvg: () => load().then((loaded) => loaded.printSheetSvg()),
    preload: () => load().catch(() => undefined),
  };
}
