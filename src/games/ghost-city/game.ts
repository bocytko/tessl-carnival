import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const COLUMNS = 3;
export const ROWS = 3;
export const WINDOW_RADIUS = 46;
/** How long a ghost stays out, and how long until the next one appears, at the start and end of a round. */
export const UP_TIME = { start: 1.4, end: 0.6 } as const;
export const POP_GAP = { start: 1.0, end: 0.35 } as const;
const BOO_TIME = 0.3;

type ThemeColor = keyof typeof theme.colors;

/** Who haunts a window: every window in the city has its own ghost. */
export interface Persona {
  name: string;
  /** A few words shown under the window. */
  trait: string;
  /** Points for catching this ghost. */
  points: number;
  /** How long this ghost stays out, as a multiple of the round's usual time. */
  linger: number;
  /** The theme colour the ghost glows with. */
  color: ThemeColor;
}

/** One persona per window, row by row from the top left. */
export const PERSONAS: readonly Persona[] = [
  { name: 'Sheets', trait: 'the classic', points: 10, linger: 1, color: 'text' },
  { name: 'Flicker', trait: 'always in a hurry', points: 30, linger: 0.5, color: 'accent' },
  { name: 'Grumbles', trait: 'slow and sulky', points: 5, linger: 1.5, color: 'muted' },
  { name: 'Splash', trait: 'drowned sailor', points: 15, linger: 0.9, color: 'water' },
  { name: 'Duchess', trait: "won't be rushed", points: 10, linger: 1.3, color: 'stripeB' },
  { name: 'Ember', trait: 'hot-headed', points: 20, linger: 0.7, color: 'danger' },
  { name: 'Splinter', trait: 'haunts the attic', points: 15, linger: 1, color: 'wood' },
  { name: 'Peekaboo', trait: 'shy, blink and miss', points: 25, linger: 0.6, color: 'stripeA' },
  { name: 'Wisp', trait: 'barely there', points: 20, linger: 0.8, color: 'surface' },
];

export interface Window {
  x: number;
  y: number;
  persona: Persona;
  /** Seconds the ghost in this window has left out; 0 when the window is dark. */
  up: number;
  /** Seconds left on the flash after a catch. */
  boo: number;
}

export interface GhostCityState {
  windows: Window[];
  /** Seconds left in the round. */
  timeLeft: number;
  /** Seconds until the next ghost appears. */
  nextPop: number;
  score: number;
  catches: number;
  phase: 'playing' | 'over';
}

export function createState(): GhostCityState {
  const top = 90;
  const cellW = WIDTH / COLUMNS;
  const cellH = (HEIGHT - top - 50) / ROWS;
  const windows: Window[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      windows.push({
        x: cellW * col + cellW / 2,
        y: top + cellH * row + cellH / 2,
        persona: PERSONAS[row * COLUMNS + col],
        up: 0,
        boo: 0,
      });
    }
  }
  return {
    windows,
    timeLeft: ROUND_SECONDS,
    nextPop: 0.5,
    score: 0,
    catches: 0,
    phase: 'playing',
  };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
export function progress(state: GhostCityState): number {
  return Math.min(1, Math.max(0, 1 - state.timeLeft / ROUND_SECONDS));
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Seconds a ghost stays out before its persona's linger; shorter as the round goes on. */
export function upTime(state: GhostCityState): number {
  return lerp(UP_TIME.start, UP_TIME.end, progress(state));
}

/** Seconds between ghosts appearing; shorter as the round goes on. */
export function popGap(state: GhostCityState): number {
  return lerp(POP_GAP.start, POP_GAP.end, progress(state));
}

export function isGhostHit(window: Window, x: number, y: number): boolean {
  return window.up > 0 && Math.hypot(x - window.x, y - window.y) <= WINDOW_RADIUS;
}

/** Grabs at a point. Returns true if it caught a ghost. */
export function grab(state: GhostCityState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const window = state.windows.find((w) => isGhostHit(w, x, y));
  if (!window) return false;
  window.up = 0;
  window.boo = BOO_TIME;
  state.score += window.persona.points;
  state.catches += 1;
  return true;
}

/**
 * Advances the game by `dt` seconds. `random` returns a number in [0, 1) and
 * picks which dark window the next ghost appears in.
 */
export function step(state: GhostCityState, dt: number, random: () => number = Math.random): void {
  if (state.phase !== 'playing') return;

  for (const window of state.windows) {
    window.up = Math.max(0, window.up - dt);
    window.boo = Math.max(0, window.boo - dt);
  }

  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft === 0) {
    for (const window of state.windows) window.up = 0;
    state.phase = 'over';
    return;
  }

  state.nextPop -= dt;
  if (state.nextPop <= 0) {
    const dark = state.windows.filter((w) => w.up === 0 && w.boo === 0);
    if (dark.length > 0) {
      const window = dark[Math.min(dark.length - 1, Math.floor(random() * dark.length))];
      window.up = upTime(state) * window.persona.linger;
    }
    state.nextPop = popGap(state);
  }
}

