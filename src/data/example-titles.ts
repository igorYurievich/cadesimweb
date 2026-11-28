// ── Названия примеров на языках интерфейса (окно «Примеры», document-io.ts) ─────────────────────────
// Ключ — имя файла примера (.cad или .json). Испанский — как в EXAMPLE_TITLES (examples.ts)
// и в именах файлов автора.
// Нет перевода — показывается испанское название (новый файл автора — по имени файла).

export type ExampleLang = 'es' | 'en' | 'it' | 'ru' | 'fr';
type Titles = Readonly<Record<ExampleLang, string>>;

const t = (es: string, en: string, it: string, ru: string, fr: string): Titles =>
  ({ es, en, it, ru, fr });

export const EXAMPLE_TITLE_TRANSLATIONS: Readonly<Record<string, Titles>> = {
  // Примеры автора.
  'Dos_modos_de_giro_programados_mediante_PLC.cad': t('Dos modos de giro programados mediante PLC',
    'Two rotation modes programmed with a PLC', 'Due modalità di rotazione programmate con PLC',
    'Два режима вращения, запрограммированные на ПЛК', 'Deux modes de rotation programmés par automate'),
  'GRAFCET_secuencia_de_pilotos.cad': t('GRAFCET: secuencia de pilotos', 'GRAFCET: pilot lamp sequence',
    'GRAFCET: sequenza di spie', 'GRAFCET: последовательность сигнальных ламп', 'GRAFCET : séquence de voyants'),
  'Iluminacion_escalera_3_hilos_(clasico).cad': t('Iluminación de escalera a 3 hilos (clásico)',
    'Staircase lighting, 3-wire (classic)', 'Illuminazione scale a 3 fili (classico)',
    'Освещение лестницы, 3 провода (классика)', 'Éclairage d’escalier à 3 fils (classique)'),
  'Iluminacion_escalera_4_hilos_(moderno).json': t('Iluminación de escalera a 4 hilos (moderno)',
    'Staircase lighting, 4-wire (modern)', 'Illuminazione scale a 4 fili (moderno)',
    'Освещение лестницы, 4 провода (современная)', 'Éclairage d’escalier à 4 fils (moderne)'),
  // Motores.
  '01_Marcha_paro.json': t('Marcha-paro de un motor', 'Start-stop of one motor', 'Marcia-arresto di un motore',
    'Пуск — стоп одного двигателя', 'Marche-arrêt d’un moteur'),
  '02_Arranque_dos_motores.json': t('Arranque de dos motores', 'Starting two motors', 'Avviamento di due motori',
    'Пуск двух двигателей', 'Démarrage de deux moteurs'),
  '03_Dos_motores_enclavamiento.json': t('Dos motores con enclavamiento', 'Two motors with interlock',
    'Due motori con interblocco', 'Два двигателя с блокировкой', 'Deux moteurs avec verrouillage'),
  '04_Disparo_rele_termico_comun.json': t('Dos motores: disparo común por relé térmico',
    'Two motors: common thermal relay trip', 'Due motori: intervento comune del relè termico',
    'Два двигателя: общее отключение от тепловых реле',
    'Deux moteurs : déclenchement commun par relais thermique'),
  '05_Arranque_secuencial.json': t('Arranque secuencial', 'Sequential start', 'Avviamento sequenziale',
    'Последовательный пуск', 'Démarrage séquentiel'),
  '06_Arranque_secuencial_temporizado.json': t('Arranque secuencial temporizado', 'Timed sequential start',
    'Avviamento sequenziale temporizzato', 'Последовательный пуск с выдержкой времени',
    'Démarrage séquentiel temporisé'),
  '07_Arranque_E_T.json': t('Arranque estrella-triángulo', 'Star-delta starter', 'Avviamento stella-triangolo',
    'Пуск «звезда — треугольник»', 'Démarrage étoile-triangle'),
  '08_Inversor_de_giro_temporizado.json': t('Inversor de giro temporizado', 'Timed reversing starter',
    'Inversione di marcia temporizzata', 'Реверс двигателя с выдержкой времени', 'Inverseur de sens temporisé'),
  '09_Inversor_de_giro_temporizado_2D.json': t('Inversor de giro temporizado 2D', 'Timed reversing starter 2D',
    'Inversione di marcia temporizzata 2D', 'Реверс двигателя с выдержкой времени 2D',
    'Inverseur de sens temporisé 2D'),
  '10_Arranque_E_T_2D.json': t('Arranque estrella-triángulo 2D', 'Star-delta starter 2D',
    'Avviamento stella-triangolo 2D', 'Пуск «звезда — треугольник» 2D', 'Démarrage étoile-triangle 2D'),
  // Ejemplos 2 (Ejemplo 2.4 и 2.8 показываются в «Motores»).
  'Ejemplo 2.3.cad': t('Arranque por autotransformador', 'Autotransformer starter', 'Avviamento con autotrasformatore',
    'Пуск через автотрансформатор', 'Démarrage par autotransformateur'),
  'Ejemplo 2.4.cad': t('Columpio: dos motores alternos', 'Swing: two alternating motors',
    'Altalena: due motori alternati',
    'Качели: два двигателя попеременно', 'Balançoire : deux moteurs en alternance'),
  'Ejemplo 2.7.cad': t('Inversor de giro con temporizador a la desconexión', 'Reversing starter with off-delay timer',
    'Inversione di marcia con temporizzatore alla diseccitazione', 'Реверс с реле времени на отключение',
    'Inverseur de sens avec temporisation au déclenchement'),
  'Ejemplo 2.8.cad': t('Motor de dos velocidades (dos devanados)', 'Two-speed motor (two windings)',
    'Motore a due velocità (due avvolgimenti)', 'Двухскоростной двигатель (две обмотки)',
    'Moteur à deux vitesses (deux enroulements)'),
  'Ejemplo 2.9.cad': t('Variador de frecuencia: giro y velocidades por relés',
    'Frequency inverter: direction and speeds by relays',
    'Inverter: senso e velocità tramite relè', 'Преобразователь частоты: направление и скорости от реле',
    'Variateur de fréquence : sens et vitesses par relais'),
  'Ejemplo 2.10.cad': t('Variador de frecuencia 2D: panel y bornes de control',
    'Frequency inverter 2D: panel and control terminals',
    'Inverter 2D: pannello e morsetti di comando', 'Преобразователь частоты 2D: панель и клеммы управления',
    'Variateur de fréquence 2D : panneau et bornes de commande'),
  'Ejemplo 2.11.cad': t('Variador de frecuencia monofásico 2D (entrada 230 V)',
    'Single-phase frequency inverter 2D (230 V input)',
    'Inverter monofase 2D (ingresso 230 V)', 'Однофазный преобразователь частоты 2D (вход 230 В)',
    'Variateur de fréquence monophasé 2D (entrée 230 V)'),
  'Ascensor_5_plantas_con_variador.cad': t('Ascensor de 5 plantas con variador (10–25 Hz)',
    'Five-floor elevator with frequency inverter (10–25 Hz)',
    'Ascensore a 5 piani con inverter (10–25 Hz)', 'Лифт на 5 этажей с преобразователем частоты (10–25 Гц)',
    'Ascenseur 5 étages avec variateur (10–25 Hz)'),
};

/** Папки окна «Примеры» (кроме папки автора «Misceláneo»: её название в текстах интерфейса, examplesAuthor). */
export const EXAMPLE_FOLDER_TRANSLATIONS: Readonly<Record<string, Titles>> = {
  Motores: t('Motores', 'Motors', 'Motori', 'Двигатели', 'Moteurs'),
  'Ejemplos 2': t('Ejemplos 2', 'Examples 2', 'Esempi 2', 'Примеры 2', 'Exemples 2'),
};

/** Название примера на языке lang; без перевода — запасное (испанское) название. */
export function exampleTitle(file: string, lang: string, fallback: string): string {
  return EXAMPLE_TITLE_TRANSLATIONS[file]?.[lang as ExampleLang] ?? fallback;
}
