// ============================================================
// Room Management — Create & Join rooms via Firebase
// ============================================================

import { db, ref, set, get, update, remove, onValue, onDisconnect, serverTimestamp } from './firebase-config.js';

/** Tracks the .info/connected listener so it can be torn down on leave */
let unsubscribeConnection = null;

/**
 * Sets up a persistent presence listener using Firebase's .info/connected.
 * Re-registers onDisconnect on every reconnection (the server clears it after
 * each disconnect), and marks the player as connected when the socket is live.
 */
function setupPresence(roomCode, playerId) {
  if (unsubscribeConnection) {
    unsubscribeConnection();
    unsubscribeConnection = null;
  }

  const connectedRef = ref(db, '.info/connected');
  const playerConnectedRef = ref(db, `rooms/${roomCode}/players/${playerId}/connected`);

  unsubscribeConnection = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      // Re-register onDisconnect each time we (re)connect — it's cleared by the
      // server when the client disconnects, so must be re-set on reconnect.
      onDisconnect(playerConnectedRef).set(false);
      update(ref(db, `rooms/${roomCode}/players/${playerId}`), { connected: true });
    }
  });
}

/** Generate a random 4-character room code */
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Generate a unique player ID */
function generatePlayerId() {
  return 'p_' + Math.random().toString(36).substring(2, 10);
}

/**
 * Create a new room.
 * @param {string} playerName
 * @returns {Promise<{roomCode: string, playerId: string}>}
 */
export async function createRoom(playerName) {
  const roomCode = generateRoomCode();
  const playerId = generatePlayerId();

  const roomRef = ref(db, `rooms/${roomCode}`);

  // Check if room already exists (unlikely but possible)
  const snapshot = await get(roomRef);
  if (snapshot.exists()) {
    // Retry with new code
    return createRoom(playerName);
  }

  const roomData = {
    code: roomCode,
    hostId: playerId,
    state: 'lobby', // lobby | playing | results | finished
    createdAt: Date.now(),
    settings: {
      rounds: 5,
      minigameTime: 30
    },
    players: {
      [playerId]: {
        name: playerName,
        score: 0,
        connected: true,
        joinedAt: Date.now()
      }
    }
  };

  await set(roomRef, roomData);

  // Track connection and handle graceful disconnect / reconnect
  setupPresence(roomCode, playerId);

  return { roomCode, playerId };
}

/**
 * Join an existing room.
 * @param {string} roomCode
 * @param {string} playerName
 * @returns {Promise<{roomCode: string, playerId: string}>}
 */
export async function joinRoom(roomCode, playerName) {
  roomCode = roomCode.toUpperCase().trim();
  const roomRef = ref(db, `rooms/${roomCode}`);

  const snapshot = await get(roomRef);
  if (!snapshot.exists()) {
    throw new Error('Room not found');
  }

  const roomData = snapshot.val();

  if (roomData.state !== 'lobby') {
    throw new Error('Game already in progress');
  }

  const playerCount = roomData.players ? Object.keys(roomData.players).length : 0;
  if (playerCount >= 8) {
    throw new Error('Room is full (max 8 players)');
  }

  const playerId = generatePlayerId();

  await update(ref(db, `rooms/${roomCode}/players/${playerId}`), {
    name: playerName,
    score: 0,
    connected: true,
    joinedAt: Date.now()
  });

  // Track connection and handle graceful disconnect / reconnect
  setupPresence(roomCode, playerId);

  return { roomCode, playerId };
}

/**
 * Leave a room. If host leaves, remove the room.
 */
export async function leaveRoom(roomCode, playerId) {
  // Stop the presence listener before removing the player record
  if (unsubscribeConnection) {
    unsubscribeConnection();
    unsubscribeConnection = null;
  }

  const roomRef = ref(db, `rooms/${roomCode}`);
  const snapshot = await get(roomRef);

  if (!snapshot.exists()) return;

  const roomData = snapshot.val();

  if (roomData.hostId === playerId) {
    // Host leaves → destroy room
    await remove(roomRef);
  } else {
    // Non-host leaves → remove player
    await remove(ref(db, `rooms/${roomCode}/players/${playerId}`));
  }
}

/**
 * Listen to room state changes.
 * @param {string} roomCode
 * @param {function} callback
 * @returns {function} unsubscribe function
 */
export function onRoomUpdate(roomCode, callback) {
  const roomRef = ref(db, `rooms/${roomCode}`);
  const unsub = onValue(roomRef, (snapshot) => {
    callback(snapshot.val());
  });
  return unsub;
}
