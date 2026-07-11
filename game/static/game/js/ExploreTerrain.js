/**
 * ExploreTerrain.js — pastel mountain ridge + river gorge (from HTML demos)
 * Placed OUTSIDE the city slab so players can leave town and explore.
 *
 * Layout (world coords):
 *   Mountain Ridge — north of city  (z ≈ -250)
 *   River Gorge    — west of river  (x ≈ -255)
 * Neither overlaps roads, bridges, or the flat city footprint.
 */
import * as THREE from 'three';
import { WORLD, isCityFlat } from './config.js';
import { toonMat, toonMesh, getGradientMap } from './ToonStyle.js';

// ─── Value noise / FBM (same as demo HTML) ─────────────────────────────────
function makeNoise(seed) {
    const s = seed;
    function rand(x, y) {
        const n = Math.sin(x * 127.1 + y * 311.7 + s) * 43758.5453123;
        return n - Math.floor(n);
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    function noise(x, y) {
        const xi = Math.floor(x), yi = Math.floor(y);
        const xf = x - xi, yf = y - yi;
        const tl = rand(xi, yi), tr = rand(xi + 1, yi);
        const bl = rand(xi, yi + 1), br = rand(xi + 1, yi + 1);
        const u = smooth(xf), v = smooth(yf);
        return tl + (tr - tl) * u + ((bl + (br - bl) * u) - (tl + (tr - tl) * u)) * v;
    }
    return function fbm(x, y, octaves = 5, lac = 2.0, gain = 0.5) {
        let amp = 0.5, freq = 1.0, sum = 0, norm = 0;
        for (let i = 0; i < octaves; i++) {
            sum += noise(x * freq, y * freq) * amp;
            norm += amp;
            amp *= gain;
            freq *= lac;
        }
        return sum / norm;
    };
}

const fbmA = makeNoise(42);
const fbmB = makeNoise(7);
const fbmC = makeNoise(99);

/** Zone definitions — carefully clear of city ±(165+28) and bridges at x≈-180 */
export const EXPLORE = {
    ridge: {
        id: 'ridge',
        label: 'Pastel Ridge',
        // North of city, beyond margin (city clear z ≈ 173)
        cx: 20,
        cz: -255,
        size: 190,
        /** Height scale vs demo (95 peak → ~34) so steps stay walkable */
        hScale: 0.36,
        baseY: 0.2,
    },
    gorge: {
        id: 'gorge',
        label: 'River Gorge',
        // West of bridges (river x≈-230); gorge center further west
        cx: -280,
        cz: 15,
        sizeX: 155,
        sizeZ: 240,
        hScale: 0.42,
        baseY: 0.15,
    },
};

export class ExploreTerrain {
    constructor() {
        this.waterMats = [];
        this.time = 0;
        this._ridge = EXPLORE.ridge;
        this._gorge = EXPLORE.gorge;
    }

    build(scene) {
        this._buildRidge(scene);
        this._buildGorge(scene);
        this._buildTrailMarkers(scene);
        return this;
    }

    update(dt) {
        this.time += dt;
        this.waterMats.forEach(m => {
            if (m.uniforms?.time) m.uniforms.time.value = this.time;
        });
    }

    /**
     * Walkable height contribution, or null if outside both zones.
     * Never raises ground inside the city flat slab.
     */
    heightAt(x, z) {
        if (isCityFlat(x, z, WORLD.cityClearMargin ?? 28)) return null;

        const ridgeH = this._ridgeHeightWorld(x, z);
        const gorgeH = this._gorgeHeightWorld(x, z);

        if (ridgeH == null && gorgeH == null) return null;
        if (ridgeH == null) return gorgeH;
        if (gorgeH == null) return ridgeH;
        return Math.max(ridgeH, gorgeH);
    }

    isInExplore(x, z) {
        return this.heightAt(x, z) != null;
    }

    getZoneLabel(x, z) {
        if (this._inRidge(x, z)) return EXPLORE.ridge.label;
        if (this._inGorge(x, z)) return EXPLORE.gorge.label;
        return null;
    }

    // ─── Bounds helpers ────────────────────────────────────────────────────
    _inRidge(x, z) {
        const r = this._ridge;
        const half = r.size / 2;
        return Math.abs(x - r.cx) <= half && Math.abs(z - r.cz) <= half;
    }

    _inGorge(x, z) {
        const g = this._gorge;
        return Math.abs(x - g.cx) <= g.sizeX / 2 && Math.abs(z - g.cz) <= g.sizeZ / 2;
    }

    // ─── Ridge height (from pastel_mountain_ridge.html) ────────────────────
    _ridgeHeightLocal(lx, lz) {
        const SIZE = this._ridge.size;
        const t = (lz + SIZE / 2) / SIZE;
        const ridgeX = -40 * (1 - t) + 10 * t + Math.sin(t * 3.0) * 8;
        const distFromRidge = lx - ridgeX;

        const peakZ = -SIZE / 2 + 40;
        const peakDist = Math.abs(lz - peakZ);
        const peakHeight = 95 * Math.exp(-(peakDist * peakDist) / (2 * 45 * 45));
        const baseRidge = 22 * (1 - t * 0.6);

        let h = baseRidge + peakHeight;
        const falloff = Math.exp(-Math.pow(distFromRidge / 26, 2));
        h *= (0.15 + 0.85 * falloff);

        const rough = fbmA(lx * 0.05 + 50, lz * 0.05 + 50, 5) - 0.5;
        h += rough * (10 + peakHeight * 0.25);

        if (t > 0.72) {
            const boulderNoise = fbmA(lx * 0.15 + 200, lz * 0.15 + 200, 3);
            if (boulderNoise > 0.62) h += (boulderNoise - 0.62) * 60;
        }

        if (falloff < 0.05) {
            h = Math.min(h, baseRidge * 0.3 - Math.abs(distFromRidge) * 0.15);
        }
        return Math.max(0, h);
    }

    _ridgeHeightWorld(x, z) {
        if (!this._inRidge(x, z)) return null;
        const r = this._ridge;
        const lx = x - r.cx;
        const lz = z - r.cz;
        const h = this._ridgeHeightLocal(lx, lz) * r.hScale + r.baseY;
        // Soft edge blend to ground near perimeter so city approach is smooth
        const half = r.size / 2;
        const edge = Math.min(
            (half - Math.abs(lx)) / 18,
            (half - Math.abs(lz)) / 18
        );
        const blend = THREE.MathUtils.clamp(edge, 0, 1);
        return THREE.MathUtils.lerp(WORLD.groundY, h, blend * blend);
    }

    // ─── Gorge height (from pastel_river_gorge.html) ───────────────────────
    _riverXLocal(lz) {
        const SIZE = this._gorge.sizeZ;
        const t = (lz + SIZE / 2) / SIZE;
        return 10 * Math.sin(t * Math.PI * 1.6) + 25 * Math.sin(t * Math.PI * 0.7 + 1.2) - 10;
    }

    _riverWidthLocal(lz) {
        const SIZE = this._gorge.sizeZ;
        const t = (lz + SIZE / 2) / SIZE;
        return 22 + 8 * Math.sin(t * Math.PI * 2.3 + 0.5);
    }

    _gorgeHeightLocal(lx, lz) {
        const rx = this._riverXLocal(lz);
        const rw = this._riverWidthLocal(lz);
        const absd = Math.abs(lx - rx);
        const bankStart = rw * 0.5;
        const bankNoise = fbmB(lx * 0.04 + 30, lz * 0.04 + 30, 4);

        let h;
        if (absd < bankStart) {
            h = -3 + bankNoise * 1.5 - (bankStart - absd) * 0.15;
        } else {
            const bd = absd - bankStart;
            const rockZone = 12;
            if (bd < rockZone) {
                h = bd * 1.8 + fbmC(lx * 0.15 + 80, lz * 0.15 + 80, 4) * 6;
            } else {
                const slopeD = bd - rockZone;
                h = rockZone * 1.8 + slopeD * 1.4 + bankNoise * 14 + fbmB(lx * 0.02, lz * 0.02, 5) * 30;
            }
        }
        return h;
    }

    _gorgeHeightWorld(x, z) {
        if (!this._inGorge(x, z)) return null;
        const g = this._gorge;
        const lx = x - g.cx;
        const lz = z - g.cz;
        let h = this._gorgeHeightLocal(lx, lz) * g.hScale + g.baseY;
        // River bed slightly below ground for water surface
        if (h < WORLD.groundY) h = Math.min(h, WORLD.groundY - 0.4);

        const edge = Math.min(
            (g.sizeX / 2 - Math.abs(lx)) / 16,
            (g.sizeZ / 2 - Math.abs(lz)) / 16
        );
        const blend = THREE.MathUtils.clamp(edge, 0, 1);
        // Near city/river bridges (east edge of gorge) blend to ground
        return THREE.MathUtils.lerp(WORLD.groundY, Math.max(h, WORLD.groundY - 1.2), blend * blend);
    }

    // ─── Build ridge mesh ──────────────────────────────────────────────────
    _buildRidge(scene) {
        const r = this._ridge;
        const SIZE = r.size;
        const SEG = 90; // balanced fidelity / FPS
        const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
        geo.rotateX(-Math.PI / 2);

        const cLowGrass = new THREE.Color(0x5aad62);
        const cMidGrass = new THREE.Color(0x3d8a48);
        const cRidgeBrush = new THREE.Color(0xc4a86a);
        const cRock = new THREE.Color(0x9aa0a8);
        const cRockDark = new THREE.Color(0x6a6e74);
        const cPeakHaze = new THREE.Color(0xb8a8c8);

        const pos = geo.attributes.position;
        const colors = [];
        for (let i = 0; i < pos.count; i++) {
            const lx = pos.getX(i);
            const lz = pos.getZ(i);
            const raw = this._ridgeHeightLocal(lx, lz);
            const y = raw * r.hScale + r.baseY;
            pos.setY(i, y);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();

        const norm = geo.attributes.normal;
        for (let i = 0; i < pos.count; i++) {
            const lx = pos.getX(i);
            const y = pos.getY(i);
            const lz = pos.getZ(i);
            const ny = norm.getY(i);
            const slope = 1 - ny;
            const t = (lz + SIZE / 2) / SIZE;
            const hNorm = THREE.MathUtils.clamp(y / (95 * r.hScale), 0, 1);
            const colorNoise = fbmA(lx * 0.12, lz * 0.12, 3) * 0.16 - 0.08;
            const blendHeight = THREE.MathUtils.clamp(hNorm + colorNoise, 0, 1);

            const col = new THREE.Color();
            if (blendHeight < 0.2) {
                col.copy(cLowGrass).lerp(cMidGrass, blendHeight / 0.2);
            } else if (blendHeight < 0.45) {
                col.copy(cMidGrass).lerp(cRidgeBrush, (blendHeight - 0.2) / 0.25);
            } else if (blendHeight < 0.7) {
                col.copy(cRidgeBrush).lerp(cRock, (blendHeight - 0.45) / 0.25);
            } else {
                col.copy(cRock).lerp(cPeakHaze, (blendHeight - 0.7) / 0.3);
            }
            if (slope > 0.4) {
                col.lerp(cRockDark, THREE.MathUtils.clamp((slope - 0.4) * 2.0, 0, 0.7));
            }
            col.lerp(cPeakHaze, THREE.MathUtils.clamp((1 - t) * 0.5, 0, 0.4));
            colors.push(col.r, col.g, col.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const mat = new THREE.MeshToonMaterial({
            vertexColors: true,
            gradientMap: getGradientMap(),
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(r.cx, 0, r.cz);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.name = 'exploreRidge';
        scene.add(mesh);

        // Soft cloud puffs over ridge
        for (let i = 0; i < 6; i++) {
            const g = new THREE.Group();
            const cloudMat = toonMat(0xf0ecff, { transparent: true, opacity: 0.82 });
            for (let p = 0; p < 4; p++) {
                const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + (i + p) % 4, 6, 5), cloudMat);
                puff.scale.set(1.6, 0.45, 1.1);
                puff.position.set(p * 3.2, (p % 2) * 1.2, (p % 3) - 1);
                g.add(puff);
            }
            g.position.set(
                r.cx + ((i * 37) % 80) - 40,
                28 + (i % 4) * 3,
                r.cz + ((i * 53) % 60) - 50
            );
            scene.add(g);
        }
    }

    // ─── Build gorge mesh + water + foliage ────────────────────────────────
    _buildGorge(scene) {
        const gdef = this._gorge;
        const SX = gdef.sizeX;
        const SZ = gdef.sizeZ;
        const SEG = 80;
        const geo = new THREE.PlaneGeometry(SX, SZ, SEG, Math.floor(SEG * (SZ / SX)));
        geo.rotateX(-Math.PI / 2);

        const cRiverbed = new THREE.Color(0x99cad5);
        const cRockLight = new THREE.Color(0xe2cfc4);
        const cRockDark = new THREE.Color(0x8b7c85);
        const cFoliage = [
            new THREE.Color(0xffaa66),
            new THREE.Color(0xfc8c8c),
            new THREE.Color(0xffd56b),
            new THREE.Color(0x9bdca1),
            new THREE.Color(0xd6a3fb),
        ];
        const cHaze = new THREE.Color(0xf3e3cf);

        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const lx = pos.getX(i);
            const lz = pos.getZ(i);
            const raw = this._gorgeHeightLocal(lx, lz);
            pos.setY(i, raw * gdef.hScale + gdef.baseY);
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();

        const norm = geo.attributes.normal;
        const colors = [];
        for (let i = 0; i < pos.count; i++) {
            const lx = pos.getX(i);
            const y = pos.getY(i);
            const lz = pos.getZ(i);
            const ny = norm.getY(i);
            const slope = 1 - ny;
            const rx = this._riverXLocal(lz);
            const rw = this._riverWidthLocal(lz);
            const absd = Math.abs(lx - rx);
            const bankStart = rw * 0.5;

            const col = new THREE.Color();
            if (absd < bankStart + 1.5) {
                col.copy(cRiverbed);
            } else if (absd < bankStart + 12) {
                col.copy(cRockLight).lerp(cRockDark, Math.min(slope * 1.2, 0.6));
            } else {
                const mix = fbmC(lx * 0.08 + 10, lz * 0.08 + 10, 3);
                const idx = Math.min(4, Math.floor(mix * 5));
                col.copy(cFoliage[idx]);
                col.lerp(cRockDark, Math.min(slope * 0.5, 0.3));
            }
            const t = (lz + SZ / 2) / SZ;
            col.lerp(cHaze, THREE.MathUtils.clamp((1 - t) * 0.45, 0, 0.35));
            colors.push(col.r, col.g, col.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        const mat = new THREE.MeshToonMaterial({
            vertexColors: true,
            gradientMap: getGradientMap(),
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(gdef.cx, 0, gdef.cz);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.name = 'exploreGorge';
        scene.add(mesh);

        // Animated water ribbon
        this._buildGorgeWater(scene, gdef);

        // Foliage clumps on banks
        const foliageHex = [0xffaa66, 0xfc8c8c, 0xffd56b, 0x9bdca1, 0xd6a3fb, 0xe07a5f];
        for (let i = 0; i < 70; i++) {
            const lz = (Math.random() - 0.5) * SZ * 0.9;
            const side = Math.random() < 0.5 ? -1 : 1;
            const rx = this._riverXLocal(lz);
            const rw = this._riverWidthLocal(lz);
            const bankDist = rw * 0.5 + 14 + Math.random() * (SX * 0.28);
            const lx = rx + side * bankDist;
            if (Math.abs(lx) > SX / 2 - 8) continue;
            const rawH = this._gorgeHeightLocal(lx, lz) * gdef.hScale + gdef.baseY;
            if (rawH < 2.5) continue;
            const scale = 2.2 + Math.random() * 2.8;
            const col = foliageHex[i % foliageHex.length];
            scene.add(this._foliageClump(
                gdef.cx + lx,
                rawH + scale * 0.25,
                gdef.cz + lz,
                scale,
                col
            ));
        }

        // Small pastel cottages on west bank
        const houseSpots = [
            [-55, -70, 1.2, 0.3],
            [-48, -40, 1.0, 0.5],
            [-52, 30, 1.1, -0.2],
            [-60, 80, 1.15, 0.4],
        ];
        houseSpots.forEach(([lx, lz, sc, rot]) => {
            const y = this._gorgeHeightLocal(lx, lz) * gdef.hScale + gdef.baseY;
            if (y < 1.5) return;
            scene.add(this._makeHouse(gdef.cx + lx, y, gdef.cz + lz, sc, rot));
        });

        // Boats on gorge river
        [[10, -2, 1.2, true], [-40, 3, 1.0, false], [60, -1, 1.1, true]].forEach(([lz, xo, sc, canopy]) => {
            const rx = this._riverXLocal(lz) + xo;
            const y = Math.max(
                this._gorgeHeightLocal(rx, lz) * gdef.hScale + gdef.baseY,
                WORLD.groundY - 0.8
            );
            scene.add(this._makeBoat(gdef.cx + rx, y + 0.35, gdef.cz + lz, sc, canopy));
        });
    }

    _buildGorgeWater(scene, gdef) {
        const left = [], right = [];
        const SZ = gdef.sizeZ;
        for (let lz = -SZ / 2; lz <= SZ / 2; lz += 5) {
            const rx = this._riverXLocal(lz);
            const rw = this._riverWidthLocal(lz) * 0.82;
            const y = -1.1 * gdef.hScale + gdef.baseY;
            left.push(new THREE.Vector3(rx - rw / 2, y, lz));
            right.push(new THREE.Vector3(rx + rw / 2, y, lz));
        }
        const verts = [];
        const idx = [];
        const uvs = [];
        for (let i = 0; i < left.length; i++) {
            verts.push(left[i].x, left[i].y, left[i].z);
            verts.push(right[i].x, right[i].y, right[i].z);
            uvs.push(0, i / (left.length - 1));
            uvs.push(1, i / (left.length - 1));
        }
        for (let i = 0; i < left.length - 1; i++) {
            const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
            idx.push(a, b, c, b, d, c);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        g.setIndex(idx);
        g.computeVertexNormals();

        const waterMat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            uniforms: {
                time: { value: 0 },
                colorA: { value: new THREE.Color(0xaee2e0) },
                colorB: { value: new THREE.Color(0x8fc7d9) },
            },
            vertexShader: `
                varying vec2 vUv;
                void main(){
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
                }
            `,
            fragmentShader: `
                varying vec2 vUv;
                uniform float time;
                uniform vec3 colorA;
                uniform vec3 colorB;
                void main(){
                    float wave = sin((vUv.x+vUv.y)*40.0 + time*0.6)*0.5+0.5;
                    vec3 col = mix(colorA, colorB, vUv.y*0.6 + wave*0.15);
                    gl_FragColor = vec4(col, 0.82);
                }
            `,
        });
        this.waterMats.push(waterMat);

        const riverMesh = new THREE.Mesh(g, waterMat);
        riverMesh.position.set(gdef.cx, 0, gdef.cz);
        riverMesh.name = 'exploreGorgeWater';
        scene.add(riverMesh);
    }

    _foliageClump(x, y, z, scale, color) {
        const g = new THREE.Group();
        const mat = toonMat(color);
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
            const r = (0.7 + Math.random() * 0.6) * scale;
            const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
            m.position.set(
                (Math.random() - 0.5) * scale * 1.3,
                Math.random() * scale * 0.5,
                (Math.random() - 0.5) * scale * 1.3
            );
            m.castShadow = true;
            g.add(m);
        }
        g.position.set(x, y, z);
        return g;
    }

    _makeHouse(x, y, z, scale, rotY) {
        const g = new THREE.Group();
        const wall = toonMesh(new THREE.BoxGeometry(4, 2.2, 3), 0xe8dcc8);
        wall.mesh.position.y = 1.1;
        wall.mesh.castShadow = true;
        g.add(wall.group);
        const roof = toonMesh(new THREE.ConeGeometry(3.2, 1.8, 4), 0x9fb8a8);
        roof.mesh.position.y = 2.9;
        roof.mesh.rotation.y = Math.PI / 4;
        g.add(roof.group);
        g.scale.setScalar(scale);
        g.rotation.y = rotY;
        g.position.set(x, y, z);
        return g;
    }

    _makeBoat(x, y, z, scale, hasCanopy) {
        const g = new THREE.Group();
        const hull = toonMesh(new THREE.BoxGeometry(3.6, 0.55, 1.2), 0xa08068);
        hull.mesh.position.y = 0.2;
        g.add(hull.group);
        if (hasCanopy) {
            const canopy = toonMesh(new THREE.BoxGeometry(2.0, 1.0, 1.4), 0x8ec2b0);
            canopy.mesh.position.y = 0.95;
            g.add(canopy.group);
        }
        g.scale.setScalar(scale);
        g.position.set(x, y, z);
        return g;
    }

    // ─── Trail markers + POI signposts toward explore zones ────────────────
    _buildTrailMarkers(scene) {
        // Path markers from city north edge → ridge
        const ridgeGate = { x: 20, z: -195 };
        this._signPost(scene, ridgeGate.x, WORLD.groundY, ridgeGate.z, 'Pastel Ridge →', 0xffd56b);

        // Path markers from bridges west → gorge
        const gorgeGate = { x: -250, z: 20 };
        this._signPost(scene, gorgeGate.x, WORLD.groundY, gorgeGate.z, '← River Gorge', 0xaee2e0);

        // Small stepping stones toward ridge approach (visual only)
        for (let i = 0; i < 8; i++) {
            const t = i / 7;
            const x = THREE.MathUtils.lerp(8, ridgeGate.x, t) + Math.sin(i) * 1.5;
            const z = THREE.MathUtils.lerp(-175, ridgeGate.z, t);
            if (isCityFlat(x, z, 10)) continue;
            const y = this.heightAt(x, z) ?? WORLD.groundY;
            const stone = toonMesh(new THREE.BoxGeometry(1.4, 0.12, 1.1), 0xc8c4bc, { outline: false });
            stone.mesh.position.set(x, y + 0.06, z);
            stone.mesh.rotation.y = i * 0.4;
            stone.mesh.receiveShadow = true;
            scene.add(stone.group);
        }
    }

    _signPost(scene, x, y, z, _label, color) {
        const g = new THREE.Group();
        const pole = toonMesh(new THREE.BoxGeometry(0.12, 2.6, 0.12), 0x8a7a68, { outline: false });
        pole.mesh.position.y = 1.3;
        g.add(pole.group);
        const board = toonMesh(new THREE.BoxGeometry(2.4, 0.9, 0.1), color);
        board.mesh.position.set(0, 2.4, 0);
        g.add(board.group);
        const stripe = toonMesh(new THREE.BoxGeometry(2.0, 0.15, 0.05), 0xf8f8f0, { outline: false });
        stripe.mesh.position.set(0, 2.55, 0.06);
        g.add(stripe.group);
        g.position.set(x, y, z);
        scene.add(g);
    }
}
