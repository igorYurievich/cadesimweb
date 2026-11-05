# CADe_SIMU V4.2 — данные, извлечённые из exe

Источник: `CADe_SIMU_V4.2.exe` (40,4 МБ) из присланного архива. Всё ниже взято из самого файла (ресурсы, таблицы строк, строки в коде). Где что-то — моё предположение, это помечено словом **«гипотеза»**.

## 1. Что это за программа (проверено)

- Нативный Windows-exe PE32 (x86), **C++ / MFC, Visual C++ 6.0** (линкер 6.0). Это не Delphi: в архиве лежат отладочные `MFC42D.DLL`, `MFCO42D.DLL`, `MSVCRTD.DLL`. Дата сборки в заголовке: 2020-09-20.
- Версия в «О программе»: **CADe_SIMU Versión 4.2**, «Copyright (C) 2000-2020 Juan Luis Villanueva Montoto», сайт canalplc.blogspot.com.es, канал YouTube canalPLC. Путь исходника, оставшийся в строках: `E:\C++\CADe_SIMU\Cdib.cpp`.
- Архитектура MFC Doc/View, многооконная (MDI): классы `CMainFrame`, `CChildFrame`, `CCADe_SIMUDoc`, `CCADe_SIMUView`. Окно «Окно» (каскад, мозаика) и режим «Simular todos los documentos» подтверждают, что одновременно открыто несколько схем.
- Ресурсы занимают около 32 из 40 МБ: **316 bitmap** (31,8 МБ: полосы тулбаров, картинки 2D/3D элементов), 160 диалогов (ES 36, EN 32, IT 32, FR 30, PT 30), 153 блока строк, по 2 меню на каждую из 5 локалей, панели инструментов (ES 23, EN и IT по 21). Локали: испанский (3082), английский (1033), итальянский (1040), французский (1036), португальский (2070). Панели с компонентами и их названия есть только в ES/EN/IT; во французской и португальской локалях лишь диалоги и меню, а названия элементов встречаются отдельными строками. Две панели «Símbolos realistas» присутствуют только в испанских ресурсах, поэтому в колонках EN/IT для них стоит «—».
- Рядом в архиве: `CADe_SIMU_V4.0.exe` (старая версия), `libnodave.dll` (связь с Siemens/LOGO), папка `Nettoplcsim-S7o-v-1-1-0-0` (NetToPLCsim + `IsoToS7online.dll` — мост к S7-1200 в симуляторе).

## 2. Сколько компонентов на самом деле

Число 200 из вашего запроса примерное. В программе **309 уникальных кнопок-команд для размещения элементов** (328 слотов в панелях, часть кнопок продублирована в двух панелях). Из них:

- **267** — собственно схемные элементы (панели 183…292),
- **42** — дополнительные варианты в двух панелях «Símbolos realistas» (реалистичные 2D/3D-изображения тех же устройств: мотор, автомат, контактор, реле на колодке, кнопка, лампа, клемма и т. д.).

Размеры «Component tamaño pequeño / medio / grande» — это переключатель размера, а не отдельные элементы. Кнопки толщины линии (4 шт.) в счёт не входят.

Раскладка по панелям: Логика 27, Кабели/соединения 21 (без толщины), Приводы 24, Ladder 21, Питание 21, Катушки/сигнализация 17, Силовая часть (потенциалы, регуляторы) 17, I/O/PLC 17, Контакты 16, Датчики 16, Автоматы 15, Моторы 14, GRAFCET 14, Реле электрон. 12, Предохранители 10, Контакторы 10, Пневматика 10, Реалистичные символы 23 + 23.

## 3. Catálogo de componentes por barra

Fuente: recursos de barras de herramientas (RT 241) + tooltips de la tabla de strings, en ES/EN/IT. «ID» = código de comando MFC. Un ID que aparece en 2 barras se marca como `(repetido)`.

### Alimentaciones y fuentes  
_barra 183 · 21 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 32873 | Alimentación Fase | Phase power | Alimentazione Fase |
| 32874 | Alimentación Neutro | Power Neutro | AlimentazioneNeutro |
| 32883 | Alimentación Protección | Power Protection | Alimentazione Protezione |
| 32872 | Alimentación Fase + Neutro | Power Phase + Neutro | Alimentazione Fase + Neutro |
| 32906 | Alimentación Fase + Neutro + Protección | Power Phase + Neutro + Protection | Alimentazione Fase + Neutro + Protezione |
| 32870 | Alimentación L1 + L2 + L3 | Power  L1 + L2 + L3 | Alimentazione L1 + L2 + L3 |
| 32879 | Alimentación L1 + L2 + L3 + PE | Power  L1 + L2 + L3 + PE | Alimentazione L1 + L2 + L3 + PE |
| 32869 | Alimentación L1 + L2 + L3 + N | Power  L1 + L2 + L3 + N | Alimentazione L1 + L2 + L3 + N |
| 32882 | Alimentación L1 + L2 + L3 + N + PE | Power L1 + L2 + L3 + N + PE | Alimentazione L1 + L2 + L3 + N + PE |
| 32876 | Alimentación Positivo | Positive power | Alimentazione Positivo |
| 32877 | Alimentación Negativo | Negative power | Alimentazione Negativo |
| 32875 | Alimentación +- | Power +- | Alimentazione +- |
| 33042 | Alimentación Protección | Power Protection | Alimentazione cavo fase |
| 32995 | Transformador | Transformer | Trasformatore |
| 33045 | Transformador III | Transformer III | trasformatore III |
| 33043 | Diodo | Diode | Diodo |
| 32997 | Rectificador | Rectifier | Rectifier |
| 32998 | Fuente de alimentación | Power supply | Alimentazione |
| 33044 | Fuente de alimentación III | Power supply III | Alimentazione III |
| 33046 | Bateria | Battery | Batteria |
| 33263 | Toma de corriente | Electrical outlet | Presa elettrica |

### Fusibles y seccionadores  
_barra 177 · 10 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 32853 | Fusible I | Fuse I | Fusibile I |
| 32842 | Fusible IN | Fuse IN | Fusibile IN |
| 32839 | Fusible II | Fuse II | Fusibile II |
| 32840 | Fusible III | Fuse III | Fusibile III |
| 32841 | Fusible IIIN | Fuse IIIN | Fusibile IIIN |
| 32854 | Fusible seccionable I | Fuse disconnector I | Sezionatore con fusibile I |
| 32843 | Fusible seccionable IN | Fuse disconnector IN | Sezionatore con fusibile IN |
| 32844 | Fusible seccionable II | Fuse disconnector II | Sezionatore con fusibile II |
| 32845 | Fusible seccionable III | Fuse disconnector III | Sezionatore con fusibile III |
| 32848 | Fusible seccionable IIIN | Fuse disconnector IIIN | Sezionatore con fusibile IIIN |

