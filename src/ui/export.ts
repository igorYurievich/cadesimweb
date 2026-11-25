import { exportCad } from '@model/cad-export';
import { serializeSchemaJson } from '@model/schema-json';
import { POSITION_SPECS, currentPosition } from '@engine/behaviors';
import type { AppContext } from './context';
import { CAD_EXPORT_WARNING_KEY, SVG_NS, WIRE_COLORS } from './constants';
import { fullSheet, errorReason } from './helpers';
import { currentText, fillText } from './i18n';

export interface ExportActions {
  saveJson(): void;
  /** true — файл записан (пользователь не отменил). */
  exportCadFile(): Promise<boolean>;
  exportSvgFile(): void;
  exportPngFile(): void;
  printPdf(): void;
  /** Лист в том виде, в каком он уходит на печать (без сетки): для предпросмотра печати. */
  printSheetSvg(): SVGSVGElement;
}

/** Цвета ламп на листе: те же, что у включённой лампы в симуляции (viewport.css, .lamp-c0…2). */
const LAMP_PRINT_COLORS: readonly { fill: string; stroke: string }[] = [
  { fill: '#43df70', stroke: '#16843a' },
  { fill: '#ff4048', stroke: '#b21c25' },
  { fill: '#ffe600', stroke: '#b88a00' },
];

/** Телефон/планшет: тач без мыши — печать в отдельном окне (там она работает надёжно). */
function prefersPrintWindow(): boolean {
  try {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
  } catch {
    return false;
  }
}

export function setupCadExportConfirmation(root: HTMLElement): () => Promise<boolean> {
  return (): Promise<boolean> => {
    try {
      if (localStorage.getItem(CAD_EXPORT_WARNING_KEY) === '1') return Promise.resolve(true);
    } catch { /* Keep the warning enabled when storage is unavailable. */ }
    const dialog = root.querySelector<HTMLDialogElement>('#cad-export-warning-dialog');
    const optout = root.querySelector<HTMLInputElement>('#cad-export-warning-optout');
    const confirm = root.querySelector<HTMLButtonElement>('#cad-export-warning-confirm');
    if (!dialog || !optout || !confirm) return Promise.resolve(false);
    optout.checked = false;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (accepted: boolean): void => {
        if (settled) return;
        settled = true;
        dialog.removeEventListener('close', onClose);
        confirm.removeEventListener('click', onConfirm);
        if (accepted && optout.checked) {
          try { localStorage.setItem(CAD_EXPORT_WARNING_KEY, '1'); }
          catch { /* The warning will appear again if storage is unavailable. */ }
        }
        if (dialog.open) dialog.close();
        resolve(accepted);
      };
      const onClose = (): void => finish(false);
      const onConfirm = (): void => finish(true);
      dialog.addEventListener('close', onClose);
      confirm.addEventListener('click', onConfirm);
      dialog.showModal();
    });
  };
}

