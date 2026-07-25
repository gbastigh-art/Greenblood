// Main 3D engine: scene, renderer, camera, player controller, world content,
// AI bots/animals, building, mining, combat, day/night, weather, cave.
import * as THREE from "three";
import { Terrain } from "./terrain";
import { SkySystem, type WeatherKind } from "./sky";
import {
  makeTree, makeStump, makeBush, makeRock, makeAbandonedHouse,
  makeBuild, makeHeldItem, makeHumanoid, dressHumanoid, attachWeapon,
  animateHumanoid, makeAnimal, makeCorpse, makeDirewolfAlpha,
  makeCompanion, makeCookingPot, makeRadiationZone,
  type TreeInstance, type BushInstance, type RockInstance, type LootContainer,
  type Humanoid, type AnimalInstance, type TraderInstance, type BossInstance,
  type CompanionInstance,
} from "./factory";
import type { CaveSystem } from "./cave";
import { mulberry32, randRange, pick, fbm2D } from "./noise";
import { ITEMS, LOOT_TABLES } from "../items";
import { BUILDS, GRID, WALL_H, findSnapTarget, type BuildKind, type PlacedBuild } from "../buildables";
import {
  BUILD_PIECE_DEFS, TIER_VISUALS, TIER_HP, UPGRADE_COSTS,
  generateBuildGeometry, findSnapPosition, getHologramColor, checkPlacementValidity,
  calculateFoundationLegExtension, calculateFoundationPlacement,
  generateDeployableGeometry, findDoorwaySockets,
  DEPLOYABLE_DEFS, getWorldCollisionBox, shouldBlockPlayer, checkDeployableOverlap,
  type BuildPieceType, type TierType, type PlacedBuildV2,
  type DeployableType, type PlacedDeployable,
} from "../building/index";
import { useGame, type GameMode } from "../store";
import { audioEngine } from "./audio";

interface Bot {
  humanoid: Humanoid;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  state: "gather" | "build" | "wander" | "fight" | "flee";
  target: THREE.Vector3 | null;
  targetEntity: any | null;
  nextDecision: number;
  hp: number;
  attackCooldown: number;
  clothing: { head: string | null; chest: string | null; legs: string | null; feet: string | null };
  weapon: string;
  carrying: { id: string; qty: number }[];
}

interface LootObj {
  container: LootContainer;
  loot: ({ id: string; qty: number } | null)[];
  id: number;
}

interface DroppedItem {
  mesh: THREE.Object3D;
  id: string;
  qty: number;
  vel: THREE.Vector3;
  spawnTime: number;
}

let lootIdCounter = 1;
let buildIdCounter = 1;

// Reusable scratch vectors — avoids allocating new THREE.Vector2/3 every frame
// (small GC churn adds up at 60fps). Names end with their constant value.
const REUSABLE_VEC2_00 = new THREE.Vector2(0, 0);

// ===== Lightweight particle system for VFX (dust, hit sparks, water splash) =====
interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: boolean;
  shrink: boolean;
  fadeOut: boolean;
}

class ParticleSystem {
  particles: Particle[] = [];
  scene: THREE.Scene;
  // Pre-allocated materials for common particle types
  dustMat: THREE.MeshBasicMaterial;
  sparkMat: THREE.MeshBasicMaterial;
  waterMat: THREE.MeshBasicMaterial;
  woodMat: THREE.MeshBasicMaterial;
  stoneMat: THREE.MeshBasicMaterial;
  bloodMat: THREE.MeshBasicMaterial;
  healMat: THREE.MeshBasicMaterial;
  geo: THREE.SphereGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geo = new THREE.SphereGeometry(0.08, 4, 4);
    this.dustMat = new THREE.MeshBasicMaterial({ color: 0xc4a86a, transparent: true, depthWrite: false });
    this.sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, depthWrite: false });
    this.waterMat = new THREE.MeshBasicMaterial({ color: 0x88bbee, transparent: true, depthWrite: false });
    this.woodMat = new THREE.MeshBasicMaterial({ color: 0x8B6914, transparent: true, depthWrite: false });
    this.stoneMat = new THREE.MeshBasicMaterial({ color: 0x999999, transparent: true, depthWrite: false });
    this.bloodMat = new THREE.MeshBasicMaterial({ color: 0xcc2222, transparent: true, depthWrite: false });
    this.healMat = new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, depthWrite: false });
  }

  spawn(pos: THREE.Vector3, count: number, type: "dust" | "spark" | "water" | "wood" | "stone" | "blood" | "heal", opts?: { spread?: number; speed?: number; life?: number; gravity?: boolean; size?: number }) {
    const matMap = { dust: this.dustMat, spark: this.sparkMat, water: this.waterMat, wood: this.woodMat, stone: this.stoneMat, blood: this.bloodMat, heal: this.healMat };
    const mat = matMap[type];
    const spread = opts?.spread ?? 0.5;
    const speed = opts?.speed ?? 2;
    const life = opts?.life ?? 0.6;
    const size = opts?.size ?? 1;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.geo, mat);
      m.position.copy(pos);
      m.position.x += (Math.random() - 0.5) * spread;
      m.position.y += Math.random() * spread * 0.3;
      m.position.z += (Math.random() - 0.5) * spread;
      m.scale.setScalar(0.6 + Math.random() * 0.6 * size);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          Math.random() * speed * 0.8 + (type === "water" ? speed * 0.5 : 0),
          (Math.random() - 0.5) * speed
        ),
        life,
        maxLife: life,
        gravity: opts?.gravity ?? (type !== "spark"),
        shrink: true,
        fadeOut: true,
      });
    }
    // Cap particles to prevent perf issues
    if (this.particles.length > 300) {
      const excess = this.particles.splice(0, this.particles.length - 300);
      for (const p of excess) {
        this.scene.remove(p.mesh);
        p.mesh.geometry?.dispose();
      }
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      if (p.gravity) p.vel.y -= 9.8 * dt;
      p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
      const t = p.life / p.maxLife;
      if (p.shrink) p.mesh.scale.setScalar(t);
      if (p.fadeOut && p.mesh.material instanceof THREE.MeshBasicMaterial) {
        p.mesh.material.opacity = t;
      }
    }
  }

  dispose() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
    }
    this.particles = [];
  }
}

export class Engine {
  container: HTMLElement;
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  timer = new THREE.Timer();
  terrain!: Terrain;
  sky!: SkySystem;

  // Player
  playerPos = new THREE.Vector3(0, 0, 0);
  playerVel = new THREE.Vector3();
  playerYaw = 0;
  playerPitch = 0;
  playerOnGround = true;
  playerEyeHeight = 1.7;
  playerCrouch = false;
  // Head bob / sway
  bobPhase = 0;
  bobX = 0;
  bobY = 0;
  swayTarget = new THREE.Vector2();
  swayCurrent = new THREE.Vector2();
  // Held item view model
  heldGroup: THREE.Group = new THREE.Group();
  heldItemMesh: THREE.Object3D | null = null;
  heldAttackTime = 0;
  heldRecoil = 0;
  // Hand camera for view bob
  handCamera!: THREE.PerspectiveCamera;
  handScene!: THREE.Scene;

  // Input
  keys: Record<string, boolean> = {};
  mouseLocked = false;
  mouseDown = false;
  rightMouseDown = false;

  // World content
  trees: TreeInstance[] = [];
  bushes: BushInstance[] = [];
  rocks: RockInstance[] = [];
  lootObjs: LootObj[] = [];
  bots: Bot[] = [];
  animals: AnimalInstance[] = [];
  droppedItems: DroppedItem[] = [];
  cave: CaveSystem | null = null;
  caveEntrances: THREE.Vector3[] = [];
  // Phase 2: water bodies + bird nests
  lakes: { x: number; z: number; r: number }[] = [];
  // Lake specs picked in init() before terrain.build() — used by populateWorld
  // to place the water meshes at the correct height (matches the carved terrain).
  pendingLakes: { x: number; z: number; r: number; waterLevel: number }[] = [];
  birdNests: { mesh: THREE.Mesh; looted: boolean; x: number; y: number; z: number }[] = [];
  // Debug blocks (Test Range) — interact to open the Debug Menu
  debugBlocks: THREE.Mesh[] = [];
  // Fishing state
  fishingTimer = 0;
  isFishing = false;

  // Collision: axis-aligned wall segments from abandoned houses (4 per house)
  houseWalls: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [];
  // Player collision radius (XZ circle)
  playerRadius = 0.4;

  // Phase 4: trader NPC + beekeeping tick throttle + achievement helpers
  trader: TraderInstance | null = null;
  traderMet = false; // first-contact flag for trader_meet achievement
  hiveTickTimer = 0; // throttle tickHives to ~1Hz
  // Track previously unlocked "first" achievements so we don't spam store checks every kill
  firstTreeAchieved = false;
  firstMineAchieved = false;
  firstBloodAchieved = false;
  firstFishAchieved = false;
  firstCropAchieved = false;

  // Phase 5: Boss creature (Direwolf Alpha) — spawns at night, despawns at dawn
  boss: BossInstance | null = null;
  bossSpawnTimer = 0; // accumulated night time
  bossDespawnTimer = 0; // countdown to despawn at dawn
  // Photo mode removed (Task 10) — fields kept as no-ops for backwards compat
  // Phase 5: Quest board interaction throttle
  questBoardTickTimer = 0;
  // Phase 5: Raft riding — store reference to raft mesh
  ridingRaftMesh: THREE.Object3D | null = null;
  // Phase 6: Companion NPC
  companion: CompanionInstance | null = null;
  companionTransferred = false; // one-shot for ally achievement
  // Phase 6: Electric light update throttle
  electricLightTimer = 0;
  // Phase 7: Radiation zones
  radiationZones: { x: number; z: number; radius: number }[] = [];
  geigerCounterToastCooldown = 0;

  // Build ghost (legacy)
  ghostMesh: THREE.Object3D | null = null;
  ghostValid = true;
  // V2 Build ghost (Rust-style)
  ghostV2Mesh: THREE.Mesh | null = null;
  ghostV2Valid = true;

  // Particle system for VFX
  particles!: ParticleSystem;

  // Lighting for builds
  buildLights: THREE.PointLight[] = [];

