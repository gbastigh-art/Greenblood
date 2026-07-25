// Factory: procedural Three.js models for trees, bushes, rocks, houses,
// lootable containers, furniture, builds, weapons, players/bots/animals.
import * as THREE from "three";
import { mulberry32, randRange, pick } from "./noise";

// ---- Materials cache (shared) ----
const matCache: Record<string, THREE.Material> = {};
export function mat(color: number, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  const key = color + JSON.stringify(opts);
  if (matCache[key]) return matCache[key] as THREE.MeshStandardMaterial;
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.0, ...opts });
  matCache[key] = m;
  return m;
}

// ---- Geometry cache (shared) ----
// Creating a new geometry for every tree/bush/rock (360+80+70 = 510+ objects)
// was a massive memory + GPU-upload bottleneck. We now bucket params to a small
// number of discrete sizes and share the underlying BufferGeometry. Scale +
// rotation on the Mesh (not geometry) keeps visual variety.
const geoCache: Record<string, THREE.BufferGeometry> = {};
function round(v: number, step: number) {
  return Math.round(v / step) * step;
}
// CylinderGeometry
export function cyl(rt: number, rb: number, h: number, seg = 8): THREE.CylinderGeometry {
  // Bucket to a small grid so we share geometries across similar trees/limbs.
  const rt2 = round(rt, 0.05);
  const rb2 = round(rb, 0.05);
  const h2 = round(h, 0.5);
  const key = `cyl_${rt2}_${rb2}_${h2}_${seg}`;
  if (!geoCache[key]) geoCache[key] = new THREE.CylinderGeometry(rt2, rb2, h2, seg);
  return geoCache[key] as THREE.CylinderGeometry;
}
// ConeGeometry
export function cone(r: number, h: number, seg = 8): THREE.ConeGeometry {
  const r2 = round(r, 0.1);
  const h2 = round(h, 0.25);
  const key = `cone_${r2}_${h2}_${seg}`;
  if (!geoCache[key]) geoCache[key] = new THREE.ConeGeometry(r2, h2, seg);
  return geoCache[key] as THREE.ConeGeometry;
}
// IcosahedronGeometry
export function ico(r: number, detail = 0): THREE.IcosahedronGeometry {
  const r2 = round(r, 0.1);
  const key = `ico_${r2}_${detail}`;
  if (!geoCache[key]) geoCache[key] = new THREE.IcosahedronGeometry(r2, detail);
  return geoCache[key] as THREE.IcosahedronGeometry;
}
// DodecahedronGeometry
export function dodec(r: number, detail = 0): THREE.DodecahedronGeometry {
  const r2 = round(r, 0.1);
  const key = `dodec_${r2}_${detail}`;
  if (!geoCache[key]) geoCache[key] = new THREE.DodecahedronGeometry(r2, detail);
  return geoCache[key] as THREE.DodecahedronGeometry;
}
// SphereGeometry
export function sph(r: number, ws = 8, hs = 6): THREE.SphereGeometry {
  const r2 = round(r, 0.02);
  const key = `sph_${r2}_${ws}_${hs}`;
  if (!geoCache[key]) geoCache[key] = new THREE.SphereGeometry(r2, ws, hs);
  return geoCache[key] as THREE.SphereGeometry;
}
// BoxGeometry
export function box(w: number, h: number, d: number): THREE.BoxGeometry {
  const w2 = round(w, 0.05);
  const h2 = round(h, 0.05);
  const d2 = round(d, 0.05);
  const key = `box_${w2}_${h2}_${d2}`;
  if (!geoCache[key]) geoCache[key] = new THREE.BoxGeometry(w2, h2, d2);
  return geoCache[key] as THREE.BoxGeometry;
}

// ============ TREES ============
export interface TreeInstance {
  group: THREE.Group;
  type: "pine" | "oak" | "birch";
  hp: number;
  maxHp: number;
  chopped: boolean;
}

export function makeTree(rng: () => number, x: number, z: number, y: number): TreeInstance {
  const type = pick(rng, ["pine", "oak", "birch"] as const);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const scale = randRange(rng, 0.85, 1.3);
  g.scale.setScalar(scale);
  g.rotation.y = rng() * Math.PI * 2;

  const trunkH = randRange(rng, 4, 7);
  const trunkR = randRange(rng, 0.18, 0.32);
  // Use cached cylinder geometry (bucketed by rounded params) — saves 360+ unique
  // vertex buffers across the forest.
  const trunk = new THREE.Mesh(
    cyl(trunkR * 0.7, trunkR, trunkH, 6),
    mat(type === "birch" ? 0xe8e2d0 : 0x6b4a2b, { roughness: 0.95 })
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = false;
  g.add(trunk);

  if (type === "pine") {
    const layers = 3 + Math.floor(rng() * 2);
    for (let i = 0; i < layers; i++) {
      const r = 1.6 - i * 0.3;
      const h = 1.6;
      const coneMesh = new THREE.Mesh(
        cone(r, h, 7),
        mat(0x2f5a2a, { roughness: 0.9 })
      );
      coneMesh.position.y = trunkH + i * 1.0 - 0.3;
      coneMesh.castShadow = true;
      g.add(coneMesh);
    }
  } else if (type === "oak") {
    const r = randRange(rng, 1.6, 2.3);
    const blob = new THREE.Mesh(
      ico(r, 1),
      mat(0x3f6b32, { roughness: 0.95, flatShading: true })
    );
    blob.position.y = trunkH + r * 0.5;
    blob.scale.y = 0.85;
    blob.castShadow = true;
    g.add(blob);
    // a second smaller blob
    const blob2 = new THREE.Mesh(
      ico(r * 0.6, 1),
      mat(0x4a7a3a, { roughness: 0.95, flatShading: true })
    );
    blob2.position.set(r * 0.6, trunkH + r * 0.7, r * 0.2);
    blob2.castShadow = true;
    g.add(blob2);
  } else {
    // birch — sparse small canopy
    const r = randRange(rng, 1.0, 1.5);
    const blob = new THREE.Mesh(
      ico(r, 1),
      mat(0xbfd17a, { roughness: 0.95, flatShading: true })
    );
    blob.position.y = trunkH + r * 0.4;
    blob.castShadow = true;
    g.add(blob);
  }
  return { group: g, type, hp: 100, maxHp: 100, chopped: false };
}

// Stump left after chopping
export function makeStump(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const stump = new THREE.Mesh(
    cyl(0.25, 0.3, 0.6, 6),
    mat(0x6b4a2b, { roughness: 0.95 })
  );
  stump.position.y = 0.3;
  stump.castShadow = true;
  g.add(stump);
  return g;
}

// ============ BERRY BUSHES ============
export interface BushInstance {
  group: THREE.Group;
  hp: number;
  hasBerries: boolean;
  berryMeshes: THREE.Mesh[];
}
export function makeBush(rng: () => number, x: number, z: number, y: number): BushInstance {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const r = randRange(rng, 0.6, 0.95);
  const blob = new THREE.Mesh(
    ico(r, 1),
    mat(0x355a26, { roughness: 0.95, flatShading: true })
  );
  blob.position.y = r * 0.7;
  blob.scale.y = 0.9;
  // Bushes are small — let only the main blob cast shadow. Berries are tiny
  // (no shadow) which keeps the shadow casters list lean.
  blob.castShadow = true;
  g.add(blob);
  // Berry dots
  const berryMeshes: THREE.Mesh[] = [];
  const berryMat = mat(0x3a2a7a, { emissive: 0x1a0a4a, emissiveIntensity: 0.3 });
  const n = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) {
    const b = new THREE.Mesh(sph(0.07, 6, 5), berryMat);
    const a = rng() * Math.PI * 2;
    const rad = r * 0.8;
    b.position.set(Math.cos(a) * rad, r * 0.8 + (rng() - 0.5) * 0.4, Math.sin(a) * rad);
    // No castShadow on berries — too small to contribute, big cost when summed.
    g.add(b);
    berryMeshes.push(b);
  }
  return { group: g, hp: 30, hasBerries: true, berryMeshes };
}

// ============ ROCKS / ORE NODES ============
export interface RockInstance {
  group: THREE.Group;
  hp: number;
  kind: "stone" | "coal" | "iron";
}
export function makeRock(rng: () => number, x: number, z: number, y: number, kind: "stone" | "coal" | "iron" = "stone"): RockInstance {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const baseColor = kind === "coal" ? 0x222222 : kind === "iron" ? 0x6b4423 : 0x6a6a6a;
  const r = randRange(rng, 0.6, 1.3);
  const rock = new THREE.Mesh(
    dodec(r, 0),
    mat(baseColor, { roughness: 1, flatShading: true })
  );
  rock.position.y = r * 0.6;
  rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
  rock.castShadow = true;
  rock.receiveShadow = true;
  g.add(rock);
  // ore specks — small detail meshes; no shadow casting (would balloon the
  // shadow pass cost with 70 rocks × 6 specks = 420 extra casters).
  if (kind !== "stone") {
    const speckMat = mat(kind === "coal" ? 0x000000 : 0xc8a060, { roughness: 0.6, metalness: 0.3 });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(sph(0.1, 5, 4), speckMat);
      const dir = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
      s.position.copy(dir.multiplyScalar(r * 0.9));
      g.add(s);
    }
  }
  return { group: g, hp: kind === "stone" ? 60 : 100, kind };
}

// ============ ABANDONED HOUSES + LOOT CONTAINERS ============
export interface LootContainer {
  group: THREE.Group;
  kind: "shelf" | "wardrobe" | "crate";
  looted: boolean;
  // world position for prompt detection
  position: THREE.Vector3;
}

