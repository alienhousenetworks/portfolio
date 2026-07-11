import * as THREE from 'three';
import { WORLD, PALETTE, BRIDGES, isCityFlat } from './config.js';
import { toonMat, toonMesh, getGradientMap } from './ToonStyle.js';

const MAX_STEP = 2.2;
const STAIR_MAX_STEP = 2.5;

/**
 * Curved hills + styled stairs (modern / curved / spiral / helix).
 * Stairs only where height access is needed; hills stay outside the city slab.
 */
export class TerrainSystem {
    constructor() {
        this.terraces = [];
        this.stairs = [];
        this.slopes = [];
        this.wallColliders = [];
        this.stairMeshes = [];
        this.grassMaterials = [];
        this.grassTufts = null;
        this.butterflies = [];
        this.time = 0;
        this._grassPalette = [
            new THREE.Color('#c8edd6'),
            new THREE.Color('#b8e6c8'),
            new THREE.Color('#d4f2e0'),
            new THREE.Color('#a8dfc0'),
        ];

        // Rolling hills — centers + radius fully outside city slab + clear margin
        // city ~±165 x ±145; margin 28 → keep |x|-r > 193 or |z|-r > 173
        this.hills = [
            // North band
            { x: -90, z: -250, r: 48, hy: -30 },
            { x: 20, z: -265, r: 55, hy: -34 },
            { x: 110, z: -245, r: 46, hy: -28 },
            // South band
            { x: -80, z: 250, r: 48, hy: -30 },
            { x: 30, z: 265, r: 55, hy: -34 },
            { x: 120, z: 248, r: 44, hy: -28 },
            // West band (beyond river / city)
            { x: -250, z: -60, r: 50, hy: -32 },
            { x: -260, z: 50, r: 48, hy: -30 },
            { x: -245, z: 150, r: 42, hy: -26 },
            // East band
            { x: 250, z: -50, r: 50, hy: -32 },
            { x: 260, z: 60, r: 48, hy: -30 },
            { x: 245, z: 150, r: 42, hy: -26 },
        ];
    }

    build(scene) {
        this._defineZones();
        this._buildCurvedHills(scene);
        this._buildStairs(scene);
        this._buildSteppingStones(scene);
        this._buildHedges(scene);
        this._buildWildflowers(scene);
        this._buildGrassTufts(scene);
        this._buildButterflies(scene);
        return this;
    }

    update(dt) {
        this.time += dt;

        // Soft pastel lawn shimmer (breeze / afternoon light)
        const [colA, colB, colC, colD] = this._grassPalette;
        this.grassMaterials.forEach(mat => {
            if (mat.color) {
                const finalCol = new THREE.Color().lerpColors(colA, colB, (Math.sin(this.time * 0.45) + 1.0) / 2.0);
                finalCol.lerp(colC, (Math.cos(this.time * 0.28) + 1.0) / 5.0);
                finalCol.lerp(colD, (Math.sin(this.time * 0.18 + 1.2) + 1.0) / 8.0);
                mat.color.copy(finalCol);
            }
        });

        // 2. Animate Butterflies
        this.butterflies.forEach((b, idx) => {
            const angle = this.time * b.speed + idx;
            b.group.position.x = b.baseX + Math.sin(angle) * 4;
            b.group.position.z = b.baseZ + Math.cos(angle) * 4;
            b.group.position.y = b.baseY + Math.sin(angle * 2.5) * 1.5;

            // Wing flap animation
            b.wingL.rotation.y = Math.sin(this.time * 20) * 0.75;
            b.wingR.rotation.y = -Math.sin(this.time * 20) * 0.75;
        });
    }

    _isParkLawn(x, z) {
        return Math.hypot(x - WORLD.parkX, z - WORLD.parkZ) < (WORLD.parkLawnRadius ?? WORLD.parkRadius + 15);
    }

    /** City slab + small pad: always flat (no hills / slopes / embankments). */
    _isCityFlat(x, z) {
        return isCityFlat(x, z, WORLD.cityClearMargin ?? 28);
    }

    /** Walkable height on open lawn / hills (no bridge decks). */
    _lawnHeightAt(x, z) {
        // Hard rule: nothing raises the ground inside the city
        if (this._isCityFlat(x, z)) return WORLD.groundY;
        if (this._isParkLawn(x, z)) return WORLD.groundY;

        const stairH = this._heightOnStair(x, z);
        if (stairH != null) return stairH;

        for (const sl of this.slopes) {
            const h = this._heightOnSlope(x, z, sl);
            if (h != null) return h;
        }

        let maxH = WORLD.groundY;
        for (const h of this.hills) {
            // Skip any hill whose footprint would still touch the city (safety)
            if (this._hillTouchesCity(h)) continue;

            const dx = x - h.x;
            const dz = z - h.z;
            const distSq = dx * dx + dz * dz;
            const rSq = h.r * h.r;
            if (distSq >= rSq) continue;

            const rise = Math.sqrt(rSq - distSq);
            const ny = rise / h.r;
            if (ny < 0.55) continue;

            const y = h.hy + rise;
            if (y < WORLD.groundY) continue;
            if (y > maxH) maxH = y;
        }

        return maxH;
    }

