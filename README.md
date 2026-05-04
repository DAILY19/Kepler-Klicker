# Kepler Klicker

> A space-themed incremental idle game. Click a planet to mine stardust, build an automated mining empire, and watch your world evolve as your production scales up.

![JavaScript](https://img.shields.io/badge/JavaScript-ES6%20Modules-F7DF1E?logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green)

**[Play on GitHub Pages →](https://DAILY19.github.io/Kepler-Klicker)**

---

## The Problem

Idle clicker games are deceptively tricky to balance. Every upgrade needs an exponential cost curve that stays satisfying from purchase #1 to purchase #100. Kepler Klicker was built to nail that feel using a clean, data-driven upgrade system where each upgrade is a single config object — no spaghetti logic per upgrade type.

---

## Features

- **Click to mine** — tap or click the planet to earn stardust; click power scales with upgrades
- **8 passive upgrades** — Pickaxe → Shovel → Drill → Excavator → Laser Drill → Mega Drill → Alien Shovel and multiplier upgrades, each with a `1.15x` geometric cost curve
- **Planet visual evolution** — planet sprite changes appearance at stardust milestones
- **Offline earnings** — earn 50% DPS while away, capped at 8 hours
- **Auto-save** — `localStorage` save every 30 seconds; no accounts required to keep progress
- **Firebase authentication** — optional sign-in to sync save across devices
- **Background music** — sci-fi ambient loops with mute toggle
- **Mobile-first** — touch-friendly layout that works on phones and desktop

---

## Upgrade System Design

All upgrades are plain JavaScript objects in a `UPGRADES` array:

```js
{
  id: 'laser_drill',
  name: 'Laser Drill',
  type: 'dps',       // flat passive income per unit owned
  baseCost: 12000,
  costScale: 1.15,   // geometric curve: cost = baseCost * costScale^owned
  dps: 400,
}
```

Four upgrade types are supported — `dps`, `click`, `dps_multi`, `click_multi` — with no per-upgrade conditional logic in the game loop.

---

## Running Locally

### Quick Start (Windows)

```powershell
.\start.ps1
```

### Manual (any platform)

```bash
npm install
npx http-server . -p 8080 -c-1 --cors
```

Then open [http://localhost:8080](http://localhost:8080).

---

## Deploy to GitHub Pages

```bash
git push origin main
```

GitHub Pages serves the repo root, so `index.html` goes live immediately with no build step.

---

## Project Structure

```
Kepler Klicker/
├── index.html          # Game shell and UI markup
├── js/
│   ├── app.js          # Game loop, upgrade logic, save/load
│   └── auth.js         # Firebase auth (optional sign-in)
├── css/
│   └── main.css        # Mobile-first responsive styles
├── assets/             # Sprites, icons, music, SFX
├── start.ps1           # Windows: start local dev server
└── stop.ps1            # Windows: kill local dev server
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game logic | Vanilla JavaScript (ES6 modules) |
| Persistence | `localStorage` (local) + Firebase Firestore (cloud sync) |
| Auth | Firebase Authentication |
| Hosting | GitHub Pages (static, zero build) |
| Dev server | `http-server` (npm) |

---

## Challenges & Solutions

**Challenge:** Balancing the cost curve so upgrades never feel free or impossibly expensive.  
**Solution:** Used a `baseCost × costScale^owned` formula with `costScale = 1.15` for all DPS upgrades. This gives a smooth exponential progression that stays exciting from the first Pickaxe to the last Alien Shovel.

**Challenge:** Offline earnings that feel rewarding but don't trivialise active play.  
**Solution:** Calculated elapsed time on load, credited 50% of full DPS for up to 8 hours. Players get a satisfying catch-up without having idle time replace all active play.

---

## License

MIT — see [LICENSE](LICENSE) for details.
