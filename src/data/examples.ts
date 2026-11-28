/**
 * Встроенные примеры схем (окно «Примеры»). Вложенные .cad и .json подключаются как сырой текст,
 * но лениво: каждый файл — отдельный кусок сборки, он скачивается только при открытии примера.
 * В стартовую загрузку попадает лишь список имён файлов.
 */

// Папка «Ejemplos» в окне больше не показывается: её оставшиеся .cad нужны только тестам, в сборку не идут.
const files = import.meta.glob(
  [
    './examples/**/*.cad', './examples/Motores/*.json', './examples/Ejemplos del autor/*.json',
    '!./examples/Ejemplos/**',
  ],
  { query: '?raw', import: 'default' },
) as Record<string, () => Promise<string>>;

export interface ExampleScheme {
  /** Номер примера в списке проводника. */
  number: number;
  /** Тип файла, показывается во втором столбце проводника. */
  code: string;
  /** Имя файла, показываемое в списке. */
  title: string;
  /** Имя файла для строки состояния и штампа. */
  fileName: string;
  /** Имя файла (.cad или .json) в папке примеров: ключ переводов названия (example-titles.ts). */
  file: string;
  /** Папка в окне примеров; пустая строка означает корень. */
  folder: string;
  /** Текст файла: скачивается при первом вызове (в офлайне — из кэша service worker). */
  load(): Promise<string>;
}

/**
 * Понятные названия примеров в окне «Примеры» (файлы не переименовываются — на них ссылаются тесты).
 * Пример, которого нет в этом списке, в окне не показывается (Ejemplo 2.1, 2.2, 2.5).
 */
const EXAMPLE_TITLES: Readonly<Record<string, string>> = {
  '01_Marcha_paro.json': 'Marcha-paro de un motor',
  '02_Arranque_dos_motores.json': 'Arranque de dos motores',
  '03_Dos_motores_enclavamiento.json': 'Dos motores con enclavamiento',
  '04_Disparo_rele_termico_comun.json': 'Dos motores: disparo común por relé térmico',
  '05_Arranque_secuencial.json': 'Arranque secuencial',
  '06_Arranque_secuencial_temporizado.json': 'Arranque secuencial temporizado',
  '07_Arranque_E_T.json': 'Arranque estrella-triángulo',
  '08_Inversor_de_giro_temporizado.json': 'Inversor de giro temporizado',
  '09_Inversor_de_giro_temporizado_2D.json': 'Inversor de giro temporizado 2D',
  '10_Arranque_E_T_2D.json': 'Arranque estrella-triángulo 2D',
  'Ejemplo 2.3.cad': 'Arranque por autotransformador',
  'Ejemplo 2.4.cad': 'Columpio: dos motores alternos',
  'Ejemplo 2.7.cad': 'Inversor de giro con temporizador a la desconexión',
  'Ejemplo 2.8.cad': 'Motor de dos velocidades (dos devanados)',
  'Ejemplo 2.9.cad': 'Variador de frecuencia: giro y velocidades por relés',
  'Ejemplo 2.10.cad': 'Variador de frecuencia 2D: panel y bornes de control',
  'Ejemplo 2.11.cad': 'Variador de frecuencia monofásico 2D (entrada 230 V)',
};

/** Пример из каталога: показывается под своим названием, а без названия — скрыт. */
function catalogExample(number: number, file: string, folder: string): ExampleScheme | null {
  const load = files[`./examples/${folder}/${file}`];
  const title = EXAMPLE_TITLES[file];
  if (load === undefined || title === undefined) return null;
  // Расширение сохраняется: по нему document-io.ts решает, читать файл как .cad или как JSON.
  const extension = file.slice(file.lastIndexOf('.'));
  const code = extension.slice(1).toUpperCase();
  return { number, code, title, fileName: `${title}${extension}`, file, folder, load };
}

/** Папка «Motores»: сначала JSON по порядку номеров в имени (01_…, 02_…), затем .cad из бывших «Ejemplos 2». */
export const MOTORS_FOLDER = 'Motores';

const motorExamples: ExampleScheme[] = Object.keys(files)
  .filter((key) => key.startsWith(`./examples/${MOTORS_FOLDER}/`))
  .sort()
  .map((key, index) => catalogExample(1 + index, key.slice(key.lastIndexOf('/') + 1), MOTORS_FOLDER))
  .filter((example): example is ExampleScheme => example !== null);

const secondFolderExamples: ExampleScheme[] = Array.from({ length: 11 }, (_, index) => catalogExample(21 + index, `Ejemplo 2.${index + 1}.cad`, 'Ejemplos 2'))
  .filter((example): example is ExampleScheme => example !== null);

/** Папка с примерами автора веб-версии (в окне — «Misceláneo»): все .cad и .json из неё, по алфавиту. Идёт первой. */
export const AUTHOR_FOLDER = 'Ejemplos del autor';

const authorExamples: ExampleScheme[] = Object.keys(files)
  .filter((key) => key.startsWith(`./examples/${AUTHOR_FOLDER}/`))
  .sort((a, b) => a.localeCompare(b, 'es'))
  .map((key, index) => {
    const fileName = key.slice(key.lastIndexOf('/') + 1);
    const extension = fileName.slice(fileName.lastIndexOf('.'));
    // «Iluminacion_escalera_3_hilos_(clasico).cad» → «Iluminacion escalera 3 hilos (clasico)».
    const title = fileName.slice(0, -extension.length).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    const load = files[key]!;
    const code = extension.slice(1).toUpperCase();
    return { number: 101 + index, code, title, fileName, file: fileName, folder: AUTHOR_FOLDER, load };
  });

/** Папки окна «Примеры» в порядке показа. */
export const EXAMPLE_FOLDERS: readonly string[] = [AUTHOR_FOLDER, MOTORS_FOLDER, 'Ejemplos 2'];

export const EXAMPLES: ExampleScheme[] = [...authorExamples, ...motorExamples, ...secondFolderExamples];