export function makeAbandonedHouse(rng: () => number, x: number, z: number, y: number): { group: THREE.Group; containers: LootContainer[] } {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rng() * Math.PI * 2;
  const w = pick(rng, [6, 7, 8]);
  const d = pick(rng, [5, 6, 7]);
  const h = 2.8;
  const rotDeg = pick(rng, [0, 10, -10, 20, -20]);
  // Stash dimensions on the group so the engine can build collision AABBs.
  g.userData.w = w;
  g.userData.d = d;

  // Wall material (weathered)
  const wallMat = mat(pick(rng, [0x7a6b5a, 0x6b6055, 0x807060]), { roughness: 1 });
  const roofMat = mat(pick(rng, [0x3a2a1a, 0x4a3a2a, 0x2a2a2a]), { roughness: 1 });
  const floorMat = mat(0x5a4a3a, { roughness: 1 });

  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), floorMat);
  floor.position.y = 0.1;
  floor.receiveShadow = true;
  g.add(floor);

  // Walls (4) with door gap on front
  const wallH = h;
  const wallT = 0.2;
  // back wall
  const wb = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, wallT), wallMat);
  wb.position.set(0, wallH / 2, -d / 2);
  wb.castShadow = true; wb.receiveShadow = true;
  g.add(wb);
  // front wall split for door (1m door)
  const doorW = 1.2;
  const sideW = (w - doorW) / 2;
  const wfL = new THREE.Mesh(new THREE.BoxGeometry(sideW, wallH, wallT), wallMat);
  wfL.position.set(-(doorW / 2 + sideW / 2), wallH / 2, d / 2);
  wfL.castShadow = true;
  g.add(wfL);
  const wfR = wfL.clone();
  wfR.position.x = (doorW / 2 + sideW / 2);
  g.add(wfR);
  // side walls
  const wsL = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH, d), wallMat);
  wsL.position.set(-w / 2, wallH / 2, 0);
  wsL.castShadow = true;
  g.add(wsL);
  const wsR = wsL.clone();
  wsR.position.x = w / 2;
  g.add(wsR);

  // Roof (sloped)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.85, 2, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = wallH + 1;
  roof.scale.z = d / w;
  roof.castShadow = true;
  g.add(roof);

  // Damaged: randomly remove a wall chunk to look ruined
  if (rng() > 0.5) {
    // collapse one side wall partially
    const ruin = new THREE.Mesh(new THREE.BoxGeometry(wallT, wallH * 0.4, d * 0.5), wallMat);
    ruin.position.set(w / 2, wallH * 0.2, d * 0.25);
    g.add(ruin);
    g.remove(wsR);
  }

  // Loot containers inside
  const containers: LootContainer[] = [];
  // shelf
  const shelfPos = new THREE.Vector3(-w / 2 + 0.4, 0.1, -d / 2 + 0.3);
  const shelf = makeShelf(rng);
  shelf.position.copy(shelfPos);
  g.add(shelf);
  containers.push({ group: shelf, kind: "shelf", looted: false, position: new THREE.Vector3(x, y, z).add(shelfPos).applyMatrix4(new THREE.Matrix4().makeRotationY(g.rotation.y)) });

  // wardrobe
  const wardPos = new THREE.Vector3(w / 2 - 0.5, 0.1, -d / 2 + 0.5);
  const ward = makeWardrobe(rng);
  ward.position.copy(wardPos);
  g.add(ward);
  containers.push({ group: ward, kind: "wardrobe", looted: false, position: new THREE.Vector3(x, y, z).add(wardPos).applyMatrix4(new THREE.Matrix4().makeRotationY(g.rotation.y)) });

  // crate
  const cratePos = new THREE.Vector3(0, 0.1, d / 2 - 0.6);
  const crate = makeCrate(rng);
  crate.position.copy(cratePos);
  g.add(crate);
  containers.push({ group: crate, kind: "crate", looted: false, position: new THREE.Vector3(x, y, z).add(cratePos).applyMatrix4(new THREE.Matrix4().makeRotationY(g.rotation.y)) });

  g.rotation.y = (rotDeg * Math.PI) / 180 + rng() * Math.PI * 2;
  return { group: g, containers };
}

export function makeShelf(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const m = mat(0x4a3a2a, { roughness: 1 });
  const w = 1.4;
  const h = 1.8;
  const d = 0.4;
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), m);
  back.position.set(0, h / 2, -d / 2);
  g.add(back);
  for (let i = 0; i < 4; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), m);
    shelf.position.set(0, 0.2 + i * 0.5, 0);
    g.add(shelf);
  }
  // sides
  const sL = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, d), m);
  sL.position.set(-w / 2, h / 2, 0);
  g.add(sL);
  const sR = sL.clone();
  sR.position.x = w / 2;
  g.add(sR);
  return g;
}

export function makeWardrobe(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const m = mat(0x5a4a3a, { roughness: 1 });
  const w = 1.2;
  const h = 2.0;
  const d = 0.6;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  body.position.y = h / 2;
  body.castShadow = true;
  g.add(body);
  const doorMat = mat(0x4a3a2a, { roughness: 1 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, h * 0.9, 0.05), doorMat);
  door.position.set(-w * 0.2, h / 2, d / 2 + 0.03);
  g.add(door);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), mat(0x222222, { metalness: 0.5, roughness: 0.4 }));
  handle.position.set(-w * 0.05, h / 2, d / 2 + 0.08);
  g.add(handle);
  return g;
}

export function makeCrate(rng: () => number): THREE.Group {
  const g = new THREE.Group();
  const m = mat(0x6b4a2a, { roughness: 1 });
  const s = 0.8;
  const body = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), m);
  body.position.y = s / 2;
  body.castShadow = true;
  g.add(body);
  // plank lines
  const lineMat = mat(0x3a2a1a, { roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(s * 1.02, 0.04, s * 1.02), lineMat);
    line.position.y = 0.2 + i * 0.3;
    g.add(line);
  }
  return g;
}

// ============ FURNITURE / BUILDS ============
import type { BuildKind } from "../buildables";
import { BUILDS, GRID, WALL_H } from "../buildables";

