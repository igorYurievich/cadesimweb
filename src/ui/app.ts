import { getCadType } from '@model/cad-types';
import type { GroupKey, Lang } from '@model/catalog';
import { createEmptySchema } from '@model/index';
import { parseSchemaJson, serializeSchemaJson } from '@model/schema-json';
import { EXAMPLES } from '../data/examples';
import type { Schema, SchemaElement, WireKind, WireSegment } from '@model/types';
import { canRedo, canUndo, createHistory, redoHistory, undoHistory } from './history';
import { createAppContext } from './context';
import { setupBetaNotice } from './beta-notice';
import { setupExport } from './export';
import { setupMenus } from './menus';
import { setupSimulation, setupSimulationSpeedControl } from './sim-controller';
import { setupPalette } from './palette';
import { setupPropertiesPanel, setupPropertyFields } from './properties';
import { setupSheetFrame } from './sheet-frame';
import { setupSchemaRenderer } from './schema-renderer';
import { setupWireDraft } from './wire-draft';
import { setupPlacementGhost } from './placement-ghost';
import { setupSelectionCommands } from './selection-commands';
import { setupMovePreview } from './move-preview';
import { setupCanvasPointerMove, setupCanvasPointerEnd } from './canvas-pointer-move';
import { setupCanvasPointerDown } from './canvas-pointer-down';
import { setupCanvasDoubleClick } from './canvas-double-click';
import { setupSimulationContextMenuEvents, setupWireContextMenu } from './context-menu-events';
import { setupViewportControls } from './viewport-controls';
import { setupDocumentOpen, setupDocumentInputEvents } from './document-io';
import { setupNodeTool } from './node-tool';
import { setupPaletteDrop } from './palette-drop';
import { setupStampEditor } from './stamp-editor';
import { setupToolModes } from './tool-modes';
import { setupHistoryUi } from './history-ui';
import { setupInterfaceTranslation } from './interface-translation';
import { setupKeyboardShortcuts } from './keyboard-shortcuts';
import { fitViewport, MAX_VIEWPORT_SCALE, MIN_VIEWPORT_SCALE, screenToSheet } from './viewport';
import type { Point, Viewport } from './viewport';
import { detectBundleLayout, isWireInteriorPoint, offsetRoute, orthogonalize, simplifyRoute } from './wire-routing';
import './viewport.css';
import { FALLBACK_VIEWPORT, AUTOSAVE_KEY, OPTIONAL_GROUP_STORAGE_KEY, OPTIONAL_PALETTE_GROUPS, CAD_GRID_STEP, PLACEABLE_TYPES, THEME_KEY, GRID_KEY, WIRE_COLOR_MODE_KEY, INTERFACE_LANGUAGE_KEY } from './constants';
import type { Theme, Selectable, DragState } from './constants';
import { fullSheet, cloneSchema } from './helpers';
import { INTERFACE_TEXT } from './i18n';






function readOptionalPaletteGroups(): GroupKey[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(OPTIONAL_GROUP_STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? OPTIONAL_PALETTE_GROUPS.filter((key) => raw.includes(key)) : [];
  } catch { return []; }
}
function readAutosavedSchema(): Schema | undefined {
  try {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    return saved ? parseSchemaJson(saved) : undefined;
  } catch { return undefined; }
}
const DOCUMENT_TABS_KEY = 'cadesimu-web:documents:v1';
interface DocumentTab { id: string; name: string; schema: Schema; history: ReturnType<typeof createHistory<Schema>>; viewport: Viewport; }
function readSavedDocuments(): { activeId: string; tabs: Array<{ id: string; name: string; schema: Schema }> } | undefined {
  try {
    const raw = localStorage.getItem(DOCUMENT_TABS_KEY); if (!raw) return undefined;
    const saved = JSON.parse(raw) as { activeId?: unknown; tabs?: unknown };
    if (!Array.isArray(saved.tabs)) return undefined;
    const tabs = saved.tabs.flatMap((item): Array<{ id: string; name: string; schema: Schema }> => {
      try {
        if (!item || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.schema !== 'string') return [];
        return [{ id: item.id, name: item.name, schema: parseSchemaJson(item.schema) }];
      } catch { return []; }
    });
    if (!tabs.length) return undefined;
    return { activeId: tabs.some((tab) => tab.id === saved.activeId) ? String(saved.activeId) : tabs[0]!.id, tabs };
  } catch { return undefined; }
}
/** Шаг сетки равен шагу привязки элементов и проводов (3): все клеммы лежат на узлах сетки. */




/** Цвет проводов без потенциала: спокойный, чтобы подсветка под напряжением читалась сразу. */


/** Единый режим: фазный провод (L1/L2/L3) под напряжением красный, без — серый; N и PE остаются синим и зелёным. */


/** Нижняя полоса листа под штамп: она вне поля рисования. */


/** Ссылка на исходники: кликабельна в редакторе, в SVG и в PDF (Chrome сохраняет SVG-ссылки как аннотации). */



/** Ячейки штампа во всю ширину листа: x0/x1 — доли ширины, r0/r1 — строки (из 3). */



/** Автоматы, выключатели и защиты с ручным включением; при старте симуляции все выключены. */

/** Тепловая защита двигателя 6007 при старте симуляции уже взведена (включена); остальные аппараты включает пользователь. */




/** Смещение подписи при размещении, как у образца elementos_contactores.cad: имя стоит слева от символа, а не поверх полюсов. */






/** Хэш пароля (SHA-256); запасной FNV-1a нужен, если crypto.subtle недоступен (не https). Это лишь простой барьер на стороне клиента. */


 




function readGridVisible(): boolean {
  try { return localStorage.getItem(GRID_KEY) !== 'off'; } catch { return true; }
}

/** По умолчанию включён единый режим: красный — под напряжением, серый — нет. */
function readUniformWireColors(): boolean {
  try { return localStorage.getItem(WIRE_COLOR_MODE_KEY) !== 'phase'; } catch { return true; }
}

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Storage may be unavailable in private or embedded contexts. */ }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}


















