import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { toonMat, toonMesh } from './ToonStyle.js';

const MAX_STEP = 0.45;
const STAIR_MAX_STEP = 2.5;

/** Hillside terraces + stairs — height query & walkability for the residential slopes. */
export class TerrainSystem {
    constructor() {
        this.terraces = [];
        this.stairs = [];
        this.slopes = [];
        this.wallColliders = [];
        this.stairMeshes = [];
    }

    build(scene) {
        this._defineZones();
        this._buildTerraces(scene);
        this._buildStairs(scene);
        this._buildRetainingWalls(scene);
        return this;
    }

    getHeightAt(x, z) {
        if (Math.abs(x - WORLD.riverX) < WORLD.riverWidth / 2 + 2) return 0.15;

        for (const s of this.stairs) {
            if (this._inRect(x, z, s)) {
                const t = s.axis === 'z'
                    ? (z - s.zMin) / (s.zMax - s.zMin)
                    : (x - s.xMin) / (s.xMax - s.xMin);
                return THREE.MathUtils.lerp(s.y0, s.y1, THREE.MathUtils.clamp(t, 0, 1));
            }
        }

        for (const sl of this.slopes) {
            const h = this._heightOnSlope(x, z, sl);
            if (h != null) return h;
        }

        return this._terraceHeight(x, z);
    }

    isOnStair(x, z) {
        return this.stairs.some(s => this._inRect(x, z, s));
    }

    canTraverse(fromX, fromZ, fromY, toX, toZ) {
        const toY = this.getHeightAt(toX, toZ);
        const dy = toY - fromY;
        if (Math.abs(dy) <= MAX_STEP) return true;
        if (this.isOnStair(fromX, fromZ) || this.isOnStair(toX, toZ)) {
            return Math.abs(dy) <= STAIR_MAX_STEP;
        }
        if (dy < 0 && Math.abs(dy) <= 1.2) return true;
        return false;
    }

    getWalkableHeight(x, z, currentY) {
        const target = this.getHeightAt(x, z);
        if (Math.abs(target - currentY) <= STAIR_MAX_STEP) return target;
        return currentY;
    }

    _defineZones() {
        const bands = [
            { min: 38, max: 999, h: 7.5 },
            { min: 28, max: 38, h: 5.5 },
            { min: 20, max: 28, h: 3.8 },
            { min: 14, max: 20, h: 2.4 },
            { min: 8, max: 14, h: 1.2 },
        ];

        [-1, 1].forEach(sign => {
            bands.forEach(b => {
                this.terraces.push({
                    xMin: sign > 0 ? WORLD.riverWidth / 2 + b.min : -(WORLD.riverWidth / 2 + b.max),
                    xMax: sign > 0 ? WORLD.riverWidth / 2 + b.max : -(WORLD.riverWidth / 2 + b.min),
                    zMin: -280, zMax: 280,
                    height: b.h,
                    side: sign,
                });
            });
        });

        const rw = WORLD.riverWidth / 2 + 21;
        const west = (edgeX, z0, z1, y0, y1) => ({ x: -edgeX, z0, z1, y0, y1 });
        const east = (edgeX, z0, z1, y0, y1) => ({ x: edgeX, z0, z1, y0, y1 });

        const stairDefs = [
            west(rw + 14, -170, -140, 1.2, 2.4),
            west(rw + 14, -55, -25, 1.2, 2.4),
            west(rw + 14, 35, 65, 1.2, 2.4),
            west(rw + 14, 140, 170, 1.2, 2.4),
            west(rw + 20, -130, -100, 2.4, 3.8),
            west(rw + 20, 0, 30, 2.4, 3.8),
            west(rw + 20, 100, 130, 2.4, 3.8),
            west(rw + 28, -95, -65, 3.8, 5.5),
            west(rw + 28, 55, 85, 3.8, 5.5),
            west(rw + 38, -75, -45, 5.5, 7.5),
            west(rw + 38, 70, 100, 5.5, 7.5),
            east(rw + 14, -160, -130, 1.2, 2.4),
            east(rw + 14, -45, -15, 1.2, 2.4),
            east(rw + 14, 45, 75, 1.2, 2.4),
            east(rw + 14, 150, 180, 1.2, 2.4),
            east(rw + 20, -110, -80, 2.4, 3.8),
            east(rw + 20, 15, 45, 2.4, 3.8),
            east(rw + 20, 110, 140, 2.4, 3.8),
            east(rw + 28, -85, -55, 3.8, 5.5),
            east(rw + 28, 60, 90, 3.8, 5.5),
            east(rw + 38, -65, -35, 5.5, 7.5),
            east(rw + 38, 75, 105, 5.5, 7.5),
        ];

        stairDefs.forEach(def => {
            const w = 3.2;
            this.stairs.push({
                xMin: def.x - w / 2, xMax: def.x + w / 2,
                zMin: Math.min(def.z0, def.z1), zMax: Math.max(def.z0, def.z1),
                y0: def.y0, y1: def.y1,
                axis: def.axis || 'z',
                x: def.x,
            });
        });

        this.slopes = [
            { pts: [[-200, -180, 7.5], [-160, -140, 6.2], [-120, -110, 4.8], [-80, -90, 3.2]], w: 9 },
            { pts: [[200, -170, 7.5], [165, -130, 6.2], [130, -100, 4.8], [95, -80, 3.2]], w: 9 },
            { pts: [[-190, 150, 7.5], [-150, 120, 6.2], [-110, 100, 4.8], [-70, 85, 3.2]], w: 8 },
            { pts: [[190, 140, 7.5], [155, 115, 6.2], [120, 95, 4.8], [85, 80, 3.2]], w: 8 },
        ];
    }

