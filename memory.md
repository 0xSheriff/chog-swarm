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
- **GATE 1 VISUAL LAYER REBUILD COMPLETE (ALL 8 ACCEPTANCE CHECKS PASSED)**:
  - **Hard Rule A (Unaltered NFT Art)**: Drawn 1:1 square WebP from `/public/chogs/[id].webp` without tint, circular mask, overlay, or haze. Automated pixel sampling verification yielded 2.54% mean color difference (threshold ≤ 5.0%). Frames, outer glow, and damage pips live strictly outside the image edge.
  - **Hard Rule B (One Source of Truth)**: Every flipper, wall, bumper, plunger, and target is drawn from the physics body's actual vertices and position every frame. Physics vs drawn flipper vertex error is 0.000 px.
  - **Hard Rule C (Premium & Errorless)**: Steady 60 FPS, 0 console errors, 0 warnings, zero page scroll at 1440x900 (table height 807px, 89.7% of viewport) and 390x844 (table width 382px, zero horizontal scroll).
  - **Plunger Mechanics**: 20/20 consecutive full launches reach the playfield; half charge falls back down the lane.
  - **Headless Physics**: 0 overlaps, 1.742s incline roll, full plunger reach, flipper top arch reach.
  - **Deliverables**: Verified in `/public/screenshots/` and `/docs/pinball/`: `desktop-1440x900.png`, `mobile-390x844.png`, `flippers-rest.png`, `flippers-up.png`, `plunger-rest.png`, `plunger-compressed.png`, and `gameplay-20s.webm`.
- **GATE 2 GAMEPLAY SYSTEMS (READY & INTEGRATED)**:
  - Rollover Lanes (C-H-O-G multipliers), 4 Ghost Targets & Banishment, On-chain verified Reunion, Crypt Portal hold & eject, 3-ball Multiball lock & frenzy, Amber Phosphor LED DMD Display, Web Audio synthesized sound effects, Haunted Hall codex.

## 5. Recent Changes
- Resolved `app/play/page.tsx` infinite reload loop by isolating `loadTableLayout` effect dependencies and guarding with `autoplayTriggeredRef`.
- Fixed Box2D/Planck RevoluteJoint angle limits in `packages/physics/src/physics-world.ts` to use relative angles (`spec.upAngle - spec.restAngle`) rather than absolute angles, correcting flipper swing range.
- Clamped physics time step `dt` with `Math.max(0, ...)` to eliminate negative frame deltas and applied direct motor speed updates on each tick.
- Re-placed and sized Ghost Chog targets to radius 0.110 in `table-layout.json` (and all mirrors: `app/`, `docs/`, `public/`) ensuring 142px width on desktop (≥ 110px) and 77px on mobile (≥ 70px) with 0 collider overlaps.
- Enhanced `packages/physics/src/flat-2d-renderer.ts` with uncropped 1:1 square Chog portraits, outer stone frames, external damage pips, realistic spring-and-rod plunger with LED charge meter, and physics-vertex-exact flippers.
- Created `scripts/run-visual-acceptance.ts` and verified all 8 acceptance checks pass with zero errors.
- Generated all visual artifacts and 20-second gameplay video in `public/screenshots/` and `docs/pinball/`.

## 6. Important Decisions
- **Rule A (NFT Art Integrity)**: Strictly forbidden from cropping, circular masking, or tinting Chog NFT artwork; all frames and embellishments remain strictly external to the 1:1 image bounds.
- **Rule B (One Source of Truth)**: Flippers and colliders rendered strictly from Box2D/Planck body vertices each frame.
- **DMD Separation**: High-fidelity arcade Dot-Matrix Display placed in side panel on desktop (never shrinking the table) and top strip on mobile.
- **Dual Renderer Support**: Flat 2D canvas is the default crisp renderer; Three.js 3D renderer remains accessible via `?renderer=3d`.

## 7. Known Issues
- Local machine Vercel CLI is not logged in (`vercel whoami` logged out); deployment requires connecting the GitHub repo on vercel.com or running `npx vercel login`.

## 8. Current Task
- Deliver Gate 1 Visual Layer Rebuild results with verified acceptance deliverables and await user playtest.

## 9. Next Steps
- User playtest of Gate 1 visual rebuild at `http://localhost:3000/play`.
- User playtest of Gate 2 mechanics (C-H-O-G, multiball, reunion).
- Proceed to Gate 3 upon approval.

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
