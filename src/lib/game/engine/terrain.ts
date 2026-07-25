// Greenblood terrain — layered Perlin + ridge + Voronoi noise for natural hills,
// valleys, and mountain regions. Heightfield + collision query + ground materials.
import * as THREE from "three";
import { fbm2D, ridge2D, voronoi2D, perlin2D } from "./noise";

export interface TerrainOptions {
  size: number; // world size in meters (square)
  segments: number; // grid resolution
  seed: number;
  amplitude: number; // height range
}

export class Terrain {
  opts: TerrainOptions;
  mesh!: THREE.Mesh;
  geometry!: THREE.PlaneGeometry;
  heights: Float32Array;
  segmentSize: number;
  halfSize: number;
  // Registered lake discs — terrain is lowered inside these so water sits at
  // the surface instead of being buried under raised terrain.
  lakes: { x: number; z: number; r: number; waterLevel: number }[] = [];

  constructor(opts: TerrainOptions) {
    this.opts = opts;
    this.heights = new Float32Array((opts.segments + 1) * (opts.segments + 1));
    this.segmentSize = opts.size / opts.segments;
    this.halfSize = opts.size / 2;
  }

  // Register a lake disc and carve a depression into the terrain so the water
  // plane (at `waterLevel`) is at/above the ground. The terrain smoothly dips
  // to `waterLevel - depth` at the lake centre and rises back to its natural
  // height at the disc edge. Call this BEFORE build() so the geometry picks up
  // the carved heights.
  addLake(x: number, z: number, r: number, waterLevel: number) {
    this.lakes.push({ x, z, r, waterLevel });
  }

  // Procedural height function (world coords) — combines:
  //  - Large rolling hills (low-freq fBm)
  //  - Medium ridges (ridge noise) for mountain spines
  //  - Small detail (high-freq Perlin) for surface roughness
  //  - Voronoi territories for plateau/valley regions
  heightAt(x: number, z: number): number {
    const s = this.opts.seed;

    // 1) Large rolling hills — base elevation. Shifted up so most land is above water.
    const base = fbm2D(x * 0.0042, z * 0.0042, s, 5, 2, 0.5);
    // 2) Ridge noise — creates mountain spines in some regions. Masked by a low-freq
    //    selector so mountains only appear in "mountain zones", not everywhere.
    const mountainMask = Math.max(0, perlin2D(x * 0.0016, z * 0.0016, s + 555));
    const mountains = Math.max(0, ridge2D(x * 0.0035, z * 0.0035, s + 333, 4, 2, 0.5)) * mountainMask;
    // 3) Medium detail — rolling secondary bumps.
    const med = fbm2D(x * 0.014, z * 0.014, s + 99, 3, 2, 0.5) * 0.3;
    // 4) Small surface roughness.
    const small = perlin2D(x * 0.06, z * 0.06, s + 199) * 0.06;
    // 5) Voronoi territories — gentle plateaus that vary by cell, broken up at edges.
    const vor = voronoi2D(x, z, s + 777, 60);
    const voronoiPlateau = (vor.id - 0.5) * 0.15;

    // Compose — base + medium + small give the bulk of the rolling terrain.
    // Mountains add tall peaks where the mask allows. Voronoi adds subtle region variety.
    const composed = base * 0.55 + med + small + voronoiPlateau + 0.5;
    const h = composed * this.opts.amplitude + mountains * this.opts.amplitude * 2.2;

    // Flatten near spawn (origin) so the player starts on gentle ground.
    const dist = Math.sqrt(x * x + z * z);
    const flat = THREE.MathUtils.smoothstep(dist, 0, 35);
    let finalH = h * flat;

    // Carve lake depressions — for each registered lake, smoothly lower the
    // terrain to `waterLevel - depth` at the centre, blending back to the
    // natural height at the disc edge. This makes water sit at the surface.
    // Task 13: carve depth reduced from 1.5 to 0.6 so the water sits at/just
    // below the surrounding terrain surface instead of in a deep pit.
    for (let i = 0; i < this.lakes.length; i++) {
      const lk = this.lakes[i];
      const dx = x - lk.x;
      const dz = z - lk.z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < lk.r) {
        // Smoothstep falloff: 0 at edge → 1 at centre.
        const t = 1 - THREE.MathUtils.smoothstep(d, lk.r * 0.2, lk.r);
        // Lake bed sits a bit below the water level so the water disc has depth.
        const bedBottom = lk.waterLevel - 0.6;
        finalH = finalH * (1 - t) + bedBottom * t;
      }
    }
    return finalH;
  }

  build(): THREE.Mesh {
    const { size, segments, seed } = this.opts;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const grassCol = new THREE.Color(0x4a6b32);
    const grassDark = new THREE.Color(0x384f24);
    const dirtCol = new THREE.Color(0x6b4a2b);
    const rockCol = new THREE.Color(0x6a6a6a);
    const snowCol = new THREE.Color(0xeeeeee);
    const sandCol = new THREE.Color(0xb9a06b);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.heightAt(x, z);
      pos.setY(i, h);
      this.heights[i] = h;

      // Color by altitude/slope
      const c = grassCol.clone();
      const slope = Math.abs(this.slopeAt(x, z));
      if (h < 0.4) c.lerp(sandCol, 0.5);
      else if (h < 5) c.lerp(grassDark, 0.4);
      else if (h < 12) c.lerp(dirtCol, 0.55);
      else if (h > 24) c.lerp(snowCol, 0.7);
      else c.lerp(rockCol, 0.3);
      if (slope > 0.5) c.lerp(rockCol, 0.7);
      // Slight noise variation
      const n = perlin2D(x * 0.2, z * 0.2, seed + 7);
      c.offsetHSL(0, 0, n * 0.06);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.97,
      metalness: 0.0,
      flatShading: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = "terrain";
    this.mesh = mesh;
    this.geometry = geo;
    return mesh;
  }

  // Slope estimate at world xz.
  slopeAt(x: number, z: number): number {
    const e = 1.0;
    const hL = this.heightAt(x - e, z);
    const hR = this.heightAt(x + e, z);
    const hD = this.heightAt(x, z - e);
    const hU = this.heightAt(x, z + e);
    return Math.sqrt(((hR - hL) / (2 * e)) ** 2 + ((hU - hD) / (2 * e)) ** 2);
  }

  // Get terrain height (used by player & objects).
  getHeight(x: number, z: number): number {
    return this.heightAt(x, z);
  }
}
