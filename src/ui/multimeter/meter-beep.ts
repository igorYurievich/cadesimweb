/** Писк прозвонки: тихий непрерывный тон, пока цепь замкнута. Без звука, если браузер не даёт Web Audio. */

export interface MeterBeep {
  set(on: boolean): void;
}

export function createMeterBeep(): MeterBeep {
  let context: AudioContext | undefined;
  let oscillator: OscillatorNode | undefined;
  const start = (): void => {
    const AudioCtor = window.AudioContext;
    if (!AudioCtor) return;
    context ??= new AudioCtor();
    const gain = context.createGain();
    gain.gain.value = 0.04;
    gain.connect(context.destination);
    oscillator = context.createOscillator();
    oscillator.type = 'square';
    oscillator.frequency.value = 2400;
    oscillator.connect(gain);
    oscillator.start();
  };
  return {
    set(on: boolean): void {
      if (on && !oscillator) {
        try { start(); } catch { oscillator = undefined; }
      } else if (!on && oscillator) {
        oscillator.stop();
        oscillator.disconnect();
        oscillator = undefined;
      }
    },
  };
}
