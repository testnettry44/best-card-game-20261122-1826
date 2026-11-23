// Rules, state machine and turn flow for Stonehollow Clash.
// A game: 3 lanes, 20 life each side, energy starts at 3 and grows by 1 a
// turn to a max of 10, 30-card decks, up to 5 cards in hand, draw 2 at the
// start of a turn. Units fight across their lanes at the end of each turn;
// damage that gets through a lane hits the other side's life directly.

import { buildDeck } from './cards.js';
import { createSeededRandom } from './random.js';

export const MAX_LIFE = 20;
export const MAX_ENERGY = 10;
export const MAX_HAND = 5;
export const LANES = 3;

export function createSide(seed, isPlayer) {
  const random = createSeededRandom(isPlayer ? seed : seed + 7919);
  return {
    life: MAX_LIFE,
    energy: 3,
    maxEnergy: 3,
    deck: buildDeck(random),
    hand: [],
    discard: [],
    lanes: [[], [], []], // lanes[lane] holds that side's units in the lane
    random,
  };
}

export function createGame(seed) {
  const game = {
    seed,
    screen: 'title', // title | table | win | loss
    phase: 'idle', // idle | player | combat | ai | over
    turn: 1,
    player: createSide(seed, true),
    enemy: createSide(seed, false),
    selectedHandIndex: -1,
    message: 'Welcome to Stonehollow.',
    aiIntent: '',
    comboFlash: null,
    stats: { turnsPlayed: 0, damageDealt: 0, unitsSummoned: 0, cardsPlayed: 0 },
    combatLog: [],
    winner: null,
    firstDraws: [],
  };
  return game;
}

export function drawCards(side, count) {
  const drawn = [];
  for (let n = 0; n < count; n += 1) {
    if (side.hand.length >= MAX_HAND) break;
    if (side.deck.length === 0) break;
    const card = side.deck.shift();
    side.hand.push(card);
    drawn.push(card.id);
  }
  return drawn;
}

export function startMatch(game) {
  game.screen = 'table';
  game.phase = 'player';
  game.turn = 1;
  game.stats = { turnsPlayed: 0, damageDealt: 0, unitsSummoned: 0, cardsPlayed: 0 };
  game.combatLog = [];
  game.winner = null;
  game.message = 'Your turn — play cards, then End Turn.';
  game.aiIntent = '';
  game.player.maxEnergy = 3;
  game.player.energy = 3;
  game.enemy.maxEnergy = 3;
  game.enemy.energy = 3;
  game.firstDraws = drawCards(game.player, 3);
  drawCards(game.enemy, 3);
  drawCards(game.player, 2);
  drawCards(game.enemy, 2);
  return game;
}

export function beginPlayerTurn(game) {
  game.turn += 1;
  game.phase = 'player';
  game.stats.turnsPlayed = game.turn;
  const side = game.player;
  side.maxEnergy = Math.min(MAX_ENERGY, side.maxEnergy + 1);
  side.energy = side.maxEnergy;
  drawCards(side, 2);
  game.message = `Turn ${game.turn} — your turn. Draw 2, energy ${side.energy}.`;
  game.aiIntent = '';
  return game;
}

export function canAfford(side, card) {
  return side.energy >= card.cost;
}

// Depth rule: a unit played into a lane where a friendly unit of the same
// element already stands gains +1 attack. Returns the bonus applied.
export function comboBonusFor(side, lane, card) {
  const same = side.lanes[lane].some((unit) => unit.element === card.element);
  return same ? 1 : 0;
}

export function playUnitCard(game, side, handIndex, lane) {
  const card = side.hand[handIndex];
  if (!card || card.kind !== 'unit') return null;
  if (!canAfford(side, card)) return null;
  if (lane < 0 || lane >= LANES) return null;
  const bonus = comboBonusFor(side, lane, card);
  side.energy -= card.cost;
  side.hand.splice(handIndex, 1);
  const unit = {
    ...card,
    attack: card.attack + bonus,
    health: card.health,
    maxHealth: card.health,
    combo: bonus > 0,
    justPlayed: true,
  };
  side.lanes[lane].push(unit);
  side.discard.push({ ...card, spent: 'summoned' });
  game.stats.unitsSummoned += 1;
  game.stats.cardsPlayed += 1;
  if (bonus > 0) {
    game.comboFlash = { lane, side: side === game.player ? 'player' : 'enemy', text: 'COMBO +1 ATK' };
    game.message = `${card.name} gains +1 attack — same-element combo!`;
  } else {
    game.message = `${card.name} takes lane ${lane + 1}.`;
  }
  return unit;
}

