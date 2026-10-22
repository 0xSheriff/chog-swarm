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
- **HALLOWEEN VISUAL THEME IMPLEMENTED & FULLY VERIFIED (ALL CHECKS PASS)**:
  - **Global Layered Background**: Mounted in `app/layout.tsx` across all routes. Composed of 2x2 diagonal mosaic, responsive sizes (`desktop-bg.webp` 137KB, `tablet-bg.webp` 51KB, `mobile-bg.webp` 50KB vertical stack) and per-frame variants (`bg-frame1.webp` through `bg-frame4.webp`).
  - **Per-Route Focus Cross-Fade**: Slow 600ms cross-fade between route variants: Landing (full collage), Arena/Race (Frame 4), Lab (Frame 2), Gauntlet & Leaderboard (Frame 3), Demo (Frame 1).
  - **4-Layer Parallax Motion Engine**: Depth parallax with smooth lerp (factor 0.08) in single rAF loop via `--mx` and `--my`, scroll vertical parallax (0.15x), and idle Lissajous auto-drift fallback.
  - **Ambient Life & Effects**: Vignette gradient, 2 drifting fog bands (60s & 90s), interactive canvas embers (up to 40 particles + cursor repulsion & trail), bats silhouettes, soft moon halo, corner cobwebs, and 18s holographic sheen sweeps.
  - **Landing Page Hero**: 4 tombstone-arched framed portraits with 3D tilt (max 8deg with perspective 900px), glare layer, idle motion (frame 1 flickers, frame 4 pulses, frames 2/3 sway), and periodic eye flashes (45-90s).
  - **Brand Assets**: Favicon (`app/favicon.ico`), Apple icon (`app/apple-icon.png`), app icon (`app/icon.png`), and header logo & footer mark derived directly from Frame 1 (`public/frame1.jpg`) with candle-flicker glow.
  - **Glass Panel Styling**: Dark glass `rgba(10, 7, 18, 0.72)` with `backdrop-filter: blur(10px)`, 1px border `rgba(239, 230, 210, 0.12)`, specular sheen tracking pointer hover (`--panel-x`, `--panel-y`), button gloss sweeps, and bone white text (`#efe6d2`) with WCAG AA 16.08:1 contrast.
  - **Game-Reactive Events**: `chog:fx` CustomEvent channel supporting bumper, slingshot, ghostBanish, multiball, drain, and jackpot visual reactions.
  - **Acceptance Deliverables**: 12 route screenshots (`public/screenshots/bg-<route>-desktop.png` and `mobile.png`) and 15s recorded video demo (`public/screenshots/halloween-reactive-demo.webm`).

## 5. Recent Changes
- Created `scripts/build-halloween-bg.ts` and generated optimized WebP assets in `public/halloween/bg/`.
- Created `scripts/build-favicons.mjs` and generated `app/icon.png`, `app/apple-icon.png`, `app/favicon.ico` with proper RGBA channels.
- Authored `lib/theme-fx.ts` configuration flags for all effects.
- Implemented `components/halloween-bg.tsx` (fixed multi-depth background with canvas embers, fog, bats, moon, and sheen).
- Implemented `components/halloween-effects.tsx` (glass specular sheen and smoke wipe route transitions).
- Created `components/landing-hero-portraits.tsx` (tombstone-arched 3D tilt portraits with idle motions and eye flashes).
- Updated `app/globals.css` with Pirata One font, Halloween color tokens, `.glass-panel`, `.btn-gloss`, and animations.
- Updated `components/navbar.tsx` with Frame 1 flame logo and Pirata One wordmark.
- Updated `app/layout.tsx` to mount `<HalloweenBackground />` and `<HalloweenEffects />` and frame 1 footer mark.
- Converted `app/page.tsx`, `app/arena/page.tsx`, `app/lab/page.tsx`, `app/gauntlet/page.tsx`, `app/leaderboard/page.tsx`, and `app/demo/page.tsx` to glass styling and bone typography.
- Created `scripts/verify-halloween-theme.ts` automated acceptance suite; verified all checks pass and generated demo video.

## 6. Important Decisions
- **Unaltered Chog NFT Art (Rule A)**: Gameplay Chog art in `/public/chogs/*.webp` remains pixel-identical. Darkening and tinting apply exclusively to background WebP collage copies.
- **Single Source of Truth FX Flags**: All effects are toggled via boolean flags in `lib/theme-fx.ts`.
- **High Performance Architecture**: Single rAF loop for pointer & parallax, paused on tab hidden (`visibilitychange`), adaptive quality step-down if FPS < 52.
- **Accessibility**: Full `prefers-reduced-motion` compliance freezing all animations, with 16.08:1 WCAG AA text contrast.

## 7. Known Issues
- None.

## 8. Current Task
- Deliver Halloween Visual Theme verification report and push to GitHub origin.

## 9. Next Steps
- Await user review and playtest of the Halloween theme.

## 9. Next Steps
- Present the final report to the user.

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
