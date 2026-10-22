# Project Memory: Chog Swarm

## 1. Project Overview
Chog Swarm is a premium-tier autonomous web game built for Chogathon 2026 (chogathon.chog.xyz). In Chog Swarm, each Chog NFT owned by a player determines how an autonomous agent plays in a short, strategic grid arena. The hackathon's core requirement is strict NFT essentiality: an agent cannot spawn with that identity and compiled policy without verified NFT ownership. Judging criteria: Novelty (30%), Fun (20%), Retention (20%), Clarity (15%), Execution (15%), with bonus for meaningful $CHOG utility.

## 2. Architecture
- **Engine Package (`packages/engine`)**: Framework-free, purely deterministic state transition machine (seed + policy + rules version -> identical state sequence).
- **Web App (`apps/web` or root Next.js app)**: Next.js + TypeScript, wagmi/viem for on-chain reads/verification on Monad, HTML5 Canvas arena renderer with high-fidelity HUD styling.
- **Audio Engine (`lib/halloween-audio.ts`)**: 100% Procedural Web Audio API synthesis engine (zero audio samples or files). D harmonic minor @ 92 BPM, lookahead scheduler, dynamic game reactions, 24-voice polyphony management, visibility automation.
- **Backend / Re-simulation**: Server-side engine execution for Daily Gauntlet leaderboard validation (anti-cheat verification) and ghost replay fetching.
- **Persistence**: Firestore (or equivalent) for ghost policies, daily seeds, and verified leaderboard scores.

## 3. Tech Stack
- **Framework**: Next.js (App Router), TypeScript (pinned versions)
- **Web3**: viem, wagmi (Monad chain integration)
- **Rendering**: HTML5 Canvas with custom sprite/vector rendering, smooth interpolation, responsive design
- **Audio**: Web Audio API (procedural synthesis, ConvolverNode reverb, DynamicsCompressor, WaveShaper tanh limiter)
- **State & Verification**: Deterministic TS engine, server-side re-simulation
- **Styling**: Tailwind CSS / CSS Modules with custom Chog design tokens (dark graphite base, authentic Chog brand accents, warm neutrals, bespoke typography)

## 4. Current State
- **CONSUMER-READY POLISH & VIBE-CODED ELEMENT REMOVAL VERIFIED**:
  - Eliminated all hackathon meta-rubric badges ("NOVELTY 30%", "RETENTION 20%") across the landing page, Trait Lab, and Daily Gauntlet, replacing with consumer badges ("SANDBOX", "COUNTERFACTUAL SANDBOX", "DAILY CHALLENGE", "GLOBAL CHALLENGE").
  - Removed developer test toggles ("Disconnect Test") and intrusive warning banners from header navigation and gameplay pages.
  - Replaced defensive "Recorded Fallback" labels and disclaimer text with polished "Exhibition Match • Archived Simulation" showcase styling.
  - Replaced raw browser `window.alert()` popups with seamless in-app wallet selection via RainbowKit's `openConnectModal()`.
  - Fixed broken state passing on landing page sample cards to compile authentic policies using `compilePolicy()`.
  - Removed all mock flags from `components/chog-select-modal.tsx`, seamlessly linking `session.creatorPass` and `session.judgePass` for unrestricted authorized token selection.
  - Passed full acceptance: 0 TypeScript errors (`tsc --noEmit`), 21/21 vitest tests, 1,969/1,969 NFT WebP assets intact, and 11/11 access gate security checks.
- **CHOG HOLDER ACCESS GATE WITH CREATOR ALLOWLIST & JUDGE PASS VERIFIED (ALL CHECKS 1–11 PASS)**:
  - **Hard Gate Rule**: Access granted if wallet holds $\ge 1$ Chog Genesis NFT (`balanceOf > 0` on `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763` on Monad Chain 143), OR address is in `OWNER_ALLOWLIST` (case-insensitive env var), OR authenticated via `JUDGE_CODE`.
  - **Server-Side SIWE Verification**: EIP-4361 proof-of-wallet signed message with domain, address, chain 143, single-use nonce, and 10-minute expiry. Verified with viem. Issues signed HMAC-SHA256 session cookie (`chog_session`) valid 12 hours (24 hours for Judge Pass).
  - **Holding Re-Check & Closed Failure**: In-memory 15-minute cache for `balanceOf`. Re-checks holding automatically upon session validation; if token transferred/sold, access immediately revoked. On RPC failure, fails CLOSED with retry error (never fails open).
  - **Gated Server-Side Engine**: Match resolution migrated to protected server endpoints (`/api/arena/run`, `/api/lab/run`, `/api/gauntlet/submit`). Resolution returns exact deterministic replays while preventing non-holders from triggering engine bundles.
  - **Creator Pass & Judge Pass**:
    - Allowlisted addresses without tokens get `creatorPass: true` and can play any Chog.
    - Persistent subtle banner: `"Creator pass: playing Chog #<id> (not owned)"` / `"Judge pass: playing Chog #<id> (not owned)"`.
    - Runs are strictly excluded from public Gauntlet and Leaderboard (`recordedToLeaderboard: false`).
  - **Blocked Screen UI**: Halloween dark glass UI on `/arena`, `/lab`, `/gauntlet` for non-holders or disconnected wallets: "Chog holders only", connected shortened address, "This wallet holds no Chog", switch wallet/disconnect, link to official collection, link to demo replay, and Judge Code entry form.
  - **Public Routes Retained**: Landing (`/`), recorded demo replay (`/demo`), and read-only leaderboard (`/leaderboard`, `/api/gauntlet/leaderboard`) remain open to everyone.
  - **Acceptance Deliverables**: All 11 checks verified via `scripts/verify-access-gate.ts`, evidence screenshots in `public/screenshots/check[1-5]-*.png`.