### Automáticos, diferenciales, relé térmico, disyuntores, limitadores de sobretensión  
_barra 179 · 15 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 32858 | Interruptor automático I | Automatic switch I | Interruttore automatico I |
| 32859 | Interruptor automático IN | Automatic switch IN | Interruttore automatico IN |
| 32860 | Interruptor automático II | Automatic switch II | Interruttore automatico II |
| 32861 | Interruptor automático III | Automatic switch III | Interruttore automatico III |
| 32862 | Interruptor automático IIIN | Automatic switch IIIN | Interruttore automatico IIIN |
| 32863 | Interruptor diferencial IN | Differential switch IN | Interruttore differenziale IN |
| 32864 | Interruptor diferencial IIIN | Differential switch IIIN | Interruttore differenziale IIIN |
| 32865 | Relé térmico | Thermal Relay | Relè termico |
| 32898 | Disyuntor I | Magnetothermic switch I | Interruttore magnetotermico I |
| 33050 | Disyuntor IN | Magnetothermic switch IN | Interruttore magnetotermico IN |
| 32866 | Disyuntor II | Magnetothermic switch II | Interruttore magnetotermico II |
| 32867 | Disyuntor III | Magnetothermic switch III | Interruttore magnetotermico III |
| 33052 | Disyuntor IIIN | Magnetothermic switch IIIN | Interruttore magnetotermico IIIN |
| 33054 | Limitador sobretensiones IN | Overvoltage limiter IN | Llimitatore di sovratensione IN |
| 33055 | Limitador sobretensiones IIIN | Overvoltage limiter IIIN | Limitatore di sovratensione IIIN |

### Contactores e interruptores (potencia)  
_barra 175 · 10 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 32899 | Contactor I | Contactor I | Contattore I |
| 32834 | Contactor II | Contactor II | Contattore II |
| 32833 | Contactor III | Contactor III | Contattore III |
| 32835 | Contactor IIII | Contactor IIII | Contattore IIII |
| 33219 | Contactor III | Contactor III | Contattore III |
| 32900 | Interruptor I | Switch I | Interrutture I |
| 32836 | Interruptor II | Switch II | Interrutture II |
| 32837 | Interruptor III | Switch III | Interrutture III |
| 32838 | Interruptor IIII | Switch IIII | Interrutture IIII |
| 33392 | Enclavamiento | Interlocking | Ad incastro |

### Motores  
_barra 173 · 14 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 32828 | Motor trifásico | Three-phase motor | Motore trifase |
| 32829 | Motor trifásico YD | Three-phase motor YD | Motore trifase YD |
| 32830 | Motor monofásico | Single-phase motor | Motore monofase |
| 33103 | Motor monofásico | Single-phase motor | Motore monofase |
| 33237 | Motor trifásico como monofásico | Motor trifase as motor monofase | Motore trifase como motore monofase |
| 32831 | Motor Dahalander | Motor Dahalander | Motore Dahalander |
| 32994 | Motor II Veloc | Two speed motor | Motore a due velocità |
| 32832 | Motor trifásico rotor bobinado | Wound rotor induction motor | Motore a rotore anelli |
| 32999 | Motor cc. de imán permanente | DC motor. Iman P. | DC Motore Iman P. |
| 33000 | Motor cc. de independiente | DC motor. Indep. | DC Motore Indep. |
| 33295 | Motor paso a paso unipolar | Unipolar stepper motor | Motore passo-passo unipolare |
| 33296 | Motor paso a paso bipolar | Bipolar stepper motor | Motore passo-passo bipolare |
| 33104 | Freno | Brake | Freno |
| 33257 | Actuador lineal eléctrico | Electric Linear Actuator | Attuatore lineare elettrico |

### Potencia: resistencias, arrancadores, variadores, controladores  
_barra 213 · 17 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33002 | Resistencia I | Resistence I | Resistenza I |
| 33003 | Resistencia III | Resistence III | Resistenza III |
| 33004 | Autotransformador III | Autotransformer III | Autotransformatore III |
| 33005 | Arrancador electónico c.a. | Electronic starter a.c. | Starter elettronico c.a. |
| 33089 | Control arrancador electrónico c.a.. | Electronic starter control a.c. | Controllo starter elettronico c.a. |
| 33262 | Control inversor electrónico c.a.. | — | — |
| 33006 | Variador velocidad c.a. II | Variable speed c.a. II | Variatore velocità. c.a. II |
| 33007 | Variador velocidad c.a. III | Variable speed a.c. III | Variatore velocità c.a. III |
| 33011 | Control Variador velocidad c.a. | Drive speed control a.c. | Control variatore velocità c.a. |
| 33015 | Variador velocidad c.c. II | Variable speed d.c. II | Variatore velocità c.c. II |
| 33016 | Variador velocidad c.c. II | Variable speed d.c. II | Variatore velocità c.c. II |
| 33018 | Variador velocidad c.c. III | Variable speed d.c. III | Variatore velocità c.c. IIII |
| 33017 | Variador velocidad c.c. III | Variable speed d.c. III | Variatore velocità c.c. IIII |
| 33012 | Control variador velocidad c.c. | Drive speed control d.c. | Control variatore velocità. c.c. |
| 33297 | Controlador motor paso a paso | Stepper motor driver | Controller del motore passo-passo |
| 33298 | Controlador motor paso a paso 2 CLK | Stepper motor driver 2 CLK | Controller del motore passo-passo 2 CLK |
| 33299 | Controlador motor paso a paso CLK/DIR | Stepper motor driver CLK/DIR | Controller del motore passo-passo CLK/DIR |

### Contactos auxiliares y temporizados  
_barra 191 · 16 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 32937 | Contacto NA | NO contact | Contatto NO |
| 32938 | Contacto NC | NC contact | Contatto NC |
| 32939 | Contacto NA+NC | NO+NC contact | Contatto NO+NC |
| 32940 | Contacto CON | CON contact | Contatto CON |
| 32933 | Contacto temporizado a la conexión NA | NO contact with the connection timed | Contatto temporizzato ritardato alla eccitazione NO |
| 32934 | Contacto temporizado a la conexión NC | NC contact with the connection timed | Contatto temporizzato ritardato alla eccitazione NC |
| 32935 | Contacto temporizado a la conexión NA+NC | NO+NC contact with the connection timed | Contatto temporizzato ritardato alla eccitazione NO+NC |
| 32936 | Contacto temporizado a la conexión CON | CON contact with the connection timed | Contatto temporizzato ritardato alla eccitazione CON |
| 32941 | Contacto temporizado a la deconexión NA | NO Contact timed to disconnection | Contatto temporizzato ritardato alla diseccitazione NO |
| 32942 | Contacto temporizado a la deconexión NC | NC Contact timed to disconnection | Contatto temporizzato ritardato alla diseccitazione NC |
| 32943 | Contacto temporizado a la deconexión NA+NC | NO+NC Contact timed to disconnection | Contatto temporizzato ritardato alla diseccitazione NO+NC |
| 32944 | Contacto temporizado a la deconexión CON | CON Contact timed to disconnection | Contatto temporizzato ritardato alla diseccitazione CON |
| 32945 | Contacto temporizado a la conexión deconexión NA | NO contact with the connection disconnection timed | Contatto temporizzato ritardato alla eccitaziones diseccitazione NO |
| 32946 | Contacto temporizado a la conexión deconexión NC | NC contact with the connection disconnection timed | Contatto temporizzato ritardato alla eccitaziones diseccitazione NC |
| 32947 | Contacto temporizado a la conexión deconexión NA+NC | NO+NC contact with the connection disconnection timed | Contatto temporizzato ritardato alla eccitaziones diseccitazione NO+NC |
| 32948 | Contacto temporizado a la conexión deconexión CON | CON contact with the connection disconnection timed | Contatto temporizzato ritardato alla eccitaziones diseccitazione CON |

