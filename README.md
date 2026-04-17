# 🐟 Castastrophe!

A chaotic, browser-based multiplayer fishing party game where everything that *can* go wrong, **does**.

## How to Play

1. Open the game in a browser
2. Enter your name and **Create Room** to host
3. Share the 4-letter room code with friends
4. Friends open the game on their phones and **Join Room** with the code
5. Host starts the game — chaos ensues!

## Features

- **Mobile-first** — designed for phone browsers, works on desktop too
- **Real-time multiplayer** — synced via Firebase Realtime Database
- **Castastrophes** — random chaos events disrupt every round (snapped lines, stolen fish, fog, explosions!)
- **Multiple minigames** — Speed Fishing, Biggest Catch, and more to come
- **Scoring & leaderboard** — points for catches, bonuses for streaks, penalties for junk

## Tech Stack

- HTML5, CSS3, vanilla JavaScript (ES modules)
- Firebase Realtime Database
- No build tools, no frameworks — just open and play
- Hosted on GitHub Pages

## Setup

### 1. Firebase Configuration

1. Create a [Firebase project](https://console.firebase.google.com)
2. Enable **Realtime Database**
3. Set database rules to allow authenticated reads/writes (or open for testing)
4. Copy your Firebase config
5. Replace the placeholder values in `js/firebase-config.js`:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "YOUR_APP_ID"
};
```

### 2. Run Locally

Serve the project with any local HTTP server (ES modules require it):

```bash
# Using Python
python -m http.server 8080

# Using Node.js
npx serve .

# Using VS Code Live Server extension
# Right-click index.html → Open with Live Server
```

### 3. Deploy to GitHub Pages

1. Push to a GitHub repository
2. Go to Settings → Pages
3. Set source to the `main` branch, root folder
4. Your game is live at `https://yourusername.github.io/repo-name/`

## Project Structure

```
├── index.html              Single HTML entry point
├── css/
│   ├── main.css            Global styles & components
│   └── game.css            In-game styles
├── js/
│   ├── app.js              Main controller & view routing
│   ├── firebase-config.js  Firebase initialization (edit this!)
│   ├── room.js             Room creation & joining
│   ├── lobby.js            Lobby management
│   ├── game.js             Game state machine
│   ├── scoring.js          Fish catalog & score tracking
│   ├── castastrophes.js    Chaos event system
│   ├── ui.js               UI utilities & animations
│   └── minigames/
│       ├── base.js         Base minigame class
│       ├── speed-fishing.js Speed Fishing minigame
│       └── biggest-catch.js Biggest Catch minigame
└── assets/                 Images & sounds (placeholders)
```

## Minigames

| Minigame | Description |
|----------|-------------|
| **Speed Fishing** | Catch as many fish as possible in 30 seconds |
| **Biggest Catch** | One cast — highest weight wins |
| *More coming...* | Trash Collector, Silent Waters, Tug of War, Storm Mode |

## Castastrophes

Random events that trigger during gameplay:

- 💥 **Line Snap** — lose your catch mid-reel
- 👢 **Boot Instead** — worthless junk catch
- 🏴‍☠️ **Fish Theft** — someone steals your catch
- 🦅 **Bird Attack** — disrupts your cast
- 💣 **Explosive Bite** — high risk, high reward
- 🪢 **Tangled Lines** — controls reversed
- 🌫️ **Thick Fog** — reduced visibility
- 🌊 **Giant Wave** — resets all bobbers
- ⭐ **Double Points** — next catch worth 2x
- ⚡ **Speed Fish** — faster bites, faster escapes

## Roadmap

- [x] Firebase setup and room system
- [x] Lobby with player list and host controls
- [x] Game state synchronization
- [x] Speed Fishing minigame
- [x] Biggest Catch minigame
- [x] Castastrophe system
- [x] Scoring and leaderboard
- [ ] Additional minigames (Trash Collector, Tug of War, etc.)
- [ ] Sound effects and music
- [ ] Visual polish and animations
- [ ] Player avatars/customization
- [ ] Spectator mode

## License

MIT
