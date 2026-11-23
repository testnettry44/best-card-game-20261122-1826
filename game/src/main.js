// Bootstrap and wiring for Stonehollow Clash.
// Owns the game loop, the turn sequence (player -> combat -> Keeper ->
// combat -> player), the combat presentation, the screenshot shot modes
// and the headless test hook window.__stonehollow.

import { createGame, startMatch, beginPlayerTurn, endPlayerTurn, resolveCombat, playUnitCard, playSpellCard, checkEnd } from './rules.js';
import { planKeeperAction, takeKeeperAction } from './ai.js';
import { drawGame, computeLayout, updateAnimations, spawnParticles, spawnFloater, spawnConfetti, launchFlyingCard, anim } from './render.js';
import { attachInput } from './input.js';
import { playDealSound, playCardSound, playClashSound, playHealSound, playWinSound, playLossSound, playClickSound, toggleMute, isMuted } from './sounds.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot') || '';
const seedParam = Number.parseInt(params.get('seed') || '7', 10);

let game = createGame(Number.isFinite(seedParam) ? seedParam : 7);
const ui = { hoverHandIndex: -1, muted: false };
let turnToken = 0;
let lastFrame = performance.now();
let frameCount = 0;
let fps = 0;
let fpsWindowStart = performance.now();
let consoleErrors = 0;

window.addEventListener('error', () => { consoleErrors += 1; });

