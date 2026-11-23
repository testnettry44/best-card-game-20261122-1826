// Canvas drawing and animation for Stonehollow Clash.
// Everything on screen is drawn by hand on one Canvas 2D surface: the
// title, the table, the cards, the lanes, the particles and the end screens.
// No images, no fonts from the network — system fonts only.

import { ELEMENTS } from './cards.js';
import { LANES } from './rules.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const anim = {
  particles: [],
  floaters: [],
  confetti: [],
  flying: [], // {card, fromX, fromY, toX, toY, t, side}
  lunge: {}, // uid -> {t, dir}
  time: 0,
};

export function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 60 + Math.random() * 160;
    anim.particles.push({
      x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40,
      life: 0.6 + Math.random() * 0.4, age: 0, color, size: 3 + Math.random() * 5,
    });
  }
}

export function spawnFloater(x, y, text, color) {
  anim.floaters.push({ x, y, text, color, age: 0, life: 1.1 });
}

export function spawnConfetti() {
  const colors = ['#e2483a', '#2f7fd0', '#3da35a', '#f2c14e', '#f5f0e1'];
  for (let i = 0; i < 160; i += 1) {
    anim.confetti.push({
      x: Math.random() * VIEW_W, y: -20 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 60, vy: 90 + Math.random() * 140,
      size: 5 + Math.random() * 7, color: colors[i % colors.length],
      rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 6, age: 0,
    });
  }
}

export function launchFlyingCard(card, fromX, fromY, toX, toY) {
  anim.flying.push({ card, fromX, fromY, toX, toY, t: 0 });
}

export function updateAnimations(dt) {
  anim.time += dt;
  for (const p of anim.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 220 * dt;
  }
  anim.particles = anim.particles.filter((p) => p.age < p.life);
  for (const f of anim.floaters) {
    f.age += dt;
    f.y -= 46 * dt;
  }
  anim.floaters = anim.floaters.filter((f) => f.age < f.life);
  for (const c of anim.confetti) {
    c.age += dt;
    c.x += c.vx * dt;
    c.y += c.vy * dt;
    c.rot += c.vr * dt;
  }
  anim.confetti = anim.confetti.filter((c) => c.y < VIEW_H + 30);
  for (const f of anim.flying) f.t += dt * 2.2;
  anim.flying = anim.flying.filter((f) => f.t < 1);
  for (const key of Object.keys(anim.lunge)) {
    anim.lunge[key].t += dt * 2.5;
    if (anim.lunge[key].t >= 1) delete anim.lunge[key];
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawElementIcon(ctx, shape, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.12);
  if (shape === 'flame') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx + size * 0.9, cy - size * 0.2, cx + size * 0.55, cy + size * 0.5);
    ctx.quadraticCurveTo(cx + size * 0.3, cy + size * 0.9, cx, cy + size * 0.75);
    ctx.quadraticCurveTo(cx - size * 0.3, cy + size * 0.9, cx - size * 0.55, cy + size * 0.5);
    ctx.quadraticCurveTo(cx - size * 0.9, cy - size * 0.2, cx, cy - size);
    ctx.fill();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.25);
    ctx.quadraticCurveTo(cx + size * 0.35, cy + size * 0.25, cx, cy + size * 0.5);
    ctx.quadraticCurveTo(cx - size * 0.35, cy + size * 0.25, cx, cy - size * 0.25);
    ctx.fill();
  } else if (shape === 'wave') {
    for (let row = -1; row <= 1; row += 1) {
      ctx.beginPath();
      ctx.arc(cx - size * 0.45, cy + row * size * 0.45, size * 0.45, Math.PI, 0);
      ctx.arc(cx + size * 0.45, cy + row * size * 0.45, size * 0.45, Math.PI, 0);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.8, size * 0.45, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1d5c31';
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.7, cy + size * 0.7);
    ctx.quadraticCurveTo(cx, cy, cx + size * 0.7, cy - size * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCardFace(ctx, card, x, y, w, h, opts) {
  const o = opts || {};
  const el = ELEMENTS[card.element];
  ctx.save();
  if (o.lift) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 8;
  }
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = o.dim ? '#cfc8b8' : '#f7f2e4';
  ctx.fill();
  ctx.lineWidth = o.selected ? 5 : 3;
  ctx.strokeStyle = o.selected ? '#ffd23e' : el.color;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  // Element band at the top.
  roundRect(ctx, x + 3, y + 3, w - 6, h * 0.34, 9);
  ctx.fillStyle = el.color;
  ctx.fill();
  drawElementIcon(ctx, el.shape, x + w / 2, y + h * 0.19, h * 0.11, '#ffffff');
  // Cost gem, top-left.
  ctx.beginPath();
  ctx.arc(x + 20, y + 20, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#2b2b3a';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd23e';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(card.cost), x + 20, y + 21);
  // Name.
  ctx.fillStyle = '#241f1a';
  ctx.font = `bold ${Math.max(13, w * 0.095)}px Georgia, serif`;
  ctx.fillText(card.name, x + w / 2, y + h * 0.44, w - 12);
  ctx.fillStyle = el.dark;
  ctx.font = `${Math.max(11, w * 0.07)}px Georgia, serif`;
  ctx.fillText(el.name.toUpperCase(), x + w / 2, y + h * 0.56, w - 12);
  if (card.kind === 'unit') {
    // Attack and health pips.
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillStyle = '#b3261e';
    ctx.textAlign = 'left';
    ctx.fillText(`⚔ ${card.attack}`, x + 12, y + h - 16);
    ctx.fillStyle = '#1d6b34';
    ctx.textAlign = 'right';
    ctx.fillText(`♥ ${card.health}`, x + w - 12, y + h - 16);
    ctx.textAlign = 'center';
  } else {
    ctx.fillStyle = '#3a342c';
    ctx.font = `${Math.max(11, w * 0.068)}px Georgia, serif`;
    wrapText(ctx, card.text, x + w / 2, y + h * 0.66, w - 18, 15);
  }
  if (card.combo) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText('★ COMBO', x + w / 2, y + h - 34);
  }
  ctx.restore();
}

export function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((ln, i) => ctx.fillText(ln, cx, y + i * lineHeight));
}