### Accionamientos (pulsadores, setas, interruptores, conmutadores, finales de carrera)  
_barra 189 · 24 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33278 | Botón pulsador | Push button | Pulsante |
| 32909 | Pulsador NA | Push button | Pulsante NO |
| 32910 | Pulsador NC | NC button | Pulsante NC |
| 32912 | Pulsador NA-NC | NO-NC button | Pulsante NO-NC |
| 32913 | Pulsador CON | CON button | Pulsante CON |
| 32914 | Pulsador seta NA | NO button mushroom | Pulsante fungo NO |
| 32915 | Pulsador seta NC | NC button mushroom | Pulsante fungo NC |
| 32917 | Pulsador seta NA-NC | NO-NC button mushroom | Pulsante fungo NO-NC |
| 32918 | Pulsador seta CON | CON button mushroom | Pulsante fungo CON |
| 32919 | Interruptor NA | NO switch | Interruttore NO |
| 32920 | Interruptor NC | NC switch | Interruttore NC |
| 32921 | Interruptor NA-NC | NO-NC switch | Interruttore NO-NC |
| 32922 | Interruptor CON | COM switch | Interruttore CON |
| 33047 | Conmutador I-0-II | I-0-II switch | Commutatore I-0-II |
| 33048 | Conmutador I-II-III | I-II-III switch | Commutatore I-II-III |
| 33049 | Conmutador cruce | Crossover switch | Conmutador di giunzione |
| 32923 | Final de carrera NA | NO limit | Finecorsa NO |
| 32924 | Final de carrera NC | NC limit | Finecorsa NC |
| 32925 | Final de carrera NA-NC | NO-NC limit | Finecorsa NO-NC |
| 32926 | Final de carrera COM | COM limit | Finecorsa COM |
| 32927 | Contacto auxiliar relé térmico NA | NO Auxiliary heat relay | Contatto ausiliario relè termico NO |
| 32928 | Contacto auxiliar relé térmico NC | NC Auxiliary heat relay | Contatto ausiliario relè termico NC |
| 32929 | Contacto auxiliar relé térmico NA-NC | NO-NC Auxiliary heat relay | Contatto ausiliario relè termico NO-NC |
| 32930 | Contacto auxiliar relé térmico CON | COM Auxiliary heat relay | Contatto ausiliario relè termico CON |

### Detectores / sensores  
_barra 215 · 16 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33032 | Det. inductivo NA | NO Inductive detector | Sensori induttivo NO |
| 33020 | Det. inductivo NC | NCInductive detector | Sensori induttivo NC |
| 33021 | Det. capacitivo NA | NO Capacitive detector | Sensori capacitivo NO |
| 33022 | Det. capacitivo NC | NC Capacitive detector | Sensori capacitivo NC |
| 33023 | Det. magnético NA | NO Magnetic detector | Sensori  magnetico NO |
| 33024 | Det. magnético NC | NC Magnetic detector | Sensori  magnetico NC |
| 33025 | Barrera fotoeléctica | Light barrier | Fotodellula |
| 33027 | Barrera emisor | Emitter barrier | Fotodellula emettitore |
| 33034 | Barrera receptor NA | NO receptor barrier | Fotodellula recevitore NO |
| 33033 | Barrera receptor NC | NC receptor barrier | Fotodellula recevitore NC |
| 33253 | Presostato NA | Pressure switch NO | Pressostato NO |
| 33254 | Presostato NA | Pressure switch NC | Pressostato NC |
| 33255 | Vacuostato NA | Empty pressure NO | Pressione di vuoto NO |
| 33256 | Vacuostato NC | Empty pressure NC | Pressione di vuoto NC |
| 33346 | Termostato NA | Thermostat NO | Termostato NO |
| 33347 | Termostato NC | Thermostat NC | Termostato NC |

### Bobinas, temporizadores y señalización  
_barra 193 · 17 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 32949 | Bobina contactor, relé | Coil contactor, relay | Bobine contattori, relè |
| 32956 | Bobina biestable contactor, relé | Bistable contactor coil, relay | Bistabile bobina contattore, relè |
| 32964 | Telerruptor | Step relay | Teleruttore |
| 32951 | Bobina electroválvula | Solenoid coil | Bobina elettrovalvola |
| 32952 | Temporizador a la conexión | Connection timer | Temporizzatore ritardato alla eccitazione |
| 32953 | Temporizador a la desconexión | Timer to disconnect | Temporizzatore con ritardo alla diseccitazione |
| 32954 | Temporizador a la conexión desconexión | Disconnect connection timer | Temporizzatore con ritardo alla eccitazione diseccitazione |
| 32955 | Relé intermitente | Flasher relay | Relè intermitente |
| 33223 | Generador de pulsos | Pulse Generator | Generatore di impulsi |
| 33098 | Interruptor horario | Time switch | Interruttore orario |
| 33236 | Contador de pulsos | Pulse counter | Contatore di impulsi |
| 32957 | Piloto señalización | Pilot signal | Lampadina |
| 32958 | Piloto señalización intermitente | Iintermittent pilot | Lampadina intermitente |
| 32961 | Timbre | Ring | Pulsante |
| 32962 | Zumbador | Buzzer | Vibratore |
| 32960 | Sirena | Siren | Sirena |
| 32959 | Bocina | Horn | Clacson |

### Relés electrónicos y protecciones  
_barra 291 · 12 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33258 | Relé estado sólido SSR DC | Solid State Relay SSR DC | SSR relè a stato solido DC |
| 33259 | Relé estado sólido SSR AC | Solid State Relay SSR AC | SSR relè a stato solido AC |
| 33260 | Contactor de estado sólido | Solid state contactor | Solid state contattore |
| 33261 | Contactor inversor de estado sólido | Solid state inverter contactor | Stato solido contattore di inversione |
| 33266 | Relé de falta de fase + N | Phase + N fault relay | Fase di relè mancanza + N |
| 33267 | Relé de falta de fase | Phase loss relay | Mancanza di fase relè |
| 33271 | Relé de secuencia de fase + N | Phase + N sequence relay | Sequenza delle fasi relè + N |
| 33269 | Relé de secuencia de fase | Phase sequence relay | Sequenza delle fasi Relè |
| 33344 | Proteccion contra sobretensiones permanentes | Protection against permanent overvoltages | Protezione contro le sovratensioni permanenti |
| 33345 | proteccion contra sobretensiones permanentes | Protection against permanent overvoltages | Protezione contro le sovratensioni permanenti |
| 33372 | Relé SPST | Relay SPST | Relè SPST |
| 33373 | Relé SPDT | Relay SPDT | Relè SPDT |

