# Chog Swarm Design Tokens & Brand Identity System

> Extracted directly from official production sources: [chog.xyz](https://chog.xyz) and [chogathon.chog.xyz](https://chogathon.chog.xyz)

---

## 1. Brand Palette & Color Architecture

Chog Swarm employs a **Dark Graphite** foundation illuminated by the authentic Monad Chog purple, warm cheek accents, and game HUD signal colors.

### Core Foundation (Graphite & Dark Surfaces)
| Token Name | Hex / RGBA | Role / Usage |
| :--- | :--- | :--- |
| `color-bg-base` | `#0E0B1A` | Main page & arena viewport base |
| `color-bg-surface-1` | `#141026` | Card backgrounds, sidebars, drawer panels |
| `color-bg-surface-2` | `#181330` | Elevated containers, modal overlays, tooltips |
| `color-bg-card` | `#161228` | Interactive unit cards, replay log panel |
| `color-line-subtle` | `rgba(244, 241, 254, 0.10)` | Structural dividers, grid cell outlines |
| `color-line-bright` | `rgba(169, 155, 252, 0.28)` | Hover boundaries, active panel outlines |

### Authentic Chog Accents
| Token Name | Hex / RGBA | Role / Usage |
| :--- | :--- | :--- |
| `color-chog-purple` | `#836EF9` | Primary brand accent, CTA buttons, active state |
| `color-chog-purple-soft` | `#A99BFC` | Highlights, badge borders, focused interactive states |
| `color-chog-purple-glow` | `rgba(131, 110, 249, 0.45)` | Bloom filter, laser tracks, spawn rings |
| `color-chog-cheek` | `#FF6289` | Warm Chog cheek pink, critical alert, heart / life |
| `color-chog-gold` | `#F59E0B` | Daily Gauntlet trophy, 1st place badge, high-tier loot |

### Text & Neutrals (Warm Readability)
| Token Name | Hex / RGBA | Role / Usage |
| :--- | :--- | :--- |
| `color-text-primary` | `#F4F1FE` | Main headlines, primary stats, active values |
| `color-text-muted` | `rgba(244, 241, 254, 0.65)` | Subheaders, policy explanations, secondary metadata |
| `color-text-faint` | `rgba(244, 241, 254, 0.35)` | Grid coordinate numbers, timestamp offsets |

### Arena HUD & Game Signals
| Token Name | Hex / RGBA | Role / Usage |
| :--- | :--- | :--- |
| `color-signal-energy` | `#5CE68A` | Energy points, valid moves, speed buffs |
| `color-signal-hazard` | `#EF4444` | Hazard tiles, damage indicators, energy penalties |
| `color-signal-coop` | `#22D3EE` | Shared reward nodes, cooperative synergy indicator |
| `color-signal-diverge` | `#F43F5E` | Trait Lab divergence marker (decision branch split) |

---

## 2. Typography System

| Role | Font Family | Google Fonts Fallback | Usage in Chog Swarm |
| :--- | :--- | :--- | :--- |
| **Display Header** | `Koulen` | Impact, sans-serif | Game title, screen headlines, big score callouts, victory/defeat banner |
| **Interface / UI** | `Inter` | system-ui, sans-serif | Navigation, buttons, trait labels, dialog copy, form controls |
| **Mono / HUD** | `JetBrains Mono` | monospace | Coordinate readouts `(X, Y)`, policy reason logs, turn counters, hashes |
| **Flavor / Lore** | `Fraunces` | Georgia, serif | Agent victory quotes, post-match flavor text |

### Type Scales
- **Display XXL**: `clamp(48px, 6vw, 84px)` / line-height `0.9` (`Koulen`) — Match Outcome Banner
- **Display L**: `28px` / line-height `1.1` (`Koulen`) — Section Titles, Card Headers
- **HUD Stat**: `20px` (`JetBrains Mono`, bold, tabular numbers) — Arena Energy & Score
- **Body UI**: `14px` / line-height `1.5` (`Inter`) — Button labels, trait descriptions
- **HUD Micro**: `11px` / letter-spacing `0.14em` (`JetBrains Mono`, uppercase) — Policy Reason Log

---

## 3. Character & Arena Art Style

### The Chog Character
- **Anatomy**: Soft, rounded mischievous amphibious creature ("monanimal") with prominent expressive circular eyes, friendly mouth gestures, and distinct pastel/vibrant skin pigments (Origin, Pink, Aqua, Gold, Shadow).
- **Presentation**: Art is the hero. Rendered inside rounded card enclosures (`border-radius: 20px`), lit with ambient top-down glow (`radial-gradient(ellipse at 50% 0%, var(--p-glow), transparent 70%)`).
- **Trait Chips**: Clean pill containers (`background: rgba(244, 241, 254, 0.06)`, `border: 1px solid var(--ln-bright)`) displaying native NFT traits alongside their compiled policy modifiers.

### Arena HUD Grid Visuals
- **Grid Layout**: Minimalist isometric or top-down tactical grid with graphite cells and subtle line accents.
- **Resource Nodes**:
  - *Standard Node (Common)*: Emerald crystal pulse (`#5CE68A`).
  - *High-Value Node (Rare)*: Monad amethyst core (`#836EF9`).
  - *Cooperative Nexus*: Cyan dual-ring portal (`#22D3EE`).
- **Hazard Zones**: Unstable magma/void fissures pulsing gently with caution stripes or dark crimson glow (`#EF4444`).
- **Icons**: 100% SVG vector sprites or custom pixel icons. **Strictly no generic emoji as UI icons.**

---

## 4. Motion, Elevation & Feedback

- **Transitions**: Smooth cubic bezier easing `cubic-bezier(0.16, 1, 0.3, 1)` for panels and modals.
- **Agent Tile Steps**: Smooth linear/quadratic interpolation (lerp) over 250ms per turn with squish/stretch anticipation.
- **Replay Scrubber**: Interactive timeline bar with milestone notches, instant scrubbing, and highlighted divergence points in the Trait Lab.
- **Reduced Motion**: Full support for `@media (prefers-reduced-motion: reduce)` — instant snaps without translation animations, zero looping background pulse.
