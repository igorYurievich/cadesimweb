import { version as appVersion } from '../../package.json';
import { CAD_GRID_STEP, FALLBACK_VIEWPORT, PLACEABLE_TYPES } from './constants';
import { getCadType } from '@model/cad-types';
import type { Theme } from './constants';

const exampleFolderRow = (name: string): string => `<button type="button" class="example-folder-row" data-folder="${name}" title="${name}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h7l2 2h9v10H3z" /></svg><span class="example-file-name">${name}</span><span class="example-file-code"></span></button>`;

export function renderAppShell(root: HTMLElement, theme: Theme): void {
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
            <details class="menu-submenu">
              <summary class="menu-command"><span id="export-menu-label">Экспорт</span><span class="menu-submenu-arrow" aria-hidden="true">›</span></summary>
              <div class="menu-submenu-popover">
                <button type="button" class="menu-command" data-command="export-cad">Экспорт .cad</button>
                <button type="button" class="menu-command" data-command="export-svg">Экспорт SVG</button>
                <button type="button" class="menu-command" data-command="export-png">Экспорт PNG</button>
              </div>
            </details>
            <button type="button" class="menu-command" data-command="print-pdf">Печать / PDF</button>
            <button type="button" class="menu-command" data-command="sheet">Размер листа (Ajustar hoja)…</button>
          </div></details>
          <details class="menu-group"><summary>Правка</summary><div class="menu-popover">
            <button type="button" class="menu-command" data-command="copy-selection">Копировать <kbd>Ctrl+C</kbd></button>
            <button type="button" class="menu-command" data-command="cut-selection">Вырезать <kbd>Ctrl+X</kbd></button>
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
              <label class="menu-toggle"><input type="checkbox" data-optional-group="sensors"><span data-extra-label="extraSensors">Датчики</span></label>
            </div>
          </div></details>
          <details class="menu-group language-menu"><summary>Язык</summary><div class="menu-popover">
            <label class="menu-language">Язык названий элементов
              <select id="palette-language" aria-label="Язык названий"><option value="es">ES — Español</option><option value="en">EN — English</option><option value="it">IT — Italiano</option><option value="ru">RU — Русский</option><option value="fr">FR — Français</option></select>
            </label>
          </div></details>
          <details class="menu-group examples-menu"><summary>Примеры</summary></details>
          <details class="menu-group"><summary>Справка</summary><div class="menu-popover">
            <button type="button" class="menu-command" data-command="shortcuts">Горячие клавиши</button>
            <button type="button" class="menu-command" data-command="component-guide">Подробнее о метках</button>
            <button type="button" class="menu-command" data-command="about">О программе</button>
          </div></details>
        </nav>
        <span id="file-name" class="file-name">Новая схема</span>
        <input id="cad-file" type="file" accept=".cad,.json,application/json,text/plain" />
      </header>
      <section class="viewport-toolbar" aria-label="Провода и симуляция">
        <div class="tool-group wire-controls" aria-label="Провода">
          <select id="wire-kind" aria-label="Тип нового провода"><option value="phase">Фаза</option><option value="neutral">Нейтраль</option><option value="protection">PE</option><option value="three">3 фазы (L1 L2 L3)</option><option value="threeN">3 фазы + N</option></select>
          <label id="wire-thickness-label" for="wire-thickness">Толщина</label>
          <select id="wire-thickness" aria-label="Толщина провода" title="Толщина провода">
            <option value="1">1</option><option value="2">2</option>
            <option value="3">3</option><option value="4">4</option>
            <option value="" hidden>—</option>
          </select>
          <button type="button" id="draw-wire" title="Провод (C)">Провод</button>
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
        <button type="button" id="finish-wire" disabled>Готово</button>
        <button type="button" data-zoom="out">−</button><button type="button" data-zoom="in">+</button><button type="button" data-zoom="fit">Показать всё</button>
      </div>
      <div id="simulation-message" class="simulation-message" role="alert" aria-live="assertive" hidden><span id="simulation-message-text"></span></div>
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
            <rect id="sheet-paper" x="0" y="0" width="297" height="210" fill="#fff" />
            <rect id="sheet-grid" x="0" y="0" width="297" height="210" fill="url(#cad-grid)" />
            <rect id="sheet-border" x="0" y="0" width="297" height="210" fill="none" stroke="#aeb8c4" stroke-width="0.8" />
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
              <option value="custom">Пользовательский</option><option value="297x210">A4 — альбомный</option><option value="210x297">A4 — книжный</option><option value="420x297">A3 — альбомный</option><option value="297x420">A3 — книжный</option>
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
          <div><dt id="shortcut-copy-paste">Копировать / вырезать / вставить выделенное</dt><dd><kbd>Ctrl</kbd> + <kbd>C</kbd> / <kbd>X</kbd> / <kbd>V</kbd></dd></div>
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
      <dialog id="component-guide-dialog" class="app-dialog component-guide-dialog" aria-labelledby="component-guide-title">
        <h2 id="component-guide-title">Зелёные метки компонентов</h2>
        <div class="verification-guide-marker"><span class="palette-verified-badge" aria-hidden="true">✓</span><strong id="component-guide-verified-label">Проверенный компонент</strong></div>
        <p id="component-guide-verified-text">Зелёная метка означает, что компонент проверен и его можно использовать для построения схем.</p>
        <p id="component-guide-unverified-text">Без метки: компонент ещё не проверен, его функциональность может быть неполной.</p>
        <p id="component-guide-count"></p>
        <div class="dialog-actions"><button type="button" data-dialog-close="component-guide-dialog">Закрыть</button></div>
      </dialog>
      <dialog id="examples-dialog" class="app-dialog examples-dialog" aria-labelledby="examples-dialog-title">
        <div class="examples-window-titlebar">
          <div class="examples-window-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h7l2 2h9v10H3z" /></svg><h2 id="examples-dialog-title">Примеры</h2></div>
          <button type="button" class="examples-window-close" data-dialog-close="examples-dialog" aria-label="Закрыть">×</button>
        </div>
        <div class="examples-window-toolbar">
          <button type="button" data-examples-back disabled aria-label="Назад">‹</button><button type="button" disabled aria-label="Вперёд">›</button>
          <div class="examples-breadcrumb"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h7l2 2h9v10H3z" /></svg><span id="examples-folder-label">Папка примеров</span></div>
        </div>
        <div class="examples-window-content">
          <aside class="examples-sidebar"><div class="examples-sidebar-heading">Избранное</div><div class="examples-sidebar-entry is-selected"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5h7l2 2h9v10H3z" /></svg><span id="examples-sidebar-label">Примеры</span></div></aside>
          <section class="examples-files-section" aria-label="Примеры схем">
            <div class="examples-list-head"><span id="examples-name-heading">Название</span><span id="examples-code-heading">Работа</span></div>
            <div class="example-file-list">${exampleFolderRow('Ejemplos')}${exampleFolderRow('Ejemplos 2')}</div>
          </section>
        </div>
        <footer class="examples-window-footer"><span id="examples-count"></span><button type="button" data-dialog-close="examples-dialog">Закрыть</button></footer>
      </dialog>
      <dialog id="cad-export-warning-dialog" class="app-dialog cad-export-warning-dialog" aria-labelledby="cad-export-warning-title" aria-describedby="cad-export-warning-text">
        <h2 id="cad-export-warning-title">Внимание: экспорт в .cad</h2>
        <div class="cad-export-warning-message"><p id="cad-export-warning-text">Мы не гарантируем, что эта схема запустится и будет корректно работать в оригинальной CADe SIMU 4.2. Сохраняйте и используйте файл с учётом этого ограничения.</p></div>
        <label class="cad-export-warning-optout"><input type="checkbox" id="cad-export-warning-optout" /><span id="cad-export-warning-optout-label">Больше не показывать это уведомление</span></label>
        <div class="dialog-actions"><button type="button" id="cad-export-warning-cancel" data-dialog-close="cad-export-warning-dialog">Отмена</button><button type="button" class="primary-action" id="cad-export-warning-confirm">Экспортировать .cad</button></div>
      </dialog>
      <dialog id="about-dialog" class="app-dialog about-dialog" aria-labelledby="about-title">
        <h2 id="about-title">Web Cade</h2>
        <p id="about-bio">Автор проекта — Игорь Липский Вячин.</p>
        <p id="about-noncommercial">Это бета-версия. Проект находится на раннем этапе разработки и будет дальше развиваться.</p>
        <p id="about-limitations">Сейчас веб-приложение ещё не предоставляет все возможности старого аналога программы.</p>
        <p class="about-contact"><span id="about-contact-label">По вопросам и пожеланиям пишите мне:</span> <a href="mailto:igoryurievich1@gmail.com">igoryurievich1@gmail.com</a></p>
        <p class="about-repository"><a href="https://github.com/igorYurievich/cadesimweb" target="_blank" rel="noopener noreferrer">GitHub: github.com/igorYurievich/cadesimweb</a></p>
        <dl><div><dt>Версия</dt><dd id="about-version">${appVersion}</dd></div></dl>
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
}