export function makeBuild(kind: BuildKind, rot: number = 0): THREE.Group {
  const def = BUILDS[kind];
  const g = new THREE.Group();
  const c = def.color;
  switch (kind) {
    case "woodWall": {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.2), mat(c, { roughness: 0.9 }));
      panel.position.y = 1.5;
      panel.castShadow = true; panel.receiveShadow = true;
      g.add(panel);
      // plank lines
      const lineMat = mat(0x5a3a1a, { roughness: 1 });
      for (let i = 0; i < 6; i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(3, 0.04, 0.22), lineMat);
        l.position.y = 0.25 + i * 0.5;
        g.add(l);
      }
      break;
    }
    case "woodFloor": {
      const p = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 3), mat(c, { roughness: 0.9 }));
      p.position.y = 0.1;
      p.castShadow = true; p.receiveShadow = true;
      g.add(p);
      const lineMat = mat(0x5a3a1a, { roughness: 1 });
      for (let i = 0; i < 4; i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(3, 0.21, 0.04), lineMat);
        l.position.z = -1.2 + i * 0.8;
        g.add(l);
      }
      break;
    }
    case "woodRoof": {
      const p = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.15, 3), mat(c, { roughness: 0.9 }));
      p.rotation.x = Math.PI / 7;
      p.position.y = 1.2;
      p.castShadow = true;
      g.add(p);
      break;
    }
    case "woodDoor": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 3.2, 0.25), mat(0x5a3a1a, { roughness: 1 }));
      frame.position.y = 1.6;
      g.add(frame);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 0.08), mat(c, { roughness: 0.9 }));
      door.position.set(0, 1.2, 0.15);
      g.add(door);
      const handle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), mat(0xddaa33, { metalness: 0.6, roughness: 0.4 }));
      handle.position.set(0.45, 1.2, 0.22);
      g.add(handle);
      break;
    }
    case "woodPillar": {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 6), mat(c, { roughness: 1 }));
      p.position.y = 1.5;
      p.castShadow = true;
      g.add(p);
      break;
    }
    case "stoneWall": {
      const p = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.3), mat(c, { roughness: 1, flatShading: true }));
      p.position.y = 1.5;
      p.castShadow = true; p.receiveShadow = true;
      g.add(p);
      // stone block lines
      const lineMat = mat(0x444444, { roughness: 1 });
      for (let r = 0; r < 4; r++) {
        for (let i = 0; i < 3; i++) {
          const l = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.32), lineMat);
          l.position.set(-1 + i * 1, 0.4 + r * 0.7, 0);
          g.add(l);
        }
      }
      break;
    }
    case "stoneFloor": {
      const p = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 3), mat(c, { roughness: 1, flatShading: true }));
      p.position.y = 0.1;
      p.castShadow = true; p.receiveShadow = true;
      g.add(p);
      break;
    }
    case "stoneRoof": {
      const p = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 3), mat(c, { roughness: 1 }));
      p.rotation.x = Math.PI / 7;
      p.position.y = 1.2;
      p.castShadow = true;
      g.add(p);
      break;
    }
    case "stoneDoor": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 3.2, 0.35), mat(c, { roughness: 1 }));
      frame.position.y = 1.6;
      g.add(frame);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 0.08), mat(0x3a3a3a, { metalness: 0.5, roughness: 0.6 }));
      door.position.set(0, 1.2, 0.2);
      g.add(door);
      const handle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), mat(0xcccccc, { metalness: 0.7, roughness: 0.3 }));
      handle.position.set(0.45, 1.2, 0.27);
      g.add(handle);
      break;
    }
    case "campfire": {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.12, 6, 12), mat(0x555555, { roughness: 1, flatShading: true }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.12;
      g.add(ring);
      // logs
      for (let i = 0; i < 4; i++) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 5), mat(0x4a2a1a, { roughness: 1 }));
        log.rotation.z = Math.PI / 2;
        log.rotation.y = (i / 4) * Math.PI;
        log.position.y = 0.2;
        g.add(log);
      }
      // flame (animated in engine)
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.3, 0.7, 6),
        mat(0xff6a1a, { emissive: 0xff4400, emissiveIntensity: 1.5, transparent: true, opacity: 0.9 })
      );
      flame.position.y = 0.5;
      flame.name = "flame";
      g.add(flame);
      // point light — Phase 3: increased radius (12 -> 15) for night
      const light = new THREE.PointLight(0xff7a30, 5, 15, 2);
      light.position.y = 0.8;
      light.name = "fireLight";
      light.userData.baseIntensity = 5;
      light.userData.fireLight = true;
      g.add(light);
      break;
    }
    case "bed": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 0.3, 2.2), mat(0x5a3a1a, { roughness: 1 }));
      frame.position.y = 0.2;
      g.add(frame);
      const mattress = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 2.0), mat(0xb0a090, { roughness: 1 }));
      mattress.position.y = 0.45;
      g.add(mattress);
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.15, 0.4), mat(0xd0c8b8, { roughness: 1 }));
      pillow.position.set(0, 0.55, -0.75);
      g.add(pillow);
      break;
    }
    case "woodChest": {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.7), mat(c, { roughness: 1 }));
      body.position.y = 0.35;
      body.castShadow = true;
      g.add(body);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.7), mat(c, { roughness: 1 }));
      lid.position.set(0, 0.75, 0);
      g.add(lid);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), mat(0xddaa33, { metalness: 0.6, roughness: 0.4 }));
      lock.position.set(0, 0.55, 0.38);
      g.add(lock);
      break;
    }
    case "torch": {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), mat(0x4a2a1a, { roughness: 1 }));
      handle.position.y = 0.6;
      g.add(handle);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), mat(0x222222, { roughness: 1 }));
      head.position.y = 1.2;
      g.add(head);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.35, 6),
        mat(0xff6a1a, { emissive: 0xff4400, emissiveIntensity: 1.6, transparent: true, opacity: 0.95 })
      );
      flame.position.y = 1.45;
      flame.name = "flame";
      g.add(flame);
      // Phase 3: increased radius (8 -> 12)
      const light = new THREE.PointLight(0xffaa50, 3.5, 12, 2);
      light.position.y = 1.5;
      light.name = "torchLight";
      light.userData.baseIntensity = 3.5;
      light.userData.fireLight = true;
      g.add(light);
      break;
    }
    case "workbench": {
      const top = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1), mat(c, { roughness: 0.9 }));
      top.position.y = 0.9;
      top.castShadow = true;
      g.add(top);
      for (let i = 0; i < 4; i++) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), mat(0x4a2a1a, { roughness: 1 }));
        leg.position.set(i % 2 ? 1 : -1, 0.45, i < 2 ? 0.4 : -0.4);
        g.add(leg);
      }
      // a saw on top
      const saw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.15), mat(0xaaaaaa, { metalness: 0.6, roughness: 0.4 }));
      saw.position.set(0.4, 0.96, 0);
      g.add(saw);
      break;
    }
    case "furnace": {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 1.2, 8), mat(c, { roughness: 1, flatShading: true }));
      body.position.y = 0.6;
      body.castShadow = true;
      g.add(body);
      const opening = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.05), mat(0xff6a1a, { emissive: 0xff4400, emissiveIntensity: 1.5 }));
      opening.position.set(0, 0.5, 0.55);
      g.add(opening);
      // Phase 3: increased radius (8 -> 13)
      const light = new THREE.PointLight(0xff7a30, 3, 13, 2);
      light.position.set(0, 0.6, 0.6);
      light.name = "furnaceLight";
      light.userData.baseIntensity = 3;
      light.userData.fireLight = true;
      g.add(light);
      break;
    }
    case "woodStairs": {
      const stepMat = mat(c, { roughness: 0.9 });
      for (let i = 0; i < 6; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 0.5), stepMat);
        step.position.set(0, 0.05 + i * 0.5, 1.5 - i * 0.5);
        g.add(step);
        const riser = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.05), stepMat);
        riser.position.set(0, 0.3 + i * 0.5, 1.25 - i * 0.5);
        g.add(riser);
      }
      break;
    }
    case "stoneStairs": {
      const stepMat = mat(c, { roughness: 1, flatShading: true });
      for (let i = 0; i < 6; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.5), stepMat);
        step.position.set(0, 0.06 + i * 0.5, 1.5 - i * 0.5);
        g.add(step);
        const riser = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.06), stepMat);
        riser.position.set(0, 0.3 + i * 0.5, 1.25 - i * 0.5);
        g.add(riser);
      }
      break;
    }
    case "woodWindow":
    case "stoneWindow": {
      const isStone = kind === "stoneWindow";
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 3, isStone ? 0.3 : 0.2), mat(c, { roughness: 1 }));
      frame.position.y = 1.5;
      g.add(frame);
      // Cut out a window pane (just a translucent blue square)
      const glass = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.2 })
      );
      glass.position.set(0, 1.5, isStone ? 0.16 : 0.11);
      g.add(glass);
      // Cross frame
      const crossMat = mat(isStone ? 0x555555 : 0x5a3a1a, { roughness: 1 });
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 0.05), crossMat);
      vBar.position.set(0, 1.5, isStone ? 0.17 : 0.12);
      g.add(vBar);
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.05), crossMat);
      hBar.position.set(0, 1.5, isStone ? 0.17 : 0.12);
      g.add(hBar);
      break;
    }
    case "woodLadder": {
      const sideMat = mat(c, { roughness: 1 });
      const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 3, 0.1), sideMat);
      sideL.position.set(-0.2, 1.5, 0);
      g.add(sideL);
      const sideR = sideL.clone();
      sideR.position.x = 0.2;
      g.add(sideR);
      for (let i = 0; i < 6; i++) {
        const rung = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.05), sideMat);
        rung.position.set(0, 0.3 + i * 0.5, 0);
        g.add(rung);
      }
      break;
    }
    case "gate": {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 4.5, 0.3), mat(c, { roughness: 1 }));
      frame.position.y = 2.25;
      g.add(frame);
      const gateDoor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4, 0.1), mat(0x3a2a1a, { roughness: 1 }));
      gateDoor.position.set(-0.75, 2, 0.2);
      g.add(gateDoor);
      const gateDoor2 = gateDoor.clone();
      gateDoor2.position.x = 0.75;
      g.add(gateDoor2);
      break;
    }
    case "triangularRoof": {
      // Triangular prism: a 3m wide × 1.5m tall triangle extruded along 3m depth.
      // Use ExtrudeGeometry with a triangle Shape extruded along depth (z).
      const shape = new THREE.Shape();
      shape.moveTo(-1.5, 0);
      shape.lineTo(1.5, 0);
      shape.lineTo(0, 1.5);
      shape.closePath();
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: 3,
        bevelEnabled: false,
        steps: 1,
      };
      const prism = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, extrudeSettings),
        mat(c, { roughness: 0.92, flatShading: true })
      );
      // ExtrudeGeometry extrudes along +z from 0..depth. Center on origin and lift so base sits at y=0.
      prism.position.set(0, 0, -1.5);
      prism.castShadow = true;
      prism.receiveShadow = true;
      g.add(prism);
      // Wood-grain detail: two darker plank stripes along the slopes
      const grainMat = mat(0x5a3210, { roughness: 1 });
      for (let s = -1; s <= 1; s += 2) {
        for (let i = 0; i < 3; i++) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.04, 3.02),
            grainMat
          );
          // slope angle: ±atan(1.5/1.5) = ±45°
          stripe.position.set(s * (0.5 + i * 0.45), (0.5 + i * 0.45) * 1.0, 0);
          stripe.rotation.z = s * Math.PI / 4;
          g.add(stripe);
        }
      }
      break;
    }
    case "halfWall": {
      // Half-height wall: 3m wide, 1.5m tall, 0.25m deep
      const panel = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 0.25), mat(c, { roughness: 0.9 }));
      panel.position.y = 0.75;
      panel.castShadow = true; panel.receiveShadow = true;
      g.add(panel);
      // Plank detail lines
      const lineMat = mat(0x5a3a1a, { roughness: 1 });
      for (let i = 0; i < 3; i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(3, 0.04, 0.27), lineMat);
        l.position.y = 0.25 + i * 0.5;
        g.add(l);
      }
      // Top cap to look finished
      const cap = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.06, 0.29), lineMat);
      cap.position.y = 1.5;
      g.add(cap);
      break;
    }
    case "fencePost": {
      // Thin vertical post with a small pointed cap on top
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), mat(c, { roughness: 1 }));
      post.position.y = 0.6;
      post.castShadow = true;
      g.add(post);
      // Pointed cap
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.2, 4), mat(c, { roughness: 1 }));
      cap.position.y = 1.3;
      cap.rotation.y = Math.PI / 4;
      g.add(cap);
      // Small horizontal notch detail
      const notch = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.24), mat(0x5a3210, { roughness: 1 }));
      notch.position.y = 0.9;
      g.add(notch);
      break;
    }
    case "fenceGate": {
      // Two fence posts on either side with 2-3 horizontal rails between them
      const postMat = mat(c, { roughness: 1 });
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.5, 0.2), postMat);
      postL.position.set(-1.4, 0.75, 0);
      postL.castShadow = true;
      g.add(postL);
      const postR = postL.clone();
      postR.position.x = 1.4;
      g.add(postR);
      // Pointed caps on both posts
      for (const sx of [-1.4, 1.4]) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.2, 4), postMat);
        cap.position.set(sx, 1.6, 0);
        cap.rotation.y = Math.PI / 4;
        g.add(cap);
      }
      // Horizontal rails (3) between posts
      const railMat = mat(0x6b4220, { roughness: 1 });
      for (let i = 0; i < 3; i++) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.06), railMat);
        rail.position.set(0, 0.35 + i * 0.45, 0);
        g.add(rail);
      }
      // Diagonal brace for X-pattern look
      const brace = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.05), railMat);
      brace.position.set(0, 0.75, 0.05);
      brace.rotation.z = Math.atan2(1.0, 2.6);
      g.add(brace);
      break;
    }
    case "anvil": {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), mat(c, { roughness: 0.6, metalness: 0.5 }));
      base.position.y = 0.25;
      g.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.6), mat(c, { roughness: 0.5, metalness: 0.6 }));
      top.position.y = 0.6;
      g.add(top);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 6), mat(c, { roughness: 0.5, metalness: 0.6 }));
      horn.rotation.z = Math.PI / 2;
      horn.position.set(-0.6, 0.6, 0);
      g.add(horn);
      break;
    }
    case "dryingRack": {
      const post1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), mat(c, { roughness: 1 }));
      post1.position.set(-0.5, 0.8, 0);
      g.add(post1);
      const post2 = post1.clone();
      post2.position.x = 0.5;
      g.add(post2);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), mat(c, { roughness: 1 }));
      top.position.set(0, 1.5, 0);
      g.add(top);
      // Hanging strips (meat)
      for (let i = 0; i < 3; i++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.05), mat(0xa02828, { roughness: 0.8 }));
        strip.position.set(-0.4 + i * 0.4, 1.1, 0);
        g.add(strip);
      }
      break;
    }
    case "farmingPlot": {
      const soil = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.2, 2.8), mat(c, { roughness: 1 }));
      soil.position.y = 0.1;
      g.add(soil);
      // Grid of furrows
      const furMat = mat(0x3a2a1a, { roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const fur = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.08), furMat);
        fur.position.set(0, 0.11, -1.1 + i * 0.55);
        g.add(fur);
      }
      break;
    }
    case "rainBarrel": {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.2, 12), mat(c, { roughness: 0.8, metalness: 0.3 }));
      body.position.y = 0.6;
      g.add(body);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 12), mat(0x2a3a4a, { roughness: 0.7 }));
      top.position.y = 1.24;
      g.add(top);
      // Tap
      const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.15, 6), mat(0xcccccc, { metalness: 0.7, roughness: 0.3 }));
      tap.rotation.z = Math.PI / 2;
      tap.position.set(0.5, 0.4, 0);
      g.add(tap);
      break;
    }
    case "signPost": {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2, 0.15), mat(c, { roughness: 1 }));
      post.position.y = 1;
      g.add(post);
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.06), mat(0x9b6a3b, { roughness: 0.9 }));
      board.position.set(0, 1.6, 0.05);
      g.add(board);
      break;
    }
    case "scarecrow": {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 6), mat(c, { roughness: 1 }));
      post.position.y = 0.9;
      g.add(post);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), mat(c, { roughness: 1 }));
      cross.position.set(0, 1.3, 0);
      cross.rotation.z = Math.PI / 12;
      g.add(cross);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mat(0xd4a060, { roughness: 1 }));
      head.position.set(0, 1.8, 0);
      g.add(head);
      const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.4), mat(0x6a3a3a, { roughness: 1 }));
      shirt.position.set(0, 1.3, 0);
      g.add(shirt);
      // Hat
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 10), mat(0x3a2a1a, { roughness: 1 }));
      hatBrim.position.set(0, 1.96, 0);
      g.add(hatBrim);
      const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.25, 8), mat(0x3a2a1a, { roughness: 1 }));
      hatTop.position.set(0, 2.1, 0);
      g.add(hatTop);
      break;
    }
    case "beehive": {
      // Body: golden box (1.2 x 1.0 x 1.2) — note def says 1.5 tall; we use 1.0 body + 0.5 pitched roof = 1.5
      const bodyMat = mat(c, { roughness: 0.85 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.2), bodyMat);
      body.position.y = 0.5;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);
      // Plank stripes for a "layered" hive look
      const stripeMat = mat(0xa07018, { roughness: 1 });
      for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.06, 1.22), stripeMat);
        stripe.position.y = 0.2 + i * 0.32;
        g.add(stripe);
      }
      // Dark entry hole on the front (facing +z)
      const hole = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.1, 0.05),
        mat(0x1a1008, { roughness: 1 })
      );
      hole.position.set(0, 0.35, 0.61);
      g.add(hole);
      // Landing board under the hole
      const landing = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.04, 0.18),
        mat(0x8b5a2b, { roughness: 1 })
      );
      landing.position.set(0, 0.27, 0.68);
      g.add(landing);
      // Pitched roof: two slanted boxes forming a small gable
      const roofMat = mat(0x6b4220, { roughness: 1 });
      const roofL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 1.3), roofMat);
      roofL.position.set(-0.32, 1.05, 0);
      roofL.rotation.z = Math.PI / 6;
      g.add(roofL);
      const roofR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 1.3), roofMat);
      roofR.position.set(0.32, 1.05, 0);
      roofR.rotation.z = -Math.PI / 6;
      g.add(roofR);
      // Ridge cap
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 1.32), roofMat);
      ridge.position.set(0, 1.16, 0);
      g.add(ridge);
      // Tiny bee particles (4 small yellow spheres) hovering around — stored in userData for animation
      const beeMat = mat(0xf4d020, { emissive: 0x4a3a00, emissiveIntensity: 0.4, roughness: 0.6 });
      const bees: THREE.Mesh[] = [];
      for (let i = 0; i < 4; i++) {
        const bee = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), beeMat);
        const ang = (i / 4) * Math.PI * 2;
        bee.position.set(Math.cos(ang) * 0.7, 0.55 + Math.sin(i) * 0.2, Math.sin(ang) * 0.7);
        bee.userData.beeIndex = i;
        bee.userData.beePhase = i * 1.3;
        g.add(bee);
        bees.push(bee);
      }
      g.userData.bees = bees;
      // Tag the group so engine can identify hives & animate bees
      g.userData.kind = "beehive";
      break;
    }
    // ---- Phase 5: new buildables ----
    case "ramp": {
      // Inclined walkable plane 3m wide, rising from y=0 to y=3 over 3m depth
      const rampMat = mat(c, { roughness: 0.9 });
      // Build a wedge: a BoxGeometry rotated to form a ramp
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.18, 3.4), rampMat);
      ramp.position.set(0, 1.5, -0.2);
      ramp.rotation.x = -Math.PI / 5; // ~36° incline
      ramp.castShadow = true; ramp.receiveShadow = true;
      g.add(ramp);
      // Support beam under the ramp (visible at the high end)
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2), mat(0x5a3a1a, { roughness: 1 }));
      support.position.set(0, 1.5, -1.6);
      g.add(support);
      // Side rails (two thin planks along each edge)
      const railMat = mat(0x6b4220, { roughness: 1 });
      for (const sx of [-1.5, 1.5]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 3.4), railMat);
        rail.position.set(sx, 1.65, -0.2);
        rail.rotation.x = -Math.PI / 5;
        g.add(rail);
      }
      // Plank lines across the ramp surface
      const lineMat = mat(0x5a3a1a, { roughness: 1 });
      for (let i = 0; i < 5; i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.04, 0.06), lineMat);
        const t = i / 5;
        // Position along the inclined ramp
        l.position.set(0, 0.3 + t * 2.4, 1.4 - t * 3.0);
        l.rotation.x = -Math.PI / 5;
        g.add(l);
      }
      break;
    }
    case "balcony": {
      // Half-floor overhang: a 3 x 1.5 floor board + railing on 3 sides
      const floor = new THREE.Mesh(new THREE.BoxGeometry(3, 0.18, 1.5), mat(c, { roughness: 0.9 }));
      floor.position.y = 0.09;
      floor.castShadow = true; floor.receiveShadow = true;
      g.add(floor);
      // Railing posts at 4 corners + middle of long sides
      const postMat = mat(0x6b4220, { roughness: 1 });
      const postPositions: [number, number][] = [
        [-1.5, 0.75], [1.5, 0.75], [-1.5, -0.75], [1.5, -0.75],
        [0, 0.75], [0, -0.75],
      ];
      for (const [px, pz] of postPositions) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), postMat);
        post.position.set(px, 0.55, pz);
        g.add(post);
      }
      // Top rail along 3 sides (front + 2 sides, no back where it connects to wall)
      const railMat = mat(0x7c4a2a, { roughness: 1 });
      const railFront = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.08), railMat);
      railFront.position.set(0, 0.95, 0.75);
      g.add(railFront);
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.5), railMat);
      railL.position.set(-1.5, 0.95, 0);
      g.add(railL);
      const railR = railL.clone();
      railR.position.x = 1.5;
      g.add(railR);
      // Mid rail (horizontal middle bar)
      const midFront = new THREE.Mesh(new THREE.BoxGeometry(3, 0.05, 0.05), railMat);
      midFront.position.set(0, 0.55, 0.75);
      g.add(midFront);
      break;
    }
    case "triangularFloor": {
      // Right-triangle floor: use ExtrudeGeometry with a triangle shape
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(3, 0);
      shape.lineTo(0, 3);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false });
      const tri = new THREE.Mesh(geo, mat(c, { roughness: 0.9 }));
      tri.rotation.x = -Math.PI / 2; // lay flat
      tri.position.y = 0.18;
      tri.castShadow = true; tri.receiveShadow = true;
      g.add(tri);
      // Subtle plank lines on the surface
      const lineMat = mat(0x5a3a1a, { roughness: 1 });
      for (let i = 0; i < 4; i++) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 2.4), lineMat);
        const t = (i + 1) / 5;
        l.position.set(t * 1.5, 0.2, 1.2 - t * 1.2);
        l.rotation.y = Math.PI / 4;
        g.add(l);
      }
      break;
    }
    case "raft": {
      // 5x5 grid of planks (2.5m x 2.5m raft)
      const plankMat = mat(c, { roughness: 0.95 });
      for (let r = 0; r < 5; r++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.45), plankMat);
        plank.position.set(0, 0.15, -1.0 + r * 0.5);
        plank.castShadow = true; plank.receiveShadow = true;
        g.add(plank);
      }
      // 2 cross-bindings (rope)
      const ropeMat = mat(0xc2a878, { roughness: 1 });
      for (const z of [-0.8, 0.8]) {
        const rope = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.06, 0.08), ropeMat);
        rope.position.set(0, 0.22, z);
        g.add(rope);
      }
      // Short mast in center (for visual interest)
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4, 6), mat(0x5a3a1a, { roughness: 1 }));
      mast.position.set(0, 0.8, 0);
      g.add(mast);
      // Tiny flag on top
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.02), mat(0xc83838, { roughness: 0.9 }));
      flag.position.set(0.18, 1.35, 0);
      g.add(flag);
      g.userData.kind = "raft";
      g.userData.isRaft = true;
      break;
    }
    case "questBoard": {
      // Two wooden posts + a board with pinned notices
      const postMat = mat(0x5a3a1a, { roughness: 1 });
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2, 0.12), postMat);
      postL.position.set(-0.5, 1, 0);
      postL.castShadow = true;
      g.add(postL);
      const postR = postL.clone();
      postR.position.x = 0.5;
      g.add(postR);
      // Board panel (1.1 x 0.9)
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.06), mat(c, { roughness: 0.9 }));
      board.position.set(0, 1.3, 0);
      board.castShadow = true;
      g.add(board);
      // Pinned notices (3 small paper sheets at angles)
      const paperMats = [mat(0xf0e8c8, { roughness: 1 }), mat(0xe8d8a8, { roughness: 1 }), mat(0xf4e4b8, { roughness: 1 })];
      const noticeOffsets: [number, number, number][] = [
        [-0.25, 1.5, 0.08],
        [0.2, 1.4, -0.06],
        [0.05, 1.65, 0.05],
      ];
      for (let i = 0; i < 3; i++) {
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.01), paperMats[i]);
        paper.position.set(noticeOffsets[i][0], noticeOffsets[i][1], 0.06);
        paper.rotation.z = noticeOffsets[i][2];
        g.add(paper);
        // Pin (small red dot)
        const pin = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), mat(0xc82020, { roughness: 0.6 }));
        pin.position.set(noticeOffsets[i][0], noticeOffsets[i][1] + 0.08, 0.075);
        g.add(pin);
      }
      // Top cross-beam
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.1), postMat);
      beam.position.set(0, 1.95, 0);
      g.add(beam);
      // Lantern hook (small detail) — no light, just a hook
      const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 8), mat(0x444444, { metalness: 0.6, roughness: 0.4 }));
      hook.position.set(0, 1.85, 0.1);
      g.add(hook);
      g.userData.kind = "questBoard";
      g.userData.isQuestBoard = true;
      break;
    }
    // Phase 6: electricity buildables
    case "generator": {
      // Metal box body with exhaust pipe and indicator light
      const bodyMat = mat(0x5a5a5a, { metalness: 0.7, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), bodyMat);
      body.position.set(0, 0.6, 0);
      body.castShadow = true;
      g.add(body);
      // Top panel
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.5), mat(0x3a3a3a, { metalness: 0.8 }));
      panel.position.set(0, 1.1, 0);
      g.add(panel);
      // Exhaust pipe
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8), mat(0x333333, { metalness: 0.9 }));
      pipe.position.set(0.2, 1.3, 0.2);
      g.add(pipe);
      // Green indicator light (emissive)
      const indicator = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(0x00ff44, { emissive: 0x00ff44, emissiveIntensity: 1.5 }));
      indicator.position.set(-0.2, 1.08, 0.31);
      g.add(indicator);
      g.userData.kind = "generator";
      g.userData.isGenerator = true;
      break;
    }
    case "wire": {
      // Thin horizontal wire/cable
      const wireMat = mat(0x8a8a3a, { metalness: 0.6, roughness: 0.4 });
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3, 6), wireMat);
      wire.rotation.x = Math.PI / 2;
      wire.position.set(0, 2.5, 0);
      g.add(wire);
      g.userData.kind = "wire";
      break;
    }
    case "electricLight": {
      // Bulb shape: base + sphere
      const baseMat = mat(0x666666, { metalness: 0.8 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.1, 8), baseMat);
      base.position.set(0, 0.15, 0);
      g.add(base);
      // Glass bulb (emissive when powered)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat(0xfff5e0, { emissive: 0x000000, emissiveIntensity: 0, transparent: true, opacity: 0.9 }));
      bulb.position.set(0, 0, 0);
      g.add(bulb);
      g.userData.kind = "electricLight";
      g.userData.isElectricLight = true;
      g.userData.bulb = bulb;
      g.userData.powered = false;
      g.userData.lightMesh = null; // PointLight added dynamically by engine
      break;
    }
    // Phase 7: Cooking pot
    case "cookingPot": {
      const cpGroup = makeCookingPot();
      g.add(...cpGroup.children);
      g.userData.kind = "cookingPot";
      break;
    }
  }
  if (rot) g.rotation.y = (rot * Math.PI) / 2;
  g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ============ COOKING POT ============
