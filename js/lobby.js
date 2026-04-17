// ============================================================
// Lobby Management
// ============================================================

import { db, ref, update, onValue } from './firebase-config.js';
import { showView, showError } from './ui.js';

let unsubscribeLobby = null;

/**
 * Initialize the lobby view.
 * @param {string} roomCode
 * @param {string} playerId
 * @param {function} onGameStart - called when game transitions to playing
 */
export function initLobby(roomCode, playerId, onGameStart) {
  showView('view-lobby');

  document.getElementById('lobby-room-code').textContent = roomCode;

  const roomRef = ref(db, `rooms/${roomCode}`);

  // Clean up previous listener
  if (unsubscribeLobby) {
    unsubscribeLobby();
  }

  unsubscribeLobby = onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      // Room was deleted (host left)
      showView('view-home');
      showError('home-error', 'Room was closed by the host');
      cleanupLobby();
      return;
    }

    const isHost = data.hostId === playerId;
    renderPlayerList(data.players, data.hostId);
    renderHostControls(isHost, data.players);

    // Update status
    const status = document.getElementById('lobby-status');
    if (isHost) {
      const count = data.players ? Object.keys(data.players).length : 0;
      status.textContent = count < 1
        ? 'Need at least 1 player to start'
        : 'Ready to start!';
    } else {
      status.textContent = 'Waiting for host to start...';
    }

    // Check for game start
    if (data.state === 'playing') {
      cleanupLobby();
      onGameStart(data);
    }
  });

  // Host start button
  const btnStart = document.getElementById('btn-start-game');
  btnStart.onclick = async () => {
    const roundCount = parseInt(document.getElementById('round-count').value, 10);
    await update(ref(db, `rooms/${roomCode}`), {
      state: 'playing',
      'settings/rounds': roundCount,
      currentRound: 1,
      roundState: 'countdown'
    });
  };
}

function renderPlayerList(players, hostId) {
  const list = document.getElementById('player-list');
  list.innerHTML = '';

  if (!players) return;

  Object.entries(players).forEach(([id, player]) => {
    const item = document.createElement('div');
    item.className = 'player-item anim-fade-in';
    if (!player.connected) item.style.opacity = '0.5';

    item.innerHTML = `
      <span class="player-name">${escapeHtml(player.name)}</span>
      ${id === hostId ? '<span class="host-badge">HOST</span>' : ''}
      ${!player.connected ? '<span style="color: var(--color-text-muted); font-size: 0.75rem;">disconnected</span>' : ''}
    `;
    list.appendChild(item);
  });
}

function renderHostControls(isHost, players) {
  const controls = document.getElementById('host-controls');
  const btnStart = document.getElementById('btn-start-game');
  controls.style.display = isHost ? 'flex' : 'none';

  // Allow single-player for testing; production can raise this to 2
  const MIN_PLAYERS = 1;
  const count = players ? Object.keys(players).length : 0;
  btnStart.disabled = count < MIN_PLAYERS;
}

function cleanupLobby() {
  if (unsubscribeLobby) {
    unsubscribeLobby();
    unsubscribeLobby = null;
  }
}

/** Escape HTML to prevent injection */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export { cleanupLobby };
