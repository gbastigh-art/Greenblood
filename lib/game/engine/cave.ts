// Cave system: procedurally generated underground area with mining nodes.
// Stops at a finite size so the game stays performant.
import * as THREE from "three";
import { mulberry32, randRange, pick } from "./noise";
import { makeRock, type RockInstance } from "./factory";
import { Terrain } from "./terrain";

export interface CaveConfig {
  size: number; // square dimensions
  cells: number; // grid resolution
  seed: number;
}

export class CaveSystem {
  cfg: CaveConfig;
  group: THREE.Group;
  rocks: RockInstance[] = [];
  entrance: THREE.Vector3;
  // mesh references for mining
  oreMeshes: Map<number, RockInstance> = new Map();
  visited: boolean = false;

  constructor(cfg: CaveConfig, entrance: THREE.Vector3) {
    this.cfg = cfg;
    this.entrance = entrance.clone();
    this.group = new THREE.Group();
  }

  build(rng: () => number) {
    const { size, cells, seed } = this.cfg;
    // Cave is a flat box at Y = -10 (below terrain).
    // Generate cave floor with height variation
    const floorGeo = new THREE.PlaneGeometry(size, size, cells, cells);
    floorGeo.rotateX(-Math.PI / 2);
    const pos = floorGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // bumps
      const n = (Math.sin(x * 0.3) + Math.cos(z * 0.4)) * 0.3 + (rng() - 0.5) * 0.4;
      pos.setY(i, n);
    }
    floorGeo.computeVertexNormals();
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1, flatShading: true });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(size, size, 8, 8);
    ceilGeo.rotateX(Math.PI / 2);
    const ceil = new THREE.Mesh(ceilGeo, new THREE.MeshStandardMaterial({ color: 0x2a1a15, roughness: 1, side: THREE.DoubleSide }));
    ceil.position.y = 6;
    this.group.add(ceil);

    // Walls around the perimeter
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 1 });
    const wallH = 7;
    const walls = [
      { w: size, d: 1, x: 0, z: -size / 2 },
      { w: size, d: 1, x: 0, z: size / 2 },
      { w: 1, d: size, x: -size / 2, z: 0 },
      { w: 1, d: size, x: size / 2, z: 0 },
    ];
    for (const w of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w.w, wallH, w.d), wallMat);
      m.position.set(w.x, wallH / 2, w.z);
      this.group.add(m);
    }

    // Random stalactites hanging from ceiling
    for (let i = 0; i < 30; i++) {
      const s = new THREE.Mesh(
        new THREE.ConeGeometry(randRange(rng, 0.1, 0.3), randRange(rng, 0.5, 1.5), 5),
        new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1, flatShading: true })
      );
      s.position.set(randRange(rng, -size / 2 + 2, size / 2 - 2), 6 - 0.3, randRange(rng, -size / 2 + 2, size / 2 - 2));
      s.rotation.x = Math.PI;
      this.group.add(s);
    }

    // Pillars
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(
        new THREE.CylinderGeometry(randRange(rng, 0.3, 0.7), randRange(rng, 0.4, 0.9), 6, 6),
        new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 1, flatShading: true })
      );
      p.position.set(randRange(rng, -size / 2 + 3, size / 2 - 3), 3, randRange(rng, -size / 2 + 3, size / 2 - 3));
      p.castShadow = true;
      this.group.add(p);
    }

    // Mining nodes (stone, coal, iron)
    const nodeCount = 40;
    for (let i = 0; i < nodeCount; i++) {
      const kind = pick(rng, ["stone", "stone", "coal", "coal", "iron"]) as "stone" | "coal" | "iron";
      const x = randRange(rng, -size / 2 + 3, size / 2 - 3);
      const z = randRange(rng, -size / 2 + 3, size / 2 - 3);
      const y = (Math.sin(x * 0.3) + Math.cos(z * 0.4)) * 0.3;
      const r = makeRock(rng, x, y, z, kind);
      r.group.scale.setScalar(1.6);
      this.group.add(r.group);
      this.rocks.push(r);
      this.oreMeshes.set(i, r);
    }

    // Place cave underground
    this.group.position.set(this.entrance.x, -10, this.entrance.z);
    this.group.visible = false;
    return this.group;
  }

  // Switch the player into the cave.
  enter() {
    this.visited = true;
    this.group.visible = true;
  }
  exit() {
    this.group.visible = false;
  }
}