export function setupExport(
  ctx: AppContext, svg: SVGSVGElement, status: HTMLElement, confirmCadExport: () => Promise<boolean>,
  onSaved: () => void = () => {},
): ExportActions {
  const downloadText = (text: string, name: string, mime: string): void => {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const outputBaseName = (): string => {
    const name = ctx.schema.sheet.fileName.replace(/\.(cad|json)$/i, '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim();
    return name || currentText().defaultFileName;
  };
  const saveJson = (): void => {
    downloadText(serializeSchemaJson(ctx.schema), `${outputBaseName()}.json`, 'application/json;charset=utf-8');
    status.textContent = fillText(currentText().jsonSaved, { file: `${outputBaseName()}.json` });
    onSaved();
  };
  const exportCadFile = async (): Promise<boolean> => {
    if (!(await confirmCadExport())) return false;
    try {
      const contents = exportCad(ctx.schema);
      type SaveFileHandle = { name: string; createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }> };
      type SavePicker = (options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<SaveFileHandle>;
      const picker = (window as Window & { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
      let savedName = `${outputBaseName()}.cad`;
      if (picker) {
        const handle = await picker({
          suggestedName: `${outputBaseName()}.cad`,
          types: [{ description: 'CADe_SIMU (*.cad)', accept: { 'text/plain': ['.cad'] } }],
        });
        savedName = handle.name;
        const writable = await handle.createWritable();
        await writable.write(contents);
        await writable.close();
      } else {
        const requestedName = window.prompt(currentText().exportFileNamePrompt, `${outputBaseName()}.cad`);
        if (requestedName === null) return false;
        const safeName = requestedName.trim().replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/\.cad$/i, '') || outputBaseName();
        savedName = `${safeName}.cad`;
        downloadText(contents, savedName, 'text/plain;charset=utf-8');
      }
      status.textContent = fillText(currentText().cadExported, { file: savedName });
      onSaved();
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return false;
      status.textContent = fillText(currentText().cadExportFailed, { reason: errorReason(error) });
      return false;
    }
  };
  const createSheetExportSvg = (): SVGSVGElement => {
    const copy = svg.cloneNode(true) as SVGSVGElement;
    const width = ctx.schema.sheet.width;
    const height = fullSheet(ctx.schema.sheet).height;
    copy.setAttribute('xmlns', SVG_NS);
    copy.setAttribute('width', `${width}mm`);
    copy.setAttribute('height', `${height}mm`);
    copy.setAttribute('viewBox', `0 0 ${width} ${height}`);
    copy.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    copy.removeAttribute('class');
    copy.querySelector('.viewport-backdrop')?.remove();
    copy.querySelector('#sheet-grid')?.remove();
    copy.querySelector('#selection-layer')?.remove();
    copy.querySelector('#draft-layer')?.remove();
    copy.querySelector('#ghost-layer')?.remove();
    copy.querySelector('#sheet-transform')?.removeAttribute('transform');
    // Направление вращения на символе зависит от временной анимации и не является
    // характеристикой самого двигателя в схеме, поэтому в печать/экспорт его не включаем.
    copy.querySelectorAll('.motor-rotor').forEach((rotor) => rotor.remove());
    const wiresById = new Map(ctx.schema.wires.map((wire) => [String(wire.id), wire]));
    for (const line of [...copy.querySelectorAll<SVGLineElement>('#wire-layer line[data-wire-id]')]) {
      const wire = wiresById.get(line.getAttribute('data-wire-id') ?? '');
      if (!wire || wire.kind === 'junction') continue;
      line.classList.remove('is-energized');
      line.style.removeProperty('filter');
      // Screen lines use non-scaling CSS pixels; export maps each thickness step to 0.4 mm
      // so the printed result keeps a comparable visual weight at sheet scale.
      line.setAttribute('stroke-width', String(Math.max(1, wire.thickness || 1) * 0.4));
      line.removeAttribute('vector-effect');
      line.setAttribute('stroke', WIRE_COLORS[wire.kind]);
    }
    copy.querySelectorAll<SVGCircleElement>('#wire-layer circle[data-wire-id]').forEach((dot) => {
      dot.classList.remove('is-energized');
      dot.setAttribute('fill', '#566170');
    });
    copy.querySelectorAll('.schematic-element').forEach((element) => {
      const model = ctx.schema.elements.find((candidate) => String(candidate.id) === element.getAttribute('data-element-id'));
      for (const className of [...element.classList]) if (className.startsWith('is-')) element.classList.remove(className);
      element.removeAttribute('style');
      element.removeAttribute('data-position');
      if (model && POSITION_SPECS[model.typeCode]) {
        element.setAttribute('data-position', String(currentPosition(model.typeCode, undefined)));
      }
      // Встроенный стиль важнее CSS редактора, где для удобства холста задан серый посветлее.
      (element as SVGElement).style.setProperty('color', '#4b5563');
      element.classList.remove('is-selected-element');
    });
    copy.querySelectorAll('.is-selected-wire, .is-selected-junction').forEach((wire) => wire.classList.remove('is-selected-wire', 'is-selected-junction'));
    // На листе лампа показывает свой цвет (зелёный, красный, жёлтый) и без симуляции: заливка
    // встроенным стилем, без свечения, чтобы цвет был виден при печати, в PDF, SVG и PNG.
    copy.querySelectorAll<SVGElement>('.lamp-glass').forEach((glass) => {
      const index = [0, 1, 2].find((candidate) => glass.classList.contains(`lamp-c${candidate}`)) ?? 0;
      const colors = LAMP_PRINT_COLORS[index]!;
      glass.style.setProperty('fill', colors.fill);
      glass.style.setProperty('stroke', colors.stroke);
      glass.style.setProperty('filter', 'none');
      // Крест лампы рисуется следом за стеклом; серый плохо виден на красном, поэтому темнее.
      const cross = glass.nextElementSibling;
      if (cross instanceof SVGPathElement) cross.setAttribute('stroke', '#374151');
    });
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = ctx.schema.sheet.fileName || outputBaseName();
    copy.prepend(title);
    const relevantRules: string[] = [];
    for (const sheetStyle of [...document.styleSheets]) {
      try {
        for (const rule of [...sheetStyle.cssRules]) {
          const selectorText = 'selectorText' in rule ? String(rule.selectorText) : '';
          if (/(schematic-element|\.contact|\.blade-|is-sim|lamp-glass|\.mp-open|\.mp-closed|\.fuse-)/.test(selectorText)) relevantRules.push(rule.cssText);
        }
      } catch { /* Cross-origin style sheets are not needed for the inline SVG artwork. */ }
    }
    if (relevantRules.length) {
      const style = document.createElementNS(SVG_NS, 'style');
      style.textContent = relevantRules.join('\n');
      copy.insertBefore(style, copy.firstChild);
    }
    return copy;
  };
  const exportSvgFile = (): void => {
    const serialized = new XMLSerializer().serializeToString(createSheetExportSvg());
    downloadText(`<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`, `${outputBaseName()}.svg`, 'image/svg+xml;charset=utf-8');
  };
  const exportPngFile = (): void => {
    const width = ctx.schema.sheet.width;
    const height = fullSheet(ctx.schema.sheet).height;
    const targetScale = 300 / 25.4;
    const maxPixels = 32_000_000;
    const maxDimension = 12_000;
    const scale = Math.min(
      targetScale,
      maxDimension / width,
      maxDimension / height,
      Math.sqrt(maxPixels / (width * height)),
    );
    const svgMarkup = new XMLSerializer().serializeToString(createSheetExportSvg());
    const svgUrl = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' }));
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const context = canvas.getContext('2d');
        if (!context) throw new Error(currentText().imageCreateFailed);
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(svgUrl);
          if (!blob) { status.textContent = currentText().pngCreateFailed; return; }
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl; link.download = `${outputBaseName()}.png`; link.click();
          setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
          status.textContent = fillText(currentText().pngExported, { file: `${outputBaseName()}.png` });
        }, 'image/png');
      } catch (error) {
        URL.revokeObjectURL(svgUrl);
        status.textContent = fillText(currentText().pngExportFailed, { reason: errorReason(error) });
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      status.textContent = currentText().pngPrepareFailed;
    };
    image.src = svgUrl;
  };
  const printSheetSvg = (): SVGSVGElement => {
    const printSvg = createSheetExportSvg();
    printSvg.querySelector('#sheet-grid')?.remove();
    return printSvg;
  };
  const printPdf = (): void => {
    const width = ctx.schema.sheet.width;
    const height = fullSheet(ctx.schema.sheet).height;
    const printWidth = `${Math.round(width * 100) / 100}mm`;
    const printHeight = `${Math.round(height * 100) / 100}mm`;
    const printSvg = printSheetSvg();
    const svgMarkup = new XMLSerializer().serializeToString(printSvg);
    const title = outputBaseName();
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
      @page { size: ${printWidth} ${printHeight}; margin: 0; }
      html, body { margin: 0; padding: 0; }
      .page, .page > svg { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      @media print { html, body { width: ${printWidth}; height: ${printHeight}; overflow: hidden; } }
      .page { position: relative; width: ${printWidth}; height: ${printHeight}; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
      .page > svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; color: #263342; }
      @media screen { body { background: #e8edf3; padding: 16px; } .page { background: #fff; box-shadow: 0 2px 12px #18243333; margin: 0 auto; } }
    </style></head><body><div class="page">${svgMarkup}</div></body></html>`;
    // ПК: печать через скрытый iframe на этой же странице — без всплывающего окна, которое браузер
    // блокирует на опубликованном сайте (на localhost обычно пропускает). Мобильные браузеры печатают
    // iframe ненадёжно (iOS печатает всю страницу), поэтому там остаётся отдельное окно.
    if (prefersPrintWindow()) printInWindow(html);
    else printInFrame(html);
  };
  const printInWindow = (html: string): void => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      status.textContent = currentText().popupBlocked;
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 350);
  };
  const printInFrame = (html: string): void => {
    document.getElementById('print-frame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'print-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    // Не display:none и не visibility:hidden — иначе часть браузеров печатает пустую страницу.
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    document.body.append(frame);
    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument ?? frameWindow?.document;
    if (!frameWindow || !frameDocument) {
      frame.remove();
      printInWindow(html);
      return;
    }
    frameDocument.open();
    frameDocument.write(html);
    frameDocument.close();
    let removed = false;
    const cleanup = (): void => {
      if (removed) return;
      removed = true;
      setTimeout(() => frame.remove(), 500);
    };
    frameWindow.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(() => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } catch {
        frame.remove();
        printInWindow(html);
        return;
      }
      // Страховка: если afterprint не пришёл, убрать iframe через минуту.
      setTimeout(cleanup, 60_000);
    }, 350);
  };
  return { saveJson, exportCadFile, exportSvgFile, exportPngFile, printPdf, printSheetSvg };
}