### Lógica  
_barra 226 · 27 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33056 | AND | AND | AND |
| 33057 | OR | OR | OR |
| 33058 | INV | INV | INV |
| 33059 | EXOR | EXOR | EXOR |
| 33060 | NAND | NAND | NAND |
| 33061 | NOR | NOR | NOR |
| 33100 | Biestable | Biestable | bistabile |
| 33111 | Divisor Binario | Binary divider | Binary Divider |
| 33099 | Temporizador conexión | Connection timer | Timer onr |
| 33300 | Temporizador pulso conexión | Pulse connection timer | Pulse timer onr |
| 33112 | Temporizador desconexión | timer off | Timer off |
| 33114 | Temporizador intermitente | Intermittent timer | Timer intermittente |
| 33226 | Pulse Generator | Pulse Generator | Generatore di impulsi |
| 33097 | Contador | Counterr | Contatorer |
| 33277 | Contador ascendente-descendente | Counter ascending-descending | Up-down contatore |
| 33292 | Contador 4 bits | Counter 4 bits | Contatore a 4 bit |
| 33293 | Contador 4 bits | Counter 4 bits | Contatore a 4 bit |
| 33301 | Contador 4 bits ASC/DES | Counter 4 bits ASC/DES | Contatore a 4 bit  ASC/DES |
| 33302 | Contador 4 bits decadas | Counter 4 bits decades | Contatore decadi 4 bit |
| 33079 | Prueba | Test | Prova |
| 33080 | Visualiza | Visualize | Visualizza |
| 33294 | Decodificador 7 segmentos | Decoder BCD 7 Seg | Decoder BCD 7 Seg |
| 33115 | Display BCD | Display BCD | Display BCD |
| 33116 | Display 7 Seg. | Display 7 Seg. | Display 7 Seg. |
| 33117 | Preselctor | Preselector | Pre-selettore |
| 33035 | Cable positivo | Positive wire | Cavo positivo |
| 32889 | Conexión | Connection | Collegamento |

### Ladder  
_barra 292 · 21 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33062 | NA | NO | NO |
| 33063 | NC | NC | NC |
| 33065 | Flanco ascendente | Positive edge | Fronte positivo |
| 33066 | Flanco descendente | Negative edge | Fronte in discesa |
| 33291 | First Scan | First Scan | First Scan |
| 33067 | Asignar | Assignr | Assegnarer |
| 33069 | Set | Set | Set |
| 33070 | Reset | Reset | Reset |
| 33100 | Biestable (repetido) | Biestable | bistabile |
| 33111 | Divisor Binario (repetido) | Binary divider | Binary Divider |
| 33099 | Temporizador conexión (repetido) | Connection timer | Timer onr |
| 33300 | Temporizador pulso conexión (repetido) | Pulse connection timer | Pulse timer onr |
| 33112 | Temporizador desconexión (repetido) | timer off | Timer off |
| 33114 | Temporizador intermitente (repetido) | Intermittent timer | Timer intermittente |
| 33226 | Pulse Generator (repetido) | Pulse Generator | Generatore di impulsi |
| 33097 | Contador (repetido) | Counterr | Contatorer |
| 33277 | Contador ascendente-descendente (repetido) | Counter ascending-descending | Up-down contatore |
| 32876 | Alimentación Positivo (repetido) | Positive power | Alimentazione Positivo |
| 32877 | Alimentación Negativo (repetido) | Negative power | Alimentazione Negativo |
| 33035 | Cable positivo (repetido) | Positive wire | Cavo positivo |
| 33037 | Cable negativo | Negative wire | Cavo negativo |

### GRAFCET  
_barra 228 · 14 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33088 | Etapa inicial | Initial stage | Tappa iniciale |
| 33083 | Etapa | Stage | Tappa |
| 33084 | Transición | Transition | Transicione |
| 33085 | Acción | Action | Azione |
| 33101 | "0" | "0" | "0" |
| 33094 | Divergencia en "O" | Divergence in "O" | Divergenza in "O" |
| 33095 | Convergencia en "O" | Convergence in "O" | Convergenza in "O" |
| 33102 | "Y" | "Y" | "Y" |
| 33086 | Divergencia en "Y" | Divergence in "Y" | Divergenza in "Y" |
| 33093 | Convergencia en "Y" | Convergencia en "Y" | Convergenza in "Y" |
| 33092 | Línea enlace | Line link | Linea Grafcet |
| 33090 | Enlace de entrada | Input Link | Link in entrata |
| 33091 | Enlace de salida | Output link | Uscita Link |
| 33096 | Macro etapa | Macro stage | Macro tappa |

### Entrada/Salida, PLC, LOGO, Arduino  
_barra 242 · 17 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33108 | Intercambio entradas PC_SIMU | Exchange PC_SIMU entries | Intercambio di biglietti PC_SIMU |
| 33109 | Intercambio salidas PC_SIMU | Exchanging departures PC_SIMU | Uscite di Exchange PC_SIMU |
| 33238 | Módulo lógico | Logical module | Modulo logico |
| 33336 | LOGO  4DI/4DO | LOGO  4DI/4DO | LOGO  4DI/4DO |
| 33240 | PLC S7-1200 | PLC S7-1200 | PLC S7-1200 |
| 33337 | S7-1200 8DI/8DO | S7-1200 8DI/8DO | S7-1200 8DI/8DO |
| 33326 | PLC CPU S7-1500 | PLC CPU S7-1500 | PLC CPU S7-1500 |
| 33328 | S7-1500 DI/DO | S7-1500 DI/DO | PLC S7-1500 DI/DO |
| 33331 | ET-200 | — | ET-200 |
| 33334 | ET-200 8DI | ET-200 8DI | ET-200 8DI |
| 33335 | ET-200 8DO | ET-200 8DO | ET-200 8DO |
| 33272 | Entrada digital PLC | PLC digital input | Ingresso digitale PLC |
| 33273 | Salida digital PLC | PLC digital output | Uscita digitale PLC |
| 33274 | CPU PLC | CPU PLC | CPU PLC |
| 33275 | Alimentación I/O digital PLC | Power supply Digital I / O PLC | Potenza digitali PLC I/O |
| 33276 | Alimentación I/O digital PLC | Power supply Digital I / O PLC | Potenza digitali PLC I/O |
| 33324 | Arduino uno | Arduino one | Arduino uno |

### Actuadores neumáticos  
_barra 269 · 10 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33242 | Actuador simple efecto | Single acting actuator | Attuatore semplice effetto |
| 33243 | Actuador doble efecto | Double acting actuator | Attuatore a doppio effetto |
| 33245 | Actuador sin vástago | Stemless actuator | Senza stelo |
| 33246 | Actuador sin vástago magnético | Actuator without magnetic stem | Attuatore senza stelo magnetico |
| 33247 | Actuador giro | Rotating actuator | Attuatore turno |
| 33252 | Pinza simple efecto | Simple clamp effect | Morsetto semplice effetto |
| 33248 | Pinza doble efecto | Double clamp | Pinza a doppio effetto |
| 33249 | Ventosa | Sucker | Ventosa |
| 33250 | Motor neumático | Pneumatic motor | Air Motor |
| 33251 | Motor neumático reversible | Reversible pneumatic motor | Pneumatici motore reversibile |