    _terraceHeight(x, z) {
        const ax = Math.abs(x);
        if (ax < WORLD.riverWidth / 2 + 8) return 0.15;

        let best = 0;
        for (const t of this.terraces) {
            if (x >= t.xMin && x <= t.xMax && z >= t.zMin && z <= t.zMax) {
                best = Math.max(best, t.height);
            }
        }
        return best;
    }

    _inRect(x, z, r) {
        return x >= r.xMin && x <= r.xMax && z >= r.zMin && z <= r.zMax;
    }

    _heightOnSlope(x, z, slope) {
        const { pts, w } = slope;
        let best = null, bestDist = w / 2 + 1;

        for (let i = 0; i < pts.length - 1; i++) {
            const [x1, z1, h1] = pts[i];
            const [x2, z2, h2] = pts[i + 1];
            const dx = x2 - x1, dz = z2 - z1;
            const len = Math.hypot(dx, dz);
            if (len < 1) continue;
            const t = THREE.MathUtils.clamp(((x - x1) * dx + (z - z1) * dz) / (len * len), 0, 1);
            const px = x1 + dx * t, pz = z1 + dz * t;
            const dist = Math.hypot(x - px, z - pz);
            if (dist < bestDist) {
                bestDist = dist;
                best = THREE.MathUtils.lerp(h1, h2, t);
            }
        }
        return best;
    }