/** Mount the SVG viewer for a CADe SIMU sheet. */
export function mountApp(root: HTMLElement): void {
  const savedDocuments = readSavedDocuments();
  const autosavedSchema = readAutosavedSchema();
  let schema: Schema = savedDocuments?.tabs.find((tab) => tab.id === savedDocuments.activeId)?.schema ?? autosavedSchema ?? createEmptySchema();
  let history = createHistory(cloneSchema(schema));
  const ctx = createAppContext(root, () => schema, (next) => { schema = next; }, () => history, (next) => { history = next; });
  let syncActiveDocument = (): void => {};
  let persistDocuments = (): void => {};
  let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
  const persistSchemaNow = (): void => {
    if (autosaveTimer !== undefined) clearTimeout(autosaveTimer);
    autosaveTimer = undefined;
    try { localStorage.setItem(AUTOSAVE_KEY, serializeSchemaJson(ctx.schema)); } catch { /* Editor remains usable when storage is unavailable. */ }
    syncActiveDocument(); persistDocuments();
  };
  const persistSchema = (): void => {
    if (autosaveTimer !== undefined) return;
    autosaveTimer = setTimeout(() => {
      persistSchemaNow();
    }, 500);
  };
  let theme = readTheme();
  let refreshInterface = (): void => {};
  const visibleOptionalGroups = new Set<GroupKey>(readOptionalPaletteGroups());
  root.innerHTML = `
    <main class="app-shell">
      <header class="app-header">
        <div class="brand-lockup" title="Редактор и симулятор электрических схем">
          <h1>Web Cade</h1>
        </div>
        <nav class="app-menu" aria-label="Главное меню">
          <details class="menu-group"><summary>Файл</summary><div class="menu-popover">
            <button type="button" class="menu-command" data-command="new">Новая схема <kbd>Ctrl+N</kbd></button>
            <button type="button" class="menu-command" data-command="open">Открыть .cad / .json <kbd>Ctrl+O</kbd></button>
            <button type="button" class="menu-command" data-command="save-json">Сохранить JSON <kbd>Ctrl+S</kbd></button>
            <button type="button" class="menu-command" data-command="export-cad">Экспорт .cad</button>
            <button type="button" class="menu-command" data-command="export-svg">Экспорт SVG</button>
            <button type="button" class="menu-command" data-command="export-png">Экспорт PNG</button>
            <button type="button" class="menu-command" data-command="print-pdf">Печать / PDF</button>
            <button type="button" class="menu-command" data-command="sheet">Размер листа (Ajustar hoja)…</button>
          </div></details>
          <details class="menu-group"><summary>Правка</summary><div class="menu-popover">
            <button type="button" class="menu-command" data-command="copy-selection">Копировать <kbd>Ctrl+C</kbd></button>
            <button type="button" class="menu-command" data-command="paste-selection" disabled>Вставить <kbd>Ctrl+V</kbd></button>
            <button type="button" class="menu-command" data-command="undo">Отменить <kbd>Ctrl+Z</kbd></button>
            <button type="button" class="menu-command" data-command="redo">Повторить <kbd>Ctrl+Y</kbd></button>
            <button type="button" class="menu-command" data-command="rotate">Повернуть <kbd>R</kbd></button>
            <button type="button" class="menu-command" data-command="delete">Удалить <kbd>Del</kbd></button>
          </div></details>
          <details class="menu-group"><summary>Вид</summary><div class="menu-popover">
            <button type="button" class="menu-command" data-command="zoom-in">Увеличить <kbd>+</kbd></button>
            <button type="button" class="menu-command" data-command="zoom-out">Уменьшить <kbd>−</kbd></button>
            <button type="button" class="menu-command" data-command="fit">Показать всё <kbd>Ctrl+0</kbd></button>
            <button type="button" class="menu-command" data-command="grid" id="grid-command"></button>
            <button type="button" class="menu-command" data-command="properties-panel" id="properties-panel-command"></button>
            <button type="button" class="menu-command" data-command="theme" id="theme-command"></button>
            <button type="button" class="menu-command" data-command="wire-colors" id="wire-colors-command"></button>
          </div></details>
          <details class="menu-group optional-groups-menu"><summary>Элементы</summary><div class="menu-popover">
            <p class="menu-heading optional-groups-heading">Показывать дополнительные категории</p>
            <div class="menu-toggle-list">
              <label class="menu-toggle"><input type="checkbox" data-optional-group="grafcet"><span data-extra-label="extraGrafcet">GRAFCET</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="ladder"><span data-extra-label="extraLadder">Ladder</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="logic"><span data-extra-label="extraLogic">Логика</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="realistic-2d"><span data-extra-label="extraReal2d">Реалистичные символы · 2D</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="realistic-3d"><span data-extra-label="extraReal3d">Реалистичные символы · 3D</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="wiring"><span data-extra-label="extraWiring">Провода и соединения</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="pneumatics"><span data-extra-label="extraPneumatics">Пневматические актуаторы</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="io-plc"><span data-extra-label="extraIoPlc">Входы / выходы ПЛК</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="power-electronics"><span data-extra-label="extraPowerElectronics">Силовая электроника</span></label>
              <label class="menu-toggle"><input type="checkbox" data-optional-group="electronic-relays"><span data-extra-label="extraElectronicRelays">Электронные реле</span></label>
            </div>
          </div></details>
          <details class="menu-group language-menu"><summary>Язык</summary><div class="menu-popover">
            <label class="menu-language">Язык названий элементов
              <select id="palette-language" aria-label="Язык названий"><option value="es">ES — Español</option><option value="en">EN — English</option><option value="it">IT — Italiano</option><option value="ru">RU — Русский</option><option value="fr">FR — Français</option><option value="ar">AR — العربية (الفصحى)</option></select>
            </label>
          </div></details>
          <details class="menu-group"><summary>Примеры</summary><div class="menu-popover">
            <div class="menu-examples">${EXAMPLES.map((example) => `<button type="button" class="menu-command" data-example="${example.number}" title="Actividad ${example.code}"><span>${example.number}. ${example.title}</span><kbd>${example.code}</kbd></button>`).join('')}</div>
          </div></details>
          <details class="menu-group"><summary>Справка</summary><div class="menu-popover">
            <button type="button" class="menu-command" data-command="shortcuts">Горячие клавиши</button>
            <button type="button" class="menu-command" data-command="about">О программе</button>
          </div></details>
        </nav>
        <span id="file-name" class="file-name">Новая схема</span>
        <input id="cad-file" type="file" accept=".cad,.json,application/json,text/plain" />
      </header>
      <section class="viewport-toolbar" aria-label="Провода и симуляция">
        <div class="tool-group wire-controls" aria-label="Провода">
          <select id="wire-kind" aria-label="Тип нового провода"><option value="phase">Фаза</option><option value="neutral">Нейтраль</option><option value="protection">PE</option><option value="three">3 фазы (L1 L2 L3)</option><option value="threeN">3 фазы + N</option></select>
          <button type="button" id="draw-wire" title="Провод (C)">Провод</button>
          <button type="button" id="finish-wire" disabled>Готово</button>
          <span class="tool-sep" aria-hidden="true"></span>
          <button type="button" id="undo" class="icon-btn" title="Отменить (Ctrl+Z)" aria-label="Отменить" disabled>↶</button>
          <button type="button" id="redo" class="icon-btn" title="Повторить (Ctrl+Y)" aria-label="Повторить" disabled>↷</button>
          <span class="tool-sep" aria-hidden="true"></span>
          <button type="button" id="select-tool" class="icon-btn is-active" title="Курсор: выбор и перемещение элементов (V)" aria-label="Курсор" aria-pressed="true">↖</button>
          <button type="button" id="pan-tool" class="icon-btn" title="Рука: перемещение листа без выбора элементов (H)" aria-label="Рука" aria-pressed="false">✋</button>
          <button type="button" id="node-tool" class="icon-btn" title="Узел: щёлкните по месту соединения проводов (N)" aria-label="Узел" aria-pressed="false">●</button>
        </div>
        <div class="tool-group simulation-controls" aria-label="Управление симуляцией">
          <button type="button" id="sim-run">▶ Запуск</button>
          <button type="button" id="sim-stop" title="Полная остановка: сброс времени, памяти и нажатых кнопок" disabled>■ Стоп</button>
          <div class="simulation-speed" role="group" aria-label="Скорость симуляции"><button type="button" class="speed-btn" id="speed-cycle" title="Изменить скорость симуляции" aria-label="Скорость симуляции: 1×">1×</button></div>
          <span id="sim-state" class="simulation-state" role="status" aria-live="polite">Редактор</span>
        </div>
      </section>
      <!-- Служебные элементы: действия доступны через меню и горячие клавиши, логика привязана к ним по id -->
      <div hidden>
        <select id="place-type" aria-label="Разместить элемент"><option value="">—</option>${PLACEABLE_TYPES.map((code) => `<option value="${code}">${getCadType(code).label}</option>`).join('')}</select>
        <button type="button" id="rotate-selection">Повернуть</button>
        <button type="button" id="delete-selection">Удалить</button>
        <button type="button" data-zoom="out">−</button><button type="button" data-zoom="in">+</button><button type="button" data-zoom="fit">Показать всё</button>
      </div>
      <div id="simulation-message" class="simulation-message" role="alert" aria-live="assertive" hidden></div>
      <div class="editor-workspace">
        <aside class="component-palette" aria-label="Палитра элементов">
          <div class="palette-heading"><h2>Элементы</h2><span id="palette-count"></span></div>
          <div class="palette-search-row">
            <input id="palette-search" type="search" placeholder="Поиск элементов…" aria-label="Поиск элементов" />
          </div>
          <div id="palette-groups" class="palette-groups"></div>
        </aside>
        <section class="viewport-stage" aria-label="Поле схемы">
        <nav id="document-tabs" class="document-tabs" aria-label="Открытые схемы"></nav>
        <svg class="viewport-svg" viewBox="0 0 ${FALLBACK_VIEWPORT.width} ${FALLBACK_VIEWPORT.height}" preserveAspectRatio="none" role="img" aria-label="Поле схемы">
          <defs><pattern id="cad-grid" x="${-CAD_GRID_STEP / 2}" y="${-CAD_GRID_STEP / 2}" width="${CAD_GRID_STEP}" height="${CAD_GRID_STEP}" patternUnits="userSpaceOnUse">
            <circle cx="${CAD_GRID_STEP / 2}" cy="${CAD_GRID_STEP / 2}" r="0.24" fill="#7d8996" />
          </pattern></defs>
          <rect class="viewport-backdrop" x="0" y="0" width="${FALLBACK_VIEWPORT.width}" height="${FALLBACK_VIEWPORT.height}" />
          <g id="sheet-transform">
            <rect id="sheet-paper" x="0" y="0" width="279" height="210" fill="#fff" />
            <rect id="sheet-grid" x="0" y="0" width="279" height="210" fill="url(#cad-grid)" />
            <rect id="sheet-border" x="0" y="0" width="279" height="210" fill="none" stroke="#aeb8c4" stroke-width="0.8" />
            <g id="wire-layer" />
            <g id="element-layer" />
            <g id="selection-layer" />
            <g id="draft-layer" />
            <g id="sheet-frame" />
            <g id="sheet-stamp" />
          </g>
        </svg>
        </section>
        <aside id="properties-panel" class="properties-panel" aria-label="Свойства элемента">
          <div class="properties-head"><h2>Свойства</h2><button type="button" id="properties-close" class="properties-close" title="Готово">Готово</button></div><div id="property-fields" class="property-fields"></div>
        </aside>
      </div>
      <footer class="app-footer">
        <div id="status" class="status-bar" role="status" aria-live="polite">Выберите файл .cad, чтобы открыть схему.</div>
        <output id="cursor-coords" class="cursor-coords" title="X / Y, мм">X: — Y: —</output>
        <output id="zoom-value" class="zoom-value" aria-live="polite" title="Масштаб">100%</output>
        <span class="viewport-help">Клик — выбрать · Перетащить — двигать · Рамка — пустое место · Пробел / средняя кнопка — панорама</span>
      </footer>
      <dialog id="sheet-dialog" class="app-dialog sheet-dialog" aria-labelledby="sheet-title">
        <h2 id="sheet-title">Размер листа</h2>
        <div class="sheet-fields">
          <label class="property-field">Формат
            <select id="sheet-format">
              <option value="custom">Пользовательский</option><option value="279x210">A4 — альбомный</option><option value="210x279">A4 — книжный</option><option value="420x297">A3 — альбомный</option><option value="297x420">A3 — книжный</option>
            </select>
          </label>
          <div class="sheet-size-row">
            <label class="property-field">Ширина, мм<input id="sheet-width" type="number" min="30" max="2000" step="1" /></label>
            <label class="property-field">Высота, мм<input id="sheet-height" type="number" min="30" max="2000" step="1" /></label>
          </div>
        </div>
        <div class="dialog-actions"><button type="button" data-dialog-close="sheet-dialog">Отмена</button><button type="button" class="primary-action" id="sheet-apply">Применить</button></div>
      </dialog>
      <dialog id="shortcuts-dialog" class="app-dialog shortcuts-dialog" aria-labelledby="shortcuts-title">
        <h2 id="shortcuts-title">Горячие клавиши</h2>
        <dl>
          <div><dt id="shortcut-new">Новая схема</dt><dd><kbd>Ctrl</kbd> + <kbd>N</kbd></dd></div>
          <div><dt id="shortcut-open">Открыть файл .cad</dt><dd><kbd>Ctrl</kbd> + <kbd>O</kbd></dd></div>
          <div><dt id="shortcut-copy-paste">Копировать / вставить выделенное</dt><dd><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>V</kbd></dd></div>
          <div><dt id="shortcut-undo-redo">Отменить / повторить</dt><dd><kbd>Ctrl</kbd> + <kbd>Z</kbd> / <kbd>Y</kbd></dd></div>
          <div><dt id="shortcut-rotate">Повернуть</dt><dd><kbd>R</kbd></dd></div>
          <div><dt id="shortcut-delete">Удалить выбранное</dt><dd><kbd>Delete</kbd></dd></div>
          <div><dt id="shortcut-wire">Режим провода</dt><dd><kbd>C</kbd></dd></div>
          <div><dt id="shortcut-wire-type">Переключить тип провода</dt><dd><kbd>↑</kbd> / <kbd>↓</kbd> / <kbd>←</kbd> / <kbd>→</kbd></dd></div>
          <div><dt id="shortcut-finish">Завершить провод / отменить действие</dt><dd><kbd>Enter</kbd> / <kbd>Esc</kbd></dd></div>
          <div><dt id="shortcut-cursor-pan">Курсор / Рука</dt><dd><kbd>V</kbd> / <kbd>H</kbd></dd></div>
          <div><dt id="shortcut-panning">Панорамирование</dt><dd><kbd>Space</kbd> + перетаскивание</dd></div>
          <div><dt id="shortcut-zoom">Масштаб</dt><dd><kbd>+</kbd> / <kbd>−</kbd></dd></div>
          <div><dt id="shortcut-fit">Показать всё</dt><dd><kbd>Ctrl</kbd> + <kbd>0</kbd></dd></div>
        </dl>
        <div class="dialog-actions"><button type="button" data-dialog-close="shortcuts-dialog">Закрыть</button></div>
      </dialog>
      <dialog id="about-dialog" class="app-dialog about-dialog" aria-labelledby="about-title">
        <div class="about-mark" aria-hidden="true">CS</div>
        <h2 id="about-title">Web Cade</h2>
        <p>Редактор электрических схем и симулятор релейной логики.</p>
        <p id="about-bio">Автор — Igor Lipskiy Vyatchin, студент 2 курса Sistemas Electrotécnicos y Automatizados центра IES Lagunas.</p>
        <p id="about-noncommercial">Проект некоммерческий: ничего здесь не продаётся и продавать никто не будет.</p>
        <p class="about-contact"><span id="about-contact-label">По любым вопросам:</span> <a href="mailto:igoryurievich1@gmail.com">igoryurievich1@gmail.com</a></p>
        <p class="about-repository"><a href="https://github.com/igorYurievich/cadesimweb" target="_blank" rel="noopener noreferrer">GitHub: github.com/igorYurievich/cadesimweb</a></p>
        <dl><div><dt>Автор</dt><dd>Igor Lipskiy Vyatchin</dd></div><div><dt>Версия</dt><dd>0.1.0</dd></div></dl>
        <div class="dialog-actions"><button type="button" data-dialog-close="about-dialog">Закрыть</button></div>
      </dialog>
      <dialog id="beta-dialog" class="app-dialog beta-dialog" aria-labelledby="beta-title">
        <h2 id="beta-title">Бета-версия</h2>
        <p id="beta-text">Это бета-версия. Логика всех компонентов ещё не доработана, поэтому симуляция может работать некорректно.</p>
        <div class="dialog-actions"><button type="button" class="primary-action" id="beta-ok">Понятно</button></div>
      </dialog>
      <div id="simulation-context-menu" class="simulation-context-menu" role="menu" hidden>
        <button type="button" id="simulate-overload" role="menuitem">Имитировать перегрузку</button>
        <button type="button" id="reset-simulation-inputs" role="menuitem">Reset</button>
      </div>
    </main>`;
  root.dataset.theme = theme;
  const themeCommand = root.querySelector<HTMLButtonElement>('#theme-command');
  const updateThemeCommand = (): void => {
    if (themeCommand) themeCommand.textContent = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  };
  updateThemeCommand();
  const toggleTheme = (): void => {
    theme = theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = theme;
    updateThemeCommand();
    refreshInterface();
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Theme still works for this session. */ }
  };

  const gridCommand = root.querySelector<HTMLButtonElement>('#grid-command');
  let gridVisible = readGridVisible();
  const applyGrid = (): void => {
    root.querySelector<SVGRectElement>('#sheet-grid')?.setAttribute('visibility', gridVisible ? 'visible' : 'hidden');
    if (gridCommand) gridCommand.textContent = gridVisible ? 'Скрыть сетку' : 'Показать сетку';
  };
  const toggleGrid = (): void => {
    gridVisible = !gridVisible;
    applyGrid();
    refreshInterface();
    try { localStorage.setItem(GRID_KEY, gridVisible ? 'on' : 'off'); } catch { /* Grid still toggles for this session. */ }
  };
  applyGrid();

  const { applyPropertiesPanel, openFloatingProperties, toggleDockedProperties } = setupPropertiesPanel(ctx, () => uiText());

  const wireColorsCommand = root.querySelector<HTMLButtonElement>('#wire-colors-command');
  let uniformWireColors = readUniformWireColors();
  const updateWireColorsCommand = (): void => {
    // Подпись показывает действующий режим; клик переключает на другой.
    if (wireColorsCommand) wireColorsCommand.textContent = `${uniformWireColors ? uiText().wireColorsUniform : uiText().wireColorsPerPhase} ✓`;
  };
  const toggleWireColors = (): void => {
    uniformWireColors = !uniformWireColors;
    updateWireColorsCommand();
    simulation.applySimulationVisuals();
    try { localStorage.setItem(WIRE_COLOR_MODE_KEY, uniformWireColors ? 'uniform' : 'phase'); } catch { /* Mode still works for this session. */ }
  };

  const svg = root.querySelector<SVGSVGElement>('.viewport-svg');
  const sheet = root.querySelector<SVGGElement>('#sheet-transform');
  const wireLayer = root.querySelector<SVGGElement>('#wire-layer');
  const elementLayer = root.querySelector<SVGGElement>('#element-layer');
  const selectionLayer = root.querySelector<SVGGElement>('#selection-layer');
  const draftLayer = root.querySelector<SVGGElement>('#draft-layer');
  const sheetFrame = root.querySelector<SVGGElement>('#sheet-frame');
  const sheetStamp = root.querySelector<SVGGElement>('#sheet-stamp');
  const zoomValue = root.querySelector<HTMLOutputElement>('#zoom-value');
  const cursorCoords = root.querySelector<HTMLOutputElement>('#cursor-coords');
  const status = root.querySelector<HTMLDivElement>('#status');
  const fileName = root.querySelector<HTMLSpanElement>('#file-name');
  const fileInput = root.querySelector<HTMLInputElement>('#cad-file');
  const wireKindSelect = root.querySelector<HTMLSelectElement>('#wire-kind');
  const drawWireButton = root.querySelector<HTMLButtonElement>('#draw-wire');
  const panToolButton = root.querySelector<HTMLButtonElement>('#pan-tool');
  const nodeToolButton = root.querySelector<HTMLButtonElement>('#node-tool');
  const selectToolButton = root.querySelector<HTMLButtonElement>('#select-tool');
  const finishWireButton = root.querySelector<HTMLButtonElement>('#finish-wire');
  const undoButton = root.querySelector<HTMLButtonElement>('#undo');
  const redoButton = root.querySelector<HTMLButtonElement>('#redo');
  const paletteGroups = root.querySelector<HTMLDivElement>('#palette-groups');
  const paletteSearch = root.querySelector<HTMLInputElement>('#palette-search');
  const paletteLanguage = root.querySelector<HTMLSelectElement>('#palette-language');
  const paletteCount = root.querySelector<HTMLSpanElement>('#palette-count');
  const propertyFields = root.querySelector<HTMLDivElement>('#property-fields');
  const runButton = root.querySelector<HTMLButtonElement>('#sim-run');
  const stopButton = root.querySelector<HTMLButtonElement>('#sim-stop');
  const simStateValue = root.querySelector<HTMLSpanElement>('#sim-state');
  const speedButton = root.querySelector<HTMLButtonElement>('#speed-cycle');
  const simulationMessage = root.querySelector<HTMLDivElement>('#simulation-message');
  const simulationContextMenu = root.querySelector<HTMLDivElement>('#simulation-context-menu');
  const overloadAction = root.querySelector<HTMLButtonElement>('#simulate-overload');
  const resetInputsAction = root.querySelector<HTMLButtonElement>('#reset-simulation-inputs');
  if (!svg || !sheet || !wireLayer || !elementLayer || !selectionLayer || !draftLayer || !sheetFrame || !sheetStamp || !zoomValue || !status || !fileName || !fileInput || !wireKindSelect || !drawWireButton || !finishWireButton || !undoButton || !redoButton || !paletteGroups || !paletteSearch || !paletteLanguage || !paletteCount || !propertyFields || !runButton || !stopButton || !simStateValue || !simulationMessage || !simulationContextMenu || !overloadAction || !resetInputsAction || !speedButton) throw new Error('Не удалось создать поле SVG.');
  fileName.textContent = schema.sheet.fileName || 'Новая схема';
  if (autosavedSchema) status.textContent = 'Автосохранённая схема восстановлена.';
  svg.setAttribute('tabindex', '0');

  const initialRect = svg.getBoundingClientRect();
  let viewSize: Point = { x: initialRect.width || FALLBACK_VIEWPORT.width, y: initialRect.height || FALLBACK_VIEWPORT.height };
  svg.setAttribute('viewBox', `0 0 ${viewSize.x} ${viewSize.y}`);
  const backdrop = svg.querySelector<SVGRectElement>('.viewport-backdrop');
  backdrop?.setAttribute('width', String(viewSize.x));
  backdrop?.setAttribute('height', String(viewSize.y));
  /** Вид (масштаб и центр в координатах листа) переживает перезагрузку страницы. */
  const VIEWPORT_KEY = 'cadesimu-viewport';
  const readSavedViewport = (): Viewport | undefined => {
    try {
      const raw = localStorage.getItem(VIEWPORT_KEY);
      if (!raw) return undefined;
      const saved = JSON.parse(raw) as { scale?: unknown; cx?: unknown; cy?: unknown };
      const { scale, cx, cy } = saved;
      if (typeof scale !== 'number' || typeof cx !== 'number' || typeof cy !== 'number') return undefined;
      if (![scale, cx, cy].every(Number.isFinite) || scale < MIN_VIEWPORT_SCALE || scale > MAX_VIEWPORT_SCALE) return undefined;
      return { scale, offsetX: viewSize.x / 2 - cx * scale, offsetY: viewSize.y / 2 - cy * scale };
    } catch { return undefined; }
  };
  let viewport: Viewport = readSavedViewport() ?? fitViewport(fullSheet(schema.sheet), { width: viewSize.x, height: viewSize.y });
  let documents: DocumentTab[] = savedDocuments?.tabs.map((tab) => ({
    ...tab, history: createHistory(cloneSchema(tab.schema)),
    viewport: tab.id === savedDocuments.activeId ? viewport : fitViewport(fullSheet(tab.schema.sheet), { width: viewSize.x, height: viewSize.y }),
  })) ?? [{ id: crypto.randomUUID(), name: schema.sheet.fileName || 'Новая схема', schema, history, viewport }];
  let activeDocumentId = savedDocuments?.activeId ?? documents[0]!.id;
  const documentTabBar = root.querySelector<HTMLElement>('#document-tabs');
  let viewportSaveTimer: ReturnType<typeof setTimeout> | undefined;
  const saveViewportNow = (): void => {
    if (viewportSaveTimer !== undefined) { clearTimeout(viewportSaveTimer); viewportSaveTimer = undefined; }
    try {
      const center = screenToSheet({ x: viewSize.x / 2, y: viewSize.y / 2 }, viewport);
      localStorage.setItem(VIEWPORT_KEY, JSON.stringify({ scale: viewport.scale, cx: center.x, cy: center.y }));
    } catch { /* The view simply is not restored next time. */ }
  };
  const scheduleViewportSave = (): void => {
    if (viewportSaveTimer !== undefined) clearTimeout(viewportSaveTimer);
    viewportSaveTimer = setTimeout(saveViewportNow, 250);
  };
  let pointerSheetPosition: Point | undefined;
  let drag: DragState | undefined;
  let spaceDown = false;
  /** Инструмент «Рука»: левая кнопка мыши только двигает лист, элементы и провода не трогаются. */
  let panTool = false;
  /** Инструмент «Узел»: клик по месту соединения проводов ставит точку соединения. */
  let nodeTool = false;
  const { leaveNodeTool, setPanTool, selectTool, setNodeTool } = setupToolModes({ svg, panButton: panToolButton, nodeButton: nodeToolButton, selectButton: selectToolButton, panTool: () => panTool, setPanToolState: (value) => { panTool = value; }, nodeTool: () => nodeTool, setNodeToolState: (value) => { nodeTool = value; }, status, wireDrawing: () => wireDrawing, cancelWireDrawing: () => cancelWireDrawing(), placementType: () => placementType, setPlacementType: (value) => { placementType = value; }, setPlacementRotation: (value) => { placementRotation = value; }, clearActivePaletteCommand: () => { activePaletteCommand = undefined; }, renderPalette: () => renderPalette(), placeTypeSelect: () => placeTypeSelect });
  const selected = new Map<string, Selectable>();
  let clipboard: { elements: SchemaElement[]; wires: WireSegment[]; anchor: Point } | undefined;
  let placementType: number | undefined;
  let activePaletteCommand: number | undefined;
  let paletteLang: Lang = (() => {
    try {
      const saved = localStorage.getItem(INTERFACE_LANGUAGE_KEY);
      return saved === 'es' || saved === 'en' || saved === 'it' || saved === 'ru' || saved === 'fr' || saved === 'ar' ? saved : 'es';
    } catch { return 'es'; }
  })();
  let placementRotation: 0 | 1 | 2 | 3 = 0;
  let wireDrawing = false;
  const uiText = (): typeof INTERFACE_TEXT.ru => INTERFACE_TEXT[paletteLang] as typeof INTERFACE_TEXT.ru;
  const translateInterface = setupInterfaceTranslation({ root, uiText, visibleOptionalGroups, wireDrawing: () => wireDrawing, simulationMode: () => simulation.mode, speedButton, gridVisible: () => gridVisible, applyPropertiesPanel, updateWireColorsCommand, paletteSearch, paletteLanguage, paletteLang: () => paletteLang, zoomValue, schema: () => schema, fileName });
  refreshInterface = translateInterface;

  let draftPoints: Point[] = [];
  let draftCursor: Point | undefined;
  let dragSnapshot: Schema | undefined;
  let propertySnapshot: Schema | undefined;
  const simulation = setupSimulation(ctx, {
    wireLayer, elementLayer, simulationMessage, runButton, stopButton, simStateValue, simulationContextMenu, overloadAction, status,
    uiText: () => uiText(), renderSchema: () => renderSchema(), uniformWireColors: () => uniformWireColors,
  });
  translateInterface();

  const { updateHistoryButtons, commitSchema, restoreHistory } = setupHistoryUi(ctx, { root, undoButton, redoButton, drawWireButton, finishWireButton, selected, clipboardAvailable: () => clipboard !== undefined, wireDrawing: () => wireDrawing, draftLength: () => draftPoints.length, uiText, simulation, renderSchema: () => renderSchema() });
  const { renderProperties } = setupPropertyFields(ctx, {
    propertyFields, selected, uiText, renderSchema: () => renderSchema(), commitSchema,
    propertySnapshot: () => propertySnapshot, setPropertySnapshot: (value) => { propertySnapshot = value; },
  });
  const stampEditor = setupStampEditor(ctx, { stage: root.querySelector<HTMLElement>('.viewport-stage'), viewport: () => viewport, commitSchema, renderSchema: () => renderSchema() });
  const { open: openStampEditor, close: closeStampEditor } = stampEditor;
  const drawViewport = (): void => {
    if (stampEditor.isOpen()) closeStampEditor(true);
    sheet.setAttribute('transform', `translate(${viewport.offsetX} ${viewport.offsetY}) scale(${viewport.scale})`);
    zoomValue.value = `${Math.round(viewport.scale * 100)}%`;
    scheduleViewportSave();
  };
  type DrawKind = Exclude<WireKind, 'junction'>;
  const activeWireKinds = (): DrawKind[] => {
    const value = wireKindSelect.value;
    if (value === 'three') return ['phase', 'phase', 'phase'];
    if (value === 'threeN') return ['phase', 'phase', 'phase', 'neutral'];
    return [value as DrawKind];
  };
  let elbowVerticalFirst = false;
  let elbowPreferenceChosen = false;
  let bundleFlipped = false;
  /** Маршруты всех проводов пучка; для одного провода — единственный маршрут. */
  const buildBundleRoutes = (points: readonly Point[]): Array<{ route: Point[]; kind: DrawKind }> => {
    const kinds = activeWireKinds();
    const route = simplifyRoute(orthogonalize(points, elbowVerticalFirst));
    if (route.length < 2) return [];
    if (kinds.length === 1) return [{ route, kind: kinds[0] as DrawKind }];
    const layout = detectBundleLayout(route, schema);
    const side = (layout.side * (bundleFlipped ? -1 : 1)) as 1 | -1;
    // Порядок на экране слева направо (или сверху вниз): сначала все фазы, нейтраль последней,
    // независимо от того, в какую сторону от щелчка уходит пучок.
    const lanes = kinds.map((_, index) => offsetRoute(route, side * layout.spacing * index));
    const firstStart = route[0] as Point; const firstEnd = route[1] as Point;
    const vertical = firstStart.x === firstEnd.x;
    const laneKey = (lane: Point[]): number => { const start = lane[0] as Point; return vertical ? start.x : start.y; };
    lanes.sort((a, b) => laneKey(a) - laneKey(b));
    return kinds.map((kind, index) => ({ route: lanes[index] as Point[], kind }));
  };
  const insideSheet = (route: readonly Point[]): boolean => route.every((p) => p.x >= 0 && p.y >= 0 && p.x <= schema.sheet.width && p.y <= schema.sheet.height);
  const drawDraft = setupWireDraft({ layer: draftLayer, isDrawing: () => wireDrawing, points: () => draftPoints, cursor: () => draftCursor, buildRoutes: buildBundleRoutes });
  const { layer: ghostLayer, draw: drawGhost, move: moveGhost } = setupPlacementGhost(ctx, { svg, after: draftLayer, viewSize: () => viewSize, viewport: () => viewport, placementType: () => placementType, rotation: () => placementRotation, wireDrawing: () => wireDrawing });
  svg.addEventListener('pointerleave', () => { ghostLayer.replaceChildren(); if (cursorCoords) cursorCoords.value = 'X: — Y: —'; });
  svg.addEventListener('pointerenter', (event) => moveGhost(event));
  const renderSheetFrame = setupSheetFrame(ctx, sheetFrame, sheetStamp);
  const renderSchema = setupSchemaRenderer(ctx, { root, svg, wireLayer, elementLayer, selectionLayer, selected, drag: () => drag, renderSheetFrame, drawDraft, simulation, updateHistoryButtons, renderProperties: () => renderProperties(), persistSchema });
  const activeDocument = (): DocumentTab => documents.find((tab) => tab.id === activeDocumentId) ?? documents[0]!;
  const renderDocumentTabs = (): void => {
    if (!documentTabBar) return;
    documentTabBar.replaceChildren();
    for (const document of documents) {
      const tab = documentTabBar.ownerDocument.createElement('div');
      tab.className = `document-tab${document.id === activeDocumentId ? ' is-active' : ''}`;
      const select = documentTabBar.ownerDocument.createElement('button');
      select.type = 'button'; select.className = 'document-tab-select'; select.dataset.documentTab = document.id;
      select.textContent = document.name || 'Новая схема'; select.title = document.name || 'Новая схема';
      const close = documentTabBar.ownerDocument.createElement('button');
      close.type = 'button'; close.className = 'document-tab-close'; close.dataset.closeDocument = document.id;
      close.setAttribute('aria-label', `Закрыть схему «${document.name || 'Новая схема'}»`); close.title = 'Закрыть схему'; close.textContent = '×';
      tab.append(select, close); documentTabBar.append(tab);
    }
    const add = documentTabBar.ownerDocument.createElement('button');
    add.type = 'button'; add.id = 'new-document-tab'; add.className = 'document-tab-add'; add.title = 'Новая схема'; add.setAttribute('aria-label', 'Новая схема'); add.textContent = '+';
    documentTabBar.append(add);
  };
  syncActiveDocument = (): void => {
    const current = activeDocument();
    current.schema = schema; current.history = history; current.viewport = viewport;
    current.name = schema.sheet.fileName || current.name || 'Новая схема';
  };
  persistDocuments = (): void => {
    try {
      localStorage.setItem(DOCUMENT_TABS_KEY, JSON.stringify({ activeId: activeDocumentId, tabs: documents.map((tab) => ({ id: tab.id, name: tab.name, schema: serializeSchemaJson(tab.schema) })) }));
    } catch { /* The current document remains available even when storage is full. */ }
    renderDocumentTabs();
  };
  const activateDocument = (id: string, skipSavingCurrent = false): void => {
    if (id === activeDocumentId) return;
    if (!skipSavingCurrent) { syncActiveDocument(); persistDocuments(); }
    simulation.stopSimulation();
    const target = documents.find((tab) => tab.id === id); if (!target) return;
    activeDocumentId = target.id; schema = target.schema; history = target.history; viewport = target.viewport;
    selected.clear(); fileInput.value = ''; fileName.textContent = schema.sheet.fileName || target.name;
    placementType = undefined; placementRotation = 0; activePaletteCommand = undefined; wireDrawing = false; draftPoints = []; draftCursor = undefined;
    if (placeTypeSelect) placeTypeSelect.value = ''; svg.classList.remove('is-placing', 'is-drawing-wire');
    simulation.resetSimulation(); renderSchema(); drawViewport(); updateHistoryButtons(); refreshInterface();
    status.textContent = `Открыта схема «${target.name}».`; renderDocumentTabs();
  };
  const createDocumentTab = (name = 'Новая схема'): void => {
    if (documents.length) { syncActiveDocument(); persistDocuments(); }
    simulation.stopSimulation();
    const nextSchema = createEmptySchema();
    const tab: DocumentTab = { id: crypto.randomUUID(), name, schema: nextSchema, history: createHistory(cloneSchema(nextSchema)), viewport: fitViewport(fullSheet(nextSchema.sheet), { width: viewSize.x, height: viewSize.y }) };
    documents.push(tab); activeDocumentId = tab.id; schema = tab.schema; history = tab.history; viewport = tab.viewport;
    selected.clear(); fileInput.value = ''; fileName.textContent = name;
    placementType = undefined; placementRotation = 0; activePaletteCommand = undefined; wireDrawing = false; draftPoints = []; draftCursor = undefined;
    if (placeTypeSelect) placeTypeSelect.value = ''; svg.classList.remove('is-placing', 'is-drawing-wire');
    simulation.resetSimulation(); renderSchema(); drawViewport(); updateHistoryButtons(); refreshInterface();
    status.textContent = 'Новая схема создана.'; persistSchemaNow(); renderDocumentTabs();
  };
  const closeDocumentTab = (id: string): void => {
    const index = documents.findIndex((tab) => tab.id === id); if (index < 0) return;
    syncActiveDocument(); documents.splice(index, 1);
    if (!documents.length) { activeDocumentId = ''; createDocumentTab(); return; }
    if (activeDocumentId === id) { activeDocumentId = ''; activateDocument(documents[Math.min(index, documents.length - 1)]!.id, true); }
    else { persistDocuments(); }
  };
  documentTabBar?.addEventListener('click', (event) => {
    const target = event.target as Element;
    const close = target.closest<HTMLButtonElement>('[data-close-document]');
    if (close?.dataset.closeDocument) { event.stopPropagation(); closeDocumentTab(close.dataset.closeDocument); return; }
    const tab = target.closest<HTMLButtonElement>('[data-document-tab]');
    if (tab?.dataset.documentTab) activateDocument(tab.dataset.documentTab);
    else if (target.closest('#new-document-tab')) createDocumentTab();
  });
  renderDocumentTabs();
  const { renderPalette } = setupPalette(ctx, {
    search: paletteSearch, language: paletteLanguage, count: paletteCount, groups: paletteGroups, svg, status,
    paletteLang: () => paletteLang, setPaletteLang: (value) => { paletteLang = value; }, visibleOptionalGroups,
    activePaletteCommand: () => activePaletteCommand, setActivePaletteCommand: (value) => { activePaletteCommand = value; },
    setPlacement: (value) => { placementType = value; }, resetPlacementRotation: () => { placementRotation = 0; },
    uiText: () => uiText(), leaveNodeTool, isWireDrawing: () => wireDrawing, cancelWireDrawing: () => cancelWireDrawing(),
    drawGhost, translateInterface, renderProperties,
  });
  renderPalette();

  const cancelWireDrawing = (): void => {
    wireDrawing = false; draftPoints = []; draftCursor = undefined;
    svg.classList.remove('is-drawing-wire');
    renderSchema();
    status.textContent = 'Рисование провода отменено.';
  };
  const startWireDrawing = (): void => {
    leaveNodeTool();
    placementType = undefined; placementRotation = 0;
    const placeSelect = root.querySelector<HTMLSelectElement>('#place-type');
    if (placeSelect) placeSelect.value = '';
    svg.classList.remove('is-placing');
    selected.clear();
    wireDrawing = true; draftPoints = []; draftCursor = undefined;
    elbowVerticalFirst = false; elbowPreferenceChosen = false;
    svg.classList.add('is-drawing-wire');
    renderSchema();
    status.textContent = 'Провод: клик — начало, второй клик — конец. Shift+клик — добавить излом; ↑/↓/←/→ — тип провода; C — выйти; Tab — другой угол, F — сторона пучка.';
  };
  const toggleWireDrawing = (): void => { if (wireDrawing) cancelWireDrawing(); else startWireDrawing(); };
  const finishWireDrawing = (): void => {
    if (draftPoints.length < 2) { draftPoints = []; draftCursor = undefined; drawDraft(); updateHistoryButtons(); return; }
    let bundle = buildBundleRoutes(draftPoints);
    if (bundle.length && !bundle.every((item) => insideSheet(item.route)) && activeWireKinds().length > 1) {
      bundleFlipped = !bundleFlipped;
      bundle = buildBundleRoutes(draftPoints);
    }
    if (bundle.length === 0 || !bundle.every((item) => insideSheet(item.route))) {
      status.textContent = 'Провода не помещаются на листе в этом месте.';
      draftPoints = []; draftCursor = undefined; drawDraft(); updateHistoryButtons();
      return;
    }
    const before = cloneSchema(schema);
    let id = Math.max(0, ...schema.elements.map((element) => element.id), ...schema.wires.map((wire) => wire.id)) + 1;
    const existingWires = [...schema.wires];
    for (const { route, kind } of bundle) {
      const typeCode = kind === 'phase' ? 4000 : kind === 'neutral' ? 4009 : 4010;
      for (let i = 1; i < route.length; i += 1) {
        const from = route[i - 1]; const to = route[i];
        if (!from || !to || (from.x === to.x && from.y === to.y)) continue;
        schema.wires.push({ id: id++, typeCode, kind, from: { ...from }, to: { ...to }, thickness: 1, dot: false });
      }
      const junctionPoints = new Map<string, Point>();
      for (const point of route) {
        if (existingWires.some((wire) => isWireInteriorPoint(point, wire))) junctionPoints.set(`${point.x},${point.y}`, point);
      }
      for (const point of junctionPoints.values()) {
        const alreadyMarked = schema.wires.some((wire) => wire.kind === 'junction' && wire.from.x === point.x && wire.from.y === point.y);
        if (!alreadyMarked) schema.wires.push({ id: id++, typeCode: 4001, kind: 'junction', from: { ...point }, to: { ...point }, thickness: 0, dot: true });
      }
    }
    // Режим провода остаётся включённым: следующий клик начинает новый провод.
    draftPoints = []; draftCursor = undefined;
    selected.clear();
    commitSchema(before); renderSchema();
    status.textContent = bundle.length > 1 ? `Добавлено проводов: ${bundle.length}. Следующий клик — начало нового.` : 'Провод добавлен. Следующий клик — начало нового, Esc — выйти.';
  };

  const { copySelection, pasteSelection, deleteSelected, rotateSelection, nudgeSelection } = setupSelectionCommands(ctx, { selected, clipboard: () => clipboard, setClipboard: (value) => { clipboard = value; }, status, simulationMode: () => simulation.mode, pointer: () => pointerSheetPosition, viewSize: () => viewSize, viewport: () => viewport, updateHistoryButtons, commitSchema, renderSchema, placementType: () => placementType, placementRotation: () => placementRotation, setPlacementRotation: (value) => { placementRotation = value; }, drawGhost });

  const placeTypeSelect = root.querySelector<HTMLSelectElement>('#place-type');
  placeTypeSelect?.addEventListener('change', () => {
    if (placeTypeSelect.value) leaveNodeTool();
    if (wireDrawing) cancelWireDrawing();
    activePaletteCommand = undefined;
    placementType = placeTypeSelect.value ? Number(placeTypeSelect.value) : undefined;
    placementRotation = 0;
    svg.classList.toggle('is-placing', placementType !== undefined);
    drawGhost();
    if (placementType !== undefined) status.textContent = `Размещение: ${getCadType(placementType).label} · щёлкните по листу; R — поворот; Esc — отмена.`;
    else status.textContent = 'Режим выбора. Выберите объект или рамкой выделите область.';
  });
  setupBetaNotice(ctx);
  root.querySelectorAll<HTMLButtonElement>('[data-dialog-close]').forEach((button) => {
    button.addEventListener('click', () => root.querySelector<HTMLDialogElement>(`#${button.dataset.dialogClose}`)?.close());
  });
  overloadAction.addEventListener('click', () => {
    simulationContextMenu.hidden = true;
    if (simulation.contextElementId !== undefined) simulation.simulateOverload(simulation.contextElementId);
  });
  resetInputsAction.addEventListener('click', () => { simulationContextMenu.hidden = true; simulation.resetSimulationInputs(); });
  setupSimulationContextMenuEvents(svg, simulationContextMenu, simulation);
  const exportActions = setupExport(ctx, svg, status);
  setupMenus(ctx, {
    fileInput, status, undoButton, redoButton, exportActions, requestNewSchema: createDocumentTab, copySelection, pasteSelection,
    rotateSelection, deleteSelected, toggleTheme, toggleGrid, toggleDockedProperties, toggleWireColors,
    commitSchema, renderSchema, setViewport: (value) => { viewport = value; }, viewSize, drawViewport,
  });
  root.querySelector<HTMLButtonElement>('#rotate-selection')?.addEventListener('click', rotateSelection);
  root.querySelector<HTMLButtonElement>('#delete-selection')?.addEventListener('click', deleteSelected);
  panToolButton?.addEventListener('click', () => setPanTool(!panTool));
  selectToolButton?.addEventListener('click', selectTool);
  nodeToolButton?.addEventListener('click', () => setNodeTool(!nodeTool));
  /** Точка (x, y) лежит на отрезке провода (включая концы). */
  const { drawNodeCursor, placeNodeAt } = setupNodeTool(ctx, { layer: ghostLayer, active: () => nodeTool, wireDrawing: () => wireDrawing, status, commitSchema, renderSchema });
  drawWireButton.addEventListener('click', toggleWireDrawing);
  finishWireButton.addEventListener('click', finishWireDrawing);
  const cycleWireKind = (direction: -1 | 1): void => {
    const options = [...wireKindSelect.options].filter((option) => !option.disabled);
    if (!options.length) return;
    const current = options.findIndex((option) => option.value === wireKindSelect.value);
    const next = (current + direction + options.length) % options.length;
    wireKindSelect.value = options[next]!.value;
    wireKindSelect.dispatchEvent(new Event('change', { bubbles: true }));
  };
  wireKindSelect.addEventListener('change', () => { if (wireDrawing) drawDraft(); });
  undoButton.addEventListener('click', () => {
    if (wireDrawing && draftPoints.length) { draftPoints.pop(); draftCursor = undefined; drawDraft(); updateHistoryButtons(); return; }
    if (canUndo(history)) restoreHistory(undoHistory(history));
  });
  redoButton.addEventListener('click', () => { if (canRedo(history)) restoreHistory(redoHistory(history)); });
  runButton.addEventListener('click', simulation.startSimulation);
  stopButton.addEventListener('click', simulation.stopSimulation);
  setupSimulationSpeedControl(speedButton, simulation);
  simulation.updateSimulationControls();
  drawViewport();

  const openDocumentText = setupDocumentOpen(ctx, { svg, fileName, status, selected, simulation, clearPlacement: () => { placementType = undefined; placementRotation = 0; }, clearWireDrawing: () => { wireDrawing = false; draftPoints = []; draftCursor = undefined; }, placeTypeSelect, persistSchemaNow, viewSize: () => viewSize, setViewport: (value) => { viewport = value; }, drawViewport, renderSchema, beforeOpenDocument: (name) => createDocumentTab(name) });
  setupDocumentInputEvents(root, fileInput, openDocumentText, simulation.stopSimulation);

  setupPaletteDrop(ctx, { svg, viewSize: () => viewSize, viewport: () => viewport, placementType: () => placementType, setPlacementType: (value) => { placementType = value; }, setActiveCommand: (value) => { activePaletteCommand = value; }, setPlacementRotation: (value) => { placementRotation = value; }, leaveNodeTool, moveGhost, selected, commitSchema, renderSchema, status });
  setupCanvasDoubleClick({ svg, wireDrawing: () => wireDrawing, placing: () => placementType !== undefined, panTool: () => panTool, nodeTool: () => nodeTool, spaceDown: () => spaceDown, simulationMode: () => simulation.mode, selected, renderSchema, openProperties: openFloatingProperties });
  setupWireContextMenu(svg, { isDrawing: () => wireDrawing, draftPoints: () => draftPoints, clearDraftCursor: () => { draftCursor = undefined; }, drawDraft, updateHistoryButtons, cancelWireDrawing });
  setupCanvasPointerDown(ctx, { svg, viewSize: () => viewSize, viewport: () => viewport, setPointerSheetPosition: (value) => { pointerSheetPosition = value; }, nodeTool: () => nodeTool, panTool: () => panTool, spaceDown: () => spaceDown, simulation, placeNodeAt, wireDrawing: () => wireDrawing, draftPoints: () => draftPoints, setDraftCursor: (value) => { draftCursor = value; }, drawDraft, updateHistoryButtons, finishWireDrawing, status, placementType: () => placementType, setPlacementType: (value) => { placementType = value; }, placementRotation: () => placementRotation, setPlacementRotation: (value) => { placementRotation = value; }, selected, commitSchema, clearActivePaletteCommand: () => { activePaletteCommand = undefined; }, renderPalette, placeTypeSelect, renderSchema, setDrag: (value) => { drag = value; }, drag: () => drag, setDragSnapshot: (value) => { dragSnapshot = value; }, openStampEditor });
  /**
   * Быстрый путь перемещения: при перетаскивании меняются только transform и координаты
   * уже нарисованных узлов (раз в кадр), а полная перерисовка схемы идёт один раз при отпускании.
   * Раньше каждое движение мыши пересоздавало все ~300 символов, и крупные трёхфазные элементы «тормозили».
   */
  const { schedule: scheduleMovePreview, cancel: cancelMovePreview } = setupMovePreview(ctx, { drag: () => drag, wireLayer, elementLayer, selectionLayer });
  setupCanvasPointerMove(ctx, { svg, viewSize: () => viewSize, viewport: () => viewport, setViewport: (value) => { viewport = value; }, drag: () => drag, setPointerSheetPosition: (value) => { pointerSheetPosition = value; }, setDraftCursor: (value) => {
    if (value === undefined) elbowPreferenceChosen = false;
    else if (wireDrawing && !elbowPreferenceChosen) {
      const anchor = draftPoints[draftPoints.length - 1];
      if (anchor) {
        const dx = Math.abs(value.x - anchor.x); const dy = Math.abs(value.y - anchor.y);
        if (Math.max(dx, dy) >= CAD_GRID_STEP / 2) {
          elbowVerticalFirst = dy > dx;
          elbowPreferenceChosen = true;
        }
      }
    }
    draftCursor = value;
  }, cursorCoords, nodeTool: () => nodeTool, drawNodeCursor, moveGhost, wireDrawing: () => wireDrawing, drawDraft, drawViewport, scheduleMovePreview, renderSchema });
  const endInteraction = setupCanvasPointerEnd(ctx, { svg, viewSize: () => viewSize, viewport: () => viewport, drag: () => drag, setDrag: (value) => { drag = value; }, dragSnapshot: () => dragSnapshot, setDragSnapshot: (value) => { dragSnapshot = value; }, selected, cancelMovePreview, commitSchema, renderSchema });
  svg.addEventListener('pointerup', endInteraction); svg.addEventListener('pointercancel', endInteraction);
  const releaseAllMomentary = (): void => { for (const id of [...simulation.heldInputs]) simulation.releaseMomentary(id); };
  window.addEventListener('pointerup', releaseAllMomentary);
  window.addEventListener('pointercancel', releaseAllMomentary);
  setupKeyboardShortcuts({ root, simulationContextMenu, fileInput, spaceDown: (value) => { spaceDown = value; }, panTool: () => panTool, setPanTool, nodeTool: () => nodeTool, setNodeTool, selectTool, copySelection, pasteSelection, saveJson: exportActions.saveJson, requestNewSchema: createDocumentTab, undo: (redo) => { if (redo) { if (canRedo(history)) restoreHistory(redoHistory(history)); } else if (wireDrawing && draftPoints.length) { draftPoints.pop(); draftCursor = undefined; elbowPreferenceChosen = false; drawDraft(); updateHistoryButtons(); } else if (canUndo(history)) restoreHistory(undoHistory(history)); }, wireDrawing: () => wireDrawing, changeWireRoute: (key) => { if (key === 'Tab') { elbowVerticalFirst = !elbowVerticalFirst; elbowPreferenceChosen = true; } else bundleFlipped = !bundleFlipped; drawDraft(); }, toggleWireDrawing, cycleWireKind, finishWireDrawing, cancelPlacement: () => { placementType = undefined; placementRotation = 0; activePaletteCommand = undefined; renderPalette(); if (placeTypeSelect) placeTypeSelect.value = ''; svg.classList.remove('is-placing'); status.textContent = 'Режим размещения завершён.'; }, cancelWireDrawing: () => { if (draftPoints.length) { draftPoints = []; draftCursor = undefined; elbowPreferenceChosen = false; drawDraft(); updateHistoryButtons(); } else cancelWireDrawing(); }, placing: () => placementType !== undefined, selectedCount: () => selected.size, clearSelection: () => { selected.clear(); renderSchema(); }, deleteSelected, rotateSelection, nudgeSelection });
  window.addEventListener('pagehide', persistSchemaNow);
  window.addEventListener('pagehide', saveViewportNow);

  setupViewportControls(ctx, { root, svg, backdrop, viewSize: () => viewSize, setViewSize: (value) => { viewSize = value; }, viewport: () => viewport, setViewport: (value) => { viewport = value; }, drawViewport });
  renderSchema();
}
