# Chog Swarm: Judge Testing Instructions

These concise instructions allow hackathon judges to verify the entire application, access gate, and autonomous gameplay loops in under 3 minutes.

---

## Quick Testing Options (Choose Any)

### Path A: Test With Judge Pass Code (Recommended for Judges)
*Takes ~60 seconds to inspect the full product.*

1. Open **[http://localhost:3000](http://localhost:3000)** (or production deployment).
2. Click **PLAY ARENA** (or navigate to `/arena`).
3. If not holding a Chog, the **Access Gate** will appear with:
   - *"Chog holders only"*
   - Connected shortened address (or prompt to connect)
   - *"Unlock for Judges"* code input.
4. Enter the Judge Pass code:
   ```text
   CHOGATHON_2026_JUDGE2002
   ```
5. Click **UNLOCK ACCESS**.
6. **Verification Points**:
   - The arena immediately unlocks.
   - A persistent status banner appears at the top:
     `"Judge pass: playing Chog #<id> (not owned)"`
   - You can choose any Chog from the collection modal to simulate.
   - Click **START RACE** to watch the real-time deterministic physics simulation.

---

### Path B: Verify the Access Gate & Blocked State (Non-Holder)
*Takes ~30 seconds to verify strict NFT essentiality.*

1. Connect any standard Web3 wallet that does not own a Chog Genesis NFT on Monad (Chain 143).
2. Attempt to navigate directly to `/arena`, `/lab`, or `/gauntlet`.
3. **Verification Points**:
   - Navigation is blocked.
   - The dark-glass Halloween blocked screen displays:
     - Your connected address with MonadScan explorer link.
     - *"This wallet holds no Chog"*.
     - Action buttons to switch wallets or view the official collection.
     - Direct button to view the public exhibition replay without signing in.

---

### Path C: Test Public Exhibition Replay (Zero Setup / Zero Wallet)
*Takes ~30 seconds with no wallet required.*

1. Navigate directly to **[http://localhost:3000/demo](http://localhost:3000/demo)** or **[http://localhost:3000/leaderboard](http://localhost:3000/leaderboard)**.
2. Click on any archived match or top leaderboard entry.
3. **Verification Points**:
   - The simulation runs client-side with 100% deterministic fidelity.
   - The timeline scrubber lets you pause, rewind, scrub frame-by-frame, and inspect autonomous decision ticks.
   - Confirms that non-holders can spectate and audit verified replays without compromising gate security.

---

### Path D: Counterfactual Sandbox in Trait Lab
*Takes ~60 seconds to verify that traits dictate physics.*

1. From the unlocked session, navigate to `/lab`.
2. Select a Chog and view its compiled baseline policy attributes (`Aggression`, `Risk Buffer`, `Flipper Cadence`).
3. Click any mutation button (e.g. `Eyes (Valuation)` or `Aura (Risk Buffer)`).
4. Observe the live numeric delta and re-simulate to see the agent alter its trajectory and target prioritization.
