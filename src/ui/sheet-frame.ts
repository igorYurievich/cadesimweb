import type { AppContext } from './context';
import { STAMP_CELLS, STAMP_LINK_TEXT, SVG_NS } from './constants';
import { stampMetrics, stampValue } from './helpers';
import { measureStampText } from './stamp-measure';
import { fitStampLine, layoutStampText, STAMP_LINE_HEIGHT } from './stamp-text';

export function setupSheetFrame(ctx: AppContext, sheetFrame: SVGGElement, sheetStamp: SVGGElement): () => void {
  return () => {
    const { width, height } = ctx.schema.sheet;
    sheetFrame.replaceChildren(); sheetStamp.replaceChildren();
    const margin = Math.min(5, width * 0.03, height * 0.03);
    const border = document.createElementNS(SVG_NS, 'rect');
    border.setAttribute('x', String(margin)); border.setAttribute('y', String(margin));
    border.setAttribute('width', String(Math.max(0, width - margin * 2))); border.setAttribute('height', String(Math.max(0, height - margin * 2)));
    border.setAttribute('fill', 'none'); border.setAttribute('stroke', '#536273'); border.setAttribute('stroke-width', '0.45');
    border.setAttribute('vector-effect', 'non-scaling-stroke'); sheetFrame.append(border);
    const metrics = stampMetrics(width, height); const { stampWidth, stampHeight, rowH } = metrics;
    const x = metrics.margin; const y = height + metrics.gap;
    const divider = document.createElementNS(SVG_NS, 'line');
    divider.setAttribute('x1', '0'); divider.setAttribute('y1', String(height)); divider.setAttribute('x2', String(width)); divider.setAttribute('y2', String(height));
    divider.setAttribute('stroke', '#aeb8c4'); divider.setAttribute('stroke-width', '0.6'); divider.setAttribute('vector-effect', 'non-scaling-stroke'); sheetFrame.append(divider);
    const labelSize = rowH * 0.3; const valueSize = rowH * 0.42;
    const add = (name: string, attrs: Record<string, string>): SVGElement => {
      const node = document.createElementNS(SVG_NS, name);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      sheetStamp.append(node); return node;
    };
    add('rect', { x: String(x), y: String(y), width: String(stampWidth), height: String(stampHeight), fill: '#fff' });
    for (const cell of STAMP_CELLS) {
      const cx = x + cell.x0 * stampWidth; const cw = (cell.x1 - cell.x0) * stampWidth;
      const cy = y + cell.r0 * rowH; const ch = (cell.r1 - cell.r0) * rowH;
      add('rect', { x: String(cx), y: String(cy), width: String(cw), height: String(ch), fill: 'none', stroke: '#8793a1', 'stroke-width': '0.35', 'vector-effect': 'non-scaling-stroke' });
      const textAttrs = { 'font-family': 'Arial, sans-serif', fill: '#263442' };
      if (cell.label) {
        const centered = !cell.key && cell.r1 - cell.r0 === 1;
        const label = add('text', { ...textAttrs, x: String(centered ? cx + cw / 2 : cx + 1), y: String(centered ? cy + ch / 2 + labelSize * 0.35 : cy + labelSize + 0.5), 'font-size': String(labelSize), fill: '#5b6878', ...(centered ? { 'text-anchor': 'middle' } : {}) });
        label.textContent = fitStampLine(cell.label, cw - 1, labelSize);
      }
      if (cell.key) {
        const value = stampValue(ctx.schema.sheet, cell.key); const multi = cell.r1 - cell.r0 > 1;
        if (multi) {
          const top = cell.label ? cy + labelSize + 1 : cy;
          addWrappedStampText(sheetStamp, value, { x: cx, y: cy, width: cw, height: ch, top }, valueSize);
        } else {
          const valueY = cell.label ? cy + ch - 1 : cy + ch / 2 + valueSize * 0.35;
          const text = add('text', { ...textAttrs, x: String(cx + 1.2), y: String(valueY),
            'font-size': String(valueSize), 'pointer-events': 'none' });
          text.textContent = fitStampLine(value, cw - 2.4, valueSize);
        }
        add('rect', { x: String(cx), y: String(cy), width: String(cw), height: String(ch), fill: 'transparent', class: 'stamp-cell', 'data-stamp-field': cell.key });
      }
    }
    const cw = 0.075 * stampWidth;
    add('rect', { x: String(x), y: String(y), width: String(cw), height: String(rowH), fill: 'none', stroke: '#8793a1', 'stroke-width': '0.35', 'vector-effect': 'non-scaling-stroke' });
    // Ячейка с названием программы — обычный текст, без ссылки на GitHub.
    const nameSize = Math.min(labelSize * 1.15, (cw - 1) / (STAMP_LINK_TEXT.length * 0.58));
    const name = add('text', { x: String(x + cw / 2), y: String(y + rowH / 2 + nameSize * 0.35),
      'font-family': 'Arial, sans-serif', 'font-size': String(nameSize), 'font-weight': '700', fill: '#263342',
      'text-anchor': 'middle', 'pointer-events': 'none' });
    name.textContent = STAMP_LINK_TEXT;
    add('rect', { x: String(x), y: String(y), width: String(stampWidth), height: String(stampHeight), fill: 'none', stroke: '#536273', 'stroke-width': '0.6', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' });
  };
}

interface StampBox { x: number; y: number; width: number; height: number; top: number }

// Многострочные ячейки (Título, Entidad, Archivo): перенос по словам, при нехватке места — мельче шрифт.
// Штамп рисуется в живом SVG, а печать, PDF, SVG и PNG копируют его, поэтому вид везде одинаковый.
function addWrappedStampText(parent: SVGGElement, value: string, box: StampBox, valueSize: number): void {
  const height = box.y + box.height - box.top - 0.6;
  const layout = layoutStampText(value, box.width - 2.4, height, valueSize, measureStampText);
  const lineH = layout.size * STAMP_LINE_HEIGHT;
  // Одна строка обычного размера остаётся там же, где была раньше.
  const single = layout.lines.length === 1 && layout.size === valueSize;
  const blockTop = box.top + (box.y + box.height - box.top - lineH * layout.lines.length) / 2;
  const firstY = single ? box.y + box.height / 2 + valueSize * 0.9 : blockTop + layout.size * 0.85;
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('font-family', 'Arial, sans-serif'); text.setAttribute('fill', '#263442');
  text.setAttribute('font-size', String(layout.size)); text.setAttribute('pointer-events', 'none');
  layout.lines.forEach((line, index) => {
    const span = document.createElementNS(SVG_NS, 'tspan');
    span.setAttribute('x', String(box.x + 1.2)); span.setAttribute('y', String(firstY + index * lineH));
    span.textContent = line; text.append(span);
  });
  parent.append(text);
}
