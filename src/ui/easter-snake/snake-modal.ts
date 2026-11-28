/**
 * Пасхалка «Змейка по проводам» (WireSnakeModal): окно-прибор поверх затемнённого экрана.
 * Отдельный кусок сборки — скачивается при первом запуске (snake-entry.ts).
 * Изолирована от редактора: не читает схему, движок и координаты холста. Игровой цикл
 * (requestAnimationFrame) и слушатели клавиш живут, только пока окно открыто, и снимаются в close().
 */
import './snake.css';
import { currentInterfaceLang } from '../i18n';
import { SNAKE_TEXT, type SnakeText } from '../i18n/snake-text';
import {
  createSnakeState, directionOfKey, SNAKE_COLS, SNAKE_ROWS, step, stepDelayMs, togglePause, turn,
  type SnakeState,
} from './snake-logic';
import { loadSnakeFacts, pickFactIndex } from './snake-facts';
import { snakePath } from './snake-motion';
import { drawSnakeFrame, SNAKE_CELL } from './snake-render';
import { createSnakeSound, type SnakeSound } from './snake-sound';
import { readSnakeHighscore, readSnakeSound, saveSnakeHighscore, saveSnakeSound } from './snake-unlock';
import { buildSnakeView, renderHud, renderOverlay, type SnakeView } from './snake-view';

/**
 * Длинный кадр (подвисание браузера, первый запуск звука) не засчитывается в шаги,
 * чтобы змейка не «телепортировалась». Паузу ставим только при скрытии вкладки (onVisibility).
 */
const MAX_FRAME_GAP_MS = 250;
/** Поворот, нажатый в начале шага, выполняется сразу; позже — на следующей клетке (snake-logic: turn). */
const TURN_NOW_UNTIL = 0.35;

let active: WireSnakeModal | undefined;
/** Последний показанный факт: следующий рекорд покажет другой. */
let lastFact: number | undefined;

/** Открыть игру. Повторный вызов при открытом окне ничего не делает. Возвращает функцию закрытия. */
export function openWireSnake(host: HTMLElement): () => void {
  active ??= new WireSnakeModal(host);
  const modal = active;
  return () => modal.close();
}

function prepareCanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  // Поле в CSS крупнее 480×360, поэтому буфер с запасом: линии остаются чёткими.
  const scale = Math.min(4, Math.ceil((window.devicePixelRatio || 1) * 1.5));
  canvas.width = SNAKE_COLS * SNAKE_CELL * scale;
  canvas.height = SNAKE_ROWS * SNAKE_CELL * scale;
  const ctx = canvas.getContext('2d');
  ctx?.setTransform(scale, 0, 0, scale, 0, 0);
  return ctx;
}

class WireSnakeModal {
  private readonly t: SnakeText = SNAKE_TEXT[currentInterfaceLang()];
  private readonly view: SnakeView;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly sound: SnakeSound;
  private readonly previousFocus: HTMLElement | undefined;
  private state: SnakeState = createSnakeState();
  private best = readSnakeHighscore();
  private record = false;
  /** Факт на табличке «Короткое замыкание» (snake-facts.ts). */
  private fact: string | undefined;
  private soundOn = readSnakeSound();
  private crashAt = 0;
  private pending = 0;
  private last = performance.now();
  private frame = 0;
  private closed = false;

