import { estimateTextWidth, type MeasureText } from './stamp-text';

const SAMPLE_PX = 100;
let context: CanvasRenderingContext2D | null | undefined;

/**
 * Меряет текст штампа настоящим шрифтом через canvas, чтобы строки заполняли ячейку.
 * Где canvas недоступен (тесты в jsdom), берёт грубую оценку.
 */
export const measureStampText: MeasureText = (text, size) => {
  if (context === undefined) {
    try { context = document.createElement('canvas').getContext('2d'); } catch { context = null; }
    if (context) context.font = `${SAMPLE_PX}px Arial, sans-serif`;
  }
  if (!context) return estimateTextWidth(text, size);
  // Небольшой запас на разницу шрифтов при печати и в PDF.
  return (context.measureText(text).width / SAMPLE_PX) * size * 1.04;
};
