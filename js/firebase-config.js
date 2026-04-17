// ============================================================
// Firebase Configuration
// ============================================================
// Uses the live Firebase Realtime Database for both local dev and production.
// To set up a new project:
//  1. Go to https://console.firebase.google.com
//  2. Click "Add project" → name it → Create
//  3. Build → Realtime Database → Create database → TEST MODE
//  4. Project Settings → Your apps → </> (Web) → copy firebaseConfig
//  5. Paste the values below and update .firebaserc with the project ID
//  6. Run: npm run deploy:rules
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getDatabase,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  onDisconnect,
  push,
  child,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

// ============================================================
// PRODUCTION CONFIG — paste your Firebase console values here
// ============================================================
const firebaseConfig = {
  apiKey:            "AIzaSyAHsJ2sotmLxKUx3xCkqEHvyfOKCHtqLGA",
  authDomain:        "castastrophe-a61bb.firebaseapp.com",
  databaseURL:       "https://castastrophe-a61bb-default-rtdb.firebaseio.com",
  projectId:         "castastrophe-a61bb",
  storageBucket:     "castastrophe-a61bb.firebasestorage.app",
  messagingSenderId: "976777947049",
  appId:             "1:976777947049:web:470eb447ef7b7ecad046b8"
};
// ============================================================

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export {
  db,
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  onDisconnect,
  push,
  child,
  serverTimestamp
};
