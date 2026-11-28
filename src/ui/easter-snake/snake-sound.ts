/** Звуки пасхалки, синтез через Web Audio (без аудиофайлов). Без звука, если браузер не даёт Web Audio. */

export interface SnakeSound {
  /** Создать AudioContext заранее, пока есть жест пользователя. */
  prepare(): void;
  eat(): void;
  crash(): void;
  dispose(): void;
}

export function createSnakeSound(enabled: () => boolean): SnakeSound {
  let context: AudioContext | undefined;
  const audio = (): AudioContext | undefined => {
    if (!enabled()) return undefined;
    try {
      context ??= new window.AudioContext();
      if (context.state === 'suspended') void context.resume();
      return context;
    } catch { return undefined; }
  };
  /** Короткий тон: частота плавно уходит от from к to, громкость гаснет к концу. */
  const tone = (type: OscillatorType, from: number, to: number, seconds: number, volume: number): void => {
    const ctx = audio();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
    gain.connect(ctx.destination);
    const oscillator = ctx.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + seconds);
    oscillator.connect(gain);
    oscillator.start(now);
    oscillator.stop(now + seconds);
  };
  /** Щелчок расцепителя: короткий шумовой удар. */
  const click = (): void => {
    const ctx = audio();
    if (!ctx) return;
    const length = Math.floor(ctx.sampleRate * 0.06);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 3;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = 0.35;
    source.buffer = buffer;
    source.connect(gain).connect(ctx.destination);
    source.start();
  };
  return {
    prepare: () => { audio(); },
    eat: () => tone('square', 880, 1760, 0.08, 0.05),
    crash: () => { click(); tone('sawtooth', 220, 40, 0.35, 0.06); },
    dispose: () => { void context?.close().catch(() => undefined); context = undefined; },
  };
}
