# Project Memory: Chog Swarm

## 1. Project Overview
Chog Swarm is a premium-tier autonomous web game built for Chogathon 2026 (chogathon.chog.xyz). In Chog Swarm, each Chog NFT owned by a player determines how an autonomous agent plays in a short, strategic grid arena. The hackathon's core requirement is strict NFT essentiality: an agent cannot spawn with that identity and compiled policy without verified NFT ownership. Judging criteria: Novelty (30%), Fun (20%), Retention (20%), Clarity (15%), Execution (15%), with bonus for meaningful $CHOG utility.

## 2. Architecture
- **Engine Package (`packages/engine`)**: Framework-free, purely deterministic state transition machine (seed + policy + rules version -> identical state sequence).
- **Web App (`apps/web` or root Next.js app)**: Next.js + TypeScript, wagmi/viem for on-chain reads/verification on Monad, HTML5 Canvas arena renderer with high-fidelity HUD styling.
- **Backend / Re-simulation**: Server-side engine execution for Daily Gauntlet leaderboard validation (anti-cheat verification) and ghost replay fetching.
- **Persistence**: Firestore (or equivalent) for ghost policies, daily seeds, and verified leaderboard scores.

## 3. Tech Stack
- **Framework**: Next.js (App Router), TypeScript (pinned versions)
- **Web3**: viem, wagmi (Monad chain integration)
- **Rendering**: HTML5 Canvas with custom sprite/vector rendering, smooth interpolation, responsive design
- **State & Verification**: Deterministic TS engine, server-side re-simulation
- **Styling**: Tailwind CSS / CSS Modules with custom Chog design tokens (dark graphite base, authentic Chog brand accents, warm neutrals, bespoke typography)

## 4. Current State
- **SAFETY NET & HARDENING COMPLETE**:
  - `lib/constants.ts` canonical single source of truth for contracts (`0xc96d...3763` and `0x3500...7777`).
  - Unit tests reject contract addresses as players (21/21 Vitest tests pass).
  - Server-side multicall owner snapshot (`lib/chog-snapshot.ts` & `/api/chogs/owned-by`).
  - Git repository created and pushed to GitHub (`0xSheriff/chog-swarm`), tagged `race-fallback`, switched to `pinball` branch.
  - Legacy routes moved/preserved at `/legacy/arena`, `/legacy/lab`, `/legacy/gauntlet`, `/legacy/demo`.
- **PINBALL PIVOT GATE 1 COMPLETE (Playable Prototype)**:
  - Framework-free 2D Planck.js physics engine in `packages/physics` running at fixed 120 Hz (`table.ts`, `renderer.ts`).
  - Portrait pinball table with dual flippers, spring plunger, 3 tombstone pop bumpers with glowing impact feedback, 2 coffin slingshots, drain detection, and HUD.
  - Controls: Keyboard (Z, /, Space) + touch-friendly screen zones.
  - Soul Ball selection from wallet-owned Chogs with trait-derived ball physics (mass, restitution, density) + Guest Spirit fallback ball.
  - Navigation updated: Play, Daily Haunting, Haunted Hall, Leaderboard, How It Works.
  - Production build verified with Turbopack (25/25 routes static/dynamic).

## 5. Recent Changes
- Implemented `lib/constants.ts`, `lib/chain-verify.ts`, `lib/chog-snapshot.ts`.
- Created `/api/chogs/owned-by` route for server-side cached multicall ownership discovery.
- Added 13 unit tests for address rejection in `tests/constants.test.ts`. Total test suite: 21 passing tests.
- Tagged `race-fallback` and pushed to GitHub (`https://github.com/0xSheriff/chog-swarm.git`).
- Created branch `pinball`.
- Created `packages/physics/` containing Planck.js physics engine and custom Canvas renderer.
- Built `/play` page with Soul Ball selection, real Chog art rendering on ball, touch and keyboard controls.
- Added `/how-it-works`, `/daily-haunting`, `/haunted-hall` pages.
- Moved and preserved previous race/arena modes under `/legacy`.

## 6. Important Decisions
- **Pinball Pivot as Primary Game Loop**: Pivot from grid arena to fast-paced Halloween pinball ("Chog Haunted").
- **Strict Gate Progression**: Gate 1 is a playable 2D physics prototype with Soul Ball selection. Stopping at Gate 1 for user playtest.
- **Framework-Free Physics Engine**: Planck.js world in `packages/physics` runs independently of React/DOM for deterministic server verification.
- **Trait-to-Physics Mapping**: Chog traits directly determine ball mass, restitution, and powers; Guest Spirit provides a baseline ball without traits for non-holders.

## 7. Known Issues
- Local machine Vercel CLI is not logged in (`vercel whoami` logged out); deployment requires connecting the GitHub repo on vercel.com or running `npx vercel login`.

## 8. Current Task
- Gate 1 Playtest handoff: Present live prototype, report on safety net and hardening items, and wait for playtest feedback before Gate 2.

## 9. Next Steps
- Await user playtest of Gate 1.
- Proceed to Gate 2 upon approval (C-H-O-G rollover lanes, ghost targets, crypt portal, multiball lock, D-M-D display).

## 10. Important Files
- `memory.md`: Core living project context.
- `/data/chogs.json`: Complete 1,969 Chogs metadata fixture (to be populated).
- `/fixtures/`: Sample metadata JSONs & cached art assets.
- `/docs/trait-distribution.md`: Trait frequency analysis.
- `/docs/trait-map.md`: Trait-to-engine gameplay parameter mapping.
- `/docs/design-tokens.md`: Brand palette, typography, visual tokens.

## 11. Environment & Configuration
- Monad Testnet / Mainnet RPC endpoints.
- Node.js / TypeScript environment.
- Safe credentials protocol for private keys/RPC keys if applicable (via `~/.env`).

## 12. Development Rules
- Maintain documentation integrity.
- Never write app code before Step 0 completion and user sign-off on `/docs/trait-map.md`.
- No emoji as UI icons; use SVGs or custom pixel sprites.
- Update `memory.md` after every meaningful milestone.
- All derived traits must be visibly flagged as "derived" in the UI.
