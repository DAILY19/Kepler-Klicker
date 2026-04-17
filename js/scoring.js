// ============================================================
// Scoring System
// ============================================================

import { db, ref, update, get } from './firebase-config.js';

/** Fish catalog — defines all possible catches */
export const FISH_CATALOG = [
  // Common fish
  { id: 'anchovy',    name: 'Anchovy',       emoji: '🐟', points: 10,  weight: [0.1, 0.3],  rarity: 'common',    image: 'assets/fish/anchovy.png' },
  { id: 'mackerel',   name: 'Mackerel',      emoji: '🐟', points: 15,  weight: [0.5, 2],    rarity: 'common',    image: 'assets/fish/anchovy.png' },
  { id: 'bass',       name: 'Sea Bass',      emoji: '🐟', points: 20,  weight: [1, 5],      rarity: 'common',    image: 'assets/fish/sea-bass.png' },
  { id: 'trout',      name: 'Trout',         emoji: '🐟', points: 25,  weight: [1, 4],      rarity: 'common',    image: 'assets/fish/sea-bass.png' },

  // Uncommon fish
  { id: 'salmon',     name: 'Salmon',        emoji: '🐠', points: 40,  weight: [3, 10],     rarity: 'uncommon',  image: 'assets/fish/sea-bass.png' },
  { id: 'tuna',       name: 'Tuna',          emoji: '🐠', points: 50,  weight: [10, 50],    rarity: 'uncommon',  image: 'assets/fish/tuna.png' },
  { id: 'catfish',    name: 'Catfish',       emoji: '🐱', points: 35,  weight: [2, 15],     rarity: 'uncommon',  image: 'assets/fish/sea-bass.png' },

  // Rare fish
  { id: 'swordfish',  name: 'Swordfish',     emoji: '🗡️', points: 80,  weight: [20, 100],   rarity: 'rare',      image: 'assets/fish/tuna.png' },
  { id: 'shark',      name: 'Great White',   emoji: '🦈', points: 100, weight: [50, 200],   rarity: 'rare',      image: 'assets/fish/shark.png' },
  { id: 'whale',      name: 'Whale',         emoji: '🐋', points: 150, weight: [500, 2000], rarity: 'rare',      image: 'assets/fish/shark.png' },

  // Legendary
  { id: 'golden',     name: 'Golden Fish',   emoji: '✨', points: 200, weight: [1, 1],      rarity: 'legendary', image: 'assets/fish/tuna.png' },
  { id: 'kraken',     name: 'Baby Kraken',   emoji: '🐙', points: 250, weight: [100, 500],  rarity: 'legendary', image: 'assets/fish/shark.png' },

  // Junk
  { id: 'boot',       name: 'Old Boot',      emoji: '👢', points: -5,  weight: [0.5, 1],    rarity: 'junk',      image: 'assets/store/worm.png' },
  { id: 'tire',       name: 'Tire',          emoji: '⭕', points: -10, weight: [5, 10],     rarity: 'junk',      image: 'assets/store/worm.png' },
  { id: 'can',        name: 'Tin Can',       emoji: '🥫', points: -3,  weight: [0.1, 0.3],  rarity: 'junk',      image: 'assets/store/worm.png' },
  { id: 'seaweed',    name: 'Seaweed',       emoji: '🌿', points: 0,   weight: [0.1, 0.5],  rarity: 'junk',      image: 'assets/store/worm.png' },
];

/** Rarity weights for random selection */
const RARITY_WEIGHTS = {
  common: 50,
  uncommon: 25,
  rare: 10,
  legendary: 2,
  junk: 13
};

/**
 * Get a random fish based on rarity weights.
 * @param {string} [forcedRarity] - Force a specific rarity
 * @returns {object} A fish object with randomized weight
 */
export function getRandomFish(forcedRarity = null) {
  let rarity = forcedRarity;

  if (!rarity) {
    const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;
    for (const [r, w] of Object.entries(RARITY_WEIGHTS)) {
      roll -= w;
      if (roll <= 0) {
        rarity = r;
        break;
      }
    }
  }

  const pool = FISH_CATALOG.filter(f => f.rarity === rarity);
  const fish = { ...pool[Math.floor(Math.random() * pool.length)] };

  // Randomize weight within range
  const [min, max] = fish.weight;
  fish.actualWeight = Math.round((min + Math.random() * (max - min)) * 10) / 10;

  return fish;
}

/**
 * Calculate points with modifiers.
 * @param {object} fish
 * @param {object} modifiers - { perfectTiming, streak, castastropheBonus }
 * @returns {number}
 */
export function calculatePoints(fish, modifiers = {}) {
  let points = fish.points;

  if (modifiers.perfectTiming) {
    points = Math.round(points * 1.5);
  }

  if (modifiers.streak && modifiers.streak >= 3) {
    points += modifiers.streak * 5;
  }

  if (modifiers.castastropheBonus) {
    points = Math.round(points * modifiers.castastropheBonus);
  }

  return points;
}

/**
 * Update a player's score in Firebase.
 */
export async function updateScore(roomCode, playerId, pointsToAdd) {
  const playerRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  const snapshot = await get(playerRef);
  if (!snapshot.exists()) return;

  const current = snapshot.val().score || 0;
  await update(playerRef, {
    score: current + pointsToAdd,
    lastCatch: Date.now()
  });
}

/**
 * Update round-specific score data.
 */
export async function updateRoundScore(roomCode, playerId, roundNum, scoreData) {
  await update(ref(db, `rooms/${roomCode}/rounds/${roundNum}/${playerId}`), scoreData);
}

/**
 * Get sorted leaderboard from room data.
 * @param {object} players - players object from room data
 * @returns {Array<{id, name, score}>}
 */
export function getLeaderboard(players) {
  if (!players) return [];
  return Object.entries(players)
    .map(([id, p]) => ({ id, name: p.name, score: p.score || 0 }))
    .sort((a, b) => b.score - a.score);
}
