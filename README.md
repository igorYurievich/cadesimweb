# CADe SIMU Web

[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![Version](https://img.shields.io/badge/version-0.5.0%20beta-orange.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)

**Español** · [English](#english)

Editor de esquemas eléctricos y simulador de automatismos que funciona en el navegador. Compatible con los
archivos `.cad` de CADe SIMU 4.x: abre tus esquemas, simúlalos y guárdalos de nuevo sin instalar nada.

**Pruébalo en línea:** https://webcade3.netlify.app/

> ⚠️ Versión **beta** (0.5.0). Puede contener errores y algunos componentes todavía no tienen todas sus funciones.

## Contenido

- [Qué puedes hacer](#qué-puedes-hacer)
- [Compatibilidad con CADe SIMU](#compatibilidad-con-cade-simu)
- [Instalación local](#instalación-local)
- [Comandos](#comandos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Autor](#autor)
- [Licencia](#licencia)

## Qué puedes hacer

**Dibujar esquemas**
- Cuadrícula, nodos y cableado con enrutamiento automático.
- Varias pestañas, deshacer y rehacer, copiar, cortar y pegar (Ctrl+C / Ctrl+X / Ctrl+V).
- Marco de hoja con cajetín, texto libre y vista previa de impresión.
- Arrastra un archivo `.cad` o `.json` a la ventana para abrirlo en una pestaña nueva.

**Componentes**
- Alimentación, magnetotérmicos, diferenciales, fusibles, seccionadores y transformadores.
- Contactores, relés, temporizadores, relés térmicos, pulsadores, finales de carrera y pilotos.
- Motores (incluidos Dahlander y de dos velocidades) y variadores de frecuencia.
- Detectores de proximidad y fotoeléctricos, barrera fotoeléctrica.
- Mecanismos de instalaciones de vivienda y automático de escalera.
- PLC LOGO! y Siemens S7-1200, esquemas en contactos (Ladder) y GRAFCET.
- Símbolos realistas 2D (contactores, automáticos, pulsadores, pilotos, bornas, variador…).
- Ascensor de 5 plantas con motor, puertas, sensores de planta y fotocélula.

**Simular**
- Lógica de relés: autorretención, enclavamientos, temporizaciones, arranque estrella-triángulo y por
  autotransformador.
- Disparo de protecciones y avisos de cortocircuito.
- Animación de contactos, motores, pilotos, variadores y del ascensor; cables con corriente resaltados.
- Velocidad de simulación ajustable.

**Más**
- Exportación a PDF e impresión.
- Ejemplos de esquemas incluidos en la aplicación.
- Interfaz en español, inglés, francés, italiano y ruso.
- Guardado automático en el navegador: el esquema y el zoom se recuperan al volver.
- Funciona sin conexión (PWA) y se adapta a pantallas táctiles.
- Iconos grandes en la paleta para mejorar la visibilidad.

## Compatibilidad con CADe SIMU

La aplicación lee y escribe archivos `.cad` de CADe SIMU 4.x. Un esquema guardado aquí se puede abrir en
CADe SIMU y al revés. Algunos componentes existen solo en la versión web (por ejemplo, el ascensor o el
sensor réflex); CADe SIMU no los mostrará.

La descripción completa del formato está en [FORMATO_CAD.md](FORMATO_CAD.md).

## Instalación local

Se necesita [Node.js](https://nodejs.org/) 20 o posterior.

```bash
git clone https://github.com/igorYurievich/cadesimweb.git
cd cadesimweb
npm ci
npm run dev
```

Abre la dirección que muestra Vite, normalmente http://localhost:5173.

Para publicar la aplicación, ejecuta `npm run build` y sube la carpeta `dist/` a cualquier hosting estático
(Vercel, Netlify, GitHub Pages…).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Comprueba los tipos y genera `dist/` |
| `npm run preview` | Sirve localmente la versión compilada |
| `npm test` | Ejecuta las pruebas (Vitest) |
| `npm run test:watch` | Pruebas en modo observación |
| `npm run typecheck` | Comprueba los tipos de TypeScript |

## Estructura del proyecto

```text
src/
  model/    Modelo del esquema, catálogo y lectura/escritura de .cad
  engine/   Motor de simulación (sin DOM ni APIs del navegador)
  ui/       Interfaz: lienzo, paleta, propiedades, menús, traducciones
  data/     Catálogo de componentes y ejemplos
  main.ts   Punto de entrada
tests/      Pruebas automatizadas y esquemas de prueba
public/     Iconos, manifiesto PWA y service worker
tools/      Plugins de compilación
FORMATO_CAD.md   Descripción del formato .cad
AGENTS.md        Reglas para colaboradores y asistentes de IA
```

TypeScript en modo estricto, Vite y Vitest, sin dependencias en tiempo de ejecución. Las pruebas cubren el
motor de simulación, el formato `.cad`, el catálogo y escenarios con esquemas reales de clase.

## Autor

**Igor Lipskiy Vyatchin**, estudiante de ingeniería eléctrica en IES Las Lagunas.

Proyecto educativo independiente y sin fines comerciales. No está afiliado, respaldado ni asociado con los
autores de CADe SIMU. «CADe SIMU» es una marca de sus respectivos propietarios.

## Licencia

El código fuente se distribuye bajo la [licencia MIT](LICENSE): puedes usarlo, copiarlo, modificarlo y
distribuirlo libremente, siempre que conserves el aviso de copyright.

Los archivos de ejemplo tomados de CADe SIMU (`src/data/examples/Ejemplos/` y `Ejemplos 2/`) pertenecen a
sus autores y no están cubiertos por esta licencia.

---

<a id="english"></a>

## English

An electrical schematic editor and control-circuit simulator that runs in the browser. It works with
CADe SIMU 4.x `.cad` files: open your schematics, simulate them and save them again, with nothing to install.

**Try it online:** https://webcade3.netlify.app/

> ⚠️ **Beta** version (0.5.0). It may contain bugs, and some components are not fully functional yet.

### Features

- **Editor:** grid, junctions, automatic wire routing, tabs, undo/redo, copy/cut/paste, sheet frame with
  title block, free text, print preview, drag-and-drop to open `.cad` / `.json` files.
- **Components:** power supplies, breakers, RCDs, fuses, disconnectors, transformers, contactors, relays,
  timers, thermal overloads, push buttons, limit switches, pilot lights, motors (incl. Dahlander and
  two-speed), variable frequency drives, proximity and photoelectric sensors, household wiring
  devices, staircase timer, LOGO! and Siemens S7-1200 PLCs, Ladder diagrams, GRAFCET, realistic 2D
  symbols and a 5-floor lift.
- **Simulation:** self-holding circuits, interlocks, timers, star-delta and autotransformer starting,
  protection tripping, short-circuit warnings, animated devices, highlighted live wires, adjustable speed.
- **Also:** PDF export and printing, built-in examples, interface in Spanish, English, French, Italian and
  Russian, browser autosave, offline support (PWA), touch screens, large palette icons.

### CADe SIMU compatibility

The app reads and writes CADe SIMU 4.x `.cad` files, so a schematic saved here opens in CADe SIMU and vice
versa. A few components are web-only (such as the lift or the reflex sensor) and will not appear in
CADe SIMU. The format is documented in [FORMATO_CAD.md](FORMATO_CAD.md) (Spanish).

### Run locally

Requires [Node.js](https://nodejs.org/) 20 or later.

```bash
git clone https://github.com/igorYurievich/cadesimweb.git
cd cadesimweb
npm ci
npm run dev
```

Open the address printed by Vite, usually http://localhost:5173. To deploy, run `npm run build` and upload
`dist/` to any static host. See the [command table](#comandos) above for the other scripts.

### Author

**Igor Lipskiy Vyatchin**, electrical engineering student at IES Las Lagunas.

This is an independent, non-commercial educational project. It is not affiliated with, endorsed by, or
associated with the authors of CADe SIMU. "CADe SIMU" is a trademark of its respective owners.

### License

The source code is released under the [MIT License](LICENSE). Example files taken from CADe SIMU
(`src/data/examples/Ejemplos/` and `Ejemplos 2/`) belong to their authors and are not covered by this license.
