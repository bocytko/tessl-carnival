import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const ROUND_SECONDS = 30;
export const POINTS_PER_WHACK = 10;
export const COLUMNS = 3;
export const ROWS = 3;
export const HOLE_RADIUS = 46;
/** How long a mole stays up, and how long until the next one pops, at the start and end of a round. */
export const UP_TIME = { start: 1.4, end: 0.6 } as const;
export const POP_GAP = { start: 1.0, end: 0.35 } as const;
const BONK_TIME = 0.3;

export interface Hole {
  x: number;
  y: number;
  /** Seconds the mole in this hole has left up; 0 when the hole is empty. */
  up: number;
  /** Seconds left on the bonk flash after a whack. */
  bonk: number;
}

export interface WhackAMoleState {
  holes: Hole[];
  /** Seconds left in the round. */
  timeLeft: number;
  /** Seconds until the next mole pops up. */
  nextPop: number;
  score: number;
  whacks: number;
  phase: 'playing' | 'over';
}

export function createState(): WhackAMoleState {
  const top = 90;
  const cellW = WIDTH / COLUMNS;
  const cellH = (HEIGHT - top - 50) / ROWS;
  const holes: Hole[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      holes.push({ x: cellW * col + cellW / 2, y: top + cellH * row + cellH / 2, up: 0, bonk: 0 });
    }
  }
  return {
    holes,
    timeLeft: ROUND_SECONDS,
    nextPop: 0.5,
    score: 0,
    whacks: 0,
    phase: 'playing',
  };
}

/** How far through the round we are, from 0 at the start to 1 at the end. */
export function progress(state: WhackAMoleState): number {
  return Math.min(1, Math.max(0, 1 - state.timeLeft / ROUND_SECONDS));
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** Seconds a mole stays up; shorter as the round goes on. */
export function upTime(state: WhackAMoleState): number {
  return lerp(UP_TIME.start, UP_TIME.end, progress(state));
}

/** Seconds between moles popping up; shorter as the round goes on. */
export function popGap(state: WhackAMoleState): number {
  return lerp(POP_GAP.start, POP_GAP.end, progress(state));
}

export function isMoleHit(hole: Hole, x: number, y: number): boolean {
  return hole.up > 0 && Math.hypot(x - hole.x, y - hole.y) <= HOLE_RADIUS;
}

/** Whacks at a point. Returns true if it hit a mole. */
export function whack(state: WhackAMoleState, x: number, y: number): boolean {
  if (state.phase !== 'playing') return false;
  const hole = state.holes.find((h) => isMoleHit(h, x, y));
  if (!hole) return false;
  hole.up = 0;
  hole.bonk = BONK_TIME;
  state.score += POINTS_PER_WHACK;
  state.whacks += 1;
  return true;
}

/**
 * Advances the game by `dt` seconds. `random` returns a number in [0, 1) and
 * picks which empty hole the next mole pops from.
 */
export function step(state: WhackAMoleState, dt: number, random: () => number = Math.random): void {
  if (state.phase !== 'playing') return;

  for (const hole of state.holes) {
    hole.up = Math.max(0, hole.up - dt);
    hole.bonk = Math.max(0, hole.bonk - dt);
  }

  state.timeLeft = Math.max(0, state.timeLeft - dt);
  if (state.timeLeft === 0) {
    for (const hole of state.holes) hole.up = 0;
    state.phase = 'over';
    return;
  }

  state.nextPop -= dt;
  if (state.nextPop <= 0) {
    const empty = state.holes.filter((h) => h.up === 0 && h.bonk === 0);
    if (empty.length > 0) {
      const hole = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
      hole.up = upTime(state);
    }
    state.nextPop = popGap(state);
  }
}

function draw(ctx: CanvasRenderingContext2D, state: WhackAMoleState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  for (const hole of state.holes) {
    // The hole.
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.ellipse(hole.x, hole.y + 20, HOLE_RADIUS, HOLE_RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    if (hole.up > 0) {
      // The mole: body, eyes and nose.
      ctx.fillStyle = colors.wood;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, HOLE_RADIUS * 0.7, Math.PI, 0);
      ctx.lineTo(hole.x + HOLE_RADIUS * 0.7, hole.y + 20);
      ctx.lineTo(hole.x - HOLE_RADIUS * 0.7, hole.y + 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = colors.text;
      ctx.beginPath();
      ctx.arc(hole.x - 11, hole.y - 10, 5, 0, Math.PI * 2);
      ctx.arc(hole.x + 11, hole.y - 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.stripeA;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y + 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Front lip of the hole, so the mole looks like it rises out of it.
    ctx.fillStyle = colors.wood;
    ctx.fillRect(hole.x - HOLE_RADIUS, hole.y + 20, HOLE_RADIUS * 2, 8);

    if (hole.bonk > 0) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 3;
      ctx.globalAlpha = hole.bonk / BONK_TIME;
      ctx.beginPath();
      ctx.arc(hole.x, hole.y, HOLE_RADIUS * (1.2 - hole.bonk), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Time ${Math.ceil(state.timeLeft)}s`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Time's up! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const whackAMole: CarnivalGame = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description:
    'Whack the moles before they duck back down. They get quicker as the clock runs out.',

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
      whack(
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
        recordScore(whackAMole.id, state.score);
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

export default whackAMole;