### Cables y conexiones  
_barra 187 · 21 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 32884 | Cable fase | Phase wire | Cavo fase |
| 32895 | Cable neutro | Neutral wire | Cavo neutro |
| 32896 | Cable protección | Protection wire | Cavo protezione |
| 33035 | Cable positivo (repetido) | Positive wire | Cavo positivo |
| 33037 | Cable negativo (repetido) | Negative wire | Cavo negativo |
| 33229 | Cable color | colored wire | Filo colorato |
| 32889 | Conexión (repetido) | Connection | Collegamento |
| 32893 | Cable III vertical | Vertical wire III | Filo III verticale |
| 32891 | Cable III vertical | Vertical wire IIIl | Filo III verticalel |
| 32894 | Cable III horizontal | Horizontal wire III | Filo III orizzontale |
| 32892 | Cable III horizontal | Horizontal wire IIIl | Filo III orizzontalel |
| 32885 | Manguera | Tube | Tubo flessibile |
| 32888 | Entrada mangueral | Entry tube | Ingresso tubo |
| 32890 | Entrada mangueral | Entry tube | Ingresso tubol |
| 32968 | Borne cuadrado | Borne square | Terminale quadrato |
| 32969 | Borne redondo | Borne round | Terminale rotondo |
| 32991 | 2 Bornes redondos | 2 Borne round | 2 Terminale rotondo |
| 32992 | 3 Bornes redondos | 3 Borne round | 3 Terminale rotondo |
| 32993 | 3 Bornes redondos | 3 Borne round | 3Terminale rotondo |
| 32897 | Conexión de salida | Output connection | Collegamento di uscita |
| 32970 | Conexión de entrada | Input Connection | Collegamento dìngresso |

### Símbolos realistas — barra A (probablemente 2D)  
_barra 301 · 23 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33311 | Motor trifásico | — | — |
| 33393 | Motor trifásico YD | — | — |
| 33352 | Interruptor automático | — | — |
| 33354 | Interruptor diferencial | — | — |
| 33339 | Disyuntor | — | — |
| 33340 | Relé térmico | — | — |
| 33386 | Interruptor | — | — |
| 33390 | Seccionador | — | — |
| 33338 | Contactor | — | — |
| 33380 | Contactos auxiliares | — | — |
| 33381 | Contactos auxiliares ON delay | — | — |
| 33382 | Contactos auxiliares OFF delay | — | — |
| 33313 | Rele zócalo | — | — |
| 33314 | Rele temporizado zócalo | — | — |
| 33374 | Relé de 1 canal | — | — |
| 33317 | Pulsador | — | — |
| 33318 | Piloto | — | — |
| 33371 | Diodo LED | — | — |
| 33323 | Botonera | — | — |
| 33319 | Borna | — | — |
| 33363 | Componente tamaño pequeño | — | — |
| 33364 | Componente tamaño medio | — | — |
| 33365 | Componente tamaño grande | — | — |

### Símbolos realistas — barra B (probablemente 3D)  
_barra 307 · 23 botones_

| ID | Español | English | Italiano |
|---|---|---|---|
| 33312 | Motor trifásico | — | — |
| 33394 | Motor trifásico YD | — | — |
| 33356 | Interruptor automático | — | — |
| 33357 | Interrptor diferencial | — | — |
| 33342 | Disyuntor | — | — |
| 33343 | Relé térmico | — | — |
| 33387 | Interruptor | — | — |
| 33391 | Seccionador | — | — |
| 33341 | Contactor | — | — |
| 33383 | Contactos auxiliares | — | — |
| 33384 | Contactos auxiliares ON delay | — | — |
| 33385 | Contactos auxiliares OFF delay | — | — |
| 33315 | Rele zócalo | — | — |
| 33316 | Rele temporizado zócalo | — | — |
| 33376 | Relé 1 canal | — | — |
| 33320 | Pulsador | — | — |
| 33321 | Piloto | — | — |
| 33375 | Diodo led | — | — |
| 33323 | Botonera (repetido) | — | — |
| 33322 | Borna | — | — |
| 33363 | Componente tamaño pequeño (repetido) | — | — |
| 33364 | Componente tamaño medio (repetido) | — | — |
| 33365 | Componente tamaño grande (repetido) | — | — |


## 4. Что можно настроить у компонента (диалоги свойств)

Общие поля почти у каждого элемента: **Nombre** (имя/метка), **Función** (описание функции), **Conexión 1…N** (метки клемм, до 12–13), галочка **Visualizar** (показывать ли текст на схеме). Тип отображения у большинства устройств: **Símbolo** (схемное обозначение) / **Imagen 2D** / **Imagen 3D** (у некоторых ещё «2D B/N» и «CADe_SIMU 2.0»), плюс **Tamaño** (малый/средний/большой).

| Семейство | Параметры (из диалога) |
|---|---|
| Индикаторы / лампы (диалог «Indicador color») | цвет: Verde, Rojo, Azul, Amarillo, Gris |
| Таймеры (ON delay / OFF delay / ON-OFF) | шкала времени ×0,1 с, ×1 с, ×10 с, ×60 с; для ON-OFF две независимых шкалы (Temporización On / Off) |
| Датчики (диалог «Editar Detectores») | 2 провода / 3 провода, PNP / NPN, «Conexiones laterales» |
| Реле давления, вакуума, термостаты | «Límite de conexión» и «Límite de desconexión» (порог включения/выключения) |
| Частотный преобразователь AC (диалог «Variador velocidad») | мин/макс частота 0–200 Гц; управление 2 или 3 провода; 4 предустановленные скорости 0–200 Гц; разгон и торможение 0–99 с; впрыск постоянного тока при остановке 1–30 с или постоянно; аналоговый потенциометр; цифровые входы. На схеме в режиме симуляции — ползунок «Hz» |
| Регулятор DC | напряжение мин/макс 0–280 В; рампы 0–99 с; скорость 0–2500 об/мин; ползунок «V» в симуляции |
| Электронный пускатель AC | время пуска 0–20 с; номинальное напряжение пуска 200–750 В; время останова 0–20 с; начальное напряжение 30–100 % |
| Шаговый двигатель (контроллер) | тип: Unipolar / Bipolar; последовательность: Simple / Normal / Medio paso; режимы входов 2 CLK, CLK/DIR |
| Счётчики | тип: Binario / BCD; режимы A / B; «Parte» |
| Часовой выключатель | дни Lunes…Domingo; время включения и выключения (час 0–23, минута 0–59, поле «Inactivo»); проверка с сообщениями об ошибке |
| GRAFCET: действие | квалификаторы: D (задержка), L (ограниченное время), S (set), R (reset), C (условное), P (импульс), «Neg»; операнд ставится в «1» или «0» |
| GRAFCET: переход | выражение с операторами `*` (И), `+` (ИЛИ), `_` (НЕ), `(` `)`, `FP` (фронт вверх), `FN` (фронт вниз) |
| Логика: входы/выходы (8 переменных) | «Editar entradas» / «Editar salidas»: Variable 1…8 |
| Пневмоклапаны (диалог на 5/2 и т. п.) | типы: 3/2 моностабильный, 3/2 бистабильный, 3/3 закрытые, 4/2 моно, 4/2 би, 5/2 моно, 5/2 би, 5/3 закрытые / на выхлоп / под давлением; датчики положения: концевик, индуктивный, ёмкостный, магнитный, фотоэлектрический рефлекс/барьер; расположение Izquierda / Centro / Derecha; «Expandir» |
| Пневмо: параметры цилиндров и моторов | скорости выдвижения/втягивания в %, скорость вращения в %, датчики: расширен / середина / втянут, захват: открыт/закрыт (концевик или магнитный), вакуумный датчик присоски |
| Линии и графика | цвет (13 цветов), толщина 1–4, текст (шрифт, ориентация), число, рисунок из .bmp («Gráfico», «Cargar imagen») |
| Обмен с ПК (PC_SIMU, **гипотеза** по полям) | тип изображения: CADe_SIMU 2.0 / 2D / 2D B/N / 3D; поле IP; режим «Leer entradas / Escribir entradas / Leer salidas / Escribir salidas»; «Conectar al simular» |
| LOGO / S7 / CPU-модули (**гипотеза**) | Texto_1…3, питание AC/DC, поле IP, чтение/запись входов/выходов, «Conectar al simular»; для DI/DO: отдельные поля DI, DO, CPU |
| Arduino UNO | PIN0…PIN13 (конфигурация входов/выходов), порты COM1…COM4, «Conectar al simular», тип символа 2D / 2D B/N / 3D |