export function makeCookingPot(): THREE.Group {
  const g = new THREE.Group();
  // Dark grey cylinder body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.3, 12),
    mat(0x4a4a4a, { roughness: 0.7, metalness: 0.3 })
  );
  body.position.y = 0.15;
  body.castShadow = true;
  g.add(body);
  // Two small cylinder handles on sides (rotated 90°)
  const handleMat = mat(0x3a3a3a, { roughness: 0.6, metalness: 0.4 });
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8),
      handleMat
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(side * 0.48, 0.22, 0);
    g.add(handle);
  }
  // Rim on top (thin cylinder)
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.37, 0.37, 0.04, 12),
    mat(0x5a5a5a, { roughness: 0.5, metalness: 0.4 })
  );
  rim.position.y = 0.31;
  g.add(rim);
  return g;
}

// ============ RADIATION ZONE ============
export function makeRadiationZone(radius: number): THREE.Group {
  const g = new THREE.Group();
  // Semi-transparent green disc on the ground
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.05;
  g.add(disc);
  return g;
}

// ============ WEAPONS / TOOLS (held in view) ============
export function makeHeldItem(itemId: string): THREE.Group {
  const g = new THREE.Group();
  switch (itemId) {
    case "rock": {
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), mat(0x7a7a7a, { roughness: 1, flatShading: true }));
      r.position.set(0.3, -0.25, -0.5);
      r.rotation.set(0.3, 0.4, 0.2);
      g.add(r);
      break;
    }
    case "woodSpear": {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.4, 6), mat(0x9b6924, { roughness: 1 }));
      shaft.position.set(0.3, -0.2, -0.6);
      shaft.rotation.x = Math.PI / 2 - 0.3;
      g.add(shaft);
      break;
    }
    case "stoneSpear": {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.5, 6), mat(0x9b6924, { roughness: 1 }));
      shaft.position.set(0.3, -0.2, -0.6);
      shaft.rotation.x = Math.PI / 2 - 0.3;
      g.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), mat(0xaaaaaa, { roughness: 0.6, flatShading: true }));
      tip.position.set(0.3, -0.2, -1.25);
      tip.rotation.x = -Math.PI / 2 - 0.3;
      g.add(tip);
      break;
    }
    case "woodKnife": {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), mat(0x4a2a1a, { roughness: 1 }));
      handle.position.set(0.3, -0.2, -0.45);
      handle.rotation.x = Math.PI / 2 - 0.3;
      g.add(handle);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.28), mat(0x8b5a2b, { roughness: 0.8 }));
      blade.position.set(0.3, -0.2, -0.65);
      g.add(blade);
      break;
    }
    case "stoneKnife": {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), mat(0x4a2a1a, { roughness: 1 }));
      handle.position.set(0.3, -0.2, -0.45);
      handle.rotation.x = Math.PI / 2 - 0.3;
      g.add(handle);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.3), mat(0x999999, { roughness: 0.5, metalness: 0.2 }));
      blade.position.set(0.3, -0.2, -0.65);
      g.add(blade);
      break;
    }
    case "stonePickaxe":
    case "hatchet": {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.8, 6), mat(0x9b6924, { roughness: 1 }));
      shaft.position.set(0.3, -0.25, -0.5);
      shaft.rotation.x = Math.PI / 2 - 0.4;
      g.add(shaft);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.06), mat(0x888888, { roughness: 0.5, metalness: 0.2 }));
      head.position.set(0.3, -0.1, -0.9);
      if (itemId === "hatchet") head.scale.x = 0.7;
      g.add(head);
      break;
    }
    case "torchItem": {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), mat(0x4a2a1a, { roughness: 1 }));
      handle.position.set(0.3, -0.3, -0.55);
      g.add(handle);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 5), mat(0x222222, { roughness: 1 }));
      head.position.set(0.3, 0.05, -0.55);
      g.add(head);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.1, 0.3, 6),
        mat(0xff6a1a, { emissive: 0xff4400, emissiveIntensity: 1.6, transparent: true, opacity: 0.95 })
      );
      flame.position.set(0.3, 0.2, -0.55);
      flame.name = "heldFlame";
      g.add(flame);
      // Phase 3: boosted torch item light (3 -> 4.5, 12 -> 15 radius)
      const light = new THREE.PointLight(0xffaa50, 4.5, 15, 2);
      light.position.set(0.3, 0.2, -0.55);
      light.userData.baseIntensity = 4.5;
      light.userData.fireLight = true;
      g.add(light);
      break;
    }
    case "pistol":
    case "rifle":
    case "shotgun": {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, itemId === "rifle" ? 0.9 : itemId === "shotgun" ? 0.7 : 0.4), mat(0x222222, { metalness: 0.6, roughness: 0.4 }));
      body.position.set(0.3, -0.2, -0.5);
      g.add(body);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, itemId === "rifle" ? 0.8 : itemId === "shotgun" ? 0.6 : 0.3, 6), mat(0x111111, { metalness: 0.7, roughness: 0.3 }));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0.3, -0.15, -0.8);
      g.add(barrel);
      break;
    }
    case "bow": {
      const body = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 6, 12, Math.PI * 1.2), mat(0x7c4a2a, { roughness: 0.8 }));
      body.position.set(0.3, -0.2, -0.5);
      body.rotation.y = Math.PI / 2;
      g.add(body);
      // String
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.6, 4), mat(0xeeeeee, { roughness: 0.5 }));
      string.position.set(0.3, -0.2, -0.5);
      g.add(string);
      break;
    }
    case "fishingRod": {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 1.2, 6), mat(0x8b5a2b, { roughness: 0.8 }));
      body.position.set(0.3, -0.2, -0.7);
      body.rotation.x = Math.PI / 2 - 0.3;
      g.add(body);
      // Handle
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.25, 6), mat(0x2a1a0a, { roughness: 1 }));
      handle.position.set(0.3, -0.15, -0.3);
      handle.rotation.x = Math.PI / 2 - 0.3;
      g.add(handle);
      // Line
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.4, 4), mat(0xeeeeee, { roughness: 0.5 }));
      line.position.set(0.3, -0.35, -1.2);
      g.add(line);
      break;
    }
    case "sword": {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6), mat(0x4a2a1a, { roughness: 1 }));
      handle.position.set(0.3, -0.15, -0.4);
      handle.rotation.x = Math.PI / 2 - 0.3;
      g.add(handle);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.05), mat(0xcccc44, { metalness: 0.6, roughness: 0.4 }));
      guard.position.set(0.3, -0.13, -0.5);
      g.add(guard);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.9), mat(0xcccccc, { metalness: 0.7, roughness: 0.2 }));
      blade.position.set(0.3, -0.13, -1.0);
      g.add(blade);
      // Tip
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 4), mat(0xcccccc, { metalness: 0.7, roughness: 0.2 }));
      tip.position.set(0.3, -0.13, -1.5);
      tip.rotation.x = -Math.PI / 2;
      g.add(tip);
      break;
    }
    case "metalAxe":
    case "metalPickaxe":
    case "metalKnife": {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.8, 6), mat(0x4a2a1a, { roughness: 1 }));
      shaft.position.set(0.3, -0.25, -0.5);
      shaft.rotation.x = Math.PI / 2 - 0.4;
      g.add(shaft);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.08), mat(0x9a9a9a, { roughness: 0.3, metalness: 0.7 }));
      head.position.set(0.3, -0.1, -0.9);
      if (itemId === "metalKnife") {
        head.scale.set(0.5, 0.4, 1);
        head.position.z = -0.7;
      } else if (itemId === "metalPickaxe") {
        head.scale.set(1, 1, 1.2);
      }
      g.add(head);
      break;
    }
    case "woodAxe": {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.8, 6), mat(0x9b6924, { roughness: 1 }));
      shaft.position.set(0.3, -0.25, -0.5);
      shaft.rotation.x = Math.PI / 2 - 0.4;
      g.add(shaft);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.08, 0.06), mat(0x8b5a2b, { roughness: 0.8 }));
      head.position.set(0.3, -0.1, -0.9);
      g.add(head);
      break;
    }
    default: {
      // Building Plan: smaller blueprint map held by two white arms
      if (itemId === "buildingPlan") {
        // Left arm (white sleeve + hand)
        const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), mat(0xe8ddd0, { roughness: 0.95 }));
        leftArm.position.set(-0.08, -0.12, -0.5);
        leftArm.rotation.x = 0.4;
        leftArm.rotation.z = 0.3;
        g.add(leftArm);
        const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), mat(0xf0e6d6, { roughness: 0.9 }));
        leftHand.position.set(-0.01, -0.2, -0.55);
        leftHand.rotation.x = 0.2;
        g.add(leftHand);

        // Right arm (white sleeve + hand)
        const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), mat(0xe8ddd0, { roughness: 0.95 }));
        rightArm.position.set(0.08, -0.12, -0.5);
        rightArm.rotation.x = 0.4;
        rightArm.rotation.z = -0.3;
        g.add(rightArm);
        const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.03), mat(0xf0e6d6, { roughness: 0.9 }));
        rightHand.position.set(0.01, -0.2, -0.55);
        rightHand.rotation.x = 0.2;
        g.add(rightHand);

        // Blueprint parchment (smaller, centered)
        const plan = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.01), mat(0xc4a882, { roughness: 0.95 }));
        plan.position.set(0, -0.22, -0.56);
        plan.rotation.x = 0.15;
        g.add(plan);
        // Blueprint grid lines
        const hline = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.003, 0.012), mat(0x444444, { roughness: 1 }));
        hline.position.set(0, -0.18, -0.555);
        g.add(hline);
        const hline2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.003, 0.012), mat(0x444444, { roughness: 1 }));
        hline2.position.set(0, -0.22, -0.555);
        g.add(hline2);
        const vline = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.2, 0.012), mat(0x444444, { roughness: 1 }));
        vline.position.set(0, -0.2, -0.555);
        g.add(vline);
        break;
      }
      // Hammer: shaft + head
      if (itemId === "hammer") {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.7, 6), mat(0x9b6924, { roughness: 1 }));
        shaft.position.set(0.3, -0.3, -0.5);
        shaft.rotation.x = Math.PI / 2 - 0.3;
        g.add(shaft);
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.1), mat(0x7a7a7a, { roughness: 0.5, metalness: 0.5 }));
        head.position.set(0.3, -0.15, -0.85);
        g.add(head);
        break;
      }
      // generic small box for any other item (food, resources, etc.)
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.15), mat(0x888888, { roughness: 1 }));
      b.position.set(0.3, -0.25, -0.5);
      g.add(b);
    }
  }
  return g;
}

