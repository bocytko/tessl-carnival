import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  DROP,
  INVADER_HEIGHT,
  INVADER_WIDTH,
  LIVES,
  PLAYER_Y,
  ROWS,
  createState,
  fire,
  marchSpeed,
  step,
  type Invader,
} from './game';

const invader = (x: number, y: number, points = 20): Invader => ({
  x,
  y,
  color: 'orange',
  points,
});

describe('space invaders', () => {
  it('starts with a full wave, full lives and no score', () => {
    const state = createState();
    expect(state.invaders).toHaveLength(ROWS.length * COLUMNS);
    expect(state.lives).toBe(LIVES);
    expect(state.score).toBe(0);
    expect(state.wave).toBe(1);
    expect(state.phase).toBe('playing');
  });

  it('has a row of red, orange, green and purple invaders', () => {
    const colors = new Set(createState().invaders.map((i) => i.color));
    expect([...colors].sort()).toEqual(['green', 'orange', 'purple', 'red']);
  });

  it('scores higher rows more than lower ones', () => {
    const points = ROWS.map((r) => r.points);
    expect(points).toEqual([...points].sort((a, b) => b - a));
  });

  it('allows only one shot in the air at a time', () => {
    const state = createState();
    expect(fire(state)).toBe(true);
    expect(fire(state)).toBe(false);
  });

  it('scores a hit and removes the invader', () => {
    const state = createState();
    const target = invader(200, 200, 30);
    state.invaders = [target, invader(400, 200)];
    state.shot = { x: 200 + INVADER_WIDTH / 2, y: 200 + INVADER_HEIGHT / 2 };
    step(state, 0);
    expect(state.score).toBe(30);
    expect(state.invaders).not.toContain(target);
    expect(state.shot).toBeNull();
  });

  it('frees the shot when it leaves the top of the screen', () => {
    const state = createState();
    state.shot = { x: 5, y: 1 };
    step(state, 0.1);
    expect(state.shot).toBeNull();
    expect(fire(state)).toBe(true);
  });

  it('drops and turns round when the invaders reach a side', () => {
    const state = createState();
    state.invaders = [invader(800 - 10 - INVADER_WIDTH, 100)];
    step(state, 0.1);
    expect(state.invaders[0].y).toBe(100 + DROP);
    expect(state.direction).toBe(-1);
  });

  it('marches faster as invaders are shot down', () => {
    const state = createState();
    const full = marchSpeed(state);
    state.invaders = state.invaders.slice(0, 4);
    expect(marchSpeed(state)).toBeGreaterThan(full);
  });

  it('loses a life when a bomb hits the cannon', () => {
    const state = createState();
    state.bombs = [{ x: state.playerX, y: PLAYER_Y }];
    step(state, 0);
    expect(state.lives).toBe(LIVES - 1);
    expect(state.bombs).toHaveLength(0);
  });

  it('drops a bomb from an invader when the bomb timer runs out', () => {
    const state = createState();
    state.bombTimer = 0;
    step(state, 0, () => 0);
    expect(state.bombs).toHaveLength(1);
  });

  it('ends the game when the last life is lost', () => {
    const state = createState();
    state.lives = 1;
    state.bombs = [{ x: state.playerX, y: PLAYER_Y }];
    step(state, 0);
    expect(state.lives).toBe(0);
    expect(state.phase).toBe('over');
  });

  it('ends the game when the invaders reach the cannon', () => {
    const state = createState();
    state.invaders = [invader(400, PLAYER_Y - INVADER_HEIGHT)];
    step(state, 0);
    expect(state.phase).toBe('over');
  });

  it('sends a new, faster wave when every invader is shot', () => {
    const state = createState();
    state.invaders = [invader(200, 200)];
    state.shot = { x: 200 + INVADER_WIDTH / 2, y: 200 + INVADER_HEIGHT / 2 };
    step(state, 0);
    expect(state.wave).toBe(2);
    expect(state.invaders).toHaveLength(ROWS.length * COLUMNS);
    expect(state.phase).toBe('playing');
    expect(marchSpeed(state)).toBeGreaterThan(marchSpeed(createState()));
  });

  it('keeps the cannon on the screen', () => {
    const state = createState();
    state.move = -1;
    step(state, 10);
    expect(state.playerX).toBeGreaterThan(0);
  });
});