export function playSpellCard(game, side, handIndex, target) {
  const card = side.hand[handIndex];
  if (!card || card.kind !== 'spell') return null;
  if (!canAfford(side, card)) return null;
  if ((card.id === 'bolt' || card.id === 'shield') && !target) return null;
  side.energy -= card.cost;
  side.hand.splice(handIndex, 1);
  side.discard.push({ ...card, spent: 'cast' });
  game.stats.cardsPlayed += 1;
  if (card.id === 'bolt') {
    if (!target) return null;
    target.health -= 3;
    game.message = `Ember Bolt hits ${target.name} for 3.`;
    return { effect: 'bolt', target };
  }
  if (card.id === 'shield') {
    if (!target) return null;
    target.health += 3;
    target.maxHealth += 3;
    game.message = `Tide Shield guards ${target.name} (+3 health).`;
    return { effect: 'shield', target };
  }
  if (card.id === 'whisper') {
    const drawn = drawCards(side, 2);
    game.message = `Leaf Whisper draws ${drawn.length} card${drawn.length === 1 ? '' : 's'}.`;
    return { effect: 'draw', drawn };
  }
  return { effect: 'none' };
}

// One combat step: every lane fights at once. Units attack in order down
// their lane: each unit strikes the opposing front unit, and when the
// front unit falls the next attacker hits the one behind it. Attackers
// left standing with no enemy unit in front of them hit the other side's
// life directly. A Grove Warden heals its owner when it fights.
export function resolveCombat(game) {
  const events = [];
  for (let lane = 0; lane < LANES; lane += 1) {
    const mine = game.player.lanes[lane];
    const theirs = game.enemy.lanes[lane];
    let clashPlayer = 0;
    let clashEnemy = 0;
    let throughPlayer = 0;
    let throughEnemy = 0;
    // Player units attack, front to back. Every unit strikes the opposing
    // front unit, but only the lane's front unit can hit the enemy life
    // directly when the lane stands empty.
    let frontAttacked = false;
    for (const unit of [...mine]) {
      if (unit.health <= 0) continue;
      const target = theirs.find((u) => u.health > 0);
      if (target) {
        target.health -= unit.attack;
        clashPlayer += unit.attack;
        if (unit.heal) {
          game.player.life = Math.min(MAX_LIFE, game.player.life + unit.heal);
          events.push({ lane, kind: 'heal', side: 'player', amount: unit.heal });
        }
      } else if (!frontAttacked) {
        frontAttacked = true;
        game.enemy.life -= unit.attack;
        game.stats.damageDealt += unit.attack;
        throughPlayer += unit.attack;
      }
    }
    // Enemy units answer in the same way.
    frontAttacked = false;
    for (const unit of [...theirs]) {
      if (unit.health <= 0) continue;
      const target = mine.find((u) => u.health > 0);
      if (target) {
        target.health -= unit.attack;
        clashEnemy += unit.attack;
        if (unit.heal) {
          game.enemy.life = Math.min(MAX_LIFE, game.enemy.life + unit.heal);
          events.push({ lane, kind: 'heal', side: 'enemy', amount: unit.heal });
        }
      } else if (!frontAttacked) {
        frontAttacked = true;
        game.player.life -= unit.attack;
        throughEnemy += unit.attack;
      }
    }
    if (clashPlayer > 0 || clashEnemy > 0) {
      events.push({ lane, kind: 'clash', playerDamage: clashPlayer, enemyDamage: clashEnemy });
    }
    if (throughPlayer > 0) {
      events.push({ lane, kind: 'through', side: 'player', damage: throughPlayer });
    }
    if (throughEnemy > 0) {
      events.push({ lane, kind: 'through', side: 'enemy', damage: throughEnemy });
    }
  }
  // Remove the fallen from both boards.
  for (let lane = 0; lane < LANES; lane += 1) {
    game.player.lanes[lane] = game.player.lanes[lane].filter((unit) => unit.health > 0);
    game.enemy.lanes[lane] = game.enemy.lanes[lane].filter((unit) => unit.health > 0);
  }
  game.combatLog = events;
  checkEnd(game);
  return events;
}

export function checkEnd(game) {
  if (game.enemy.life <= 0 && game.player.life <= 0) {
    game.enemy.life = 0;
    game.player.life = 0;
    game.winner = 'player';
  } else if (game.enemy.life <= 0) {
    game.enemy.life = 0;
    game.winner = 'player';
  } else if (game.player.life <= 0) {
    game.player.life = 0;
    game.winner = 'enemy';
  }
  if (game.winner) {
    game.phase = 'over';
    game.screen = game.winner === 'player' ? 'win' : 'loss';
    game.message = game.winner === 'player'
      ? 'Victory! The Hollow Keeper falls.'
      : 'Defeat. The hollow keeps its stones.';
  }
  return game.winner;
}

export function endPlayerTurn(game) {
  if (game.phase !== 'player') return game;
  game.phase = 'combat';
  game.selectedHandIndex = -1;
  resolveCombat(game);
  return game;
}