  // Bound listeners
  private boundResize = () => this.onResize();
  private boundKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
  private boundKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);
  private boundMouseDown = (e: MouseEvent) => this.onMouseDown(e);
  private boundMouseUp = (e: MouseEvent) => this.onMouseUp(e);
  private boundMouseMove = (e: MouseEvent) => this.onMouseMove(e);
  private boundWheel = (e: WheelEvent) => this.onWheel(e);
  private boundPointerLockChange = () => this.onPointerLockChange();
  private boundContextMenu = (e: Event) => e.preventDefault();

  // Internal frame counter
  frame = 0;
  fpsAccum = 0;
  fpsTimer = 0;
  fps = 60;
  rafId = 0;
  // Weather scheduler
  weatherTimer = 0;
  weatherDuration = 90;
  // Auto-save marker
  nextBotDecision = 0;
  // currently hovered interactive (for prompt)
  hoveredPrompt: string | null = null;
  // Minimap update throttle
  minimapTimer = 0;
  // Audio footstep throttle
  footstepTimer = 0;
  // Audio ambient update throttle
  audioAmbientTimer = 0;
  // Last audio cue time (dedupe)
  lastAudioCueT = 0;
  // Phase 10: Threat scan throttle
  threatScanTimer = 0;
  // Phase 10: Last day/night phase for transition detection
  lastDayPhase: string = "day";
  // Phase 11: Distance walked accumulator (throttled store writes)
  distanceWalkedAccum = 0;
  // Phase 11: Low-health heartbeat accumulator (handled in store, audio fired from engine)
  heartbeatTimer = 0;
  // Phase 11: Cave entrances discovered (for "explorer" achievement)
  discoveredCaves: number[] = [];

  // Subscriptions
  unsub: (() => void)[] = [];

  // Performance: render distance + quality cache (kept in sync with store via
  // subscription). Updated by the store listener in init().
  renderDistance = 180;
  graphicsQuality: "low" | "medium" | "high" = "medium";
  // Visibility-cull throttle — we don't want to re-check 500+ objects every frame.
  visibilityTimer = 0;
  // Test Range flag — when true, the engine skips procedural world population
  // and builds a flat gray grid with one of every interactable object instead.
  isTestRange = false;
  // Cached list of fire lights + flame meshes so we don't traverse every placed
  // build every frame to find them. Rebuilt when builds change.
  fireLights: THREE.PointLight[] = [];
  flameMeshes: THREE.Mesh[] = [];
  fireCacheDirty = true;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  init() {
    // Renderer — quality-driven. AA + pixel ratio scale down on weak GPUs.
    const quality = useGame.getState().graphicsQuality;
    const antialias = quality !== "low";
    this.renderer = new THREE.WebGLRenderer({ antialias, powerPreference: "high-performance" });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    // Pixel ratio: high=1.5, medium=1.0, low=0.75. Capping DPR is one of the
    // single biggest perf levers on retina/4K displays.
    const dprCap = quality === "high" ? 1.5 : quality === "medium" ? 1.0 : 0.75;
    this.renderer.setPixelRatio(dprCap);
    this.renderer.shadowMap.enabled = quality !== "low";
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xc9d8e8, 0.0028);

    this.camera = new THREE.PerspectiveCamera(useGame.getState().fov || 75, this.container.clientWidth / this.container.clientHeight, 0.1, 800);
    this.camera.position.set(0, this.playerEyeHeight, 0);

    // Hand scene (rendered on top for held item)
    this.handScene = new THREE.Scene();
    this.handCamera = new THREE.PerspectiveCamera(55, this.container.clientWidth / this.container.clientHeight, 0.01, 10);
    this.handCamera.position.set(0, 0, 0);
    this.handScene.add(this.heldGroup);
    // Add a small light to the hand scene
    const handLight = new THREE.DirectionalLight(0xffffff, 1.2);
    handLight.position.set(0.5, 1, 1);
    this.handScene.add(handLight);
    this.handScene.add(new THREE.AmbientLight(0xffffff, 0.6));

    // Terrain — branch on serverId. The Test Range uses a flat gray grid floor;
    // normal servers build the procedural heightfield terrain.
    const serverId = useGame.getState().serverId;
    const seed = useGame.getState().worldSeed;
    this.isTestRange = serverId === "test";
    if (this.isTestRange) {
      this.terrain = new Terrain({ size: 200, segments: 50, seed, amplitude: 0 });
      const terrainMesh = this.terrain.build();
      // Recolor the test-range floor to a flat gray — overrides any per-vertex
      // color the terrain builder wrote. We keep the same mesh so getHeight()
      // still works (returns ~0 everywhere) for object placement.
      const grayMat = new THREE.MeshStandardMaterial({
        color: 0x9a9a9a,
        roughness: 0.95,
        metalness: 0.0,
        flatShading: true,
      });
      terrainMesh.material = grayMat;
      // Add a subtle grid overlay so it reads as a "test grid" floor.
      const grid = new THREE.GridHelper(200, 50, 0x444444, 0x666666);
      (grid.material as THREE.Material).opacity = 0.6;
      (grid.material as THREE.Material).transparent = true;
      grid.position.y = 0.02;
      this.scene.add(grid);
      this.scene.add(terrainMesh);
    } else {
      this.terrain = new Terrain({ size: 600, segments: 200, seed, amplitude: 14 });
      // Pick lake positions and register them with the terrain BEFORE build()
      // so the heightfield carves depressions for the water to sit in. Uses a
      // dedicated rng stream (seed + 98765) so it doesn't perturb the main
      // populateWorld rng sequence.
      const lakeRng = mulberry32(seed + 98765);
      const lakeCount = 4;
      this.pendingLakes = [];
      for (let i = 0; i < lakeCount; i++) {
        const ang = (i / lakeCount) * Math.PI * 2 + lakeRng() * 0.5;
        const dist = randRange(lakeRng, 40, 200);
        const x = Math.cos(ang) * dist;
        const z = Math.sin(ang) * dist;
        const r = randRange(lakeRng, 12, 22);
        // Sample the natural terrain height at this position BEFORE registering
        // the lake — this becomes the water surface level so the lake sits at
        // the surface of the surrounding terrain instead of being buried at
        // Y=0.3 (Task 13). addLake() carves a shallow depression below this.
        const waterLevel = this.terrain.getHeight(x, z);
        this.terrain.addLake(x, z, r, waterLevel);
        this.pendingLakes.push({ x, z, r, waterLevel });
      }
      const terrainMesh = this.terrain.build();
      this.scene.add(terrainMesh);
    }

    // Sky + weather
    this.sky = new SkySystem(this.scene, this.renderer);
    this.sky.setWeather("sunny");
    this.sky.setQuality(quality);

    // Particle system for VFX
    this.particles = new ParticleSystem(this.scene);

    // Spawn player on terrain
    this.playerPos.set(0, this.terrain.getHeight(0, 0), 0);

    // Sync performance caches from store up-front
    this.renderDistance = useGame.getState().renderDistance;
    this.graphicsQuality = useGame.getState().graphicsQuality;

    // Generate world content — Test Range gets a flat test layout with one of
    // every interactable object; normal servers get the full procedural world.
    if (this.isTestRange) {
      this.populateTestRange();
    } else {
      this.populateWorld(seed);
    }

    // Phase 3: Restore placed builds from save (if any)
    this.restorePlacedBuilds();

    // Events
    window.addEventListener("resize", this.boundResize);
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("mousedown", this.boundMouseDown);
    window.addEventListener("mouseup", this.boundMouseUp);
    window.addEventListener("mousemove", this.boundMouseMove);
    window.addEventListener("wheel", this.boundWheel, { passive: false });
    document.addEventListener("pointerlockchange", this.boundPointerLockChange);
    this.renderer.domElement.addEventListener("contextmenu", this.boundContextMenu);

    // Subscribe to store changes
    this.unsub.push(
      useGame.subscribe((s, prev) => {
        if (s.buildKind !== prev.buildKind) this.updateGhost();
        if (s.buildRotation !== prev.buildRotation) this.updateGhost();
        if (s.equipHotbarIndex !== prev.equipHotbarIndex) this.updateHeldItem();
        if (s.hotbar !== prev.hotbar) this.updateHeldItem();
        if (s.clothing !== prev.clothing) {
          // no player body in FPS view — only used in inventory preview
          // Phase 4: Geared-up achievement — all 4 clothing slots equipped
          const cl = s.clothing;
          if (cl.head && cl.chest && cl.legs && cl.feet) {
            s.unlockAchievement("geared_up");
          }
        }
        // Audio cue subscription
        if (s.audioCue.t !== prev.audioCue.t && s.audioCue.t !== this.lastAudioCueT) {
          this.lastAudioCueT = s.audioCue.t;
          audioEngine.handleCue(s.audioCue.event);
        }
        // Phase 7: FOV change from settings
        if (s.fov !== prev.fov) {
          this.camera.fov = s.fov;
          this.camera.updateProjectionMatrix();
        }
        // Phase 7: Music volume change from settings
        if (s.musicVolume !== prev.musicVolume && audioEngine.master) {
          audioEngine.master.gain.value = s.musicVolume / 100;
        }
        // Performance: render distance — just cache; visibility loop reads it.
        if (s.renderDistance !== prev.renderDistance) {
          this.renderDistance = s.renderDistance;
          // Force an immediate visibility refresh so the change is visible
          // without waiting for the next throttle window.
          this.updateVisibility();
        }
        // Performance: graphics quality — apply shadow map / AA changes live.
        // Note: antialias can't be toggled without recreating the renderer, so
        // that only applies to fresh sessions; shadow quality updates immediately.
        if (s.graphicsQuality !== prev.graphicsQuality) {
          this.graphicsQuality = s.graphicsQuality;
          this.sky.setQuality(s.graphicsQuality);
          this.renderer.shadowMap.enabled = s.graphicsQuality !== "low";
          // Update pixel ratio cap (live-safe in three.js)
          const dprCap = s.graphicsQuality === "high" ? 1.5 : s.graphicsQuality === "medium" ? 1.0 : 0.75;
          this.renderer.setPixelRatio(dprCap);
        }
        // Placed builds changed — invalidate the fire-light cache so it gets
        // rebuilt on the next updateWorld tick.
        if (s.placed !== prev.placed) {
          this.fireCacheDirty = true;
        }
        // Mode change — drive pointer-lock transitions automatically so the
        // player never has to click or press Esc twice to interact with menus.
        //   • play / build / photo mode → pointer locked (camera look needed)
        //   • inventory / crafting / trader / quest / leaderboard → pointer
        //     unlocked (mouse needed to click UI)
        if (s.mode !== prev.mode) {
          this.onModeChange(s.mode);
        }
        // Pause menu open → exit pointer lock so the mouse is usable.
        if (s.paused !== prev.paused) {
          if (s.paused && document.pointerLockElement) {
            document.exitPointerLock();
          } else if (!s.paused && s.mode === "play") {
            // Resuming from pause → re-lock. The click on RESUME is a user
            // gesture so the browser allows it immediately. Also schedule a
            // delayed retry: if the user pressed Esc to resume (not a click),
            // the browser enforces a ~1s cooldown after the Esc-initiated
            // pointer-lock exit, during which requestPointerLock() silently
            // fails. The retry catches that case so the pointer re-locks
            // automatically once the cooldown elapses.
            this.requestPointerLock();
            setTimeout(() => {
              const g2 = useGame.getState();
              if (!g2.paused && g2.mode === "play" && !document.pointerLockElement) {
                this.requestPointerLock();
              }
            }, 1100);
          }
        }
      })
    );

    // Initialize audio engine (will be resumed on first user gesture)
    audioEngine.init();
    // One-time resume on first click
    const resumeAudio = () => {
      audioEngine.resume();
      window.removeEventListener("click", resumeAudio);
      window.removeEventListener("keydown", resumeAudio);
    };
    window.addEventListener("click", resumeAudio);
    window.addEventListener("keydown", resumeAudio);

    // Initial held item
    this.updateHeldItem();

    this.timer.connect(window);
    // Start loop
    this.loop();

    // Mark menu ready
    useGame.getState().setMode("play");
  }

  populateWorld(seed: number) {
    const rng = mulberry32(seed);
    const SIZE = 280; // half-extent of populated area
    // Trees
    const treeCount = 360;
    for (let i = 0; i < treeCount; i++) {
      const x = randRange(rng, -SIZE, SIZE);
      const z = randRange(rng, -SIZE, SIZE);
      // skip near spawn
      if (Math.sqrt(x * x + z * z) < 6) continue;
      const y = this.terrain.getHeight(x, z);
      const slope = this.terrain.slopeAt(x, z);
      // Phase 11: relax y threshold (was y < -0.5, now y < -3) so trees can spawn on
      // lower-lying terrain near lakes/rivers without being underwater.
      if (slope > 0.5 || y < -3) continue;
      const t = makeTree(rng, x, z, y);
      this.scene.add(t.group);
      this.trees.push(t);
    }
    // Berry bushes
    for (let i = 0; i < 80; i++) {
      const x = randRange(rng, -SIZE, SIZE);
      const z = randRange(rng, -SIZE, SIZE);
      if (Math.sqrt(x * x + z * z) < 4) continue;
      const y = this.terrain.getHeight(x, z);
      if (this.terrain.slopeAt(x, z) > 0.5) continue;
      const b = makeBush(rng, x, z, y);
      this.scene.add(b.group);
      this.bushes.push(b);
    }
    // Rocks / ore
    for (let i = 0; i < 70; i++) {
      const x = randRange(rng, -SIZE, SIZE);
      const z = randRange(rng, -SIZE, SIZE);
      const y = this.terrain.getHeight(x, z);
      const kind = pick(rng, ["stone", "stone", "stone", "stone", "coal", "iron"]) as "stone" | "coal" | "iron";
      const r = makeRock(rng, x, z, y, kind);
      this.scene.add(r.group);
      this.rocks.push(r);
    }
    // Abandoned houses
    for (let i = 0; i < 14; i++) {
      const ang = rng() * Math.PI * 2;
      const dist = randRange(rng, 30, SIZE - 10);
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      const y = this.terrain.getHeight(x, z);
      const h = makeAbandonedHouse(rng, x, z, y);
      this.scene.add(h.group);
      for (const c of h.containers) {
        const lootTableKind = c.kind;
        const loot = this.rollLoot(lootTableKind, rng);
        this.lootObjs.push({ container: c, loot, id: lootIdCounter++ });
      }
      this.recordHouseWalls(h.group, x, z);
    }
    // Cave entrances + CaveSystem removed (Task 6). The caveEntrances array
    // stays empty so the Minimap/store reference doesn't crash.

    // Animals
    const animalCounts: Record<string, number> = { deer: 12, boar: 8, bear: 2 };
    for (const kindStr of Object.keys(animalCounts)) {
      const kind = kindStr as "deer" | "boar" | "bear";
      for (let i = 0; i < animalCounts[kind]; i++) {
        const ang = rng() * Math.PI * 2;
        const dist = randRange(rng, 20, SIZE - 10);
        const x = Math.cos(ang) * dist;
        const z = Math.sin(ang) * dist;
        const y = this.terrain.getHeight(x, z);
        const a = makeAnimal(kind);
        a.root.position.set(x, y, z);
        this.scene.add(a.root);
        this.animals.push(a);
      }
    }

    // ---- Phase 3: Rabbits — ~25 scattered across flat areas away from spawn ----
    let rabbitSpawned = 0;
    let rabbitTries = 0;
    while (rabbitSpawned < 25 && rabbitTries < 200) {
      rabbitTries++;
      const x = randRange(rng, -SIZE, SIZE);
      const z = randRange(rng, -SIZE, SIZE);
      // Prefer flat areas away from spawn (at least 15m from spawn)
      const distFromSpawn = Math.sqrt(x * x + z * z);
      if (distFromSpawn < 15) continue;
      const y = this.terrain.getHeight(x, z);
      const slope = this.terrain.slopeAt(x, z);
      if (slope > 0.25) continue; // prefer flat
      const a = makeAnimal("rabbit");
      a.root.position.set(x, y, z);
      a.root.rotation.y = rng() * Math.PI * 2;
      this.scene.add(a.root);
      this.animals.push(a);
      rabbitSpawned++;
    }

    // ---- Phase 3: Wolf packs — 3-5 packs, each 3-5 wolves, in distant areas (>80m from spawn) ----
    const wolfPackCount = 3 + Math.floor(rng() * 3); // 3..5 packs
    for (let p = 0; p < wolfPackCount; p++) {
      // pick a pack anchor far from spawn
      let ax = 0, az = 0;
      for (let tries = 0; tries < 30; tries++) {
        const ang = rng() * Math.PI * 2;
        const dist = randRange(rng, 90, SIZE - 15);
        ax = Math.cos(ang) * dist;
        az = Math.sin(ang) * dist;
        const slope = this.terrain.slopeAt(ax, az);
        if (slope < 0.4) break;
      }
      const packSize = 3 + Math.floor(rng() * 3); // 3..5 wolves
      const packId = p + 1;
      for (let w = 0; w < packSize; w++) {
        // cluster around pack anchor (within 12m)
        const offAng = rng() * Math.PI * 2;
        const offDist = rng() * 12;
        const x = ax + Math.cos(offAng) * offDist;
        const z = az + Math.sin(offAng) * offDist;
        const y = this.terrain.getHeight(x, z);
        const a = makeAnimal("wolf");
        a.root.position.set(x, y, z);
        a.root.rotation.y = rng() * Math.PI * 2;
        a.packId = packId;
        this.scene.add(a.root);
        this.animals.push(a);
      }
    }

    // Bots — count comes from the server config (ServerInfo.bots → store.serverBots).
    // The first server (0/1 players) sets bots=0 so no player bots ever spawn there.
    const botCount = useGame.getState().serverBots;
    const botSkins = [0xc28960, 0x8b5a2b, 0xd0a070, 0xa06030];
    const botShirts = [0x6a6a6a, 0x4a5a3a, 0x5a3a3a, 0x3a4a5a];
    const botPants = [0x3a3a3a, 0x2a2a2a, 0x4a3a2a, 0x3a3a4a];
    const botWeapons = ["woodSpear", "stoneSpear", "hatchet", "stonePickaxe"];
    for (let i = 0; i < botCount; i++) {
      const ang = (i / Math.max(1, botCount)) * Math.PI * 2 + rng();
      const dist = randRange(rng, 25, 60);
      const x = Math.cos(ang) * dist;
      const z = Math.sin(ang) * dist;
      const y = this.terrain.getHeight(x, z);
      const h = makeHumanoid({
        skinColor: botSkins[i % botSkins.length],
        shirtColor: botShirts[i % botShirts.length],
        trouserColor: botPants[i % botPants.length],
        hairColor: 0x1a1008,
      });
      h.root.position.set(x, y, z);
      this.scene.add(h.root);
      const bot: Bot = {
        humanoid: h,
        pos: new THREE.Vector3(x, y, z),
        vel: new THREE.Vector3(),
        yaw: rng() * Math.PI * 2,
        state: "wander",
        target: null,
        targetEntity: null,
        nextDecision: 0,
        hp: 100,
        attackCooldown: 0,
        clothing: {
          head: null,
          chest: pick(rng, ["basicShirt", "hideVest", "winterCoat"]),
          legs: pick(rng, ["basicTrousers", "hidePants"]),
          feet: pick(rng, ["hideBoots", null, null]),
        },
        weapon: botWeapons[i % botWeapons.length],
        carrying: [],
      };
      dressHumanoid(h, bot.clothing);
      attachWeapon(h, bot.weapon);
      this.bots.push(bot);
    }

    // ---- Phase 2: Water bodies (lakes) for fishing ----
    // Lake positions were picked in init() and registered with the terrain
    // (which carved depressions so the water sits at the surface). Here we just
    // create the visible water meshes at the matching waterLevel.
    for (const lk of this.pendingLakes) {
      const { x, z, r, waterLevel } = lk;
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(r, 24),
        new THREE.MeshStandardMaterial({
          color: 0x2a5a8a,
          transparent: true,
          opacity: 0.85,
          roughness: 0.1,
          metalness: 0.4,
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(x, waterLevel, z);
      water.name = `water_${this.lakes.length}`;
      this.scene.add(water);
      // Store lake positions for fishing proximity check
      this.lakes.push({ x, z, r });
    }

    // ---- Phase 2: Bird nests (forage eggs) ----
    for (let i = 0; i < 20; i++) {
      const x = randRange(rng, -SIZE, SIZE);
      const z = randRange(rng, -SIZE, SIZE);
      if (Math.sqrt(x * x + z * z) < 8) continue;
      const y = this.terrain.getHeight(x, z);
      if (this.terrain.slopeAt(x, z) > 0.4) continue;
      const nest = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.1, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 })
      );
      nest.rotation.x = Math.PI / 2;
      nest.position.set(x, y + 0.1, z);
      nest.name = "birdNest";
      this.scene.add(nest);
      this.birdNests.push({ mesh: nest, looted: false, x, y, z });
    }

    // Trader NPC removed (Task 8) — spawning + movement AI + store writes deleted.

    // Phase 6: Spawn companion NPC at 30-50m from origin — but only if the
    // user hasn't disabled the companion in settings.
    if (useGame.getState().companionEnabled) {
      const comp = makeCompanion();
      const rng = mulberry32(this.worldSeed + 7777);
      let cx = 0, cz = 0;
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = rng() * Math.PI * 2;
        const dist = 30 + rng() * 20;
        const tryX = Math.cos(angle) * dist;
        const tryZ = Math.sin(angle) * dist;
        const slope = Math.abs(this.terrain.getHeight(tryX + 3, tryZ) - this.terrain.getHeight(tryX - 3, tryZ)) / 6;
        if (slope < 0.4) { cx = tryX; cz = tryZ; break; }
      }
      const cy = this.terrain.getHeight(cx, cz);
      comp.pos.set(cx, cy, cz);
      comp.root.position.copy(comp.pos);
      this.scene.add(comp.root);
      this.companion = comp;
    }

    // Phase 7: Radiation zones — 3 zones at distant positions, deterministic from seed
    const radRng = mulberry32(seed + 9999);
    const radPositions = [
      { x: 250, z: 280 },
      { x: -300, z: -200 },
      { x: 350, z: -280 },
    ];
    for (const rp of radPositions) {
      // Add small seed-based jitter
      const jx = rp.x + (radRng() - 0.5) * 40;
      const jz = rp.z + (radRng() - 0.5) * 40;
      const radius = 30 + radRng() * 10;
      this.radiationZones.push({ x: jx, z: jz, radius });
      // Visual: semi-transparent green disc
      const rzVisual = makeRadiationZone(radius);
      const ry = this.terrain.getHeight(jx, jz);
      rzVisual.position.set(jx, ry, jz);
      this.scene.add(rzVisual);
    }
  }

  rollLoot(kind: "shelf" | "wardrobe" | "crate" | "chest", rng: () => number): ({ id: string; qty: number } | null)[] {
    const table = LOOT_TABLES[kind] ?? LOOT_TABLES.crate;
    const slots = kind === "crate" ? 6 : 4;
    const loot: ({ id: string; qty: number } | null)[] = [];
    for (let i = 0; i < slots; i++) {
      const entry = table[Math.floor(rng() * table.length)];
      if (!entry || rng() > entry.chance) {
        loot.push(null);
        continue;
      }
      const qty = Math.floor(randRange(rng, entry.min, entry.max + 1));
      loot.push({ id: entry.id, qty });
    }
    return loot;
  }

  // ===== Input handlers =====
  onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.handCamera.aspect = w / h;
    this.handCamera.updateProjectionMatrix();
  }

  onKeyDown(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    this.keys[k] = true;
    const g = useGame.getState();
    // Cached keybinds — re-read each call so rebinding takes effect immediately.
    const kb = g.keybinds;
    const bind = (action: string) => kb[action] ?? "";
    // While the pause menu is open, only Esc (to resume) is processed. All
    // other keybinds are ignored so the player can't toggle inventory / build
    // mode / drop items behind the pause overlay.
    if (g.paused) {
      if (k === "escape") {
        useGame.getState().setPaused(false);
      }
      return;
    }
    // Task 14: prevent browser shortcuts while in play mode + pointer locked.
    // Stops Chrome from intercepting Ctrl+W/T/N/L/R, F5/F11, etc. which were
    // interfering with game controls. We only preventDefault — we do NOT
    // stopPropagation, so the game's keybind handlers below still run.
    // Copy/paste (Ctrl+C/V/X/A) and devtools (F12) are explicitly allowed.
    if (g.mode === "play" && this.mouseLocked) {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isCopyPaste = isCtrl && (k === "c" || k === "v" || k === "x" || k === "a");
      // F1-F11 (F12 devtools allowed)
      const isFKey = /^F([1-9]|1[01])$/.test(e.key);
      if ((isCtrl && !isCopyPaste) || isFKey) {
        e.preventDefault();
      }
    }
    // Hotbar select 1..6
    if (k === bind("hotbar1")) g.selectHotbar(0);
    else if (k === bind("hotbar2")) g.selectHotbar(1);
    else if (k === bind("hotbar3")) g.selectHotbar(2);
    else if (k === bind("hotbar4")) g.selectHotbar(3);
    else if (k === bind("hotbar5")) g.selectHotbar(4);
    else if (k === bind("hotbar6")) g.selectHotbar(5);
    if (k === bind("inventory")) {
      e.preventDefault();
      // toggle inventory — pointer lock is auto-managed by onModeChange
      if (g.mode === "inventory") g.setMode("play");
      else if (g.mode === "play") g.setMode("inventory");
    }
    // ESC behaviour (pointer lock is auto-managed by onModeChange / onPointerLockChange):
    //   • in a menu (inventory/crafting/build/trader/quest/leaderboard) → return to play
    //   • companion command menu open → close it
    //   • settings overlay open → close it
    //   • otherwise (in play) → open the styled pause menu
    if (k === "escape") {
      if (g.mode === "inventory" || g.mode === "crafting" ||
          g.mode === "trader" || g.mode === "quest" || g.mode === "leaderboard") {
        g.setMode("play");
        g.closeContainer();
      } else if (g.radialMenuOpen) {
        g.closeRadialMenu();
        g.setSelectedBuildPiece(null);
      } else if (g.companionCommandMenuOpen) {
        useGame.getState().toggleCompanionCommandMenu();
      } else if (g.settingsOpen) {
        useGame.getState().setSettingsOpen(false);
      } else if (g.mode === "play") {
        useGame.getState().setPaused(true);
      }
    }
    if (k === bind("rotateBuild") && (g.mode === "play" || g.selectedBuildPiece !== null)) g.rotateBuildPiece();
    if (k === bind("interact")) this.interact();
    // F no longer toggles a torch — torch is equipped via the hotbar only.
    // Companion command menu is now opened via the companion command bind (Q
    // is no longer used for that either; companion commands are issued by
    // clicking the companion or its command menu).
    if (k === bind("drop")) this.dropSelected();
    // Crouch is now a HOLD on the crouch key (default Ctrl) — see updatePlayer
    // where playerCrouch is set from `this.keys[bind("crouch")]`.
    // Phase 10: H = auto-eat (smart consume best food). Auto-drink (J) and
    // photo mode (P) handlers removed (Task 10).
    if (k === bind("autoEat") && g.mode === "play") {
      e.preventDefault();
      g.autoConsumeFood();
    }
    if (k === "k" && (g.mode === "play" || g.playerStatsPanelOpen)) {
      e.preventDefault();
      g.setPlayerStatsPanelOpen(!g.playerStatsPanelOpen);
    }
    // Photo mode handler removed (Task 10). L = leaderboard
    if (k === bind("leaderboard") && (g.mode === "play" || g.mode === "leaderboard")) {
      e.preventDefault();
      if (g.mode === "play") {
        useGame.getState().loadLeaderboard();
        g.setMode("leaderboard");
      } else if (g.mode === "leaderboard") {
        g.setMode("play");
      }
    }
    // Waypoint placement (M key) has been removed entirely — waypoints are no
    // longer a feature. (The store API is kept for backwards-compat with
    // existing save data but no new waypoints can be created.)
    // Jump — no stamina cost anymore; always succeeds when on ground.
    if (k === bind("jump") && this.playerOnGround) {
      this.playerVel.y = 6;
      this.playerOnGround = false;
    }
  }
  onKeyUp(e: KeyboardEvent) {
    this.keys[e.key.toLowerCase()] = false;
  }

  onMouseDown(e: MouseEvent) {
    const g = useGame.getState();
    // Skip engine handling if click target is a UI overlay element (not the canvas)
    const target = e.target as HTMLElement;
    if (target && target !== this.renderer.domElement && target.tagName !== 'CANVAS' && !target.closest('canvas')) {
      return; // Let React/UI handle the click
    }
    if (g.mode === "dead" || g.mode === "loading" || g.mode === "menu") return;
    if (g.mode === "inventory" || g.mode === "crafting" || g.mode === "trader" || g.mode === "quest" || g.mode === "leaderboard") return;
    // Don't capture clicks when a panel is open
    if (g.settingsOpen || g.galleryOpen || g.companionCommandMenuOpen) return;
    if (e.button === 0) {
      this.mouseDown = true;
      // Pointer lock is now fully managed by mode transitions (onModeChange)
      // and the browser Esc handler (onPointerLockChange). There is no more
      // "click the canvas to enter pointer lock" step — joining the game
      // auto-locks, opening a menu auto-unlocks, closing a menu re-locks.
      if (g.mode === "play") {
        // V2 building: place with Building Plan
        const activeSlot = g.hotbar[g.equipHotbarIndex];
        if (activeSlot?.id === "buildingPlan" && g.selectedBuildPiece) {
          this.tryPlaceBuildV2();
        } else if (activeSlot && ["woodenDoor", "storageBox", "campfire", "furnace", "workbench"].includes(activeSlot.id)) {
          // Deployable placement
          this.tryPlaceDeployable(activeSlot.id as DeployableType);
        } else if (!this.mouseLocked) {
          this.requestPointerLock();
        } else {
          this.performAttack();
        }
      }
    }
    if (e.button === 2) {
      this.rightMouseDown = true;
      // Rust-style: open radial menu when holding Building Plan or Hammer
      const activeSlot = g.hotbar[g.equipHotbarIndex];
      const activeId = activeSlot?.id;
      if (activeId === "buildingPlan" && g.mode === "play") {
        g.openRadialMenu("build");
      } else if (activeId === "hammer" && g.mode === "play") {
        g.openRadialMenu("hammer");
      }
    }
  }
  onMouseUp(e: MouseEvent) {
    if (e.button === 0) this.mouseDown = false;
    if (e.button === 2) this.rightMouseDown = false;
  }
  onMouseMove(e: MouseEvent) {
    if (!this.mouseLocked) return;
    const sens = 0.0022;
    this.playerYaw -= e.movementX * sens;
    this.playerPitch -= e.movementY * sens;
    this.playerPitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.playerPitch));
    // weapon sway target
    this.swayTarget.x -= e.movementX * 0.0008;
    this.swayTarget.y += e.movementY * 0.0008;
    this.swayTarget.x = Math.max(-0.05, Math.min(0.05, this.swayTarget.x));
    this.swayTarget.y = Math.max(-0.05, Math.min(0.05, this.swayTarget.y));
    // Track radial menu mouse position (normalized -1..1)
    // Use raw mouse movement direction (not inverted)
    const g = useGame.getState();
    if (g.radialMenuOpen) {
      const mx = Math.max(-1, Math.min(1, g.radialMenuMouseX + e.movementX * 0.015));
      const my = Math.max(-1, Math.min(1, g.radialMenuMouseY + e.movementY * 0.015));
      g.setRadialMousePos(mx, my);
    }
  }
  onWheel(e: WheelEvent) {
    const g = useGame.getState();
    if (g.mode !== "play") return;
    e.preventDefault();
    let idx = g.equipHotbarIndex;
    if (e.deltaY > 0) idx = (idx + 1) % 6;
    else idx = (idx - 1 + 6) % 6;
    g.selectHotbar(idx);
  }
  onPointerLockChange() {
    this.mouseLocked = document.pointerLockElement === this.renderer.domElement;
    // If pointer lock was lost while in play mode (e.g. the user pressed the
    // browser's Esc key, which exits pointer lock at the UA level), open the
    // pause menu automatically so the player isn't stranded without controls
    // or a way to re-lock. We avoid doing this when a menu is already open or
    // the engine intentionally exited pointer lock (those paths set mode/paused
    // first, so the guard below skips them).
    if (!this.mouseLocked) {
      const g = useGame.getState();
      if (g.mode === "play" && !g.paused && !g.settingsOpen && !g.companionCommandMenuOpen) {
        g.setPaused(true);
      }
    }
  }

  // Request pointer lock on the canvas. Wrapped in try/catch because some
  // browsers throw if the document isn't focused or the call happens outside a
  // user gesture. Safe to call repeatedly. Also swallows the promise rejection
  // if the browser rejects the request (e.g. during the Esc cooldown) so it
  // doesn't surface as an uncaught error in the console.
  requestPointerLock() {
    try {
      const el = this.renderer?.domElement as HTMLCanvasElement | undefined;
      if (el && document.pointerLockElement !== el) {
        const result = el.requestPointerLock() as unknown as Promise<void> | undefined;
        // Newer browsers return a Promise; older ones return undefined. Swallow
        // rejections (NotAllowedError) — they're expected during the Esc
        // cooldown or when the document isn't focused.
        if (result && typeof result.catch === "function") {
          result.catch(() => { /* ignored */ });
        }
      }
    } catch {
      // Ignore — will retry on next user gesture or the delayed retry.
    }
  }

  // Called whenever the game mode changes (play / inventory / build / etc.).
  // Drives pointer-lock transitions so menus that need the mouse automatically
  // release the cursor, and returning to play re-locks it.
  onModeChange(newMode: GameMode) {
    const mouseNeeded = newMode === "inventory" || newMode === "crafting" ||
                        newMode === "trader" || newMode === "quest" ||
                        newMode === "leaderboard" || newMode === "dead";
    if (mouseNeeded) {
      if (document.pointerLockElement) document.exitPointerLock();
    } else if (newMode === "play") {
      // Returning to play — re-lock. This is called from a user gesture (key
      // press or button click), so the browser allows it. Schedule a delayed
      // retry too, in case the browser just exited pointer lock (Esc cooldown).
      this.requestPointerLock();
      setTimeout(() => {
        const g = useGame.getState();
        if (!g.paused && g.mode === "play" && !document.pointerLockElement) {
          this.requestPointerLock();
        }
      }, 1100);
    }
    // build / photo / menu / loading — leave pointer lock state as-is.
  }

  // ===== Held item / hotbar =====
  updateHeldItem() {
    const g = useGame.getState();
    const slot = g.hotbar[g.equipHotbarIndex];
    if (this.heldItemMesh) {
      this.heldGroup.remove(this.heldItemMesh);
      this.heldItemMesh = null;
    }
    if (!slot) return;
    const def = ITEMS[slot.id];
    if (!def) return;
    // Only show weapon/tool/torch/food in hand
    const showInHand =
      def.category === "weapon" ||
      def.category === "tool" ||
      def.category === "misc" ||
      def.category === "food" ||
      def.category === "drink";
    if (!showInHand) return;
    const m = makeHeldItem(slot.id);
    this.heldGroup.add(m);
    this.heldItemMesh = m;
  }

  toggleTorch() {
    // toggle held torch if you have one in hotbar
    const g = useGame.getState();
    const idx = g.hotbar.findIndex((s) => s && s.id === "torchItem");
    if (idx >= 0) {
      g.selectHotbar(idx);
    } else {
      g.toast("No torch equipped", "warn");
    }
  }

  // ===== Interaction (E key) =====
  interact() {
    const g = useGame.getState();
    if (g.mode !== "play") return;
    // Raycast from camera center
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    ray.far = 4.5;

    // Check loot containers
    for (const lo of this.lootObjs) {
      const dist = this.playerPos.distanceTo(lo.container.position);
      if (dist < 3.5) {
        if (lo.container.looted) {
          g.toast("Already looted", "warn");
          return;
        }
        // Open container view
        g.openLootContainer(lo.id, lo.container.kind, lo.loot.map((l) => (l ? { id: l.id, qty: l.qty } : null)));
        // Mark looted when container is closed (handled in closeContainer via engine.check)
        lo.container.looted = true;
        return;
      }
    }

    // Task 11: Debug block (Test Range) — opens the Debug Menu via CustomEvent.
    if (this.debugBlocks.length > 0) {
      for (const db of this.debugBlocks) {
        const d = this.playerPos.distanceTo(db.position);
        if (d < 3) {
          window.dispatchEvent(new CustomEvent("greenblood-open-debug-menu"));
          return;
        }
      }
    }

    // Task 3: Berry bush harvest (E) — raycast forward, give berries directly.
    {
      const bushRay = new THREE.Raycaster();
      bushRay.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      bushRay.far = 3;
      const px = this.playerPos.x;
      const pz = this.playerPos.z;
      let closestBush: BushInstance | null = null;
      let closestDist = Infinity;
      for (const b of this.bushes) {
        if (!b.hasBerries) continue;
        const dx = b.group.position.x - px;
        const dz = b.group.position.z - pz;
        if (dx * dx + dz * dz > 16) continue; // 4m radius
        const hits = bushRay.intersectObject(b.group, true);
        if (hits.length > 0 && hits[0].distance < closestDist) {
          closestDist = hits[0].distance;
          closestBush = b;
        }
      }
      if (closestBush) {
        this.harvestBush(closestBush);
        return;
      }
    }

    // Phase 2: Forage bird nests for eggs
    for (const nest of this.birdNests) {
      if (nest.looted) continue;
      const dist = Math.sqrt((nest.x - this.playerPos.x) ** 2 + (nest.z - this.playerPos.z) ** 2);
      if (dist < 1.8) {
        const eggs = 1 + Math.floor(Math.random() * 3);
        g.addItem("egg", eggs);
        if (Math.random() < 0.4) g.addItem("feather", 1 + Math.floor(Math.random() * 2));
        nest.looted = true;
        this.scene.remove(nest.mesh);
        g.toast(`Foraged ${eggs} eggs from nest 🥚`, "good");
        g.emitAudio("pickup");
        return;
      }
    }

    // Phase 2: Drink from lake
    for (const lake of this.lakes) {
      const d = Math.sqrt((lake.x - this.playerPos.x) ** 2 + (lake.z - this.playerPos.z) ** 2);
      if (d < lake.r + 2) {
        // Drink dirty water
        const s = g.stats;
        g.setStats({ water: Math.min(100, s.water + 35) });
        g.setStats({ health: s.health - 4 }); // risk of dirty water
        g.toast("Drank from lake (unsafe water)", "warn");
        g.emitAudio("drink");
        return;
      }
    }

    // Check animals for skinning
    for (const a of this.animals) {
      if (!a.dead) continue;
      const dist = this.playerPos.distanceTo(a.root.position);
      if (dist < 2.5) {
        // Loot the corpse — Phase 3: per-kind loot tables
        let meat = 0, hide = 0, fat = 0, bone = 0;
        if (a.kind === "bear") { meat = 8; hide = 4; fat = 3; bone = 4; }
        else if (a.kind === "boar") { meat = 4; hide = 2; fat = 1; bone = 2; }
        else if (a.kind === "deer") { meat = 3; hide = 2; fat = 1; bone = 2; }
        else if (a.kind === "rabbit") { meat = 1; hide = 1; fat = 0; bone = 0; }
        else if (a.kind === "wolf") { meat = 3; hide = 2; fat = 0; bone = 1; }
        if (meat > 0) g.addItem("rawMeat", meat);
        if (hide > 0) g.addItem("hide", hide);
        if (fat > 0) g.addItem("fat", fat);
        if (bone > 0) g.addItem("bone", bone);
        const parts: string[] = [];
        if (meat) parts.push(`${meat} meat`);
        if (hide) parts.push(`${hide} hide`);
        if (fat) parts.push(`${fat} fat`);
        if (bone) parts.push(`${bone} bone`);
        g.toast(`Looted ${a.kind}: ${parts.join(", ")}`, "good");
        // Remove corpse
        this.scene.remove(a.root);
        const idx = this.animals.indexOf(a);
        this.animals.splice(idx, 1);
        return;
      }
    }

    // Check builds — sit on bed to sleep
    const placed = g.placed;
    for (const p of placed) {
      const wx = p.worldX, wy = p.worldY, wz = p.worldZ;
      const dist = this.playerPos.distanceTo(new THREE.Vector3(wx, this.playerPos.y, wz));
      if (p.kind === "bed" && dist < 2.5) {
        // Phase 4: sleep state machine with night check + nearby-enemy check
        const tod = useGame.getState().timeOfDay;
        const isNight = tod > 0.7 || tod < 0.3;
        if (!isNight) {
          g.toast("Bed — wait until night to sleep", "info");
          return;
        }
        // Check for hostile wolves within 30m (enemies nearby)
        let danger = false;
        for (const a of this.animals) {
          if (a.dead) continue;
          if (a.kind !== "wolf" && a.kind !== "bear") continue;
          const d = a.root.position.distanceTo(this.playerPos);
          if (d < 30) { danger = true; break; }
        }
        if (danger) {
          g.toast("Too dangerous to sleep — enemies nearby!", "danger");
          return;
        }
        // Start sleep: engine triggers store.startSleep(); finishSleep advances time + restores stats
        useGame.getState().startSleep();
        useGame.getState().toast("😴 Sleeping...", "info");
        window.setTimeout(() => {
          useGame.getState().finishSleep();
        }, 2600);
        return;
      }
      if ((p.kind === "campfire" || p.kind === "furnace" || p.kind === "cookingPot") && dist < 3) {
        g.setMode("crafting");
        return;
      }
      if (p.kind === "woodChest" && dist < 3) {
        // Open chest as container (use stored loot if any, else empty)
        const loot = (p as any).loot ?? new Array(12).fill(null);
        g.openLootContainer(p.id, "crate", loot);
        return;
      }
      // Phase 4: Beehive — collect honey
      if (p.kind === "beehive" && dist < 3) {
        const hive = g.hiveContents[p.id];
        if (hive && hive.honey >= 1) {
          useGame.getState().collectHoney(p.id);
        } else {
          // Show growing progress
          const pct = hive ? Math.floor(hive.honey * 100) : 0;
          g.toast(`Beehive — honey growing: ${pct}%`, "info");
        }
        return;
      }
      // Phase 3: Farming plot — plant or harvest
      if (p.kind === "farmingPlot" && dist < 3) {
        const key = `${p.gx},${p.gz}`;
        const crop = g.crops[key];
        if (crop) {
          if (crop.growth >= 1) {
            g.harvestCrop(p.gx, p.gz);
            // Remove visual crop mesh if exists
            this.removeCropVisual(p.gx, p.gz);
            // Phase 4: Farmer achievement (first crop harvested)
            if (!this.firstCropAchieved) {
              this.firstCropAchieved = true;
              useGame.getState().unlockAchievement("farmer");
            }
          } else {
            g.toast(`Crop growing: ${Math.floor(crop.growth * 100)}%`, "info");
          }
        } else {
          // Try to plant from active hotbar slot
          const slot = g.hotbar[g.equipHotbarIndex];
          if (slot && (slot.id === "wheatSeed" || slot.id === "pumpkinSeed")) {
            const kind = slot.id === "wheatSeed" ? "wheat" : "pumpkin";
            g.plantCrop(p.gx, p.gz, kind);
            this.addCropVisual(p.gx, p.gz, kind);
          } else {
            g.toast("Equip wheat or pumpkin seeds to plant", "info");
          }
        }
        return;
      }
      // Phase 3: Drying rack — start drying or collect jerky
      if (p.kind === "dryingRack" && dist < 3) {
        const c = g.dryingRackContents[p.id];
        if (c) {
          if (c.ready) {
            g.collectJerky(p.id);
          } else {
            const elapsed = (Date.now() - c.startedAt) / 1000;
            g.toast(`Meat drying: ${Math.floor(elapsed)}/60s`, "info");
          }
        } else {
          g.startDrying(p.id);
        }
        return;
      }
      // Phase 3: Rain barrel — drink collected water
      if (p.kind === "rainBarrel" && dist < 3) {
        const w = g.rainBarrelWater[p.id] ?? 0;
        if (w >= 15) {
          g.collectRainWater(p.id);
        } else {
          g.toast(`Barrel: ${Math.floor(w)}/100 (needs rain)`, "info");
        }
        return;
      }
      // Phase 5: Quest board — open quest panel
      if (p.kind === "questBoard" && dist < 3) {
        useGame.getState().setMode("quest");
        return;
      }
      // Phase 5: Raft — mount/dismount
      if (p.kind === "raft" && dist < 3) {
        if (useGame.getState().ridingRaft) {
          useGame.getState().setRidingRaft(false, null);
          this.ridingRaftMesh = null;
          g.toast("Dismounted raft", "info");
        } else {
          const mesh = (p as any).mesh as THREE.Object3D;
          this.ridingRaftMesh = mesh || null;
          useGame.getState().setRidingRaft(true, p.id);
          g.toast("🛶 Riding raft — WASD to paddle. Press E to dismount.", "good");
        }
        return;
      }
    }
  }

  // ===== Performance: distance-based visibility culling =====
  // Hides objects (trees, bushes, rocks, animals, loot, dropped items, caves)
  // whose distance from the player exceeds `renderDistance`. With 510+ world
  // objects, the GPU spends most of its time transforming/vertex-shading far
  // away triangles that contribute nothing visible — culling them is the single
  // biggest FPS win we can get without refactoring to InstancedMesh.
  // Throttled to ~5 Hz (every 0.2s) so the cost is negligible.
  updateVisibility() {
    const rd = this.renderDistance;
    const rd2 = rd * rd;
    const px = this.playerPos.x;
    const pz = this.playerPos.z;
    // Helper: skip when in Test Range (small map, no culling needed)
    if (this.isTestRange) return;
    const check = (arr: { group?: THREE.Object3D; root?: THREE.Object3D; mesh?: THREE.Object3D }[]) => {
      for (const o of arr) {
        const m = o.group ?? o.root ?? o.mesh;
        if (!m) continue;
        const dx = m.position.x - px;
        const dz = m.position.z - pz;
        const d2 = dx * dx + dz * dz;
        // Small hysteresis: only flip visibility when crossing the threshold by
        // >5m. Prevents rapid toggling when an object is right at the boundary.
        const cur = m.visible;
        if (cur && d2 > rd2) m.visible = false;
        else if (!cur && d2 < (rd - 5) * (rd - 5)) m.visible = true;
      }
    };
    check(this.trees as unknown as { group: THREE.Object3D }[]);
    check(this.bushes as unknown as { group: THREE.Object3D }[]);
    check(this.rocks as unknown as { group: THREE.Object3D }[]);
    check(this.animals as unknown as { root: THREE.Object3D }[]);
    check(this.droppedItems as unknown as { mesh: THREE.Object3D }[]);
    // Loot containers + bird nests are simple meshes too — cull them.
    for (const lo of this.lootObjs) {
      const m = lo.container.group;
      const dx = m.position.x - px;
      const dz = m.position.z - pz;
      const d2 = dx * dx + dz * dz;
      if (m.visible && d2 > rd2) m.visible = false;
      else if (!m.visible && d2 < (rd - 5) * (rd - 5)) m.visible = true;
    }
    for (const bn of this.birdNests) {
      const dx = bn.x - px;
      const dz = bn.z - pz;
      const d2 = dx * dx + dz * dz;
      if (bn.mesh.visible && d2 > rd2) bn.mesh.visible = false;
      else if (!bn.mesh.visible && d2 < (rd - 5) * (rd - 5)) bn.mesh.visible = true;
    }
  }

  // ===== Test Range world population =====
  // Builds one of every interactable object on a flat gray grid so the player
  // can verify chopping, mining, harvesting, building, etc. all work without
  // hunting for resources in the procedural world.
  populateTestRange() {
    const rng = mulberry32(12345);
    // One tree of each type, spaced along a row.
    const treeTypes: ("pine" | "oak" | "birch")[] = ["pine", "oak", "birch"];
    for (let i = 0; i < treeTypes.length; i++) {
      const x = -20 + i * 8;
      const z = -10;
      const y = this.terrain.getHeight(x, z);
      // Force the tree type so we get one of each.
      const t = this.makeTypedTree(rng, x, z, y, treeTypes[i]);
      this.scene.add(t.group);
      this.trees.push(t);
    }
    // One berry bush
    {
      const x = -20;
      const z = 5;
      const y = this.terrain.getHeight(x, z);
      const b = makeBush(rng, x, z, y);
      this.scene.add(b.group);
      this.bushes.push(b);
    }
    // One of each ore kind (stone, coal, iron)
    const oreKinds: ("stone" | "coal" | "iron")[] = ["stone", "coal", "iron"];
    for (let i = 0; i < oreKinds.length; i++) {
      const x = -8 + i * 4;
      const z = -10;
      const y = this.terrain.getHeight(x, z);
      const r = makeRock(rng, x, z, y, oreKinds[i]);
      this.scene.add(r.group);
      this.rocks.push(r);
    }
    // One abandoned house with loot containers (covers shelf/wardrobe/crate)
    {
      const x = 10;
      const z = -15;
      const y = this.terrain.getHeight(x, z);
      const h = makeAbandonedHouse(rng, x, z, y);
      this.scene.add(h.group);
      for (const c of h.containers) {
        const loot = this.rollLoot(c.kind, rng);
        this.lootObjs.push({ container: c, loot, id: lootIdCounter++ });
      }
      this.recordHouseWalls(h.group, x, z);
    }
    // One of every buildable kind, laid out in a grid so the player can see
    // and interact with each (bed to sleep, campfire/furnace/cookingPot to use,
    // woodChest to open, workbench/anvil/dryingRack/rainBarrel/farmingPlot/
    // beehive/questBoard/generator/electricLight, etc.).
    const buildKinds: BuildKind[] = [
      "campfire", "bed", "woodChest", "torch", "workbench", "furnace",
      "anvil", "dryingRack", "farmingPlot", "rainBarrel", "signPost",
      "scarecrow", "beehive", "raft", "questBoard", "generator", "wire",
      "electricLight", "cookingPot",
      // Also include the structure pieces so they can be inspected visually:
      "woodWall", "woodFloor", "woodDoor", "woodPillar", "woodStairs",
      "woodWindow", "woodLadder", "stoneWall", "stoneFloor", "stoneDoor",
      "stoneStairs", "stoneWindow", "gate", "triangularRoof", "halfWall",
      "fencePost", "fenceGate", "ramp", "balcony", "triangularFloor",
      "woodRoof", "stoneRoof", "stoneWall",
    ];
    // Lay out builds in a grid, 6 per row, spaced 5m apart.
    const cols = 6;
    const spacing = 5;
    const startX = -15;
    const startZ = 15;
    const placed = useGame.getState().placed;
    for (let i = 0; i < buildKinds.length; i++) {
      const kind = buildKinds[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * spacing;
      const z = startZ + row * spacing;
      const y = this.terrain.getHeight(x, z);
      const def = BUILDS[kind];
      // Use makeBuild (factory) to create the visual mesh, then register it
      // with the store so prompts + interactions work on it.
      const mesh = makeBuild(kind);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);
      const pb: PlacedBuild & { mesh?: THREE.Object3D } = {
        id: buildIdCounter++,
        kind,
        gx: Math.round(x / GRID),
        gz: Math.round(z / GRID),
        gy: 0,
        rot: 0,
        hp: 100,
        worldX: x,
        worldZ: z,
        worldY: y,
        mesh,
      };
      placed.push(pb as any);
      // For electricLight + generator: register light refs so updateElectricLights works
      if (kind === "electricLight" || kind === "generator") {
        this.fireCacheDirty = true;
      }
      // For campfire/furnace/cookingPot/torch: register fire lights + flame meshes
      if (kind === "campfire" || kind === "furnace" || kind === "cookingPot" || kind === "torch") {
        this.fireCacheDirty = true;
      }
      void def; // def is read implicitly via makeBuild; silence unused warning
    }
    // Persist the placed builds so the store is consistent for prompts/saving
    useGame.setState({ placed });

    // A couple of animals so combat/hunting can be tested too
    const animalKinds: ("deer" | "boar" | "bear" | "rabbit" | "wolf")[] = ["deer", "boar", "bear", "rabbit", "wolf"];
    for (let i = 0; i < animalKinds.length; i++) {
      const x = 25 + i * 4;
      const z = 5;
      const y = this.terrain.getHeight(x, z);
      const a = makeAnimal(animalKinds[i]);
      a.root.position.set(x, y, z);
      this.scene.add(a.root);
      this.animals.push(a);
    }

    // One bird nest
    {
      const x = 30;
      const z = -10;
      const y = this.terrain.getHeight(x, z);
      const nest = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.1, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 1 })
      );
      nest.rotation.x = Math.PI / 2;
      nest.position.set(x, y + 0.1, z);
      nest.name = "birdNest";
      this.scene.add(nest);
      this.birdNests.push({ mesh: nest, looted: false, x, y, z });
    }

    // A small lake so fishing can be tested
    {
      const x = -30;
      const z = 25;
      const r = 8;
      const water = new THREE.Mesh(
        new THREE.CircleGeometry(r, 24),
        new THREE.MeshStandardMaterial({
          color: 0x2a5a8a,
          transparent: true,
          opacity: 0.85,
          roughness: 0.1,
          metalness: 0.4,
        })
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(x, 0.3, z);
      water.name = "water_test";
      this.scene.add(water);
      this.lakes.push({ x, z, r });
    }

    // Cave entrance removed from Test Range (Task 6).

    // Purple debug block (Task 11) — interact (E) to open the Debug Menu.
    {
      const x = 0;
      const z = -6;
      const y = this.terrain.getHeight(x, z);
      const debugBlock = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1.5, 1),
        new THREE.MeshStandardMaterial({
          color: 0x8b5cf6,
          emissive: 0x8b5cf6,
          emissiveIntensity: 0.45,
          roughness: 0.3,
          metalness: 0.4,
        })
      );
      debugBlock.position.set(x, y + 0.75, z);
      debugBlock.castShadow = true;
      debugBlock.name = "debugBlock";
      this.scene.add(debugBlock);
      this.debugBlocks.push(debugBlock);
    }
  }

  // Helper for populateTestRange — makeTree picks a random type. We need a
  // specific type so we can guarantee one of each. This wraps makeTree and
  // forces the type by retrying until we get it (small loop, runs once).
  makeTypedTree(rng: () => number, x: number, z: number, y: number, wantType: "pine" | "oak" | "birch"): TreeInstance {
    let t = makeTree(rng, x, z, y);
    let tries = 0;
    while (t.type !== wantType && tries < 20) {
      t = makeTree(rng, x, z, y);
      tries++;
    }
    return t;
  }

  // ===== House wall collision registration =====
  // Computes 5 wall AABBs (back, front-left, front-right, left, right) from the
  // house group's local dimensions + rotation, and stores them in `houseWalls`
  // so the player-collision pass can prevent walking through them. The front
  // wall is split in two to leave a door gap the player can walk through.
  recordHouseWalls(group: THREE.Group, x: number, z: number) {
    const hw = (group.userData.w as number) || 6;
    const hd = (group.userData.d as number) || 5;
    const wallT = 0.25;
    const doorW = 1.2;
    const rotY = group.rotation.y;
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    const sideW = (hw - doorW) / 2;
    // [localCenterX, localCenterZ, halfW, halfD]
    const localWalls: [number, number, number, number][] = [
      [0, -hd / 2, hw / 2, wallT / 2],                          // back wall
      [-(doorW / 2 + sideW / 2), hd / 2, sideW / 2, wallT / 2], // front-left
      [doorW / 2 + sideW / 2, hd / 2, sideW / 2, wallT / 2],    // front-right
      [-hw / 2, 0, wallT / 2, hd / 2],                          // left wall
      [hw / 2, 0, wallT / 2, hd / 2],                           // right wall
    ];
    for (const [lx, lz, hlw, hld] of localWalls) {
      // Rotate local center into world space (Y-axis rotation around house origin)
      const wx = x + lx * cosR - lz * sinR;
      const wz = z + lx * sinR + lz * cosR;
      // AABB half-extents of the rotated rectangle
      const halfX = Math.abs(hlw * cosR) + Math.abs(hld * sinR);
      const halfZ = Math.abs(hlw * sinR) + Math.abs(hld * cosR);
      this.houseWalls.push({
        minX: wx - halfX, maxX: wx + halfX,
        minZ: wz - halfZ, maxZ: wz + halfZ,
      });
    }
  }

  // ===== Player collision pass =====
  // Prevents the player from walking through trees, rocks, bushes, animals,
  // loot containers, abandoned-house walls, and placed builds. Movement is
  // resolved per-axis (X then Z) so the player slides along walls instead
  // of sticking to them.
  collidePlayer(prevX: number, prevZ: number, newX: number, newZ: number): { x: number; z: number } {
    const pr = this.playerRadius;
    // Try X movement first (keep Z at prevZ)
    let commitX = prevX;
    if (newX !== prevX) {
      if (!this.pointCollides(newX, prevZ, pr)) commitX = newX;
    }
    // Then try Z movement (using the committed X)
    let commitZ = prevZ;
    if (newZ !== prevZ) {
      if (!this.pointCollides(commitX, newZ, pr)) commitZ = newZ;
    }
    return { x: commitX, z: commitZ };
  }

  // Returns true if a circle of radius `pr` at (x, z) overlaps any obstacle.
  pointCollides(x: number, z: number, pr: number): boolean {
    // Trees (trunk only — canopy is overhead). Skip chopped trees.
    for (let i = 0; i < this.trees.length; i++) {
      const t = this.trees[i];
      if (t.chopped) continue;
      const tp = t.group.position;
      const dx = x - tp.x;
      const dz = z - tp.z;
      // Tree trunk radius ~0.5 (the trunk mesh is 0.18–0.32 wide)
      const r = 0.5 + pr;
      if (dx * dx + dz * dz < r * r) return true;
    }
    // Rocks
    for (let i = 0; i < this.rocks.length; i++) {
      const r = this.rocks[i];
      const rp = r.group.position;
      const dx = x - rp.x;
      const dz = z - rp.z;
      // Rock radius ~1.0 (the rock mesh is 0.6–1.3)
      const rad = 1.0 + pr;
      if (dx * dx + dz * dz < rad * rad) return true;
    }
    // Berry bushes — NO collision (player walks through them), but movement is
    // slowed in updatePlayer when standing inside a bush.
    // Animals — radius depends on kind. Skip dead animals (corpses).
    for (let i = 0; i < this.animals.length; i++) {
      const a = this.animals[i];
      if (a.dead) continue;
      const ap = a.root.position;
      const dx = x - ap.x;
      const dz = z - ap.z;
      let rad = 0.7;
      if (a.kind === "bear") rad = 1.2;
      else if (a.kind === "boar") rad = 0.9;
      else if (a.kind === "deer") rad = 0.8;
      else if (a.kind === "wolf") rad = 0.7;
      else if (a.kind === "rabbit") rad = 0.4;
      rad += pr;
      if (dx * dx + dz * dz < rad * rad) return true;
    }
    // Loot containers (shelf/wardrobe/crate)
    for (let i = 0; i < this.lootObjs.length; i++) {
      const c = this.lootObjs[i].container;
      const cp = c.position;
      const dx = x - cp.x;
      const dz = z - cp.z;
      const rad = 0.6 + pr;
      if (dx * dx + dz * dz < rad * rad) return true;
    }
    // Abandoned-house walls (AABB)
    for (let i = 0; i < this.houseWalls.length; i++) {
      const w = this.houseWalls[i];
      const cx = Math.max(w.minX, Math.min(x, w.maxX));
      const cz = Math.max(w.minZ, Math.min(z, w.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < pr * pr) return true;
    }
    // Placed builds (player-built) — AABB from BUILDS def, axis-aligned (rot ∈ {0,1,2,3})
    const placed = useGame.getState().placed;
    for (let i = 0; i < placed.length; i++) {
      const p = placed[i];
      const def = BUILDS[p.kind];
      if (!def) continue;
      // Skip non-blocking builds (crops grow on a plot; the plot itself has a
      // low border but the player should be able to walk onto it).
      if (p.kind === "farmingPlot" || p.kind === "woodFloor" || p.kind === "stoneFloor" ||
          p.kind === "woodLadder" || p.kind === "woodStairs" || p.kind === "stoneStairs" ||
          p.kind === "ramp" || p.kind === "balcony" || p.kind === "triangularFloor" ||
          p.kind === "woodRoof" || p.kind === "stoneRoof" || p.kind === "triangularRoof" ||
          p.kind === "fencePost" || p.kind === "signPost" || p.kind === "torch" ||
          p.kind === "wire" || p.kind === "electricLight" || p.kind === "campfire" ||
          p.kind === "furnace" || p.kind === "cookingPot" || p.kind === "dryingRack" ||
          p.kind === "rainBarrel" || p.kind === "scarecrow" || p.kind === "beehive" ||
          p.kind === "questBoard" || p.kind === "raft" || p.kind === "fenceGate") {
        continue;
      }
      // Build is rotated 0/90/180/270°. Swap half-extents if rotated 90°/270°.
      const rotOdd = (p.rot % 2) === 1;
      const hx = rotOdd ? def.d / 2 : def.w / 2;
      const hz = rotOdd ? def.w / 2 : def.d / 2;
      // Only block if the player's eye height is within the build's vertical span
      // (so you can walk under a roof or stand on a floor above without being
      // blocked by the wall below). For simplicity: always block in XZ; this is
      // fine because walls are the main collision concern.
      const cx = Math.max(p.worldX - hx, Math.min(x, p.worldX + hx));
      const cz = Math.max(p.worldZ - hz, Math.min(z, p.worldZ + hz));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < pr * pr) return true;
    }
    // Placed V2 builds (Rust-style building system) — AABB collision
    const placedV2 = useGame.getState().placedV2;
    for (let i = 0; i < placedV2.length; i++) {
      const pb = placedV2[i];
      // Skip non-blocking piece types (floors, stairs, roofs, etc.)
      if (!shouldBlockPlayer(pb.pieceType)) continue;
      const box = getWorldCollisionBox(pb);
      const cx = Math.max(box.minX, Math.min(x, box.maxX));
      const cz = Math.max(box.minZ, Math.min(z, box.maxZ));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < pr * pr) return true;
    }
    // Placed V2 deployables — simple AABB collision (storage boxes, etc.)
    const placedDeps = useGame.getState().placedDeployables;
    for (let i = 0; i < placedDeps.length; i++) {
      const dep = placedDeps[i];
      const depDef = DEPLOYABLE_DEFS[dep.type];
      if (!depDef) continue;
      if (depDef.category === "utility") continue;
      const dhw = depDef.w / 2;
      const dhd = depDef.d / 2;
      const cx = Math.max(dep.worldX - dhw, Math.min(x, dep.worldX + dhw));
      const cz = Math.max(dep.worldZ - dhd, Math.min(z, dep.worldZ + dhd));
      const dx = x - cx;
      const dz = z - cz;
      if (dx * dx + dz * dz < pr * pr) return true;
    }
    return false;
  }

  // Phase 3: Visual crop mesh management
  cropMeshes: Map<string, THREE.Object3D> = new Map();

  addCropVisual(gx: number, gz: number, kind: "wheat" | "pumpkin") {
    const key = `${gx},${gz}`;
    this.removeCropVisual(gx, gz);
    const group = new THREE.Group();
    const x = gx * 3, z = gz * 3;
    const y = this.terrain.getHeight(x, z);
    // Plant sprout — small green cone
    const color = kind === "wheat" ? 0xb5a85a : 0x4a8a3a;
    for (let i = 0; i < 4; i++) {
      const sprout = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.4, 6),
        new THREE.MeshStandardMaterial({ color })
      );
      sprout.position.set(x + (Math.random() - 0.5) * 1.5, y + 0.2, z + (Math.random() - 0.5) * 1.5);
      group.add(sprout);
    }
    this.scene.add(group);
    this.cropMeshes.set(key, group);
  }

  removeCropVisual(gx: number, gz: number) {
    const key = `${gx},${gz}`;
    const m = this.cropMeshes.get(key);
    if (m) {
      this.scene.remove(m);
      this.cropMeshes.delete(key);
    }
  }

  updateCropVisuals() {
    const crops = useGame.getState().crops;
    for (const key of Object.keys(crops)) {
      const c = crops[key];
      const [gx, gz] = key.split(",").map(Number);
      const existing = this.cropMeshes.get(key);
      // Update visual scale based on growth
      if (existing) {
        const scale = 0.3 + c.growth * 1.5; // 0.3 to 1.8
        existing.scale.set(scale, scale, scale);
        // Color shift when ready
        existing.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (c.growth >= 1) {
              mat.color.setHex(c.kind === "wheat" ? 0xd4b85a : 0xd97706);
              mat.emissive.setHex(0x442200);
            } else {
              mat.color.setHex(c.kind === "wheat" ? 0x8a9a4a : 0x4a8a3a);
              mat.emissive.setHex(0x000000);
            }
          }
        });
      }
    }
  }

  enterCave() {
    if (!this.cave) return;
    this.cave.enter();
    // teleport player into cave
    this.playerPos.set(this.cave.entrance.x, -10 + 0.5, this.cave.entrance.z + 5);
    useGame.getState().toast("Entered the cave. Mine with a pickaxe!", "info");
  }
  exitCave() {
    if (!this.cave) return;
    this.cave.exit();
    this.playerPos.set(this.cave.entrance.x, this.terrain.getHeight(this.cave.entrance.x, this.cave.entrance.z), this.cave.entrance.z + 4);
  }

  // ===== Attacks / harvesting =====
  performAttack() {
    const g = useGame.getState();
    if (g.mode !== "play") return;
    const slot = g.hotbar[g.equipHotbarIndex];
    if (!slot) {
      // bare hands
      this.swingAttack(2, 2.2, "none", 0.3, 0.4);
      // Phase 10: weapon swing animation
      useGame.getState().setWeaponSwing("fist");
      return;
    }
    const def = ITEMS[slot.id];
    if (!def) return;
    // Phase 2: Fishing rod special — fish when near water
    if (slot.id === "fishingRod") {
      this.tryFish();
      return;
    }
    if (def.weaponKind === "ranged") {
      this.fireRanged(def);
      // Phase 10: weapon swing animation (gunfire)
      useGame.getState().setWeaponSwing(slot.id);
      return;
    }
    useGame.getState().emitAudio("swing");
    this.swingAttack(def.damage ?? 4, def.range ?? 2.5, def.toolType ?? "none", def.toolPower ?? 0.5, def.attackRate ?? 0.5);
    this.heldAttackTime = 0.001;
    // Phase 10: weapon swing animation
    useGame.getState().setWeaponSwing(slot.id);
  }

  tryFish() {
    // Check if near a lake
    let nearLake: { x: number; z: number; r: number } | null = null;
    for (const lake of this.lakes) {
      const d = Math.sqrt((lake.x - this.playerPos.x) ** 2 + (lake.z - this.playerPos.z) ** 2);
      if (d < lake.r + 2) { nearLake = lake; break; }
    }
    if (!nearLake) {
      useGame.getState().toast("Stand near water to fish", "warn");
      return;
    }
    if (this.heldRecoil > 0) return;
    this.heldRecoil = 1.5;
    useGame.getState().emitAudio("swing");
    useGame.getState().toast("🎣 Casting line...", "info");
    // After 2 seconds, catch a fish (or nothing)
    setTimeout(() => {
      if (useGame.getState().mode !== "play") return;
      const r = Math.random();
      if (r < 0.7) {
        useGame.getState().addItem("rawFish", 1);
        useGame.getState().toast("Caught a fish! 🐟", "good");
        useGame.getState().emitAudio("pickup");
        // XP reward removed (Task 9 — leveling system removed).
        // Phase 4: Angler achievement
        if (!this.firstFishAchieved) {
          this.firstFishAchieved = true;
          useGame.getState().unlockAchievement("angler");
        }
        // Phase 5: quest progress
        useGame.getState().incrementQuestProgress("fish", 1);
      } else if (r < 0.85) {
        useGame.getState().addItem("rawFish", 2);
        useGame.getState().toast("Big catch! 🐟🐟", "good");
        useGame.getState().emitAudio("pickup");
        // Phase 4: Angler achievement
        if (!this.firstFishAchieved) {
          this.firstFishAchieved = true;
          useGame.getState().unlockAchievement("angler");
        }
        // Phase 5: quest progress (counts as 2 fish for quest)
        useGame.getState().incrementQuestProgress("fish", 2);
      } else if (r < 0.95) {
        useGame.getState().toast("The fish got away...", "warn");
      } else {
        // Rare: junk
        useGame.getState().addItem("cloth", 1);
        useGame.getState().toast("Reeled in some junk cloth", "info");
      }
    }, 2000);
  }

  swingAttack(damage: number, range: number, toolType: string, toolPower: number, attackRate: number) {
    if (this.heldRecoil > 0) return;
    this.heldRecoil = attackRate;
    // Apply Phase 5 strength buff (+10 damage)
    let effectiveDamage = damage;
    if (useGame.getState().buffStrength > 0) effectiveDamage += 10;
    // Raycast forward
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    ray.far = range;
    // Phase 5: Check boss first (highest priority target)
    if (this.boss && !this.boss.dead) {
      const dist = this.playerPos.distanceTo(this.boss.root.position);
      if (dist <= range + 2) {
        const intersectsBoss = ray.intersectObject(this.boss.root, true);
        if (intersectsBoss.length > 0) {
          this.damageBoss(effectiveDamage);
          this.spawnHitParticles(intersectsBoss[0].point, 0xff2020);
          useGame.getState().emitAudio("hit");
          return;
        }
      }
    }
    // Check trees
    const treeMeshes = this.trees.filter((t) => !t.chopped).map((t) => t.group);
    const intersects = ray.intersectObjects(treeMeshes, true);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const tree = this.trees.find((t) => t.group === hit.object.parent || t.group.children.includes(hit.object.parent as any) || t.group === (hit.object as any));
      // find the tree whose group contains the hit object
      let target: TreeInstance | undefined;
      for (const t of this.trees) {
        if (t.chopped) continue;
        let isMatch = false;
        t.group.traverse((o) => { if (o === hit.object) isMatch = true; });
        if (isMatch) { target = t; break; }
      }
      if (target) {
        // damage scales with tool type (axe best, others slower)
        const dmg = toolType === "axe" ? damage * 1.5 : toolType === "pickaxe" ? damage * 0.5 : damage * 0.8;
        target.hp -= dmg;
        // spawn wood particles
        this.spawnHitParticles(hit.point, 0x8b5a2b);
        useGame.getState().emitAudio("chop");
        if (target.hp <= 0) {
          this.chopTree(target);
        }
        return;
      }
    }
    // Check rocks
    let targetRock: RockInstance | undefined;
    let rockHitPoint: THREE.Vector3 | undefined;
    for (const r of this.rocks) {
      const dist = this.playerPos.distanceTo(r.group.position);
      if (dist > range + 1) continue;
      const intersects2 = ray.intersectObject(r.group, true);
      if (intersects2.length > 0) {
        targetRock = r;
        rockHitPoint = intersects2[0].point;
        break;
      }
    }
    if (targetRock) {
      const dmg = toolType === "pickaxe" ? damage * 1.5 : damage * 0.4;
      targetRock.hp -= dmg;
      this.spawnHitParticles(rockHitPoint!, targetRock.kind === "coal" ? 0x000000 : targetRock.kind === "iron" ? 0xc8a060 : 0x888888);
      useGame.getState().emitAudio("mine");
      if (targetRock.hp <= 0) {
        this.mineRock(targetRock);
      }
      return;
    }
    // Check animals (melee)
    for (const a of this.animals) {
      if (a.dead) continue;
      const dist = this.playerPos.distanceTo(a.root.position);
      if (dist > range + 1) continue;
      const intersects3 = ray.intersectObject(a.root, true);
      if (intersects3.length > 0) {
        a.hp -= damage;
        a.state = "flee";
        a.target = this.playerPos.clone();
        this.spawnHitParticles(intersects3[0].point, 0xaa0000);
        if (a.hp <= 0) {
          this.killAnimal(a);
        }
        return;
      }
    }
    // Check bots (melee)
    for (const b of this.bots) {
      const dist = this.playerPos.distanceTo(b.pos);
      if (dist > range + 1) continue;
      const intersects4 = ray.intersectObject(b.humanoid.root, true);
      if (intersects4.length > 0) {
        b.hp -= damage;
        b.state = "fight";
        b.targetEntity = { type: "player" };
        this.spawnHitParticles(intersects4[0].point, 0xaa0000);
        if (b.hp <= 0) {
          this.killBot(b);
        }
        return;
      }
    }
    // Hit a placed build (to demolish) — only if using a hammer-like tool
    if (toolType === "hammer") {
      const placed = useGame.getState().placed;
      for (const p of placed) {
        const dist = this.playerPos.distanceTo(new THREE.Vector3(p.worldX, p.worldY, p.worldZ));
        if (dist > range + 1) continue;
        // find build mesh
        const mesh = (p as any).mesh as THREE.Object3D;
        if (!mesh) continue;
        const intersects5 = ray.intersectObject(mesh, true);
        if (intersects5.length > 0) {
          p.hp -= damage;
          if (p.hp <= 0) {
            this.scene.remove(mesh);
            useGame.getState().removePlaced(p.id);
          }
          return;
        }
      }
    }
  }

  fireRanged(def: typeof ITEMS[string]) {
    if (this.heldRecoil > 0) return;
    const g = useGame.getState();
    // ammo check
    if (def.ammoType) {
      if (g.countItem(def.ammoType) <= 0) {
        g.toast("Out of ammo", "warn");
        return;
      }
      g.removeItem(def.ammoType, 1);
    }
    this.heldRecoil = def.attackRate ?? 1;
    useGame.getState().emitAudio("gunshot");
    // Raycast forward for hit
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    ray.far = def.range ?? 50;
    // Muzzle flash
    const flash = new THREE.PointLight(0xffaa30, 6, 12);
    flash.position.copy(this.camera.position).add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));
    this.scene.add(flash);
    setTimeout(() => this.scene.remove(flash), 60);
    // Phase 5: Check boss first (highest priority for ranged attacks too)
    if (this.boss && !this.boss.dead) {
      const hitsBoss = ray.intersectObject(this.boss.root, true);
      if (hitsBoss.length > 0) {
        const dmg = (useGame.getState().buffStrength > 0 ? 10 : 0) + (def.damage ?? 30);
        this.damageBoss(dmg);
        this.spawnHitParticles(hitsBoss[0].point, 0xff2020);
        return;
      }
    }
    // Hit animals first
    const targets: THREE.Object3D[] = [];
    for (const a of this.animals) if (!a.dead) targets.push(a.root);
    for (const b of this.bots) targets.push(b.humanoid.root);
    const hits = ray.intersectObjects(targets, true);
    if (hits.length > 0) {
      const hit = hits[0];
      // find which animal/bot
      for (const a of this.animals) {
        if (a.dead) continue;
        let match = false;
        a.root.traverse((o) => { if (o === hit.object) match = true; });
        if (match) {
          a.hp -= def.damage ?? 30;
          // Wolves don't flee — they get aggressive; rabbits & deer flee
          if (a.kind !== "wolf" && a.kind !== "bear") a.state = "flee";
          this.spawnHitParticles(hit.point, 0xaa0000);
          if (a.hp <= 0) this.killAnimal(a);
          return;
        }
      }
      for (const b of this.bots) {
        let match = false;
        b.humanoid.root.traverse((o) => { if (o === hit.object) match = true; });
        if (match) {
          b.hp -= def.damage ?? 30;
          b.state = "fight";
          b.targetEntity = { type: "player" };
          this.spawnHitParticles(hit.point, 0xaa0000);
          if (b.hp <= 0) this.killBot(b);
          return;
        }
      }
    }
  }

  spawnHitParticles(pos: THREE.Vector3, color: number) {
    // Determine particle type based on color
    let type: "wood" | "stone" | "blood" | "spark" | "heal" = "spark";
    if (color === 0x8b5a2b || color === 0x8B6914) type = "wood";
    else if (color === 0x888888 || color === 0xc8a060 || color === 0x000000) type = "stone";
    else if (color === 0xaa0000 || color === 0xff2020 || color === 0xcc2222) type = "blood";
    else if (color === 0x44ff88) type = "heal";
    this.particles.spawn(pos, 8, type, { spread: 0.4, speed: 3, life: 0.6 });
  }

  chopTree(t: TreeInstance) {
    t.chopped = true;
    // Drop wood
    const woodAmt = t.type === "pine" ? 6 : t.type === "oak" ? 8 : 5;
    this.spawnDroppedItem("wood", woodAmt, t.group.position);
    // Replace with stump
    const rng = mulberry32(Math.floor(t.group.position.x * 100 + t.group.position.z));
    const stump = makeStump(rng);
    stump.position.copy(t.group.position);
    this.scene.add(stump);
    // Fall animation
    this.scene.remove(t.group);
    // Phase 9: Activity log
    useGame.getState().pushActivity(`Chopped ${t.type} tree (+${woodAmt} wood)`, "🪓", "good");
    // Phase 4: First-tree achievement
    if (!this.firstTreeAchieved) {
      this.firstTreeAchieved = true;
      useGame.getState().unlockAchievement("first_tree");
    }
    // Phase 5: quest progress for chopping trees
    useGame.getState().incrementQuestProgress("chop_trees", 1);
    // XP reward removed (Task 9 — leveling system removed).
    // Respawn timer (after 5 min)
    setTimeout(() => {
      this.scene.remove(stump);
      const newT = makeTree(rng, t.group.position.x, t.group.position.z, this.terrain.getHeight(t.group.position.x, t.group.position.z));
      newT.group.scale.setScalar(0.5);
      this.scene.add(newT.group);
      this.trees.push(newT);
      // grow animation
      const growStart = performance.now();
      const grow = () => {
        const elapsed = (performance.now() - growStart) / 1000;
        const s = Math.min(1, 0.5 + elapsed * 0.05);
        newT.group.scale.setScalar(s);
        if (s < 1) requestAnimationFrame(grow);
      };
      grow();
    }, 300000);
  }

  mineRock(r: RockInstance) {
    const dropId = r.kind === "coal" ? "coal" : r.kind === "iron" ? "ironOre" : "stone";
    const amt = r.kind === "stone" ? 5 : 3;
    this.spawnDroppedItem(dropId, amt, r.group.position);
    this.scene.remove(r.group);
    const idx = this.rocks.indexOf(r);
    this.rocks.splice(idx, 1);
    // Phase 9: Activity log
    const mineIcon: Record<string, string> = { stone: "🪨", coal: "⚫", iron: "⚙️", gold: "🪙" };
    useGame.getState().pushActivity(`Mined ${r.kind} (+${amt})`, mineIcon[r.kind] ?? "⛏️", "good");
    // Phase 4: First-mine achievement
    if (!this.firstMineAchieved) {
      this.firstMineAchieved = true;
      useGame.getState().unlockAchievement("first_mine");
    }
    // Phase 5: quest progress for mining rocks + gold-rush tracking
    useGame.getState().incrementQuestProgress("mine_rocks", 1);
    if (dropId === "goldNugget") useGame.getState().incrementQuestProgress("collect_gold", amt);
    // XP reward removed (Task 9 — leveling system removed).
    // Respawn
    setTimeout(() => {
      const rng = mulberry32(Math.floor(r.group.position.x * 13 + r.group.position.z * 7));
      const newR = makeRock(rng, r.group.position.x, r.group.position.z, r.group.position.y, r.kind);
      this.scene.add(newR.group);
      this.rocks.push(newR);
    }, 240000);
  }

  harvestBush(b: BushInstance) {
    if (!b.hasBerries) return;
    b.hasBerries = false;
    for (const m of b.berryMeshes) b.group.remove(m);
    // Task 3: give berries directly to inventory (was: spawnDroppedItem on ground).
    const qty = 1 + Math.floor(Math.random() * 3); // 1-3 berries
    useGame.getState().addItem("berries", qty);
    useGame.getState().toast(`Foraged ${qty} berries 🫐`, "good");
    useGame.getState().emitAudio("pickup");
    // respawn berries after 60s
    setTimeout(() => {
      b.hasBerries = true;
      for (const m of b.berryMeshes) b.group.add(m);
    }, 60000);
  }

  killAnimal(a: AnimalInstance) {
    a.dead = true;
    a.state = "dead";
    a.corpseTime = 0;
    // Replace with corpse
    const corpse = makeCorpse(a.kind);
    corpse.position.copy(a.root.position);
    corpse.rotation.y = a.root.rotation.y;
    this.scene.remove(a.root);
    this.scene.add(corpse);
    a.root = corpse;
    // Despawn after 5 min
    setTimeout(() => {
      const idx = this.animals.indexOf(a);
      if (idx >= 0) {
        this.scene.remove(a.root);
        this.animals.splice(idx, 1);
      }
    }, 300000);
    useGame.getState().toast(`Killed ${a.kind}! Loot the corpse (E)`, "good");
    // Phase 9: Activity log
    const killIcon: Record<string, string> = { deer: "🦌", boar: "🐗", bear: "🐻", rabbit: "🐰", wolf: "🐺" };
    useGame.getState().pushActivity(`Killed ${a.kind}`, killIcon[a.kind] ?? "⚔️", "good");
    // Phase 4: First-blood + wolf_slayer + bear_slayer achievements
    if (!this.firstBloodAchieved) {
      this.firstBloodAchieved = true;
      useGame.getState().unlockAchievement("first_blood");
    }
    if (a.kind === "wolf") useGame.getState().unlockAchievement("wolf_slayer");
    if (a.kind === "bear") useGame.getState().unlockAchievement("bear_slayer");
    // Phase 5: kill counter + quest progress
    useGame.getState().incrementKills();
    if (a.kind === "wolf") {
      useGame.getState().incrementQuestProgress("kill_wolves", 1);
      // Phase 10: night_hunter achievement — track wolves killed at night
      const tod = useGame.getState().timeOfDay;
      const isNight = tod > 0.78 || tod < 0.22;
      if (isNight) useGame.getState().incrementNightWolfKill();
    }
    if (a.kind === "bear") useGame.getState().incrementQuestProgress("kill_bear", 1);
  }

  killBot(b: Bot) {
    // Drop loot
    this.spawnDroppedItem("wood", 10 + Math.floor(Math.random() * 20), b.pos);
    this.spawnDroppedItem("stone", 5 + Math.floor(Math.random() * 10), b.pos);
    if (Math.random() > 0.5) this.spawnDroppedItem(b.weapon, 1, b.pos);
    if (Math.random() > 0.5) this.spawnDroppedItem("cloth", 3, b.pos);
    if (Math.random() > 0.5) this.spawnDroppedItem("bandage", 1, b.pos);
    // Remove bot
    this.scene.remove(b.humanoid.root);
    const idx = this.bots.indexOf(b);
    if (idx >= 0) this.bots.splice(idx, 1);
    // Respawn after 3 min — but only if this server is configured to have bots.
    // The first server (0/1 players) has serverBots=0, so dead bots never respawn there.
    setTimeout(() => {
      if (useGame.getState().serverBots === 0) return;
      const rng = mulberry32(Date.now());
      const ang = rng() * Math.PI * 2;
      const dist = randRange(rng, 40, 80);
      const x = this.playerPos.x + Math.cos(ang) * dist;
      const z = this.playerPos.z + Math.sin(ang) * dist;
      const y = this.terrain.getHeight(x, z);
      const h = makeHumanoid({ skinColor: 0xc28960 + Math.floor(rng() * 0x303030), shirtColor: 0x4a5a3a + Math.floor(rng() * 0x202020) });
      h.root.position.set(x, y, z);
      this.scene.add(h.root);
      const newBot: Bot = {
        humanoid: h,
        pos: new THREE.Vector3(x, y, z),
        vel: new THREE.Vector3(),
        yaw: rng() * Math.PI * 2,
        state: "wander",
        target: null,
        targetEntity: null,
        nextDecision: 0,
        hp: 100,
        attackCooldown: 0,
        clothing: { head: null, chest: pick(rng, ["basicShirt", "hideVest"]), legs: "basicTrousers", feet: null },
        weapon: pick(rng, ["woodSpear", "stoneSpear", "hatchet"]),
        carrying: [],
      };
      dressHumanoid(h, newBot.clothing);
      attachWeapon(h, newBot.weapon);
      this.bots.push(newBot);
    }, 180000);
    useGame.getState().toast("Bot eliminated!", "good");
  }

  spawnDroppedItem(id: string, qty: number, pos: THREE.Vector3) {
    // Combine with existing nearby dropped items
    const existing = this.droppedItems.find((d) => d.id === id && d.mesh.position.distanceTo(pos) < 2);
    if (existing && ITEMS[id].stack >= existing.qty + qty) {
      existing.qty += qty;
      return;
    }
    const def = ITEMS[id];
    const g = new THREE.Group();
    let mesh: THREE.Object3D;
    if (def.category === "resource" || def.category === "food" || def.category === "ammo") {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.25, 0.25),
        new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.8 })
      );
    } else {
      // Use held item model
      mesh = makeHeldItem(id);
    }
    g.add(mesh);
    g.position.copy(pos);
    g.position.y = this.terrain.getHeight(pos.x, pos.z) + 0.3;
    this.scene.add(g);
    this.droppedItems.push({ mesh: g, id, qty, vel: new THREE.Vector3((Math.random() - 0.5) * 2, 3, (Math.random() - 0.5) * 2), spawnTime: performance.now() });
  }

  // Drop a stack from the player's inventory or hotbar onto the ground at the
  // player's feet. Called by the store's `dropFromSlot` action via the
  // `window.__engine` bridge when the player shift-clicks an item slot.
  dropItem(inv: "main" | "hotbar", i: number) {
    const g = useGame.getState();
    const arr = inv === "main" ? g.inventory : g.hotbar;
    const stack = arr[i];
    if (!stack) return;
    // Spawn the pickup just in front of the player so it doesn't land on top of them.
    const fwd = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).multiplyScalar(-1);
    const dropPos = new THREE.Vector3(
      this.playerPos.x + fwd.x * 1.2,
      this.playerPos.y,
      this.playerPos.z + fwd.z * 1.2,
    );
    this.spawnDroppedItem(stack.id, stack.qty, dropPos);
    // Clear the slot in the store.
    if (inv === "main") {
      const next = [...g.inventory];
      next[i] = null;
      useGame.setState({ inventory: next });
    } else {
      const next = [...g.hotbar];
      next[i] = null;
      useGame.setState({ hotbar: next });
    }
  }

  // Phase 3: Restore placed builds visually after loading a save
  restorePlacedBuilds() {
    const g = useGame.getState();
    if (g.placed.length === 0) return;
    let maxId = 0;
    for (const p of g.placed) {
      // Re-create the 3D mesh
      const mesh = makeBuild(p.kind, p.rot);
      mesh.position.set(p.worldX, p.worldY, p.worldZ);
      mesh.rotation.y = (p.rot * Math.PI) / 2;
      this.scene.add(mesh);
      (p as any).mesh = mesh;
      if (p.id > maxId) maxId = p.id;
      // Restore crop visuals on farming plots
      if (p.kind === "farmingPlot") {
        const key = `${p.gx},${p.gz}`;
        const crop = g.crops[key];
        if (crop) {
          this.addCropVisual(p.gx, p.gz, crop.kind);
        }
      }
      // Phase 4: Restore beehive tracking on save load
      if (p.kind === "beehive") {
        useGame.getState().placeHive(p.id);
      }
    }
    // Sync buildIdCounter so new builds don't collide
    if (maxId >= buildIdCounter) buildIdCounter = maxId + 1;
  }

  // ===== Build placement =====
  updateGhost() {
    const g = useGame.getState();
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }
    if (!g.buildKind) return;
    const def = BUILDS[g.buildKind];
    const ghost = makeBuild(g.buildKind, g.buildRotation);
    ghost.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.material = new THREE.MeshBasicMaterial({
          color: def.color,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        });
        o.castShadow = false;
        o.receiveShadow = false;
      }
    });
    this.ghostMesh = ghost;
    this.scene.add(ghost);
  }

  tryPlaceBuild() {
    const g = useGame.getState();
    if (!g.buildKind || !this.ghostMesh) return;
    const def = BUILDS[g.buildKind];
    // Check inventory has the item
    if (g.countItem(def.itemId) <= 0) {
      g.toast(`No ${def.itemId} in inventory`, "warn");
      return;
    }
    if (!this.ghostValid) {
      g.toast("Cannot place here", "warn");
      return;
    }
    // Place
    const pos = this.ghostMesh.position;
    const rot = g.buildRotation;
    const placed = makeBuild(g.buildKind, rot);
    placed.position.copy(pos);
    placed.rotation.y = (rot * Math.PI) / 2;
    this.scene.add(placed);
    // Add to store
    const snap = findSnapTarget(g.buildKind, pos.x, pos.z, pos.y, g.placed);
    const pb: PlacedBuild = {
      id: buildIdCounter++,
      kind: g.buildKind,
      gx: snap.gx,
      gz: snap.gz,
      gy: snap.gy,
      rot,
      hp: 100,
      worldX: pos.x,
      worldY: pos.y,
      worldZ: pos.z,
    };
    (pb as any).mesh = placed;
    g.addPlaced(pb);
    g.removeItem(def.itemId, 1);
    g.emitAudio("place");
    // If campfire or torch, register a light
    if (g.buildKind === "campfire" || g.buildKind === "torch" || g.buildKind === "furnace") {
      // already has light in factory
    }
    // Phase 4: Beehive — start tracking honey accumulation
    if (g.buildKind === "beehive") {
      useGame.getState().placeHive(pb.id);
    }
    // Phase 4: Build-count achievements
    const placedCount = useGame.getState().placed.length;
    if (placedCount >= 1) useGame.getState().unlockAchievement("first_build");
    if (placedCount >= 5) useGame.getState().unlockAchievement("five_builds");
    if (placedCount >= 10) useGame.getState().unlockAchievement("ten_builds");
    if (placedCount >= 25) useGame.getState().unlockAchievement("twentyfive_builds");
  }

  dropSelected() {
    const g = useGame.getState();
    if (g.mode !== "play") return;
    const slot = g.hotbar[g.equipHotbarIndex];
    if (!slot) return;
    this.spawnDroppedItem(slot.id, 1, this.playerPos.clone().add(new THREE.Vector3(0, 0.5, 0)).add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1.5)));
    g.removeItem(slot.id, 1);
  }

  // ===== Main loop =====
  loop = () => {
    this.rafId = requestAnimationFrame(this.loop);
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    const t = this.timer.getElapsed();
    this.frame++;

    // FPS counter
    this.fpsAccum++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.fpsAccum / this.fpsTimer);
      useGame.getState().setFps(this.fps);
      this.fpsAccum = 0;
      this.fpsTimer = 0;
    }

    const g = useGame.getState();
    if (g.mode === "loading" || g.mode === "menu") {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    // Paused (in-game pause menu open) — freeze simulation but keep rendering
    // so the styled PauseMenu overlay has the world visible behind it.
    if (g.paused) {
      this.renderer.render(this.scene, this.camera);
      this.renderer.render(this.handScene, this.handCamera);
      return;
    }
    if (g.mode === "dead") {
      // still render
      this.updateWorld(dt, t);
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.updatePlayer(dt, t);
    this.updateWorld(dt, t);
    this.updateBots(dt, t);
    this.updateAnimals(dt, t);
    this.updateTargetedEnemy(dt); // Phase 9: detect enemy in crosshair for HP bar
    this.updateBuild(dt, t);
    this.updateBuildV2(dt);
    this.updateDroppedItems(dt);
    this.updateHeldView(dt, t);
    this.updateWeather(dt);
    this.particles.update(dt); // Update all VFX particles

    // Update store time of day (slow)
    const newT = (g.timeOfDay + dt * 0.0035) % 1; // ~5 min day cycle... slower
    // Actually we want a full day ~ 24 minutes. 1/1440 per sec => 0.000694. Let's use that.
    // Phase 7: Apply dayNightSpeed multiplier to time progression
    const dayNightSpeed = useGame.getState().dayNightSpeed;
    const prevT = g.timeOfDay;
    const realNewT = (g.timeOfDay + dt * 0.00072 * dayNightSpeed) % 1;
    useGame.getState().setTimeOfDay(realNewT);
    this.sky.timeOfDay = realNewT;

    // Phase 3: Increment dayCount when crossing midnight
    if (prevT > 0.9 && realNewT < 0.1) {
      const curDay = useGame.getState().dayCount;
      useGame.setState({ dayCount: curDay + 1 });
      useGame.getState().toast(`🌅 Day ${curDay + 1} dawns...`, "good");
      // Phase 9: Activity log
      useGame.getState().pushActivity(`Day ${curDay + 1} began`, "🌅", "good");
      // Phase 4: day-count achievements
      const d = curDay + 1;
      if (d >= 3) useGame.getState().unlockAchievement("day_3");
      if (d >= 7) useGame.getState().unlockAchievement("day_7");
      if (d >= 14) useGame.getState().unlockAchievement("day_14");
      // Phase 10: survivor_5 achievement
      if (d >= 5) useGame.getState().unlockAchievement("survivor_5");
    }

    // Stats tick — no longer needs shelter/fire args (warmth system removed).
    useGame.getState().tickStats(dt);
    // Level-up flash tick removed (Task 9 — leveling system removed).

    // Phase 3: Tick crops, drying racks, rain barrels
    useGame.getState().tickCrops(dt);
    useGame.getState().tickDrying(dt);
    useGame.getState().tickRainBarrels(dt, useGame.getState().weather === "rainy");
    this.updateCropVisuals();

    // Phase 4: Tick hives (throttled to ~1Hz to avoid store churn)
    this.hiveTickTimer += dt;
    if (this.hiveTickTimer >= 1.0) {
      useGame.getState().tickHives(this.hiveTickTimer);
      this.hiveTickTimer = 0;
    }

    // Trader update call removed (Task 8) — updateTrader is now a no-op.

    // Phase 6: Companion NPC AI
    this.updateCompanion(dt);

    // Phase 6: Electric light power state
    this.electricLightTimer += dt;
    if (this.electricLightTimer >= 0.5) {
      this.electricLightTimer = 0;
      this.updateElectricLights();
    }

    // Phase 4: Night Owl achievement progress (player awake through deep night)
    useGame.getState().tickNightOwl(dt, realNewT);

    // Phase 5: Boss spawn + update + quest board proximity + raft riding + buff tick
    this.updateBoss(dt, t);
    this.questBoardTickTimer += dt;
    if (this.questBoardTickTimer >= 0.3) {
      this.questBoardTickTimer = 0;
      this.updateQuestBoardProximity();
    }
    this.updateRaft(dt);
    useGame.getState().tickBuffs(dt);
    // Phase 6: damage numbers cleanup
    useGame.getState().tickDamageNumbers();
    // Phase 6: buffRegen HP restoration
    const regenBuff = useGame.getState().buffRegen;
    if (regenBuff > 0) {
      useGame.getState().heal(3 * dt);
    }
    // Phase 6: buffNightVision — boost ambient light at night
    const nvBuff = useGame.getState().buffNightVision;
    if (nvBuff > 0) {
      const tod = useGame.getState().timeOfDay;
      const isNightTod = tod > 0.78 || tod < 0.22;
      const nightAmt = isNightTod ? 1 : (tod > 0.68 || tod < 0.32
        ? Math.max(0, Math.min((0.78 - tod) / 0.10, (tod - 0.22) / 0.10))
        : 0);
      if (nightAmt > 0.3) {
        if (this.scene.children.length > 0) {
          // Find ambient light and boost it
          this.scene.traverse((obj) => {
            if (obj instanceof THREE.AmbientLight) {
              obj.intensity = Math.max(obj.intensity, 0.15 + nightAmt * 0.3);
            }
          });
        }
        // Reduce fog at night
        if (this.scene.fog instanceof THREE.FogExp2) {
          this.scene.fog.density = Math.min(this.scene.fog.density, 0.002);
        }
      }
    }
    // Phase 5: survivalist achievement
    if (useGame.getState().dayCount >= 21) {
      useGame.getState().unlockAchievement("survivalist");
    }

    // Phase 7: Radiation zone detection
    this.updateRadiationZones(dt);

    // Prompt detection
    this.updatePrompt();

    // Proximity-based crafting stations (Phase 2)
    this.updateProximityStations();

    // Performance: distance-based visibility culling, throttled to ~5 Hz.
    // Iterating 500+ world objects every frame would itself tank FPS, so we
    // batch the check into a 0.2s window. The hysteresis in updateVisibility
    // also keeps the visible/invisible flip stable when crossing the boundary.
    this.visibilityTimer += dt;
    if (this.visibilityTimer > 0.2) {
      this.visibilityTimer = 0;
      this.updateVisibility();
    }

    // Minimap update (throttled ~5fps)
    this.minimapTimer += dt;
    if (this.minimapTimer > 0.2) {
      this.minimapTimer = 0;
      this.updateMinimap();
    }

    // Audio ambient update (throttled ~2fps)
    this.audioAmbientTimer += dt;
    if (this.audioAmbientTimer > 0.5) {
      this.audioAmbientTimer = 0;
      // nearFire is still useful for audio (fire crackling) even though the
      // warmth system is gone.
      const nearFire = this.checkNearFire();
      audioEngine.setAmbient(useGame.getState().weather, nearFire);
    }

    // Footstep audio (driven by movement) + dust particles
    this.footstepTimer += dt;
    const kb = g.keybinds;
    const moving = (this.keys[kb.forward] || this.keys[kb.left] || this.keys[kb.back] || this.keys[kb.right]) && this.playerOnGround && g.mode === "play";
    // "Sprinting" for footstep cadence is derived from the sprint key being held + moving.
    const sprinting = !!this.keys[kb.sprint] && moving;
    const stepInterval = sprinting ? 0.32 : 0.5;
    if (moving && this.footstepTimer > stepInterval) {
      this.footstepTimer = 0;
      useGame.getState().emitAudio("footstep");
      // Footstep dust particles
      const dustPos = this.playerPos.clone();
      dustPos.y += 0.1;
      this.particles.spawn(dustPos, sprinting ? 5 : 2, "dust", { spread: 0.8, speed: 1, life: 0.4, size: 0.7 });
      // Water splash if near lake
      for (const lake of this.lakes) {
        const ld = Math.sqrt((lake.x - this.playerPos.x) ** 2 + (lake.z - this.playerPos.z) ** 2);
        if (ld < lake.r + 1) {
          this.particles.spawn(dustPos, sprinting ? 8 : 4, "water", { spread: 0.6, speed: 2.5, life: 0.5, gravity: true, size: 0.8 });
          break;
        }
      }
    }

    // Phase 10: Threat direction indicators — scan for nearby hostiles (wolves at night, bears, attacking bots, boss)
    this.threatScanTimer += dt;
    if (this.threatScanTimer > 0.15) {
      this.threatScanTimer = 0;
      this.updateThreats();
    }

    // Phase 10: Day/night transition notifications
    this.updateDayNightNotify();

    // Phase 10: tick damage directions + day/night notify in store
    useGame.getState().tickDamageDirections();
    useGame.getState().tickDayNightNotify(dt);

    // Phase 11: Low-health warning intensity + heartbeat audio + stamina penalty tick
    const hp = useGame.getState().stats.health;
    let intensity = 0;
    if (hp <= 25 && hp > 0) {
      // Smooth ramp: hp 25→0 maps to intensity 0→1
      intensity = (25 - hp) / 25;
    }
    useGame.getState().setLowHealthIntensity(intensity);
    // Tick the heartbeat — if it returns true, an audio cue should fire this frame
    if (useGame.getState().tickHeartbeat(dt)) {
      audioEngine.handleCue("heartbeat");
    }

    // Cave discovery tracking removed (Task 6 — cave system removed).
    // caveEntrances is always empty now, so the loop below would never execute.

    this.renderer.render(this.scene, this.camera);
    // Render hand view on top
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.handScene, this.handCamera);
    this.renderer.autoClear = true;
  };

  updateProximityStations() {
    const g = useGame.getState();
    const stations = {
      workbench: false,
      furnace: false,
      campfire: false,
      anvil: false,
      dryingRack: false,
      rainBarrel: false,
      farmingPlot: false,
    };
    for (const p of g.placed) {
      const d = Math.sqrt((p.worldX - this.playerPos.x) ** 2 + (p.worldZ - this.playerPos.z) ** 2);
      if (d > 5) continue;
      if (p.kind === "workbench") stations.workbench = true;
      else if (p.kind === "furnace") stations.furnace = true;
      else if (p.kind === "campfire") stations.campfire = true;
      else if (p.kind === "anvil") stations.anvil = true;
      else if (p.kind === "dryingRack") stations.dryingRack = true;
      else if (p.kind === "rainBarrel") stations.rainBarrel = true;
      else if (p.kind === "farmingPlot") stations.farmingPlot = true;
      else if (p.kind === "cookingPot") stations.cookingPot = true;
    }
    g.setNearStations(stations);
  }

  updateRadiationZones(dt: number) {
    const g = useGame.getState();
    let inZone = false;
    for (const rz of this.radiationZones) {
      const dx = this.playerPos.x - rz.x;
      const dz = this.playerPos.z - rz.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < rz.radius) {
        inZone = true;
        break;
      }
    }
    g.setRadiationZoneActive(inZone);

    // Geiger counter toast feedback
    this.geigerCounterToastCooldown -= dt;
    const heldItem = g.hotbar[g.equipHotbarIndex];
    if (heldItem && heldItem.id === "geigerCounter" && (inZone || g.radiation > 0)) {
      if (this.geigerCounterToastCooldown <= 0) {
        this.geigerCounterToastCooldown = 5;
        const rad = g.radiation;
        let level = "LOW";
        if (rad >= 90) level = "LETHAL";
        else if (rad >= 60) level = "HIGH";
        else if (rad >= 30) level = "MEDIUM";
        g.toast(`📡 Radiation: ${level} (${Math.floor(rad)})`, rad >= 60 ? "danger" : rad >= 30 ? "warn" : "info");
      }
    }
  }

  // Phase 10: Scan for nearby hostiles and update the threats array for the UI directional indicators
  updateThreats() {
    const tod = useGame.getState().timeOfDay;
    const isNight = tod > 0.78 || tod < 0.22;
    const threats: { x: number; z: number; kind: string; distance: number; hostile: boolean }[] = [];
    const MAX_THREAT_DIST = 45; // 45m radius for threat indicator
    // Wolves — hostile at night
    for (const a of this.animals) {
      if (a.dead) continue;
      if (a.kind !== "wolf" && a.kind !== "bear") continue;
      const d = a.root.position.distanceTo(this.playerPos);
      if (d > MAX_THREAT_DIST) continue;
      // Wolves hostile at night or when attacking; bears hostile when attacking
      const hostile = a.kind === "wolf" ? (isNight || a.state === "attack") : a.state === "attack";
      if (!hostile) continue;
      threats.push({
        x: a.root.position.x - this.playerPos.x,
        z: a.root.position.z - this.playerPos.z,
        kind: a.kind,
        distance: d,
        hostile: true,
      });
    }
    // Hostile bots (in fight state)
    for (const b of this.bots) {
      if (b.state !== "fight") continue;
      const d = b.pos.distanceTo(this.playerPos);
      if (d > MAX_THREAT_DIST) continue;
      threats.push({
        x: b.pos.x - this.playerPos.x,
        z: b.pos.z - this.playerPos.z,
        kind: "bot",
        distance: d,
        hostile: true,
      });
    }
    // Boss (always hostile when active)
    if (this.boss && !this.boss.dead) {
      const d = this.boss.root.position.distanceTo(this.playerPos);
      if (d < MAX_THREAT_DIST * 1.5) {
        threats.push({
          x: this.boss.root.position.x - this.playerPos.x,
          z: this.boss.root.position.z - this.playerPos.z,
          kind: "boss",
          distance: d,
          hostile: true,
        });
      }
    }
    useGame.getState().setThreats(threats);
  }

  // Phase 10: Detect day/night phase transitions and fire notifications
  updateDayNightNotify() {
    const tod = useGame.getState().timeOfDay;
    let phase: string;
    if (tod > 0.78 || tod < 0.22) phase = "night";
    else if (tod < 0.30) phase = "dawn";
    else if (tod < 0.70) phase = "day";
    else phase = "dusk";
    if (phase !== this.lastDayPhase) {
      this.lastDayPhase = phase;
      // Also store in game state for persistence across renders
      useGame.getState().setDayNightNotify(phase, this.lastDayPhase);
      // Set proper notify text
      const notifyMap: Record<string, { text: string; icon: string }> = {
        dawn: { text: "🌅 Dawn breaks — a new day begins", icon: "🌅" },
        day: { text: "☀️ Full daylight", icon: "☀️" },
        dusk: { text: "🌆 Dusk falls — beware the dark", icon: "🌆" },
        night: { text: "🌙 Night has fallen — wolves hunt", icon: "🌙" },
      };
      const n = notifyMap[phase];
      if (n) useGame.getState().setDayNightNotify(n.text, n.icon);
    }
  }

  updateMinimap() {
    const g = useGame.getState();
    const px = this.playerPos.x;
    const pz = this.playerPos.z;
    const RANGE = 80; // show 80m radius around player
    // Trees (limit to nearby for perf)
    const trees: { x: number; z: number; cull: boolean }[] = [];
    for (const t of this.trees) {
      if (t.chopped) continue;
      const dx = t.group.position.x - px;
      const dz = t.group.position.z - pz;
      if (Math.abs(dx) > RANGE || Math.abs(dz) > RANGE) continue;
      trees.push({ x: dx, z: dz, cull: false });
      if (trees.length > 60) break;
    }
    const bots: { x: number; z: number }[] = this.bots.map((b) => ({ x: b.pos.x - px, z: b.pos.z - pz }));
    const animals: { x: number; z: number; kind: string }[] = this.animals.map((a) => ({ x: a.root.position.x - px, z: a.root.position.z - pz, kind: a.kind }));
    const placed: { x: number; z: number; kind: BuildKind }[] = g.placed.map((p) => ({ x: p.worldX - px, z: p.worldZ - pz, kind: p.kind }));
    const loot: { x: number; z: number }[] = this.lootObjs.filter((l) => !l.container.looted).map((l) => ({ x: l.container.position.x - px, z: l.container.position.z - pz }));
    const caveEntrances: { x: number; z: number }[] = this.caveEntrances.map((e) => ({ x: e.x - px, z: e.z - pz }));

    g.setMinimap({
      playerX: px,
      playerZ: pz,
      playerYaw: this.playerYaw,
      trees,
      bots,
      animals,
      placed,
      loot,
      caveEntrances,
      worldSize: 600,
    });
  }

  updatePlayer(dt: number, t: number) {
    const g = useGame.getState();
    // Photo mode branch removed (Task 10). The store's photoMode field is now
    // a no-op stub, so this branch would never execute anyway.
    // Movement
    // forward = direction the camera faces (yaw=0 → -Z, "north").
    // right   = player's right hand (yaw=0 → +X, "east").
    // The previous `right` had a stray `* -1` which flipped A/D — fixed.
    const kb = g.keybinds;
    const forward = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw)).multiplyScalar(-1);
    const right = new THREE.Vector3(Math.cos(this.playerYaw), 0, -Math.sin(this.playerYaw));
    const move = new THREE.Vector3();
    if (this.keys[kb.forward]) move.add(forward);
    if (this.keys[kb.back]) move.sub(forward);
    if (this.keys[kb.right]) move.add(right);
    if (this.keys[kb.left]) move.sub(right);
    const moving = move.lengthSq() > 0;
    if (moving) move.normalize();

    // Crouch is now a HOLD on the crouch key (default Ctrl) instead of a toggle.
    this.playerCrouch = !!this.keys[kb.crouch];

    // Sprint — no stamina gate anymore; always available when sprinting + moving.
    const wantSprint = !!this.keys[kb.sprint] && moving && !this.playerCrouch;
    let speed = this.playerCrouch ? 1.8 : 4.5;
    if (wantSprint) speed = 7.5;
    // Phase 5: swift buff +30% speed
    if (useGame.getState().buffSwift > 0) speed *= 1.3;
    // Dehydration slows the player noticeably (water <= 25).
    if (g.dehydrated) speed *= 0.55;
    // Walking through a bush slows the player (bushes have no collision, but
    // dense foliage impedes movement). Checked against the bush list.
    let inBush = false;
    for (let i = 0; i < this.bushes.length; i++) {
      const b = this.bushes[i];
      const bp = b.group.position;
      const dx = this.playerPos.x - bp.x;
      const dz = this.playerPos.z - bp.z;
      if (dx * dx + dz * dz < 1.0) { inBush = true; break; }
    }
    if (inBush) speed *= 0.45;
    // Phase 5: raft riding — freeze walking movement (raft handles it via updateRaft)
    if (useGame.getState().ridingRaft) speed = 0;
    if (g.mode !== "play") speed = 0; // freeze during inventory

    // Apply velocity
    this.playerVel.x = move.x * speed;
    this.playerVel.z = move.z * speed;
    // Phase 7: Radiation slows player by 30% when radiation > 60
    if (useGame.getState().radiation > 60) {
      this.playerVel.x *= 0.7;
      this.playerVel.z *= 0.7;
    }
    // Gravity
    this.playerVel.y -= 18 * dt;
    // Move — compute desired new XZ, then run the collision pass to prevent
    // walking through trees/rocks/builds/animals/houses. The collision pass
    // resolves per-axis (X then Z) so the player slides along walls.
    const prevX = this.playerPos.x;
    const prevZ = this.playerPos.z;
    const desiredX = prevX + this.playerVel.x * dt;
    const desiredZ = prevZ + this.playerVel.z * dt;
    const committed = this.collidePlayer(prevX, prevZ, desiredX, desiredZ);
    this.playerPos.x = committed.x;
    this.playerPos.z = committed.z;
    this.playerPos.y += this.playerVel.y * dt;

    // Phase 11: track distance walked (only horizontal movement, only when on ground)
    if (this.playerOnGround) {
      const horizDist = Math.sqrt(this.playerVel.x * this.playerVel.x + this.playerVel.z * this.playerVel.z) * dt;
      if (horizDist > 0.01) {
        // Throttle store writes to once per ~0.2s to avoid spamming
        this.distanceWalkedAccum += horizDist;
        if (this.distanceWalkedAccum > 0.5) {
          useGame.getState().addDistanceWalked(this.distanceWalkedAccum);
          this.distanceWalkedAccum = 0;
        }
      }
    }

    // Terrain collision
    const groundY = this.terrain.getHeight(this.playerPos.x, this.playerPos.z);
    const eyeH = this.playerCrouch ? 1.2 : this.playerEyeHeight;
    if (this.playerPos.y <= groundY + 0.01) {
      this.playerPos.y = groundY;
      this.playerVel.y = 0;
      this.playerOnGround = true;
    } else {
      this.playerOnGround = false;
    }

    // Don't allow walking outside world bounds
    const lim = 290;
    this.playerPos.x = Math.max(-lim, Math.min(lim, this.playerPos.x));
    this.playerPos.z = Math.max(-lim, Math.min(lim, this.playerPos.z));

    // Camera position with head bob
    if (moving && this.playerOnGround) {
      this.bobPhase += dt * (wantSprint ? 14 : 9);
    } else {
      this.bobPhase += dt * 1.5;
    }
    const bobAmt = moving ? (wantSprint ? 0.09 : 0.05) : 0.01;
    this.bobY = Math.sin(this.bobPhase * 2) * bobAmt;
    this.bobX = Math.cos(this.bobPhase) * bobAmt * 0.6;
    // Smooth sway recovery
    this.swayCurrent.lerp(this.swayTarget, 0.15);
    this.swayTarget.lerp(new THREE.Vector2(0, 0), 0.08);

    // Apply to camera
    this.camera.position.set(
      this.playerPos.x + this.bobX + this.swayCurrent.x,
      this.playerPos.y + eyeH + this.bobY + this.swayCurrent.y,
      this.playerPos.z
    );
    // Camera rotation (FPS)
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.y = this.playerYaw;
    this.camera.rotation.x = this.playerPitch;
    // Camera roll for sway
    this.camera.rotation.z = this.swayCurrent.x * -1.5;

    // Recoil decay
    if (this.heldRecoil > 0) this.heldRecoil = Math.max(0, this.heldRecoil - dt);

    // Mouse held — repeat attack
    if (this.mouseDown && g.mode === "play" && this.heldRecoil <= 0) {
      this.performAttack();
    }
  }

  updateWorld(dt: number, t: number) {
    // Sky updates
    this.sky.update(dt, t, this.playerPos);
    // Phase 3: night factor for fire light boost (1 at deep night, 0 in day)
    const tod = useGame.getState().timeOfDay;
    const isNightTod = tod > 0.78 || tod < 0.22;
    const nightAmt = isNightTod ? 1 : (tod > 0.68 || tod < 0.32
      ? Math.max(0, Math.min((0.78 - tod) / 0.10, (tod - 0.22) / 0.10))
      : 0);

    // Performance: rebuild the fire-light + flame-mesh cache when builds change
    // (cheap — runs only when fireCacheDirty is set, ~once per build action).
    if (this.fireCacheDirty) {
      this.fireCacheDirty = false;
      this.fireLights.length = 0;
      this.flameMeshes.length = 0;
      for (const p of useGame.getState().placed) {
        const mesh = (p as any).mesh as THREE.Object3D | undefined;
        if (!mesh) continue;
        mesh.traverse((o) => {
          if (o instanceof THREE.Mesh && o.name === "flame") this.flameMeshes.push(o);
          if (o instanceof THREE.PointLight) this.fireLights.push(o);
        });
      }
    }

    // Animate flame meshes + boost fire lights at night using the cached lists
    // (was: full-scene traverse() of every placed build every frame — very
    // expensive with many builds).
    const fl = this.flameMeshes;
    for (let i = 0; i < fl.length; i++) {
      const fm = fl[i];
      // Use a stable per-mesh phase derived from its position so flames don't
      // all flicker in unison.
      const phase = (fm.position.x + fm.position.z) * 7;
      fm.scale.y = 1 + Math.sin(t * 12 + phase) * 0.2;
      fm.scale.x = 1 + Math.sin(t * 9 + phase) * 0.1;
      fm.rotation.y = Math.sin(t * 7 + phase) * 0.1;
    }
    for (let i = 0; i < this.fireLights.length; i++) {
      const o = this.fireLights[i];
      const base = (o.userData.baseIntensity ?? o.intensity) as number;
      if (!o.userData.baseIntensity) o.userData.baseIntensity = o.intensity;
      const fireBoost = o.userData.fireLight ? 1 + nightAmt * 0.7 : 1;
      o.intensity = base * fireBoost * (0.85 + Math.random() * 0.3);
    }

    // Hand-held torch item light also gets the night boost (separate small
    // scene — traverse is cheap here since held items have ~5 meshes max).
    if (this.heldItemMesh) {
      this.heldItemMesh.traverse((o) => {
        if (o instanceof THREE.PointLight) {
          const base = (o.userData.baseIntensity ?? o.intensity) as number;
          if (!o.userData.baseIntensity) o.userData.baseIntensity = o.intensity;
          const fireBoost = o.userData.fireLight ? 1 + nightAmt * 0.7 : 1;
          o.intensity = base * fireBoost * (0.85 + Math.random() * 0.3);
        }
      });
    }

    // Phase 4: Animate beehive bees (hover + orbit)
    for (const p of useGame.getState().placed) {
      if (p.kind !== "beehive") continue;
      const mesh = (p as any).mesh as THREE.Group;
      if (!mesh) continue;
      const bees = mesh.userData.bees as THREE.Mesh[] | undefined;
      if (!bees) continue;
      for (const bee of bees) {
        const phase = (bee.userData.beePhase ?? 0) + t;
        const idx = bee.userData.beeIndex ?? 0;
        const ang = phase * 1.4 + idx * (Math.PI / 2);
        const r = 0.55 + Math.sin(phase * 0.7) * 0.18;
        bee.position.set(
          Math.cos(ang) * r,
          0.55 + Math.sin(phase * 1.7) * 0.22,
          Math.sin(ang) * r
        );
        bee.rotation.y = -ang;
      }
    }
  }

  updateBots(dt: number, t: number) {
    const playerPos = this.playerPos;
    for (const b of this.bots) {
      // AI decisions
      if (t > b.nextDecision) {
        b.nextDecision = t + 2 + Math.random() * 4;
        // decide
        const distToPlayer = b.pos.distanceTo(playerPos);
        // 30% chance: fight player if close
        if (distToPlayer < 12 && Math.random() < 0.4) {
          b.state = "fight";
          b.targetEntity = { type: "player" };
        } else if (b.state === "fight" && distToPlayer > 25) {
          b.state = "wander";
          b.targetEntity = null;
        } else if (b.state !== "fight") {
          // pick random behavior
          const r = Math.random();
          if (r < 0.4) {
            b.state = "gather";
            // find nearest tree
            let nearest: TreeInstance | null = null;
            let nd = Infinity;
            for (const tr of this.trees) {
              if (tr.chopped) continue;
              const d = tr.group.position.distanceTo(b.pos);
              if (d < nd && d < 30) { nd = d; nearest = tr; }
            }
            if (nearest) b.target = nearest.group.position.clone();
            else b.state = "wander";
          } else if (r < 0.7) {
            b.state = "wander";
            b.target = b.pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20));
          } else {
            // build: just stand still for a bit (simulate)
            b.state = "build";
            b.target = b.pos.clone();
          }
        }
      }

      // Execute state
      let moveTarget: THREE.Vector3 | null = null;
      let attackTarget: any | null = null;
      if (b.state === "wander" && b.target) moveTarget = b.target;
      else if (b.state === "gather" && b.target) moveTarget = b.target;
      else if (b.state === "fight" && b.targetEntity?.type === "player") {
        moveTarget = playerPos;
        attackTarget = { type: "player", pos: playerPos };
      }

      if (moveTarget) {
        const dir = new THREE.Vector3().subVectors(moveTarget, b.pos);
        dir.y = 0;
        const d = dir.length();
        if (d > 1.5) {
          dir.normalize();
          const sp = b.state === "fight" ? 5 : 3;
          b.pos.x += dir.x * sp * dt;
          b.pos.z += dir.z * sp * dt;
          b.yaw = Math.atan2(dir.x, dir.z);
          // terrain follow
          b.pos.y = this.terrain.getHeight(b.pos.x, b.pos.z);
          animateHumanoid(b.humanoid, t, true, b.state === "fight" ? 1 : 0.4, false);
        } else {
          // arrived — gather / attack
          if (b.state === "gather") {
            // chop tree
            const tree = this.trees.find((tr) => !tr.chopped && tr.group.position.distanceTo(b.pos) < 3);
            if (tree) {
              tree.hp -= 20;
              animateHumanoid(b.humanoid, t, false, 0, true);
              if (tree.hp <= 0) {
                this.chopTree(tree);
                b.carrying.push({ id: "wood", qty: 5 });
              }
            }
          } else if (b.state === "fight" && attackTarget && b.attackCooldown <= 0) {
            // attack player
            const dmg = b.weapon === "stoneSpear" ? 15 : b.weapon === "woodSpear" ? 10 : 8;
            useGame.getState().damage(dmg);
            useGame.getState().setBleeding(2);
            // Phase 10: damage direction indicator — angle from player to attacker
            const dx = b.pos.x - this.playerPos.x;
            const dz = b.pos.z - this.playerPos.z;
            const worldAngle = Math.atan2(dx, dz); // 0 = north (+z), pi/2 = east (+x)
            // Convert to screen-relative angle (subtract player yaw, where playerYaw rotates camera)
            // playerYaw: 0 = facing -z (north). camera.rotation.y = playerYaw, forward = (-sin(yaw), 0, -cos(yaw))
            // Screen angle: 0 = front, positive = right (clockwise)
            const screenAngle = worldAngle - (this.playerYaw + Math.PI);
            useGame.getState().addDamageDirection(screenAngle, dmg);
            // Phase 9: Activity log
            useGame.getState().pushActivity(`Bot hit you (-${dmg} HP)`, "🤖", "danger");
            b.attackCooldown = 1.2;
            animateHumanoid(b.humanoid, t, false, 0, true);
          }
        }
      } else {
        animateHumanoid(b.humanoid, t, false, 0, false);
      }
      b.attackCooldown = Math.max(0, b.attackCooldown - dt);

      // Apply transform
      b.humanoid.root.position.copy(b.pos);
      b.humanoid.root.rotation.y = b.yaw;
    }
  }

  updateAnimals(dt: number, t: number) {
    const timeOfDay = useGame.getState().timeOfDay;
    const isNight = timeOfDay > 0.78 || timeOfDay < 0.22;
    for (const a of this.animals) {
      if (a.dead) {
        a.corpseTime += dt;
        continue;
      }
      // Decrement attack cooldown
      a.attackCooldown = Math.max(0, a.attackCooldown - dt);
      if (t > a.nextDecision) {
        // Rabbits make faster decisions; wolves make normal; others standard
        const decisionGap = a.kind === "rabbit" ? (1.2 + Math.random() * 1.5) : (2 + Math.random() * 3);
        a.nextDecision = t + decisionGap;
        const distToPlayer = a.root.position.distanceTo(this.playerPos);

        // Rabbit AI: flee aggressively when player within 8m, fast movement (3x deer)
        if (a.kind === "rabbit") {
          if (distToPlayer < 8) {
            a.state = "flee";
            // Run away from player — set target further than deer (15m)
            a.target = a.root.position.clone().add(
              new THREE.Vector3(
                a.root.position.x - this.playerPos.x,
                0,
                a.root.position.z - this.playerPos.z
              ).normalize().multiplyScalar(20)
            );
          } else if (a.state === "flee" && distToPlayer > 14) {
            // resume wander once safe
            a.state = "wander";
            a.target = a.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10));
          } else if (a.state !== "flee") {
            a.state = "wander";
            a.target = a.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 12, 0, (Math.random() - 0.5) * 12));
          }
          continue;
        }

        // Wolf AI: hostile at night, passive during day
        if (a.kind === "wolf") {
          if (isNight && distToPlayer < 30) {
            // Hostile — chase player. Pack behavior: aim at player.
            a.state = "attack";
            a.target = this.playerPos.clone();
            // Occasional howl cue
            if (Math.random() < 0.05) useGame.getState().emitAudio("wolfHowl");
          } else if (!isNight) {
            // Daytime — wander passively, stay near pack anchor (other pack members)
            // Find pack centroid
            if (a.packId !== undefined) {
              const packMembers = this.animals.filter((o) => o.packId === a.packId && !o.dead);
              if (packMembers.length > 0) {
                const cx = packMembers.reduce((s, m) => s + m.root.position.x, 0) / packMembers.length;
                const cz = packMembers.reduce((s, m) => s + m.root.position.z, 0) / packMembers.length;
                // wander near centroid
                a.target = new THREE.Vector3(
                  cx + (Math.random() - 0.5) * 16,
                  0,
                  cz + (Math.random() - 0.5) * 16
                );
              } else {
                a.target = a.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 14, 0, (Math.random() - 0.5) * 14));
              }
            } else {
              a.target = a.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 14, 0, (Math.random() - 0.5) * 14));
            }
            a.state = "wander";
          } else {
            // Night but player far — patrol around current pos
            a.state = "wander";
            a.target = a.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 18, 0, (Math.random() - 0.5) * 18));
          }
          continue;
        }

        // Existing: bear / boar / deer
        if (a.kind === "bear" && distToPlayer < 14) {
          a.state = "attack";
          a.target = this.playerPos.clone();
        } else if (distToPlayer < 8 && a.kind !== "bear") {
          a.state = "flee";
          a.target = a.root.position.clone().add(
            new THREE.Vector3(
              a.root.position.x - this.playerPos.x,
              0,
              a.root.position.z - this.playerPos.z
            ).normalize().multiplyScalar(15)
          );
        } else if (a.state !== "attack") {
          a.state = "wander";
          a.target = a.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 18, 0, (Math.random() - 0.5) * 18));
        }
      }
      if (a.target) {
        const dir = new THREE.Vector3().subVectors(a.target, a.root.position);
        dir.y = 0;
        const d = dir.length();
        // Task 1: separation distance — attacking animals stop at
        // (animalRadius + playerRadius) so they don't walk INTO the player.
        // The existing attackRange (2.2-2.5m) is greater than this stop
        // distance, so the animal can still attack from where it stops.
        const animalRad = a.kind === "bear" ? 1.2 : a.kind === "boar" ? 0.9 : a.kind === "deer" ? 0.8 : a.kind === "wolf" ? 0.7 : 0.4;
        const stopDist = a.state === "attack" ? animalRad + this.playerRadius + 0.05 : 0.6;
        if (d > stopDist) {
          dir.normalize();
          // Speeds: rabbit fast (3x deer = 6), wolf chase (6), bear attack (5), flee (6), wander (2)
          let sp = 2;
          if (a.state === "flee") sp = a.kind === "rabbit" ? 6 : 6;
          else if (a.state === "attack") sp = a.kind === "wolf" ? 6 : a.kind === "bear" ? 5 : 5;
          else if (a.kind === "rabbit") sp = 2.5; // rabbits wander a bit faster too
          a.root.position.x += dir.x * sp * dt;
          a.root.position.z += dir.z * sp * dt;
          // Animal meshes face -Z in their local frame (head at -Z, tail at +Z),
          // so we add π to the yaw to point the head toward the movement direction.
          a.root.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;
          a.root.position.y = this.terrain.getHeight(a.root.position.x, a.root.position.z);
          // animate legs
          const ph = t * (a.state === "flee" ? 14 : a.state === "attack" ? 12 : 8);
          if (a.legFL) a.legFL.rotation.x = Math.sin(ph) * 0.5;
          if (a.legFR) a.legFR.rotation.x = -Math.sin(ph) * 0.5;
          if (a.legBL) a.legBL.rotation.x = -Math.sin(ph) * 0.5;
          if (a.legBR) a.legBR.rotation.x = Math.sin(ph) * 0.5;
          // Ear twitch for rabbits/wolves
          if (a.ears && a.ears.length === 2) {
            const twitch = Math.sin(t * 4) * 0.08;
            a.ears[0].rotation.x = (a.kind === "rabbit" ? -0.1 : 0) + twitch;
            a.ears[1].rotation.x = (a.kind === "rabbit" ? -0.1 : 0) - twitch;
          }
        } else if (a.state === "attack") {
          // attack player
          const attackRange = a.kind === "wolf" ? 2.2 : 2.5;
          if (a.root.position.distanceTo(this.playerPos) < attackRange) {
            if (a.attackCooldown <= 0) {
              // Wolf: 8 dmg, 1.2s cooldown. Bear: 25 dmg. Boar: 8 dmg.
              const dmg = a.kind === "bear" ? 25 : a.kind === "wolf" ? 8 : 8;
              useGame.getState().damage(dmg);
              useGame.getState().setBleeding(a.kind === "wolf" ? 2 : 3);
              // Phase 10: damage direction indicator
              const dx = a.root.position.x - this.playerPos.x;
              const dz = a.root.position.z - this.playerPos.z;
              const worldAngle = Math.atan2(dx, dz);
              const screenAngle = worldAngle - (this.playerYaw + Math.PI);
              useGame.getState().addDamageDirection(screenAngle, dmg);
              // Phase 9: Activity log
              const animalIcon: Record<string, string> = { wolf: "🐺", bear: "🐻", boar: "🐗" };
              useGame.getState().pushActivity(`${a.kind.charAt(0).toUpperCase() + a.kind.slice(1)} attacked you (-${dmg} HP)`, animalIcon[a.kind] ?? "⚠️", "danger");
              a.attackCooldown = a.kind === "wolf" ? 1.2 : 1.5;
              useGame.getState().emitAudio("hit");
              // Wolf jaw opens during attack — snap head forward
              if (a.head && a.kind === "wolf") {
                a.head.rotation.x = 0.5;
              }
            }
          }
        }
      }
      // Reset wolf head tilt after attack
      if (a.kind === "wolf" && a.head && a.attackCooldown < 0.9) {
        a.head.rotation.x *= 0.85;
      }
    }
  }

  // Phase 4: Trader wandering + proximity detection
  // Trader NPC removed (Task 8) — method kept as a no-op so the loop call
  // site doesn't need a separate guard. this.trader is always null now.
  updateTrader(_dt: number, _t: number) {
    return;
  }

  // Phase 6: Companion NPC AI
  updateCompanion(dt: number) {
    const comp = this.companion;
    if (!comp) return;

    // Handle dead companion — respawn after 60s
    if (comp.dead) {
      comp.respawnTimer -= dt;
      if (comp.respawnTimer <= 0) {
        comp.dead = false;
        comp.hp = 100;
        comp.state = "follow";
        comp.carrying = [];
        // Respawn at player location
        comp.pos.copy(this.playerPos);
        comp.pos.y = this.terrain.getHeight(comp.pos.x, comp.pos.z);
        comp.root.position.copy(comp.pos);
        comp.root.visible = true;
        useGame.getState().toast("🤝 Companion has returned!", "good");
      }
      return;
    }

    const distToPlayer = comp.pos.distanceTo(this.playerPos);
    const speed = 3.5;

    // Phase 7: Read companion command from store
    const companionCommand = useGame.getState().companionCommand;

    // Flee from wolves/bears within 15m — but NOT when command is "attack"
    let fleeing = false;
    if (companionCommand !== "attack") {
      for (const a of this.animals) {
        if (a.dead) continue;
        if (a.kind !== "wolf" && a.kind !== "bear") continue;
        const d = comp.pos.distanceTo(a.root.position);
        if (d < 15) {
          // Flee away from animal
          const dir = comp.pos.clone().sub(a.root.position).normalize();
          comp.pos.x += dir.x * 5 * dt;
          comp.pos.z += dir.z * 5 * dt;
          fleeing = true;
          comp.state = "follow";
          break;
        }
      }
    }

    if (!fleeing) {
      // Phase 7: Companion AI driven by command
      if (companionCommand === "wait") {
        // Wait: companion stays in place, doesn't move
        comp.state = "follow";
        // no movement
      } else if (companionCommand === "follow") {
        // Follow: current behavior — follow player at 4m distance
        if (comp.state === "follow") {
          if (distToPlayer > 4) {
            const dir = this.playerPos.clone().sub(comp.pos).normalize();
            comp.pos.x += dir.x * speed * dt;
            comp.pos.z += dir.z * speed * dt;
            comp.yaw = Math.atan2(dir.x, dir.z);
          }
          // Chance to gather when near a tree/rock
          if (distToPlayer < 15 && Math.random() < 0.003) {
            comp.state = "gather";
            comp.gatherTimer = 5;
          }
        } else if (comp.state === "gather") {
          comp.gatherTimer -= dt;
          let nearestDist = 15;
          let nearestPos: THREE.Vector3 | null = null;
          for (const tree of this.trees) {
            if (tree.chopped) continue;
            const d = comp.pos.distanceTo(tree.group.position);
            if (d < nearestDist) { nearestDist = d; nearestPos = tree.group.position; }
          }
          for (const rock of this.rocks) {
            const d = comp.pos.distanceTo(rock.group.position);
            if (d < nearestDist) { nearestDist = d; nearestPos = rock.group.position; }
          }
          if (nearestPos) {
            const dir = nearestPos.clone().sub(comp.pos).normalize();
            comp.pos.x += dir.x * speed * dt;
            comp.pos.z += dir.z * speed * dt;
            comp.yaw = Math.atan2(dir.x, dir.z);
          }
          if (comp.gatherTimer <= 4.5 && comp.gatherTimer > 4.4) {
            const resources = ["wood", "stone", "berries", "fiber", "cloth"];
            const pick = resources[Math.floor(Math.random() * resources.length)];
            const existing = comp.carrying.find(c => c.id === pick);
            if (existing) existing.qty += 1;
            else comp.carrying.push({ id: pick, qty: 1 });
          }
          if (comp.gatherTimer <= 0) {
            comp.state = "follow";
          }
        }
      } else if (companionCommand === "gather") {
        // Gather: actively seek nearby resources (trees/bushes/rocks within 20m) and harvest them
        comp.state = "gather";
        comp.gatherTimer -= dt;
        // Find nearest tree, bush, or rock within 20m
        let nearestDist = 20;
        let nearestPos: THREE.Vector3 | null = null;
        for (const tree of this.trees) {
          if (tree.chopped) continue;
          const d = comp.pos.distanceTo(tree.group.position);
          if (d < nearestDist) { nearestDist = d; nearestPos = tree.group.position; }
        }
        for (const bush of this.bushes) {
          if (!bush.hasBerries) continue;
          const d = comp.pos.distanceTo(bush.group.position);
          if (d < nearestDist) { nearestDist = d; nearestPos = bush.group.position; }
        }
        for (const rock of this.rocks) {
          const d = comp.pos.distanceTo(rock.group.position);
          if (d < nearestDist) { nearestDist = d; nearestPos = rock.group.position; }
        }
        if (nearestPos) {
          const dir = nearestPos.clone().sub(comp.pos).normalize();
          comp.pos.x += dir.x * speed * dt;
          comp.pos.z += dir.z * speed * dt;
          comp.yaw = Math.atan2(dir.x, dir.z);
        } else {
          // No resources nearby — move toward player
          if (distToPlayer > 6) {
            const dir = this.playerPos.clone().sub(comp.pos).normalize();
            comp.pos.x += dir.x * speed * dt;
            comp.pos.z += dir.z * speed * dt;
            comp.yaw = Math.atan2(dir.x, dir.z);
          }
        }
        // Harvest resources periodically (every ~2s)
        if (Math.random() < dt * 0.5) {
          const resources = ["wood", "stone", "berries", "fiber", "cloth"];
          const pick = resources[Math.floor(Math.random() * resources.length)];
          const existing = comp.carrying.find(c => c.id === pick);
          if (existing) existing.qty += 1;
          else comp.carrying.push({ id: pick, qty: 1 });
        }
        // Return to player if carrying too much (8+ items)
        if (comp.carrying.reduce((sum, c) => sum + c.qty, 0) >= 8 && distToPlayer > 4) {
          const dir = this.playerPos.clone().sub(comp.pos).normalize();
          comp.pos.x += dir.x * speed * dt;
          comp.pos.z += dir.z * speed * dt;
          comp.yaw = Math.atan2(dir.x, dir.z);
        }
      } else if (companionCommand === "attack") {
        // Attack: companion attacks hostile animals (wolves/bears/boss) within 15m of player
        comp.state = "follow";
        let targetAnimal: AnimalInstance | null = null;
        let targetDist = 15;
        // Find nearest hostile animal within 15m of player
        for (const a of this.animals) {
          if (a.dead) continue;
          if (a.kind !== "wolf" && a.kind !== "bear") continue;
          const dToPlayer = this.playerPos.distanceTo(a.root.position);
          if (dToPlayer > 15) continue;
          const dToComp = comp.pos.distanceTo(a.root.position);
          if (dToComp < targetDist) {
            targetDist = dToComp;
            targetAnimal = a;
          }
        }
        // Also check boss
        if (this.boss && !this.boss.dead) {
          const bossDToPlayer = this.playerPos.distanceTo(this.boss.root.position);
          if (bossDToPlayer <= 15) {
            const bossDToComp = comp.pos.distanceTo(this.boss.root.position);
            if (bossDToComp < targetDist) {
              targetAnimal = null; // boss takes priority
              targetDist = bossDToComp;
            }
          }
        }
        // Move toward target and attack
        if (targetAnimal || (this.boss && !this.boss.dead && this.playerPos.distanceTo(this.boss.root.position) <= 15)) {
          const attackTarget = this.boss && !this.boss.dead && this.playerPos.distanceTo(this.boss.root.position) <= 15
            ? this.boss.root.position
            : targetAnimal!.root.position;
          const dir = attackTarget.clone().sub(comp.pos).normalize();
          comp.pos.x += dir.x * speed * 1.2 * dt; // slightly faster when attacking
          comp.pos.z += dir.z * speed * 1.2 * dt;
          comp.yaw = Math.atan2(dir.x, dir.z);
          // Deal damage when close enough (within 2.5m)
          const dToTarget = comp.pos.distanceTo(attackTarget);
          if (dToTarget < 2.5) {
            // Attack ~once per second
            if (Math.random() < dt * 1.0) {
              if (this.boss && !this.boss.dead && this.playerPos.distanceTo(this.boss.root.position) <= 15 && comp.pos.distanceTo(this.boss.root.position) < 2.5) {
                this.damageBoss(8); // companion does 8 damage per hit
              } else if (targetAnimal) {
                targetAnimal.hp -= 8;
                targetAnimal.state = "flee";
                targetAnimal.target = comp.pos.clone();
                if (targetAnimal.hp <= 0) {
                  this.killAnimal(targetAnimal);
                }
              }
            }
          }
        } else {
          // No hostiles nearby — follow player
          if (distToPlayer > 4) {
            const dir = this.playerPos.clone().sub(comp.pos).normalize();
            comp.pos.x += dir.x * speed * dt;
            comp.pos.z += dir.z * speed * dt;
            comp.yaw = Math.atan2(dir.x, dir.z);
          }
        }
      }
    }

    // Transfer items to player when within 4m
    if (comp.carrying.length > 0 && distToPlayer < 4) {
      for (const item of comp.carrying) {
        useGame.getState().addItem(item.id, item.qty);
      }
      if (!this.companionTransferred && comp.carrying.length > 0) {
        this.companionTransferred = true;
        useGame.getState().unlockAchievement("ally");
      }
      useGame.getState().toast(`🤝 Companion gave you: ${comp.carrying.map(c => `${c.qty}×${ITEMS[c.id]?.name ?? c.id}`).join(", ")}`, "good");
      comp.carrying = [];
    }

    // Update store
    useGame.getState().setCompanionNearby(distToPlayer < 10);
    useGame.getState().updateCompanionCarrying(comp.carrying);

    // Terrain follow
    comp.pos.x = Math.max(-290, Math.min(290, comp.pos.x));
    comp.pos.z = Math.max(-290, Math.min(290, comp.pos.z));
    comp.pos.y = this.terrain.getHeight(comp.pos.x, comp.pos.z);

    // Apply transform
    comp.root.position.copy(comp.pos);
    comp.root.rotation.y = comp.yaw;

    // Simple leg animation — walk when moving (follow/gather/attack), idle when waiting
    const isMoving = companionCommand === "follow" && (distToPlayer > 4 || comp.state === "gather")
      || companionCommand === "gather"
      || companionCommand === "attack";
    if (isMoving) {
      const walkCycle = Math.sin(Date.now() * 0.008) * 0.3;
      comp.legL.rotation.x = walkCycle;
      comp.legR.rotation.x = -walkCycle;
    } else {
      comp.legL.rotation.x = 0;
      comp.legR.rotation.x = 0;
    }
  }

  // Phase 6: Electric light power state update
  updateElectricLights() {
    const placed = useGame.getState().placed;
    // Find all generator positions
    const generators = placed.filter(p => p.kind === "generator");
    const genPositions = generators.map(g => new THREE.Vector3(g.worldX, g.worldY, g.worldZ));

    // Find electric lights in the scene by traversing
    const electricLights: THREE.Object3D[] = [];
    this.scene.traverse((obj) => {
      if (obj.userData?.isElectricLight) electricLights.push(obj);
    });

    for (const mesh of electricLights) {
      const buildId = mesh.userData.buildId;
      // Find the matching placed build
      const pb = placed.find(p => (p as any).mesh === mesh);
      if (!pb) continue;

      const lightPos = new THREE.Vector3(pb.worldX, pb.worldY, pb.worldZ);
      const isPowered = genPositions.some(gp => gp.distanceTo(lightPos) < 15);

      if (isPowered && !mesh.userData.powered) {
        // Power on: make bulb emissive + add PointLight
        mesh.userData.powered = true;
        const bulb = mesh.userData.bulb as THREE.Mesh | undefined;
        if (bulb && bulb.material instanceof THREE.MeshStandardMaterial) {
          bulb.material.emissive.setHex(0xfff5e0);
          bulb.material.emissiveIntensity = 2;
        }
        if (!mesh.userData.lightMesh) {
          const light = new THREE.PointLight(0xfff5e0, 6, 20);
          light.position.set(0, 0.3, 0);
          mesh.add(light);
          mesh.userData.lightMesh = light;
        }
        // Electrician achievement (one-shot, first powered light)
        useGame.getState().unlockAchievement("electrician");
      } else if (!isPowered && mesh.userData.powered) {
        // Power off
        mesh.userData.powered = false;
        const bulb = mesh.userData.bulb as THREE.Mesh | undefined;
        if (bulb && bulb.material instanceof THREE.MeshStandardMaterial) {
          bulb.material.emissive.setHex(0x000000);
          bulb.material.emissiveIntensity = 0;
        }
        if (mesh.userData.lightMesh) {
          mesh.remove(mesh.userData.lightMesh);
          mesh.userData.lightMesh.dispose?.();
          mesh.userData.lightMesh = null;
        }
      }
    }
  }

  // Phase 5: Boss creature (Direwolf Alpha) — DISABLED (Task 7).
  // spawnBoss() returns early; this.boss stays null. The despawn + AI update
  // branches below all guard on `if (this.boss && ...)` so they're no-ops.
  // Code kept intact so the boss can be re-enabled by removing the guard.
  updateBoss(dt: number, t: number) {
    const timeOfDay = useGame.getState().timeOfDay;
    const isDeepNight = timeOfDay > 0.85 || timeOfDay < 0.05;
    const isDaytime = timeOfDay > 0.3 && timeOfDay < 0.7;
    const bossKillDay = useGame.getState().bossKillDay;
    const dayCount = useGame.getState().dayCount;
    // Phase 6: boss can respawn after 3 days since last kill
    const bossCanSpawn = bossKillDay === 0 || (dayCount - bossKillDay >= 3);

    // Spawn logic: only at deep night, no boss already, can spawn, accumulates over time
    if (!this.boss && bossCanSpawn && isDeepNight) {
      this.bossSpawnTimer += dt;
      // Spawn after ~30s of deep night
      if (this.bossSpawnTimer > 30) {
        this.bossSpawnTimer = 0;
        this.spawnBoss();
      }
    } else if (!isDeepNight) {
      this.bossSpawnTimer = 0;
    }

    // Despawn logic: at daytime, if boss still alive, flee & despawn
    if (this.boss && isDaytime) {
      this.bossDespawnTimer += dt;
      if (this.bossDespawnTimer > 8) {
        // Flee & remove
        this.scene.remove(this.boss.root);
        this.boss = null;
        this.bossDespawnTimer = 0;
        useGame.getState().setBossActive(false);
        useGame.getState().toast("The direwolf alpha fled into the shadows...", "info");
      }
    } else if (this.boss) {
      this.bossDespawnTimer = 0;
    }

    // Update boss AI + position
    if (this.boss && !this.boss.dead) {
      const b = this.boss;
      b.attackCooldown = Math.max(0, b.attackCooldown - dt);

      // Decision-making
      if (t > b.nextDecision) {
        b.nextDecision = t + 1.5 + Math.random() * 2;
        const distToP = b.root.position.distanceTo(this.playerPos);
        // Boss always hunts player within 60m
        if (distToP < 60) {
          b.state = "attack";
          b.target = this.playerPos.clone();
        } else {
          b.state = "wander";
          b.target = b.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 14, 0, (Math.random() - 0.5) * 14));
        }
      }

      // Movement
      if (b.target) {
        const dir = new THREE.Vector3().subVectors(b.target, b.root.position);
        dir.y = 0;
        const d = dir.length();
        // Task 1: separation — boss stops at (bossRadius + playerRadius) so it
        // doesn't overlap the player. Boss radius ~1.5.
        const bossRad = 1.5;
        const stopDist = b.state === "attack" ? bossRad + this.playerRadius + 0.05 : 0.8;
        if (d > stopDist) {
          dir.normalize();
          // Boss is slower but relentless: 4 m/s
          const sp = b.state === "attack" ? 4.5 : 2;
          b.root.position.x += dir.x * sp * dt;
          b.root.position.z += dir.z * sp * dt;
          // Boss mesh faces -Z like other animals — add π to face movement dir.
          b.root.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;
          b.root.position.y = this.terrain.getHeight(b.root.position.x, b.root.position.z);
          // Animate legs (slow heavy pace)
          const ph = t * 6;
          if (b.legFL) b.legFL.rotation.x = Math.sin(ph) * 0.4;
          if (b.legFR) b.legFR.rotation.x = -Math.sin(ph) * 0.4;
          if (b.legBL) b.legBL.rotation.x = -Math.sin(ph) * 0.4;
          if (b.legBR) b.legBR.rotation.x = Math.sin(ph) * 0.4;
        } else if (b.state === "attack") {
          // Attack player
          if (b.attackCooldown <= 0) {
            // Boss damage: 35 per hit, 1.3s cooldown, applies bleeding
            useGame.getState().damage(35);
            useGame.getState().setBleeding(4);
            // Phase 10: damage direction indicator (boss attack)
            const dx = b.root.position.x - this.playerPos.x;
            const dz = b.root.position.z - this.playerPos.z;
            const worldAngle = Math.atan2(dx, dz);
            const screenAngle = worldAngle - (this.playerYaw + Math.PI);
            useGame.getState().addDamageDirection(screenAngle, 35);
            b.attackCooldown = 1.3;
            useGame.getState().emitAudio("hit");
            // Snap head forward (jaw bite)
            if (b.head) b.head.rotation.x = 0.6;
            // Wolf howl cue
            useGame.getState().emitAudio("wolfHowl");
          }
        }
      }
      // Reset head tilt after attack
      if (b.head && b.attackCooldown < 1.0) {
        b.head.rotation.x *= 0.85;
      }
      // Update store with current HP and position
      useGame.getState().setBossActive(true, b.hp, b.maxHp, { x: b.root.position.x, z: b.root.position.z });
    }
  }

  spawnBoss() {
    // Temporarily disabled (Task 7). The `if (false)` guard below ensures no
    // boss ever spawns. Remove the guard (or change to `if (true)`) to
    // re-enable. The rest of the spawn logic is intact.
    if (false) {
      // Spawn 40-60m from player, on flat terrain
      let bx = 0, bz = 0;
      for (let tries = 0; tries < 30; tries++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = 40 + Math.random() * 20;
        bx = this.playerPos.x + Math.cos(ang) * dist;
        bz = this.playerPos.z + Math.sin(ang) * dist;
        const slope = this.terrain.slopeAt(bx, bz);
        if (slope < 0.4) break;
      }
      const by = this.terrain.getHeight(bx, bz);
      const boss = makeDirewolfAlpha();
      boss.root.position.set(bx, by, bz);
      boss.pos.set(bx, by, bz);
      boss.root.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(boss.root);
      this.boss = boss;
      useGame.getState().setBossActive(true, boss.hp, boss.maxHp, { x: bx, z: bz });
      useGame.getState().emitAudio("wolfHowl");
    }
  }

  // Phase 5: damage boss when player attacks it
  damageBoss(n: number) {
    if (!this.boss || this.boss.dead) return;
    this.boss.hp = Math.max(0, this.boss.hp - n);
    useGame.getState().damageBoss(n);
    // Phase 6: floating damage number
    useGame.getState().addDamageNumber(n, this.boss.root.position.x, this.boss.root.position.z);
    // Spawn hit particles at boss body
    this.spawnHitParticles(this.boss.root.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xff2020);
    if (this.boss.hp <= 0) {
      this.killBoss();
    }
  }

  killBoss() {
    if (!this.boss) return;
    const b = this.boss;
    b.dead = true;
    // Drop legendary loot at boss position
    this.spawnDroppedItem("alphaPelt", 2, b.root.position.clone().add(new THREE.Vector3(0.5, 0.2, 0)));
    this.spawnDroppedItem("alphaFang", 2, b.root.position.clone().add(new THREE.Vector3(-0.5, 0.2, 0)));
    this.spawnDroppedItem("goldNugget", 5, b.root.position.clone().add(new THREE.Vector3(0, 0.2, 0.5)));
    this.spawnDroppedItem("hide", 8, b.root.position.clone().add(new THREE.Vector3(0, 0.2, -0.5)));
    // Remove boss mesh after 8s (so player can see corpse briefly)
    setTimeout(() => {
      if (this.boss && this.boss.dead) {
        this.scene.remove(this.boss.root);
        this.boss = null;
      }
    }, 8000);
    useGame.getState().killBoss();
    useGame.getState().incrementKills();
  }

  // Phase 5: Quest board proximity — sets questBoardNearby when within 4m
  updateQuestBoardProximity() {
    const g = useGame.getState();
    let near = false;
    let nearId: number | null = null;
    for (const p of g.placed) {
      if (p.kind !== "questBoard") continue;
      const d = Math.sqrt((p.worldX - this.playerPos.x) ** 2 + (p.worldZ - this.playerPos.z) ** 2);
      if (d < 4) {
        near = true;
        nearId = p.id;
        break;
      }
    }
    if (near !== g.questBoardNearby || nearId !== g.questBoardId) {
      useGame.getState().setQuestBoardNearby(near, nearId);
    }
  }

  // Phase 5: Raft riding — when riding, player floats at raft position; WASD paddles
  updateRaft(dt: number) {
    if (!useGame.getState().ridingRaft) {
      this.ridingRaftMesh = null;
      return;
    }
    // Find the raft mesh if we don't have it
    if (!this.ridingRaftMesh) {
      const g = useGame.getState();
      const raftBuild = g.placed.find((p) => p.id === g.raftId);
      if (raftBuild) {
        this.ridingRaftMesh = (raftBuild as any).mesh as THREE.Object3D;
      }
    }
    if (!this.ridingRaftMesh) return;
    // Move the raft (and player) with WASD input — slower than walking
    const speed = 4;
    const fwd = new THREE.Vector3(Math.sin(this.playerYaw), 0, Math.cos(this.playerYaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    let dx = 0, dz = 0;
    if (this.keys["w"]) { dx += fwd.x; dz += fwd.z; }
    if (this.keys["s"]) { dx -= fwd.x; dz -= fwd.z; }
    if (this.keys["a"]) { dx -= right.x; dz -= right.z; }
    if (this.keys["d"]) { dx += right.x; dz += right.z; }
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx = (dx / len) * speed * dt;
      dz = (dz / len) * speed * dt;
      this.ridingRaftMesh.position.x += dx;
      this.ridingRaftMesh.position.z += dz;
      // Clamp to world bounds
      const SIZE = 290;
      this.ridingRaftMesh.position.x = Math.max(-SIZE, Math.min(SIZE, this.ridingRaftMesh.position.x));
      this.ridingRaftMesh.position.z = Math.max(-SIZE, Math.min(SIZE, this.ridingRaftMesh.position.z));
      // Player rides on top of raft — set playerPos to raft position
      this.playerPos.x = this.ridingRaftMesh.position.x;
      this.playerPos.z = this.ridingRaftMesh.position.z;
      this.playerPos.y = 0.5; // float on water surface
    }
    // Slight bobbing motion
    this.ridingRaftMesh.position.y = 0.3 + Math.sin(performance.now() * 0.002) * 0.05;
  }

  // Photo mode method removed (Task 10). The store's togglePhotoMode / photoMode
  // are no-op stubs now, and the keybind handler was removed from onKeyDown.

  // Phase 9: Detect the enemy/animal the player is currently aiming at.
  // Updates `targetedEnemy` store state for the EnemyHealthBar UI.
  updateTargetedEnemy(_dt: number) {
    const g = useGame.getState();
    if (g.mode !== "play") {
      if (g.targetedEnemy) useGame.getState().setTargetedEnemy(null);
      return;
    }
    // Raycast forward from camera center
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    ray.far = 30; // 30m detection range
    let best: { kind: string; hp: number; maxHp: number; distance: number; name: string; icon: string } | null = null;
    // Check animals (priority: hostile first, then any animal)
    const candidates: { kind: string; hp: number; maxHp: number; distance: number; name: string; icon: string; isHostile: boolean }[] = [];
    for (const a of this.animals) {
      if (a.dead) continue;
      const dist = this.playerPos.distanceTo(a.root.position);
      if (dist > 30) continue;
      const hits = ray.intersectObject(a.root, true);
      if (hits.length === 0) continue;
      const nameMap: Record<string, { name: string; icon: string; hostile: boolean }> = {
        deer:    { name: "Deer",    icon: "🦌", hostile: false },
        boar:    { name: "Boar",    icon: "🐗", hostile: false },
        bear:    { name: "Bear",    icon: "🐻", hostile: true  },
        rabbit:  { name: "Rabbit",  icon: "🐰", hostile: false },
        wolf:    { name: "Wolf",    icon: "🐺", hostile: true  },
      };
      const info = nameMap[a.kind] ?? { name: a.kind, icon: "❓", hostile: false };
      candidates.push({
        kind: a.kind,
        hp: Math.max(0, a.hp),
        maxHp: a.maxHp,
        distance: dist,
        name: info.name,
        icon: info.icon,
        isHostile: info.hostile,
      });
    }
    // Sort: hostiles first, then by distance
    candidates.sort((a, b) => {
      if (a.isHostile !== b.isHostile) return a.isHostile ? -1 : 1;
      return a.distance - b.distance;
    });
    if (candidates.length > 0) {
      const c = candidates[0];
      best = { kind: c.kind, hp: c.hp, maxHp: c.maxHp, distance: c.distance, name: c.name, icon: c.icon };
    }
    // Also check boss
    if (this.boss && !this.boss.dead) {
      const dist = this.playerPos.distanceTo(this.boss.root.position);
      if (dist <= 30) {
        const hits = ray.intersectObject(this.boss.root, true);
        if (hits.length > 0) {
          // Boss takes priority over regular animals
          best = { kind: "boss", hp: Math.max(0, this.boss.hp), maxHp: this.boss.maxHp, distance: dist, name: "Direwolf Alpha", icon: "💀" };
        }
      }
    }
    // Only update store when value changes (avoid spurious re-renders)
    const cur = g.targetedEnemy;
    const same = (cur && best && cur.kind === best.kind && Math.abs(cur.hp - best.hp) < 0.5 && Math.abs(cur.distance - best.distance) < 0.5)
      || (!cur && !best);
    if (!same) {
      useGame.getState().setTargetedEnemy(best);
    }
  }

  updateBuild(dt: number, t: number) {
    const g = useGame.getState();
    if (!this.ghostMesh || !g.buildKind) return;
    // Position ghost at raycast point
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    ray.far = 8;
    // intersect terrain + existing builds
    const targets: THREE.Object3D[] = [this.terrain.mesh];
    for (const p of g.placed) {
      const m = (p as any).mesh as THREE.Object3D;
      if (m) targets.push(m);
    }
    const hits = ray.intersectObjects(targets, true);
    let pos: THREE.Vector3;
    if (hits.length > 0) {
      pos = hits[0].point.clone();
    } else {
      // place at fixed distance
      const fwd = this.camera.getWorldDirection(new THREE.Vector3());
      pos = this.playerPos.clone().add(fwd.multiplyScalar(3));
    }
    // Snap
    const snap = findSnapTarget(g.buildKind, pos.x, pos.z, pos.y, g.placed);
    this.ghostMesh.position.set(snap.worldX, snap.worldY, snap.worldZ);
    this.ghostMesh.rotation.y = (g.buildRotation * Math.PI) / 2;
    // Color valid/invalid
    this.ghostValid = true;
    // Check collision with existing builds
    for (const p of g.placed) {
      if (p.gx === snap.gx && p.gz === snap.gz && p.gy === snap.gy && p.kind === g.buildKind) {
        this.ghostValid = false;
        break;
      }
    }
    this.ghostMesh.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        (o.material as THREE.MeshBasicMaterial).color.setHex(this.ghostValid ? BUILDS[g.buildKind!].color : 0xff0000);
      }
    });
  }

  // ===== V2 Building System (Rust-style) =====
  updateBuildV2(dt: number) {
    const g = useGame.getState();
    const activeSlot = g.hotbar[g.equipHotbarIndex];
    const activeId = activeSlot?.id;

    // Handle ghost hologram when holding Building Plan with a piece selected
    if (activeId === "buildingPlan" && g.selectedBuildPiece) {
      if (!this.ghostV2Mesh) {
        this.createV2Ghost(g.selectedBuildPiece, "twig");
      }
      // Raycast to find snap position
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      ray.far = 10;
      const targets: THREE.Object3D[] = [this.terrain.mesh];
      for (const pb of g.placedV2) {
        const m = (pb as any).mesh as THREE.Object3D;
        if (m) targets.push(m);
      }
      // Also include legacy placed builds for compatibility
      for (const p of g.placed) {
        const m = (p as any).mesh as THREE.Object3D;
        if (m) targets.push(m);
      }
      const hits = ray.intersectObjects(targets, true);
      if (hits.length > 0) {
        const hitPoint = hits[0].point.clone();
        const hitNormal = hits[0].face?.normal ? hits[0].face.normal.clone() : null;
        const snap = findSnapPosition(
          g.selectedBuildPiece,
          hitPoint,
          hitNormal,
          g.placedV2,
          (x: number, z: number) => this.terrain.getHeight(x, z),
          g.buildPieceRotation,
        );
        if (snap) {
          this.ghostV2Mesh!.position.copy(snap.position);
          this.ghostV2Mesh!.rotation.y = (snap.rotation * Math.PI) / 2;
          this.ghostV2Valid = snap.valid;
          g.setHologramValid(snap.valid);
          // Adjust foundation Y position and update leg geometry
          if ((g.selectedBuildPiece === "squareFoundation" || g.selectedBuildPiece === "triangleFoundation") && this.ghostV2Mesh) {
            const fp = calculateFoundationPlacement(snap.position.x, snap.position.z, (x, z) => this.terrain.getHeight(x, z));
            this.ghostV2Mesh.position.y = fp.worldY;
            const newGeo = generateBuildGeometry(g.selectedBuildPiece, "twig", fp.legExtension);
            this.ghostV2Mesh.geometry.dispose();
            this.ghostV2Mesh.geometry = newGeo;
          }
        } else {
          this.ghostV2Valid = false;
          g.setHologramValid(false);
        }
      }
      // Update ghost color
      if (this.ghostV2Mesh) {
        const mat = this.ghostV2Mesh.material as THREE.MeshBasicMaterial;
        mat.color.setHex(this.ghostV2Valid ? getHologramColor(true) : getHologramColor(false));
      }
    } else {
      // Remove ghost if no longer holding Building Plan or no piece selected
      if (this.ghostV2Mesh) {
        this.scene.remove(this.ghostV2Mesh);
        this.ghostV2Mesh.geometry.dispose();
        (this.ghostV2Mesh.material as THREE.Material).dispose();
        this.ghostV2Mesh = null;
      }
      g.setSelectedBuildPiece(null);
    }

    // Handle hammer: detect what build piece the player is looking at
    if (activeId === "hammer") {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      ray.far = 5;
      const targets: THREE.Object3D[] = [];
      for (const pb of g.placedV2) {
        const m = (pb as any).mesh as THREE.Object3D;
        if (m) targets.push(m);
      }
      const hits = ray.intersectObjects(targets, true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        // Traverse up to find the root mesh that matches a placed build
        let buildId: number | null = null;
        let current: THREE.Object3D | null = hitObj;
        while (current) {
          for (const pb of g.placedV2) {
            const m = (pb as any).mesh as THREE.Object3D;
            if (m === current) { buildId = pb.id; break; }
          }
          if (buildId !== null) break;
          current = current.parent;
        }
        g.setHammerTargetId(buildId);
      } else {
        g.setHammerTargetId(null);
      }
      // Check for pending hammer action from radial menu
      if (g.pendingHammerAction) {
        this.tryHammerAction(g.pendingHammerAction);
        g.clearPendingHammerAction();
      }
      // Check for pending upgrade action
      if (g.pendingUpgradeTier) {
        this.tryUpgradeV2(g.pendingUpgradeTier);
        g.clearPendingUpgradeTier();
      }
    } else {
      g.setHammerTargetId(null);
    }
  }

  createV2Ghost(pieceType: BuildPieceType, tier: TierType, worldX?: number, worldZ?: number) {
    // Remove old ghost
    if (this.ghostV2Mesh) {
      this.scene.remove(this.ghostV2Mesh);
      this.ghostV2Mesh.geometry.dispose();
      (this.ghostV2Mesh.material as THREE.Material).dispose();
    }
    // Calculate leg extension for foundations
    let legExt = 0;
    if (pieceType === "squareFoundation" || pieceType === "triangleFoundation") {
      const wx = worldX ?? 0;
      const wz = worldZ ?? 0;
      legExt = calculateFoundationLegExtension(wx, wz, (x, z) => this.terrain.getHeight(x, z));
    }
    const geo = generateBuildGeometry(pieceType, tier, legExt);
    const mat = new THREE.MeshBasicMaterial({
      color: getHologramColor(true),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.ghostV2Mesh = new THREE.Mesh(geo, mat);
    this.ghostV2Mesh.renderOrder = 999;
    this.scene.add(this.ghostV2Mesh);
  }

  tryPlaceBuildV2() {
    const g = useGame.getState();
    if (!g.selectedBuildPiece || !this.ghostV2Mesh || !this.ghostV2Valid) {
      if (!this.ghostV2Valid) g.toast("Cannot place here", "warn");
      return;
    }
    const def = BUILD_PIECE_DEFS[g.selectedBuildPiece];
    // Check wood cost
    const woodNeeded = def.woodCost;
    if (g.countItem("wood") < woodNeeded) {
      g.toast(`Need ${woodNeeded} Wood to place ${g.selectedBuildPiece}`, "warn");
      return;
    }
    // Place the piece
    const pos = this.ghostV2Mesh.position.clone();
    const rot = g.buildPieceRotation;
    // Use snap rotation (engine stores it in buildPieceRotation via the ghost update)
    // Calculate leg extension for foundations
    let legExt = 0;
    if (g.selectedBuildPiece === "squareFoundation" || g.selectedBuildPiece === "triangleFoundation") {
      legExt = calculateFoundationLegExtension(pos.x, pos.z, (x, z) => this.terrain.getHeight(x, z));
    }
    const geo = generateBuildGeometry(g.selectedBuildPiece, "twig", legExt);
    const tv = TIER_VISUALS["twig"];
    const mat = new THREE.MeshStandardMaterial({
      color: tv.color,
      roughness: tv.roughness,
      metalness: tv.metalness,
      transparent: tv.opacity < 1,
      opacity: tv.opacity,
      flatShading: tv.flatShading,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.rotation.y = (rot * Math.PI) / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Calculate actual rotation from the ghost mesh (snap may have overridden it)
    const actualRot = Math.round((this.ghostV2Mesh.rotation.y / (Math.PI / 2)) % 4 + 4) % 4;
    const pb: PlacedBuildV2 = {
      id: buildIdCounter++,
      pieceType: g.selectedBuildPiece,
      tier: "twig",
      hp: TIER_HP["twig"],
      worldX: pos.x,
      worldY: pos.y,
      worldZ: pos.z,
      rotation: actualRot,
    };
    (pb as any).mesh = mesh;
    g.addPlacedV2(pb);
    g.removeItem("wood", woodNeeded);
    g.emitAudio("place");
    g.toast(`Placed ${g.selectedBuildPiece} (Twig)`, "good");
  }

  // ===== Deployable Placement =====
  tryPlaceDeployable(itemType: DeployableType) {
    const g = useGame.getState();
    const def = DEPLOYABLE_DEFS[itemType];

    // Raycast to find where to place
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    ray.far = 5;
    const targets: THREE.Object3D[] = [this.terrain.mesh];
    for (const pb of g.placedV2) {
      const m = (pb as any).mesh as THREE.Object3D;
      if (m) targets.push(m);
    }
    const hits = ray.intersectObjects(targets, true);
    if (hits.length === 0) return;

    const hitPoint = hits[0].point.clone();
    let placePos = hitPoint.clone();
    let placeRot = 0;
    let attachedBuildId: number | null = null;

    // Doors snap to doorway sockets
    if (def.snapToSocket && itemType === "woodenDoor") {
      const doorSocket = findDoorwaySockets(g.placedV2, hitPoint, 3.0);
      if (!doorSocket) {
        g.toast("Must place door in a Doorway frame", "warn");
        return;
      }
      if (g.placedDeployables.some(d => d.attachedToBuildId === doorSocket.buildId)) {
        g.toast("This doorway already has a door", "warn");
        return;
      }
      placePos = doorSocket.position;
      placeRot = doorSocket.rotation;
      attachedBuildId = doorSocket.buildId;
    } else {
      // Free-place: snap Y to terrain or top of hit surface
      placePos.y = hitPoint.y;
    }

    // Check inventory
    if (g.countItem(itemType) < 1) {
      g.toast(`No ${itemType} in inventory`, "warn");
      return;
    }

    // Check overlap with existing deployables
    if (checkDeployableOverlap(itemType, placePos, g.placedDeployables)) {
      g.toast("Too close to another deployable", "warn");
      return;
    }

    // Create mesh
    const geo = generateDeployableGeometry(itemType);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6b4a2b, // wood color for most deployables
      roughness: 0.9,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(placePos);
    mesh.rotation.y = (placeRot * Math.PI) / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const dep: PlacedDeployable = {
      id: buildIdCounter++,
      type: itemType,
      worldX: placePos.x,
      worldY: placePos.y,
      worldZ: placePos.z,
      rotation: placeRot,
      attachedToBuildId,
    };
    (dep as any).mesh = mesh;
    g.addDeployable(dep);
    g.removeItem(itemType, 1);
    g.emitAudio("place");
    g.toast(`Placed ${ITEMS[itemType]?.name ?? itemType}`, "good");
  }

  tryHammerAction(action: string) {
    const g = useGame.getState();
    if (g.hammerTargetId === null) return;
    const pb = g.placedV2.find((p) => p.id === g.hammerTargetId);
    if (!pb) return;
    const mesh = (pb as any).mesh as THREE.Mesh;
    if (!mesh) return;

    switch (action) {
      case "upgrade": {
        // Open upgrade sub-menu (handled by radial menu system)
        g.openRadialMenu("upgrade");
        break;
      }
      case "repair": {
        // Repair needs wood
        const repairCost = 20;
        if (g.countItem("wood") < repairCost) {
          g.toast(`Need ${repairCost} Wood to repair`, "warn");
          return;
        }
        pb.hp = Math.min(pb.hp + TIER_HP[pb.tier] * 0.25, TIER_HP[pb.tier]);
        g.removeItem("wood", repairCost);
        g.toast("Repaired structure", "good");
        g.emitAudio("place");
        break;
      }
      case "rotate": {
        pb.rotation = (pb.rotation + 1) % 4;
        mesh.rotation.y = (pb.rotation * Math.PI) / 2;
        g.toast("Structure rotated", "info");
        break;
      }
      case "demolish": {
        // Remove the build and return some materials
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        g.removePlacedV2(pb.id);
        // Return 25% of wood cost
        const refund = Math.floor(BUILD_PIECE_DEFS[pb.pieceType].woodCost * 0.25);
        if (refund > 0) g.addItem("wood", refund);
        g.toast(`Demolished ${pb.pieceType} (+${refund} Wood)`, "info");
        g.emitAudio("hit");
        break;
      }
    }
  }

  tryUpgradeV2(tier: string) {
    const g = useGame.getState();
    if (g.hammerTargetId === null) return;
    const pb = g.placedV2.find((p) => p.id === g.hammerTargetId);
    if (!pb) return;
    const mesh = (pb as any).mesh as THREE.Mesh;
    if (!mesh) return;

    const newTier = tier as TierType;
    // Validate upgrade progression
    const tierOrder: TierType[] = ["twig", "wood", "stone", "metal", "armored"];
    const currentIdx = tierOrder.indexOf(pb.tier);
    const newIdx = tierOrder.indexOf(newTier);
    if (newIdx <= currentIdx) {
      g.toast("Cannot downgrade a structure", "warn");
      return;
    }
    if (newIdx > currentIdx + 1) {
      g.toast("Must upgrade one tier at a time", "warn");
      return;
    }
    // Check cost
    const cost = UPGRADE_COSTS[newTier];
    if (!cost) {
      g.toast("Cannot upgrade to this tier", "warn");
      return;
    }
    if (g.countItem(cost.id) < cost.qty) {
      g.toast(`Need ${cost.qty} ${ITEMS[cost.id]?.name ?? cost.id} to upgrade to ${newTier}`, "warn");
      return;
    }
    // Upgrade
    g.removeItem(cost.id, cost.qty);
    g.upgradePlacedV2(pb.id, newTier);
    // Update mesh visuals
    const tv = TIER_VISUALS[newTier];
    const newGeo = generateBuildGeometry(pb.pieceType, newTier);
    mesh.geometry.dispose();
    mesh.geometry = newGeo;
    const newMat = new THREE.MeshStandardMaterial({
      color: tv.color,
      roughness: tv.roughness,
      metalness: tv.metalness,
      transparent: tv.opacity < 1,
      opacity: tv.opacity,
      flatShading: tv.flatShading,
    });
    (mesh.material as THREE.Material).dispose();
    mesh.material = newMat;
    g.toast(`Upgraded to ${newTier}`, "good");
    g.emitAudio("place");
  }

  updateDroppedItems(dt: number) {
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const d = this.droppedItems[i];
      // gravity
      d.vel.y -= 9 * dt;
      d.mesh.position.x += d.vel.x * dt;
      d.mesh.position.y += d.vel.y * dt;
      d.mesh.position.z += d.vel.z * dt;
      const groundY = this.terrain.getHeight(d.mesh.position.x, d.mesh.position.z) + 0.15;
      if (d.mesh.position.y < groundY) {
        d.mesh.position.y = groundY;
        d.vel.set(0, 0, 0);
      }
      d.mesh.rotation.y += dt * 1.2;
      // pickup if close
      if (d.mesh.position.distanceTo(this.playerPos) < 1.5) {
        const left = useGame.getState().addItem(d.id, d.qty);
        if (left === 0) {
          this.scene.remove(d.mesh);
          this.droppedItems.splice(i, 1);
          useGame.getState().toast(`Picked up ${ITEMS[d.id].name} ×${d.qty}`, "good");
          useGame.getState().emitAudio("pickup");
        } else {
          d.qty = left;
        }
      }
      // despawn after 5 min
      if (performance.now() - d.spawnTime > 300000) {
        this.scene.remove(d.mesh);
        this.droppedItems.splice(i, 1);
      }
    }
  }

  updateHeldView(dt: number, t: number) {
    if (!this.heldItemMesh) return;
    // Idle bob
    const idleBob = Math.sin(t * 1.5) * 0.012;
    const idleSway = Math.cos(t * 1.1) * 0.01;
    // Attack swing
    let attackOffset = 0;
    let attackRot = 0;
    if (this.heldRecoil > 0) {
      const def = useGame.getState().hotbar[useGame.getState().equipHotbarIndex];
      const defItem = def ? ITEMS[def.id] : null;
      const rate = defItem?.attackRate ?? 0.5;
      const phase = 1 - this.heldRecoil / rate;
      attackOffset = -Math.sin(phase * Math.PI) * 0.15;
      attackRot = -Math.sin(phase * Math.PI) * 0.8;
    }
    // Walking bob influence
    const moveBob = this.bobY * 0.4;
    this.heldGroup.position.set(
      idleSway + this.swayCurrent.x * 0.5,
      idleBob + moveBob + attackOffset + this.swayCurrent.y * 0.5,
      0
    );
    this.heldGroup.rotation.set(attackRot, this.swayCurrent.x * 2, this.swayCurrent.x * -1.5);
  }

  updateWeather(dt: number) {
    this.weatherTimer += dt;
    if (this.weatherTimer > this.weatherDuration) {
      this.weatherTimer = 0;
      this.weatherDuration = 60 + Math.random() * 180;
      // Random weather, with blizzard rare
      const r = Math.random();
      let newW: WeatherKind;
      if (r < 0.45) newW = "sunny";
      else if (r < 0.65) newW = "cloudy";
      else if (r < 0.85) newW = "rainy";
      else if (r < 0.97) newW = "foggy";
      else newW = "blizzard";
      this.sky.setWeather(newW);
      useGame.getState().setWeather(newW);
      // Phase 9: Activity log
      const weatherIcon: Record<string, string> = { sunny: "☀️", cloudy: "☁️", rainy: "🌧️", foggy: "🌫️", blizzard: "❄️" };
      const weatherKind: Record<string, "info" | "warn" | "danger"> = { sunny: "info", cloudy: "info", rainy: "info", foggy: "warn", blizzard: "danger" };
      useGame.getState().pushActivity(`Weather: ${newW}`, weatherIcon[newW] ?? "🌤️", weatherKind[newW] ?? "info");
      if (newW === "blizzard") useGame.getState().toast("⚠ BLIZZARD! Find shelter or freeze!", "danger");
      else if (newW === "rainy") useGame.getState().toast("It started raining", "info");
      else if (newW === "foggy") useGame.getState().toast("Fog rolls in", "info");
    }
  }

  checkShelter(): boolean {
    // Simple check: are there walls/floor/roof near and above player?
    const g = useGame.getState();
    let hasRoof = false;
    let hasWalls = 0;
    for (const p of g.placed) {
      const dx = p.worldX - this.playerPos.x;
      const dz = p.worldZ - this.playerPos.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d > 6) continue;
      if (p.kind === "woodFloor" || p.kind === "stoneFloor" || p.kind === "woodRoof" || p.kind === "stoneRoof") {
        if (p.worldY > this.playerPos.y + 1) hasRoof = true;
      }
      if (p.kind === "woodWall" || p.kind === "stoneWall") hasWalls++;
    }
    return hasRoof && hasWalls >= 2;
  }

  checkNearFire(): boolean {
    const g = useGame.getState();
    for (const p of g.placed) {
      if (p.kind !== "campfire" && p.kind !== "torch" && p.kind !== "furnace") continue;
      const d = Math.sqrt((p.worldX - this.playerPos.x) ** 2 + (p.worldZ - this.playerPos.z) ** 2);
      if (d < 4) return true;
    }
    return false;
  }

  updatePrompt() {
    const g = useGame.getState();
    let prompt: string | null = null;
    // Loot container
    for (const lo of this.lootObjs) {
      if (lo.container.looted) continue;
      const d = this.playerPos.distanceTo(lo.container.position);
      if (d < 3.5) {
        prompt = `[E] Search ${lo.container.kind}`;
        break;
      }
    }
    if (!prompt) {
      // Berry bush in front
      // Performance: skip raycast for bushes beyond ray.far + a margin. With
      // 80 bushes, raycasting each one every frame was a measurable cost.
      const ray = new THREE.Raycaster();
      ray.setFromCamera(REUSABLE_VEC2_00, this.camera);
      ray.far = 3;
      const maxD2 = 4 * 4; // 4m radius — slightly larger than ray.far so we don't miss edge cases
      const px = this.playerPos.x;
      const pz = this.playerPos.z;
      for (const b of this.bushes) {
        if (!b.hasBerries) continue;
        const dx = b.group.position.x - px;
        const dz = b.group.position.z - pz;
        if (dx * dx + dz * dz > maxD2) continue;
        const hits = ray.intersectObject(b.group, true);
        if (hits.length > 0) {
          prompt = `[E] Harvest berries`;
          // Harvest is now handled in interact() on E press (Task 3).
          break;
        }
      }
    }
    if (!prompt) {
      // Animal corpse
      for (const a of this.animals) {
        if (!a.dead) continue;
        const d = this.playerPos.distanceTo(a.root.position);
        if (d < 2.5) {
          prompt = `[E] Loot ${a.kind} corpse`;
          break;
        }
      }
    }
    if (!prompt) {
      // Cave entrance prompt removed (Task 6 — cave system removed).
      // caveEntrances is always empty.
    }
    if (!prompt) {
      // Debug block prompt (Test Range)
      for (const db of this.debugBlocks) {
        const d = this.playerPos.distanceTo(db.position);
        if (d < 3) {
          prompt = `[E] Open Debug Menu`;
          break;
        }
      }
    }
    if (!prompt) {
      // Builds
      for (const p of g.placed) {
        const d = this.playerPos.distanceTo(new THREE.Vector3(p.worldX, this.playerPos.y, p.worldZ));
        if (d > 3) continue;
        if (p.kind === "bed") prompt = `[E] Sleep`;
        else if (p.kind === "campfire" || p.kind === "furnace" || p.kind === "cookingPot") prompt = `[E] Use ${p.kind}`;
        else if (p.kind === "woodChest") prompt = `[E] Open chest`;
        else if (p.kind === "workbench") prompt = `[E] Crafting bench nearby`;
        else if (p.kind === "anvil") prompt = `[E] Anvil nearby`;
        else if (p.kind === "dryingRack") {
          const c = g.dryingRackContents[p.id];
          if (!c) prompt = `[E] Dry meat (need rawMeat)`;
          else if (c.ready) prompt = `[E] Collect jerky ✓`;
          else prompt = `Drying... ${Math.floor((Date.now() - c.startedAt) / 1000)}/60s`;
        }
        else if (p.kind === "rainBarrel") {
          const w = g.rainBarrelWater[p.id] ?? 0;
          prompt = `[E] Drink rainwater (${Math.floor(w)}/100)`;
        }
        else if (p.kind === "farmingPlot") {
          const key = `${p.gx},${p.gz}`;
          const crop = g.crops[key];
          if (!crop) {
            const slot = g.hotbar[g.equipHotbarIndex];
            if (slot && (slot.id === "wheatSeed" || slot.id === "pumpkinSeed")) {
              prompt = `[E] Plant ${slot.id === "wheatSeed" ? "wheat" : "pumpkin"}`;
            } else {
              prompt = `Equip seeds to plant`;
            }
          } else if (crop.growth >= 1) {
            prompt = `[E] Harvest ${crop.kind} ✓`;
          } else {
            prompt = `${crop.kind} growing: ${Math.floor(crop.growth * 100)}%`;
          }
        }
        else if (p.kind === "beehive") {
          const hive = g.hiveContents[p.id];
          const honey = hive ? hive.honey : 0;
          if (honey >= 1) {
            prompt = `[E] Collect honey (${Math.floor(honey)} ready)`;
          } else {
            prompt = `Beehive — honey growing: ${Math.floor(honey * 100)}%`;
          }
        }
      }
    }
    // Phase 2: Bird nest prompt
    if (!prompt) {
      for (const nest of this.birdNests) {
        if (nest.looted) continue;
        const d = Math.sqrt((nest.x - this.playerPos.x) ** 2 + (nest.z - this.playerPos.z) ** 2);
        if (d < 1.8) {
          prompt = `[E] Forage bird nest`;
          break;
        }
      }
    }
    // Phase 2: Lake prompt (drink / fish)
    if (!prompt) {
      const heldItem = g.hotbar[g.equipHotbarIndex];
      for (const lake of this.lakes) {
        const d = Math.sqrt((lake.x - this.playerPos.x) ** 2 + (lake.z - this.playerPos.z) ** 2);
        if (d < lake.r + 2) {
          if (heldItem && heldItem.id === "fishingRod") {
            prompt = `[LMB] Cast fishing line`;
          } else {
            prompt = `[E] Drink (unsafe)`;
          }
          break;
        }
      }
    }
    // Phase 5: Quest board prompt
    if (!prompt && g.questBoardNearby) {
      prompt = `[E] Open Quest Board`;
    }
    // Phase 5: Raft prompt
    if (!prompt) {
      for (const p of g.placed) {
        if (p.kind !== "raft") continue;
        const d = Math.sqrt((p.worldX - this.playerPos.x) ** 2 + (p.worldZ - this.playerPos.z) ** 2);
        if (d < 3) {
          prompt = g.ridingRaft ? `[E] Dismount raft` : `[E] Mount raft`;
          break;
        }
      }
    }
    // Phase 5: Barometer prompt — show reading when held
    if (!prompt) {
      const heldItem = g.hotbar[g.equipHotbarIndex];
      if (heldItem && heldItem.id === "barometer") {
        // Compute next-weather prediction using the same weather scheduler state
        const secondsLeft = Math.max(0, this.weatherDuration - this.weatherTimer);
        const next = this.predictNextWeather();
        prompt = `📊 Barometer: ${g.weather} → ${next} in ${Math.ceil(secondsLeft)}s`;
      }
    }
    useGame.getState().setPrompt(prompt);
  }

  // Phase 5: Predict the next weather based on the current weather scheduler
  predictNextWeather(): string {
    // Mirror the weather transition logic from updateWeather (simplified)
    const cur = useGame.getState().weather;
    const r = Math.random();
    if (cur === "sunny") return r < 0.5 ? "cloudy" : r < 0.8 ? "rainy" : r < 0.95 ? "foggy" : "blizzard";
    if (cur === "cloudy") return r < 0.4 ? "sunny" : r < 0.7 ? "rainy" : r < 0.9 ? "foggy" : "blizzard";
    if (cur === "rainy") return r < 0.5 ? "cloudy" : r < 0.8 ? "sunny" : "foggy";
    if (cur === "foggy") return r < 0.5 ? "cloudy" : r < 0.8 ? "sunny" : "rainy";
    if (cur === "blizzard") return r < 0.5 ? "foggy" : "cloudy";
    return "sunny";
  }

  // ===== Debug Menu helpers (Task 11/12) =====
  // These are called from the DebugMenu React component via
  // (window as any).__engine?.method(). They only do meaningful work in the
  // Test Range, but are safe to call anywhere.

  spawnAnimalNear(kind: "deer" | "boar" | "bear" | "wolf" | "rabbit") {
    const ang = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * 5;
    const x = this.playerPos.x + Math.cos(ang) * dist;
    const z = this.playerPos.z + Math.sin(ang) * dist;
    const y = this.terrain.getHeight(x, z);
    const a = makeAnimal(kind);
    a.root.position.set(x, y, z);
    a.root.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(a.root);
    this.animals.push(a);
    useGame.getState().toast(`Spawned ${kind} nearby`, "info");
  }

  spawnBotNear() {
    const ang = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * 5;
    const x = this.playerPos.x + Math.cos(ang) * dist;
    const z = this.playerPos.z + Math.sin(ang) * dist;
    const y = this.terrain.getHeight(x, z);
    const h = makeHumanoid({ skinColor: 0xc28960, shirtColor: 0x4a5a3a, trouserColor: 0x3a3a3a, hairColor: 0x1a1008 });
    h.root.position.set(x, y, z);
    this.scene.add(h.root);
    const bot: Bot = {
      humanoid: h,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(),
      yaw: Math.random() * Math.PI * 2,
      state: "wander",
      target: null,
      targetEntity: null,
      nextDecision: 0,
      hp: 100,
      attackCooldown: 0,
      clothing: { head: null, chest: null, legs: null, feet: null },
      weapon: "woodSpear",
      carrying: [],
    };
    dressHumanoid(h, bot.clothing);
    attachWeapon(h, bot.weapon);
    this.bots.push(bot);
    useGame.getState().toast("Spawned bot nearby", "info");
  }

  teleportToSpawn() {
    const x = 0, z = 0;
    this.playerPos.set(x, this.terrain.getHeight(x, z), z);
    this.playerVel.set(0, 0, 0);
    useGame.getState().toast("Teleported to spawn", "info");
  }

  killNearbyAnimals(radius = 30) {
    let count = 0;
    for (const a of this.animals) {
      if (a.dead) continue;
      const d = a.root.position.distanceTo(this.playerPos);
      if (d < radius) {
        this.killAnimal(a);
        count++;
      }
    }
    useGame.getState().toast(`Killed ${count} nearby animal${count === 1 ? "" : "s"}`, count > 0 ? "good" : "info");
  }

  // Override the weather + reset the weather scheduler timer so the new
  // weather persists for a full duration cycle.
  setWeatherOverride(w: WeatherKind) {
    this.sky.setWeather(w);
    useGame.getState().setWeather(w);
    this.weatherTimer = 0;
    this.weatherDuration = 120;
    useGame.getState().toast(`Weather set to ${w}`, "info");
  }

  setTimeOfDayOverride(t: number) {
    useGame.getState().setTimeOfDay(t);
    this.sky.timeOfDay = t;
    useGame.getState().toast(`Time set to ${Math.floor(t * 24)}:00`, "info");
  }

  // ===== Cleanup =====
  dispose() {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.boundResize);
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);
    window.removeEventListener("mousedown", this.boundMouseDown);
    window.removeEventListener("mouseup", this.boundMouseUp);
    window.removeEventListener("mousemove", this.boundMouseMove);
    window.removeEventListener("wheel", this.boundWheel);
    document.removeEventListener("pointerlockchange", this.boundPointerLockChange);
    this.renderer.domElement.removeEventListener("contextmenu", this.boundContextMenu);
    for (const u of this.unsub) u();
    this.renderer.dispose();
    this.particles.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

// Expose ITEMS for factory.ts attachWeapon
(window as any).ITEMS_HASH = ITEMS;
