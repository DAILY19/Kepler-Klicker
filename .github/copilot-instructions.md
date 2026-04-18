# Kepler Klicker - Copilot Instructions

## Project Overview
Kepler Klicker is a browser-based space-themed incremental clicker game. Players click a planet to earn stardust, purchase upgrades for passive income, and progress through planet skins.

## Tech Stack
- HTML5, CSS3, vanilla JavaScript (no frameworks)
- localStorage for save/load
- GitHub Pages for hosting
- Mobile-first responsive design

## Architecture
- Single-page app with no routing
- All game state in a single `game` object in app.js
- Save/load via localStorage (auto-save every 30s + on page close)
- Upgrade system with exponential cost scaling (1.15x per purchase)

## Code Conventions
- Use ES6+ features (const/let, arrow functions, template literals)
- No build tools — plain browser-compatible JS
- CSS uses custom properties for theming
- Mobile-first CSS (min-width media queries for larger screens)
- Pixel art assets use `image-rendering: pixelated`

## File Structure
- `index.html` — Single HTML entry point
- `css/main.css` — All styles
- `js/app.js` — All game logic (upgrades, clicks, save/load, shop UI)
- `assets/Environment/` — Planet, asteroid, background pixel art
- `assets/Loops/` — Background music loops
- `assets/Tracks/` — Music tracks

## Key Patterns
- Game loop uses requestAnimationFrame for passive income
- Floating numbers spawn at click position and animate upward
- Planet skin changes at total stardust milestones
- Shop panel slides up/down from bottom of screen
