import * as THREE from 'three';
import { WORLD, PALETTE, BRIDGES, isCityFlat } from './config.js';
import { toonMat, toonMesh, getGradientMap } from './ToonStyle.js';
import { ExploreTerrain } from './ExploreTerrain.js';

const MAX_STEP = 2.2;
const BRIDGE_MAX_STEP = 3.0;
/** Max rise per move check on continuous explore heightfields (ridge / gorge / hills). */
const EXPLORE_MAX_STEP = 5.0;
/** Max rise/run on explore slopes (~49°). Steeper = solid cliff wall. */
const EXPLORE_MAX_SLOPE = 1.15;
/** If feet are this far under the sampled surface, treat as clipping through solid mesh. */
const CLIP_EPS = 0.4;

/**
 * Curved hills + explore terrains (ridge / gorge).
 * Hills stay outside the city slab; no stairs.
 *
 * Walk physics rule for continuous heightfields (explore + hills):
 *   - Stand ON the surface (never walk through solid mesh).
 *   - Gentle slopes are walkable; cliff faces block horizontal entry.
 *   - If already under the mesh, snap/climb up onto the surface.
 */
export class TerrainSystem {
    constructor() {
        this.terraces = [];
        this.slopes = [];
        this.wallColliders = [];
        this.butterflies = [];
        this.time = 0;
        this.explore = new ExploreTerrain();

        // Rolling hills — outside city; avoid overlapping explore ridge/gorge
        // Ridge zone ≈ (20,-255) size 190; Gorge ≈ (-255,15) 155×240
        this.hills = [
            // North — offset around ridge (not under ridge mesh)
            { x: -120, z: -230, r: 36, hy: -22 },
            { x: 130, z: -235, r: 38, hy: -24 },
            // South band
            { x: -80, z: 250, r: 48, hy: -30 },
            { x: 30, z: 265, r: 55, hy: -34 },
            { x: 120, z: 248, r: 44, hy: -28 },
            // West — far past gorge
            { x: -310, z: -100, r: 36, hy: -22 },
            { x: -305, z: 160, r: 34, hy: -20 },
            // East band
            { x: 250, z: -50, r: 50, hy: -32 },
            { x: 260, z: 60, r: 48, hy: -30 },
            { x: 245, z: 150, r: 42, hy: -26 },
        ];
    }

    build(scene) {
        this._defineZones();
        this._buildCurvedHills(scene);
        this.explore.build(scene);
        this._buildSteppingStones(scene);
        this._buildHedges(scene);
        this._buildWildflowers(scene);
        this._buildButterflies(scene);
        return this;
    }