## 5. Режимы, меню и панели

**Режимы (меню «Modo»):** Edición, Simulación, Pausa, Paso a Paso, Simular Documento, Simular todos los documentos, «Intercambio E/S (PLC)». Кнопка Stop на панели. Скорость симуляции задаётся ползунком (Mín…Máx) в окне «Configuración» с кнопками «Guardar» и «Restaurar».

**Окно «Configuración» (опции документа):** формат A4 вертикальный/горизонтальный, A3 (формат 1 и 2), «Personalizado» (ширина × высота); рамка «Contorno» и «Referencias» (разметка полей); штамп «Cajetín 1/2/ninguno»; печать в цвете; ориентация листа; «Visualizar referenciado»; «Visualizar conexiones símbolo»; «Conexiones automática de cables»; «Líneas auxiliares del cursor»; «Visualizar número de cable»; смещение X/Y 0–100; масштаб 0,1–5; толщина линии печати 1–5.

**Штамп «Cajetín»:** Entidad, Título, Fecha, Número, De, Archivo, Dibujado, Comprobado, Nombre, Fecha; выравнивание Izq/Cen/Der для каждой строки. Есть окно «CLAVE DE ACCESO» (ввод пароля, назначение точно не установлено).

**Редактирование:** Deshacer/Rehacer, Cortar/Copiar/Pegar, Seleccionar todo, поворот влево/вправо, зеркало по вертикали/горизонтали, Zoom (anterior, normal, +, −, ventana, todo), Rejilla (сетка), Redibujar. Рисование: линия, прямоугольник, эллипс, залитые прямоугольник/эллипс, заливка, цвет, текст.

**Кнопки «Visualiza componente»:** переключают показ всех компонентов как символ / 2D / 3D.

**Структура меню (испанское, как в программе):**

```
[&Archivo]
  &Nuevo	Ctrl+N (id 57600)
  &Abrir...	Ctrl+A (id 57601)
  &Cerrar (id 57602)
  &Guardar	Ctrl+G (id 57603)
  Guardar c&omo... (id 57604)
  ---
  Importar imagen (id 33040)
  Exportar imagen (id 33041)
  ---
  &Imprimir...	Ctrl+I (id 57607)
  &Presentación preliminar (id 57609)
  Con&figurar impresora... (id 57606)
  ---
  Con&figuración (id 32784)
  ---
  Archivo reciente (id 57616)
  ---
  &Salir (id 57665)
[&Editar]
  &Deshacer	Ctrl+Z (id 57643)
  &Rehacer	Ctrl+Y (id 57644)
  ---
  Cor&tar	Ctrl+X (id 57635)
  &Copiar	Ctrl+C (id 57634)
  &Pegar	Ctrl+V (id 57637)
  ---
  Selecionar &todo (id 32973)
  ---
  C&ajetín (id 32989)
[&Dibujar]
  Re&dibujar (id 32785)
  L&inea (id 32786)
  &Rectángulo (id 32787)
  &Elipse (id 32788)
  Rectán&gulo cóloreado (id 32789)
  Eli&pse coloreada (id 32790)
  Relle&nar color (id 32791)
  &Color (id 32792)
  &Texto (id 32793)
  ---
  Li&brerías (id 32794)
[&Modo]
  &Edición (id 32972)
  Simulación (id 32971)
  P&ausa (id 32974)
  &Paso a Paso (id 32975)
  Simular Documento (id 33105)
  Simular todos los documentos (id 33106)
  ---
  Intercambio E/S (PLC) (id 32799)
[&Ver]
  Zoom &Anterior (id 32771)
  Zoom &Normal (id 32772)
  Zoom &+ (id 32773)
  Zoom &- (id 32778)
  Zoom &Ventana (id 32775)
  Zoom &Todo (id 32776)
  ---
  &Rejilla (id 32777)
[&Barras]
  Barra de &herramientas (id 59392)
  Barra de &estado (id 59393)
  ---
  Barra de &alimentaciones (id 32977)
  Barra de &fusibles... (id 32978)
  Barra de au&tomáticos... (id 32979)
  Barra de &Contactores (id 32980)
  Barra de &motores (id 32981)
  Barra de &potencia (id 33010)
  Barra de C&ontactos (id 32985)
  Barra de a&ccionamientos (id 32983)
  Barra de &detectores (id 33029)
  Barra de &bobinas (id 32984)
  Barra relés electrónicos (id 33265)
  Barra &Lógica (id 33071)
  Barra Ladde&r (id 33280)
  Barra &Grafcet (id 33087)
  Barra Entrada/&Salida (id 33110)
  Barra de actuadores &neumáticos (id 33244)
  Barra de cone&xiones (id 32986)
[Ven&tana]
  &Nueva ventana (id 57648)
  &Cascada (id 57650)
  Mosaico &Horiz (id 57651)
  Mosaico &Vert (id 57652)
  &Organizar iconos (id 57649)
[Ay&uda]
  &Acerca de CADe_SIMU... (id 57664)
```

## 6. Картинки и состояния элементов (проверено по именам ресурсов)

Для коммутационных устройств в программе есть отдельные изображения на каждое состояние. Имена вида `<ЭЛЕМЕНТ>_ON / _OFF` (схемный символ при симуляции — `_SIM_ON / _SIM_OFF`, 3D — `_3D_ON / _3D_OFF`, плоское 2D — суффикс `_2D`). Найдены такие семейства (50 префиксов):

`CONTACTOR`, `DISYUNTOR`, `TERMICO`, `AUTOMATICO_III / _IIIN / _IN`, `DIFERENCIAL_III / _IN`, `INTE_II / _III / _IIII`, `SEC_II / _III / _IIII` (seccionador), `RELE`, `RELE1_2D`, `RELE2_2D`, `RELE1_TMP_2D`, `AUXILIAR`, `TEMP_ON`, `TEMP_OFF`, `PUL_SEL / PUL_SET / PUL_ROJ / PUL_VER` (кнопки: селектор, гриб, красная, зелёная), `PILO_AMB / _ROJ / _VER` (лампы), `LED_AMBAR / _ROJO / _VERDE`, `BOTO_SEL / NC / NA / ROJ / AMB / VER` (панель кнопок «Botonera»).

Вывод для вашего клона: **каждое устройство имеет два состояния и три формы показа (символ, 2D, 3D)**.

