import { exportCad } from '@model/cad-export';
import { serializeSchemaJson } from '@model/schema-json';
import type { AppContext } from './context';
import { CADESIM_LINK_TEXT, CADESIM_URL, SVG_NS } from './constants';
import { fullSheet, stampMetrics } from './helpers';

export interface ExportActions {
  saveJson(): void;
  exportCadFile(): void;
  exportSvgFile(): void;
  exportPngFile(): void;
  printPdf(): void;
}

export function setupExport(ctx: AppContext, svg: SVGSVGElement, status: HTMLElement): ExportActions {
  const downloadText = (text: string, name: string, mime: string): void => {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const outputBaseName = (): string => {
    const name = ctx.schema.sheet.fileName.replace(/\.(cad|json)$/i, '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim();
    return name || 'Схема';
  };
  const saveJson = (): void => {
    downloadText(serializeSchemaJson(ctx.schema), `${outputBaseName()}.json`, 'application/json;charset=utf-8');
    status.textContent = `Схема сохранена в ${outputBaseName()}.json.`;
  };
  const exportCadFile = (): void => {
    try {
      downloadText(exportCad(ctx.schema), `${outputBaseName()}.cad`, 'text/plain;charset=utf-8');
      status.textContent = `Экспортировано ${outputBaseName()}.cad; обратный импорт пройден.`;
    } catch (error) {
      status.textContent = `Не удалось экспортировать .cad: ${error instanceof Error ? error.message : String(error)}`;
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
    copy.querySelectorAll('.schematic-element').forEach((element) => {
      element.setAttribute('color', '#263342');
      element.classList.remove('is-selected-element');
    });
    copy.querySelectorAll('.is-selected-wire, .is-selected-junction').forEach((wire) => wire.classList.remove('is-selected-wire', 'is-selected-junction'));
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = ctx.schema.sheet.fileName || outputBaseName();
    copy.prepend(title);
    const relevantRules: string[] = [];
    for (const sheetStyle of [...document.styleSheets]) {
      try {
        for (const rule of [...sheetStyle.cssRules]) {
          const selectorText = 'selectorText' in rule ? String(rule.selectorText) : '';
          if (/(schematic-element|\.contact|\.blade-|is-sim|lamp-glass)/.test(selectorText)) relevantRules.push(rule.cssText);
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
        if (!context) throw new Error('Не удалось создать изображение.');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(svgUrl);
          if (!blob) { status.textContent = 'Не удалось создать PNG.'; return; }
          const pngUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = pngUrl; link.download = `${outputBaseName()}.png`; link.click();
          setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
          status.textContent = `Схема экспортирована в ${outputBaseName()}.png.`;
        }, 'image/png');
      } catch (error) {
        URL.revokeObjectURL(svgUrl);
        status.textContent = `Не удалось экспортировать PNG: ${error instanceof Error ? error.message : String(error)}`;
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      status.textContent = 'Не удалось подготовить схему для экспорта в PNG.';
    };
    image.src = svgUrl;
  };
  const printPdf = (): void => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      status.textContent = 'Разрешите всплывающее окно, чтобы открыть печать и сохранить PDF.';
      return;
    }
    const width = ctx.schema.sheet.width;
    const height = fullSheet(ctx.schema.sheet).height;
    const printWidth = `${Math.round(width * 100) / 100}mm`;
    const printHeight = `${Math.round(height * 100) / 100}mm`;
    const printSvg = createSheetExportSvg();
    printSvg.querySelector('#sheet-grid')?.remove();
    const svgMarkup = new XMLSerializer().serializeToString(printSvg);
    const title = outputBaseName();
    // Chrome не делает кликабельными SVG-ссылки при печати в PDF, поэтому поверх ячейки штампа кладём HTML-ссылку (размеры в мм, как во viewBox).
    const stamp = stampMetrics(ctx.schema.sheet.width, ctx.schema.sheet.height);
    const mm = (value: number): string => `${Math.round(value * 100) / 100}mm`;
    const linkBox = `left: ${mm(stamp.margin)}; top: ${mm(ctx.schema.sheet.height + stamp.gap)}; width: ${mm(0.075 * stamp.stampWidth)}; height: ${mm(stamp.rowH)};`;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>
      @page { size: ${printWidth} ${printHeight}; margin: 0; }
      html, body { margin: 0; padding: 0; }
      @media print { html, body { width: ${printWidth}; height: ${printHeight}; overflow: hidden; } }
      .page { position: relative; width: ${printWidth}; height: ${printHeight}; overflow: hidden; break-inside: avoid; page-break-inside: avoid; }
      .page > svg { position: absolute; inset: 0; display: block; width: 100%; height: 100%; color: #263342; }
      .pdf-link { position: absolute; display: block; ${linkBox} overflow: hidden; color: transparent; font-size: 1mm; line-height: ${mm(stamp.rowH)}; text-decoration: none; z-index: 2; }
      @media screen { body { background: #e8edf3; padding: 16px; } .page { background: #fff; box-shadow: 0 2px 12px #18243333; margin: 0 auto; } }
    </style></head><body><div class="page">${svgMarkup}<a class="pdf-link" href="${CADESIM_URL}" target="_blank" rel="noopener noreferrer">${CADESIM_LINK_TEXT}</a></div></body></html>`);
    printWindow.document.close();
    printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 350);
  };
  return { saveJson, exportCadFile, exportSvgFile, exportPngFile, printPdf };
}
