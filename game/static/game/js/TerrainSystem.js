import * as THREE from 'three';
import { WORLD, PALETTE, BRIDGES, isCityFlat } from './config.js';
import { toonMat, toonMesh, getGradientMap } from './ToonStyle.js';

const MAX_STEP = 2.2;
const STAIR_MAX_STEP = 2.5;

/** Curved hills + stairs — only OUTSIDE the city (flat slab stays clear). */
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

        for (const s of this.stairs) {
            if (this._inRect(x, z, s)) {
                // Never apply stairs that sit inside the city
                if (this._isCityFlat((s.xMin + s.xMax) / 2, (s.zMin + s.zMax) / 2)) continue;
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

        // Bridge approach ramps (ground → deck) on east/west ends
        for (const b of BRIDGES) {
            if (Math.abs(z - b.z) > b.halfD + 1.5) continue;
            for (const side of [-1, 1]) {
                const innerX = b.x + side * b.halfW;
                const outerX = b.x + side * (b.halfW + 9);
                const onRamp = side > 0
                    ? (x >= innerX && x <= outerX)
                    : (x <= innerX && x >= outerX);
                if (!onRamp) continue;
                if (currentY === null || currentY > 0.5) {
                    const t = side > 0
                        ? (x - innerX) / (outerX - innerX)
                        : (innerX - x) / (innerX - outerX);
                    return THREE.MathUtils.lerp(WORLD.groundY, b.deckY, THREE.MathUtils.clamp(t, 0, 1));
                }
            }
        }

        // Stairs override
        for (const s of this.stairs) {
            if (this._inRect(x, z, s)) {
                const t = s.axis === 'z'
                    ? (z - s.zMin) / (s.zMax - s.zMin)
                    : (x - s.xMin) / (s.xMax - s.xMin);
                return THREE.MathUtils.lerp(s.y0, s.y1, THREE.MathUtils.clamp(t, 0, 1));
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
        return this.stairs.some(s => this._inRect(x, z, s));
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
        // No embankment stairs inside the city — only short hillside paths far outside.
        this.stairs = [];

        // Outer nature paths only (all points outside city + margin)
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
}