export function drawCardBack(ctx, x, y, w, h) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = '#3a2b4d';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#8f7bb8';
  ctx.stroke();
  roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 7);
  ctx.strokeStyle = '#6d5a96';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawElementIcon(ctx, 'flame', x + w / 2, y + h / 2, 14, '#c9a7ff');
  ctx.restore();
}

export function computeLayout(game) {
  const handW = 148;
  const handH = 196;
  const handGap = 12;
  const handTotal = game.player.hand.length * (handW + handGap) - handGap;
  const handX0 = (VIEW_W - handTotal) / 2;
  const handY = VIEW_H - handH - 14;
  const handRects = game.player.hand.map((card, i) => ({
    card, index: i, x: handX0 + i * (handW + handGap), y: handY, w: handW, h: handH,
  }));
  const laneW = 300;
  const laneGap = 24;
  const lanesX0 = (VIEW_W - (LANES * laneW + (LANES - 1) * laneGap)) / 2;
  const laneRects = [];
  for (let lane = 0; lane < 3; lane += 1) {
    laneRects.push({
      lane, x: lanesX0 + lane * (laneW + laneGap), y: 132, w: laneW, h: 268,
    });
  }
  const enemyBacks = [];
  for (let i = 0; i < game.enemy.hand.length; i += 1) {
    enemyBacks.push({ x: 560 + i * 34, y: 62, w: 46, h: 64 });
  }
  return {
    handRects, laneRects, enemyBacks,
    playButton: { x: 490, y: 300, w: 300, h: 72 },
    endTurnButton: { x: 1080, y: 560, w: 168, h: 54 },
    muteButton: { x: 1220, y: 12, w: 48, h: 34 },
    playAgainButton: { x: 540, y: 520, w: 200, h: 60 },
    handY, handW, handH,
  };
}