## 7. Связь с внешним миром

- **LOGO!** (Siemens): сообщения «Conexión LOGO / Sin conexión LOGO», в комплекте `libnodave.dll`. Элемент «LOGO 4DI/4DO».
- **S7-1200 / S7-1500 / ET-200**: «Conexión S7-1200», «Sin conexión S7-1200», элементы «PLC S7-1200», «S7-1200 8DI/8DO», «PLC CPU S7-1500», «S7-1500 DI/DO», «ET-200 8DI/8DO». Для S7-1200 в комплекте NetToPLCsim (мост между сетью и PLCSIM).
- **Arduino UNO**: последовательный порт (COM1–COM4), сообщения «Comunicación establecida con el ARDUINO», «%ld bytes escritos», «Bytes enviados %ld», ошибки таймаута.
- **PC_SIMU**: элементы «Intercambio entradas / salidas PC_SIMU» для обмена с другим экземпляром или программой через IP.
- Общие элементы PLC: «Entrada digital PLC», «Salida digital PLC», «CPU PLC», «Alimentación I/O digital PLC».

## 8. Файлы и форматы

- **Документ:** расширение `.cad` (фильтр «Archivos CADe_SIMU (*.cad)»). Это документ MFC Doc/View, обычно сериализуется бинарно через `CArchive`; **гипотеза, не проверена**. Образца `.cad` в архиве нет, поэтому формат файла я не разбирал.
- **Импорт/экспорт изображений:** `.bmp` («Importar imagen» / «Exportar imagen»), ошибка «Tipo del fichero no válido. Debe ser BM».
- **Пользовательские библиотеки символов:** файлы `<имя>.lib` и индекс `LIBRERIAS.CFG`; ошибки: превышено максимальное число библиотек, библиотека/символ уже существует, нельзя сохранить/удалить. Редактор символа («Editar símbolo»): примитивы LINEA, ELIPSE, ARCO, RELLENO, NUMERO, TEXTO; размер, зум, «Forzado de coordenadas», отдельно рисуются состояния «Símb. OFF» и «Símb. ON» (кнопка «ON = OFF» копирует одно в другое). В списке ресурсов видны пары имён `ARCOD/ARCOU`, `LINEAD/LINEAU` и т. д. (суффиксы D/U, возможно «down/up» = OFF/ON; **гипотеза**).
- **Настройки программы:** `config.cfg`. Формат строки записи в коде: `CADe_SIMU*%1d*%1d*%1d*%1d*%1d*%1d*%1d*%1d*%3d*%3d*%0.4f*%1d*%1d*%3d*%3d*%1d*%1d*%4d$$$`. Это 8 флагов, два трёхзначных числа, число с плавающей точкой (похоже на масштаб), ещё флаги и числа. Соответствие полям окна «Configuration» **не проверено**.

## 9. Чего здесь нет и почему

- **Логика симуляции** (как программа считает цепи, обработку контактов, ladder, таймеров, GRAFCET, моторов) в этом файле не раскрыта: она спрятана в 7,6 МБ машинного кода x86 без символов. Декомпилятора (Ghidra, IDA) в моей среде нет, а установить его не удалось: доступ к pip заблокирован, сети почти нет. Анализ кода без декомпилятора на объёме 7,6 МБ нереалистичен.
- Форматов `.cad` и `.lib` нет: нет ни одного образца.
- Рисунки (316 bitmap, 31,8 МБ) я не выгружал: они нужны только если вы хотите брать оригинальные спрайты; копировать их в свой проект нельзя без разрешения автора.

Чтобы дополнить данные: пришлите 3–5 файлов `.cad` разной сложности (простая схема, пуск звезда-треугольник, ladder, GRAFCET, пневматика) и, если есть, `LIBRERIAS.CFG` с одним `.lib`. Поведение симуляции лучше всего описать по документации автора и по собственным опытам с программой (какие контакты замыкаются при подаче питания на катушку, как ведут себя таймеры и так далее).


---

# ЧАСТЬ B. Что удалось найти в открытых источниках

Я проверил около десятка страниц: учебные курсы, дипломные работы, лабораторные отчёты, статьи по пуску «звезда-треугольник». Вывод честный: **подробных правил работы движка симуляции нигде не опубликовано**. Есть только общие описания и примеры. Ниже то, что подтверждено источниками, и дальше мои рекомендации (они помечены отдельно, это не факты о CADe_SIMU).

## B1. Подтверждённые факты о поведении программы

| Факт | Источник |
|---|---|
| Элементы с **одинаковым именем (Nombre) срабатывают вместе**: контакт, кнопка или реле должны быть названы именем той катушки/компонента, которым управляются, иначе в симуляции не работают | дипломная работа UPCH; слайды «Tutorial cadesimu» |
| У каждого нового элемента **есть имя и номера клемм по умолчанию**; их нужно менять, иначе возможны конфликты с однотипными элементами | UPCH; slideshare |
| **Кнопки без фиксации — моментальные**: надо удерживать левую кнопку мыши на символе, при отпускании элемент возвращается в исходное положение | UPCH |
| В симуляции у каждого компонента виден статус «активен / неактивен», **провода под напряжением меняют цвет** (становятся ярче) | UPCH; cade-simu.com |
| Точки подключения называются **узлами (nodes)**; провода соединяют узлы | slideshare |
| Запуск симуляции — зелёная кнопка «inicio», остановка — красный квадрат | cade-simu.com |
| Документы сохраняются как `.cad`; на странице курса сказано, что расширение при «Guardar como» нужно вписывать вручную | cade-simu.com |
| Можно открыть **несколько окон**, копировать символы и участки схемы между ними; файлы старых версий открываются и симулируются | UPCH |
| Один и тот же лист умеет совмещать символы разных языков: KOP (ladder) и FUP (функциональные блоки) | UPCH |
| Есть связь с **PC_SIMU** (простая SCADA/HMI-программа того же автора) | UPCH |
| Программа не требует установки (ZIP около 1,3 МБ в старых версиях), работает на Windows 98–10 | UPCH |
| В нескольких учебных материалах упомянут **ключ доступа**: без него нельзя сохранять изменения (в вашем 4.2 есть диалог «CLAVE DE ACCESO»). Как именно он работает, не установлено | cade-simu.com; slideshare |
| В пуске «звезда-треугольник» из учебной статьи таймер KA стоит на **4 с**; KM2 и KM3 блокируются нормально закрытым контактом друг друга | profetolocka.com.ar; edeptec.com |
| Лабораторный отчёт описывает симуляцию так: питание идёт по кратчайшему доступному пути к нагрузке; замкнутые/разомкнутые контакторы определяют, пройдёт ли ток; последовательное соединение даёт «И», параллельное — «ИЛИ» | Scribd, «Simulación de Circuitos con Cade-Simu» (по тексту отчёта, таблицы восстановлены неточно) |

## B2. Эталонная схема для проверки движка: пуск «звезда-треугольник»

По статье profetolocka.com.ar (CADe_SIMU 4).

**Силовая часть:** F1 (рубильник с предохранителями), KM1 (линейный контактор), KM2 (звезда), KM3 (треугольник), F3 (тепловое реле), M (двигатель). KM2 и KM3 с механической блокировкой.

