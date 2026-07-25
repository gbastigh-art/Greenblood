// Sky, sun, day/night cycle, weather visuals, clouds, crows.
import * as THREE from "three";

export type WeatherKind = "sunny" | "cloudy" | "rainy" | "foggy" | "blizzard";

export class SkySystem {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  sun: THREE.DirectionalLight;
  moon: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  skyMesh!: THREE.Mesh;
  skyMat!: THREE.ShaderMaterial;
  sunMesh!: THREE.Mesh;
  moonMesh!: THREE.Mesh;
  cloudGroup: THREE.Group;
  rainPoints!: THREE.Points;
  rainMat!: THREE.PointsMaterial;
  fogGroup: THREE.Group;
  crows: { mesh: THREE.Group; speed: number; radius: number; phase: number; height: number }[] = [];

  weather: WeatherKind = "sunny";
  timeOfDay: number = 0.32; // 0..1
  blizzardFog!: THREE.FogExp2;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
    this.sun.castShadow = true;
    // 1024 is plenty for this style (was 2048). Tightened frustum (60m half-extent
    // instead of 80m) keeps shadow texel density high while halving the cost.
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 200;
    const d = 60;
    this.sun.shadow.camera.left = -d;
    this.sun.shadow.camera.right = d;
    this.sun.shadow.camera.top = d;
    this.sun.shadow.camera.bottom = -d;
    this.sun.shadow.bias = -0.0005;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // ---- Phase 3: Moon directional light (subtle blue-ish, disabled during day) ----
    this.moon = new THREE.DirectionalLight(0xa8c4ff, 0.15);
    this.moon.castShadow = false; // cheap — sun handles shadows
    scene.add(this.moon);
    scene.add(this.moon.target);

    this.hemi = new THREE.HemisphereLight(0xa6d3ff, 0x4a5a2a, 0.7);
    scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(this.ambient);

