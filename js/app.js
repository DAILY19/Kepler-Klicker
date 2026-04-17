// ============================================================
// App.js — Main application controller
// ============================================================

import { showView, showError } from './ui.js';
import { createRoom, joinRoom, leaveRoom, onRoomUpdate } from './room.js';
import { initLobby, cleanupLobby } from './lobby.js';
import { initGame, cleanupGame } from './game.js';
import { db, ref, update } from './firebase-config.js';

// ---- App State ----
let state = {
  roomCode: null,
  playerId: null,
  playerName: null,
  unsubscribeRoom: null
};

// ---- DOM References ----
const btnCreate = document.getElementById('btn-create');
const btnJoin = document.getElementById('btn-join');
const btnLeave = document.getElementById('btn-leave');
const btnPlayAgain = document.getElementById('btn-play-again');
const btnHome = document.getElementById('btn-home');
const inputName = document.getElementById('player-name');
const inputCode = document.getElementById('room-code-input');

// ---- Event Handlers ----

btnCreate.addEventListener('click', async () => {
  const name = inputName.value.trim();
  if (!name) {
    showError('home-error', 'Please enter your name');
    return;
  }

  btnCreate.disabled = true;
  try {
    const { roomCode, playerId } = await createRoom(name);
    state.roomCode = roomCode;
    state.playerId = playerId;
    state.playerName = name;

    initLobby(roomCode, playerId, onGameStart);
  } catch (err) {
    showError('home-error', err.message || 'Failed to create room');
  } finally {
    btnCreate.disabled = false;
  }
});

btnJoin.addEventListener('click', async () => {
  const name = inputName.value.trim();
  const code = inputCode.value.trim();

  if (!name) {
    showError('home-error', 'Please enter your name');
    return;
  }
  if (!code) {
    showError('home-error', 'Please enter a room code');
    return;
  }

  btnJoin.disabled = true;
  try {
    const { roomCode, playerId } = await joinRoom(code, name);
    state.roomCode = roomCode;
    state.playerId = playerId;
    state.playerName = name;

    initLobby(roomCode, playerId, onGameStart);
  } catch (err) {
    showError('home-error', err.message || 'Failed to join room');
  } finally {
    btnJoin.disabled = false;
  }
});

btnLeave.addEventListener('click', async () => {
  if (state.roomCode && state.playerId) {
    await leaveRoom(state.roomCode, state.playerId);
  }
  resetToHome();
});

btnPlayAgain.addEventListener('click', async () => {
  if (!state.roomCode) {
    resetToHome();
    return;
  }

  // Reset scores and go back to lobby
  cleanupGame();
  try {
    await update(ref(db, `rooms/${state.roomCode}`), {
      state: 'lobby',
      roundState: null,
      currentRound: null,
      currentMinigame: null,
      rounds: null
    });

    // Reset all player scores
    const roomRef = ref(db, `rooms/${state.roomCode}`);
    const { get } = await import('./firebase-config.js');
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const updates = {};
      if (data.players) {
        for (const pid of Object.keys(data.players)) {
          updates[`players/${pid}/score`] = 0;
        }
      }
      await update(roomRef, updates);
    }

    initLobby(state.roomCode, state.playerId, onGameStart);
  } catch (err) {
    resetToHome();
  }
});

btnHome.addEventListener('click', async () => {
  if (state.roomCode && state.playerId) {
    await leaveRoom(state.roomCode, state.playerId);
  }
  resetToHome();
});

// Allow Enter key on inputs
inputName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (inputCode.value.trim()) {
      btnJoin.click();
    } else {
      inputCode.focus();
    }
  }
});

inputCode.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') btnJoin.click();
});

// Force uppercase room code
inputCode.addEventListener('input', () => {
  inputCode.value = inputCode.value.toUpperCase();
});

// ---- Callbacks ----

function onGameStart(roomData) {
  initGame(state.roomCode, state.playerId, roomData);
}

function resetToHome() {
  cleanupLobby();
  cleanupGame();
  state = { roomCode: null, playerId: null, playerName: null, unsubscribeRoom: null };
  showView('view-home');
}

// ---- Init ----
showView('view-home');
