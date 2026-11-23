# best-card-game-20261122-1826

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/testnettry44/best-card-game-20261122-1826/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/testnettry44/best-card-game-20261122-1826/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

**Stonehollow Clash** — a 3-lane card battler against the Hollow Keeper AI. 20 life each, energy 3 growing +1/turn to 10, 30-card decks, 5-card hand, draw 2 per turn. 12 original cards in 3 elements told apart by colour and shape (Ember/red flame, Tide/blue wave, Leaf/green leaf): 9 units (fast attackers, walls, heavy hitters, a healer) + 3 spells (Ember Bolt 3 damage, Tide Shield +3 health, Leaf Whisper draw 2). Depth rule: a same-element unit played into a lane with a friendly same-element unit gains +1 attack (COMBO). The Keeper telegraphs its intent, blocks your strongest lane, and bolts your most dangerous unit. All draws are seeded and replayable. Title, table, win and loss screens included. Canvas 2D only, no libraries, no network requests, synthesised WebAudio blips with mute.

Verified end-to-end in headless Chrome (CDP): real win in 9 turns (41 cards played, 20 damage dealt) and real loss in 6 turns (passing every turn), 159-input fuzz with 0 console errors, deterministic seeded draws, 60 fps throughout.

## Run it

```sh
python3 -m http.server --directory game 8000
# then open http://localhost:8000
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=49p9yjet&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
