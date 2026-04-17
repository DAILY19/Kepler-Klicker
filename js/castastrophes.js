// ============================================================
// Castastrophe System — Chaos events that disrupt gameplay
// ============================================================

import { showCastastropheBanner, showMemeOverlay } from './ui.js';

/** All possible castastrophe events */
const CASTASTROPHES = [
  {
    id: 'line_snap',
    name: 'Line Snap!',
    description: 'Your line snapped! Lost your catch!',
    icon: 'SNAP',
    effect: 'loseCatch',
    duration: 0
  },
  {
    id: 'boot_catch',
    name: 'Boot Instead!',
    description: 'You caught a boot instead of a fish!',
    icon: 'BOOT',
    effect: 'replaceCatchWithJunk',
    duration: 0
  },
  {
    id: 'fish_theft',
    name: 'Fish Theft!',
    description: 'Someone stole your fish!',
    icon: 'THEFT',
    effect: 'stealCatch',
    duration: 0
  },
  {
    id: 'bird_attack',
    name: 'Bird Attack!',
    description: 'A bird swooped down and messed up your cast!',
    icon: 'BIRD',
    effect: 'disruptCast',
    duration: 3000
  },
  {
    id: 'explosive_bite',
    name: 'Explosive Bite!',
    description: 'DANGER! Reel fast or lose everything!',
    icon: 'BOOM',
    effect: 'explosiveBite',
    duration: 5000
  },
  {
    id: 'tangled_lines',
    name: 'Tangled Lines!',
    description: 'Your controls are reversed!',
    icon: 'KNOT',
    effect: 'reverseControls',
    duration: 5000
  },
  {
    id: 'fog',
    name: 'Thick Fog!',
    description: 'Can\'t see the water clearly!',
    icon: 'FOG',
    effect: 'reducedVisibility',
    duration: 6000
  },
  {
    id: 'wave',
    name: 'Giant Wave!',
    description: 'A wave knocked everyone\'s bobbers!',
    icon: 'WAVE',
    effect: 'resetAllBobbers',
    duration: 0
  },
  {
    id: 'double_points',
    name: 'Double Points!',
    description: 'Next catch is worth double!',
    icon: 'x2',
    effect: 'doublePoints',
    duration: 8000
  },
  {
    id: 'speed_fish',
    name: 'Speed Fish!',
    description: 'Fish are biting faster but escaping faster!',
    icon: 'ZAP',
    effect: 'speedFish',
    duration: 7000
  }
];

/**
 * Get a random castastrophe event.
 * @returns {object} A castastrophe event object
 */
export function getRandomCastastrophe() {
  return CASTASTROPHES[Math.floor(Math.random() * CASTASTROPHES.length)];
}

/**
 * Should a castastrophe trigger? Based on probability.
 * @param {number} probability - 0 to 1 (default 0.25)
 */
export function shouldTriggerCastastrophe(probability = 0.25) {
  return Math.random() < probability;
}

/**
 * Apply a castastrophe effect to the local game state.
 * @param {object} castastrophe - The event to apply
 * @param {object} gameState - Current local game state
 * @returns {object} Modified game state
 */
export function applyCastastrophe(castastrophe, gameState) {
  showCastastropheBanner(`${castastrophe.icon} ${castastrophe.name}`);
  showMemeOverlay(2000);

  const state = { ...gameState };

  switch (castastrophe.effect) {
    case 'loseCatch':
      state.currentCatch = null;
      state.reelProgress = 0;
      state.phase = 'idle';
      break;

    case 'replaceCatchWithJunk':
      if (state.currentCatch) {
        state.currentCatch = {
          id: 'boot', name: 'Old Boot', emoji: '👢',
          points: -5, actualWeight: 0.8, rarity: 'junk',
          image: 'assets/store/worm.png'
        };
      }
      break;

    case 'stealCatch':
      if (state.currentCatch && state.currentCatch.points > 0) {
        state.currentCatch = null;
        state.reelProgress = 0;
        state.phase = 'idle';
      }
      break;

    case 'disruptCast':
      state.castDisrupted = true;
      if (castastrophe.duration > 0) {
        setTimeout(() => { state.castDisrupted = false; }, castastrophe.duration);
      }
      break;

    case 'explosiveBite':
      state.explosiveBite = true;
      state.pointMultiplier = 3;
      if (castastrophe.duration > 0) {
        setTimeout(() => {
          if (state.explosiveBite) {
            state.currentCatch = null;
            state.explosiveBite = false;
            state.pointMultiplier = 1;
          }
        }, castastrophe.duration);
      }
      break;

    case 'reverseControls':
      state.controlsReversed = true;
      if (castastrophe.duration > 0) {
        setTimeout(() => { state.controlsReversed = false; }, castastrophe.duration);
      }
      break;

    case 'reducedVisibility':
      state.fogActive = true;
      const canvas = document.getElementById('game-canvas');
      if (canvas) canvas.style.filter = 'blur(3px)';
      if (castastrophe.duration > 0) {
        setTimeout(() => {
          state.fogActive = false;
          if (canvas) canvas.style.filter = '';
        }, castastrophe.duration);
      }
      break;

    case 'resetAllBobbers':
      state.currentCatch = null;
      state.reelProgress = 0;
      state.phase = 'idle';
      break;

    case 'doublePoints':
      state.pointMultiplier = 2;
      if (castastrophe.duration > 0) {
        setTimeout(() => { state.pointMultiplier = 1; }, castastrophe.duration);
      }
      break;

    case 'speedFish':
      state.biteSpeedMultiplier = 0.5;
      state.escapeSpeedMultiplier = 0.5;
      if (castastrophe.duration > 0) {
        setTimeout(() => {
          state.biteSpeedMultiplier = 1;
          state.escapeSpeedMultiplier = 1;
        }, castastrophe.duration);
      }
      break;
  }

  return state;
}

export { CASTASTROPHES };
