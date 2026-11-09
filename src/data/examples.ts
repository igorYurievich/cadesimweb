/** Встроенные примеры схем (окно «Примеры»). Файлы .cad лежат рядом и подключаются как сырой текст. */

const files = import.meta.glob('./examples/*.cad', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export interface ExampleScheme {
  /** Номер примера в списке проводника. */
  number: number;
  /** Тип файла, показывается во втором столбце проводника. */
  code: string;
  /** Имя файла, показываемое в списке. */
  title: string;
  /** Имя файла для строки состояния и штампа. */
  fileName: string;
  text: string;
}

const CATALOG: ReadonlyArray<string> = Array.from({ length: 10 }, (_, index) => `Ejemplo ${index + 1}.cad`);

export const EXAMPLES: ExampleScheme[] = CATALOG.flatMap((fileName, index) => {
  const text = files[`./examples/${fileName}`];
  return text === undefined ? [] : [{ number: index + 1, code: 'CAD', title: fileName, fileName, text }];
});
