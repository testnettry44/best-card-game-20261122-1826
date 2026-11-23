// Card definitions and deck building for Stonehollow Clash.
// Three elements, told apart by colour AND shape: Ember (red flame),
// Tide (blue wave), Leaf (green leaf). Two kinds of card: units that stand
// in a lane and fight, and spells that resolve once and go to the discard.

export const ELEMENTS = {
  ember: { name: 'Ember', color: '#e2483a', dark: '#8f1f16', light: '#ffb199', shape: 'flame' },
  tide: { name: 'Tide', color: '#2f7fd0', dark: '#164a80', light: '#a8d4ff', shape: 'wave' },
  leaf: { name: 'Leaf', color: '#3da35a', dark: '#1d5c31', light: '#b5e8c3', shape: 'leaf' },
};

// id, name, element, kind, cost, attack, health, heal, text, copies in a deck.
export const CARD_DEFS = [
  { id: 'spark', name: 'Ember Spark', element: 'ember', kind: 'unit', cost: 1, attack: 2, health: 1, copies: 3, text: 'A quick spark. Cheap and fast.' },
  { id: 'wolf', name: 'Cinder Wolf', element: 'ember', kind: 'unit', cost: 3, attack: 4, health: 2, copies: 2, text: 'Heavy hitter. Hits hard, falls fast.' },
  { id: 'ashguard', name: 'Ash Guard', element: 'ember', kind: 'unit', cost: 2, attack: 1, health: 4, copies: 3, text: 'A sturdy wall of cooling ash.' },
  { id: 'ripple', name: 'Tide Ripple', element: 'tide', kind: 'unit', cost: 1, attack: 1, health: 2, copies: 3, text: 'A small wave that keeps coming.' },
  { id: 'knight', name: 'Wave Knight', element: 'tide', kind: 'unit', cost: 3, attack: 3, health: 3, copies: 2, text: 'Steady blade, steady tide.' },
  { id: 'coral', name: 'Coral Wall', element: 'tide', kind: 'unit', cost: 2, attack: 1, health: 5, copies: 3, text: 'The sturdiest wall in the hollow.' },
  { id: 'sprout', name: 'Thorn Sprout', element: 'leaf', kind: 'unit', cost: 1, attack: 2, health: 2, copies: 3, text: 'Small, sharp and eager.' },
  { id: 'warden', name: 'Grove Warden', element: 'leaf', kind: 'unit', cost: 3, attack: 2, health: 4, heal: 2, copies: 2, text: 'Heals its owner 2 life when it fights.' },
  { id: 'bramble', name: 'Bramble Beast', element: 'leaf', kind: 'unit', cost: 4, attack: 5, health: 3, copies: 2, text: 'A heavy hitter grown from thorns.' },
  { id: 'bolt', name: 'Ember Bolt', element: 'ember', kind: 'spell', cost: 2, copies: 3, text: 'Deal 3 damage to one enemy unit.' },
  { id: 'shield', name: 'Tide Shield', element: 'tide', kind: 'spell', cost: 1, copies: 2, text: 'Give one friendly unit +3 health.' },
  { id: 'whisper', name: 'Leaf Whisper', element: 'leaf', kind: 'spell', cost: 1, copies: 2, text: 'Draw 2 cards.' },
];

export function findCardDef(id) {
  return CARD_DEFS.find((def) => def.id === id);
}

export function buildDeck(random) {
  const deck = [];
  for (const def of CARD_DEFS) {
    for (let n = 0; n < def.copies; n += 1) {
      deck.push({ ...def, uid: `${def.id}-${n}` });
    }
  }
  // Fisher-Yates with the seeded generator (random.js).
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const held = deck[i];
    deck[i] = deck[j];
    deck[j] = held;
  }
  return deck;
}

export function deckSize() {
  return CARD_DEFS.reduce((total, def) => total + def.copies, 0);
}
