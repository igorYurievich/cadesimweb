# CADe SIMU Web

## Español

Editor web de esquemas eléctricos y simulador de lógica de relés, inspirado en CADe SIMU. Dibuja un esquema, inicia la simulación y observa el funcionamiento de contactores, relés, temporizadores y motores.

**Versión en línea:** https://webcade3.netlify.app/

> ⚠️ El proyecto está en fase **beta** (versión 0.1.8). Puede contener errores y algunos componentes pueden tener funciones incompletas.

### Independencia del proyecto

Este es un proyecto educativo independiente y sin fines comerciales. No está afiliado, respaldado ni asociado con los autores o desarrolladores de CADe SIMU.

### Funciones

- **Editor de esquemas:** cuadrícula, nodos, cableado con enrutamiento automático, varias pestañas, deshacer y rehacer, copiar, cortar y pegar (Ctrl+C / Ctrl+X / Ctrl+V), marco de hoja.
- **Catálogo de componentes:** fuentes de alimentación, interruptores automáticos, fusibles, contactores, relés, temporizadores, pulsadores, finales de carrera, lámparas, motores, transformadores y más.
- **Simulación de lógica de relés:** auto-mantenimiento, enclavamientos, retardos, arranque estrella-triángulo, arranque con autotransformador, relés térmicos, control manual y avisos de cortocircuito.
- **Formato `.cad`:** importación y exportación de archivos CADe SIMU 4.x. Consulta [FORMATO_CAD.md](FORMATO_CAD.md).
- **Exportación a PDF** y ejemplos de esquemas incluidos en la aplicación.
- **Idiomas disponibles en el selector:** español, inglés, italiano, ruso y francés. La traducción al árabe se conserva, pero su opción está temporalmente oculta.
- **Guardado automático** en el navegador; el esquema y el zoom se restauran al volver a abrir la aplicación.

### Inicio rápido

Se necesita [Node.js](https://nodejs.org/) 20 o posterior.

```bash
git clone <URL-del-repositorio>
cd proj
npm ci
npm run dev
```

Abre la dirección que indique Vite, normalmente http://localhost:5173.

### Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Comprueba los tipos y genera `dist/` |
| `npm run preview` | Sirve localmente la versión compilada |
| `npm test` | Ejecuta las pruebas con Vitest |
| `npm run test:watch` | Ejecuta las pruebas en modo observación |
| `npm run typecheck` | Comprueba los tipos de TypeScript |

### Estructura del proyecto

```text
src/
  model/    Modelo del esquema, catálogo y lectura/escritura de `.cad`
  engine/   Motor de simulación sin dependencias del DOM
  ui/       Interfaz, lienzo, paleta, propiedades, menús y traducciones
  data/     Catálogo de componentes y ejemplos de esquemas
  main.ts   Punto de entrada
tests/      Pruebas automatizadas y esquemas de prueba
data/reference/   Catálogo de componentes de referencia
FORMATO_CAD.md    Descripción del formato `.cad`
```

El motor (`src/engine`) recibe un esquema y entradas, y devuelve el estado de simulación. No depende de la interfaz ni accede al DOM.

El código usa los alias `@engine/*`, `@model/*` y `@ui/*`.

### Pruebas

Las pruebas automatizadas cubren el motor de simulación, el formato `.cad`, el catálogo, temporizadores, protecciones, motores y escenarios de esquemas. Para ejecutarlas:

```bash
npm test
```

### Tecnologías

TypeScript en modo estricto, Vite y Vitest. No hay dependencias externas en tiempo de ejecución.

### Autor

Igor Lipskiy Vyatchin, estudiante de segundo curso de ingeniería eléctrica en IES Las Lagunas. Proyecto educativo gratuito y sin fines comerciales.

---

## English

An electrical schematic editor and relay-logic simulator for the web, inspired by CADe SIMU. Draw a schematic, start the simulation, and observe contactors, relays, timers, and motors in action.

**Online version:** https://webcade3.netlify.app/

> ⚠️ This project is in **beta** (version 0.1.8). It may contain bugs, and some components may have incomplete functionality.

### Project independence

This is an independent, non-commercial educational project. It is not affiliated with, endorsed by, or associated with the authors or developers of CADe SIMU.

### Features

- **Schematic editor:** grid, junctions, automatic wire routing, multiple document tabs, undo and redo, copy, cut and paste (Ctrl+C / Ctrl+X / Ctrl+V), and a sheet frame.
- **Component catalog:** power supplies, circuit breakers, fuses, contactors, relays, timers, push buttons, limit switches, lamps, motors, transformers, and more.
- **Relay-logic simulation:** self-holding circuits, interlocks, timer delays, star-delta starting, autotransformer starting, thermal relays, manual controls, and short-circuit warnings.
- **`.cad` format:** import and export for CADe SIMU 4.x files. See [FORMATO_CAD.md](FORMATO_CAD.md).
- **PDF export** and built-in schematic examples.
- **Languages currently available in the selector:** Spanish, English, Italian, Russian, and French. The Arabic translation remains in the project, but its selector option is temporarily hidden.
- **Browser autosave:** the schematic and canvas zoom are restored when the app is reopened.

### Quick start

[Node.js](https://nodejs.org/) 20 or later is required.

```bash
git clone <repository-URL>
cd proj
npm ci
npm run dev
```

Open the address printed by Vite, usually http://localhost:5173.

### Commands

| Command | Description |
|---|---|
| `npm run dev` | Starts the development server |
| `npm run build` | Type-checks and builds the app into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm test` | Runs the Vitest suite |
| `npm run test:watch` | Runs tests in watch mode |
| `npm run typecheck` | Runs the TypeScript type check |

### Project structure

```text
src/
  model/    Schematic model, component catalog, and `.cad` import/export
  engine/   Simulation engine with no DOM dependencies
  ui/       Interface, canvas, palette, properties, menus, and translations
  data/     Component catalog and schematic examples
  main.ts   Application entry point
tests/      Automated tests and test schematics
data/reference/   Reference component catalog
FORMATO_CAD.md    `.cad` format description
```

The engine (`src/engine`) takes a schematic and inputs, then returns the simulation state. It does not depend on the UI or access the DOM.

The code uses the `@engine/*`, `@model/*`, and `@ui/*` import aliases.

### Tests

The automated tests cover the simulation engine, `.cad` format, component catalog, timers, protection devices, motors, and schematic scenarios. Run them with:

```bash
npm test
```

### Technologies

TypeScript in strict mode, Vite, and Vitest. There are no external runtime dependencies.

### Author

Igor Lipskiy Vyatchin, a second-year electrical engineering student at IES Las Lagunas. This is a free, non-commercial educational project.
