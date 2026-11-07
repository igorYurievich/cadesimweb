import type { AppContext } from './context';
import { CADESIM_LINK_TEXT, CADESIM_URL, STAMP_CELLS, SVG_NS } from './constants';
import { stampMetrics, stampValue } from './helpers';

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
    const fit = (value: string, maxWidth: number, size: number): string => {
      const maxChars = Math.max(1, Math.floor(maxWidth / (size * 0.56)));
      return value.length > maxChars ? `${value.slice(0, Math.max(1, maxChars - 1))}…` : value;
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
        label.textContent = fit(cell.label, cw - 1, labelSize);
      }
      if (cell.key) {
        const value = stampValue(ctx.schema.sheet, cell.key); const multi = cell.r1 - cell.r0 > 1;
        const text = add('text', { ...textAttrs, x: String(cx + 1.2), y: String(multi ? cy + ch / 2 + valueSize * 0.9 : cell.label ? cy + ch - 1 : cy + ch / 2 + valueSize * 0.35), 'font-size': String(valueSize), 'pointer-events': 'none' });
        text.textContent = fit(value, cw - 2.4, valueSize);
        add('rect', { x: String(cx), y: String(cy), width: String(cw), height: String(ch), fill: 'transparent', class: 'stamp-cell', 'data-stamp-field': cell.key });
      }
    }
    const cw = 0.075 * stampWidth;
    add('rect', { x: String(x), y: String(y), width: String(cw), height: String(rowH), fill: 'none', stroke: '#8793a1', 'stroke-width': '0.35', 'vector-effect': 'non-scaling-stroke' });
    const linkSize = Math.min(labelSize * 1.15, (cw - 1) / (CADESIM_LINK_TEXT.length * 0.58));
    const link = add('a', { href: CADESIM_URL, target: '_blank', rel: 'noopener noreferrer', class: 'stamp-link' });
    link.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', CADESIM_URL);
    const hit = document.createElementNS(SVG_NS, 'rect');
    for (const [k, v] of Object.entries({ x: String(x), y: String(y), width: String(cw), height: String(rowH), fill: 'transparent' })) hit.setAttribute(k, v);
    const label = document.createElementNS(SVG_NS, 'text');
    for (const [k, v] of Object.entries({ x: String(x + cw / 2), y: String(y + rowH / 2 + linkSize * 0.35), 'font-family': 'Arial, sans-serif', 'font-size': String(linkSize), fill: '#1f5fbf', 'text-anchor': 'middle', 'text-decoration': 'underline' })) label.setAttribute(k, v);
    label.textContent = CADESIM_LINK_TEXT;
    const tip = document.createElementNS(SVG_NS, 'title'); tip.textContent = CADESIM_URL; link.append(hit, label, tip);
    add('rect', { x: String(x), y: String(y), width: String(stampWidth), height: String(stampHeight), fill: 'none', stroke: '#536273', 'stroke-width': '0.6', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' });
  };
}
