import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const LIVES = 3;
export const COLUMNS = 8;
export const PLAYER_Y = HEIGHT - 50;
export const PLAYER_SPEED = 320;
export const PLAYER_WIDTH = 44;
export const SHOT_SPEED = 520;
export const BOMB_SPEED = 200;
export const INVADER_WIDTH = 36;
export const INVADER_HEIGHT = 24;
/** How far the invaders drop each time they reach a side. */
export const DROP = 20;
const GAP_X = 20;
const GAP_Y = 18;
const TOP = 70;
/** Seconds between invader bombs, on average. */
const BOMB_INTERVAL = 1.2;

export type InvaderColor = 'purple' | 'red' | 'orange' | 'green';

/** One row per colour, top to bottom. Higher rows score more. */
export const ROWS: readonly { color: InvaderColor; points: number }[] = [
  { color: 'purple', points: 40 },
  { color: 'red', points: 30 },
  { color: 'orange', points: 20 },
  { color: 'green', points: 10 },
];

export interface Invader {
  x: number;
  y: number;
  color: InvaderColor;
  points: number;
}

export interface Projectile {
  x: number;
  y: number;
}

export interface SpaceInvadersState {
  invaders: Invader[];
  /** The player's shot. Only one can be in the air at a time. */
  shot: Projectile | null;
  bombs: Projectile[];
  playerX: number;
  /** -1 moves left, 1 moves right, 0 stands still. */
  move: -1 | 0 | 1;
  /** 1 marches right, -1 marches left. */
  direction: 1 | -1;
  bombTimer: number;
  lives: number;
  score: number;
  wave: number;
  phase: 'playing' | 'over';
}

export function createWave(): Invader[] {
  const left = (WIDTH - (COLUMNS * INVADER_WIDTH + (COLUMNS - 1) * GAP_X)) / 2;
  return ROWS.flatMap((row, r) =>
    Array.from({ length: COLUMNS }, (_, c) => ({
      x: left + c * (INVADER_WIDTH + GAP_X),
      y: TOP + r * (INVADER_HEIGHT + GAP_Y),
      color: row.color,
      points: row.points,
    })),
  );
}

export function createState(): SpaceInvadersState {
  return {
    invaders: createWave(),
    shot: null,
    bombs: [],
    playerX: WIDTH / 2,
    move: 0,
    direction: 1,
    bombTimer: BOMB_INTERVAL,
    lives: LIVES,
    score: 0,
    wave: 1,
    phase: 'playing',
  };
}

/** The invaders march faster as their numbers fall, and faster each wave. */
export function marchSpeed(state: SpaceInvadersState): number {
  const total = ROWS.length * COLUMNS;
  const lost = total - state.invaders.length;
  return 30 + 10 * (state.wave - 1) + (lost / total) * 150;
}

/** Fires the player's shot. Returns false if a shot is already in the air. */
export function fire(state: SpaceInvadersState): boolean {
  if (state.phase !== 'playing' || state.shot) return false;
  state.shot = { x: state.playerX, y: PLAYER_Y - 16 };
  return true;
}

/** Whether a shot that rose from `fromY` to `p.y` this step crossed the invader. */
function hitsInvader(p: Projectile, fromY: number, invader: Invader): boolean {
  return (
    p.x >= invader.x &&
    p.x <= invader.x + INVADER_WIDTH &&
    p.y <= invader.y + INVADER_HEIGHT &&
    fromY >= invader.y
  );
}

function hitsPlayer(p: Projectile, playerX: number): boolean {
  return Math.abs(p.x - playerX) <= PLAYER_WIDTH / 2 && Math.abs(p.y - PLAYER_Y) <= 12;
}

/**
 * Advances the game by `dt` seconds. `random` picks which invader drops a
 * bomb; pass a fixed function in tests.
 */
export function step(state: SpaceInvadersState, dt: number, random = Math.random): void {
  if (state.phase !== 'playing') return;

  const half = PLAYER_WIDTH / 2;
  state.playerX = Math.min(
    WIDTH - half,
    Math.max(half, state.playerX + state.move * PLAYER_SPEED * dt),
  );

  // March sideways, and drop and turn round at the edges.
  const dx = state.direction * marchSpeed(state) * dt;
  const atEdge = state.invaders.some((i) => i.x + dx < 10 || i.x + dx + INVADER_WIDTH > WIDTH - 10);
  for (const invader of state.invaders) {
    if (atEdge) invader.y += DROP;
    else invader.x += dx;
  }
  if (atEdge) state.direction = state.direction === 1 ? -1 : 1;

  if (state.shot) {
    const shot = state.shot;
    const fromY = shot.y;
    shot.y -= SHOT_SPEED * dt;
    // Check the whole path, so a fast shot can't skip an invader, and hit the
    // lowest invader it crossed first.
    const hit = state.invaders
      .filter((i) => hitsInvader(shot, fromY, i))
      .reduce<Invader | undefined>((low, i) => (low && low.y >= i.y ? low : i), undefined);
    if (hit) {
      state.score += hit.points;
      state.invaders = state.invaders.filter((i) => i !== hit);
      state.shot = null;
    } else if (shot.y < 0) {
      state.shot = null;
    }
  }

  state.bombTimer -= dt;
  if (state.bombTimer <= 0 && state.invaders.length > 0) {
    const bomber = state.invaders[Math.floor(random() * state.invaders.length)];
    state.bombs.push({ x: bomber.x + INVADER_WIDTH / 2, y: bomber.y + INVADER_HEIGHT });
    state.bombTimer = BOMB_INTERVAL / (1 + 0.2 * (state.wave - 1));
  }

  const falling: Projectile[] = [];
  for (const bomb of state.bombs) {
    bomb.y += BOMB_SPEED * dt;
    if (hitsPlayer(bomb, state.playerX)) state.lives -= 1;
    else if (bomb.y < HEIGHT) falling.push(bomb);
  }
  state.bombs = falling;

  if (state.invaders.length === 0) {
    state.wave += 1;
    state.invaders = createWave();
    state.direction = 1;
    state.shot = null;
    state.bombs = [];
  }

  const landed = state.invaders.some((i) => i.y + INVADER_HEIGHT >= PLAYER_Y - 12);
  if (state.lives <= 0 || landed) {
    state.lives = Math.max(state.lives, 0);
    state.phase = 'over';
  }
}