// ============ PLAYER / BOT HUMANOID MODEL ============
// Realistic-ish humanoid: head, torso, arms, legs with bendable joints.
export interface Humanoid {
  root: THREE.Group;
  parts: {
    head: THREE.Group;
    torso: THREE.Mesh;
    hips: THREE.Mesh;
    armL: THREE.Group;
    armR: THREE.Group;
    legL: THREE.Group;
    legR: THREE.Group;
    handL: THREE.Mesh;
    handR: THREE.Mesh;
  };
  // clothing meshes (added/removed dynamically)
  clothingMeshes: Record<string, THREE.Object3D>;
  // weapon attached to right hand
  weaponMesh: THREE.Object3D | null;
}

export interface HumanoidOptions {
  skinColor?: number;
  trouserColor?: number;
  shirtColor?: number;
  hairColor?: number;
  height?: number; // overall scale
}

export function makeHumanoid(opts: HumanoidOptions = {}): Humanoid {
  const skin = opts.skinColor ?? 0xc28960;
  const trouser = opts.trouserColor ?? 0x4a4a55;
  const shirt = opts.shirtColor ?? 0x8a8a90;
  const hair = opts.hairColor ?? 0x2a1a10;
  const H = opts.height ?? 1.0;

  const root = new THREE.Group();

  // Hips
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.25, 0.28), mat(trouser, { roughness: 0.9 }));
  hips.position.y = 0.95;
  hips.castShadow = true;
  root.add(hips);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.32), mat(shirt, { roughness: 0.9 }));
  torso.position.y = 1.4;
  torso.castShadow = true;
  root.add(torso);

  // Neck + head
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.78;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 6), mat(skin, { roughness: 0.8 }));
  neck.position.y = -0.06;
  headGroup.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat(skin, { roughness: 0.8 }));
  head.position.y = 0.12;
  head.scale.y = 1.15;
  head.castShadow = true;
  headGroup.add(head);
  // hair cap
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(hair, { roughness: 0.9 }));
  hairMesh.position.y = 0.16;
  headGroup.add(hairMesh);
  // eyes
  const eyeMat = mat(0x222222, { roughness: 0.5 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), eyeMat);
  eyeL.position.set(-0.06, 0.13, 0.15);
  headGroup.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.06;
  headGroup.add(eyeR);
  // nose
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), mat(skin, { roughness: 0.8 }));
  nose.position.set(0, 0.1, 0.18);
  nose.rotation.x = Math.PI / 2;
  headGroup.add(nose);
  root.add(headGroup);

  // Arms (pivot at shoulder)
  function makeArm(side: 1 | -1) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.32, 1.65, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.35, 6), mat(shirt, { roughness: 0.9 }));
    upper.position.y = -0.18;
    upper.castShadow = true;
    arm.add(upper);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.35, 6), mat(skin, { roughness: 0.8 }));
    fore.position.y = -0.55;
    fore.castShadow = true;
    arm.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(skin, { roughness: 0.8 }));
    hand.position.y = -0.78;
    arm.add(hand);
    return { arm, hand };
  }
  const { arm: armL, hand: handL } = makeArm(-1);
  const { arm: armR, hand: handR } = makeArm(1);
  root.add(armL); root.add(armR);

  // Legs
  function makeLeg(side: 1 | -1) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.95, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.45, 6), mat(trouser, { roughness: 0.9 }));
    upper.position.y = -0.22;
    upper.castShadow = true;
    leg.add(upper);
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 6), mat(trouser, { roughness: 0.9 }));
    lower.position.y = -0.68;
    lower.castShadow = true;
    leg.add(lower);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.22), mat(0x222222, { roughness: 0.7 }));
    foot.position.set(0, -0.92, 0.05);
    leg.add(foot);
    return leg;
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);
  root.add(legL); root.add(legR);

  root.scale.setScalar(H);

  return {
    root,
    parts: { head: headGroup, torso, hips, armL, armR, legL, legR, handL, handR },
    clothingMeshes: {},
    weaponMesh: null,
  };
}