  constructor(host: HTMLElement) {
    this.view = buildSnakeView(this.t);
    this.ctx = prepareCanvas(this.view.canvas);
    this.sound = createSnakeSound(() => this.soundOn);
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('keyup', this.onKey, true);
    document.addEventListener('visibilitychange', this.onVisibility);
    // Звук готовим сразу (окно открыто кликом или Enter — браузер это разрешает),
    // иначе первое создание AudioContext тормозит кадр в момент сбора первой лампочки.
    this.sound.prepare();
    this.view.backdrop.addEventListener('pointerdown', this.onBackdrop);
    this.view.closeButtons.forEach((node) => node.addEventListener('click', () => this.close()));
    this.view.restartButton.addEventListener('click', () => this.restart());
    this.view.pauseButton.addEventListener('click', () => this.pause());
    this.view.soundButton.addEventListener('click', () => this.toggleSound());
    host.append(this.view.backdrop);
    this.focusDevice();
    this.refresh();
    this.frame = requestAnimationFrame(this.tick);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('keyup', this.onKey, true);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.sound.dispose();
    this.view.backdrop.remove();
    if (active === this) active = undefined;
    // Фокус — обратно в редактор: на прежний элемент, если он ещё на странице и не в закрытом меню.
    const previous = this.previousFocus;
    if (previous?.isConnected && !previous.closest('.menu-popover')) previous.focus({ preventScroll: true });
    else if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  private readonly tick = (time: number): void => {
    const gap = time - this.last;
    this.last = time;
    if (this.state.phase === 'running') {
      this.pending += Math.min(gap, MAX_FRAME_GAP_MS);
      // Шаги по накопленному времени: скорость не зависит от частоты кадров монитора.
      while (this.state.phase === 'running' && this.pending >= stepDelayMs(this.state.eaten)) {
        this.pending -= stepDelayMs(this.state.eaten);
        this.advance();
      }
    }
    this.draw(time);
    this.frame = requestAnimationFrame(this.tick);
  };

  private readonly onKey = (event: KeyboardEvent): void => {
    // Пока окно открыто, клавиши не доходят до редактора (горячие клавиши, Delete, Ctrl+Z…).
    event.stopPropagation();
    if (event.type !== 'keydown') return;
    const direction = directionOfKey(event.code);
    if (direction) turn(this.state, direction, this.progress() >= TURN_NOW_UNTIL);
    const handled = Boolean(direction) || this.command(event);
    // Tab и Enter работают как обычно (кнопки окна); остальное браузеру не отдаём (прокрутка и т. п.).
    if (handled || (event.key !== 'Tab' && event.key !== 'Enter')) event.preventDefault();
  };

  private command(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') this.close();
    else if (event.code === 'KeyP') this.pause();
    else if (event.code === 'KeyM') this.toggleSound();
    // После проигрыша Enter, как и пробел, взводит автомат — на какой бы кнопке ни стоял фокус.
    else if (this.state.phase === 'over' && (event.code === 'Space' || event.key === 'Enter')) this.restart();
    else if (event.code === 'Space') this.pause();
    else return false;
    return true;
  }

  /** Вкладку скрыли — пауза, чтобы игра не шла без игрока. */
  private readonly onVisibility = (): void => {
    if (document.hidden && this.state.phase === 'running') this.pause();
  };

  private readonly onBackdrop = (event: PointerEvent): void => {
    if (event.target === this.view.backdrop && this.state.phase !== 'running') this.close();
  };

  private draw(time: number): void {
    if (!this.ctx) return;
    // Доля пройденного шага: пока идёт пауза, pending не меняется — змейка замирает на месте.
    const path = snakePath(this.state, this.progress());
    drawSnakeFrame(this.ctx, { state: this.state, path, time, crashAt: this.crashAt });
  }

  /** Доля пройденного шага (0…1). */
  private progress(): number {
    return this.pending / stepDelayMs(this.state.eaten);
  }

  private advance(): void {
    const event = step(this.state);
    if (event === 'eat') this.sound.eat();
    if (this.state.phase === 'over') this.finish();
    else if (event === 'eat') this.refresh();
  }

  private finish(): void {
    this.crashAt = performance.now();
    this.record = saveSnakeHighscore(this.state.score);
    if (this.record) this.best = this.state.score;
    this.sound.crash();
    this.showFact();
    this.refresh();
    this.view.restartButton.focus({ preventScroll: true });
  }

  /** Случайный факт после каждого проигрыша. Если кусок не скачался (нет сети), табличка остаётся без факта. */
  private showFact(): void {
    const state = this.state;
    loadSnakeFacts(currentInterfaceLang()).then((facts) => {
      if (this.closed || this.state !== state || facts.length === 0) return;
      lastFact = pickFactIndex(facts.length, lastFact);
      this.fact = facts[lastFact];
      this.refresh();
    }, () => undefined);
  }

  private restart(): void {
    this.state = createSnakeState();
    this.record = false;
    this.fact = undefined;
    this.pending = 0;
    this.refresh();
    this.focusDevice();
  }

  private pause(): void {
    togglePause(this.state);
    this.refresh();
  }

  private toggleSound(): void {
    this.soundOn = !this.soundOn;
    saveSnakeSound(this.soundOn);
    this.refresh();
  }

  private refresh(): void {
    renderHud(this.view, this.t, this.state, this.best, this.soundOn);
    renderOverlay(this.view, this.t, this.state, { record: this.record, best: this.best, fact: this.fact });
  }

  private focusDevice(): void {
    const device = this.view.backdrop.querySelector<HTMLElement>('.snake-device');
    if (!device) return;
    device.tabIndex = -1;
    device.focus({ preventScroll: true });
  }
}
