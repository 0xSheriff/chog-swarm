/**
 * packages/physics/src/three-3d-renderer.ts
 *
 * Tilted 3D WebGL2 renderer for Chog Swarm: Haunted Pinball using Three.js.
 * Built directly from /docs/pinball/table-layout.json.
 * Target look: camera pitch ~55°, violet-black base, pink-violet moon glow,
 * teal fog, orange torch lights, slate tombstone bumpers, coffin slingshots,
 * floating arched ghost portraits with bobbing animation.
 *
 * Gate 2 Updates:
 * - Multiball 3D ball mesh pool (rendering multiple balls simultaneously)
 * - 3D illuminated C-H-O-G rollover lanes (glowing amber when lit)
 * - 3D rotating Crypt Portal vortex ring & light
 * - Ghost targets Reunion golden/emerald halo and banished visual state
 */

import * as THREE from 'three';
import { TableLayout } from './types';
import { PhysicsWorldInstance } from './physics-world';
import { GameVisualState, GHOST_CHOGS } from './flat-2d-renderer';

export class Three3DRenderer {
  private layout: TableLayout;
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ballMesh: THREE.Mesh;
  private extraBallMeshes: THREE.Mesh[] = [];
  private leftFlipperMesh: THREE.Group;
  private rightFlipperMesh: THREE.Group;
  private bumperMeshes: Map<string, { group: THREE.Group; mat: THREE.MeshStandardMaterial }> = new Map();
  private ghostMeshes: Map<string, { group: THREE.Group; light: THREE.PointLight; frame: THREE.Mesh; baseY: number }> = new Map();
  private rolloverMeshes: Map<string, { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial }> = new Map();
  private cryptVortexMesh: THREE.Mesh | null = null;
  private cryptLight: THREE.PointLight | null = null;
  private torchLights: THREE.PointLight[] = [];
  private timeSec = 0;
  private isLiteTier = false;

  // FPS tracking
  private frameCount = 0;
  private fpsTimer = 0;
  public currentFps = 60;

  constructor(container: HTMLElement, layout: TableLayout) {
    this.container = container;
    this.layout = layout;

    // ── 1. Scene & Clean Lighting (No obscuring fog) ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090712);

    // ── 2. Camera: Pitch <= 25° (Top-down tilted view, playfield fills view) ──
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 50);
    this.camera.position.set(0, 2.45, 0.42);
    this.camera.lookAt(0, 0, 0.05);

    // ── 3. WebGL2 Renderer ──
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // ── 4. Lights ──
    const ambient = new THREE.AmbientLight(0x2e1065, 0.8);
    this.scene.add(ambient);

    const moonRim = new THREE.DirectionalLight(0xe879f9, 1.4);
    moonRim.position.set(-2, 4, -2);
    this.scene.add(moonRim);

    const torchLeft = new THREE.PointLight(0xf97316, 2.2, 2.0);
    torchLeft.position.set(-0.35, 0.15, 0.7);
    this.scene.add(torchLeft);
    this.torchLights.push(torchLeft);

    const torchRight = new THREE.PointLight(0xf97316, 2.2, 2.0);
    torchRight.position.set(0.35, 0.15, 0.7);
    this.scene.add(torchRight);
    this.torchLights.push(torchRight);

    const centerGlow = new THREE.PointLight(0x8b5cf6, 1.5, 2.5);
    centerGlow.position.set(0, 0.25, -0.2);
    this.scene.add(centerGlow);
    this.torchLights.push(centerGlow);

    // ── 5. Playfield Geometry ──
    this.buildPlayfield();