**Цепь управления:** F2 (предохранитель), S1 (СТОП, NC), S2 (СТАРТ, NO), катушки KM1/KM2/KM3 с вспомогательными контактами, KA (реле времени), H1 (лампа «работа»), H (красная лампа аварии от теплового реле).

**Ожидаемая последовательность:**
1. S2 включает KM1: двигатель подключён к сети, горит H1.
2. KA получает питание через NC-контакт KM3 и начинает отсчёт.
3. KM2 получает питание через замкнутый контакт KA и NC-контакт KM3: двигатель в звезде.
4. Вспомогательный контакт KM1 параллельно S2 держит цепь после отпускания кнопки (самоподхват).
5. По истечении выдержки (4 с) NC-контакт KA (55-56) размыкается, NO-контакт (57-58) замыкается.
6. KM2 отпускает, KM3 включается: двигатель в треугольнике.
7. NC-контакт KM3 в цепи KA размыкает таймер, второй NC-контакт KM3 в цепи катушки поддерживает KM3.
8. S1 снимает питание управления, все контакторы отпускают, двигатель останавливается.
9. При перегрузке NO-контакты теплового реле (97-98) замыкаются, двигатель останавливается, горит красная лампа H.

Это хороший первый тест для вашего клона: в одной схеме есть самоподхват, блокировки, таймер и защита.

## B3. Чего в открытых источниках нет (и надо добывать опытами)

- как именно считается связность цепи и что считается коротким замыканием;
- как ведут себя двигатели: направление вращения, обрыв фазы, звезда/треугольник по реальной коммутации обмоток;
- точные правила таймеров, бистабильных катушек, телеруптора, счётчиков;
- координаты клемм и размеры символов;
- структура `.cad`;
- правила GRAFCET и ladder (как исполняются шаги, приоритеты, порядок вычисления).

## B4. Программа опытов, которые закрывают эти пробелы

Запустите оригинальную программу, соберите схему, запишите результат. Для каждой записывайте: «что собрал → что увидел». Эти данные можно прислать мне, и я переведу их в правила движка.

1. **Последовательно и параллельно.** Два контактора (или NA-контакта) последовательно и параллельно под лампой: таблица состояний для всех комбинаций.
2. **Имя связывает.** Катушка KM1 и два контакта NA с именем KM1; затем контакт с именем KM2, которого нет; затем две катушки с одинаковым именем. Что срабатывает, есть ли сообщения об ошибке.
3. **Самоподхват.** Кнопка СТАРТ NA, СТОП NC, контакт KM1 параллельно СТАРТ. Проверить удержание, отпускание, порядок нажатий.
4. **Блокировка контакторов.** KM2 и KM3 с взаимными NC-контактами; нажать обе кнопки одновременно.
5. **Таймеры.** Реле с задержкой на включение, на выключение, ON-OFF, интермиттирующее: шкалы ×0,1 с, ×1 с, ×10 с, ×60 с. Записать реальное время работы при разной «Velocidad de simulación» (ползунок).
6. **Контакты таймера.** Все 16 типов контактов (NA/NC/NA+NC/CON для ON, OFF, ON-OFF и вспомогательного).
7. **Бистабильная катушка и телеруптор.** Как ведут себя «Bobina biestable» и «Telerruptor» при повторных импульсах.
8. **Двигатели.** Трёхфазный: подать 3 фазы, 2 фазы, поменять две фазы, звезда, треугольник, YD, Dahlander, двухскоростной. Что показывает символ (вращение, направление, цвет).
9. **Короткое замыкание.** Фаза на нейтраль через провод; фаза на фазу. Что делает программа (предупреждение, сгорание предохранителя, ничего).
10. **Тепловое реле и автоматы.** Как задаётся срабатывание (есть ли параметр тока), как возвращается в исходное.
11. **Датчики.** 2/3-проводные, PNP/NPN: как их надо подключать, чтобы они «работали». Как датчику подаётся срабатывание (щелчок мышью? отдельный объект?).
12. **Ladder, логика, GRAFCET.** Простейшие примеры: AND/OR, SR-триггер, счётчик, шаг GRAFCET с действием S/R/L/D.
13. **Пневматика.** Цилиндр 5/2 с моностабильным и бистабильным клапаном и датчиками положения.
14. **Файлы.** Сохраните пустую схему, схему с одним элементом, с двумя элементами и проводом (три `.cad` разного размера). Присылайте мне: по разнице байтов я определю структуру.

## B5. Рекомендуемая архитектура движка для вашего клона (это мои предложения, а не данные CADe_SIMU)

Проверьте каждую идею опытами из B4 и поправьте.

- **Модель:** граф. Узлы = клеммы элементов; провода объединяют клеммы в электрические сети (union-find). У элементов есть внутренние рёбра: замкнутый контакт соединяет две клеммы, катушка и лампа — нагрузка между двумя клеммами.
- **Источники:** сети, помеченные как L1/L2/L3/N/PE/+/−. Состояние «под напряжением» распространяется обходом графа через замкнутые рёбра.
- **Катушка включена,** если её две клеммы достижимы от разных потенциалов источника (например, L и N, либо + и −).
- **Связь по имени (подтверждено):** состояние катушки с именем X определяет состояние всех контактов с именем X.
- **Цикл вычисления:** повторять «пересчитать сети → обновить катушки → обновить контакты», пока состояние не перестанет меняться (с ограничением числа итераций, чтобы схема с автоколебанием не зависла). Таймеры продвигаются по `dt`, помноженному на скорость симуляции.
- **Ввод пользователя:** кнопки без фиксации — пока зажата мышь (подтверждено); переключатели и селекторы — с фиксацией.
- **Отображение:** состояния «вкл/выкл» для символа, 2D и 3D (подтверждено наличием отдельных изображений); цвет проводов зависит от наличия напряжения (подтверждено).
- **Улучшения, которых нет в оригинале (на ваше усмотрение):** сообщение о коротком замыкании, подсказки по ошибкам именования (контакт без катушки), общий журнал состояний, экспорт в SVG/PDF, undo без ограничений, работа в браузере и на телефоне, совместное редактирование.

## B6. Источники

- [Дипломная работа UPCH (репозиторий)](https://repositorio.upch.edu.pe/bitstreams/3d97967a-4205-4573-bbe5-18d9ae141c1e/download)
- [Tutorial CADe_SIMU (slideshare)](https://www.slideshare.net/slideshow/tutorial-cadesimu/49578206)
- [CADe SIMU Tutorial (cade-simu.com)](https://cade-simu.com/cade-simu-tutorial/)
- [Curso de CADe SIMU (cade-simu.com)](https://cade-simu.com/curso-de-cade-simu/)
- [CADe_Simu 4: arranque estrella-triángulo (profetolocka.com.ar)](https://www.profetolocka.com.ar/2021/07/12/cade_simu-4-arranque-estrella-triangulo/)
- [Arranque estrella-triángulo con temporizador (edeptec.com)](https://www.edeptec.com/2020/10/arranque-estrellatriangulo-temporizado.html)
- [Simulación de circuitos con Cade-Simu (Scribd)](https://es.scribd.com/document/406293751/1)
- [CADe SIMU (Malavida)](https://www.malavida.com/es/soft/cade-simu/)
