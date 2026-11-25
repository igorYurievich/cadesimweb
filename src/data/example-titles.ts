// ── Названия примеров на языках интерфейса (окно «Примеры», document-io.ts) ─────────────────────────
// Ключ — имя файла .cad. Испанский — как в списке EXAMPLE_TITLES (examples.ts) и в именах файлов автора.
// Нет перевода — показывается испанское название (новый файл автора — по имени файла).

export type ExampleLang = 'es' | 'en' | 'it' | 'ru' | 'fr';
type Titles = Readonly<Record<ExampleLang, string>>;

const t = (es: string, en: string, it: string, ru: string, fr: string): Titles =>
  ({ es, en, it, ru, fr });

export const EXAMPLE_TITLE_TRANSLATIONS: Readonly<Record<string, Titles>> = {
  // Примеры автора.
  'Arranque_estrella_triangulo_2D.cad': t('Arranque estrella-triángulo 2D', 'Star-delta starter 2D',
    'Avviamento stella-triangolo 2D', 'Пуск «звезда — треугольник» 2D', 'Démarrage étoile-triangle 2D'),
  'Dos_modos_de_giro_programados_mediante_PLC.cad': t('Dos modos de giro programados mediante PLC',
    'Two rotation modes programmed with a PLC', 'Due modalità di rotazione programmate con PLC',
    'Два режима вращения, запрограммированные на ПЛК', 'Deux modes de rotation programmés par automate'),
  'GRAFCET_secuencia_de_pilotos.cad': t('GRAFCET: secuencia de pilotos', 'GRAFCET: pilot lamp sequence',
    'GRAFCET: sequenza di spie', 'GRAFCET: последовательность сигнальных ламп', 'GRAFCET : séquence de voyants'),
  'Iluminacion_escalera_3_hilos_(clasico).cad': t('Iluminación de escalera a 3 hilos (clásico)',
    'Staircase lighting, 3-wire (classic)', 'Illuminazione scale a 3 fili (classico)',
    'Освещение лестницы, 3 провода (классика)', 'Éclairage d’escalier à 3 fils (classique)'),
  'Iluminacion_escalera_4_hilos_(moderno).cad': t('Iluminación de escalera a 4 hilos (moderno)',
    'Staircase lighting, 4-wire (modern)', 'Illuminazione scale a 4 fili (moderno)',
    'Освещение лестницы, 4 провода (современная)', 'Éclairage d’escalier à 4 fils (moderne)'),
  // Ejemplos.
  'Ejemplo 1.cad': t('Marcha-paro con final de carrera', 'Start-stop with limit switch', 'Marcia-arresto con finecorsa',
    'Пуск — стоп с концевым выключателем', 'Marche-arrêt avec fin de course'),
  'Ejemplo 2.cad': t('Marcha-paro con seta de emergencia', 'Start-stop with emergency stop button',
    'Marcia-arresto con fungo di emergenza', 'Пуск — стоп с аварийной кнопкой «грибок»',
    'Marche-arrêt avec arrêt d’urgence coup de poing'),
  'Ejemplo 3.cad': t('Marcha-paro de dos motores', 'Start-stop of two motors', 'Marcia-arresto di due motori',
    'Пуск — стоп двух двигателей', 'Marche-arrêt de deux moteurs'),
  'Ejemplo 4.cad': t('Dos motores con enclavamiento eléctrico', 'Two motors with electrical interlock',
    'Due motori con interblocco elettrico', 'Два двигателя с электрической блокировкой',
    'Deux moteurs avec verrouillage électrique'),
  'Ejemplo 5.cad': t('Dos motores: paro general por relé térmico', 'Two motors: general stop by thermal relay',
    'Due motori: arresto generale da relè termico', 'Два двигателя: общий стоп от теплового реле',
    'Deux moteurs : arrêt général par relais thermique'),
  'Ejemplo 6.cad': t('Tres motores: paro general por relé térmico', 'Three motors: general stop by thermal relay',
    'Tre motori: arresto generale da relè termico', 'Три двигателя: общий стоп от теплового реле',
    'Trois moteurs : arrêt général par relais thermique'),
  'Ejemplo 7.cad': t('Arranque estrella-triángulo temporizado', 'Timed star-delta starter',
    'Avviamento stella-triangolo temporizzato', 'Пуск «звезда — треугольник» с выдержкой времени',
    'Démarrage étoile-triangle temporisé'),
  'Ejemplo 9.cad': t('Arranque FIFO', 'FIFO start', 'Avviamento FIFO', 'Пуск по принципу FIFO', 'Démarrage FIFO'),
  'Ejemplo 10.cad': t('Semáforo', 'Traffic light', 'Semaforo', 'Светофор', 'Feu de circulation'),
  // Ejemplos 2.
  'Ejemplo 2.3.cad': t('Arranque por autotransformador', 'Autotransformer starter', 'Avviamento con autotrasformatore',
    'Пуск через автотрансформатор', 'Démarrage par autotransformateur'),
  'Ejemplo 2.4.cad': t('Columpio: dos motores alternos', 'Swing: two alternating motors',
    'Altalena: due motori alternati',
    'Качели: два двигателя попеременно', 'Balançoire : deux moteurs en alternance'),
  'Ejemplo 2.6.cad': t('Giro en dos direcciones', 'Rotation in two directions', 'Rotazione in due direzioni',
    'Вращение в двух направлениях', 'Rotation dans les deux sens'),
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

/** Папки окна «Примеры» (кроме папки автора: её название в текстах интерфейса, examplesAuthor). */
export const EXAMPLE_FOLDER_TRANSLATIONS: Readonly<Record<string, Titles>> = {
  Ejemplos: t('Ejemplos', 'Examples', 'Esempi', 'Примеры', 'Exemples'),
  'Ejemplos 2': t('Ejemplos 2', 'Examples 2', 'Esempi 2', 'Примеры 2', 'Exemples 2'),
};

/** Название примера на языке lang; без перевода — запасное (испанское) название. */
export function exampleTitle(file: string, lang: string, fallback: string): string {
  return EXAMPLE_TITLE_TRANSLATIONS[file]?.[lang as ExampleLang] ?? fallback;
}