    update(dt) {
        this.time += dt;
        this.explore?.update(dt);

        // Butterflies only (no grass color animation)
        this.butterflies.forEach((b, idx) => {
            const angle = this.time * b.speed + idx;
            b.group.position.x = b.baseX + Math.sin(angle) * 4;
            b.group.position.z = b.baseZ + Math.cos(angle) * 4;
            b.group.position.y = b.baseY + Math.sin(angle * 2.5) * 1.5;
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

    /** Walkable height on open lawn / hills / explore terrains (no bridge decks). */
    _lawnHeightAt(x, z) {
        // Hard rule: nothing raises the ground inside the city
        if (this._isCityFlat(x, z)) return WORLD.groundY;
        if (this._isParkLawn(x, z)) return WORLD.groundY;

        // Pastel ridge + river gorge (explore zones outside town)
        const exploreH = this.explore?.heightAt(x, z);
        if (exploreH != null) return exploreH;

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

        // Soft ramps on both ends of each bridge (ground → deck)
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

    isOnStair(_x, _z) {
        return false;
    }

    /** True when standing on continuous outdoor heightfield (ridge, gorge, or rolling hills). */
    isContinuousTerrain(x, z) {
        if (this._isCityFlat(x, z) || this._isParkLawn(x, z)) return false;
        if (this.explore?.isInExplore(x, z)) return true;
        // Rolling hills outside city also use continuous surface follow
        for (const h of this.hills) {
            if (this._hillTouchesCity(h)) continue;
            const dx = x - h.x;
            const dz = z - h.z;
            if (dx * dx + dz * dz < h.r * h.r) return true;
        }
        return false;
    }

    canTraverse(fromX, fromZ, fromY, toX, toZ) {
        const toY = this.getHeightAt(toX, toZ, fromY);
        const dy = toY - fromY;

        // Going down / flat is always OK (gravity + surface snap handle drops)
        if (dy <= 0.01) return true;

        const continuous =
            this.isContinuousTerrain(fromX, fromZ) || this.isContinuousTerrain(toX, toZ);

        if (continuous) {
            // Frame-rate independent slope probe (~1 m look-ahead).
            // Tiny per-frame steps would make walls look shallow if we used dy/dist alone.
            const dist = Math.hypot(toX - fromX, toZ - fromZ);
            if (dist < 1e-6) return true;
            const ux = (toX - fromX) / dist;
            const uz = (toZ - fromZ) / dist;
            const LOOK = 1.15;
            const fromSurf = this.getHeightAt(fromX, fromZ, fromY);
            const lookY = this.getHeightAt(fromX + ux * LOOK, fromZ + uz * LOOK, fromY);
            const rise = lookY - fromSurf;
            if (rise <= 0.05) return true;
            // Walkable mountain / bank slope; steeper = solid cliff (cannot tunnel in)
            return (rise / LOOK) <= EXPLORE_MAX_SLOPE;
        }

        // City / discrete steps
        if (dy <= MAX_STEP) return true;

        if (this.isOnBridge(fromX, fromZ, fromY) || this.isOnBridge(toX, toZ, toY)) {
            return dy <= BRIDGE_MAX_STEP;
        }

        return false;
    }

    getWalkableHeight(x, z, currentY) {
        const target = this.getHeightAt(x, z, currentY);
        const continuous = this.isContinuousTerrain(x, z);

        // ── Anti-clip: never leave feet inside solid mesh ──────────────────
        // Root bug: MAX_STEP kept currentY while the ridge/gorge mesh sat high
        // above, so the player walked *through* the mountain instead of on it.
        if (currentY < target - CLIP_EPS) {
            const buried = target - currentY;
            if (continuous) {
                // Deeply stuck (teleport / load / old clip) → hard eject onto surface
                if (buried > 10) return target;
                // Climb up onto grass/rock at a controlled rate
                return Math.min(target, currentY + EXPLORE_MAX_STEP);
            }
            // Non-continuous: still never stay under solid ground
            return target;
        }

        // On or above surface — follow down freely (stand on grass / rock / bank)
        if (target <= currentY + 0.1) return target;

        if (continuous) {
            // Continuous heightfield: always follow the mesh surface.
            // Cliffs are gated by canTraverse (no walking into solid walls).
            return target;
        }

        // City / bridge step limits
        if (this.isOnBridge(x, z, currentY)) {
            if (target - currentY <= BRIDGE_MAX_STEP) return target;
            return currentY;
        }
        if (target - currentY <= MAX_STEP) return target;
        return currentY;
    }

    _defineZones() {
        // Outer nature slopes only (all points outside city + margin)
        this.slopes = [
            { pts: [[-250, -220, 6.5], [-235, -200, 5.0], [-220, -180, 3.0]], w: 8 },
            { pts: [[250, -210, 6.5], [235, -190, 5.0], [220, -170, 3.0]], w: 8 },
            { pts: [[-250, 200, 6.5], [-235, 180, 5.0], [-220, 165, 3.0]], w: 8 },
            { pts: [[250, 195, 6.5], [235, 175, 5.0], [220, 160, 3.0]], w: 8 },
        ];
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
        // Outside city: green grass hills. Inside city: low grey underlay so roads stay visible.
        // IMPORTANT: city verts sit BELOW road height so asphalt is never buried under green.
        const groundGeo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, 80, 80);
        groundGeo.rotateX(-Math.PI / 2);

        const pos = groundGeo.attributes.position;
        const colors = [];
        const grassCol = new THREE.Color(PALETTE.grass ?? 0x90c87a);
        const cityCol = new THREE.Color(PALETTE.concrete ?? 0xb0aca4);

        for (let i = 0; i < pos.count; i++) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            const inCity = this._isCityFlat(vx, vz);
            // City: sink under roads/lots. Outside: real walk height.
            const surfaceY = inCity ? 0.0 : this._lawnHeightAt(vx, vz);
            pos.setY(i, surfaceY);

            const c = inCity ? cityCol : grassCol;
            colors.push(c.r, c.g, c.b);
        }
        pos.needsUpdate = true;
        groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        groundGeo.computeVertexNormals();

        const baseMat = new THREE.MeshToonMaterial({
            vertexColors: true,
            gradientMap: getGradientMap(),
        });

        const baseMesh = new THREE.Mesh(groundGeo, baseMat);
        baseMesh.position.y = 0;
        baseMesh.receiveShadow = true;
        baseMesh.name = 'terrainGrass';
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

}
