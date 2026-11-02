import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  POINTS_PER_WHACK,
  ROUND_SECONDS,
  ROWS,
  createState,
  popGap,
  step,
  upTime,
  whack,
} from './game';

describe('whack-a-mole', () => {
  it('starts with a full clock, no score and every hole empty', () => {
    const state = createState();
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.holes).toHaveLength(COLUMNS * ROWS);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('pops a mole up from an empty hole', () => {
    const state = createState();
    step(state, state.nextPop, () => 0);
    expect(state.holes[0].up).toBeGreaterThan(0);
    expect(state.holes.filter((h) => h.up > 0)).toHaveLength(1);
  });

  it('drops the mole back down when its time is up', () => {
    const state = createState();
    state.nextPop = 100;
    state.holes[4].up = 0.5;
    step(state, 0.6);
    expect(state.holes[4].up).toBe(0);
  });

  it('scores a whack on a mole that is up and sends it down', () => {
    const state = createState();
    const hole = state.holes[2];
    hole.up = 1;
    expect(whack(state, hole.x + 5, hole.y - 5)).toBe(true);
    expect(state.score).toBe(POINTS_PER_WHACK);
    expect(hole.up).toBe(0);
  });

  it('scores nothing for whacking an empty hole', () => {
    const state = createState();
    const hole = state.holes[2];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('scores nothing for whacking twice on the same mole', () => {
    const state = createState();
    const hole = state.holes[0];
    hole.up = 1;
    whack(state, hole.x, hole.y);
    whack(state, hole.x, hole.y);
    expect(state.score).toBe(POINTS_PER_WHACK);
  });

  it('pops moles faster and keeps them up for less time as the round goes on', () => {
    const early = createState();
    const late = createState();
    late.timeLeft = 2;
    expect(popGap(late)).toBeLessThan(popGap(early));
    expect(upTime(late)).toBeLessThan(upTime(early));
  });

  it('ends the round when the clock runs out and clears the moles', () => {
    const state = createState();
    state.holes[0].up = 5;
    state.timeLeft = 0.1;
    step(state, 0.2);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    expect(state.holes.every((h) => h.up === 0)).toBe(true);
  });

  it('ignores whacks once the round is over', () => {
    const state = createState();
    state.phase = 'over';
    const hole = state.holes[0];
    hole.up = 1;
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });
});
