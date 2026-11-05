/** Встроенные примеры схем (меню «Примеры»). Файлы .cad лежат рядом и подключаются как сырой текст. */

const files = import.meta.glob('./examples/*.cad', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export interface ExampleScheme {
  /** Номер примера в меню. */
  number: number;
  /** Код работы из имени файла (например, 1.1.1). */
  code: string;
  /** Что делает схема. */
  title: string;
  /** Имя файла для строки состояния и штампа. */
  fileName: string;
  text: string;
}

const CATALOG: ReadonlyArray<{ code: string; title: string }> = [
  { code: '1.1.1', title: 'Пуск и стоп двигателя с самоблокировкой и лампой' },
  { code: '1.1.2', title: 'Пуск двигателя с самоблокировкой и концевым выключателем FC' },
  { code: '1.2.1', title: 'Два двигателя: раздельный пуск, концевые выключатели FC1 и FC2' },
  { code: '1.2.2', title: 'Два двигателя с взаимной блокировкой KM1/KM2' },
  { code: '1.3', title: 'Два двигателя: общий стоп, сигнальные лампы и тепловая защита' },
  { code: '1.4', title: 'Три двигателя: последовательный пуск' },
  { code: '1.5', title: 'Три двигателя: пуск с задержкой по таймерам (5 с и 10 с)' },
  { code: '1.6', title: 'Реверс двигателя KM1/KM2 с таймером 10 с и лампами' },
  { code: '1.8', title: 'Пуск двигателя «звезда–треугольник» (KM1, KM2, KM3)' },
];

export const EXAMPLES: ExampleScheme[] = CATALOG.flatMap(({ code, title }, index) => {
  const fileName = `Actividad_${code.replace(/\./g, '_')}.cad`;
  const text = files[`./examples/${fileName}`];
  return text === undefined ? [] : [{ number: index + 1, code, title, fileName, text }];
});