    /** Height on any stair style, or null if (x,z) is not on a stair. */
    _heightOnStair(x, z) {
        for (const s of this.stairs) {
            const h = this._sampleStairHeight(x, z, s);
            if (h != null) return h;
        }
        return null;
    }

    _sampleStairHeight(x, z, s) {
        const style = s.style || 'modern';

        if (style === 'spiral' || style === 'helix') {
            const dx = x - s.cx;
            const dz = z - s.cz;
            const r = Math.hypot(dx, dz);
            const inner = s.innerR ?? (s.radius - (s.width ?? 1.4) * 0.5);
            const outer = s.outerR ?? (s.radius + (s.width ?? 1.4) * 0.5);
            if (r < inner - 0.15 || r > outer + 0.15) return null;

            let ang = Math.atan2(dz, dx);
            const a0 = s.angle0 ?? 0;
            const total = (s.turns ?? 1.25) * Math.PI * 2 * (s.cw ? -1 : 1);
            // Unwrap angle into the spiral's covered range
            let bestT = null;
            for (let k = -2; k <= Math.ceil(Math.abs(s.turns ?? 1.25)) + 2; k++) {
                const candidate = ang + k * Math.PI * 2;
                const t = (candidate - a0) / total;
                if (t >= -0.02 && t <= 1.02) {
                    if (bestT == null || Math.abs(t - 0.5) < Math.abs(bestT - 0.5)) bestT = t;
                }
            }
            if (bestT == null) return null;
            return THREE.MathUtils.lerp(s.y0, s.y1, THREE.MathUtils.clamp(bestT, 0, 1));
        }

        if (style === 'curved') {
            const dx = x - s.cx;
            const dz = z - s.cz;
            const r = Math.hypot(dx, dz);
            const halfW = (s.width ?? 2.4) * 0.5;
            if (Math.abs(r - s.radius) > halfW + 0.2) return null;
            let ang = Math.atan2(dz, dx);
            // Normalize into [angle0, angle1] shortest arc
            let a0 = s.angle0;
            let a1 = s.angle1;
            // Bring ang into continuous range relative to a0→a1
            const span = a1 - a0;
            while (ang < Math.min(a0, a1) - 0.2) ang += Math.PI * 2;
            while (ang > Math.max(a0, a1) + 0.2) ang -= Math.PI * 2;
            const t = (ang - a0) / span;
            if (t < -0.05 || t > 1.05) return null;
            return THREE.MathUtils.lerp(s.y0, s.y1, THREE.MathUtils.clamp(t, 0, 1));
        }

        // modern / straight (axis-aligned rect)
        if (!this._inRect(x, z, s)) return null;
        const t = s.axis === 'z'
            ? (z - s.zMin) / Math.max(0.001, s.zMax - s.zMin)
            : (x - s.xMin) / Math.max(0.001, s.xMax - s.xMin);
        return THREE.MathUtils.lerp(s.y0, s.y1, THREE.MathUtils.clamp(t, 0, 1));
    }

    _hillTouchesCity(h) {
        const hx = (WORLD.cityHalfX ?? 165) + (WORLD.cityClearMargin ?? 28);
        const hz = (WORLD.cityHalfZ ?? 145) + (WORLD.cityClearMargin ?? 28);
        // Axis-aligned distance from hill center to city AABB, then compare to radius
        const dx = Math.max(Math.abs(h.x) - hx, 0);
        const dz = Math.max(Math.abs(h.z) - hz, 0);
        return (dx * dx + dz * dz) < (h.r * h.r);
    }

