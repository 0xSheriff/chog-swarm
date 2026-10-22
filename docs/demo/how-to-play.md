# How to Play Chog Swarm (Halloween Edition)

A complete, verified guide to the gameplay loop, trait compilation engine, on-chain verification, and game modes in **Chog Swarm**.

---

## 1. Overview & Core Philosophy

**Chog Swarm** is an autonomous web game built for **Chogathon 2026**. Rather than manual twitch-based pinball or standard clicker mechanics, every Chog NFT in your wallet compiles directly into an autonomous agent policy.

- **The NFT is Essential**: The agent's identity, physical stats, risk tolerances, and steering policies are deterministically compiled from the visual metadata and trait layers of the Chog NFT.
- **Strictly Non-Fungible Behavior**: Take the NFT away, and the policy cannot exist. Two different Chogs run on the same table with completely different physics responses, trajectories, and scoring strategies.

---

## 2. Wallet Connection & Access Gate

Chog Swarm features an on-chain gate verified via Monad (Chain ID 143):

1. **Monad Verification**:
   - Contract: `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763` (Chog Genesis Collection).
   - Upon connection, the application requests an EIP-4361 Sign-In with Ethereum (SIWE) signature.
   - The server verifies the signature, performs an on-chain `balanceOf` check, and issues a secure `httpOnly` HMAC-signed session cookie.
2. **Blocked State (Non-Holders)**:
   - If a connected wallet holds zero Chogs, the gate intercepts all protected routes (`/arena`, `/lab`, `/gauntlet`).
   - A Halloween dark-glass blocked screen displays the connected address, verification failure, a direct link to the Monad collection, and a Judge Pass entry field.
   - *Screenshot Reference*: [`docs/demo/screenshots/01-non-holder-blocked-arena.png`](file:///Users/mac/Chog-Swarm/docs/demo/screenshots/01-non-holder-blocked-arena.png)
3. **Creator & Judge Passes**:
   - Approved creator addresses and hackathon judges with an active code receive full access to select and test any Chog from the collection.
   - A persistent status banner is maintained on-screen: `Creator pass: playing Chog #<id> (not owned)` or `Judge pass: playing Chog #<id> (not owned)`.
   - Runs executed under a creator or judge pass are strictly tagged `recordedToLeaderboard: false` to guarantee public leaderboard integrity.

---

## 3. How Chog Traits Become Autonomous Policies

Every Chog is composed of distinct trait layers. In `packages/engine` and `lib/chog-policy.ts`, each layer directly seeds numerical parameters in the agent's deterministic control loop:

| Trait Category | Game Attribute | In-Game Effect |
| :--- | :--- | :--- |
| **Eyes** | *Valuation & Aggressiveness* | Modulates target prioritization (e.g. Laser Eyes aggressively hunt multiball jackpots; Hypno Eyes prioritize multiplier bumpers). |
| **Aura / Background** | *Risk Buffer & Tilt Tolerance* | Determines how close the agent maneuvers near the drain lanes before triggering defensive nudges or flipper sweeps. |
| **Mouth / Expression** | *Path Routing & Trajectory Bias* | Dictates spin bias and lane entry angles, altering left vs. right ramp targeting. |
| **Headwear** | *Flipper Response & Cadence* | Controls flipper trigger timing (early micro-taps vs. full-power delayed strikes). |
| **Clothing / Body** | *Mass & Elastic Restitution* | Influences collision rebound speeds off bumpers, walls, and slingshots. |

---

## 4. Game Modes

### A. The Arena (`/arena`)
- **Format**: Head-to-head or multi-agent exhibition simulation.
- **Workflow**:
  1. Select your verified Chog from the modal.
  2. The table initializes with standard tournament gravity and bumper layouts.
  3. Click **START RACE** to launch the deterministic simulation.
  4. Real-time HUD tracks current score, multiplier, turn count, and live policy decisions.
  5. Scrubber controls allow instant rewinding, pause, frame stepping, and full-speed playback.
  - *Screenshot Reference*: [`docs/demo/screenshots/03-arena-initial-grid.png`](file:///Users/mac/Chog-Swarm/docs/demo/screenshots/03-arena-initial-grid.png), [`docs/demo/screenshots/04-arena-finished-race.png`](file:///Users/mac/Chog-Swarm/docs/demo/screenshots/04-arena-finished-race.png)

### B. Trait Lab (`/lab`)
- **Format**: Interactive counterfactual sandbox.
- **Purpose**: Proves the direct causal link between NFT traits and gameplay behavior.
- **Workflow**:
  1. Inspect your Chog's baseline compiled policy.
  2. Mutate individual traits (e.g. switch `Eyes` from Normal to Cyber, or toggle `Aura` states).
  3. Real-time deltas instantly highlight changes in `aggression`, `riskBuffer`, and `rebound`.
  4. Run side-by-side counterfactual simulations to witness how changing a single NFT attribute completely alters agent pathing.
  - *Screenshot Reference*: [`docs/demo/screenshots/05-trait-lab-baseline.png`](file:///Users/mac/Chog-Swarm/docs/demo/screenshots/05-trait-lab-baseline.png)

### C. Daily Gauntlet (`/gauntlet`)
- **Format**: 24-hour global competitive challenge.
- **Mechanics**:
  - All players run against a single daily seed (e.g. `#133742`) with fixed hazard placements, bumper multipliers, and gravity shifts.
  - Runs are submitted with complete tick-by-tick inputs and verified on the server via deterministic replay.
  - Any hash discrepancy or illegal state transition results in rejection.
  - High scores qualify for daily leaderboard rankings.
  - *Screenshot Reference*: [`docs/demo/screenshots/07-daily-gauntlet.png`](file:///Users/mac/Chog-Swarm/docs/demo/screenshots/07-daily-gauntlet.png)

### D. Global Leaderboard (`/leaderboard`) & Exhibition Replay (`/demo`)
- **Public & Permissionless**: Anyone (holders and non-holders alike) can view verified top runs.
- **Deterministic Replay Verification**: Clicking any leaderboard entry loads the exact seed and policy replay sequence, proving zero fabrication or client-side tampering.
- *Screenshot Reference*: [`docs/demo/screenshots/08-leaderboard.png`](file:///Users/mac/Chog-Swarm/docs/demo/screenshots/08-leaderboard.png), [`docs/demo/screenshots/09-exhibition-demo-replay.png`](file:///Users/mac/Chog-Swarm/docs/demo/screenshots/09-exhibition-demo-replay.png)

---

## 5. Notes on $CHOG & Ecosystem Status

- **$CHOG Ecosystem Utility**: The application reads and displays the player's $CHOG token holdings and ecosystem status.
- **Honest In-Game Scope**: In this hackathon release, $CHOG is not burned or staked inside game loops. All claims and stats presented on screen represent live, verified state without simulated or fabricated financial mechanics.
