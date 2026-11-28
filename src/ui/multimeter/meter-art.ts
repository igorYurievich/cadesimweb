/**
 * Рисунок мультиметра: корпус, экран, переключатель, гнёзда и щуп. Только разметка SVG,
 * живые части помечены data-part, их меняет meter-view.ts.
 */

/** Размер корпуса в пикселях экрана (не зависит от масштаба листа). */
export const BODY_WIDTH = 230;
export const BODY_HEIGHT = 420;
/** Гнёзда щупов относительно левого верхнего угла корпуса: COM (чёрный) и V Ω (красный). */
export const JACK_COM = { x: 62, y: 382 } as const;
export const JACK_V = { x: 168, y: 382 } as const;
/** Длина щупа от кончика до хвоста, где начинается провод. */
export const PROBE_LENGTH = 150;
/** Угол стрелки переключателя по положениям, градусы. */
export const DIAL_ANGLE = { off: -80, acv: -28, dcv: 28, ohm: 80 } as const;

const FONT = 'font-family="system-ui, \'Segoe UI\', Arial, sans-serif" font-weight="700"';
const MONO = 'font-family="\'DejaVu Sans Mono\', Consolas, \'Courier New\', monospace" font-weight="700"';

function lcd(): string {
  return `<g data-part="lcd">
    <rect x="28" y="70" width="174" height="92" rx="8" class="mm-lcd-bg" data-part="lcd-bg"/>
    <rect x="28" y="70" width="174" height="92" rx="8" fill="none" stroke="#1b1f22" stroke-width="3"/>
    <text x="38" y="91" ${FONT} font-size="15" fill="#1d2418" data-part="mode"></text>
    <text x="194" y="91" ${FONT} font-size="15" fill="#1d2418" text-anchor="end" data-part="flags"></text>
    <text x="174" y="147" ${MONO} font-size="52" fill="#11160f" text-anchor="end" data-part="value"></text>
    <text x="197" y="147" ${FONT} font-size="20" fill="#11160f" text-anchor="end" data-part="unit"></text>
    <g data-part="cracks" class="mm-cracks" stroke="#2b2b2b" stroke-width="2.2" fill="none">
      <path d="M60 70 L95 112 L80 128 L120 162 M95 112 L140 98 L170 70 M120 128 L150 140 L202 132"/>
    </g>
  </g>`;
}

function dial(): string {
  return `<g transform="translate(115 248)">
    <text x="-52" y="-8" ${FONT} font-size="15" fill="#e9eef2" text-anchor="end" class="mm-dial-label"
      data-dial="off">OFF</text>
    <text x="-30" y="-56" ${FONT} font-size="21" fill="#e9eef2" text-anchor="middle" class="mm-dial-label"
      data-dial="acv">V~</text>
    <text x="30" y="-56" ${FONT} font-size="21" fill="#e9eef2" text-anchor="middle" class="mm-dial-label"
      data-dial="dcv">V⎓</text>
    <text x="52" y="-8" ${FONT} font-size="17" fill="#e9eef2" text-anchor="start" class="mm-dial-label"
      data-dial="ohm">Ω)))</text>
    <g class="mm-dial-knob" data-part="knob">
      <circle r="44" fill="#1b1f23"/>
      <circle r="38" fill="#ff7a1a"/>
      <g data-part="pointer"><rect x="-9" y="-38" width="18" height="76" rx="9" fill="#e86410"/>
        <path d="M0 -36 L0 -20" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g>
    </g>
  </g>`;
}

function button(x: number, label: string, part: string): string {
  return `<g class="mm-button" data-part="${part}">
    <rect x="${x}" y="306" width="72" height="26" rx="6" fill="#4a535b"/>
    <text x="${x + 36}" y="324" ${FONT} font-size="13" fill="#fff" text-anchor="middle">${label}</text>
  </g>`;
}

/** Корпус целиком. Название модели своё, без чужих марок. */
export function meterBodySvg(): string {
  const w = BODY_WIDTH;
  const h = BODY_HEIGHT;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="28" fill="#ff7a1a"/>
  <rect x="14" y="14" width="${w - 28}" height="${h - 28}" rx="20" fill="#2a3036"/>
  <rect x="${w / 2 - 34}" y="22" width="68" height="10" rx="5" fill="#3b444c"/>
  <text x="${w / 2}" y="56" ${FONT} font-size="15" fill="#ffb36b" text-anchor="middle"
    letter-spacing="2">WebCADe · DM-1</text>
  ${lcd()}
  ${dial()}
  ${button(34, 'HOLD', 'hold')}
  ${button(124, '✕', 'close')}
  <text x="${JACK_COM.x}" y="356" ${FONT} font-size="14" fill="#e9eef2" text-anchor="middle">COM</text>
  <text x="${JACK_V.x}" y="356" ${FONT} font-size="14" fill="#e9eef2" text-anchor="middle">V Ω</text>
  <circle cx="${JACK_COM.x}" cy="${JACK_COM.y}" r="15" fill="#111"/>
  <circle cx="${JACK_COM.x}" cy="${JACK_COM.y}" r="7" fill="#444"/>
  <circle cx="${JACK_V.x}" cy="${JACK_V.y}" r="15" fill="#c62828"/>
  <circle cx="${JACK_V.x}" cy="${JACK_V.y}" r="7" fill="#5a0d0d"/>
  <text x="${w / 2}" y="388" font-family="system-ui, sans-serif" font-size="11" fill="#ffcc00"
    text-anchor="middle">⚠ CAT III</text>
</svg>`;
}

/** Щуп: кончик в точке (20, 0), корпус уходит вниз на PROBE_LENGTH. */
export function probeSvg(color: string): string {
  const grip = [56, 62, 68, 74]
    .map((y) => `<rect x="12" y="${y}" width="16" height="3" fill="rgba(255,255,255,.25)"/>`)
    .join('');
  return `<svg width="40" height="${PROBE_LENGTH}" viewBox="0 0 40 ${PROBE_LENGTH}" xmlns="http://www.w3.org/2000/svg">
    <circle class="mm-probe-ring" cx="20" cy="0" r="9" fill="rgba(0, 200, 83, 0.15)" stroke="#00c853" stroke-width="3"/>
    <path d="M20 1 L20 26" stroke="#c9ccd0" stroke-width="3" stroke-linecap="round"/>
    <path d="M13 26 h14 l2 70 h-18 z" fill="${color}"/>
    <rect x="6" y="40" width="28" height="6" rx="3" fill="${color}"/>
    ${grip}
    <path d="M14 96 h12 l-2 54 h-8 z" fill="${color}"/>
  </svg>`;
}