    // Sky dome (gradient shader)
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x2b6fb0) },
        bottomColor: { value: new THREE.Color(0xc9d8e8) },
        sunDir: { value: new THREE.Vector3(0.5, 0.5, 0.5) },
        sunColor: { value: new THREE.Color(0xffd9a0) },
        nightFactor: { value: 0.0 },
        horizonGlow: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vDir;
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 sunDir;
        uniform vec3 sunColor;
        uniform float nightFactor;
        uniform float horizonGlow;
        void main() {
          float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
          vec3 col = mix(bottomColor, topColor, pow(h, 0.7));
          // sun glow
          float sunAmt = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
          col += sunColor * pow(sunAmt, 64.0) * 1.4;
          col += sunColor * pow(sunAmt, 8.0) * 0.25 * horizonGlow;
          // night sky tint
          vec3 night = vec3(0.02, 0.03, 0.08);
          col = mix(col, night, nightFactor);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.skyMesh = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), this.skyMat);
    scene.add(this.skyMesh);

    // Sun disk (visual)
    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(8, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe8a0, fog: false })
    );
    scene.add(this.sunMesh);
    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xeaeefc, fog: false })
    );
    scene.add(this.moonMesh);

    // Clouds
    this.cloudGroup = new THREE.Group();
    scene.add(this.cloudGroup);
    this.buildClouds();

    // Rain particles
    this.buildRain();

    // Fog plane (low-lying) — for foggy weather
    this.fogGroup = new THREE.Group();
    scene.add(this.fogGroup);
    this.buildFog();

    // Crows
    this.buildCrows();
  }

  private buildClouds() {
    const cloudTex = makeCloudTexture();
    const mat = new THREE.SpriteMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      fog: false,
    });
    for (let i = 0; i < 28; i++) {
      const sprite = new THREE.Sprite(mat.clone());
      const r = 80 + Math.random() * 240;
      const ang = Math.random() * Math.PI * 2;
      sprite.position.set(
        Math.cos(ang) * r,
        80 + Math.random() * 70,
        Math.sin(ang) * r
      );
      const s = 40 + Math.random() * 60;
      sprite.scale.set(s, s * 0.5, 1);
      (sprite as any).drift = 0.5 + Math.random() * 1.2;
      this.cloudGroup.add(sprite);
    }
  }

  private buildRain() {
    const N = 4000;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      // Task 4: spawn Y range 0-20 (was 0-50). Combined with the rainPoints
      // position tracking the player (no +25 offset), this puts particles
      // at world Y = playerY to playerY+20 — just above and around the player.
      positions[i * 3 + 1] = Math.random() * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.rainMat = new THREE.PointsMaterial({
      color: 0xaecbe0,
      size: 0.18,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    this.rainPoints = new THREE.Points(geo, this.rainMat);
    this.rainPoints.visible = false;
    this.rainPoints.frustumCulled = false;
    this.scene.add(this.rainPoints);
  }

  private buildFog() {
    // Large soft sprites of grey haze around player
    const tex = makeCloudTexture();
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      fog: false,
    });
    for (let i = 0; i < 24; i++) {
      const s = new THREE.Sprite(mat.clone());
      const r = 30 + Math.random() * 60;
      const a = Math.random() * Math.PI * 2;
      // Task 5: store the base offset + a stable phase so the update loop
      // can drift the sprite smoothly around its base position. The previous
      // code read s.position.x/z (which had just been mutated) to compute the
      // new position — a feedback loop that caused chaotic jumping/strobing.
      const baseX = Math.cos(a) * r;
      const baseZ = Math.sin(a) * r;
      s.position.set(baseX, 1 + Math.random() * 6, baseZ);
      s.scale.set(40, 20, 1);
      s.userData.baseX = baseX;
      s.userData.baseZ = baseZ;
      s.userData.phase = Math.random() * Math.PI * 2;
      this.fogGroup.add(s);
    }
  }

  private buildCrows() {
    const matBody = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 });
    const matWing = new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 4), matBody);
      body.scale.set(1.5, 0.6, 0.8);
      g.add(body);
      const wL = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), matWing);
      wL.position.set(-0.4, 0, 0);
      wL.rotation.x = Math.PI / 2;
      g.add(wL);
      const wR = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), matWing);
      wR.position.set(0.4, 0, 0);
      wR.rotation.x = Math.PI / 2;
      g.add(wR);
      g.scale.setScalar(2.5);
      this.scene.add(g);
      this.crows.push({
        mesh: g,
        speed: 4 + Math.random() * 3,
        radius: 30 + Math.random() * 60,
        phase: Math.random() * Math.PI * 2,
        height: 60 + Math.random() * 25,
      });
    }
  }

  setWeather(w: WeatherKind) {
    this.weather = w;
    // Task 5: reuse the existing FogExp2 object instead of creating a new one
    // each call. The update() loop sets density + color every frame based on
    // this.weather, so we just ensure the fog object exists once. Creating a
    // new FogExp2 on every weather change caused a one-frame discontinuity
    // in the renderer's fog uniform upload which read as a strobe/flicker.
    if (!(this.scene.fog instanceof THREE.FogExp2)) {
      this.scene.fog = new THREE.FogExp2(0xc9d8e8, 0.0028);
    }
  }

  // Quality presets — adjust shadow map size and sun shadow auto-update.
  // - "low": no shadows (huge perf win on weak GPUs)
  // - "medium": 1024 shadow map, shadows on
  // - "high": 2048 shadow map, shadows on
  setQuality(quality: "low" | "medium" | "high") {
    if (quality === "low") {
      this.sun.castShadow = false;
    } else {
      this.sun.castShadow = true;
      const sz = quality === "high" ? 2048 : 1024;
      // Only set mapSize if different — three.js will reallocate the shadow
      // texture on next render if the size changed.
      this.sun.shadow.mapSize.set(sz, sz);
      // Force three.js to discard the old shadow map so it reallocates at the
      // new resolution. Without this, the cached map at the old size persists.
      if (this.sun.shadow.map) {
        (this.sun.shadow.map as THREE.WebGLRenderTarget).dispose();
        this.sun.shadow.map = null as unknown as THREE.WebGLRenderTarget;
      }
    }
  }

  update(dt: number, time: number, playerPos: THREE.Vector3) {
    // ---- Day/night ----
    // sun angle: 0 = midnight (below), 0.25 = sunrise east, 0.5 = noon (top), 0.75 = sunset west
    const ang = (this.timeOfDay - 0.25) * Math.PI * 2; // 0 at sunrise
    const sunDist = 300;
    const sunY = Math.sin(ang);
    const sunX = Math.cos(ang);
    const sunZ = Math.cos(ang) * 0.3;
    const sunDir = new THREE.Vector3(sunX, sunY, sunZ).normalize();
    this.sun.position.copy(playerPos).add(sunDir.clone().multiplyScalar(sunDist));
    this.sun.target.position.copy(playerPos);
    this.sunMesh.position.copy(playerPos).add(sunDir.clone().multiplyScalar(420));
    this.moonMesh.position.copy(playerPos).add(sunDir.clone().multiplyScalar(-420));

    // ---- Moon directional light: opposite the sun ----
    const moonDir = sunDir.clone().multiplyScalar(-1);
    this.moon.position.copy(playerPos).add(moonDir.clone().multiplyScalar(sunDist));
    this.moon.target.position.copy(playerPos);

    // Day intensity — Phase 3: darker nights (intensity ~0.08-0.12 at deep night)
    // dayAmount: 0 (deep night), 1 (full day)
    const dayAmount = THREE.MathUtils.clamp(sunY * 1.2 + 0.2, 0, 1);
    const nightFactor = 1 - dayAmount;
    // nightAmount is 1 only when truly deep night (sunY very negative)
    const nightAmount = THREE.MathUtils.clamp(-sunY * 1.5, 0, 1);

    // Sun color shifts (warmer near horizon — and orange/red at sunrise/sunset 0.20-0.30 & 0.70-0.80)
    const sunWarm = new THREE.Color(0xffe8c0);
    const sunNoon = new THREE.Color(0xfff5e0);
    const sunSet = new THREE.Color(0xff7a3a);
    let sunColor = sunNoon.clone();
    if (sunY < 0.2) sunColor.lerp(sunSet, THREE.MathUtils.clamp((0.2 - sunY) / 0.2, 0, 1));
    if (sunY < 0.5) sunColor.lerp(sunWarm, 0.4);

    // Extra orange/red tint during sunrise (0.20-0.30) and sunset (0.70-0.80)
    const inSunrise = this.timeOfDay >= 0.20 && this.timeOfDay <= 0.30;
    const inSunset = this.timeOfDay >= 0.70 && this.timeOfDay <= 0.80;
    if (inSunrise || inSunset) {
      // Distance from edge — peak orange at middle (0.25 / 0.75)
      const dist = inSunrise
        ? Math.abs(this.timeOfDay - 0.25) / 0.05
        : Math.abs(this.timeOfDay - 0.75) / 0.05;
      const sunsetT = THREE.MathUtils.clamp(1 - dist, 0, 1);
      sunColor.lerp(new THREE.Color(0xff5a20), sunsetT * 0.7);
    }

    this.sun.color.copy(sunColor);
    // Phase 3: night sun intensity ~0.08-0.12 (very dark). day = 0.2 + 1.6 = 1.8
    this.sun.intensity = 0.08 + dayAmount * 1.6;
    // Hemi also fades strongly at night
    this.hemi.intensity = 0.05 + dayAmount * 0.7;
    // Ambient: very low at night (~0.04), day ~0.35
    this.ambient.intensity = 0.04 + dayAmount * 0.31;
    // Moon: enabled at night (intensity 0.15), disabled during day
    this.moon.intensity = nightAmount * 0.15;
    this.moon.visible = nightAmount > 0.05;

    this.sunMesh.visible = sunY > -0.05;
    this.moonMesh.visible = sunY < 0.05;
    (this.sunMesh.material as THREE.MeshBasicMaterial).color.copy(sunColor);

    // Sky shader uniforms — Phase 3: smoother orange/red transitions at sunrise/sunset
    const topDay = new THREE.Color(0x2b6fb0);
    const topNight = new THREE.Color(0x05080f);
    const botDay = new THREE.Color(0xc9d8e8);
    const botNight = new THREE.Color(0x101018);
    const top = topDay.clone().lerp(topNight, nightFactor);
    const bot = botDay.clone().lerp(botNight, nightFactor);
    // Orange/red horizon during sunrise/sunset (0.20-0.30 & 0.70-0.80)
    if (inSunrise || inSunset) {
      const dist = inSunrise
        ? Math.abs(this.timeOfDay - 0.25) / 0.05
        : Math.abs(this.timeOfDay - 0.75) / 0.05;
      const sunsetT = THREE.MathUtils.clamp(1 - dist, 0, 1);
      top.lerp(new THREE.Color(0x4a3018), sunsetT * 0.4);
      bot.lerp(new THREE.Color(0xff7a30), sunsetT * 0.7);
    }
    if (this.weather === "rainy" || this.weather === "cloudy") {
      top.lerp(new THREE.Color(0x6a7080), 0.55);
      bot.lerp(new THREE.Color(0x9098a8), 0.55);
    } else if (this.weather === "foggy") {
      top.lerp(new THREE.Color(0x8a8a78), 0.5);
      bot.lerp(new THREE.Color(0xb0b09a), 0.5);
    } else if (this.weather === "blizzard") {
      top.lerp(new THREE.Color(0xa8b8c8), 0.85);
      bot.lerp(new THREE.Color(0xd0d8e0), 0.85);
    }
    this.skyMat.uniforms.topColor.value.copy(top);
    this.skyMat.uniforms.bottomColor.value.copy(bot);
    this.skyMat.uniforms.sunDir.value.copy(sunDir);
    this.skyMat.uniforms.sunColor.value.copy(sunColor);
    this.skyMat.uniforms.nightFactor.value = nightFactor * 0.85;
    this.skyMat.uniforms.horizonGlow.value = 0.4 + dayAmount * 0.6;

    // ---- Phase 3: Fog density increases at night (darker, harder to see far) ----
    // Base density by weather, then add night boost.
    if (this.scene.fog instanceof THREE.FogExp2) {
      let baseDensity = 0.0028;
      if (this.weather === "foggy") baseDensity = 0.018;
      else if (this.weather === "blizzard") baseDensity = 0.075;
      else if (this.weather === "rainy") baseDensity = 0.008;
      // Boost density at night by up to ~1.6x at deep night
      const nightBoost = 1 + nightAmount * 0.6;
      this.scene.fog.density = baseDensity * nightBoost;
      // Tint fog darker at night
      if (nightAmount > 0.3) {
        const fc = new THREE.Color(0x0a1020).lerp(this.scene.fog.color, dayAmount);
        this.scene.fog.color.copy(fc);
      } else {
        // restore weather-based color
        if (this.weather === "foggy") this.scene.fog.color.set(0xb8b8a0);
        else if (this.weather === "blizzard") this.scene.fog.color.set(0xcfd8e0);
        else if (this.weather === "rainy") this.scene.fog.color.set(0x7a8090);
        else this.scene.fog.color.set(0xc9d8e8);
      }
    }

    // Clouds drift
    for (const c of this.cloudGroup.children) {
      c.position.x += (c as any).drift * dt * 0.5;
      if (c.position.x > 320) c.position.x = -320;
      (c as any).drift += (Math.random() - 0.5) * 0.02;
    }
    const cloudOp =
      this.weather === "cloudy" ? 0.9 :
      this.weather === "rainy" ? 0.95 :
      this.weather === "blizzard" ? 0.7 :
      this.weather === "foggy" ? 0.5 : 0.6;
    for (const c of this.cloudGroup.children) {
      (c as THREE.Sprite).material.opacity = cloudOp * (0.7 + 0.3 * Math.sin(time + c.position.x));
    }
    this.cloudGroup.position.copy(playerPos);
    this.cloudGroup.position.y = 0;

    // Rain
    const raining = this.weather === "rainy" || this.weather === "blizzard";
    this.rainPoints.visible = raining;
    if (raining) {
      // Task 4: follow the player in X/Z only. Y stays at playerPos.y so
      // particles (local Y 0-20) spawn at world Y = playerY to playerY+20 —
      // just above the player's head, not 25-75m above (the old +25 offset).
      this.rainPoints.position.copy(playerPos);
      const pos = this.rainPoints.geometry.attributes.position as THREE.BufferAttribute;
      const speed = this.weather === "blizzard" ? 8 : 35;
      const sideways = this.weather === "blizzard" ? 6 : 1;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - speed * dt;
        let x = pos.getX(i) + sideways * dt;
        let z = pos.getZ(i) + (this.weather === "blizzard" ? Math.sin(time + i) * 2 * dt : 0);
        // Task 4: recycle when the particle falls below the player's feet
        // (local Y < -2 → world Y < playerY - 2). Respawn at the top of the
        // spawn range so it falls down again around the player's head.
        if (y < -2) {
          y = 18 + Math.random() * 2;
          x = (Math.random() - 0.5) * 80;
          z = (Math.random() - 0.5) * 80;
        }
        if (Math.abs(x) > 40) x = -Math.sign(x) * 40;
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
      this.rainMat.color.set(this.weather === "blizzard" ? 0xffffff : 0xaecbe0);
      this.rainMat.size = this.weather === "blizzard" ? 0.35 : 0.18;
      this.rainMat.opacity = this.weather === "blizzard" ? 0.9 : 0.6;
    }

    // Fog sprites opacity
    const fogTarget = this.weather === "foggy" ? 0.55 : this.weather === "blizzard" ? 0.85 : 0;
    for (const s of this.fogGroup.children) {
      const m = (s as THREE.Sprite).material;
      m.opacity += (fogTarget - m.opacity) * Math.min(1, dt * 2);
      // Task 5: use the sprite's stored base offset + phase so the drift is
      // smooth (was: reading s.position.x/z which had just been mutated →
      // chaotic feedback loop causing the fog to strobe/jump).
      const baseX = (s.userData.baseX as number) ?? 0;
      const baseZ = (s.userData.baseZ as number) ?? 0;
      const phase = (s.userData.phase as number) ?? 0;
      s.position.x = playerPos.x + baseX + Math.sin(time * 0.3 + phase) * 8;
      s.position.z = playerPos.z + baseZ + Math.cos(time * 0.3 + phase) * 8;
    }

    // Crows — circle above, only on sunny/cloudy days
    const crowVisible = (this.weather === "sunny" || this.weather === "cloudy") && this.timeOfDay > 0.25 && this.timeOfDay < 0.78;
    for (const c of this.crows) {
      c.mesh.visible = crowVisible;
      if (!crowVisible) continue;
      c.phase += dt * (c.speed / c.radius);
      const x = playerPos.x + Math.cos(c.phase) * c.radius;
      const z = playerPos.z + Math.sin(c.phase) * c.radius;
      c.mesh.position.set(x, c.height, z);
      c.mesh.lookAt(playerPos.x + Math.cos(c.phase + 0.1) * c.radius, c.height, playerPos.z + Math.sin(c.phase + 0.1) * c.radius);
      // Wing flap
      const flap = Math.sin(time * 8 + c.phase * 4) * 0.5;
      const wL = c.mesh.children[1] as THREE.Mesh;
      const wR = c.mesh.children[2] as THREE.Mesh;
      wL.rotation.z = flap;
      wR.rotation.z = -flap;
    }
  }
}

// Procedurally generate a soft cloud sprite texture (canvas).
function makeCloudTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, "rgba(255,255,255,0.95)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.5)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}
