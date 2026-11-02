# Ghost City

Ghosts peek out of a grid of nine city windows. Catch as many as you can before dawn.

Every window has its own ghost, with its own name, colour, speed and points.

## How to play

- Click a ghost while it's in its window to catch it. It fades away if you're too slow.
- The round lasts 30 seconds. As it goes on, ghosts appear more often and stay out
  for less time: from every 1 second and 1.4 seconds out at the start, to every
  0.35 seconds and 0.6 seconds out at the end. Each ghost then stays out for that
  time multiplied by its linger.
- Click again on the game over screen to play another round.

## The ghosts

Row by row, from the top left. Each window shows its ghost's name and points.

| Window       | Ghost    | Persona             | Points | Linger |
| ------------ | -------- | ------------------- | ------ | ------ |
| Top left     | Sheets   | the classic         | 10     | 1      |
| Top middle   | Flicker  | always in a hurry   | 30     | 0.5    |
| Top right    | Grumbles | slow and sulky      | 5      | 1.5    |
| Middle left  | Splash   | drowned sailor      | 15     | 0.9    |
| Centre       | Duchess  | won't be rushed     | 10     | 1.3    |
| Middle right | Ember    | hot-headed          | 20     | 0.7    |
| Bottom left  | Splinter | haunts the attic    | 15     | 1      |
| Bottom mid   | Peekaboo | shy, blink and miss | 25     | 0.6    |
| Bottom right | Wisp     | barely there        | 20     | 0.8    |

## Scoring

Each ghost you catch scores its persona's points. Quick ghosts are worth more.
Clicking a dark window costs nothing.

Your final score is saved to the carnival's score board when the round ends.

## Files

- `game.ts`: the game logic (`createState`, `step`, `grab`, `upTime`, `popGap`),
  the `PERSONAS` list and the `ghostCity` entry, the default export the midway finds.
- `game.test.ts`: tests for the game logic.