function drawGhost(ctx: CanvasRenderingContext2D, window: Window) {
  const { colors } = theme;
  const r = WINDOW_RADIUS * 0.6;
  const { x, y } = window;

  // Body: a round head with a wavy hem.
  ctx.fillStyle = colors[window.persona.color];
  ctx.beginPath();
  ctx.arc(x, y - 4, r, Math.PI, 0);
  ctx.lineTo(x + r, y + 18);
  const waves = 4;
  for (let i = waves; i > 0; i--) {
    const right = x - r + ((2 * r) / waves) * i;
    const left = right - (2 * r) / waves;
    ctx.quadraticCurveTo((left + right) / 2, y + (i % 2 === 0 ? 8 : 26), left, y + 18);
  }
  ctx.closePath();
  ctx.fill();

  // Eyes and mouth.
  ctx.fillStyle = colors.background;
  ctx.beginPath();
  ctx.arc(x - 9, y - 8, 4, 0, Math.PI * 2);
  ctx.arc(x + 9, y - 8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function draw(ctx: CanvasRenderingContext2D, state: GhostCityState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Moon over the city.
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.arc(WIDTH - 60, 40, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('title', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText('Ghost City', 16, 48);

  for (const window of state.windows) {
    // The building around the window.
    ctx.fillStyle = colors.surface;
    ctx.fillRect(
      window.x - WINDOW_RADIUS - 14,
      window.y - WINDOW_RADIUS - 6,
      (WINDOW_RADIUS + 14) * 2,
      WINDOW_RADIUS * 2 + 12,
    );

    // The window pane: dark, or lit while a ghost is out.
    ctx.fillStyle = window.up > 0 ? colors.muted : colors.background;
    ctx.globalAlpha = window.up > 0 ? 0.35 : 1;
    ctx.fillRect(
      window.x - WINDOW_RADIUS,
      window.y - WINDOW_RADIUS + 4,
      WINDOW_RADIUS * 2,
      WINDOW_RADIUS * 2 - 8,
    );
    ctx.globalAlpha = 1;

    if (window.up > 0) drawGhost(ctx, window);

    // Window frame.
    ctx.strokeStyle = colors.wood;
    ctx.lineWidth = 4;
    ctx.strokeRect(
      window.x - WINDOW_RADIUS,
      window.y - WINDOW_RADIUS + 4,
      WINDOW_RADIUS * 2,
      WINDOW_RADIUS * 2 - 8,
    );

    // Who lives here.
    ctx.fillStyle = colors.muted;
    ctx.font = canvasFont('small');
    ctx.textAlign = 'center';
    ctx.fillText(
      `${window.persona.name} · ${window.persona.points}`,
      window.x,
      window.y + WINDOW_RADIUS + 22,
    );

    if (window.boo > 0) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 3;
      ctx.globalAlpha = window.boo / BOO_TIME;
      ctx.beginPath();
      ctx.arc(window.x, window.y, WINDOW_RADIUS * (1.2 - window.boo), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 12);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 12);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Dawn breaks! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ghostCity: CarnivalGame = {
  id: 'ghost-city',
  name: 'Ghost City',
  description:
    'Catch the ghosts haunting the city windows. Each window has its own ghost, and the quick ones are worth more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;

    const onDown = (event: PointerEvent) => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const rect = canvas.getBoundingClientRect();
      grab(
        state,
        ((event.clientX - rect.left) / rect.width) * WIDTH,
        ((event.clientY - rect.top) / rect.height) * HEIGHT,
      );
    };
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't skip the round.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ghostCity.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ghostCity;