    getHeightAt(x, z, currentY = null) {
        // Bridge decks override ground only if player is high enough (on/near bridge deck level)
        for (const b of BRIDGES) {
            if (Math.abs(x - b.x) <= b.halfW && Math.abs(z - b.z) <= b.halfD) {
                if (currentY === null || currentY > 1.2) {
                    return b.deckY;
                }
            }
        }

        // Stairs first (modern bridge stairs on city/east side replace ramps there)
        const stairH = this._heightOnStair(x, z);
        if (stairH != null) return stairH;

        // Soft ramps only on the west (outer) bridge approaches
        for (const b of BRIDGES) {
            if (Math.abs(z - b.z) > b.halfD + 1.5) continue;
            const side = -1; // west only
            const innerX = b.x + side * b.halfW;
            const outerX = b.x + side * (b.halfW + 9);
            const onRamp = x <= innerX && x >= outerX;
            if (!onRamp) continue;
            if (currentY === null || currentY > 0.5) {
                const t = (innerX - x) / (innerX - outerX);
                return THREE.MathUtils.lerp(WORLD.groundY, b.deckY, THREE.MathUtils.clamp(t, 0, 1));
            }
        }

        return this._lawnHeightAt(x, z);
    }

    isOnBridge(x, z, currentY = null) {
        return BRIDGES.some(b => {
            const inBox = Math.abs(x - b.x) <= b.halfW && Math.abs(z - b.z) <= b.halfD;
            if (!inBox) return false;
            if (currentY === null) return true;
            return currentY > 1.2;
        });
    }

    isOnStair(x, z) {
        return this._heightOnStair(x, z) != null;
    }

    canTraverse(fromX, fromZ, fromY, toX, toZ) {
        const toY = this.getHeightAt(toX, toZ, fromY);
        const dy = toY - fromY;

        // Going down is always traversable (gravity handles the drop)
        if (dy <= 0.01) return true;

        // Going up is allowed if height difference is within step limits
        if (dy <= MAX_STEP) return true;

        if (this.isOnStair(fromX, fromZ) || this.isOnStair(toX, toZ)) {
            return dy <= STAIR_MAX_STEP;
        }
        if (this.isOnBridge(fromX, fromZ, fromY) || this.isOnBridge(toX, toZ, toY)) {
            return dy <= STAIR_MAX_STEP + 0.5;
        }
        
        return false;
    }

    getWalkableHeight(x, z, currentY) {
        const target = this.getHeightAt(x, z, currentY);
        
        // Descending/standing is always walkable
        if (target <= currentY + 0.1) return target;
        
        // Ascending requires being within stepping height limits
        if (target - currentY <= MAX_STEP) return target;
        
        return currentY;
    }

