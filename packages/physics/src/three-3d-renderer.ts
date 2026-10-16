/**
 * packages/physics/src/three-3d-renderer.ts
 *
 * Tilted 3D WebGL2 renderer for Chog Swarm: Haunted Pinball using Three.js.
 * Built directly from /docs/pinball/table-layout.json.
 * Target look: camera pitch ~55°, violet-black base, pink-violet moon glow,
 * teal fog, orange torch lights, slate tombstone bumpers, coffin slingshots,
 * floating arched ghost portraits with bobbing animation.
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
  private leftFlipperMesh: THREE.Group;
  private rightFlipperMesh: THREE.Group;
  private bumperMeshes: Map<string, { group: THREE.Group; mat: THREE.MeshStandardMaterial }> = new Map();
  private ghostMeshes: Map<string, { group: THREE.Group; light: THREE.PointLight; baseY: number }> = new Map();
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

    // ── 1. Scene & Fog ──
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08060f);
    this.scene.fog = new THREE.FogExp2(0x0d091a, 0.45); // Teal/purple ambient fog

    // ── 2. Camera: Pitch ~55° ──
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 50);
    // Table is centered at [0, 0, 0]. Z is length (-1.0 to +1.0), X is width (-0.5 to +0.5), Y is height.
    this.camera.position.set(0, 1.85, 1.30);
    this.camera.lookAt(0, 0, 0.05);

    // ── 3. WebGL2 Renderer ──
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // ── 4. Lights ──
    // Ambient deep violet
    const ambient = new THREE.AmbientLight(0x2e1065, 0.8);
    this.scene.add(ambient);

    // Moonlit pink-violet rim directional light
    const moonRim = new THREE.DirectionalLight(0xe879f9, 1.4);
    moonRim.position.set(-2, 4, -2);
    this.scene.add(moonRim);

    // Orange torch point lights
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

    // ── 6. Ball Mesh ──
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

    // ── 8. Bumpers & Slingshots & Ghosts ──
    this.buildBumpers();
    this.buildSlingshots();
    this.buildGhosts();

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
    // Felt surface
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

    // Outer Walls (Left, Right, Inner)
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

    // Low-poly tapered rounded flipper mesh
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
    extrudeGeo.rotateX(Math.PI / 2); // Lay flat on XZ plane

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

      // Slate tombstone shape (cylinder base + beveled cap)
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

      // Top glowing rune
      const capGeo = new THREE.CylinderGeometry(b.radius * 0.7, b.radius * 0.7, 0.005, 16);
      const capMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.046;
      group.add(cap);

      this.scene.add(group);
      this.bumperMeshes.set(b.id, { group, mat });
    });
  }

  private buildSlingshots() {
    this.layout.slingshots.forEach((s) => {
      const shape = new THREE.Shape();
      const verts = s.verts.map((v) => this.to3D(v[0], v[1]));
      shape.moveTo(verts[0].x, verts[0].z);
      for (let i = 1; i < verts.length; i++) shape.lineTo(verts[i].x, verts[i].z);
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false });
      geo.rotateX(Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x4c1d95,
        emissive: 0x2e1065,
        roughness: 0.5,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.015;
      this.scene.add(mesh);
    });
  }

  private buildGhosts() {
    const textureLoader = new THREE.TextureLoader();
    this.layout.ghostTargets.forEach((gt) => {
      const group = new THREE.Group();
      const pos = this.to3D(gt.x, gt.y, 0.07);
      group.position.copy(pos);

      // Glowing arched torus frame
      const frameGeo = new THREE.TorusGeometry(gt.radius, 0.006, 8, 24);
      const frameMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.rotation.x = -0.5; // Tilts toward camera
      group.add(frameMesh);

      // Portrait texture
      const ghostData = GHOST_CHOGS[gt.id];
      if (ghostData) {
        textureLoader.load(ghostData.image, (tex) => {
          const planeGeo = new THREE.CircleGeometry(gt.radius * 0.9, 24);
          const planeMat = new THREE.MeshBasicMaterial({ map: tex });
          const portrait = new THREE.Mesh(planeGeo, planeMat);
          portrait.rotation.x = -0.5;
          group.add(portrait);
        });
      }

      // Floating cyan point light
      const gLight = new THREE.PointLight(0x06b6d4, 1.2, 0.6);
      gLight.position.set(0, 0.05, 0);
      group.add(gLight);

      this.scene.add(group);
      this.ghostMeshes.set(gt.id, { group, light: gLight, baseY: pos.y });
    });
  }

  render(physics: PhysicsWorldInstance, state: GameVisualState) {
    this.timeSec += 1 / 60;
    const now = Date.now();

    // ── FPS Monitor & Tier Drop ──
    this.frameCount++;
    if (this.timeSec - this.fpsTimer >= 1.0) {
      this.currentFps = this.frameCount / (this.timeSec - this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = this.timeSec;

      // Drop to lite tier if FPS < 45
      if (this.currentFps < 45 && !this.isLiteTier) {
        this.isLiteTier = true;
        this.torchLights.forEach((l) => (l.intensity = 0.8));
      }
    }

    // ── Update Ball Position ──
    const bPos = physics.getBallState();
    this.ballMesh.position.set(
      bPos.x - 0.5,
      this.layout.ball.radius,
      bPos.y - 1.0
    );

    // ── Update Flippers ──
    const angles = physics.getFlipperAnglesDeg();
    // In Three.js, rotation around Y axis matches angle in radians
    this.leftFlipperMesh.rotation.y = -(angles.left * Math.PI) / 180;
    this.rightFlipperMesh.rotation.y = -(angles.right * Math.PI) / 180;

    // ── Bumpers Hit Reaction ──
    this.bumperMeshes.forEach((bm, bid) => {
      const isHit = (state.bumperFlash.get(bid) ?? 0) > now;
      bm.mat.emissiveIntensity = isHit ? 2.5 : 0.1;
      bm.group.scale.setScalar(isHit ? 1.15 : 1.0);
    });

    // ── Ghost Targets Sinusoidal Bobbing ──
    this.ghostMeshes.forEach((gm, gid) => {
      const bob = 0.012 * Math.sin(this.timeSec * 3 + gm.group.position.x * 5);
      gm.group.position.y = gm.baseY + bob;

      const hits = state.ghostDamage.get(gid) ?? 0;
      if (hits >= 3) {
        gm.light.color.setHex(0x10b981);
      }
    });

    // Torch flicker
    this.torchLights[0].intensity = 2.0 + 0.3 * Math.sin(this.timeSec * 12);
    this.torchLights[1].intensity = 2.0 + 0.3 * Math.cos(this.timeSec * 14);

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}