## 5. Recent Changes
- Removed hackathon criteria meta-badges ("NOVELTY 30%", "RETENTION 20%") and replaced with consumer badges.
- Removed developer "Disconnect Test" toggle and mock state from `components/navbar.tsx`, `app/arena/page.tsx`, `app/gauntlet/page.tsx`, `components/policy-inspector.tsx`, and `components/chog-select-modal.tsx`.
- Refactored `/demo` showcase banner from defensive fallback disclaimer to "Exhibition Match • Archived Simulation".
- Fixed landing page sample Chog selector to compile authentic policy rather than empty `{}`.
- Replaced injected connector call on landing page with RainbowKit's `openConnectModal()`.
- Built `lib/access-config.ts` for feature flags (`PUBLIC_REPLAY`, `PUBLIC_LEADERBOARD_READ`), allowlist parsing, and judge code validation.
- Built `lib/auth-session.ts` for single-use nonces, EIP-4361 message parsing, on-chain holding checks with 15-minute cache, fail-closed handling, and HMAC session cookie signing.
- Created auth API routes: `GET /api/auth/nonce`, `POST /api/auth/verify`, `GET /api/auth/session`, `POST /api/auth/logout`, `POST /api/auth/judge`, `POST /api/auth/select-chog`.
- Created server-side engine resolution endpoints: `POST /api/arena/run`, `POST /api/lab/run`.
- Updated `POST /api/gauntlet/submit` to enforce session validation and exclude creator/judge pass runs from public ranking.
- Implemented `middleware.ts` for Next.js route protection and API 401 blocking.
- Implemented `<AccessContext>` & `useAccessSession()` hook in `components/access-context.tsx` and mounted in `components/web3-provider.tsx`.
- Implemented `<AccessBlocked />` in `components/access-blocked.tsx` with Halloween styling, switch wallet button, collection link, and demo replay link.
- Implemented `<CreatorBanner />` in `components/creator-banner.tsx` and `<GateGuard />` in `components/gate-guard.tsx`.
- Wrapped gated pages (`app/arena/page.tsx`, `app/lab/page.tsx`, `app/gauntlet/page.tsx`) in `<GateGuard>`.
- Authored test verification suite `scripts/verify-access-gate.ts` verifying Checks 1–11.

## 6. Important Decisions
- **Fail-Closed Security**: Monad RPC errors fail CLOSED, preventing unauthorized access during network partitions.
- **Single-Use Nonces & Rate Limiting**: Nonces are strictly invalidated upon first use to eliminate replay attacks.
- **Server-Side Re-Simulation**: Engine resolution on server ensures non-holders cannot generate runs directly while deterministic hash matches vitest test suite.
- **Zero Secret Commits**: `OWNER_ALLOWLIST`, `SESSION_SECRET`, and `JUDGE_CODE` reside exclusively in `.env.local` / host environment; `.env.example` committed with empty placeholders.
- **Rule A & B Preservation**: All 1,969 Chog NFT WebP images untouched; 21/21 vitest engine tests pass with zero diffs.

## 7. Known Issues
- None. All Checks 1–11 passed.

## 8. Current Task
- Vibe-coded element cleanup complete; verified consumer flow and acceptance suites.

## 9. Next Steps
- Deliver final summary to user.

## 10. Important Files
- `lib/access-config.ts`: Access rules and allowlist configuration.
- `lib/auth-session.ts`: Proof-of-wallet, SIWE parsing, holding cache, and session cookie engine.
- `components/access-context.tsx`: Client-side authentication provider and wagmi sync.
- `components/access-blocked.tsx`: Halloween dark-glass blocked screen component.
- `components/creator-banner.tsx`: Persistent banner for creator and judge passes.
- `components/gate-guard.tsx`: Higher-order gating wrapper for protected routes.
- `middleware.ts`: Next.js request gating middleware.
- `scripts/verify-access-gate.ts`: Automated test suite for Checks 1–11.
- `docs/halloween-acceptance-report.md`: Complete acceptance test report.

## 11. Environment & Configuration
- Monad Testnet / Mainnet RPC endpoints.
- Next.js Turbopack development server on `http://localhost:3000`.

## 12. Development Rules
- Maintain documentation integrity.
- Never write app code before Step 0 completion.
- No emoji as gameplay icons; use SVGs or custom pixel sprites.
- Update `memory.md` after every meaningful milestone.