    _buildTerraces(scene) {
        const grass = toonMat(PALETTE.grass);
        const seen = new Set();

        this.terraces.forEach(t => {
            const key = `${t.side}_${t.height}`;
            if (seen.has(key)) return;
            seen.add(key);

            const w = t.xMax - t.xMin;
            const d = 560;
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), grass);
            mesh.position.set((t.xMin + t.xMax) / 2, t.height - 0.12, 0);
            mesh.receiveShadow = true;
            scene.add(mesh);

            const edge = new THREE.Mesh(
                new THREE.BoxGeometry(w + 0.4, 0.5, d),
                toonMat(PALETTE.embankment)
            );
            edge.position.set((t.xMin + t.xMax) / 2, t.height - 0.35, 0);
            edge.receiveShadow = true;
            scene.add(edge);
        });
    }

    _buildStairs(scene) {
        this.stairs.forEach(s => {
            const g = this._createStairMesh(s);
            scene.add(g);
            this.stairMeshes.push(g);
        });
    }

    _createStairMesh(s) {
        const g = new THREE.Group();
        const len = s.axis === 'z' ? (s.zMax - s.zMin) : (s.xMax - s.xMin);
        const steps = Math.max(8, Math.floor(len / 0.55));
        const stepRise = (s.y1 - s.y0) / steps;
        const stepRun = len / steps;
        const cx = (s.xMin + s.xMax) / 2;
        const cz = (s.zMin + s.zMax) / 2;

        for (let i = 0; i < steps; i++) {
            const rise = s.y0 + stepRise * i;
            const { group, mesh } = toonMesh(
                new THREE.BoxGeometry(2.8, stepRise + 0.02, stepRun + 0.04),
                i % 2 === 0 ? 0xe8e4dc : 0xd8d4cc
            );
            mesh.position.y = rise + stepRise / 2;
            if (s.axis === 'z') {
                mesh.position.set(cx, rise + stepRise / 2, s.zMin + stepRun * i + stepRun / 2);
            } else {
                mesh.position.set(s.xMin + stepRun * i + stepRun / 2, rise + stepRise / 2, cz);
            }
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            g.add(group);
        }

        [-1.55, 1.55].forEach(side => {
            const railLen = len + 0.6;
            const rail = toonMesh(new THREE.BoxGeometry(0.1, 0.9, railLen), 0x8a9098);
            rail.mesh.position.set(
                cx + side,
                s.y0 + (s.y1 - s.y0) / 2 + 0.5,
                s.axis === 'z' ? cz : cz
            );
            if (s.axis === 'x') rail.mesh.position.set(cx, s.y0 + (s.y1 - s.y0) / 2 + 0.5, cz + side);
            g.add(rail.group);

            for (let i = 0; i <= 4; i++) {
                const post = toonMesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), 0x7a8088);
                const t = i / 4;
                post.mesh.position.set(
                    cx + side,
                    s.y0 + (s.y1 - s.y0) * t + 0.4,
                    s.axis === 'z' ? THREE.MathUtils.lerp(s.zMin, s.zMax, t) : cz + side
                );
                if (s.axis === 'x') {
                    post.mesh.position.set(
                        THREE.MathUtils.lerp(s.xMin, s.xMax, t),
                        s.y0 + (s.y1 - s.y0) * t + 0.4,
                        cz + side
                    );
                }
                g.add(post.group);
            }
        });

        return g;
    }

    _buildRetainingWalls(scene) {
        const rw = WORLD.riverWidth / 2 + 21;
        const wallMat = toonMat(PALETTE.retainingWall);
        const gaps = this.stairs.map(s => ({
            x: (s.xMin + s.xMax) / 2,
            z: (s.zMin + s.zMax) / 2,
            z0: s.zMin, z1: s.zMax,
            w: s.xMax - s.xMin + 2,
            d: s.zMax - s.zMin + 2,
        }));

        const walls = [
            { x: -(rw + 14), z0: -280, z1: 280, h: 2.4 },
            { x: -(rw + 20), z0: -280, z1: 280, h: 3.8 },
            { x: -(rw + 28), z0: -280, z1: 280, h: 5.5 },
            { x: -(rw + 38), z0: -280, z1: 280, h: 7.5 },
            { x: rw + 14, z0: -280, z1: 280, h: 2.4 },
            { x: rw + 20, z0: -280, z1: 280, h: 3.8 },
            { x: rw + 28, z0: -280, z1: 280, h: 5.5 },
            { x: rw + 38, z0: -280, z1: 280, h: 7.5 },
        ];

        walls.forEach(w => {
            const segments = this._splitWallSegments(w, gaps);
            segments.forEach(seg => {
                const len = seg.z1 - seg.z0;
                if (len < 4) return;
                const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.8, len), wallMat);
                mesh.position.set(w.x, w.h - 0.5, (seg.z0 + seg.z1) / 2);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);

                this.wallColliders.push({ x: w.x, z: (seg.z0 + seg.z1) / 2, w: 1.2, d: len });
            });
        });
    }

    _splitWallSegments(wall, gaps) {
        const segs = [{ z0: wall.z0, z1: wall.z1 }];
        gaps.forEach(g => {
            if (Math.abs(g.x - wall.x) > 6) return;
            const next = [];
            segs.forEach(s => {
                const gz0 = g.z - g.d / 2, gz1 = g.z + g.d / 2;
                if (gz1 < s.z0 || gz0 > s.z1) { next.push(s); return; }
                if (s.z0 < gz0 - 1) next.push({ z0: s.z0, z1: gz0 - 1 });
                if (s.z1 > gz1 + 1) next.push({ z0: gz1 + 1, z1: s.z1 });
            });
            segs.length = 0;
            segs.push(...next);
        });
        return segs;
    }
}