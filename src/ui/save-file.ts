/**
 * Сохранение текстового файла с выбором имени и папки (общий путь для .json и .cad).
 * Chrome/Edge: системный диалог «Сохранить как» (File System Access API, showSaveFilePicker).
 * Остальные браузеры (Firefox, Safari): запрос имени файла и обычное скачивание — папку там
 * выбирает сам браузер (или он спрашивает её, если так настроено).
 */
import { currentText } from './i18n';

export interface SaveTextFileOptions {
  /** Имя без расширения, которое предлагается в диалоге. */
  baseName: string;
  /** Расширение с точкой: '.json', '.cad'. */
  extension: string;
  /** Подпись типа файла в диалоге, например 'CADe_SIMU (*.cad)'. */
  description: string;
  /** MIME для диалога (без charset). */
  mime: string;
}

type SaveFileHandle = { name: string; createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }> };
type SavePicker = (options: { suggestedName: string; types: Array<{ description: string; accept: Record<string, string[]> }> }) => Promise<SaveFileHandle>;

const UNSAFE_FILE_CHARS = /[\\/:*?"<>|\x00-\x1f]/g;

export function downloadText(text: string, name: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Имя файла, введённое пользователем, без запрещённых символов и с нужным расширением. */
export function safeFileName(requested: string, fallbackBase: string, extension: string): string {
  const ext = extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const base = requested.trim().replace(UNSAFE_FILE_CHARS, '_').replace(new RegExp(`${ext}$`, 'i'), '').trim();
  return `${base || fallbackBase}${extension}`;
}

/**
 * Возвращает имя записанного файла или null, если пользователь отменил сохранение.
 * Прочие ошибки записи пробрасываются вызывающему.
 */
export async function saveTextFile(contents: string, options: SaveTextFileOptions): Promise<string | null> {
  const suggestedName = `${options.baseName}${options.extension}`;
  const picker = (window as Window & { showSaveFilePicker?: SavePicker }).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName,
        types: [{ description: options.description, accept: { [options.mime]: [options.extension] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(contents);
      await writable.close();
      return handle.name;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      throw error;
    }
  }
  const requestedName = window.prompt(currentText().exportFileNamePrompt, suggestedName);
  if (requestedName === null) return null;
  const savedName = safeFileName(requestedName, options.baseName, options.extension);
  downloadText(contents, savedName, `${options.mime};charset=utf-8`);
  return savedName;
}
