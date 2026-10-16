# Chog Swarm ⚡

> **Chogathon 2026 Hackathon Project** (`chogathon.chog.xyz`)  
> **Official Monad Mainnet Contract**: `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763` (1,969 Supply)  
> **$CHOG Token**: `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777`

---

## 1. What It Does

**Chog Swarm** is a tactical autonomous agent web game built for the Monad blockchain. Players connect their wallet, select an owned **Chog Genesis NFT**, and watch its authentic on-chain traits compile into a mathematical agent policy that autonomously competes in an energy-limited tactical grid arena.

### Game Modes
1. **Tactical Arena**: 1v1 autonomous arena match against preset archetypes or saved player ghost policies. Every turn logs the agent's exact policy reasoning.
2. **Trait Lab (Novelty Centerpiece — 30%)**: Change any single trait or policy parameter on any replay and re-run the same seed. The counterfactual engine renders both runs side-by-side and pinpoints the exact first turn where pathfinding and decisions diverge.
3. **Daily Gauntlet (Retention Hook — 20%)**: A single, shared arena seed per UTC day for all players worldwide.
4. **Anti-Cheat Server Re-simulation**: The backend server re-executes the deterministic engine using the submitted seed + policy. Only scores reproduced byte-for-byte on the server are accepted onto the public leaderboard.
5. **Demo Safety (Recorded Fallback)**: An offline fallback replay utilizing cached collection fixtures for judges or players evaluating without a Web3 wallet.

---

## 2. Why the Chog NFT is Strictly Essential

> *"Take the NFT out, does it still work? If the answer is yes, make it matter."* — Chogathon Rule

In Chog Swarm, the NFT is not a vanity cosmetic; it is the **runtime executable identity**:
1. **Hard On-Chain Verification Gate**: Before an agent can spawn, the client calls `ownerOf(tokenId)` directly on the Monad Mainnet contract (`0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`). If the connected wallet does not hold the NFT, spawning is hard-rejected.
2. **Policy Compilation from Native Traits**: Agent stamina, sprint speed, target priority, hazard risk tolerance, cooperation bias, and path symmetry tie-breaking are mathematically derived from verified traits (Tier, Skin, Eyes, Aura, Body, Side, Accessory, Head).
3. **Policy Snapshotting**: The policy is snapshotted per match to prevent front-running transfers mid-game.
4. **Visible "Disconnect Test"**: A dedicated test toggle in the header immediately detaches NFT ownership state, demonstrating live spawn rejection.
5. **Non-Owner Mode**: Non-owners can view public replays and inspect token policies, but **cannot spawn** a Chog-bound agent.

---

## 3. Step-by-Step Testing Instructions

### Option A: Testing with a Chog NFT (Live Monad Wallet)
1. Open the application.
2. Click **Connect Wallet** in the top right (connects to Monad Mainnet, Chain ID `143`).
3. Click **Choose Your Chog & Spawn** and pick your owned token from the list.
4. Review the verified traits and compiled policy in the **Policy Inspector**.
5. Click **Run Match** to watch the autonomous replay with live event reasoning.
6. Test the **Disconnect Test**: Toggle the "Disconnect Test" switch in the top navbar. Notice the red `NFT DISCONNECTED` status. Click "Run Match" and verify that spawning is rejected.

### Option B: Judge Testing Without a Chog NFT
Judges who do not hold a Chog Genesis NFT on Monad can test 100% of the game experience using:
1. **Interactive Trait Lab (`/lab`)**:
   - Navigate to `/lab`.
   - Mutate the **Side** parameter from `Right` to `Left`, or **Eyes** from `Laser Eyes` to `Happy`.
   - Watch the side-by-side arena split and observe the divergent turn marker (e.g. Turn 6).
2. **Recorded Fallback Replay (`/demo`)**:
   - Navigate to `/demo`.
   - Inspect the offline fallback replay using cached fixtures with full timeline scrubber and event logs.
3. **Manual Token ID Lookup**:
   - Open the Chog Select Modal on `/arena` and enter any Token ID from `#1` to `#1969` (e.g., `#143`, `#1024`, `#1969`) to inspect its real traits and compiled policy.

---

## 4. Tech Stack & Architecture

- **Engine Package (`packages/engine`)**: Pure TypeScript, framework-free deterministic state-transition engine. Tested with 1,000+ seeded balance runs.
- **Web Framework**: Next.js 16 (App Router), React 19, TypeScript.
- **Web3 / Blockchain**: RainbowKit (`@rainbow-me/rainbowkit`), `viem` and `wagmi` for Monad Mainnet (Chain ID `143`).
- **Rendering**: HTML5 Canvas with custom vector sprites, smooth interpolation, and high-DPI Retina support.
- **Styling & Design Tokens**: Tailwind CSS, Google Fonts (`Koulen`, `Inter`, `JetBrains Mono`, `Fraunces`). 100% SVG icons (Lucide), zero generic emoji.
- **Verification & Storage**: Pure deterministic Mulberry32 PRNG with server-side re-simulation API and JSON/Firestore leaderboard store.

### Environment & Wallet Configuration

Create a `.env.local` file or configure your deployment environment:
```env
# Optional custom WalletConnect Project ID from https://cloud.walletconnect.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=c04543160a2b8e8f2efae7b31d044fa9

# Optional custom app URL for Open Graph metadata
NEXT_PUBLIC_APP_URL=https://chog-swarm.vercel.app

# Optional Google Cloud / Firebase configuration for cloud Firestore persistence
# (Falls back automatically to local persistent disk storage in data/leaderboard.json)
FIREBASE_PROJECT_ID=
```

#### Network Specifications (Monad Mainnet)
- **Network Name**: Monad
- **Chain ID**: `143`
- **Native Currency**: `MON` (18 Decimals)
- **RPC URL**: `https://rpc.monad.xyz`
- **Block Explorer**: `https://monadscan.com`
- **Official Genesis Contract**: `0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`


---

## 5. Strategic Trait Tradeoffs & Balance

Every active trait carries balanced game tradeoffs tuned across 1,000+ automated simulation matches:
- **Speed Costs Energy**: Red skin sprints 2 tiles/tick, but costs 3.5 energy/tile (vs. 2.0 baseline).
- **Risk Gains Bonus**: Fiery aura scores +15% on hazard-adjacent nodes, but accepts hazard vulnerability.
- **Cooperation Unlocks Shared Rewards**: Yellow 143 Jersey prioritizes Cyan Nexus nodes (+50 pts), but concedes solo points if uncoordinated.
- **Balance Verified**: Win rates across all archetypes remain strictly within 38% to 62%, ensuring no single trait dominates.

---

## 6. Pre-Existing Work Used

- Standard open-source libraries: `next`, `react`, `viem`, `wagmi`, `tailwindcss`, `lucide-react`, `vitest`.
- All game mechanics, deterministic state transition engine, trait-to-policy compiler, pathfinder, canvas renderer, anti-cheat re-simulation, and Trait Lab are original work created for Chogathon 2026.

---

## 7. What's Next

- **$CHOG Staking / Wagers**: Extend the clearly marked `$CHOG` extension point to support gasless tournament entry pools.
- **Live Peer-to-Peer Swarms**: Real-time multi-agent lobbies supporting up to 8 autonomous Chogs simultaneously.
- **Ghost Matchmaking Registry**: Asynchronous on-chain ghost challenge contracts.
