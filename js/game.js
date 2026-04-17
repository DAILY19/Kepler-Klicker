// ============================================================
// Game State Machine — Manages rounds, minigames, results
// ============================================================

import { db, ref, update, onValue } from './firebase-config.js';
import { showView, showCountdown, showGameMessage } from './ui.js';
import { getLeaderboard } from './scoring.js';
import { SpeedFishing } from './minigames/speed-fishing.js';
import { BiggestCatch } from './minigames/biggest-catch.js';

/** Available minigames */
const MINIGAME_POOL = [SpeedFishing, BiggestCatch];

let currentMinigame = null;
let unsubscribeGame = null;
let inCountdown = false;
let roundEndTriggered = false;
let gameFinishedTriggered = false;

/**
 * Initialize the game.
 * @param {string} roomCode
 * @param {string} playerId
 * @param {object} roomData - initial room data from lobby
 */
export function initGame(roomCode, playerId, roomData) {
  showView('view-game');

  const isHost = roomData.hostId === playerId;
  const totalRounds = roomData.settings?.rounds || 5;

  // Reset all round-state guards
  inCountdown = false;
  roundEndTriggered = false;
  gameFinishedTriggered = false;

  // Update HUD
  updateHUD(roomData.currentRound || 1, totalRounds, 0);

  // Listen for round state changes
  if (unsubscribeGame) unsubscribeGame();

  unsubscribeGame = onValue(ref(db, `rooms/${roomCode}`), (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    switch (data.roundState) {
      case 'countdown':
        // Reset end-of-round flags when a new round begins
        roundEndTriggered = false;
        gameFinishedTriggered = false;
        handleCountdown(roomCode, playerId, data, isHost);
        break;
      case 'playing':
        // Already handled by countdown → start flow
        break;
      case 'roundEnd':
        handleRoundEnd(roomCode, playerId, data, isHost);
        break;
      case 'finished':
        handleGameFinished(data);
        break;
    }
  });
}

async function handleCountdown(roomCode, playerId, roomData, isHost) {
  if (inCountdown || currentMinigame) return;

  // Non-host must wait for host to write the chosen minigame before proceeding,
  // otherwise they'd start the wrong game (the fallback) during the async gap.
  if (!isHost && !roomData.currentMinigame) return;

  inCountdown = true;

  const totalRounds = roomData.settings?.rounds || 5;
  const round = roomData.currentRound || 1;
  const currentScore = roomData.players?.[playerId]?.score || 0;

  updateHUD(round, totalRounds, currentScore);

  // Pick a random minigame (host decides, synced via Firebase)
  let MinigameClass;
  if (roomData.currentMinigame) {
    MinigameClass = MINIGAME_POOL.find(m => m.id === roomData.currentMinigame) || SpeedFishing;
  } else {
    // Must be host — non-hosts return early above if currentMinigame is unset
    MinigameClass = MINIGAME_POOL[Math.floor(Math.random() * MINIGAME_POOL.length)];
    await update(ref(db, `rooms/${roomCode}`), {
      currentMinigame: MinigameClass.id
    });
  }

  showView('view-game');
  showGameMessage(`Round ${round}: ${MinigameClass.name}`, 2000);

  await showCountdown();

  // Create and start the minigame
  currentMinigame = new MinigameClass(roomCode, playerId, roomData.players, roomData.settings || {});
  currentMinigame.setup();
  inCountdown = false; // minigame instance now guards re-entry

  currentMinigame.onEndCallback(async (results) => {
    currentMinigame.cleanup();
    currentMinigame = null;

    // Host transitions to roundEnd
    if (isHost) {
      // Small delay to let scores sync
      setTimeout(async () => {
        await update(ref(db, `rooms/${roomCode}`), {
          roundState: 'roundEnd'
        });
      }, 1000);
    }
  });

  // Transition to playing state
  if (isHost) {
    await update(ref(db, `rooms/${roomCode}`), { roundState: 'playing' });
  }

  currentMinigame.start();
}

function handleRoundEnd(roomCode, playerId, roomData, isHost) {
  if (roundEndTriggered) return;
  roundEndTriggered = true;

  if (currentMinigame) {
    currentMinigame.cleanup();
    currentMinigame = null;
  }

  const totalRounds = roomData.settings?.rounds || 5;
  const round = roomData.currentRound || 1;

  showRoundResults(roomData, round);

  // Host advances to next round or finishes game
  if (isHost) {
    setTimeout(async () => {
      if (round >= totalRounds) {
        await update(ref(db, `rooms/${roomCode}`), {
          state: 'finished',
          roundState: 'finished'
        });
      } else {
        await update(ref(db, `rooms/${roomCode}`), {
          currentRound: round + 1,
          roundState: 'countdown',
          currentMinigame: null
        });
      }
    }, 5000);
  }
}

function handleGameFinished(roomData) {
  if (gameFinishedTriggered) return;
  gameFinishedTriggered = true;

  if (currentMinigame) {
    currentMinigame.cleanup();
    currentMinigame = null;
  }
  showFinalScoreboard(roomData);
}

function showRoundResults(roomData, round) {
  showView('view-results');
  const totalRounds = roomData.settings?.rounds || 5;

  document.getElementById('results-title').textContent = `Round ${round}/${totalRounds} Results`;

  const leaderboard = getLeaderboard(roomData.players);
  const list = document.getElementById('results-list');
  list.innerHTML = '';

  leaderboard.forEach((player, i) => {
    const item = document.createElement('div');
    item.className = `result-item anim-fade-in ${i === 0 ? 'first-place' : ''}`;
    item.innerHTML = `
      <span class="result-rank">${i + 1}</span>
      <span class="result-name">${escapeHtml(player.name)}</span>
      <span class="result-score">${player.score} pts</span>
    `;
    list.appendChild(item);
  });

  document.getElementById('results-status').textContent =
    round >= totalRounds ? 'Final results incoming...' : 'Next round starting soon...';
}

function showFinalScoreboard(roomData) {
  showView('view-scoreboard');

  const leaderboard = getLeaderboard(roomData.players);
  const list = document.getElementById('final-scores');
  list.innerHTML = '';

  leaderboard.forEach((player, i) => {
    const medals = ['1st', '2nd', '3rd'];
    const item = document.createElement('div');
    item.className = `result-item anim-fade-in ${i === 0 ? 'first-place' : ''}`;
    item.innerHTML = `
      <span class="result-rank">${medals[i] || (i + 1)}</span>
      <span class="result-name">${escapeHtml(player.name)}</span>
      <span class="result-score">${player.score} pts</span>
    `;
    list.appendChild(item);
  });
}

function updateHUD(round, totalRounds, score) {
  document.getElementById('hud-round').textContent = `Round ${round}/${totalRounds}`;
  document.getElementById('hud-score').textContent = `${score} pts`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function cleanupGame() {
  if (currentMinigame) {
    currentMinigame.cleanup();
    currentMinigame = null;
  }
  if (unsubscribeGame) {
    unsubscribeGame();
    unsubscribeGame = null;
  }
  inCountdown = false;
  roundEndTriggered = false;
  gameFinishedTriggered = false;
}