// Attach / update clothing meshes on a humanoid.
export function dressHumanoid(h: Humanoid, clothing: { head?: string | null; chest?: string | null; legs?: string | null; feet?: string | null }) {
  // Clear existing
  for (const k in h.clothingMeshes) {
    h.root.remove(h.clothingMeshes[k]);
    delete h.clothingMeshes[k];
  }
  // Head
  if (clothing.head) {
    const c = clothingHead(clothing.head);
    c.position.y = 1.78 + 0.18;
    h.root.add(c);
    h.clothingMeshes.head = c;
  }
  // Chest (replace torso color via overlay)
  if (clothing.chest) {
    const c = clothingChest(clothing.chest);
    c.position.y = 1.4;
    h.root.add(c);
    h.clothingMeshes.chest = c;
  }
  // Legs
  if (clothing.legs) {
    const c = clothingLegs(clothing.legs);
    c.position.y = 0.95;
    h.root.add(c);
    h.clothingMeshes.legs = c;
  }
  // Feet
  if (clothing.feet) {
    const c = clothingFeet(clothing.feet);
    c.position.y = 0.04;
    h.root.add(c);
    h.clothingMeshes.feet = c;
  }
}

function clothingHead(id: string): THREE.Object3D {
  switch (id) {
    case "hideCap":
    case "clothHood": {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(id === "clothHood" ? 0x9a9a8a : 0x7c4a2a, { roughness: 1 }));
      return cap;
    }
    case "winterCoat": {
      // hood
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.7), mat(0x3a4a5a, { roughness: 1 }));
      return cap;
    }
    case "metalHelmet": {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(0x6a6a6a, { metalness: 0.5, roughness: 0.5 }));
      return cap;
    }
    default:
      return new THREE.Object3D();
  }
}
function clothingChest(id: string): THREE.Object3D {
  const g = new THREE.Group();
  let color = 0x8a8a90;
  if (id === "hideVest") color = 0x7c4a2a;
  if (id === "winterCoat") color = 0x3a4a5a;
  if (id === "metalChest") color = 0x5a5a5a;
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.7, 0.36), mat(color, { roughness: 1, metalness: id === "metalChest" ? 0.5 : 0 }));
  vest.castShadow = true;
  g.add(vest);
  // arms cover
  const aL = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.4, 6), mat(color, { roughness: 1 }));
  aL.position.set(-0.32, 0.25, 0);
  g.add(aL);
  const aR = aL.clone();
  aR.position.x = 0.32;
  g.add(aR);
  return g;
}
function clothingLegs(id: string): THREE.Object3D {
  const g = new THREE.Group();
  const color = id === "hidePants" ? 0x6b3a1a : 0x4a4a55;
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.95, 6), mat(color, { roughness: 1 }));
  legL.position.set(-0.12, -0.45, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.12;
  g.add(legR);
  return g;
}
function clothingFeet(id: string): THREE.Object3D {
  const g = new THREE.Group();
  const color = id === "hideBoots" ? 0x5a2a0a : 0x222222;
  const fL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.24), mat(color, { roughness: 0.7 }));
  fL.position.set(-0.12, 0, 0.05);
  g.add(fL);
  const fR = fL.clone();
  fR.position.x = 0.12;
  g.add(fR);
  return g;
}

// Attach a weapon mesh to right hand
export function attachWeapon(h: Humanoid, itemId: string | null) {
  if (h.weaponMesh) {
    h.parts.armR.remove(h.weaponMesh);
    h.weaponMesh = null;
  }
  if (!itemId) return;
  const def = (window as any).ITEMS_HASH?.[itemId];
  // Reuse makeHeldItem but rescale
  const m = makeHeldItem(itemId);
  // strip view-offset positions — re-center to hand
  m.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      // shift so weapon pivot is at hand position
    }
  });
  m.position.set(0, -0.78, 0.05);
  m.rotation.set(0, 0, 0);
  m.scale.setScalar(0.85);
  h.parts.armR.add(m);
  h.weaponMesh = m;
}

// Animate humanoid walking/running/idle
export function animateHumanoid(h: Humanoid, t: number, moving: boolean, speed: number, attacking: boolean) {
  const phase = t * (moving ? 8 + speed * 4 : 1.5);
  const swing = moving ? Math.sin(phase) * (0.5 + speed * 0.3) : Math.sin(t * 1.5) * 0.05;
  h.parts.legL.rotation.x = swing;
  h.parts.legR.rotation.x = -swing;
  h.parts.armL.rotation.x = -swing * 0.7;
  if (!attacking) {
    h.parts.armR.rotation.x = swing * 0.7;
  } else {
    // attack swing
    h.parts.armR.rotation.x = Math.sin(t * 14) * 1.4 - 0.3;
  }
  // head bob
  h.parts.head.position.y = 1.78 + Math.abs(Math.sin(phase)) * (moving ? 0.04 : 0.01);
  // torso slight sway
  h.parts.torso.rotation.z = Math.sin(phase) * 0.03;
}

// ============ ANIMALS ============
export type AnimalKind = "deer" | "boar" | "bear" | "rabbit" | "wolf";
export interface AnimalInstance {
  root: THREE.Group;
  kind: AnimalKind;
  hp: number;
  maxHp: number;
  state: "idle" | "wander" | "flee" | "attack" | "dead";
  target: THREE.Vector3;
  vel: THREE.Vector3;
  nextDecision: number;
  attackCooldown: number;
  dead: boolean;
  corpseTime: number;
  // animation
  legFL?: THREE.Mesh;
  legFR?: THREE.Mesh;
  legBL?: THREE.Mesh;
  legBR?: THREE.Mesh;
  head?: THREE.Object3D;
  ears?: THREE.Object3D[];
  // pack id (for wolves) so members of the same pack coordinate
  packId?: number;
}

export function makeAnimal(kind: AnimalKind): AnimalInstance {
  if (kind === "rabbit") return makeRabbit();
  if (kind === "wolf") return makeWolf();

  const g = new THREE.Group();
  let bodyColor = 0x8b5a2b;
  let bodyLen = 1.4;
  let bodyH = 0.9;
  let bodyW = 0.55;
  let legLen = 0.85;
  if (kind === "boar") { bodyColor = 0x3a2a20; bodyLen = 1.2; bodyH = 0.75; bodyW = 0.55; legLen = 0.65; }
  if (kind === "bear") { bodyColor = 0x3a2a20; bodyLen = 2.0; bodyH = 1.3; bodyW = 0.85; legLen = 1.0; }
  if (kind === "deer") { bodyColor = 0x9b6924; bodyLen = 1.3; bodyH = 0.95; bodyW = 0.45; legLen = 0.95; }

  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyLen), mat(bodyColor, { roughness: 0.95, flatShading: true }));
  body.position.y = legLen + bodyH / 2 - 0.1;
  body.castShadow = true;
  g.add(body);

  // head
  const head = new THREE.Group();
  head.position.set(0, legLen + bodyH * 0.6, -bodyLen / 2 - 0.15);
  const headMesh = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.6, bodyH * 0.6, 0.5), mat(bodyColor, { roughness: 0.95, flatShading: true }));
  headMesh.castShadow = true;
  head.add(headMesh);
  // snout
  const snout = new THREE.Mesh(new THREE.BoxGeometry(bodyW * 0.4, bodyH * 0.3, 0.35), mat(bodyColor, { roughness: 0.95 }));
  snout.position.set(0, -bodyH * 0.15, -0.35);
  head.add(snout);
  // eyes
  const eyeMat = mat(0x111111, { roughness: 0.5 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), eyeMat);
  eyeL.position.set(-bodyW * 0.18, 0.04, -0.18);
  head.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = bodyW * 0.18;
  head.add(eyeR);
  // ears
  const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 4), mat(bodyColor, { roughness: 0.95 }));
  ear.position.set(-bodyW * 0.25, bodyH * 0.35, 0);
  ear.rotation.z = -0.3;
  head.add(ear);
  const ear2 = ear.clone();
  ear2.position.x = bodyW * 0.25;
  ear2.rotation.z = 0.3;
  head.add(ear2);
  // antlers for deer
  if (kind === "deer") {
    const antlerMat = mat(0xc0a070, { roughness: 0.9 });
    for (let s = -1; s <= 1; s += 2) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.4, 4), antlerMat);
      ant.position.set(s * 0.1, 0.25, 0);
      ant.rotation.z = s * 0.4;
      head.add(ant);
      // branches
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.18, 4), antlerMat);
      br.position.set(s * 0.18, 0.4, 0);
      br.rotation.z = s * 1.0;
      head.add(br);
    }
  }
  g.add(head);

  // legs (4)
  function makeLeg(x: number, z: number) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, legLen, 0.13), mat(bodyColor, { roughness: 0.95 }));
    leg.position.set(x, legLen / 2, z);
    leg.castShadow = true;
    g.add(leg);
    return leg;
  }
  const legFL = makeLeg(-bodyW * 0.35, -bodyLen * 0.35);
  const legFR = makeLeg(bodyW * 0.35, -bodyLen * 0.35);
  const legBL = makeLeg(-bodyW * 0.35, bodyLen * 0.35);
  const legBR = makeLeg(bodyW * 0.35, bodyLen * 0.35);

  // tail
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.25), mat(bodyColor, { roughness: 0.95 }));
  tail.position.set(0, legLen + bodyH * 0.5, bodyLen / 2 + 0.05);
  g.add(tail);

  const hp = kind === "bear" ? 220 : kind === "boar" ? 80 : 60;
  return {
    root: g,
    kind,
    hp,
    maxHp: hp,
    state: "wander",
    target: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    nextDecision: 0,
    attackCooldown: 0,
    dead: false,
    corpseTime: 0,
    legFL, legFR, legBL, legBR,
    head,
  };
}

