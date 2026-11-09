/** Встроенные примеры схем (окно «Примеры»). Вложенные .cad подключаются как сырой текст. */

const files = import.meta.glob('./examples/**/*.cad', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export interface ExampleScheme {
  /** Номер примера в списке проводника. */
  number: number;
  /** Тип файла, показывается во втором столбце проводника. */
  code: string;
  /** Имя файла, показываемое в списке. */
  title: string;
  /** Имя файла для строки состояния и штампа. */
  fileName: string;
  /** Папка в окне примеров; пустая строка означает корень. */
  folder: string;
  text: string;
}

const CATALOG: ReadonlyArray<string> = Array.from({ length: 10 }, (_, index) => `Ejemplo ${index + 1}.cad`);

const rootExamples: ExampleScheme[] = CATALOG.flatMap((fileName, index) => {
  const text = files[`./examples/Ejemplos/${fileName}`];
  return text === undefined ? [] : [{ number: index + 1, code: 'CAD', title: fileName, fileName, folder: 'Ejemplos', text }];
});

const secondFolderExamples: ExampleScheme[] = Array.from({ length: 7 }, (_, index) => {
  const fileName = `Ejemplo 2.${index + 1}.cad`;
  const key = `./examples/Ejemplos 2/${fileName}`;
  const text = files[key];
  return text === undefined ? null : { number: 21 + index, code: 'CAD', title: fileName, fileName, folder: 'Ejemplos 2', text };
}).filter((example): example is ExampleScheme => example !== null);

export const EXAMPLES: ExampleScheme[] = [...rootExamples, ...secondFolderExamples];
