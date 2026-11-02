import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  PERSONAS,
  ROUND_SECONDS,
  ROWS,
  createState,
  grab,
  popGap,
  step,
  upTime,
} from './game';

describe('ghost-city', () => {
  it('starts with a full clock, no score and every window dark', () => {
    const state = createState();
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.windows).toHaveLength(COLUMNS * ROWS);
    expect(state.windows.every((w) => w.up === 0)).toBe(true);
  });

  it('gives every window a different ghost persona', () => {
    const state = createState();
    const names = state.windows.map((w) => w.persona.name);
    expect(new Set(names).size).toBe(state.windows.length);
    expect(PERSONAS).toHaveLength(state.windows.length);
  });

  it('brings a ghost out in a dark window, for as long as its persona lingers', () => {
    const state = createState();
    step(state, state.nextPop, () => 0);
    const window = state.windows[0];
    expect(window.up).toBeCloseTo(upTime(state) * window.persona.linger);
    expect(state.windows.filter((w) => w.up > 0)).toHaveLength(1);
  });

  it('keeps quick ghosts out for less time than slow ones', () => {
    const quick = createState();
    const slow = createState();
    step(quick, quick.nextPop, () => 1 / 9 + 0.01); // window 1, Flicker
    step(slow, slow.nextPop, () => 2 / 9 + 0.01); // window 2, Grumbles
    expect(quick.windows[1].up).toBeLessThan(slow.windows[2].up);
  });

  it('sends the ghost away when its time is up', () => {
    const state = createState();
    state.nextPop = 100;
    state.windows[4].up = 0.5;
    step(state, 0.6);
    expect(state.windows[4].up).toBe(0);
  });

  it("scores the persona's points for catching a ghost", () => {
    const state = createState();
    const window = state.windows[1];
    window.up = 1;
    expect(grab(state, window.x + 5, window.y - 5)).toBe(true);
    expect(state.score).toBe(window.persona.points);
    expect(state.catches).toBe(1);
    expect(window.up).toBe(0);
  });

  it('scores different points for different ghosts', () => {
    const state = createState();
    for (const window of state.windows) {
      window.up = 1;
      grab(state, window.x, window.y);
    }
    const total = PERSONAS.reduce((sum, p) => sum + p.points, 0);
    expect(state.score).toBe(total);
    expect(new Set(PERSONAS.map((p) => p.points)).size).toBeGreaterThan(1);
  });

  it('scores nothing for grabbing at a dark window, or twice at the same ghost', () => {
    const state = createState();
    const window = state.windows[2];
    expect(grab(state, window.x, window.y)).toBe(false);
    window.up = 1;
    grab(state, window.x, window.y);
    grab(state, window.x, window.y);
    expect(state.score).toBe(window.persona.points);
  });

  it('brings ghosts out faster and for less time as the round goes on', () => {
    const early = createState();
    const late = createState();
    late.timeLeft = 2;
    expect(popGap(late)).toBeLessThan(popGap(early));
    expect(upTime(late)).toBeLessThan(upTime(early));
  });

  it('ends the round when the clock runs out and clears the ghosts', () => {
    const state = createState();
    state.windows[0].up = 5;
    state.timeLeft = 0.1;
    step(state, 0.2);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.windows.every((w) => w.up === 0)).toBe(true);
  });

  it('ignores grabs once the round is over', () => {
    const state = createState();
    state.phase = 'over';
    const window = state.windows[0];
    window.up = 1;
    expect(grab(state, window.x, window.y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