// ---- Rabbit: small (0.4m tall), brown/white, low-poly body + long ears ----
function makeRabbit(): AnimalInstance {
  const g = new THREE.Group();
  const bodyColor = 0x9b6b3a; // brown
  const bellyColor = 0xe8d8b8; // white belly
  const bodyLen = 0.45;
  const bodyH = 0.28;
  const bodyW = 0.22;
  const legLen = 0.12;

  // Body — rounded box (low-poly sphere stretched)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW, bodyH, bodyLen),
    mat(bodyColor, { roughness: 0.95, flatShading: true })
  );
  body.position.y = legLen + bodyH / 2;
  body.castShadow = true;
  g.add(body);

  // White belly patch
  const belly = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW * 0.9, bodyH * 0.45, bodyLen * 0.7),
    mat(bellyColor, { roughness: 0.95, flatShading: true })
  );
  belly.position.set(0, legLen + bodyH * 0.15, 0);
  g.add(belly);

  // Head
  const head = new THREE.Group();
  head.position.set(0, legLen + bodyH * 0.95, -bodyLen / 2 - 0.08);
  const headMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.2, 0.18),
    mat(bodyColor, { roughness: 0.95, flatShading: true })
  );
  headMesh.castShadow = true;
  head.add(headMesh);
  // Tiny snout
  const snout = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.08, 0.08),
    mat(bellyColor, { roughness: 0.95 })
  );
  snout.position.set(0, -0.04, -0.1);
  head.add(snout);
  // Pink nose
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.03, 0.03),
    mat(0xd08080, { roughness: 0.7 })
  );
  nose.position.set(0, -0.03, -0.14);
  head.add(nose);
  // Eyes
  const eyeMat = mat(0x0a0a0a, { roughness: 0.4 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), eyeMat);
  eyeL.position.set(-0.06, 0.02, -0.07);
  head.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.06;
  head.add(eyeR);
  // Long signature ears (tall, slightly tilted back)
  const earMat = mat(bodyColor, { roughness: 0.95 });
  const earGeo = new THREE.CapsuleGeometry(0.035, 0.22, 4, 6);
  const ears: THREE.Object3D[] = [];
  const earL = new THREE.Mesh(earGeo, earMat);
  earL.position.set(-0.06, 0.18, 0.02);
  earL.rotation.z = 0.18;
  earL.rotation.x = -0.1;
  earL.castShadow = true;
  head.add(earL);
  ears.push(earL);
  const earR = new THREE.Mesh(earGeo, earMat);
  earR.position.set(0.06, 0.18, 0.02);
  earR.rotation.z = -0.18;
  earR.rotation.x = -0.1;
  earR.castShadow = true;
  head.add(earR);
  ears.push(earR);
  g.add(head);

  // 4 small legs
  function makeLeg(x: number, z: number) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, legLen, 0.07),
      mat(bodyColor, { roughness: 0.95 })
    );
    leg.position.set(x, legLen / 2, z);
    g.add(leg);
    return leg;
  }
  const legFL = makeLeg(-bodyW * 0.3, -bodyLen * 0.32);
  const legFR = makeLeg(bodyW * 0.3, -bodyLen * 0.32);
  const legBL = makeLeg(-bodyW * 0.3, bodyLen * 0.32);
  const legBR = makeLeg(bodyW * 0.3, bodyLen * 0.32);

  // Fluffy white tail (cotton-tail)
  const tail = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 6, 5),
    mat(0xf0e8d8, { roughness: 0.95 })
  );
  tail.position.set(0, legLen + bodyH * 0.7, bodyLen / 2 + 0.04);
  g.add(tail);

  const hp = 8;
  return {
    root: g,
    kind: "rabbit",
    hp,
    maxHp: hp,
    state: "wander",
    target: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    nextDecision: 0,
    attackCooldown: 0,
    dead: false,
    corpseTime: 0,
    legFL, legFR, legBL, legBR,
    head,
    ears,
  };
}

// ---- Wolf: medium (0.8m tall), gray, box-based procedural geometry ----
function makeWolf(): AnimalInstance {
  const g = new THREE.Group();
  const furColor = 0x5a5a5a; // gray
  const bellyColor = 0x3a3a3a; // darker underbelly
  const bodyLen = 1.25;
  const bodyH = 0.55;
  const bodyW = 0.4;
  const legLen = 0.55;

  // Body — elongated box
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW, bodyH, bodyLen),
    mat(furColor, { roughness: 0.92, flatShading: true })
  );
  body.position.y = legLen + bodyH / 2 - 0.05;
  body.castShadow = true;
  g.add(body);

  // Darker underbelly
  const belly = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW * 0.95, bodyH * 0.4, bodyLen * 0.85),
    mat(bellyColor, { roughness: 0.95, flatShading: true })
  );
  belly.position.set(0, legLen + bodyH * 0.05, 0);
  g.add(belly);

  // Neck — slightly elevated box
  const neck = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW * 0.85, bodyH * 0.7, 0.3),
    mat(furColor, { roughness: 0.92, flatShading: true })
  );
  neck.position.set(0, legLen + bodyH * 0.85, -bodyLen / 2 + 0.05);
  neck.castShadow = true;
  g.add(neck);

  // Head
  const head = new THREE.Group();
  head.position.set(0, legLen + bodyH * 1.0, -bodyLen / 2 - 0.18);
  const headMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.28, 0.35),
    mat(furColor, { roughness: 0.92, flatShading: true })
  );
  headMesh.castShadow = true;
  head.add(headMesh);
  // Snout — elongated box muzzle
  const snout = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.14, 0.25),
    mat(bellyColor, { roughness: 0.92, flatShading: true })
  );
  snout.position.set(0, -0.04, -0.25);
  head.add(snout);
  // Black nose tip
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.07, 0.05, 0.05),
    mat(0x0a0a0a, { roughness: 0.5 })
  );
  nose.position.set(0, -0.02, -0.36);
  head.add(nose);
  // Eyes — glowing amber for menace
  const eyeMat = mat(0xffb030, { roughness: 0.3, emissive: 0x553000, emissiveIntensity: 0.6 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), eyeMat);
  eyeL.position.set(-0.08, 0.04, -0.12);
  head.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.08;
  head.add(eyeR);
  // Pointed triangle ears (alert)
  const earMat = mat(furColor, { roughness: 0.95 });
  const earGeo = new THREE.ConeGeometry(0.08, 0.18, 4);
  const ears: THREE.Object3D[] = [];
  const earL = new THREE.Mesh(earGeo, earMat);
  earL.position.set(-0.1, 0.18, 0.02);
  earL.rotation.z = -0.15;
  head.add(earL);
  ears.push(earL);
  const earR = new THREE.Mesh(earGeo, earMat);
  earR.position.set(0.1, 0.18, 0.02);
  earR.rotation.z = 0.15;
  head.add(earR);
  ears.push(earR);
  // Lower jaw (visible teeth when attacking)
  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.05, 0.2),
    mat(0x2a1a10, { roughness: 0.9 })
  );
  jaw.position.set(0, -0.12, -0.22);
  head.add(jaw);
  // Teeth (small white triangles)
  const toothMat = mat(0xeeeeee, { roughness: 0.3 });
  for (let i = 0; i < 4; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 3), toothMat);
    tooth.position.set(-0.05 + i * 0.033, -0.13, -0.32);
    tooth.rotation.x = Math.PI;
    head.add(tooth);
  }
  g.add(head);

  // 4 legs
  function makeLeg(x: number, z: number) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, legLen, 0.12),
      mat(furColor, { roughness: 0.92, flatShading: true })
    );
    leg.position.set(x, legLen / 2, z);
    leg.castShadow = true;
    g.add(leg);
    return leg;
  }
  const legFL = makeLeg(-bodyW * 0.32, -bodyLen * 0.35);
  const legFR = makeLeg(bodyW * 0.32, -bodyLen * 0.35);
  const legBL = makeLeg(-bodyW * 0.32, bodyLen * 0.35);
  const legBR = makeLeg(bodyW * 0.32, bodyLen * 0.35);

  // Bushy tail (slightly curved box)
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 0.4),
    mat(furColor, { roughness: 0.95, flatShading: true })
  );
  tail.position.set(0, legLen + bodyH * 0.7, bodyLen / 2 + 0.15);
  tail.rotation.x = -0.6;
  g.add(tail);

  const hp = 35;
  return {
    root: g,
    kind: "wolf",
    hp,
    maxHp: hp,
    state: "wander",
    target: new THREE.Vector3(),
    vel: new THREE.Vector3(),
    nextDecision: 0,
    attackCooldown: 0,
    dead: false,
    corpseTime: 0,
    legFL, legFR, legBL, legBR,
    head,
    ears,
  };
}

// ============ CORPSE ============
export function makeCorpse(kind: AnimalKind): THREE.Group {
  const g = new THREE.Group();
  const a = makeAnimal(kind);
  // Task 2: lay the corpse on its SIDE (Z-axis rotation) instead of tilting
  // forward into the ground (the old rotation.x = -π/2 made the head point
  // straight down). Z-axis rotation rolls the body 90° so it rests on its
  // side with the head pointing forward along the ground.
  a.root.rotation.z = Math.PI / 2;
  // Lift slightly so the body (which is now horizontal) sits at ground level.
  // bodyW ranges 0.22 (rabbit) to 0.85 (bear); 0.35 is a reasonable average
  // lift that keeps most corpses from clipping into the terrain.
  a.root.position.y = 0.35;
  g.add(a.root);
  // blood pool
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16), mat(0x5a0a0a, { roughness: 0.6 }));
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.02;
  g.add(pool);
  return g;
}

// ============ TRADER NPC ============
// A wandering trader humanoid ~1.8m tall: brown trench coat, wide-brimmed hat,
// backpack, glowing lantern in the right hand.
export interface TraderInstance {
  root: THREE.Group;
  pos: THREE.Vector3;
  yaw: number;
  wanderTarget: THREE.Vector3;
  nextWander: number;
  lantern: THREE.PointLight;
}

