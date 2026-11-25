/**
 * Окно «Примеры»: все папки сразу, одна под другой, без переходов между папками — клик по схеме открывает её.
 * Отдельный кусок сборки (подключается из document-io.ts при первом открытии окна): список примеров
 * и переводы их названий не входят в стартовую загрузку, а текст .cad скачивается только по клику.
 */
import { AUTHOR_FOLDER, EXAMPLES, EXAMPLE_FOLDERS } from '../data/examples';
import { EXAMPLE_FOLDER_TRANSLATIONS, exampleTitle } from '../data/example-titles';
import type { ExampleLang } from '../data/example-titles';
import { currentText, fillText, interfaceText } from './i18n';
import { errorReason } from './helpers';

const escape = (value: string): string => value.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fileIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h8l4 4v15H6z"/>'
  + '<path d="M14 2.5v4h4M9 12h6M9 15h6M9 18h4"/></svg>';

/** Подключает клики по списку и возвращает функцию перерисовки списка на текущем языке. */
export function setupExamplesWindow(
  root: HTMLElement, stopSimulation: () => void, openDocumentText: (text: string, name: string) => void,
): () => void {
  const renderExamples = (): void => {
    const groups = root.querySelector<HTMLElement>('.example-groups');
    const count = root.querySelector<HTMLElement>('#examples-count');
    if (!groups || !count) return;
    const text = interfaceText(root.lang);
    groups.innerHTML = EXAMPLE_FOLDERS.map((folder) => {
      const items = EXAMPLES.filter((example) => example.folder === folder);
      if (!items.length) return '';
      const title = folder === AUTHOR_FOLDER ? text.examplesAuthor
        : EXAMPLE_FOLDER_TRANSLATIONS[folder]?.[root.lang as ExampleLang] ?? folder;
      const author = folder === AUTHOR_FOLDER ? ' data-examples-author' : '';
      const name = (example: (typeof items)[number]): string =>
        escape(exampleTitle(example.file, root.lang, example.title.replace(/\.cad$/i, '')));
      return `<section class="example-group"><h3 class="example-group-title"${author}>${escape(title)}</h3>`
        + `<div class="example-group-items">${items.map((example) => `<button type="button" class="example-file" `
        + `data-example="${example.number}" title="${escape(example.fileName)}">${fileIcon}`
        + `<span class="example-file-name">${name(example)}</span></button>`).join('')}</div></section>`;
    }).join('');
    count.dataset.visibleCount = String(EXAMPLES.length);
    const total = new Intl.NumberFormat(root.lang || 'ru').format(EXAMPLES.length);
    count.textContent = text.examplesCount.replace('{count}', total);
  };
  root.querySelector<HTMLElement>('.example-groups')?.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-example]');
    if (!button) return;
    const example = EXAMPLES.find((candidate) => candidate.number === Number(button.dataset.example));
    if (!example) return;
    root.querySelector<HTMLDialogElement>('#examples-dialog')?.close();
    stopSimulation();
    // Текст примера скачивается только сейчас (отдельный кусок сборки).
    const status = root.querySelector<HTMLElement>('#status');
    if (status) status.textContent = fillText(currentText().loadingFile, { name: example.fileName });
    example.load().then(
      (text) => openDocumentText(text, example.fileName),
      (error: unknown) => {
        if (status) status.textContent = fillText(currentText().openFailed, { reason: errorReason(error) });
      },
    );
  });
  return renderExamples;
}
