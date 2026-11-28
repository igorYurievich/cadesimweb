/**
 * Тексты пасхалки «Змейка по проводам» на пяти языках. Отдельно от основных словарей:
 * скачиваются только вместе с игрой (snake-modal.ts), в стартовую сборку не попадают.
 */
import type { InterfaceLang } from '.';

const ru = {
  title: 'Импульс в цепи', load: 'НАГРУЗКА', peak: 'МАКС. ПИК', unit: 'кВт',
  soundOn: 'Звук включён (M)', soundOff: 'Звук выключен (M)', pause: 'Пауза (P)', resume: 'Продолжить (P)',
  exit: 'Выход (ESC)', close: 'Закрыть', paused: 'ПАУЗА', pausedHint: 'P — продолжить',
  overTitle: '⚡ КОРОТКОЕ ЗАМЫКАНИЕ! ВЫБИЛО АВТОМАТ', overScore: 'Нагрузка: {score} кВт', newRecord: 'НОВЫЙ РЕКОРД!',
  bestScore: 'Рекорд: {score} кВт', restart: 'Взвести автомат (Пробел / Enter)', closeDevice: 'Закрыть прибор (ESC)',
  fullTitle: '⚡ ЦЕПЬ ЗАМКНУТА ПОЛНОСТЬЮ', help: 'Стрелки / WASD — направление · P — пауза · M — звук',
  factTitle: 'ЗНАЕТЕ ЛИ ВЫ?',
};

export type SnakeText = Readonly<Record<keyof typeof ru, string>>;

const es = {
  title: 'Impulso en el circuito', load: 'CARGA', peak: 'PICO MÁX.', unit: 'kW',
  soundOn: 'Sonido activado (M)', soundOff: 'Sonido desactivado (M)', pause: 'Pausa (P)', resume: 'Continuar (P)',
  exit: 'Salir (ESC)', close: 'Cerrar', paused: 'PAUSA', pausedHint: 'P — continuar',
  overTitle: '⚡ ¡CORTOCIRCUITO! HA SALTADO EL AUTOMÁTICO', overScore: 'Carga: {score} kW', newRecord: '¡NUEVO RÉCORD!',
  bestScore: 'Récord: {score} kW', restart: 'Rearmar automático (Espacio / Enter)', closeDevice: 'Cerrar equipo (ESC)',
  fullTitle: '⚡ CIRCUITO COMPLETO', help: 'Flechas / WASD — dirección · P — pausa · M — sonido',
  factTitle: '¿SABÍAS QUE…?',
} satisfies SnakeText;

const en = {
  title: 'Circuit Pulse', load: 'LOAD', peak: 'MAX PEAK', unit: 'kW',
  soundOn: 'Sound on (M)', soundOff: 'Sound off (M)', pause: 'Pause (P)', resume: 'Resume (P)',
  exit: 'Exit (ESC)', close: 'Close', paused: 'PAUSED', pausedHint: 'P — resume',
  overTitle: '⚡ SHORT CIRCUIT! BREAKER TRIPPED', overScore: 'Load: {score} kW', newRecord: 'NEW RECORD!',
  bestScore: 'Record: {score} kW', restart: 'Reset breaker (Space / Enter)', closeDevice: 'Close device (ESC)',
  fullTitle: '⚡ CIRCUIT FULLY LOADED', help: 'Arrows / WASD — direction · P — pause · M — sound',
  factTitle: 'DID YOU KNOW?',
} satisfies SnakeText;

const it = {
  title: 'Impulso nel circuito', load: 'CARICO', peak: 'PICCO MAX', unit: 'kW',
  soundOn: 'Audio attivo (M)', soundOff: 'Audio disattivato (M)', pause: 'Pausa (P)', resume: 'Riprendi (P)',
  exit: 'Esci (ESC)', close: 'Chiudi', paused: 'PAUSA', pausedHint: 'P — riprendi',
  overTitle: '⚡ CORTOCIRCUITO! È SCATTATO L’INTERRUTTORE', overScore: 'Carico: {score} kW', newRecord: 'NUOVO RECORD!',
  bestScore: 'Record: {score} kW',
  restart: 'Riarma interruttore (Spazio / Invio)', closeDevice: 'Chiudi strumento (ESC)',
  fullTitle: '⚡ CIRCUITO AL COMPLETO', help: 'Frecce / WASD — direzione · P — pausa · M — audio',
  factTitle: 'LO SAPEVI?',
} satisfies SnakeText;

const fr = {
  title: 'Impulsion dans le circuit', load: 'CHARGE', peak: 'PIC MAX', unit: 'kW',
  soundOn: 'Son activé (M)', soundOff: 'Son coupé (M)', pause: 'Pause (P)', resume: 'Reprendre (P)',
  exit: 'Quitter (ESC)', close: 'Fermer', paused: 'PAUSE', pausedHint: 'P — reprendre',
  overTitle: '⚡ COURT-CIRCUIT ! LE DISJONCTEUR A SAUTÉ', overScore: 'Charge : {score} kW',
  newRecord: 'NOUVEAU RECORD !',
  bestScore: 'Record : {score} kW',
  restart: 'Réarmer le disjoncteur (Espace / Entrée)', closeDevice: 'Fermer l’appareil (ESC)',
  fullTitle: '⚡ CIRCUIT ENTIÈREMENT CHARGÉ', help: 'Flèches / WASD — direction · P — pause · M — son',
  factTitle: 'LE SAVIEZ-VOUS ?',
} satisfies SnakeText;

export const SNAKE_TEXT: Readonly<Record<InterfaceLang, SnakeText>> = { es, en, it, ru, fr };
