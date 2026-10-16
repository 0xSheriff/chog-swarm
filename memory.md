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
  - Unit tests reject contract addresses as players (22/22 Vitest tests pass).
  - Server-side multicall owner snapshot (`lib/chog-snapshot.ts` & `/api/chogs/owned-by`).
  - Git repository created and pushed to GitHub (`0xSheriff/chog-swarm`), tagged `race-fallback`, switched to `pinball` branch.
  - Legacy routes moved/preserved at `/legacy/arena`, `/legacy/lab`, `/legacy/gauntlet`, `/legacy/demo`.
- **GATE 1 REDO COMPLETE (STRICT TABLE-LAYOUT.JSON SINGLE SOURCE OF TRUTH)**:
  - **Zero hardcoded coordinates**: Both physics engine and renderers load `/docs/pinball/table-layout.json` at runtime.
  - **Debug View ('D' key)**: Draws all colliders on dark unit grid (0..1 x, 0..2 y) matching `table-blueprint.png` 1:1.
  - **Physics (Planck.js at 120 Hz)**: `physicsScale: 20`, gravity `2.1` table units/s² (6.5° incline), speed cap `6.0`, ball marked as `bullet`, flipper swing motors (30 rad/s up, 18 rad/s down), pop bumpers & slingshots kick to `kickExitSpeed` (2.8 and 2.5), one-way gate for plunger lane, spring plunger (3.0 to 5.6 launch speed), drain sensor, and stuck-ball rescue (<0.05 speed for >3s).
  - **Headless Validation**: All 5 criteria from JSON pass: zero overlaps, 1.308s top-to-flipper roll time, full plunger launch reaches playfield (min Y 0.027), timed flipper shot reaches top arch (min Y 0.058).
  - **Tilted 3D WebGL2 Renderer (Three.js)**: Camera pitch ~55°, violet-black base, moonlit rim light, teal fog, orange torches, slate tombstone pop bumpers, coffin slingshots, floating arched portraits of 4 rarest Legendary Chogs (#53 Blaze, #392 Burning Skully, #434 Chog Scream, #494 Chogbomination) with sinusoidal bob and damage rings.
  - **Flat 2D Renderer**: Available via `?renderer=2d` or UI toggle button.
  - **HUD**: Large score at top center, balls remaining, Soul Ball name with Haunt power meter, event callout banner, body >= 14px, labels >= 12px.
  - **Naming**: "Chog Swarm" with subtitle "Haunted Pinball". Removed "Disconnect Test: NORMAL" nav button; Soul Ball vs Guest Spirit compared side-by-side on pre-game screen.
  - **Build**: 25/25 routes pass clean Turbopack build with 0 errors.

## 5. Recent Changes
- Overhauled Gate 1 table construction to strictly consume `/docs/pinball/table-layout.json` at runtime.
- Built `packages/physics/src/debug-renderer.ts` with coordinate axes, ticks, and color-coded colliders matching `table-blueprint.png`.
- Replaced provisional physics with Planck.js 120Hz model in `packages/physics/src/physics-world.ts`.
- Built headless test suite in `scripts/run-pinball-validation.ts` and `tests/pinball.test.ts`. 22/22 tests passing.
- Developed `packages/physics/src/flat-2d-renderer.ts` and `packages/physics/src/three-3d-renderer.ts`.
- Updated `components/navbar.tsx` branding to "Chog Swarm: Haunted Pinball" and removed disconnect test button.
- Redesigned `app/play/page.tsx` with Suspense, renderer mode toggle (3D / 2D), 'D' debug toggle, and large top-center HUD.
- Captured screenshots: `pinball-debug.png`, `pinball-2d.png`, `pinball-3d.png` in `/public/screenshots/`.

## 6. Important Decisions
- **Rule: Never invent table dimensions**: All geometry, scales, limits, and colliders derive strictly from `/docs/pinball/table-layout.json`.
- **Runtime JSON Loading**: Physics and rendering pipelines accept `TableLayout` as a configuration object, ensuring 100% data-driven table construction.
- **Sidecar & Interactive Priority**: Dual renderers (Three.js 3D and Canvas 2D) provide high visual fidelity with an instant 2D fallback.

## 7. Known Issues
- Local machine Vercel CLI is not logged in (`vercel whoami` logged out); deployment requires connecting the GitHub repo on vercel.com or running `npx vercel login`.

## 8. Current Task
- Report Gate 1 Redo results across all 9 steps, present the 3 feel numbers, local FPS, and screenshots, and await user playtest.

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
- Never invent table dimensions; always build from `/docs/pinball/table-layout.json` (loaded at runtime). No coordinates hardcoded in code. If something in the JSON does not fit, ask the user instead of resizing it.
- Never write app code before Step 0 completion and user sign-off on `/docs/trait-map.md`.
- No emoji as UI icons; use SVGs or custom pixel sprites.
- Update `memory.md` after every meaningful milestone.
- All derived traits must be visibly flagged as "derived" in the UI.
