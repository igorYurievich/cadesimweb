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
  /** Имя файла .cad в папке примеров: ключ переводов названия (example-titles.ts). */
  file: string;
  /** Папка в окне примеров; пустая строка означает корень. */
  folder: string;
  text: string;
}

/**
 * Понятные названия примеров в окне «Примеры» (файлы .cad не переименовываются — на них ссылаются тесты).
 * Пример, которого нет в этом списке, в окне не показывается (Ejemplo 8, 2.1, 2.2, 2.5).
 */
const EXAMPLE_TITLES: Readonly<Record<string, string>> = {
  'Ejemplo 1.cad': 'Marcha-paro con final de carrera',
  'Ejemplo 2.cad': 'Marcha-paro con seta de emergencia',
  'Ejemplo 3.cad': 'Marcha-paro de dos motores',
  'Ejemplo 4.cad': 'Dos motores con enclavamiento eléctrico',
  'Ejemplo 5.cad': 'Dos motores: paro general por relé térmico',
  'Ejemplo 6.cad': 'Tres motores: paro general por relé térmico',
  'Ejemplo 7.cad': 'Arranque estrella-triángulo temporizado',
  'Ejemplo 9.cad': 'Arranque FIFO',
  'Ejemplo 10.cad': 'Semáforo',
  'Ejemplo 2.3.cad': 'Arranque por autotransformador',
  'Ejemplo 2.4.cad': 'Columpio: dos motores alternos',
  'Ejemplo 2.6.cad': 'Giro en dos direcciones',
  'Ejemplo 2.7.cad': 'Inversor de giro con temporizador a la desconexión',
  'Ejemplo 2.8.cad': 'Motor de dos velocidades (dos devanados)',
  'Ejemplo 2.9.cad': 'Variador de frecuencia: giro y velocidades por relés',
  'Ejemplo 2.10.cad': 'Variador de frecuencia 2D: panel y bornes de control',
  'Ejemplo 2.11.cad': 'Variador de frecuencia monofásico 2D (entrada 230 V)',
};

/** Пример из каталога: показывается под своим названием, а без названия — скрыт. */
function catalogExample(number: number, file: string, folder: string): ExampleScheme | null {
  const text = files[`./examples/${folder}/${file}`];
  const title = EXAMPLE_TITLES[file];
  if (text === undefined || title === undefined) return null;
  return { number, code: 'CAD', title, fileName: `${title}.cad`, file, folder, text };
}

const CATALOG: ReadonlyArray<string> = Array.from({ length: 10 }, (_, index) => `Ejemplo ${index + 1}.cad`);

const rootExamples: ExampleScheme[] = CATALOG
  .map((fileName, index) => catalogExample(index + 1, fileName, 'Ejemplos'))
  .filter((example): example is ExampleScheme => example !== null);

const secondFolderExamples: ExampleScheme[] = Array.from({ length: 11 }, (_, index) => catalogExample(21 + index, `Ejemplo 2.${index + 1}.cad`, 'Ejemplos 2'))
  .filter((example): example is ExampleScheme => example !== null);

/** Папка с примерами автора веб-версии: все .cad из неё, по алфавиту. В окне она идёт первой. */
export const AUTHOR_FOLDER = 'Ejemplos del autor';

const authorExamples: ExampleScheme[] = Object.keys(files)
  .filter((key) => key.startsWith(`./examples/${AUTHOR_FOLDER}/`))
  .sort((a, b) => a.localeCompare(b, 'es'))
  .map((key, index) => {
    const fileName = key.slice(key.lastIndexOf('/') + 1);
    // «Iluminacion_escalera_3_hilos_(clasico).cad» → «Iluminacion escalera 3 hilos (clasico)».
    const title = fileName.replace(/\.cad$/i, '').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    const text = files[key]!;
    return { number: 101 + index, code: 'CAD', title, fileName, file: fileName, folder: AUTHOR_FOLDER, text };
  });

/** Папки окна «Примеры» в порядке показа. */
export const EXAMPLE_FOLDERS: readonly string[] = [AUTHOR_FOLDER, 'Ejemplos', 'Ejemplos 2'];

export const EXAMPLES: ExampleScheme[] = [...authorExamples, ...rootExamples, ...secondFolderExamples];
