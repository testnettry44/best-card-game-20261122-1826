// Mouse and keyboard handling for Stonehollow Clash.
// Click a card, then click a lane (units) or a unit (targeted spells).
// Keys: 1-5 select a hand card, Enter ends the turn, Esc cancels, M mutes.

import { computeLayout } from './render.js';
import { playSpellCard } from './rules.js';

function pointIn(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function unitRects(game, layout) {
  const rects = [];
  for (const laneRect of layout.laneRects) {
    game.enemy.lanes[laneRect.lane].slice(0, 2).forEach((unit, i) => {
      rects.push({ side: 'enemy', unit, lane: laneRect.lane,
        x: laneRect.x + 36 + i * 126, y: laneRect.y + 26, w: 100, h: 116 });
    });
    game.player.lanes[laneRect.lane].slice(0, 2).forEach((unit, i) => {
      rects.push({ side: 'player', unit, lane: laneRect.lane,
        x: laneRect.x + 36 + i * 126, y: laneRect.y + 150, w: 100, h: 116 });
    });
  }
  return rects;
}

export function attachInput(canvas, game, ui, actions) {
  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (1280 / rect.width),
      y: (event.clientY - rect.top) * (720 / rect.height),
    };
  }

  function handleClick(x, y) {
    const layout = computeLayout(game);
    if (pointIn(layout.muteButton, x, y)) {
      actions.toggleMute();
      return;
    }
    if (game.screen === 'title') {
      if (pointIn(layout.playButton, x, y)) actions.startGame();
      return;
    }
    if (game.screen === 'win' || game.screen === 'loss') {
      if (pointIn(layout.playAgainButton, x, y)) actions.restart();
      return;
    }
    if (game.screen !== 'table' || game.phase !== 'player') return;

    // Hand cards.
    for (const rect of layout.handRects) {
      if (pointIn(rect, x, y)) {
        const card = rect.card;
        if (card.kind === 'spell' && card.id === 'whisper') {
          actions.castSpell(rect.index, null);
          return;
        }
        actions.selectCard(rect.index);
        return;
      }
    }

    // A selected card wants a target or a lane.
    const selected = game.selectedHandIndex;
    if (selected >= 0) {
      const card = game.player.hand[selected];
      if (!card) { game.selectedHandIndex = -1; return; }
      if (card.kind === 'unit') {
        for (const laneRect of layout.laneRects) {
          if (pointIn(laneRect, x, y)) {
            actions.playUnit(selected, laneRect.lane);
            return;
          }
        }
      } else if (card.id === 'bolt' || card.id === 'shield') {
        for (const target of unitRects(game, layout)) {
          if (!pointIn(target, x, y)) continue;
          const valid = (card.id === 'bolt' && target.side === 'enemy')
            || (card.id === 'shield' && target.side === 'player');
          if (valid) actions.castSpell(selected, target.unit);
          else game.message = card.id === 'bolt'
            ? 'Ember Bolt needs an enemy unit.'
            : 'Tide Shield needs one of your units.';
          return;
        }
      }
    }

    // End Turn button.
    if (pointIn(layout.endTurnButton, x, y)) actions.endTurn();
  }

  canvas.addEventListener('click', (event) => {
    const point = canvasPoint(event);
    handleClick(point.x, point.y);
  });

  canvas.addEventListener('mousemove', (event) => {
    const point = canvasPoint(event);
    const layout = computeLayout(game);
    ui.hoverHandIndex = -1;
    if (game.screen === 'table') {
      for (const rect of layout.handRects) {
        if (pointIn(rect, point.x, point.y)) ui.hoverHandIndex = rect.index;
      }
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'm' || event.key === 'M') {
      actions.toggleMute();
      return;
    }
    if (game.screen === 'title' && (event.key === 'Enter' || event.key === ' ')) {
      actions.startGame();
      return;
    }
    if ((game.screen === 'win' || game.screen === 'loss') && event.key === 'Enter') {
      actions.restart();
      return;
    }
    if (game.screen !== 'table') return;
    if (event.key === 'Escape') {
      game.selectedHandIndex = -1;
      game.message = 'Selection cancelled.';
      return;
    }
    if (game.phase !== 'player') return;
    if (event.key === 'Enter') {
      actions.endTurn();
      return;
    }
    const digit = Number.parseInt(event.key, 10);
    if (digit >= 1 && digit <= game.player.hand.length) {
      const index = digit - 1;
      const card = game.player.hand[index];
      if (card && card.kind === 'spell' && card.id === 'whisper') actions.castSpell(index, null);
      else actions.selectCard(index);
    }
  });
}

// Target validation shared by the mouse path and the headless driver.
export function spellTargetIsValid(card, target, side) {
  if (!card || card.kind !== 'spell') return false;
  if (card.id === 'bolt') return side === 'enemy';
  if (card.id === 'shield') return side === 'player';
  return true;
}

export { playSpellCard };
