import { currentText, fillText } from './i18n';

/** Перетаскиванием открываем то же, что и «Archivo › Abrir»: схемы .cad и .json. */
export function isOpenableFileName(name: string): boolean {
  return /\.(cad|json)$/i.test(name);
}

/** Разделить брошенные файлы на те, что умеем открыть, и остальные (для сообщения в строке состояния). */
export function splitDroppedFiles<T extends { name: string }>(files: readonly T[]): { open: T[]; skipped: T[] } {
  const open: T[] = []; const skipped: T[] = [];
  for (const file of files) (isOpenableFileName(file.name) ? open : skipped).push(file);
  return { open, skipped };
}

/** Тащат файлы из проводника, а не элемент палитры (у неё в dataTransfer только text/plain). */
function isFileDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

/**
 * Файлы .cad/.json, брошенные на окно, открываются как через «Abrir»: каждый в своей вкладке
 * (вкладку создаёт openDocumentText → beforeOpenDocument). Пока файл над окном, видна подсказка.
 */
export function setupFileDrop(
  root: HTMLElement,
  status: HTMLElement,
  openDocumentText: (text: string, name: string) => void,
): void {
  const overlay = document.createElement('div');
  overlay.className = 'file-drop-overlay';
  overlay.hidden = true;
  const hint = document.createElement('div');
  hint.className = 'file-drop-hint';
  overlay.append(hint);
  root.append(overlay);
  // dragenter/dragleave приходят на каждый дочерний элемент: считаем вход и выход, чтобы подсказка не мигала.
  let depth = 0;
  const hide = (): void => { depth = 0; overlay.hidden = true; };
  window.addEventListener('dragenter', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    depth += 1;
    hint.textContent = currentText().dropFilesHint;
    overlay.hidden = false;
  });
  window.addEventListener('dragover', (event) => {
    if (!isFileDrag(event)) return;
    // Без preventDefault браузер сам откроет файл вместо программы.
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('dragleave', (event) => {
    if (!isFileDrag(event)) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) overlay.hidden = true;
  });
  window.addEventListener('drop', (event) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    hide();
    void openDroppedFiles(Array.from(event.dataTransfer?.files ?? []), status, openDocumentText);
  });
}

async function openDroppedFiles(
  files: File[],
  status: HTMLElement,
  openDocumentText: (text: string, name: string) => void,
): Promise<void> {
  const { open, skipped } = splitDroppedFiles(files);
  // По очереди: каждый файл — своя вкладка, порядок вкладок как у брошенных файлов.
  for (const file of open) openDocumentText(await file.text(), file.name);
  if (!skipped.length) return;
  const message = fillText(currentText().dropUnsupported, { name: skipped.map((file) => file.name).join(', ') });
  status.textContent = open.length ? `${status.textContent ?? ''} · ${message}` : message;
}