export function makeTrader(): TraderInstance {
  const g = new THREE.Group();
  const coatColor = 0x5a3a1a;
  const skinColor = 0x8b6f47;
  const hatColor = 0x3a2a1a;
  const packColor = 0x4a2a1a;

  // Legs (simple cylinders, dark trousers)
  const legMat = mat(0x2a1a10, { roughness: 1 });
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.85, 6), legMat);
  legL.position.set(-0.13, 0.43, 0);
  legL.castShadow = true;
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.13;
  g.add(legR);
  // boots
  const bootMat = mat(0x1a1008, { roughness: 0.8 });
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.24), bootMat);
  bootL.position.set(-0.13, 0.05, 0.04);
  g.add(bootL);
  const bootR = bootL.clone();
  bootR.position.x = 0.13;
  g.add(bootR);

  // Body: trench coat (box 0.6 x 0.8 x 0.35)
  const coat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), mat(coatColor, { roughness: 0.95 }));
  coat.position.y = 1.25;
  coat.castShadow = true;
  g.add(coat);
  // Coat skirt flare (slightly wider at bottom)
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.25, 0.4), mat(coatColor, { roughness: 0.95 }));
  skirt.position.y = 0.85;
  g.add(skirt);
  // Coat lapel detail
  const lapelMat = mat(0x3a2410, { roughness: 1 });
  const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.02), lapelMat);
  lapelL.position.set(-0.13, 1.35, 0.18);
  g.add(lapelL);
  const lapelR = lapelL.clone();
  lapelR.position.x = 0.13;
  g.add(lapelR);
  // Belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.37), mat(0x1a1008, { roughness: 0.7 }));
  belt.position.y = 0.95;
  g.add(belt);
  // Buckle
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.02), mat(0xc8a040, { metalness: 0.6, roughness: 0.4 }));
  buckle.position.set(0, 0.95, 0.19);
  g.add(buckle);

  // Arms (coat sleeves)
  const armMat = mat(coatColor, { roughness: 0.95 });
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.65, 6), armMat);
  armL.position.set(-0.37, 1.25, 0);
  armL.rotation.z = 0.15;
  armL.castShadow = true;
  g.add(armL);
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.65, 6), armMat);
  armR.position.set(0.37, 1.25, 0);
  armR.rotation.z = -0.15;
  armR.castShadow = true;
  g.add(armR);
  // Hands (skin)
  const handMat = mat(skinColor, { roughness: 0.8 });
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), handMat);
  handL.position.set(-0.43, 0.93, 0);
  g.add(handL);

  // Neck + head (skin-tone sphere)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 6), handMat);
  neck.position.y = 1.7;
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), handMat);
  head.position.y = 1.83;
  head.scale.y = 1.1;
  head.castShadow = true;
  g.add(head);
  // Beard (darker patch)
  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0x4a3a20, { roughness: 1 }));
  beard.position.set(0, 1.78, 0.06);
  beard.scale.set(0.9, 0.7, 0.9);
  g.add(beard);
  // Eyes
  const eyeMat = mat(0x1a1a1a, { roughness: 0.5 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), eyeMat);
  eyeL.position.set(-0.06, 1.86, 0.14);
  g.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.06;
  g.add(eyeR);

  // Hat: wide-brimmed (cylinder brim + cone crown)
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 14), mat(hatColor, { roughness: 1 }));
  hatBrim.position.y = 1.99;
  g.add(hatBrim);
  const hatCrown = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.18, 12),
    mat(hatColor, { roughness: 1 })
  );
  hatCrown.position.y = 2.1;
  g.add(hatCrown);
  // Hat band
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.181, 0.181, 0.03, 12), mat(0xc8a040, { metalness: 0.4, roughness: 0.5 }));
  band.position.y = 2.02;
  g.add(band);

  // Backpack: small box on the back (z = -0.22)
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), mat(packColor, { roughness: 1 }));
  pack.position.set(0, 1.3, -0.27);
  pack.castShadow = true;
  g.add(pack);
  // Pack flap / strap detail
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.02), mat(0x2a1a10, { roughness: 1 }));
  strap.position.set(0, 1.45, -0.16);
  g.add(strap);

  // Lantern in right hand: small yellow emissive sphere
  const handR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), handMat);
  handR.position.set(0.43, 0.93, 0);
  g.add(handR);
  // Lantern body (small box)
  const lanternBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.18, 0.13),
    mat(0x222222, { metalness: 0.5, roughness: 0.5 })
  );
  lanternBody.position.set(0.43, 0.78, 0.12);
  g.add(lanternBody);
  // Glowing yellow core
  const lanternGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 10, 8),
    mat(0xffd040, { emissive: 0xffa020, emissiveIntensity: 1.6, transparent: true, opacity: 0.95 })
  );
  lanternGlow.position.set(0.43, 0.78, 0.13);
  g.add(lanternGlow);
  // Point light from lantern (warm, modest radius)
  const lanternLight = new THREE.PointLight(0xffb040, 2.0, 8, 2);
  lanternLight.position.set(0.43, 0.85, 0.15);
  lanternLight.userData.baseIntensity = 2.0;
  lanternLight.userData.fireLight = true;
  g.add(lanternLight);

  // Tag the group so engine can identify the trader via raycast / interaction
  g.userData.isTrader = true;
  g.userData.traderId = "trader";
  g.userData.kind = "trader";

  return {
    root: g,
    pos: new THREE.Vector3(),
    yaw: 0,
    wanderTarget: new THREE.Vector3(),
    nextWander: 0,
    lantern: lanternLight,
  };
}

// ============ PHASE 5: DIREWOLF ALPHA BOSS ============
// A massive black wolf (~1.4m tall, 2.5m long) with glowing red eyes,
// scarred hide, and a smaller health bar above. Spawns rarely at night.
export interface BossInstance {
  root: THREE.Group;
  pos: THREE.Vector3;
  yaw: number;
  state: "wander" | "stalk" | "attack" | "flee";
  target: THREE.Vector3 | null;
  nextDecision: number;
  attackCooldown: number;
  hp: number;
  maxHp: number;
  head: THREE.Object3D | null;
  legFL: THREE.Object3D | null;
  legFR: THREE.Object3D | null;
  legBL: THREE.Object3D | null;
  legBR: THREE.Object3D | null;
  eyes: THREE.Mesh[];
  bodyMesh: THREE.Mesh;
  dead: boolean;
  corpseTime: number;
}

export function makeDirewolfAlpha(): BossInstance {
  const g = new THREE.Group();
  // Color: near-black fur with hints of dark gray
  const furMat = mat(0x1a1a1a, { roughness: 1, flatShading: true });
  const scarMat = mat(0x6a2a1a, { roughness: 0.9 });
  const clawMat = mat(0xe8e0c8, { roughness: 0.6 });

  // Body (larger than wolf — 1.6m long, 0.6m wide)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 1.6), furMat);
  body.position.set(0, 0.95, 0);
  body.castShadow = true;
  g.add(body);
  // Shoulder hump (raised back)
  const hump = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.3, 0.6), furMat);
  hump.position.set(0, 1.2, -0.1);
  g.add(hump);
  // Belly (slightly lighter)
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 1.4), mat(0x3a3a3a, { roughness: 1 }));
  belly.position.set(0, 0.6, 0);
  g.add(belly);

  // Head (bigger box)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.55), furMat);
  head.position.set(0, 1.1, 0.95);
  head.castShadow = true;
  g.add(head);
  // Snout (elongated)
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.3, 0.4), furMat);
  snout.position.set(0, 1.0, 1.35);
  g.add(snout);
  // Lower jaw
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.36), mat(0x2a2a2a, { roughness: 1 }));
  jaw.position.set(0, 0.85, 1.32);
  g.add(jaw);
  // Ears (triangular prisms using cones)
  const earL = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), furMat);
  earL.position.set(-0.2, 1.5, 0.85);
  earL.rotation.y = Math.PI / 4;
  g.add(earL);
  const earR = earL.clone();
  earR.position.x = 0.2;
  g.add(earR);
  // Glowing red eyes (emissive spheres)
  const eyeMat = mat(0xff2020, { emissive: 0xff0000, emissiveIntensity: 2.5 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), eyeMat);
  eyeL.position.set(-0.12, 1.18, 1.2);
  g.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.12;
  g.add(eyeR);
  // Tiny red point light to make eyes glow at night
  const eyeLight = new THREE.PointLight(0xff2020, 1.2, 4, 2);
  eyeLight.position.set(0, 1.18, 1.25);
  g.add(eyeLight);

  // Snarling teeth (white cones along the jaw front)
  for (let i = 0; i < 4; i++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), clawMat);
    tooth.position.set(-0.12 + i * 0.08, 0.86, 1.5);
    tooth.rotation.x = Math.PI;
    g.add(tooth);
  }
  // Two massive fangs (longer)
  const fangMat = mat(0xf0e8c8, { roughness: 0.5 });
  const fangL = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), fangMat);
  fangL.position.set(-0.1, 0.78, 1.45);
  fangL.rotation.x = Math.PI;
  g.add(fangL);
  const fangR = fangL.clone();
  fangR.position.x = 0.1;
  g.add(fangR);

  // Legs (4 — bigger cylinders)
  const legGeo = new THREE.BoxGeometry(0.18, 0.8, 0.18);
  const legFL = new THREE.Mesh(legGeo, furMat);
  legFL.position.set(-0.22, 0.4, 0.55);
  g.add(legFL);
  const legFR = legFL.clone();
  legFR.position.x = 0.22;
  g.add(legFR);
  const legBL = legFL.clone();
  legBL.position.set(-0.22, 0.4, -0.55);
  g.add(legBL);
  const legBR = legFL.clone();
  legBR.position.set(0.22, 0.4, -0.55);
  g.add(legBR);
  // Claws on each foot (small dark cones)
  for (const leg of [legFL, legFR, legBL, legBR]) {
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 4), clawMat);
      claw.position.copy(leg.position);
      claw.position.x += (i - 1) * 0.05;
      claw.position.y = 0.04;
      claw.position.z += 0.1;
      claw.rotation.x = Math.PI;
      g.add(claw);
    }
  }

  // Tail (long curved cylinder)
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.9, 6), furMat);
  tail.position.set(0, 1.0, -0.95);
  tail.rotation.x = 0.6;
  g.add(tail);

  // Battle scars (red strips on body)
  const scar1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), scarMat);
  scar1.position.set(0.36, 1.0, 0.1);
  scar1.rotation.z = 0.3;
  g.add(scar1);
  const scar2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.4), scarMat);
  scar2.position.set(-0.36, 0.95, -0.2);
  scar2.rotation.z = -0.4;
  g.add(scar2);
  const scar3 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), scarMat);
  scar3.position.set(0, 1.3, -0.4);
  g.add(scar3);

  g.userData.kind = "boss";
  g.userData.isBoss = true;

  return {
    root: g,
    pos: new THREE.Vector3(),
    yaw: 0,
    state: "wander",
    target: null,
    nextDecision: 0,
    attackCooldown: 0,
    hp: 500,
    maxHp: 500,
    head,
    legFL, legFR, legBL, legBR,
    eyes: [eyeL, eyeR],
    bodyMesh: body,
    dead: false,
    corpseTime: 0,
  };
}

// Phase 6: Companion NPC — friendly helper that gathers resources
export interface CompanionInstance {
  root: THREE.Group;
  pos: THREE.Vector3;
  yaw: number;
  state: "follow" | "gather" | "wait";
  target: THREE.Vector3 | null;
  carrying: { id: string; qty: number }[];
  hp: number;
  gatherTimer: number;
  dead: boolean;
  respawnTimer: number;
  headMesh: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armL: THREE.Group;
  armR: THREE.Group;
  bandMesh: THREE.Mesh; // green armband
}

export function makeCompanion(): CompanionInstance {
  const g = new THREE.Group();
  const skinColor = 0xdeb887;
  const shirtColor = 0x4a7a4a; // green shirt
  const pantsColor = 0x3a3a2a;

  // Legs
  const legMat = mat(pantsColor, { roughness: 1 });
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6), legMat);
  legL.position.set(-0.12, 0.4, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.12;
  g.add(legR);

  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), mat(shirtColor, { roughness: 0.8 }));
  body.position.set(0, 1.05, 0);
  g.add(body);

  // Arms
  const armMat = mat(shirtColor, { roughness: 0.8 });
  const armL = new THREE.Group();
  const armMeshL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 6), armMat);
  armMeshL.position.set(0, -0.22, 0);
  armL.add(armMeshL);
  armL.position.set(-0.25, 1.2, 0);
  g.add(armL);
  const armR = new THREE.Group();
  const armMeshR = armMeshL.clone();
  armR.add(armMeshR);
  armR.position.set(0.25, 1.2, 0);
  g.add(armR);

  // Green armband on right arm
  const bandMat = mat(0x22cc44, { emissive: 0x22cc44, emissiveIntensity: 0.3 });
  const bandMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.08, 8), bandMat);
  bandMesh.position.set(0, -0.1, 0);
  armR.add(bandMesh);

  // Head
  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat(skinColor, { roughness: 0.7 }));
  headMesh.position.set(0, 1.5, 0);
  g.add(headMesh);

  // Friendly smile (small arc) — just 2 eyes + mouth line
  const eyeMat = mat(0x1a1a1a);
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), eyeMat);
  eyeL.position.set(-0.05, 1.53, 0.13);
  g.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.05;
  g.add(eyeR);
  // Mouth (small smile line)
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.01, 0.01), eyeMat);
  mouth.position.set(0, 1.46, 0.14);
  g.add(mouth);

  // Hair (brown cap)
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x4a3020, { roughness: 1 }));
  hair.position.set(0, 1.52, 0);
  g.add(hair);

  g.userData.kind = "companion";
  g.userData.isCompanion = true;
  g.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; } });

  return {
    root: g,
    pos: new THREE.Vector3(),
    yaw: 0,
    state: "follow",
    target: null,
    carrying: [],
    hp: 100,
    gatherTimer: 0,
    dead: false,
    respawnTimer: 0,
    headMesh,
    legL,
    legR,
    armL,
    armR,
    bandMesh,
  };
}
