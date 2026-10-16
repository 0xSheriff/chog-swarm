# Chog Swarm: Trait-to-Policy Mapping Specification (`/docs/trait-map.md`)

> **Status**: DRAFT FOR USER REVIEW & APPROVAL  
> **Source Collection**: Chog Genesis (`0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763`) on Monad Mainnet (Chain ID 143)  
> **Total Supply**: 1,969 Verified Tokens  
> **Rule Compliance**: All traits mapped below are 100% genuine traits extracted from the real on-chain collection metadata. All gameplay numbers are derived mathematical policies and are explicitly labeled `[DERIVED]` in the UI. Low-variance traits (>90%) are strictly excluded.

---

## 1. Trait Variance & Eligibility Summary

From our complete 1,969-token analysis ([`/docs/trait-distribution.md`](file:///Users/mac/Chog-Swarm/docs/trait-distribution.md)):

| Trait Type | Top Variant % | Status | Role in Chog Swarm |
| :--- | :--- | :--- | :--- |
| **`Base`** | 94.8% ("Origin") | 🚫 **EXCLUDED** | Low variance (>90%). Purely decorative rendering. |
| **`Form`** | 96.9% ("Chog") | 🚫 **EXCLUDED** | Low variance (>90%). Character baseline mesh. |
| **`Naked`** | 97.2% ("No") | 🚫 **EXCLUDED** | Low variance (>90%). Excluded from game mechanics. |
| **`Tier`** | 64.9% ("Common") | ✅ **ACTIVE** | Core Energy Reserve & Maintenance Calibration |
| **`Skin`** | 28.6% ("Pink") | ✅ **ACTIVE** | Movement Cost & Sprint AP Profile |
| **`Eyes`** | 6.2% ("Happy") | ✅ **ACTIVE** | Perception Horizon & Value Prioritization |
| **`Aura`** | 8.4% ("Burning Aura") | ✅ **ACTIVE** | Hazard Adjacency Risk Curve & Safety Buffer |
| **`Body`** | 3.1% ("Tuxedo") | ✅ **ACTIVE** | Objective Bias: Solo Node Greed vs. Coop Nexus Synergy |
| **`Side`** | 66.8% ("Right") | ✅ **ACTIVE** | Pathfinding Equidistant Tie-Breaker (Clockwise / Counter-Clockwise) |
| **`Accessory`** | 14.7% ("Fwog") | ✅ **ACTIVE** | Secondary Tactical Trait (Companion Assist / Diagonal Reach) |
| **`Head`** | 4.0% ("Mon Cap") | ✅ **ACTIVE** | Tactical Milestone Perk & Cooldown Modifier |
| **`Mouth`** | 11.0% ("normal smile") | ✅ **ACTIVE** | Harvester Tempo & Post-Action Emote / Particle Burst |
| **`Background`** | 9.4% ("Light Purple") | 🎨 **VISUAL** | Arena HUD Theme, Ambient Lighting & Trail Tint |

---

## 2. Core Game Loop & Policy Parameters

The arena is a **discrete tactical grid (e.g. 10x10)** with:
- **Turn Limit**: 30 turns per run.
- **Starting Energy**: 100 energy units (adjusted by Tier & Skin).
- **Resource Nodes**:
  - *Standard Node (Green)*: +10 pts, respawns slowly.
  - *High-Value Node (Purple)*: +30 pts, positioned further or adjacent to hazards.
  - *Cooperative Nexus (Cyan)*: +50 pts (shared +25 pts each if two agents coordinate; requires cooperation).
- **Hazard Fissure (Crimson)**: Expanding unstable zone. Stepping on a hazard drains **-25 Energy**; adjacent steps drain **-5 Energy** unless shielded.
- **Score**: Total resource points gathered before turns or energy expire.

---

## 3. Real Trait -> Game Parameter -> Visible Effect Mapping

Every policy parameter carries **meaningful strategic tradeoffs** to ensure rock-paper-scissors balance where no single trait combination dominates.

### 3.1 Tier (Energy Pool & Maintenance Tradeoff)
*Native Trait: `Tier` (Common, Uncommon, Rare, Epic, Legendary, Mythic)*

| Native Value | UI Trait Label | Derived Parameter | Visible Gameplay Effect & Tradeoff |
| :--- | :--- | :--- | :--- |
| **Common** | `Tier: Common` | `energyCapacity: 100`<br>`drainRate: 1.0x` | **Reliable Standard**: Steady baseline. 100 energy, normal consumption. Zero maintenance penalties. |
| **Uncommon / Rare** | `Tier: Rare` | `energyCapacity: 95`<br>`perceptionBonus: +1` | **Recon Tuned**: +1 Vision radius to spot purple nodes earlier, at the cost of 5 lower total energy. |
| **Epic** | `Tier: Epic` | `energyCapacity: 110`<br>`hazardVuln: 1.25x` | **Overclocked Engine**: +10 extra starting energy, but takes +25% penalty if hazard is triggered. |
| **Legendary / Mythic** | `Tier: Legendary` | `energyCapacity: 120`<br>`tempoDecay: -2/5t` | **High-Output Reactor**: 120 energy buffer, but loses 2 energy every 5 turns to cooling maintenance. |

### 3.2 Skin (Movement Cost vs. Sprint Speed Tradeoff)
*Native Trait: `Skin` (Pink, Origin, Red, Black, Yellow, Blue, White, Green, Jade, Metal, etc.)*

| Native Value | UI Trait Label | Derived Parameter | Visible Gameplay Effect & Tradeoff |
| :--- | :--- | :--- | :--- |
| **Pink / Origin** | `Skin: Pink / Origin` | `speed: 1 tile/tick`<br>`moveCost: 2 energy` | **Agile Scout**: Steady energy consumption (2 energy/move). Very efficient on compact clusters. |
| **Red / Burning** | `Skin: Red` | `speed: 2 tiles/tick`<br>`moveCost: 3.5 energy` | **Dash Sprinter**: Moves twice per turn cycle, snatching distant nodes first, but drains energy 75% faster (`speed costs energy`). |
| **Black / Shadow** | `Skin: Black` | `speed: 1 tile/tick`<br>`hazardResist: 40%` | **Void Walker**: Hazard penalties reduced by 40%, but cannot dash or sprint. |
| **Yellow / Electric** | `Skin: Yellow` | `surgeBonus: +1 AP (T1-8)`<br>`surgeExhaust: -1 AP (T16+)` | **Overcharger**: Lightning start for first 8 turns, then enters low-battery cruise mode. |
| **Metal / Jade / Blue** | `Skin: Metal / Jade` | `shieldCharge: 1 Hit`<br>`moveCost: 2.5 energy` | **Iron Plating**: Completely absorbs first hazard contact without damage, but base step cost is +0.5 energy. |

### 3.3 Eyes (Perception Horizon & Node Targeting Value)
*Native Trait: `Eyes` (Happy, BTC Glass, Laser Eyes, Monad Glasses, Stare, Sleepy, Angry, etc.)*

| Native Value | UI Trait Label | Derived Parameter | Visible Gameplay Effect & Tradeoff |
| :--- | :--- | :--- | :--- |
| **BTC Glass / Laser Eyes** | `Eyes: Laser Eyes` | `focusWeight: Purple Nodes (3.0x)`<br>`rerouteCost: High` | **Greedy Sniper**: Seeks highest-value purple nodes across the board, bypassing nearby greens (`risk gains bonus, but risks detours`). |
| **Happy / Wink** | `Eyes: Happy` | `focusWeight: Nearest (1.0x)`<br>`rerouteCost: Low` | **Local Harvester**: Dynamic nearest-neighbor routing. Minimizes tiles traveled per score point. |
| **Angry / Glare / Stare** | `Eyes: Angry` | `hazardProximityWeight: 0.2` | **Daredevil**: Will step immediately adjacent to hazards if path to node is shorter by >= 2 tiles. |
| **Sleepy / Normal** | `Eyes: Sleepy` | `clusterWeight: High` | **Cluster Seeker**: Only travels toward high node densities to avoid single isolated pickups. |

### 3.4 Aura (Hazard Risk Curve & Adjacency Bias)
*Native Trait: `Aura` (Burning Aura, Fiery Aura, Aqua Aura, Wind, Smoke, Clean, Royal Blue, etc.)*

| Native Value | UI Trait Label | Derived Parameter | Visible Gameplay Effect & Tradeoff |
| :--- | :--- | :--- | :--- |
| **Burning / Fiery Aura** | `Aura: Fiery Aura` | `riskBias: 0.85`<br>`hazardRiskPenalty: Low` | **Hazard Bravery**: Scores +15% bonus on nodes adjacent to hazards; risks hazardous paths (`risk gains bonus, can lose energy`). |
| **Aqua Aura / Clean / Mint** | `Aura: Aqua Aura` | `riskBias: 0.15`<br>`hazardSafetyBuffer: 1 tile` | **Cautious Guardian**: Strict 1-tile buffer around hazards. 0% chance of hazard damage, but takes longer paths. |
| **Wind / Smoke** | `Aura: Wind` | `evasion: 1.0` | **Drifter**: Automatically evades opponent paths, preventing movement blocks. |
| **Purple / Royal Aura** | `Aura: Royal` | `riskBias: 0.50` | **Harmonic Balance**: Neutral risk posture. Dynamically balances safety and speed. |

### 3.5 Body (Cooperation Nexus vs. Solo Greed Tradeoff)
*Native Trait: `Body` (Tuxedo, Yellow 143 Jersey, Kings Robe, Inmate, Black Vest, Hawaiian Polo, etc.)*

| Native Value | UI Trait Label | Derived Parameter | Visible Gameplay Effect & Tradeoff |
| :--- | :--- | :--- | :--- |
| **Yellow 143 Jersey / Trackset** | `Body: Yellow 143 Jersey` | `coopBias: 0.85`<br>`soloBias: 0.15` | **Swarm Cooperator**: In dual/ghost matches, moves to synchronize on Cyan Nexus nodes (`unlocks shared bonus rewards, but concedes solo score if partner lags`). |
| **Tuxedo / Kings Robe** | `Body: Tuxedo` | `coopBias: 0.10`<br>`soloBias: 0.90` | **Solitary Monopolist**: Ignores co-op nexuses; ruthlessly hoards individual nodes for maximum solo score. |
| **Farmer Shirt / Workwear** | `Body: Farmer Shirt` | `coopBias: 0.50`<br>`staminaEfficiency: +10%` | **Pragmatic Partner**: Cooperates only if opponent is within 3 tiles of nexus, otherwise harvests solo. |

### 3.6 Side (Deterministic Pathfinding Symmetry Breaking)
*Native Trait: `Side` (Right: 66.8%, Left: 33.2%)*

| Native Value | UI Trait Label | Derived Parameter | Visible Gameplay Effect |
| :--- | :--- | :--- | :--- |
| **Right** | `Side: Right` | `tiebreaker: Clockwise` | When two path routes have equal Manhattan distance, Chog always turns **Right / Clockwise**. |
| **Left** | `Side: Left` | `tiebreaker: Counter-Clockwise` | When two path routes have equal Manhattan distance, Chog always turns **Left / Counter-Clockwise**. |

> **Trait Lab Highlight**: Changing `Side` from `Right` to `Left` on the same seed demonstrates an immediate diverging branch at the first obstacle!

### 3.7 Accessory & Head (Secondary Tactical Modifiers)
- **`Accessory: Fwog`**: Diagonal Reach — can collect an adjacent resource node diagonally without stepping onto the cell.
- **`Accessory: Katana`**: Hazard Cleave — removes 1 adjacent hazard tile at the cost of 10 energy once per match.
- **`Head: Mon Cap`**: Monad Surge — +5 score bonus on the 14th turn (celebrating Monad).
- **`Head: Wizard Hat`**: Warp Stride — on turn 10, teleports up to 3 tiles toward the highest node if energy > 60.

---

## 4. Derived Parameter Labelling Standards in UI

To prevent misleading users, the frontend HUD enforces strict labelling:
1. **Pill Tag `[NFT NATIVE]`**: Displays the verified property from the blockchain metadata (e.g. `Eyes: Laser Eyes`, `Body: Yellow 143 Jersey`).
2. **Pill Tag `[DERIVED POLICY]`**: Displays the compiled math parameter (e.g. `Target Weight: Purple 3.0x`, `Coop Bias: 0.85`).
3. **Hover Tooltip**: Explains the exact formula and tradeoff.

---

## 5. Non-Enumerable Ownership & "List My Chogs" Strategy

Since `supportsInterface(0x780e9d63)` (ERC721Enumerable) is `false`:
- **Primary Method**: **Cached Owner Snapshot with Real-Time On-Chain Verification (`ownerOf`)**.
  - Client looks up connected wallet in indexed owner snapshot to instantly display owned Chogs.
  - Manual Token ID input box allows typing any token ID `#1` to `#1969`.
  - **Essentiality Gate**: Prior to match spawn, an on-chain read `contract.read.ownerOf([tokenId])` runs directly against Monad Mainnet (`143`). If `ownerOf != userAddress`, spawn is hard-rejected with a clear explanation modal.
  - **Disconnect Test**: Dedicated test toggle in the HUD drops verified wallet state; clicking "Spawn" immediately displays: *"Spawn Rejected: NFT ownership unverified for address."*

---

## 6. Read-Only $CHOG Balance Integration

- Address: `0x350035555E10d9AfAF1566AaebfCeD5BA6C27777` on Monad.
- Separate optional component (`components/chog-token-badge.tsx`).
- Executes read-only `balanceOf(userAddress)`:
  - If balance > 0 $CHOG: Agent gains a subtle golden particle aura in the arena and "CHOG HODLER" tag on replay cards.
  - Zero token transfers, zero approvals, zero gas required.