    // ── 6. Primary Ball Mesh ──
    const ballGeo = new THREE.SphereGeometry(this.layout.ball.radius, 24, 24);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x9333ea,
      emissiveIntensity: 0.2,
    });
    this.ballMesh = new THREE.Mesh(ballGeo, ballMat);
    this.ballMesh.position.set(this.layout.ball.start.x - 0.5, this.layout.ball.radius, this.layout.ball.start.y - 1.0);
    this.scene.add(this.ballMesh);

    // ── 7. Flippers ──
    this.leftFlipperMesh = this.buildFlipper('left');
    this.rightFlipperMesh = this.buildFlipper('right');
    this.scene.add(this.leftFlipperMesh);
    this.scene.add(this.rightFlipperMesh);

    // ── 8. Bumpers, Slingshots, Ghosts, Rollovers, Crypt ──
    this.buildBumpers();
    this.buildSlingshots();
    this.buildGhosts();
    this.buildRollovers();
    this.buildCryptPortal();

    window.addEventListener('resize', this.onResize);
  }

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private to3D(tuX: number, tuY: number, height = 0): THREE.Vector3 {
    return new THREE.Vector3(tuX - 0.5, height, tuY - 1.0);
  }

  private buildPlayfield() {
    const feltGeo = new THREE.PlaneGeometry(1.0, 2.0);
    const feltMat = new THREE.MeshStandardMaterial({
      color: 0x120d20,
      roughness: 0.85,
      metalness: 0.05,
    });
    const felt = new THREE.Mesh(feltGeo, feltMat);
    felt.rotation.x = -Math.PI / 2;
    this.scene.add(felt);

    // Top Arch Wall
    const arch = this.layout.walls.topArch;
    const archShape = new THREE.Shape();
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments;
      const deg = arch.fromAngle + frac * (arch.toAngle - arch.fromAngle);
      const rad = (deg * Math.PI) / 180;
      const x = arch.center[0] + arch.radius * Math.cos(rad) - 0.5;
      const z = arch.center[1] + arch.radius * Math.sin(rad) - 1.0;
      if (i === 0) archShape.moveTo(x, z);
      else archShape.lineTo(x, z);
    }
    const archPoints = archShape.getPoints(segments);
    const archGeo = new THREE.BufferGeometry().setFromPoints(
      archPoints.map((p) => new THREE.Vector3(p.x, 0.04, p.y))
    );
    const archLine = new THREE.Line(
      archGeo,
      new THREE.LineBasicMaterial({ color: 0x9333ea, linewidth: 3 })
    );
    this.scene.add(archLine);

    // Outer Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3b1c6e, roughness: 0.5 });
    const addWallMesh = (from: [number, number], to: [number, number]) => {
      const p1 = this.to3D(from[0], from[1], 0.03);
      const p2 = this.to3D(to[0], to[1], 0.03);
      const dist = p1.distanceTo(p2);
      const boxGeo = new THREE.BoxGeometry(0.016, 0.06, dist);
      const box = new THREE.Mesh(boxGeo, wallMat);
      box.position.copy(p1).lerp(p2, 0.5);
      box.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p2.clone().sub(p1).normalize());
      this.scene.add(box);
    };

    addWallMesh(this.layout.walls.leftWall.from, this.layout.walls.leftWall.to);
    addWallMesh(this.layout.walls.outerRightWall.from, this.layout.walls.outerRightWall.to);
    addWallMesh(this.layout.walls.laneInnerWall.from, this.layout.walls.laneInnerWall.to);
    addWallMesh(this.layout.walls.leftApron.from, this.layout.walls.leftApron.to);
    addWallMesh(this.layout.walls.rightApron.from, this.layout.walls.rightApron.to);
  }

  private buildFlipper(side: 'left' | 'right'): THREE.Group {
    const spec = this.layout.flippers[side];
    const group = new THREE.Group();
    const pivot = this.to3D(spec.pivot[0], spec.pivot[1], 0.02);
    group.position.copy(pivot);

    const shape = new THREE.Shape();
    const len = spec.length;
    const rBase = spec.baseRadius;
    const rTip = spec.tipRadius;

    shape.absarc(0, 0, rBase, Math.PI / 2, -Math.PI / 2, false);
    shape.lineTo(len, -rTip);
    shape.absarc(len, 0, rTip, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(0, rBase);

    const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.002,
      bevelThickness: 0.002,
    });
    extrudeGeo.rotateX(Math.PI / 2);

    const flipperMat = new THREE.MeshStandardMaterial({
      color: 0x8b5cf6,
      emissive: 0x4c1d95,
      roughness: 0.3,
      metalness: 0.4,
    });
    const mesh = new THREE.Mesh(extrudeGeo, flipperMat);
    group.add(mesh);

    return group;
  }

  private buildBumpers() {
    this.layout.popBumpers.forEach((b) => {
      const group = new THREE.Group();
      const pos = this.to3D(b.x, b.y, 0.02);
      group.position.copy(pos);

      const geo = new THREE.CylinderGeometry(b.radius, b.radius * 1.05, 0.045, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.8,
        emissive: 0xf97316,
        emissiveIntensity: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.022;
      group.add(mesh);

      this.scene.add(group);
      this.bumperMeshes.set(b.id, { group, mat });
    });
  }

  private buildSlingshots() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6d28d9,
      emissive: 0x4c1d95,
      roughness: 0.4,
    });

    this.layout.slingshots.forEach((s) => {
      const shape = new THREE.Shape();
      const p0 = this.to3D(s.verts[0][0], s.verts[0][1]);
      shape.moveTo(p0.x, -p0.z);
      for (let i = 1; i < s.verts.length; i++) {
        const p = this.to3D(s.verts[i][0], s.verts[i][1]);
        shape.lineTo(p.x, -p.z);
      }
      shape.closePath();

      const extrudeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.04 });
      extrudeGeo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(extrudeGeo, mat);
      this.scene.add(mesh);
    });
  }

  private buildGhosts() {
    const textureLoader = new THREE.TextureLoader();

    this.layout.ghostTargets.forEach((gt) => {
      const group = new THREE.Group();
      const pos = this.to3D(gt.x, gt.y, 0.06);
      group.position.copy(pos);

      // Outer frame (rectangular border strictly outside the square)
      const frameGeo = new THREE.BoxGeometry(gt.radius * 2.08, 0.01, gt.radius * 2.08);
      const frameMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      group.add(frameMesh);

      // Hard Rule A: Portrait texture is 100% full square uncropped WebP
      const ghostData = GHOST_CHOGS[gt.id];
      if (ghostData) {
        textureLoader.load(ghostData.image, (tex) => {
          const planeGeo = new THREE.PlaneGeometry(gt.radius * 2, gt.radius * 2);
          const planeMat = new THREE.MeshBasicMaterial({ map: tex });
          const portrait = new THREE.Mesh(planeGeo, planeMat);
          portrait.rotation.x = -Math.PI / 2;
          group.add(portrait);
        });
      }

      // Floating point light
      const gLight = new THREE.PointLight(0x06b6d4, 1.2, 0.6);
      gLight.position.set(0, 0.05, 0);
      group.add(gLight);

      this.scene.add(group);
      this.ghostMeshes.set(gt.id, { group, light: gLight, frame: frameMesh, baseY: pos.y });
    });
  }

  private buildRollovers() {
    const rl = this.layout.rolloverLanes;
    const dividerMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.6 });

    // Dividers
    rl.dividerX.forEach((dx) => {
      const p1 = this.to3D(dx, rl.y0, 0.015);
      const p2 = this.to3D(dx, rl.y1, 0.015);
      const dist = p1.distanceTo(p2);
      const boxGeo = new THREE.BoxGeometry(0.008, 0.03, dist);
      const mesh = new THREE.Mesh(boxGeo, dividerMat);
      mesh.position.copy(p1).lerp(p2, 0.5);
      this.scene.add(mesh);
    });

    // 3D Neon Letter Markers for C, H, O, G
    rl.letters.forEach((letter, i) => {
      const lx = (rl.dividerX[i] + rl.dividerX[i + 1]) / 2;
      const ly = (rl.y0 + rl.y1) / 2;
      const pos = this.to3D(lx, ly, 0.008);

      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, 32, 32);

      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        emissive: 0x581c87,
        emissiveIntensity: 0.3,
        roughness: 0.5,
      });

      const planeGeo = new THREE.PlaneGeometry(0.05, 0.05);
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.copy(pos);

      this.scene.add(mesh);
      this.rolloverMeshes.set(letter, { mesh, mat });
    });
  }

  private buildCryptPortal() {
    const cp = this.layout.cryptPortal;
    const pos = this.to3D(cp.x, cp.y, 0.015);

    // Vortex Torus Ring
    const torusGeo = new THREE.TorusGeometry(cp.radius * 0.9, 0.008, 8, 24);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x34d399,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.rotation.x = -Math.PI / 2;
    torus.position.copy(pos);
    this.scene.add(torus);
    this.cryptVortexMesh = torus;

    // Green/Amber Portal Point Light
    const pLight = new THREE.PointLight(0x34d399, 1.5, 0.8);
    pLight.position.copy(pos).add(new THREE.Vector3(0, 0.05, 0));
    this.scene.add(pLight);
    this.cryptLight = pLight;
  }

  render(physics: PhysicsWorldInstance, state: GameVisualState) {
    this.timeSec += 1 / 60;
    const now = Date.now();

    // ── FPS Monitor ──
    this.frameCount++;
    if (this.timeSec - this.fpsTimer >= 1.0) {
      this.currentFps = this.frameCount / (this.timeSec - this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = this.timeSec;

      if (this.currentFps < 45 && !this.isLiteTier) {
        this.isLiteTier = true;
        this.torchLights.forEach((l) => (l.intensity = 0.8));
      }
    }

    // ── Update Primary Ball Position ──
    const allBalls = physics.getAllBallStates ? physics.getAllBallStates() : [physics.getBallState()];
    const pBall = allBalls[0];
    if (pBall) {
      this.ballMesh.position.set(pBall.x - 0.5, this.layout.ball.radius, pBall.y - 1.0);
    }

    // ── Update Multiball Extra Ball Meshes ──
    const extraCount = allBalls.length - 1;
    while (this.extraBallMeshes.length < extraCount) {
      const extraGeo = new THREE.SphereGeometry(this.layout.ball.radius, 16, 16);
      const extraMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.6,
      });
      const mesh = new THREE.Mesh(extraGeo, extraMat);
      this.scene.add(mesh);
      this.extraBallMeshes.push(mesh);
    }

    for (let i = 0; i < this.extraBallMeshes.length; i++) {
      const extraMesh = this.extraBallMeshes[i];
      if (i < extraCount) {
        const extraPos = allBalls[i + 1];
        extraMesh.visible = true;
        extraMesh.position.set(extraPos.x - 0.5, this.layout.ball.radius, extraPos.y - 1.0);
      } else {
        extraMesh.visible = false;
      }
    }

    // ── Update Flippers ──
    const angles = physics.getFlipperAnglesDeg();
    this.leftFlipperMesh.rotation.y = -(angles.left * Math.PI) / 180;
    this.rightFlipperMesh.rotation.y = -(angles.right * Math.PI) / 180;

    // ── Bumpers Hit Reaction ──
    this.bumperMeshes.forEach((bm, bid) => {
      const isHit = (state.bumperFlash.get(bid) ?? 0) > now;
      bm.mat.emissiveIntensity = isHit ? 2.5 : 0.1;
      bm.group.scale.setScalar(isHit ? 1.15 : 1.0);
    });

    // ── Rollover Lanes Illumination ──
    this.rolloverMeshes.forEach((rm, letter) => {
      const isLit = state.rolloversLit.has(letter);
      rm.mat.emissive.setHex(isLit ? 0xffaa00 : 0x581c87);
      rm.mat.emissiveIntensity = isLit ? 2.5 : 0.2;
    });

    // ── Crypt Portal Vortex Rotation ──
    if (this.cryptVortexMesh) {
      this.cryptVortexMesh.rotation.z += state.cryptHeld ? 0.12 : 0.03;
      if (this.cryptLight) {
        this.cryptLight.color.setHex(state.cryptHeld ? 0xfacc15 : 0x34d399);
        this.cryptLight.intensity = state.cryptHeld ? 3.0 : 1.5;
      }
    }

    // ── Ghost Targets Sinusoidal Bobbing & Reunion States ──
    this.ghostMeshes.forEach((gm, gid) => {
      const bob = 0.012 * Math.sin(this.timeSec * 3 + gm.group.position.x * 5);
      gm.group.position.y = gm.baseY + bob;

      const isReunion = state.reunionActive && state.reunionGhostId === gid;
      const isBanished = state.banishedGhosts.has(gid);

      if (isReunion) {
        gm.light.color.setHex(0x10b981);
        gm.light.intensity = 2.5;
        (gm.frame.material as THREE.MeshBasicMaterial).color.setHex(0x10b981);
      } else if (isBanished) {
        gm.light.color.setHex(0xa855f7);
        gm.light.intensity = 1.2;
        (gm.frame.material as THREE.MeshBasicMaterial).color.setHex(0xa855f7);
      } else {
        gm.light.color.setHex(0x06b6d4);
        gm.light.intensity = 1.2;
        (gm.frame.material as THREE.MeshBasicMaterial).color.setHex(0x06b6d4);
      }
    });

    // Torch flicker
    this.torchLights[0].intensity = 2.0 + 0.3 * Math.sin(this.timeSec * 12);
    this.torchLights[1].intensity = 2.0 + 0.3 * Math.cos(this.timeSec * 14);

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    this.extraBallMeshes.forEach((m) => this.scene.remove(m));
    this.renderer.dispose();
  }
}
