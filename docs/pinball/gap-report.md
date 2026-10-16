# Visual Layer Gap Report & Rebuild Plan: Chog Swarm Haunted Pinball

**Date:** 2026-10-16  
**Branch:** `pinball`  
**Reference Video:** `app/reference ScreenRecording_10-15-2026_10-54-16_PM_1.mov`  
**User Playtest Video:** `docs/Screen_Recording_2026-10-16_at_11_23_20_PM.mov`  
**Live Captured Artifacts:**
- Reference: `docs/pinball/reference-desktop-1440x900.png`, `docs/pinball/reference-mobile-390x844.png`, `docs/pinball/reference-frames/ref_02.png`
- Current Localhost: `docs/pinball/current-desktop-1440x900.png`, `docs/pinball/current-mobile-390x844.png`

---

## 1. Executive Summary & Root Cause Analysis

From inspecting the user's screen recording frames (`docs/pinball/user-recording-frames/user_01.png`) side-by-side with the reference gameplay (`docs/pinball/reference-frames/ref_02.png`):

| Area | Current Localhost (`/play`) | Reference & Required Standard | Severity |
| :--- | :--- | :--- | :--- |
| **Table Framing & Scaling** | Table fills only ~33% of screen width; camera is pitched steeply at ~55° creating extreme trapezoidal foreshortening; entire page scrolls vertically. | Table is 1:2 portrait, fills viewport height (`100dvh` minus nav) centered, zero page scroll. 2D top-down crisp canvas as default; 3D camera pitch ≤ 25°. | **CRITICAL** |
| **Chog NFT Visibility & Art** | Tiny (~40px), circular-cropped, dim, under blue fog. Targets `g1` and `g2` are occluded by giant top slabs. Violates NFT essentiality. | **Rule A:** Unaltered, full square WebP, original aspect ratio, no tint, no blur, no mask crop. Radius ≥ 0.085 table units (≥ 120px on desktop, ≥ 70px on mobile). All 4 targets 100% visible with bold nameplate (`CHOG #53`, etc.). | **CRITICAL** |
| **Flippers** | Long thin apron bars drawn connected to short blades. Left and right differ. Visual mesh does not match physics body. | **Rule B:** Drawn directly from physics body vertices every frame. Tapered paddle (length ~0.136), rounded tip, pivot bolt, rubber texture, perfectly mirrored. Error ≤ 1px. | **CRITICAL** |
| **Plunger Lane** | Empty dark slot with no rod, spring, knob, or ball seat. Ball appears floating in space. | Complete mechanical plunger: side walls, coiled compression spring, steel rod, knob, seated ball, charge meter, and one-way gate flap. | **HIGH** |
| **Lighting & Mood** | Blinding orange blobs at bottom flippers, blue haze at top, pitch-black center. | Even, clear playfield illumination across all targets. Mood created via props, carved wood/slate borders, and edge glow—never by darkening the table. | **HIGH** |
| **UI & DMD Display** | Placed above the table, eating vertical height and forcing viewport overflow scroll. | Desktop: side panel (left or right). Mobile: slim top strip. Table never shrinks for UI. | **HIGH** |

---

## 2. Hard Architectural Rules

### Rule A: Unaltered Chog NFT Image Fidelity
1. **Never alter a Chog NFT image**:
   - Draw the local WebP (`/public/chogs/[id].webp`) **exactly as stored**.
   - Full image, original 1:1 aspect ratio, uncropped (no circular clipping masks).
   - No tint, no color grading, no blur, no blend mode, no opacity reduction, no filter, no fog/haze drawn over it.
   - Frames, glow, and damage pips/rings go strictly **OUTSIDE** the image edge.
2. **Automated Verification**:
   - Add a unit/e2e test sampling on-screen canvas pixels within the Chog bounding box and comparing against source WebP decoded pixels (mean color difference ≤ tolerance).

### Rule B: Single Source of Truth (Physics = Renderer)
1. Every wall, flipper, pop bumper, slingshot, plunger, and target is drawn **directly from the physics body's actual vertices and position, every frame**.
2. Zero hand-placed offset meshes.
3. If a shape is drawn on screen, it is a collider; if it is a collider, it is drawn.

### Rule C: Zero-Jitter Premium Quality
1. No console errors or warnings.
2. Zero layout jump, zero page scrollbar on `/play`.
3. Steady 60 FPS across both 2D and 3D tiers.

---

## 3. Implementation Plan & Steps

### Step 1: Update Table Layout (`table-layout.json`) & Physics Scale
- Re-position and size ghost targets `g1` to `g4` so visual and physics radius is `0.085` (diameter 0.17 table units = 120px+ at 1440x900).
- Run automated overlap check: guarantee `dist >= r1 + r2` for all colliders.
- Adjust flipper specs in JSON: `length: 0.136`, `baseRadius: 0.022`, `tipRadius: 0.012`, symmetrical pivots and angles.
- Adjust plunger rest position and stroke.

### Step 2: Full-Viewport Top-Down 2D Canvas Engine (Default)
- `/play` uses crisp 2D Canvas as primary default renderer (`devicePixelRatio` aware).
- Table fills 100dvh minus header (aspect ratio locked to 1:2), centered horizontally.
- Zero page scroll: `overflow: hidden`, fixed container sizing.
- DMD moved to a dedicated desktop side panel (left of table); on mobile, slim top bar.

### Step 3: Physics-Driven Flipper & Plunger Rendering (Rule B)
- Query `flipperBody.getFixtureList().getShape()` vertices every frame.
- Draw real tapered paddle, inner rubber boundary, pivot metal bolt, and swing indicator.
- Draw plunger lane on right: steel guide rails, coiled compression spring that visually squashes as plunger charges, rod, knob, and ball seat.
- One-way gate drawn as an arched mechanical flap that swings open when ball passes upward.

### Step 4: True NFT Representation (Rule A)
- Load WebP images in full square resolution without clipping.
- Render solid stone/spectral frame OUTSIDE the square image.
- Damage pips rendered as 3 distinct outer glowing gem brackets.
- Bold nameplates below each target: `CHOG #53`, `CHOG #392`, `CHOG #434`, `CHOG #494` (font size ≥ 14px).

### Step 5: Clean Playfield Lighting & 3D Refactor (`?renderer=3d`)
- Eliminate purple top slabs (slingshots were mistakenly placed at top).
- Adjust 3D camera: pitch ≤ 25°, table fills ≥ 70% viewport height.
- Ambient light balanced so playfield is evenly visible from top arch to flippers.

### Step 6: Acceptance Verification Suite
1. Playwright test at 1440x900 (height ≥ 85% of viewport, 0 scroll, Chogs ≥ 110px).
2. Playwright test at 390x844 (Chogs ≥ 70px, 0 horizontal scroll).
3. Image fidelity pixel sampler test (Rule A).
4. Flipper drawn vs physics polygon within 1 px test (Rule B).
5. Plunger full-charge 20/20 launch reach vs half-charge non-reach test.
6. 60-second zero-console-error headless test.
7. Existing fall time (1.2–1.8s), reachability, and collider overlap tests pass.
8. Capture close-up screenshots and scripted video in `/public/screenshots/`.
