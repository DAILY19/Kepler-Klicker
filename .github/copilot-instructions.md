# Castastrophe! - Copilot Instructions

## Project Overview
Castastrophe! is a browser-based multiplayer fishing party game. Players join on their phones via a room code and compete in chaotic fishing minigames with sabotage events.

## Tech Stack
- HTML5, CSS3, vanilla JavaScript (no frameworks)
- Firebase Realtime Database for multiplayer sync
- GitHub Pages for hosting
- Mobile-first responsive design

## Architecture
- Single-page app with view switching (no routing library)
- Firebase handles all real-time state synchronization
- Game logic runs on each client with host as authority
- Minigames are modular classes extending a base minigame

## Code Conventions
- Use ES6+ features (const/let, arrow functions, template literals, async/await)
- No build tools — plain browser-compatible JS with ES modules via `<script type="module">`
- CSS uses custom properties for theming
- Mobile-first CSS (min-width media queries for larger screens)
- Firebase config uses placeholder values that must be replaced

## File Structure
- `index.html` — Single HTML entry point
- `css/` — Stylesheets (main.css, game.css)
- `js/` — JavaScript modules
  - `firebase-config.js` — Firebase initialization
  - `app.js` — Main app controller and view routing
  - `room.js` — Room creation/joining
  - `lobby.js` — Lobby management
  - `game.js` — Game state machine
  - `minigames/` — Individual minigame modules
  - `castastrophes.js` — Chaos event system
  - `scoring.js` — Score tracking
  - `ui.js` — UI utilities and animations
- `assets/` — Images and sounds (placeholders)

## Key Patterns
- Host player is the authority for game state transitions
- All game state flows through Firebase Realtime Database
- Input handling is optimized for touch (tap, hold, swipe)
- Castastrophes are random events that disrupt gameplay each round