function drawEnergyPips(ctx, side, x, y, label) {
  ctx.fillStyle = '#f5f0e1';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  for (let i = 0; i < 10; i += 1) {
    ctx.beginPath();
    ctx.arc(x + 78 + i * 22, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = i < side.energy ? '#ffd23e' : 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#8a6d1f';
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'bold 16px Georgia, serif';
  ctx.fillText(`${side.energy}/${side.maxEnergy}`, x + 78 + 10 * 22 + 8, y);
}

function drawLifeTotal(ctx, side, x, y, label) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f0e1';
  ctx.font = 'bold 15px Georgia, serif';
  ctx.fillText(label, x, y > 50 ? y - 34 : y + 30);
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillStyle = side.life <= 6 ? '#ff6b5e' : '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  ctx.fillText(`♥ ${side.life}`, x, y);
  ctx.restore();
}

function drawUnitOnBoard(ctx, unit, x, y, w, h, side) {
  const lunge = anim.lunge[unit.uid];
  let dy = 0;
  if (lunge) dy = Math.sin(lunge.t * Math.PI) * (side === 'player' ? -22 : 22);
  drawCardFace(ctx, unit, x, y + dy, w, h, {});
  if (unit.health <= 2) {
    ctx.fillStyle = 'rgba(255,60,40,0.25)';
    roundRect(ctx, x, y + dy, w, h, 12);
    ctx.fill();
  }
}

export function drawTable(ctx, game, ui) {
  const layout = computeLayout(game);
  // Felt table.
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#1d4a2f');
  grad.addColorStop(1, '#12301e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.strokeStyle = 'rgba(255,210,62,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(VIEW_W / 2, VIEW_H / 2, 560, 300, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Top bar: Keeper identity, life, enemy hand backs, deck counts.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(0, 0, VIEW_W, 52);
  ctx.fillStyle = '#c9a7ff';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('👁 Hollow Keeper', 24, 27);
  drawLifeTotal(ctx, game.enemy, 300, 30, 'KEEPER LIFE');
  ctx.fillStyle = '#f5f0e1';
  ctx.font = '15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Hand ${game.enemy.hand.length}  •  Deck ${game.enemy.deck.length}  •  Discard ${game.enemy.discard.length}`, 420, 27);
  ctx.fillStyle = '#f5f0e1';
  ctx.textAlign = 'right';
  ctx.fillText(`Turn ${game.turn}`, 1190, 27);
  ctx.textAlign = 'center';

  // Enemy hand as face-down backs. The Keeper's intent shows in the
  // message bar below the lanes, so nothing covers these backs.
  for (const back of layout.enemyBacks) drawCardBack(ctx, back.x, back.y, back.w, back.h);

  // Lanes.
  for (const laneRect of layout.laneRects) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    roundRect(ctx, laneRect.x, laneRect.y, laneRect.w, laneRect.h, 14);
    ctx.fill();
    ctx.lineWidth = game.selectedHandIndex >= 0 ? 3 : 1.5;
    ctx.strokeStyle = game.selectedHandIndex >= 0 ? '#ffd23e' : 'rgba(255,255,255,0.25)';
    ctx.stroke();
    ctx.fillStyle = '#e8e2d2';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillText(`LANE ${laneRect.lane + 1}`, laneRect.x + laneRect.w / 2, laneRect.y + 18);
    const enemyUnits = game.enemy.lanes[laneRect.lane];
    const myUnits = game.player.lanes[laneRect.lane];
    const shownEnemy = enemyUnits.slice(0, 2);
    const shownMine = myUnits.slice(0, 2);
    shownEnemy.forEach((unit, i) => {
      drawUnitOnBoard(ctx, unit, laneRect.x + 36 + i * 126, laneRect.y + 26, 100, 116, 'enemy');
    });
    shownMine.forEach((unit, i) => {
      drawUnitOnBoard(ctx, unit, laneRect.x + 36 + i * 126, laneRect.y + 150, 100, 116, 'player');
    });
    if (enemyUnits.length > 2 || myUnits.length > 2) {
      ctx.fillStyle = '#ffd23e';
      ctx.font = 'bold 14px Georgia, serif';
      const extra = Math.max(enemyUnits.length, myUnits.length) - 2;
      ctx.fillText(`+${extra} more in lane`, laneRect.x + laneRect.w / 2, laneRect.y + 262);
    }
    if (enemyUnits.length === 0 && myUnits.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '14px Georgia, serif';
      ctx.fillText('empty lane', laneRect.x + laneRect.w / 2, laneRect.y + 140);
    }
  }

  // Combo flair.
  if (game.comboFlash) {
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 26px Georgia, serif';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 10;
    ctx.fillText(game.comboFlash.text, 640, 430);
    ctx.shadowBlur = 0;
  }

  // Message bar.
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, 180, 420, 920, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#f5f0e1';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(game.message, 640, 438);

  // Player row: life, energy, deck counts.
  drawLifeTotal(ctx, game.player, 90, 500, 'YOUR LIFE');
  drawEnergyPips(ctx, game.player, 170, 500, 'ENERGY');
  ctx.fillStyle = '#f5f0e1';
  ctx.font = '15px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Deck ${game.player.deck.length}  •  Discard ${game.player.discard.length}`, 170, 528);
  ctx.textAlign = 'center';

  // End Turn button.
  const eb = layout.endTurnButton;
  const canEnd = game.phase === 'player';
  ctx.fillStyle = canEnd ? '#e2483a' : '#5a5148';
  roundRect(ctx, eb.x, eb.y, eb.w, eb.h, 10);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ffd23e';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText(canEnd ? 'END TURN ⏎' : 'KEEPER…', eb.x + eb.w / 2, eb.y + eb.h / 2 + 1);

  // Mute button.
  const mb = layout.muteButton;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, mb.x, mb.y, mb.w, mb.h, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '15px Georgia, serif';
  ctx.fillText(ui.muted ? '🔇' : '🔊', mb.x + mb.w / 2, mb.y + mb.h / 2 + 1);

  // Player hand, face-up, hovered card lifts.
  for (const rect of layout.handRects) {
    const hovered = ui.hoverHandIndex === rect.index;
    const selected = game.selectedHandIndex === rect.index;
    const affordable = game.player.energy >= rect.card.cost;
    const lift = hovered || selected ? 22 : 0;
    drawCardFace(ctx, rect.card, rect.x, rect.y - lift, rect.w, rect.h, {
      lift: hovered || selected, selected, dim: !affordable && game.phase === 'player',
    });
  }
  if (game.selectedHandIndex >= 0) {
    const card = game.player.hand[game.selectedHandIndex];
    ctx.fillStyle = '#ffd23e';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.fillText(card && card.kind === 'unit'
      ? `Click a lane to place ${card.name} — or Esc to cancel`
      : `Click a target for ${card ? card.name : ''} — or Esc to cancel`, 640, 466);
  }

  drawFlyingCards(ctx);
  drawParticles(ctx);
  drawFloaters(ctx);
}

function drawFlyingCards(ctx) {
  for (const f of anim.flying) {
    const t = Math.min(1, f.t);
    const x = f.fromX + (f.toX - f.fromX) * t;
    const y = f.fromY + (f.toY - f.fromY) * t - Math.sin(t * Math.PI) * 60;
    drawCardFace(ctx, f.card, x, y, 104, 128, { lift: true });
  }
}

function drawParticles(ctx) {
  for (const p of anim.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx) {
  ctx.textAlign = 'center';
  for (const f of anim.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.age / f.life);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 24px Georgia, serif';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

export function drawTitle(ctx, game, ui) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#241a33');
  grad.addColorStop(0.6, '#1d4a2f');
  grad.addColorStop(1, '#0f2417');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // The three elements in a row above the title: flame, wave, leaf.
  const iconXs = [540, 640, 740];
  ['ember', 'tide', 'leaf'].forEach((elKey, i) => {
    const el = ELEMENTS[elKey];
    ctx.beginPath();
    ctx.arc(iconXs[i], 108, 42, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fill();
    drawElementIcon(ctx, el.shape, iconXs[i], 108, 26, el.color);
  });
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5f0e1';
  ctx.font = 'bold 76px Georgia, serif';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 18;
  ctx.fillText('STONEHOLLOW', 640, 210);
  ctx.fillText('CLASH', 640, 292);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd23e';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText('A lane battler of Ember, Tide and Leaf — outwit the Hollow Keeper.', 640, 336);

  const pb = { x: 490, y: 380, w: 300, h: 72 };
  ctx.fillStyle = '#e2483a';
  roundRect(ctx, pb.x, pb.y, pb.w, pb.h, 12);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffd23e';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText('▶  PLAY', 640, pb.y + 38);

  // How-to panel.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 290, 480, 700, 190, 14);
  ctx.fill();
  ctx.fillStyle = '#f5f0e1';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('HOW TO PLAY', 640, 510);
  ctx.font = '15px Georgia, serif';
  const lines = [
    '• Click a card, then click a lane to summon its unit. Spells need a target.',
    '• Each side has 20 life. Energy starts at 3 and grows +1 a turn, to 10.',
    '• At the end of every turn, units clash across their lanes. Damage that',
    '  gets through a lane hits the other side’s life directly.',
    '• Same element + same lane = COMBO +1 attack. The Keeper telegraphs',
    '  its intent before it acts — block its strongest lane and bolt its brutes.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 640, 538 + i * 22));
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = '#c9c2ae';
  ctx.fillText('Keys: 1–5 select a card • Enter ends the turn • M mutes sound', 640, 700);
  drawParticles(ctx);
}

export function drawEndScreen(ctx, game, ui, won) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, won ? '#1d4a2f' : '#3a1620');
  grad.addColorStop(1, '#14101f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (won) drawConfetti(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ffd23e' : '#ff6b5e';
  ctx.font = 'bold 72px Georgia, serif';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 16;
  ctx.fillText(won ? '★ VICTORY ★' : '✖ DEFEAT ✖', 640, 200);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#f5f0e1';
  ctx.font = 'italic 22px Georgia, serif';
  ctx.fillText(won
    ? 'The Hollow Keeper falls. Stonehollow is yours.'
    : 'The hollow keeps its stones… this time.', 640, 250);

  // Stats panel.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, 440, 300, 400, 180, 14);
  ctx.fill();
  ctx.fillStyle = '#f5f0e1';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('BATTLE STATS', 640, 332);
  ctx.font = '17px Georgia, serif';
  const s = game.stats;
  ctx.fillText(`Turns played: ${s.turnsPlayed}`, 640, 366);
  ctx.fillText(`Damage dealt: ${s.damageDealt}`, 640, 396);
  ctx.fillText(`Units summoned: ${s.unitsSummoned}`, 640, 426);
  ctx.fillText(`Cards played: ${s.cardsPlayed}`, 640, 456);

  const pb = { x: 540, y: 520, w: 200, h: 60 };
  ctx.fillStyle = '#e2483a';
  roundRect(ctx, pb.x, pb.y, pb.w, pb.h, 12);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffd23e';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('PLAY AGAIN', 640, pb.y + 32);
  drawParticles(ctx);
}

function drawConfetti(ctx) {
  for (const c of anim.confetti) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillStyle = c.color;
    ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.6);
    ctx.restore();
  }
}

export function drawGame(ctx, game, ui) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (game.screen === 'title') drawTitle(ctx, game, ui);
  else if (game.screen === 'win') drawEndScreen(ctx, game, ui, true);
  else if (game.screen === 'loss') drawEndScreen(ctx, game, ui, false);
  else drawTable(ctx, game, ui);
}