function laneCenter(lane) {
  const layout = computeLayout(game);
  const rect = layout.laneRects[lane];
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

function presentCombat(events) {
  for (const event of events) {
    const center = laneCenter(event.lane);
    if (event.kind === 'clash') {
      const myUnit = game.player.lanes[event.lane][0];
      const theirUnit = game.enemy.lanes[event.lane][0];
      if (myUnit) anim.lunge[myUnit.uid] = { t: 0, dir: -1 };
      if (theirUnit) anim.lunge[theirUnit.uid] = { t: 0, dir: 1 };
      spawnParticles(center.x, center.y, '#ffd23e', 14);
      spawnFloater(center.x - 40, center.y - 20, `-${event.enemyDamage}`, '#ff8a7a');
      spawnFloater(center.x + 40, center.y - 20, `-${event.playerDamage}`, '#8fc7ff');
      playClashSound();
    } else if (event.kind === 'through') {
      const target = event.side === 'player' ? 'enemy' : 'player';
      spawnFloater(center.x, center.y + (event.side === 'player' ? -70 : 70),
        `-${event.damage} LIFE`, event.side === 'player' ? '#ffd23e' : '#ff6b5e');
      spawnParticles(center.x, center.y, '#e2483a', 18);
      playClashSound();
    } else if (event.kind === 'heal') {
      spawnFloater(center.x, center.y + (event.side === 'player' ? 70 : -70),
        `+${event.amount} LIFE`, '#7be495');
      playHealSound();
    }
  }
}

function finishTurnSequence() {
  if (game.winner) {
    onGameOver();
    return;
  }
  runKeeperTurnAnimated();
}

function onGameOver() {
  game.phase = 'over';
  if (game.winner === 'player') {
    spawnConfetti();
    playWinSound();
  } else {
    playLossSound();
  }
}

function runKeeperTurnAnimated() {
  const token = turnToken;
  game.phase = 'ai';
  game.message = 'The Hollow Keeper takes its turn…';
  const keeper = game.enemy;
  keeper.maxEnergy = Math.min(10, keeper.maxEnergy + 1);
  keeper.energy = keeper.maxEnergy;
  const drawn = [];
  for (let n = 0; n < 2 && keeper.hand.length < 5 && keeper.deck.length > 0; n += 1) {
    keeper.hand.push(keeper.deck.shift());
    drawn.push(1);
  }
  if (drawn.length) playDealSound();
  let steps = 0;
  function step() {
    if (token !== turnToken || game.winner) return;
    if (steps >= 8) { endKeeperTurn(); return; }
    steps += 1;
    const plan = planKeeperAction(game);
    if (!plan) { endKeeperTurn(); return; }
    game.aiIntent = plan.intent;
    const before = keeper.hand.length;
    const result = takeKeeperAction(game, plan);
    if (result) {
      playCardSound();
      if (result.done === 'unit') {
        const center = laneCenter(result.lane);
        spawnParticles(center.x, center.y, '#c9a7ff', 12);
      }
    }
    if (keeper.hand.length === before && !result) { endKeeperTurn(); return; }
    setTimeout(step, 650);
  }
  function endKeeperTurn() {
    if (token !== turnToken) return;
    game.aiIntent = '';
    game.phase = 'combat';
    const events = resolveCombat(game);
    presentCombat(events);
    setTimeout(() => {
      if (token !== turnToken) return;
      if (game.winner) { onGameOver(); return; }
      beginPlayerTurn(game);
      playDealSound();
    }, 1300);
  }
  setTimeout(step, 700);
}

const actions = {
  startGame() {
    turnToken += 1;
    game = createGame(game.seed);
    startMatch(game);
    playDealSound();
    playClickSound();
  },
  restart() {
    turnToken += 1;
    game = createGame((Math.random() * 100000) | 0);
    startMatch(game);
    playDealSound();
  },
  selectCard(index) {
    const card = game.player.hand[index];
    if (!card) return;
    if (game.player.energy < card.cost) {
      game.message = `Not enough energy for ${card.name} (${card.cost}).`;
      return;
    }
    game.selectedHandIndex = game.selectedHandIndex === index ? -1 : index;
    game.message = card.kind === 'unit'
      ? `${card.name} selected — click a lane.`
      : `${card.name} selected — click a target.`;
    playClickSound();
  },
  playUnit(handIndex, lane) {
    const card = game.player.hand[handIndex];
    if (!card) return;
    const layout = computeLayout(game);
    const from = layout.handRects[handIndex] || { x: 640, y: 600 };
    const center = laneCenter(lane);
    const unit = playUnitCard(game, game.player, handIndex, lane);
    if (!unit) { game.message = 'You cannot play that card there.'; return; }
    game.selectedHandIndex = -1;
    launchFlyingCard(card, from.x, from.y, center.x - 52, center.y + 20);
    spawnParticles(center.x, center.y + 20, '#ffd23e', 16);
    playCardSound();
    if (game.comboFlash) setTimeout(() => { game.comboFlash = null; }, 1600);
  },
  castSpell(handIndex, target) {
    const card = game.player.hand[handIndex];
    if (!card) return;
    const result = playSpellCard(game, game.player, handIndex, target);
    if (!result) { game.message = 'That spell needs a valid target.'; return; }
    game.selectedHandIndex = -1;
    playCardSound();
    if (result.effect === 'bolt' && target) {
      spawnParticles(640, 200, '#e2483a', 20);
      spawnFloater(640, 180, '-3', '#ff8a7a');
    }
    if (result.effect === 'shield' && target) spawnParticles(640, 300, '#2f7fd0', 16);
    checkEnd(game);
    if (game.winner) onGameOver();
  },
  endTurn() {
    if (game.phase !== 'player') return;
    const token = turnToken;
    endPlayerTurn(game);
    const events = game.combatLog;
    presentCombat(events);
    playClashSound();
    setTimeout(() => {
      if (token !== turnToken) return;
      finishTurnSequence();
    }, 1300);
  },
  toggleMute() {
    ui.muted = toggleMute();
  },
};

attachInput(canvas, game, ui, actions);

function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  frameCount += 1;
  if (now - fpsWindowStart >= 1000) {
    fps = Math.round((frameCount * 1000) / (now - fpsWindowStart));
    frameCount = 0;
    fpsWindowStart = now;
  }
  updateAnimations(dt);
  drawGame(ctx, game, ui);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Screenshot shot modes: ?shot=title|table|win|loss&seed=N
function setupShot() {
  if (shot === 'table') {
    startMatch(game);
    // Stage a busy mid-game table: both sides summon units, player is ahead.
    const player = game.player;
    const keeper = game.enemy;
    player.energy = 10;
    keeper.energy = 10;
    const playCheapest = (side, lanes) => {
      for (const lane of lanes) {
        const idx = side.hand.findIndex((c) => c.kind === 'unit' && c.cost <= side.energy);
        if (idx >= 0) playUnitCard(game, side, idx, lane);
      }
    };
    playCheapest(player, [0, 1, 2]);
    playCheapest(keeper, [0, 2]);
    player.energy = 4;
    keeper.energy = 3;
    game.player.life = 17;
    game.enemy.life = 14;
    game.turn = 5;
    game.message = 'Turn 5 — your units press the Keeper. Click a card, then a lane.';
    game.aiIntent = 'Hollow Keeper: “I will hold the middle lane.”';
  } else if (shot === 'win' || shot === 'loss') {
    startMatch(game);
    game.stats = { turnsPlayed: 9, damageDealt: 21, unitsSummoned: 8, cardsPlayed: 11 };
    if (shot === 'win') {
      game.enemy.life = 0;
      game.winner = 'player';
      game.screen = 'win';
      game.phase = 'over';
      spawnConfetti();
    } else {
      game.player.life = 0;
      game.winner = 'enemy';
      game.screen = 'loss';
      game.phase = 'over';
    }
  }
}
setupShot();

// Headless test hook: the CDP driver plays through this, never the DOM.
window.__stonehollow = {
  get game() { return game; },
  get fps() { return fps; },
  get consoleErrors() { return consoleErrors; },
  get layout() { return computeLayout(game); },
  startGame: () => actions.startGame(),
  restart: () => actions.restart(),
  selectCard: (i) => actions.selectCard(i),
  playUnit: (i, lane) => actions.playUnit(i, lane),
  castSpell: (i, target) => actions.castSpell(i, target),
  endTurn: () => actions.endTurn(),
  snapshot() {
    return {
      screen: game.screen,
      phase: game.phase,
      turn: game.turn,
      playerLife: game.player.life,
      enemyLife: game.enemy.life,
      playerEnergy: game.player.energy,
      playerHand: game.player.hand.map((c) => c.id),
      enemyHandCount: game.enemy.hand.length,
      playerDeck: game.player.deck.length,
      enemyDeck: game.enemy.deck.length,
      firstDraws: game.firstDraws,
      stats: { ...game.stats },
      winner: game.winner,
      playerLanes: game.player.lanes.map((lane) => lane.map((u) => `${u.id}:${u.attack}/${u.health}`)),
      enemyLanes: game.enemy.lanes.map((lane) => lane.map((u) => `${u.id}:${u.attack}/${u.health}`)),
    };
  },
};
