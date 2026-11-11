# Space Invaders

Hold off four rows of marching invaders: purple, red, orange and green.

## How to play

- Move the cannon with the left and right arrow keys (or `A` and `D`), or by
  moving the mouse over the game.
- Press space or click to fire. Hold space, or press it quickly, for rapid
  fire: the cannon fires at most once every 20 ms.
- The invaders march sideways, and drop a step each time they reach a side.
  They march faster as their numbers fall, and drop bombs on you.
- You have 3 lives. A bomb that hits your cannon costs a life.
- Shoot every invader and a new, faster wave arrives. Your score and lives
  carry over.
- The game ends when you lose your last life or the invaders reach your
  cannon. Click or press space on the game over screen to play again.

## Scoring

| Row    | Colour | Points |
| ------ | ------ | ------ |
| Top    | Purple | 40     |
| Second | Red    | 30     |
| Third  | Orange | 20     |
| Bottom | Green  | 10     |

Your final score is saved to the carnival's score board when the game ends.

## Files

- `game.ts`: the game logic (`createState`, `createWave`, `fire`, `step`,
  `marchSpeed`) and the `spaceInvaders` entry, the default export the midway
  finds.
- `game.test.ts`: tests for the game logic.
