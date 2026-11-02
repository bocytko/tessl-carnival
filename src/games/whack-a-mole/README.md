# Whack-a-Mole

Moles pop up from a grid of nine holes. Whack as many as you can before the clock runs out.

## How to play

- Click a mole while it's up to whack it. It drops back down if you're too slow.
- The round lasts 30 seconds. As it goes on, moles pop up more often and stay up
  for less time: from every 1 second and 1.4 seconds up at the start, to every
  0.35 seconds and 0.6 seconds up at the end.
- Click again on the game over screen to play another round.

## Scoring

Each mole you whack scores 10 points. Clicking an empty hole costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `whack`, `upTime`, `popGap`) and
  the `whackAMole` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