    _defineZones() {
        // Minimal stairs — only where height access is needed.
        // Styles: modern (images-6), curved (images-5), spiral (images-3), helix (images-4)
        this.stairs = [];

        // 1) Modern straight stairs — bridge approaches (city/east side only)
        //    Outer (city) = ground, inner (deck edge) = deckY. West keeps soft ramps.
        const run = 8.5;
        const stairW = 3.2;
        BRIDGES.forEach(b => {
            // x increases toward city; xMin = deck edge (high), xMax = city (low)
            const xInner = b.x + b.halfW;
            const xOuter = b.x + b.halfW + run;
            this.stairs.push({
                style: 'modern',
                axis: 'x',
                xMin: Math.min(xInner, xOuter),
                xMax: Math.max(xInner, xOuter),
                zMin: b.z - stairW / 2,
                zMax: b.z + stairW / 2,
                // y0 at xMin (deck), y1 at xMax (ground)
                y0: b.deckY,
                y1: WORLD.groundY,
                width: stairW,
            });
        });

        // 2) Curved wooden stairs — two nature path entries (outer hills, not in city)
        this.stairs.push({
            style: 'curved',
            cx: -205, cz: -195,
            radius: 14,
            angle0: Math.PI * 0.15,
            angle1: Math.PI * 0.85,
            y0: WORLD.groundY,
            y1: 4.2,
            width: 2.6,
        });
        this.stairs.push({
            style: 'curved',
            cx: 205, cz: 185,
            radius: 14,
            angle0: -Math.PI * 0.85,
            angle1: -Math.PI * 0.15,
            y0: WORLD.groundY,
            y1: 4.0,
            width: 2.6,
        });

        // 3) Spiral stair — single river-overlook lookout (west of city, not embankment spam)
        this.stairs.push({
            style: 'spiral',
            cx: -210, cz: 10,
            radius: 2.2,
            innerR: 0.9,
            outerR: 3.4,
            angle0: 0,
            turns: 1.4,
            y0: WORLD.groundY,
            y1: 5.5,
            width: 1.6,
            cw: false,
        });

        // 4) Double-helix landmark — one scenic tower far north (not on streets)
        this.stairs.push({
            style: 'helix',
            cx: 0, cz: -230,
            radius: 3.6,
            innerR: 1.6,
            outerR: 5.2,
            angle0: 0,
            turns: 1.6,
            y0: WORLD.groundY,
            y1: 7.2,
            width: 1.5,
            cw: false,
        });

        // Outer nature slopes only (all points outside city + margin)
        this.slopes = [
            { pts: [[-250, -220, 6.5], [-235, -200, 5.0], [-220, -180, 3.0]], w: 8 },
            { pts: [[250, -210, 6.5], [235, -190, 5.0], [220, -170, 3.0]], w: 8 },
            { pts: [[-250, 200, 6.5], [-235, 180, 5.0], [-220, 165, 3.0]], w: 8 },
            { pts: [[250, 195, 6.5], [235, 175, 5.0], [220, 160, 3.0]], w: 8 },
        ];
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
            const Math_dist = Math.hypot(x - px, z - pz);
            if (Math_dist < bestDist) {
                bestDist = Math_dist;
                best = THREE.MathUtils.lerp(h1, h2, t);
            }
        }
        return best;
    }

    _buildCurvedHills(scene) {
        // Flat city slab + rolling hills only outside (baked into ground plane)
        const groundGeo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, 80, 80);
        groundGeo.rotateX(-Math.PI / 2);

        const pos = groundGeo.attributes.position;
        const colors = [];
        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            // Force city vertices flat — no hill deformation under buildings/roads
            const surfaceY = this._isCityFlat(vx, vz) ? WORLD.groundY : this._lawnHeightAt(vx, vz);
            pos.setY(i, surfaceY);

            let colHex = '#b8e6c8';
            if (this._isCityFlat(vx, vz)) {
                // Neutral underlay under city slab (mostly hidden by concrete plane)
                colHex = '#a8b4b0';
            } else if (this._isParkLawn(vx, vz)) {
                colHex = '#c8edd6';
            } else if (Math.random() < 0.35) {
                const shades = ['#c8edd6', '#d4f2e0', '#a8dfc0', '#90c87a'];
                colHex = shades[Math.floor(Math.random() * shades.length)];
            }
            const c = new THREE.Color(colHex);
            colors.push(c.r, c.g, c.b);
        }
        groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        pos.needsUpdate = true;
        groundGeo.computeVertexNormals();

        const baseMat = new THREE.MeshToonMaterial({
            vertexColors: true,
            gradientMap: getGradientMap()
        });
        this.grassMaterials.push(baseMat);

        const baseMesh = new THREE.Mesh(groundGeo, baseMat);
        baseMesh.position.y = 0;
        baseMesh.receiveShadow = true;
        scene.add(baseMesh);
    }

    _buildSteppingStones(scene) {
        // Nature paths only — outside the city
        const stoneGeo = new THREE.BoxGeometry(2.0, 0.12, 1.5);
        const stoneMat = new THREE.MeshToonMaterial({
            color: 0xc8c6c0,
            gradientMap: getGradientMap()
        });

        const stonePaths = [
            { startZ: -230, endZ: -190, count: 6, offset: -230 },
            { startZ: 190, endZ: 230, count: 6, offset: 230 },
            { startZ: -220, endZ: -180, count: 5, offset: 230 },
        ];

        stonePaths.forEach(path => {
            for (let i = 0; i < path.count; i++) {
                const t = path.count <= 1 ? 0 : i / (path.count - 1);
                const z = path.startZ + t * (path.endZ - path.startZ);
                const x = path.offset + Math.sin(z * 0.05) * 5;
                if (this._isCityFlat(x, z)) continue;
                const y = this.getHeightAt(x, z) + 0.04;

                const stone = new THREE.Mesh(stoneGeo, stoneMat);
                stone.position.set(x, y, z);
                stone.rotation.y = (Math.sin(z * 0.1) * 0.3) + (Math.random() - 0.5) * 0.15;
                stone.castShadow = true;
                stone.receiveShadow = true;
                scene.add(stone);
            }
        });
    }

    _buildHedges(scene) {
        // Nature hedges outside city only (avenue hedges live in WorldBuilder)
        const hedgeMat = new THREE.MeshToonMaterial({
            color: 0x8ecfa0,
            gradientMap: getGradientMap()
        });

        const hedgeBoxes = [
            { x: -230, z: -200, w: 22, h: 2.4, d: 2 },
            { x: 230, z: -190, w: 24, h: 2.4, d: 2 },
            { x: -230, z: 200, w: 20, h: 2.6, d: 2 },
            { x: 230, z: 190, w: 20, h: 2.6, d: 2 },
        ];

        hedgeBoxes.forEach(hb => {
            if (this._isCityFlat(hb.x, hb.z)) return;
            const geo = new THREE.BoxGeometry(hb.w, hb.h, hb.d);
            const hedge = new THREE.Mesh(geo, hedgeMat);
            const y = this.getHeightAt(hb.x, hb.z) + hb.h / 2;
            hedge.position.set(hb.x, y, hb.z);
            hedge.castShadow = true;
            hedge.receiveShadow = true;
            scene.add(hedge);
        });
    }

    _buildGrassTufts(scene) {
        const bladeGeo = new THREE.PlaneGeometry(0.14, 0.42);
        bladeGeo.translate(0, 0.21, 0);
        const bladeMat = new THREE.MeshToonMaterial({
            color: '#b8e6c8',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.92,
            gradientMap: getGradientMap(),
        });
        this.grassMaterials.push(bladeMat);

        const count = 180;
        const tufts = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
        const dummy = new THREE.Object3D();
        const tuftColors = ['#c8edd6', '#b8e6c8', '#d4f2e0', '#a8dfc0', '#bce9d0'];

        for (let i = 0; i < count; i++) {
            const hill = this.hills[i % this.hills.length];
            const angle = (i * 1.73) % (Math.PI * 2);
            const r = (0.35 + (i % 7) * 0.08) * hill.r;
            const x = hill.x + Math.cos(angle) * r;
            const z = hill.z + Math.sin(angle) * r;
            // Never scatter grass into the city
            if (this._isCityFlat(x, z)) {
                dummy.position.set(hill.x, WORLD.groundY, hill.z);
            } else {
                const y = this.getHeightAt(x, z);
                dummy.position.set(x, y, z);
            }
            dummy.scale.set(
                0.55 + (i % 4) * 0.12,
                0.7 + (i % 5) * 0.1,
                1
            );
            dummy.rotation.set(
                (Math.random() - 0.5) * 0.25,
                Math.random() * Math.PI * 2,
                (Math.random() - 0.5) * 0.2
            );
            dummy.updateMatrix();
            tufts.setMatrixAt(i, dummy.matrix);
            tufts.setColorAt(i, new THREE.Color(tuftColors[i % tuftColors.length]));
        }
        tufts.instanceMatrix.needsUpdate = true;
        if (tufts.instanceColor) tufts.instanceColor.needsUpdate = true;
        tufts.receiveShadow = true;
        scene.add(tufts);
        this.grassTufts = tufts;
    }

    _buildWildflowers(scene) {
        const flowerGeo = new THREE.IcosahedronGeometry(0.24, 1);
        const yellowMat = new THREE.MeshToonMaterial({ color: 0xffeb3b, gradientMap: getGradientMap() });
        const purpleMat = new THREE.MeshToonMaterial({ color: 0x9c27b0, gradientMap: getGradientMap() });
        const magentaMat = new THREE.MeshToonMaterial({ color: 0xd63693, gradientMap: getGradientMap() });

        // Reduced count for optimization
        const count = 60;
        const instancedYellow = new THREE.InstancedMesh(flowerGeo, yellowMat, count);
        const instancedPurple = new THREE.InstancedMesh(flowerGeo, purpleMat, count);
        const instancedMagenta = new THREE.InstancedMesh(flowerGeo, magentaMat, count);

        const dummy = new THREE.Object3D();

        for (let i = 0; i < count; i++) {
            const hill = this.hills[i % this.hills.length];
            const angle = (i * 2.39) % (Math.PI * 2);
            const r = (0.2 + Math.random() * 0.6) * hill.r;
            let x = hill.x + Math.cos(angle) * r;
            let z = hill.z + Math.sin(angle) * r;
            if (this._isCityFlat(x, z)) {
                x = hill.x;
                z = hill.z;
            }
            const y = this.getHeightAt(x, z) + 0.1;

            dummy.position.set(x, y, z);
            dummy.scale.setScalar(0.6 + Math.random() * 0.8);
            dummy.rotation.set(Math.random() * 0.2, Math.random() * Math.PI, Math.random() * 0.2);
            dummy.updateMatrix();

            if (i % 3 === 0) {
                instancedYellow.setMatrixAt(i, dummy.matrix);
            } else if (i % 3 === 1) {
                instancedPurple.setMatrixAt(i, dummy.matrix);
            } else {
                instancedMagenta.setMatrixAt(i, dummy.matrix);
            }
        }
        scene.add(instancedYellow, instancedPurple, instancedMagenta);
    }

    _buildButterflies(scene) {
        // Reduced count (5 instead of 12) for higher performance
        for (let i = 0; i < 5; i++) {
            const bGroup = new THREE.Group();
            const colors = [0xff88cc, 0x88ccff, 0xffcc88];
            const col = colors[i % colors.length];

            const wingGeo = new THREE.PlaneGeometry(0.35, 0.45);
            wingGeo.translate(0.175, 0, 0);
            const wingMat = new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });

            const wingL = new THREE.Mesh(wingGeo, wingMat);
            wingL.rotation.y = 0.5;
            const wingR = new THREE.Mesh(wingGeo, wingMat);
            wingR.scale.x = -1;
            wingR.rotation.y = -0.5;

            bGroup.add(wingL);
            bGroup.add(wingR);

            // Flutter over outer nature, not over the city core
            const hill = this.hills[i % this.hills.length];
            const baseX = hill.x + (Math.random() - 0.5) * 30;
            const baseZ = hill.z + (Math.random() - 0.5) * 30;
            const baseY = this.getHeightAt(baseX, baseZ) + 2.0 + Math.random() * 3.0;

            bGroup.position.set(baseX, baseY, baseZ);
            scene.add(bGroup);

            this.butterflies.push({
                group: bGroup,
                wingL,
                wingR,
                baseX,
                baseY,
                baseZ,
                speed: 1.0 + Math.random() * 0.8
            });
        }
    }

    _buildStairs(scene) {
        this.stairs.forEach(s => {
            const g = this._createStairMesh(s);
            scene.add(g);
            this.stairMeshes.push(g);
        });
    }

    _createStairMesh(s) {
        const style = s.style || 'modern';
        if (style === 'spiral') return this._createSpiralStair(s, false);
        if (style === 'helix') return this._createSpiralStair(s, true);
        if (style === 'curved') return this._createCurvedStair(s);
        return this._createModernStair(s);
    }

    // ── Modern straight (images-6): pale stone treads + black metal / glass rail ──
    _createModernStair(s) {
        const g = new THREE.Group();
        const len = s.axis === 'z' ? (s.zMax - s.zMin) : (s.xMax - s.xMin);
        const width = s.width ?? 3.0;
        const steps = Math.max(6, Math.round(len / 0.48));
        const stepRise = (s.y1 - s.y0) / steps;
        const absRise = Math.abs(stepRise);
        const stepRun = len / steps;
        const cx = (s.xMin + s.xMax) / 2;
        const cz = (s.zMin + s.zMax) / 2;
        const treadCol = 0xeceae6;
        const treadAlt = 0xe0ded8;
        const railCol = 0x1a1c20;
        const glassMat = toonMat(0xc8d4dc, { transparent: true, opacity: 0.28 });

        for (let i = 0; i < steps; i++) {
            // Tread top at the higher of the step's two edges
            const yA = s.y0 + stepRise * i;
            const yB = s.y0 + stepRise * (i + 1);
            const topY = Math.max(yA, yB);
            const tread = toonMesh(
                new THREE.BoxGeometry(
                    s.axis === 'x' ? stepRun + 0.02 : width,
                    Math.max(0.08, absRise * 0.92),
                    s.axis === 'x' ? width : stepRun + 0.02
                ),
                i % 2 === 0 ? treadCol : treadAlt,
                { outline: false }
            );
            if (s.axis === 'x') {
                tread.mesh.position.set(
                    s.xMin + stepRun * i + stepRun / 2,
                    topY - absRise * 0.46,
                    cz
                );
            } else {
                tread.mesh.position.set(
                    cx,
                    topY - absRise * 0.46,
                    s.zMin + stepRun * i + stepRun / 2
                );
            }
            tread.mesh.castShadow = true;
            tread.mesh.receiveShadow = true;
            g.add(tread.group);
        }

        // Side rails: posts + glass panels + handrail
        const sideOff = width / 2 + 0.04;
        [-sideOff, sideOff].forEach(side => {
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const y = s.y0 + (s.y1 - s.y0) * t + 0.55;
                let px, pz;
                if (s.axis === 'x') {
                    px = THREE.MathUtils.lerp(s.xMin, s.xMax, t);
                    pz = cz + side;
                } else {
                    px = cx + side;
                    pz = THREE.MathUtils.lerp(s.zMin, s.zMax, t);
                }
                const post = toonMesh(new THREE.BoxGeometry(0.05, 1.05, 0.05), railCol, { outline: false });
                post.mesh.position.set(px, y, pz);
                g.add(post.group);

                if (i < steps) {
                    const glass = new THREE.Mesh(
                        new THREE.BoxGeometry(
                            s.axis === 'x' ? stepRun * 0.92 : 0.03,
                            0.85,
                            s.axis === 'x' ? 0.03 : stepRun * 0.92
                        ),
                        glassMat
                    );
                    const gy = s.y0 + (s.y1 - s.y0) * ((i + 0.5) / steps) + 0.5;
                    if (s.axis === 'x') {
                        glass.position.set(s.xMin + stepRun * (i + 0.5), gy, cz + side);
                    } else {
                        glass.position.set(cx + side, gy, s.zMin + stepRun * (i + 0.5));
                    }
                    g.add(glass);
                }
            }

            // Continuous handrail as short segments
            for (let i = 0; i < steps; i++) {
                const t0 = i / steps;
                const t1 = (i + 1) / steps;
                const y0 = s.y0 + (s.y1 - s.y0) * t0 + 1.05;
                const y1 = s.y0 + (s.y1 - s.y0) * t1 + 1.05;
                const midY = (y0 + y1) / 2;
                const dy = y1 - y0;
                const rail = toonMesh(
                    new THREE.BoxGeometry(
                        s.axis === 'x' ? stepRun + 0.04 : 0.06,
                        0.05,
                        s.axis === 'x' ? 0.06 : stepRun + 0.04
                    ),
                    railCol,
                    { outline: false }
                );
                if (s.axis === 'x') {
                    rail.mesh.position.set(s.xMin + stepRun * (i + 0.5), midY, cz + side);
                    rail.mesh.rotation.z = -Math.atan2(dy, stepRun);
                } else {
                    rail.mesh.position.set(cx + side, midY, s.zMin + stepRun * (i + 0.5));
                    rail.mesh.rotation.x = Math.atan2(dy, stepRun);
                }
                g.add(rail.group);
            }
        });

        return g;
    }

    // ── Curved wooden stair (images-5): wood treads along arc + thin black rail ──
    _createCurvedStair(s) {
        const g = new THREE.Group();
        const span = s.angle1 - s.angle0;
        const arcLen = Math.abs(span) * s.radius;
        const steps = Math.max(10, Math.round(arcLen / 0.42));
        const stepRise = (s.y1 - s.y0) / steps;
        const width = s.width ?? 2.4;
        const woodA = 0x8b5a3c;
        const woodB = 0x7a4e34;
        const railCol = 0x1c1e22;

        for (let i = 0; i < steps; i++) {
            const t = (i + 0.5) / steps;
            const ang = s.angle0 + span * t;
            const y = s.y0 + stepRise * i;
            const px = s.cx + Math.cos(ang) * s.radius;
            const pz = s.cz + Math.sin(ang) * s.radius;

            const tread = toonMesh(
                new THREE.BoxGeometry(width, Math.max(0.07, stepRise * 0.85), 0.4),
                i % 2 === 0 ? woodA : woodB,
                { outline: false }
            );
            tread.mesh.position.set(px, y + stepRise * 0.42, pz);
            tread.mesh.rotation.y = -ang + Math.PI / 2;
            tread.mesh.castShadow = true;
            tread.mesh.receiveShadow = true;
            g.add(tread.group);
        }

        // Outer handrail along the outer arc
        const outerR = s.radius + width * 0.42;
        const railSegs = Math.max(12, steps);
        for (let i = 0; i <= railSegs; i++) {
            const t = i / railSegs;
            const ang = s.angle0 + span * t;
            const y = s.y0 + (s.y1 - s.y0) * t + 0.5;
            const px = s.cx + Math.cos(ang) * outerR;
            const pz = s.cz + Math.sin(ang) * outerR;

            const post = toonMesh(new THREE.BoxGeometry(0.04, 0.95, 0.04), railCol, { outline: false });
            post.mesh.position.set(px, y, pz);
            g.add(post.group);

            if (i < railSegs) {
                const t1 = (i + 1) / railSegs;
                const ang1 = s.angle0 + span * t1;
                const y1 = s.y0 + (s.y1 - s.y0) * t1 + 0.95;
                const px1 = s.cx + Math.cos(ang1) * outerR;
                const pz1 = s.cz + Math.sin(ang1) * outerR;
                const mx = (px + px1) / 2;
                const mz = (pz + pz1) / 2;
                const my = (y + 0.45 + y1) / 2;
                const dist = Math.hypot(px1 - px, pz1 - pz);
                const hand = toonMesh(new THREE.BoxGeometry(0.05, 0.04, dist + 0.02), railCol, { outline: false });
                hand.mesh.position.set(mx, my, mz);
                hand.mesh.lookAt(px1, my, pz1);
                g.add(hand.group);
            }
        }

        return g;
    }

    // ── Spiral / double-helix (images-3 / images-4) ──
    _createSpiralStair(s, doubleHelix = false) {
        const g = new THREE.Group();
        const turns = s.turns ?? 1.4;
        const totalAng = turns * Math.PI * 2 * (s.cw ? -1 : 1);
        const a0 = s.angle0 ?? 0;
        const radius = s.radius ?? 2.2;
        const width = s.width ?? 1.5;
        const steps = Math.max(16, Math.round(Math.abs(totalAng) * radius / 0.38));
        const stepRise = (s.y1 - s.y0) / steps;
        const treadCol = doubleHelix ? 0xc8b8a8 : 0xb8b0a4;
        const treadAlt = doubleHelix ? 0xb8a898 : 0xa8a098;
        const railCol = doubleHelix ? 0x8a3028 : 0x1a1c20;
        const coreCol = doubleHelix ? 0x9a3a2e : 0x8a8880;

        // Central column
        const coreH = (s.y1 - s.y0) + 0.8;
        const core = toonMesh(
            new THREE.CylinderGeometry(radius * 0.28, radius * 0.32, coreH, 12),
            coreCol,
            { outline: false }
        );
        core.mesh.position.set(s.cx, s.y0 + coreH / 2 - 0.1, s.cz);
        core.mesh.castShadow = true;
        g.add(core.group);

        const arms = doubleHelix ? [0, Math.PI] : [0];
        arms.forEach(phase => {
            for (let i = 0; i < steps; i++) {
                const t = (i + 0.5) / steps;
                const ang = a0 + totalAng * t + phase;
                const y = s.y0 + stepRise * i;
                const px = s.cx + Math.cos(ang) * radius;
                const pz = s.cz + Math.sin(ang) * radius;

                const tread = toonMesh(
                    new THREE.BoxGeometry(width, Math.max(0.06, stepRise * 0.75), 0.38),
                    i % 2 === 0 ? treadCol : treadAlt,
                    { outline: false }
                );
                tread.mesh.position.set(px, y + stepRise * 0.38, pz);
                tread.mesh.rotation.y = -ang + Math.PI / 2;
                // Wedge toward center slightly
                tread.mesh.scale.set(1, 1, 1);
                tread.mesh.castShadow = true;
                tread.mesh.receiveShadow = true;
                g.add(tread.group);
            }

            // Outer black vertical balusters + handrail
            const outerR = radius + width * 0.42;
            const balusters = Math.max(18, Math.floor(steps * 0.9));
            for (let i = 0; i <= balusters; i++) {
                const t = i / balusters;
                const ang = a0 + totalAng * t + phase;
                const y = s.y0 + (s.y1 - s.y0) * t;
                const px = s.cx + Math.cos(ang) * outerR;
                const pz = s.cz + Math.sin(ang) * outerR;

                const post = toonMesh(
                    new THREE.BoxGeometry(0.04, 0.9, 0.04),
                    railCol,
                    { outline: false }
                );
                post.mesh.position.set(px, y + 0.5, pz);
                g.add(post.group);

                if (i < balusters) {
                    const t1 = (i + 1) / balusters;
                    const ang1 = a0 + totalAng * t1 + phase;
                    const y1 = s.y0 + (s.y1 - s.y0) * t1 + 0.95;
                    const px1 = s.cx + Math.cos(ang1) * outerR;
                    const pz1 = s.cz + Math.sin(ang1) * outerR;
                    const mx = (px + px1) / 2;
                    const mz = (pz + pz1) / 2;
                    const my = (y + 0.95 + y1) / 2;
                    const dist = Math.hypot(px1 - px, pz1 - pz, y1 - (y + 0.95));
                    const hand = toonMesh(
                        new THREE.BoxGeometry(0.05, 0.05, dist + 0.02),
                        railCol,
                        { outline: false }
                    );
                    hand.mesh.position.set(mx, my, mz);
                    hand.mesh.lookAt(px1, y1, pz1);
                    g.add(hand.group);
                }
            }
        });

        // Small landing disc at top
        const landing = toonMesh(
            new THREE.CylinderGeometry(radius + width * 0.35, radius + width * 0.35, 0.12, 16),
            treadCol,
            { outline: false }
        );
        landing.mesh.position.set(s.cx, s.y1 + 0.06, s.cz);
        landing.mesh.receiveShadow = true;
        g.add(landing.group);

        // Simple rail ring on landing
        const ringPosts = 10;
        const ringR = radius + width * 0.3;
        for (let i = 0; i < ringPosts; i++) {
            const ang = (i / ringPosts) * Math.PI * 2;
            const post = toonMesh(new THREE.BoxGeometry(0.04, 0.85, 0.04), railCol, { outline: false });
            post.mesh.position.set(
                s.cx + Math.cos(ang) * ringR,
                s.y1 + 0.5,
                s.cz + Math.sin(ang) * ringR
            );
            g.add(post.group);
        }

        return g;
    }
}