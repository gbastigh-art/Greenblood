// Greenblood noise library — Perlin (gradient) noise, value noise, fBm, ridge noise,
// and Voronoi (cellular) noise. All deterministic per seed.

// ===== Hashing =====
function hash2(x: number, y: number, seed: number): number {
  let h = x * 374761393 + y * 668265263 + seed * 1664525;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295; // 0..1
}

// Gradient hash for Perlin — returns a value in -1..1 derived from a gradient vector.
function grad2(x: number, y: number, seed: number): number {
  // Pick one of 8 gradient directions based on hash, dot with (xf, yf).
  const h = hash2(x, y, seed) * 8;
  const u = h < 4 ? 1 : -1;
  const v = (h % 2) < 1 ? 1 : -1;
  // dot product with fractional position is done by caller; here we return a
  // pseudo-gradient scalar weighted by the hash for a smooth result.
  return (u + v) * 0.5 - 0.5;
}

function smooth(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10); // quintic Perlin smootherstep
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// ===== Perlin (gradient) noise 2D =====
// Classic Ken Perlin gradient noise — smoother and less grid-aligned than value noise.
export function perlin2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = x - x0;
  const yf = y - y0;
  const u = smooth(xf);
  const v = smooth(yf);

  // Gradient vectors at the four corners (deterministic from hash).
  function g(ix: number, iy: number): [number, number] {
    const h = hash2(ix, iy, seed) * 8;
    const angle = (h / 8) * Math.PI * 2;
    return [Math.cos(angle), Math.sin(angle)];
  }
  const g00 = g(x0, y0);
  const g10 = g(x0 + 1, y0);
  const g01 = g(x0, y0 + 1);
  const g11 = g(x0 + 1, y0 + 1);

  // Dot products of gradient with offset vector.
  const d00 = g00[0] * xf + g00[1] * yf;
  const d10 = g10[0] * (xf - 1) + g10[1] * yf;
  const d01 = g01[0] * xf + g01[1] * (yf - 1);
  const d11 = g11[0] * (xf - 1) + g11[1] * (yf - 1);

  const a = lerp(d00, d10, u);
  const b = lerp(d01, d11, u);
  return lerp(a, b, v); // -1..1
}

// ===== Value noise 2D (kept for backward compat) =====
export function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = x - x0;
  const yf = y - y0;
  const v00 = hash2(x0, y0, seed) * 2 - 1;
  const v10 = hash2(x0 + 1, y0, seed) * 2 - 1;
  const v01 = hash2(x0, y0 + 1, seed) * 2 - 1;
  const v11 = hash2(x0 + 1, y0 + 1, seed) * 2 - 1;
  const u = smooth(xf);
  const v = smooth(yf);
  const a = lerp(v00, v10, u);
  const b = lerp(v01, v11, u);
  return lerp(a, b, v); // -1..1
}

// ===== Fractal Brownian motion (layered noise) =====
// Uses Perlin noise as the base for richer, more natural variation.
export function fbm2D(x: number, y: number, seed: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * perlin2D(x * freq, y * freq, seed + i * 17);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm; // -1..1
}

// ===== Ridge noise (mountain ridges) =====
// Produces sharp ridgelines typical of mountain ranges.
export function ridge2D(x: number, y: number, seed: number, octaves = 4, lacunarity = 2, gain = 0.5): number {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(perlin2D(x * freq, y * freq, seed + i * 31));
    sum += amp * n * n;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return (sum / norm) * 2 - 1; // -1..1
}

// ===== Voronoi (cellular) noise =====
// Returns the distance to the closest feature point + the cell id.
// Useful for territory-like regions and plateau formations.
export function voronoi2D(x: number, y: number, seed: number, cellSize: number = 40): { dist: number; id: number; edge: number } {
  const cx = Math.floor(x / cellSize);
  const cy = Math.floor(y / cellSize);
  let minDist = Infinity;
  let secondDist = Infinity;
  let cellId = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ix = cx + dx;
      const iy = cy + dy;
      // Feature point jitter within the cell.
      const jx = (ix + hash2(ix, iy, seed)) * cellSize;
      const jy = (iy + hash2(ix, iy, seed + 999)) * cellSize;
      const d = Math.sqrt((x - jx) ** 2 + (y - jy) ** 2);
      if (d < minDist) {
        secondDist = minDist;
        minDist = d;
        cellId = hash2(ix, iy, seed + 7);
      } else if (d < secondDist) {
        secondDist = d;
      }
    }
  }
  // edge = 0 at cell centers, 1 at borders between cells.
  const edge = secondDist - minDist;
  return { dist: minDist, id: cellId, edge };
}

// Seeded RNG (mulberry32)
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng: () => number, lo: number, hi: number) {
  return lo + (hi - lo) * rng();
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
