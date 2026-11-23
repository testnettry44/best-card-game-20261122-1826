// The Hollow Keeper — the AI opponent of Stonehollow Clash.
// Readable and fair: it says what it intends before it acts, it places
// units to block the player's strongest lane, and it spends its Ember Bolt
// on the player's most dangerous unit when it can.

import { comboBonusFor, playSpellCard, playUnitCard } from './rules.js';

export function strongestPlayerLane(game) {
  let bestLane = 0;
  let bestAttack = -1;
  for (let lane = 0; lane < 3; lane += 1) {
    const attack = game.player.lanes[lane].reduce((sum, unit) => sum + unit.attack, 0);
    if (attack > bestAttack) {
      bestAttack = attack;
      bestLane = lane;
    }
  }
  return { lane: bestLane, attack: bestAttack };
}

export function mostDangerousPlayerUnit(game) {
  let best = null;
  let bestAttack = -1;
  for (let lane = 0; lane < 3; lane += 1) {
    for (const unit of game.player.lanes[lane]) {
      if (unit.attack > bestAttack) {
        bestAttack = unit.attack;
        best = { unit, lane };
      }
    }
  }
  return best;
}

export function weakestFriendlyUnit(game) {
  let best = null;
  for (let lane = 0; lane < 3; lane += 1) {
    for (const unit of game.enemy.lanes[lane]) {
      if (!best || unit.health < best.unit.health) best = { unit, lane };
    }
  }
  return best;
}

// Plan one AI action at a time so the table can show each intent, then act.
// Returns a description of what it did, or null when it is done.
export function planKeeperAction(game) {
  const keeper = game.enemy;
  const hand = keeper.hand;

  // 1. Bolt the player's most dangerous unit when it can be removed.
  const boltIndex = hand.findIndex((card) => card.id === 'bolt');
  const danger = mostDangerousPlayerUnit(game);
  if (boltIndex >= 0 && danger && keeper.energy >= 2 && danger.unit.health <= 3) {
    return { kind: 'bolt', handIndex: boltIndex, target: danger.unit, lane: danger.lane,
      intent: `Hollow Keeper aims an Ember Bolt at your ${danger.unit.name}!` };
  }
  // 2. Shield its weakest unit when it is hurt.
  const shieldIndex = hand.findIndex((card) => card.id === 'shield');
  const weak = weakestFriendlyUnit(game);
  if (shieldIndex >= 0 && weak && keeper.energy >= 1 && weak.unit.health <= 2) {
    return { kind: 'shield', handIndex: shieldIndex, target: weak.unit, lane: weak.lane,
      intent: `Hollow Keeper shields its ${weak.unit.name}.` };
  }
  // 3. Play a unit into the player's strongest lane to block it, preferring
  // a same-element combo and the best attack per energy.
  let bestUnit = null;
  for (let i = 0; i < hand.length; i += 1) {
    const card = hand[i];
    if (card.kind !== 'unit' || keeper.energy < card.cost) continue;
    const block = strongestPlayerLane(game);
    const lane = game.player.lanes[block.lane].length > 0 ? block.lane : block.lane;
    const bonus = comboBonusFor(keeper, lane, card);
    const value = (card.attack + bonus) / card.cost + card.health / 6;
    if (!bestUnit || value > bestUnit.value) {
      bestUnit = { value, handIndex: i, lane, card, bonus };
    }
  }
  if (bestUnit) {
    return { kind: 'unit', handIndex: bestUnit.handIndex, lane: bestUnit.lane,
      intent: `Hollow Keeper summons ${bestUnit.card.name} to lane ${bestUnit.lane + 1} to block you.` };
  }
  // 4. Draw when it has energy to spare and cards to find.
  const whisperIndex = hand.findIndex((card) => card.id === 'whisper');
  if (whisperIndex >= 0 && keeper.energy >= 1 && hand.length <= 3) {
    return { kind: 'whisper', handIndex: whisperIndex,
      intent: 'Hollow Keeper whispers to the grove and draws 2 cards.' };
  }
  return null;
}

export function takeKeeperAction(game, plan) {
  if (!plan) return null;
  const keeper = game.enemy;
  game.aiIntent = plan.intent;
  game.message = plan.intent;
  if (plan.kind === 'unit') {
    const unit = playUnitCard(game, keeper, plan.handIndex, plan.lane);
    return unit ? { done: 'unit', name: unit.name, lane: plan.lane } : null;
  }
  if (plan.kind === 'bolt' || plan.kind === 'shield') {
    const result = playSpellCard(game, keeper, plan.handIndex, plan.target);
    return result ? { done: plan.kind, name: plan.target.name } : null;
  }
  if (plan.kind === 'whisper') {
    const result = playSpellCard(game, keeper, plan.handIndex, null);
    return result ? { done: 'whisper' } : null;
  }
  return null;
}

// Run the Keeper's whole turn at once (used by headless playtests).
// Returns how many actions it took.
export function runKeeperTurn(game) {
  let actions = 0;
  const keeper = game.enemy;
  keeper.maxEnergy = Math.min(10, keeper.maxEnergy + 1);
  keeper.energy = keeper.maxEnergy;
  for (let n = 0; n < 2 && keeper.hand.length < 5 && keeper.deck.length > 0; n += 1) {
    keeper.hand.push(keeper.deck.shift());
  }
  let guard = 0;
  while (guard < 8) {
    guard += 1;
    const plan = planKeeperAction(game);
    if (!plan) break;
    if (takeKeeperAction(game, plan)) actions += 1;
    else break;
  }
  return actions;
}