function drawInvader(ctx: CanvasRenderingContext2D, invader: Invader) {
  const { x, y } = invader;
  const w = INVADER_WIDTH;
  const h = INVADER_HEIGHT;
  ctx.fillStyle = theme.colors[invader.color];
  ctx.fillRect(x + w * 0.2, y, w * 0.6, h * 0.6);
  ctx.fillRect(x, y + h * 0.25, w, h * 0.35);
  // Legs.
  ctx.fillRect(x + w * 0.05, y + h * 0.6, w * 0.15, h * 0.4);
  ctx.fillRect(x + w * 0.8, y + h * 0.6, w * 0.15, h * 0.4);
  ctx.fillRect(x + w * 0.35, y + h * 0.6, w * 0.3, h * 0.2);
  // Eyes.
  ctx.fillStyle = theme.colors.background;
  ctx.fillRect(x + w * 0.3, y + h * 0.2, w * 0.12, h * 0.15);
  ctx.fillRect(x + w * 0.58, y + h * 0.2, w * 0.12, h * 0.15);
}

function draw(ctx: CanvasRenderingContext2D, state: SpaceInvadersState) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const invader of state.invaders) drawInvader(ctx, invader);

  ctx.fillStyle = colors.text;
  if (state.shot) ctx.fillRect(state.shot.x - 2, state.shot.y - 10, 4, 14);

  ctx.fillStyle = colors.danger;
  for (const bomb of state.bombs) ctx.fillRect(bomb.x - 3, bomb.y - 6, 6, 12);

  // Player cannon.
  ctx.fillStyle = colors.accent;
  ctx.fillRect(state.playerX - PLAYER_WIDTH / 2, PLAYER_Y - 4, PLAYER_WIDTH, 16);
  ctx.fillRect(state.playerX - 4, PLAYER_Y - 16, 8, 12);

  ctx.fillStyle = colors.wood;
  ctx.fillRect(0, PLAYER_Y + 18, WIDTH, 4);

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, 32);
  ctx.textAlign = 'center';
  ctx.fillText(`Wave ${state.wave}`, WIDTH / 2, 32);
  ctx.textAlign = 'right';
  ctx.fillText(`Lives ${state.lives}`, WIDTH - 16, 32);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Invaded! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click or press space to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const spaceInvaders: CarnivalGame = {
  id: 'space-invaders',
  name: 'Space Invaders',
  description: 'Hold off the marching invaders. The higher the row, the more it scores.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const held = { left: false, right: false };
    let pointerX: number | null = null;

    const restartOrFire = () => {
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        fire(state);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'a') held.left = true;
      else if (event.key === 'ArrowRight' || event.key === 'd') held.right = true;
      else if (event.key === ' ') {
        // Firing leaves the mouse in charge of movement.
        if (!event.repeat) restartOrFire();
        event.preventDefault();
        return;
      } else return;
      pointerX = null;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key === 'a') held.left = false;
      if (event.key === 'ArrowRight' || event.key === 'd') held.right = false;
    };
    // A key released outside the window never sends keyup.
    const onBlur = () => {
      held.left = false;
      held.right = false;
    };
    const toCanvasX = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return ((event.clientX - rect.left) / rect.width) * WIDTH;
    };
    const onMove = (event: PointerEvent) => {
      pointerX = toCanvasX(event);
    };
    const onDown = (event: PointerEvent) => {
      pointerX = toCanvasX(event);
      restartOrFire();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      if (pointerX !== null) {
        // Follow the mouse, at the cannon's top speed.
        const gap = pointerX - state.playerX;
        state.move = Math.abs(gap) < PLAYER_SPEED * dt ? 0 : gap > 0 ? 1 : -1;
        if (state.move === 0) state.playerX = pointerX;
      } else {
        state.move = held.left === held.right ? 0 : held.left ? -1 : 1;
      }
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(spaceInvaders.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default spaceInvaders;
