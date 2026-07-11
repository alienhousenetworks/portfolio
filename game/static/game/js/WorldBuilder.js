/**
 * WorldBuilder.js — Japanese Anime Town (tree-avenue city)
 * Larger city, few main roads, dense canopy avenues like residential
 * tree-tunnel streets (buildings sit behind the trees).
 */
import * as THREE from 'three';
import { WORLD, PALETTE, isCityFlat } from './config.js';
import { toonMat, toonMesh, setupCityLighting, INK } from './ToonStyle.js';
import {
    buildJapaneseBuilding, buildJapaneseCorner, buildShinjukuBuilding, createVendingMachine,
} from './Buildings.js';
import {
    createStreetLamp, createBench, createFlowerPot, createMailbox,
    createBicycleParked, createCherryTree, createLargeTree, createPineTree,
    createAvenueTree, createHedge, createLowWall,
    createRoundSign, createTrafficCone, createTrashCan, createPowerPole,
    createParkedCar, createPostBox,
} from './Props.js';

// ─── Sparse road network — German-style (Fahrbahn + Bordstein + Gehweg) ───
// Main Avenue   : N–S at X=0  (tree-tunnel street)
// Cross Blvd    : E–W at Z=0
// North Quiet   : E–W at Z=-90
// South Quiet   : E–W at Z= 90
// w  = Fahrbahn (asphalt carriageway) width
// sw = Gehweg (sidewalk) width each side — keep narrow
// curb = Bordstein thickness
const ROAD = {
    main:  { x: 0,   w: 15, z1: -135, z2: 135 }, // N-S — wider avenue
    cross: { z: 0,   w: 13, x1: -155, x2: 155 }, // E-W
    north: { z: -90, w: 11, x1: -145, x2: 145 },
    south: { z: 90,  w: 11, x1: -145, x2: 145 },
    sw: 1.5,   // Gehweg each side (was 2.4 — too wide)
    curb: 0.28, // Bordstein strip width
};

const CITY_HX = WORLD.cityHalfX ?? 165;
const CITY_HZ = WORLD.cityHalfZ ?? 145;

export class WorldBuilder {
    constructor(scene, gameData, terrain = null, chunkManager = null) {
        this.scene = scene;
        this.data = gameData;
        this.terrain = terrain;
        this.chunks = chunkManager;
        this.pois = [];
        this.colliders = [];
        this.buildingSites = new Set();
    }

    build() {
        this._skyDome();
        this._clouds();
        this._lights();
        this._ground();
        this._roadNetwork();
        this._mainAvenueShinjuku(); // dense commercial canyon (full Main length)
        this._avenueTrees();        // tree tunnels on side streets only
        this._buildingRows();
        this._streetProps();
        this._mainAvenueProps();
        this._createDetailedShops();
        this._createCentralTeaStall();
        this._crosswalks();
        this._wireNetwork();
        this._surroundingNature();
        this._pois();
        if (this.terrain) this.colliders.push(...(this.terrain.wallColliders || []));
        return {
            pois: this.pois,
            colliders: this.colliders,
            buildings: this.data.buildings || [],
            _cloudMeshes: this._cloudMeshes || [],
            // EnvironmentSystem hooks
            skyMesh: this._skyMesh || null,
            lights: this._lightHandles || null,
            groundGrass: this._groundGrass || null,
        };
    }

    getTerrainHeight(x, z) {
        return this.terrain ? this.terrain.getHeightAt(x, z) : WORLD.groundY;
    }

    _inPark() { return false; }
    _inRiver(x, z, margin = 0) { return false; }
    _markSite(x, z, w = 16, d = 16, h = 0) {
        this.colliders.push({ x, z, w, d, h, floorY: this.getTerrainHeight(x, z) });
    }

    // ─── Sky ────────────────────────────────────────────────────────────────
    _skyDome() {
        const geo = new THREE.SphereGeometry(620, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
        geo.computeBoundingSphere();
        const cols = [];
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const t = Math.max(0, Math.min(1, pos.getY(i) / 620));
            const r = THREE.MathUtils.lerp(0.36, 0.12, t);
            const g = THREE.MathUtils.lerp(0.88, 0.62, t);
            const b = THREE.MathUtils.lerp(0.84, 0.62, t);
            cols.push(r, g, b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        this._skyMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            vertexColors: true, side: THREE.BackSide, fog: false,
        }));
        this._skyMesh.name = 'skyDome';
        this._skyMesh.userData.isSkyDome = true;
        this.scene.add(this._skyMesh);
        this.scene.fog = new THREE.Fog(0x7adede, 110, 360);
    }

    _clouds() {
        this._cloudMeshes = [];
        const cloudMat = toonMat(0xfcfcfc, { transparent: true, opacity: 0.9 });
        for (let i = 0; i < 14; i++) {
            const g = new THREE.Group();
            const seed = i * 19 + 5;
            const cx = ((seed * 53 + 17) % 560) - 280;
            const cz = ((seed * 71 + 23) % 560) - 280;
            const cy = 48 + (seed % 24);
            const puffs = 3 + (seed % 4);
            for (let p = 0; p < puffs; p++) {
                const r = 9 + (seed + p) % 13;
                const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), cloudMat);
                puff.scale.set(1.8, 0.38, 1.0);
                puff.position.set(p * r * 0.78, (p % 2) * 1.4, (p * 4 % 11) - 5);
                g.add(puff);
            }
            g.position.set(cx, cy, cz);
            this.scene.add(g);
            this._cloudMeshes.push({ g, speed: 0.65 + (seed % 8) * 0.08, dir: seed % 2 === 0 ? 1 : -1 });
        }
    }

    _lights() { this._lightHandles = setupCityLighting(this.scene); }

    // ─── Ground (larger city slab) ──────────────────────────────────────────
    _ground() {
        const grassMat = toonMat(0x90c87a);
        const outer = new THREE.Mesh(
            new THREE.PlaneGeometry(WORLD.size, WORLD.size),
            grassMat
        );
        outer.rotation.x = -Math.PI / 2;
        outer.receiveShadow = true;
        this.scene.add(outer);
        this._groundGrass = outer;

        // Block lots under buildings — muted, not sidewalk-like
        // (real Gehweg lives only beside roads)
        const cityW = CITY_HX * 2;
        const cityD = CITY_HZ * 2;
        const city = new THREE.Mesh(
            new THREE.PlaneGeometry(cityW, cityD),
            toonMat(0x8a9488)
        );
        city.rotation.x = -Math.PI / 2;
        city.position.y = 0.02;
        city.receiveShadow = true;
        this.scene.add(city);

        // River west of the city slab (no overlap with roads/buildings)
        const riverX = WORLD.riverX ?? -(CITY_HX + 20);
        const riverGeo = new THREE.PlaneGeometry(WORLD.riverWidth ?? 28, cityD + 40);
        const riverMat = toonMat(0x7ac4d0, { transparent: true, opacity: 0.85 });
        const river = new THREE.Mesh(riverGeo, riverMat);
        river.rotation.x = -Math.PI / 2;
        river.position.set(riverX, 0.03, 0);
        this.scene.add(river);
    }

    // Keep clear of roads + Gehweg + small tree buffer, plaza, river
    _isRoadOrPark(x, z, pad = 0) {
        // Central plaza (small green at crossroads)
        if (Math.hypot(x, z) < 16 + pad) return true;

        // Corridor = half Fahrbahn + Bordstein + Gehweg + tree strip
        const corridor = (w) => w / 2 + ROAD.curb + ROAD.sw + 2.2 + pad;

        // Main Avenue N-S
        if (Math.abs(x - ROAD.main.x) < corridor(ROAD.main.w)
            && z >= ROAD.main.z1 - pad && z <= ROAD.main.z2 + pad) return true;

        // Cross Boulevard E-W
        if (Math.abs(z - ROAD.cross.z) < corridor(ROAD.cross.w)
            && x >= ROAD.cross.x1 - pad && x <= ROAD.cross.x2 + pad) return true;

        // North / South quiet lanes
        if (Math.abs(z - ROAD.north.z) < corridor(ROAD.north.w)
            && x >= ROAD.north.x1 - pad && x <= ROAD.north.x2 + pad) return true;
        if (Math.abs(z - ROAD.south.z) < corridor(ROAD.south.w)
            && x >= ROAD.south.x1 - pad && x <= ROAD.south.x2 + pad) return true;

        // River (west of city)
        const riverX = WORLD.riverX ?? -(CITY_HX + 20);
        if (x < riverX + (WORLD.riverWidth ?? 28) / 2 + 4) return true;

        return false;
    }

    _getAssignedBuilding(x, z) {
        const buildings = this.data.buildings || [];
        return buildings.find(b => Math.hypot(b.x - x, b.z - z) < 10.0);
    }

    // ─── Road Network — German style ───────────────────────────────────────
    // Fahrbahn (dark asphalt) | Bordstein (raised curb) | Gehweg (tiled pavers)
    _roadNetwork() {
        const asphalt = toonMat(0x4a5258);
        const asphaltEdge = toonMat(0x3e464c);
        const gehwegA = toonMat(0xc8c4bc);
        const gehwegB = toonMat(0xbbb6ae);
        const curbMat = toonMat(0xd8d4cc);
        const lineMat = toonMat(0xf4f2ea, { transparent: true, opacity: 0.9 });

        const plane = (x, z, w, d, mat, y = 0.05) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, y, z);
            m.receiveShadow = true;
            this.scene.add(m);
            return m;
        };

        /** N–S road: Fahrbahn + two Bordsteine + two Gehwege */
        const nsRoad = (cx, z1, z2, w) => {
            const len = z2 - z1;
            const midZ = (z1 + z2) / 2;
            const half = w / 2;
            const sw = ROAD.sw;
            const cw = ROAD.curb;

            // Fahrbahn (asphalt carriageway)
            plane(cx, midZ, w, len, asphalt, 0.048);
            // Subtle darker edge band inside asphalt (gutter feel)
            plane(cx - half + 0.35, midZ, 0.55, len, asphaltEdge, 0.049);
            plane(cx + half - 0.35, midZ, 0.55, len, asphaltEdge, 0.049);

            // Bordstein (raised curb) each side
            [-1, 1].forEach(side => {
                const curbX = cx + side * (half + cw / 2);
                const curb = toonMesh(new THREE.BoxGeometry(cw, 0.14, len), curbMat, { outline: false });
                curb.mesh.position.set(curbX, 0.09, midZ);
                curb.mesh.receiveShadow = true;
                this.scene.add(curb.group);
            });

            // Gehweg — narrow tiled sidewalks outside curb only (not under road)
            [-1, 1].forEach(side => {
                const walkX = cx + side * (half + cw + sw / 2);
                // sizeX = sidewalk width, sizeZ = length along road
                this._buildGehwegStrip(walkX, midZ, sw, len, 'ns', gehwegA, gehwegB);
            });

            // German road markings: dashed Mittellinie + solid edge Leitlinien
            this._germanLaneMarkings(cx, midZ, w, len, 'ns', lineMat);
        };

        /** E–W road */
        const ewRoad = (cz, x1, x2, w) => {
            const len = x2 - x1;
            const midX = (x1 + x2) / 2;
            const half = w / 2;
            const sw = ROAD.sw;
            const cw = ROAD.curb;

            plane(midX, cz, len, w, asphalt, 0.048);
            plane(midX, cz - half + 0.35, len, 0.55, asphaltEdge, 0.049);
            plane(midX, cz + half - 0.35, len, 0.55, asphaltEdge, 0.049);

            [-1, 1].forEach(side => {
                const curbZ = cz + side * (half + cw / 2);
                const curb = toonMesh(new THREE.BoxGeometry(len, 0.14, cw), curbMat, { outline: false });
                curb.mesh.position.set(midX, 0.09, curbZ);
                curb.mesh.receiveShadow = true;
                this.scene.add(curb.group);
            });

            [-1, 1].forEach(side => {
                const walkZ = cz + side * (half + cw + sw / 2);
                // sizeX = length along road, sizeZ = sidewalk width
                this._buildGehwegStrip(midX, walkZ, len, sw, 'ew', gehwegA, gehwegB);
            });

            this._germanLaneMarkings(midX, cz, w, len, 'ew', lineMat);
        };

        nsRoad(ROAD.main.x, ROAD.main.z1, ROAD.main.z2, ROAD.main.w);
        ewRoad(ROAD.cross.z, ROAD.cross.x1, ROAD.cross.x2, ROAD.cross.w);
        ewRoad(ROAD.north.z, ROAD.north.x1, ROAD.north.x2, ROAD.north.w);
        ewRoad(ROAD.south.z, ROAD.south.x1, ROAD.south.x2, ROAD.south.w);

        this._buildCentralPlaza();
    }

    /**
     * Betonplatte-style Gehweg (German sidewalk).
     * sizeX / sizeZ are world-axis extents of the strip.
     * axis 'ns' = strip runs along Z; 'ew' = along X.
     * Uses sparse seams + occasional tint blocks for FPS.
     */
    _buildGehwegStrip(cx, cz, sizeX, sizeZ, axis, matA, matB) {
        // Raised sidewalk slab (higher than asphalt)
        const base = new THREE.Mesh(new THREE.BoxGeometry(sizeX, 0.1, sizeZ), matA);
        base.position.set(cx, 0.11, cz);
        base.receiveShadow = true;
        this.scene.add(base);

        const seamMat = toonMat(0xa8a49c);
        const along = axis === 'ns' ? sizeZ : sizeX;
        const across = axis === 'ns' ? sizeX : sizeZ;
        const tile = 1.6; // Betonplatte scale
        const halfAlong = along / 2;

        // Cross seams every tile (shared materials keep cost low)
        for (let t = -halfAlong + tile; t < halfAlong - 0.5; t += tile) {
            // Skip dense seams through central plaza
            const wx = axis === 'ns' ? cx : cx + t;
            const wz = axis === 'ns' ? cz + t : cz;
            if (Math.hypot(wx, wz) < 16) continue;

            const seam = new THREE.Mesh(
                new THREE.BoxGeometry(
                    axis === 'ns' ? across * 0.94 : 0.045,
                    0.018,
                    axis === 'ns' ? 0.045 : across * 0.94
                ),
                seamMat
            );
            if (axis === 'ns') seam.position.set(cx, 0.165, cz + t);
            else seam.position.set(cx + t, 0.165, cz);
            this.scene.add(seam);
        }

        // One longitudinal center groove
        const longSeam = new THREE.Mesh(
            new THREE.BoxGeometry(
                axis === 'ns' ? 0.04 : along * 0.98,
                0.014,
                axis === 'ns' ? along * 0.98 : 0.04
            ),
            seamMat
        );
        longSeam.position.set(cx, 0.164, cz);
        this.scene.add(longSeam);

        // Sparse alternating paver tints (every 3rd tile)
        for (let t = -halfAlong + tile * 0.5; t < halfAlong; t += tile * 3) {
            const wx = axis === 'ns' ? cx : cx + t;
            const wz = axis === 'ns' ? cz + t : cz;
            if (Math.hypot(wx, wz) < 16) continue;

            const tint = new THREE.Mesh(
                new THREE.BoxGeometry(
                    axis === 'ns' ? across * 0.9 : tile * 0.9,
                    0.012,
                    axis === 'ns' ? tile * 0.9 : across * 0.9
                ),
                matB
            );
            if (axis === 'ns') tint.position.set(cx, 0.162, cz + t);
            else tint.position.set(cx + t, 0.162, cz);
            this.scene.add(tint);
        }
    }

    /** German lane paint: dashed center + solid edge lines */
    _germanLaneMarkings(cx, cz, roadW, len, axis, lineMat) {
        const half = roadW / 2;
        const y = 0.055;
        const skipPlaza = (pos) => Math.hypot(
            axis === 'ns' ? cx : pos,
            axis === 'ns' ? pos : cz
        ) < 14;

        // Dashed Mittellinie
        const dashLen = 2.8;
        const gap = 3.4;
        for (let t = -len / 2 + 2; t < len / 2 - 2; t += dashLen + gap) {
            const pos = t + dashLen / 2;
            if (skipPlaza(axis === 'ns' ? cz + pos : cx + pos)) continue;
            const dash = new THREE.Mesh(
                new THREE.PlaneGeometry(
                    axis === 'ns' ? 0.18 : dashLen,
                    axis === 'ns' ? dashLen : 0.18
                ),
                lineMat
            );
            dash.rotation.x = -Math.PI / 2;
            if (axis === 'ns') dash.position.set(cx, y, cz + pos);
            else dash.position.set(cx + pos, y, cz);
            this.scene.add(dash);
        }

        // Solid edge Leitlinien (near curb, inside asphalt)
        const edgeOff = half - 0.45;
        [-edgeOff, edgeOff].forEach(off => {
            const edge = new THREE.Mesh(
                new THREE.PlaneGeometry(
                    axis === 'ns' ? 0.12 : len * 0.98,
                    axis === 'ns' ? len * 0.98 : 0.12
                ),
                lineMat
            );
            edge.rotation.x = -Math.PI / 2;
            if (axis === 'ns') edge.position.set(cx + off, y, cz);
            else edge.position.set(cx, y, cz + off);
            this.scene.add(edge);
        });
    }

    _buildCentralPlaza() {
        // Small green plaza at the crossroads (not a huge ring city)
        const lawn = new THREE.Mesh(new THREE.CircleGeometry(14, 40), toonMat(0x78b060));
        lawn.rotation.x = -Math.PI / 2;
        lawn.position.set(0, 0.07, 0);
        this.scene.add(lawn);

        const path = new THREE.Mesh(new THREE.CircleGeometry(5.5, 24), toonMat(0xc8c4b8));
        path.rotation.x = -Math.PI / 2;
        path.position.set(0, 0.08, 0);
        this.scene.add(path);

        // Flower ring
        const flowerCols = [0xff8899, 0xffcc55, 0xa6d58f, 0x88ccee];
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            const pot = createFlowerPot(i);
            pot.position.set(Math.cos(a) * 9, 0, Math.sin(a) * 9);
            pot.scale.setScalar(1.15);
            this.scene.add(pot);
        }

        // Benches facing the plaza
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const b = createBench();
            b.position.set(Math.cos(a) * 11.5, 0, Math.sin(a) * 11.5);
            b.rotation.y = -a + Math.PI / 2;
            this.scene.add(b);
        }

        // Low fountain / tea landmark
        const rim = toonMesh(new THREE.CylinderGeometry(2.2, 2.4, 0.45, 16), 0xc8c4bc);
        rim.mesh.position.y = 0.25;
        this.scene.add(rim.group);
        const water = toonMesh(new THREE.CylinderGeometry(1.7, 1.7, 0.12, 16), 0x7ac4d0, {
            transparent: true, opacity: 0.85, outline: false,
        });
        water.mesh.position.y = 0.42;
        this.scene.add(water.group);
    }

    // ─── Tree-tunnel avenues (photo look) ───────────────────────────────────
    _avenueTrees() {
        let seed = 500;

        // Helper: place dual tree rows along a N-S road at given x
        // Trees sit on/near Gehweg (German Allee), hedges on outer sidewalk edge
        const nsAvenue = (roadX, z1, z2, halfW, spacing = 7.2) => {
            const edge = halfW / 2 + ROAD.curb;           // outer curb face
            const treeX = edge + ROAD.sw * 0.55;          // mid Gehweg
            const hedgeX = edge + ROAD.sw + 0.15;         // outer walk edge
            const wallX = edge + ROAD.sw + 2.4;           // property line
            for (let z = z1; z <= z2; z += spacing) {
                if (Math.hypot(roadX, z) < 18) continue; // clear plaza
                // Left row — lean toward road (+X if trees are on west, i.e. negative x offset)
                const tL = createAvenueTree(seed++, +1);
                tL.position.set(roadX - treeX, 0, z + ((seed % 5) - 2) * 0.15);
                this.scene.add(tL);
                // Right row — lean toward road
                const tR = createAvenueTree(seed++, -1);
                tR.position.set(roadX + treeX, 0, z + 3.4 + ((seed % 5) - 2) * 0.12);
                this.scene.add(tR);

                // Hedges along curb
                const hL = createHedge(spacing * 0.85, seed);
                hL.position.set(roadX - hedgeX, 0, z + spacing * 0.35);
                this.scene.add(hL);
                const hR = createHedge(spacing * 0.85, seed + 1);
                hR.position.set(roadX + hedgeX, 0, z + spacing * 0.35);
                this.scene.add(hR);

                // Low property walls behind trees (buildings sit further back)
                if (seed % 2 === 0) {
                    const wL = createLowWall(spacing * 0.9, seed);
                    wL.position.set(roadX - wallX, 0, z + spacing * 0.4);
                    this.scene.add(wL);
                    const wR = createLowWall(spacing * 0.9, seed + 3);
                    wR.position.set(roadX + wallX, 0, z + spacing * 0.4);
                    this.scene.add(wR);
                }
            }
        };

        // Helper: dual tree rows along an E-W road at given z
        const ewAvenue = (roadZ, x1, x2, halfW, spacing = 7.5) => {
            const edge = halfW / 2 + ROAD.curb;
            const treeZ = edge + ROAD.sw * 0.55;
            const hedgeZ = edge + ROAD.sw + 0.15;
            const wallZ = edge + ROAD.sw + 2.4;
            for (let x = x1; x <= x2; x += spacing) {
                if (Math.hypot(x, roadZ) < 18) continue;
                // Skip dense double-up on main avenue corridor
                if (Math.abs(x) < ROAD.main.w / 2 + 6) continue;

                const tN = createAvenueTree(seed++, +1);
                tN.rotation.y = Math.PI / 2;
                tN.position.set(x + ((seed % 5) - 2) * 0.12, 0, roadZ - treeZ);
                this.scene.add(tN);

                const tS = createAvenueTree(seed++, -1);
                tS.rotation.y = Math.PI / 2;
                tS.position.set(x + 3.5 + ((seed % 5) - 2) * 0.1, 0, roadZ + treeZ);
                this.scene.add(tS);

                const hN = createHedge(spacing * 0.85, seed);
                hN.rotation.y = Math.PI / 2;
                hN.position.set(x + spacing * 0.35, 0, roadZ - hedgeZ);
                this.scene.add(hN);
                const hS = createHedge(spacing * 0.85, seed + 2);
                hS.rotation.y = Math.PI / 2;
                hS.position.set(x + spacing * 0.35, 0, roadZ + hedgeZ);
                this.scene.add(hS);

                if (seed % 2 === 0) {
                    const wN = createLowWall(spacing * 0.9, seed);
                    wN.rotation.y = Math.PI / 2;
                    wN.position.set(x + spacing * 0.4, 0, roadZ - wallZ);
                    this.scene.add(wN);
                    const wS = createLowWall(spacing * 0.9, seed + 1);
                    wS.rotation.y = Math.PI / 2;
                    wS.position.set(x + spacing * 0.4, 0, roadZ + wallZ);
                    this.scene.add(wS);
                }
            }
        };

        // Main Avenue is Shinjuku commercial canyon — no dense tree tunnel.
        // Sparse decorative trees only near plaza edges (planted in _mainAvenueShinjuku).

        // Cross boulevard trees (slightly wider spacing)
        ewAvenue(ROAD.cross.z, ROAD.cross.x1 + 8, ROAD.cross.x2 - 8, ROAD.cross.w, 7.4);

        // Quiet residential lanes — still tree-lined, a bit airier
        ewAvenue(ROAD.north.z, ROAD.north.x1 + 10, ROAD.north.x2 - 10, ROAD.north.w, 8.2);
        ewAvenue(ROAD.south.z, ROAD.south.x1 + 10, ROAD.south.x2 - 10, ROAD.south.w, 8.2);
    }

    // ─── Zebrastreifen (German zebra crosswalks) ────────────────────────────
    _crosswalks() {
        const white = toonMat(0xf8f8f4, { transparent: true, opacity: 0.92 });
        // stripes across the road width; axis = direction of road travel
        const cw = (cx, cz, roadW, axis = 'x') => {
            const stripeW = 0.55;
            const gap = 0.55;
            const stripeLen = roadW * 0.88;
            const n = 6;
            const span = (n - 1) * (stripeW + gap);
            for (let i = 0; i < n; i++) {
                const off = -span / 2 + i * (stripeW + gap);
                const m = new THREE.Mesh(
                    new THREE.PlaneGeometry(
                        axis === 'x' ? stripeW : stripeLen,
                        axis === 'x' ? stripeLen : stripeW
                    ),
                    white
                );
                m.rotation.x = -Math.PI / 2;
                if (axis === 'x') m.position.set(cx + off, 0.056, cz);
                else m.position.set(cx, 0.056, cz + off);
                this.scene.add(m);
            }
        };

        const halfMain = ROAD.main.w / 2 + 1.2;
        const halfCross = ROAD.cross.w / 2 + 1.2;
        // Main × Cross
        cw(0, halfCross, ROAD.main.w, 'x');
        cw(0, -halfCross, ROAD.main.w, 'x');
        cw(halfMain, 0, ROAD.cross.w, 'z');
        cw(-halfMain, 0, ROAD.cross.w, 'z');
        // Main × North / South quiet lanes
        cw(0, ROAD.north.z, ROAD.main.w, 'x');
        cw(0, ROAD.south.z, ROAD.main.w, 'x');
    }

    /**
     * Full Main Avenue — Shinjuku-style commercial canyon (pastel).
     * Dense tall buildings, vertical signs, billboards, multi-lane road paint.
     */
    _mainAvenueShinjuku() {
        const halfRoad = ROAD.main.w / 2;
        const walkOuter = halfRoad + ROAD.curb + ROAD.sw;
        let seed = 7000;

        // Multi-lane markings (4-lane feel like the photo)
        this._mainAvenueLanePaint();

        // Dense building rows both sides for full Main length
        const spacing = 11.5;
        for (let z = ROAD.main.z1 + 8; z <= ROAD.main.z2 - 8; z += spacing) {
            // Clear central plaza
            if (Math.abs(z) < 20) continue;
            // Leave gaps at cross streets
            if (Math.abs(z - ROAD.north.z) < 12) continue;
            if (Math.abs(z - ROAD.south.z) < 12) continue;

            for (const side of [-1, 1]) {
                seed++;
                const w = 9.5 + (seed % 4);           // façade width along street
                const depth = 10 + (seed % 3);        // depth into block
                const h = 18 + (seed % 12) + ((seed * 3) % 5); // tall canyon

                // Front face sits just outside Gehweg
                const bx = side * (walkOuter + depth / 2 + 0.15);
                const bz = z + ((seed % 5) - 2) * 0.25;

                const bld = buildShinjukuBuilding(w, h, depth, seed);
                bld.position.set(bx, 0, bz);
                // Face street: +Z local → toward road center
                bld.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
                this.scene.add(bld);
                this.colliders.push({ x: bx, z: bz, w: depth, d: w, h, floorY: 0 });

                // Freestanding tall kanban post on Gehweg (photo: signs at sidewalk)
                if (seed % 2 === 0) {
                    this._spawnVerticalKanban(
                        side * (walkOuter - ROAD.sw * 0.35),
                        bz + side * 0.5,
                        seed
                    );
                }
            }
        }

        // Japanese direction / blue guide sign near plaza
        this._spawnGuideSign(-halfRoad - 1.2, 14, 0);
        this._spawnGuideSign(halfRoad + 1.2, -14, Math.PI);

        // Sparse bare street trees (photo has a few thin winter trees, not a tunnel)
        for (let z = -120; z <= 120; z += 36) {
            if (Math.abs(z) < 22) continue;
            for (const side of [-1, 1]) {
                const t = createAvenueTree(seed++, side > 0 ? -1 : 1);
                t.scale.setScalar(0.55);
                t.position.set(side * (walkOuter - 0.4), 0, z + side * 4);
                this.scene.add(t);
            }
        }
    }

    _mainAvenueLanePaint() {
        const white = toonMat(0xf4f2ea, { transparent: true, opacity: 0.88 });
        const y = 0.056;
        // Two dashed lane dividers (quarter lines) for multi-lane look
        const quarters = [-ROAD.main.w * 0.25, ROAD.main.w * 0.25];
        quarters.forEach(qx => {
            for (let z = ROAD.main.z1 + 4; z < ROAD.main.z2 - 4; z += 6.2) {
                if (Math.abs(z) < 16) continue;
                if (Math.abs(z - ROAD.north.z) < 8) continue;
                if (Math.abs(z - ROAD.south.z) < 8) continue;
                const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 2.6), white);
                dash.rotation.x = -Math.PI / 2;
                dash.position.set(qx, y, z);
                this.scene.add(dash);
            }
        });

        // Stop lines (止まれ-style solid white bars) before major crossings
        const stopZs = [
            ROAD.cross.w / 2 + 2.2,
            -(ROAD.cross.w / 2 + 2.2),
            ROAD.north.z + ROAD.north.w / 2 + 2,
            ROAD.north.z - ROAD.north.w / 2 - 2,
            ROAD.south.z + ROAD.south.w / 2 + 2,
            ROAD.south.z - ROAD.south.w / 2 - 2,
        ];
        stopZs.forEach(sz => {
            const line = new THREE.Mesh(new THREE.PlaneGeometry(ROAD.main.w * 0.92, 0.45), white);
            line.rotation.x = -Math.PI / 2;
            line.position.set(0, y + 0.001, sz);
            this.scene.add(line);

            // Abstract "止" stop boxes (two white squares with X — toon shorthand)
            [-3.2, 3.2].forEach(ox => {
                const box = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), white);
                box.rotation.x = -Math.PI / 2;
                box.position.set(ox, y + 0.002, sz + Math.sign(sz || 1) * 2.4);
                this.scene.add(box);
                // Dark X inside
                const xMat = toonMat(0x3a4248);
                for (const rot of [Math.PI / 4, -Math.PI / 4]) {
                    const arm = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.18), xMat);
                    arm.rotation.x = -Math.PI / 2;
                    arm.rotation.z = rot;
                    arm.position.set(ox, y + 0.003, sz + Math.sign(sz || 1) * 2.4);
                    this.scene.add(arm);
                }
            });
        });
    }

    _spawnVerticalKanban(x, z, seed) {
        const g = new THREE.Group();
        const neonCols = [0xff6b9d, 0x5ec8ff, 0xffd966, 0xff5c7a, 0x48d2c9, 0xc49bff];
        const col = neonCols[Math.abs(seed) % neonCols.length];
        const h = 4.5 + (seed % 4) * 0.6;

        const pole = toonMesh(new THREE.BoxGeometry(0.12, h, 0.12), 0x4a5058, { outline: false });
        pole.mesh.position.y = h / 2;
        g.add(pole.group);

        const faceMat = toonMat(col, { emissive: col, emissiveIntensity: 0.4 });
        const face = new THREE.Mesh(new THREE.BoxGeometry(0.55, h * 0.85, 0.08), faceMat);
        face.position.set(0.2, h * 0.55, 0);
        face.userData.cityLight = 'sign';
        face.userData.litAtNight = true;
        faceMat.userData.cityLight = 'sign';
        g.add(face);

        // Segment bars
        const segs = Math.floor(h * 0.85 / 0.65);
        for (let i = 0; i < segs; i++) {
            const bar = toonMesh(
                new THREE.BoxGeometry(0.4, 0.07, 0.04),
                0xf8f8f0,
                { outline: false, transparent: true, opacity: 0.5 }
            );
            bar.mesh.position.set(0.2, 0.9 + i * 0.65, 0.06);
            g.add(bar.group);
        }

        g.position.set(x, 0, z);
        this.scene.add(g);
    }

    _spawnGuideSign(x, z, rotY) {
        // Blue Japanese directional sign (pastel-soft navy)
        const g = new THREE.Group();
        const pole = toonMesh(new THREE.BoxGeometry(0.12, 3.4, 0.12), 0x6a7078, { outline: false });
        pole.mesh.position.y = 1.7;
        g.add(pole.group);

        const board = toonMesh(new THREE.BoxGeometry(2.8, 1.4, 0.12), 0x5a9fd4);
        board.mesh.position.set(0, 3.0, 0);
        g.add(board.group);

        // White arrow bars
        const arrow = toonMesh(new THREE.BoxGeometry(1.6, 0.18, 0.05), 0xf8f8f0, { outline: false });
        arrow.mesh.position.set(0, 3.15, 0.08);
        g.add(arrow.group);
        const tip = toonMesh(new THREE.BoxGeometry(0.5, 0.18, 0.05), 0xf8f8f0, { outline: false });
        tip.mesh.position.set(0.9, 3.0, 0.08);
        tip.mesh.rotation.z = -0.5;
        g.add(tip.group);

        // Small secondary panels
        const p2 = toonMesh(new THREE.BoxGeometry(2.2, 0.4, 0.08), 0x7ab8e0, { outline: false });
        p2.mesh.position.set(0, 2.5, 0.05);
        g.add(p2.group);

        g.position.set(x, 0, z);
        g.rotation.y = rotY;
        this.scene.add(g);
    }

    _mainAvenueProps() {
        const walk = ROAD.main.w / 2 + ROAD.curb + ROAD.sw * 0.55;
        let s = 900;

        // Dense street lamps (urban corridor)
        for (let z = ROAD.main.z1 + 10; z <= ROAD.main.z2 - 10; z += 16) {
            if (Math.abs(z) < 18) continue;
            for (const side of [-1, 1]) {
                const lamp = createStreetLamp();
                lamp.position.set(side * walk, 0, z + side * 3);
                if (side > 0) lamp.rotation.y = Math.PI;
                this.scene.add(lamp);
            }
            // Vending machines on Gehweg
            if (s % 2 === 0) {
                const vm = createVendingMachine(s);
                vm.position.set((s % 4 === 0 ? -1 : 1) * (walk + 0.5), 0, z + 5);
                this.scene.add(vm);
            }
            // Parked bikes + post boxes for street clutter
            if (s % 3 === 0) {
                const bike = createBicycleParked();
                bike.position.set(-walk - 0.3, 0, z + 7);
                this.scene.add(bike);
            }
            if (s % 4 === 0) {
                const pb = createPostBox();
                pb.position.set(walk + 0.35, 0, z + 2);
                this.scene.add(pb);
            }
            s++;
        }

        // Traffic cones / bollards near intersections
        const junctions = [ROAD.north.z, ROAD.south.z, 0];
        junctions.forEach((jz, i) => {
            for (const side of [-1, 1]) {
                const cone = createTrafficCone();
                cone.position.set(side * (ROAD.main.w / 2 - 0.8), 0, jz + side * 6);
                this.scene.add(cone);
            }
            const sign = createRoundSign(i);
            sign.position.set(ROAD.main.w / 2 + ROAD.curb + 0.6, 0, jz + 8);
            this.scene.add(sign);
        });
    }

    // ─── Buildings BEHIND the tree lines ────────────────────────────────────
    _buildingRows() {
        let s = 100;
        // Larger blocks: buildings sit well behind avenue trees (~16+ from road center)
        const cell = 16;

        // Candidate slots across expanded city
        for (let x = -150; x <= 150; x += cell) {
            for (let z = -125; z <= 125; z += cell) {
                // Keep roads + tree buffer clear
                if (this._isRoadOrPark(x, z, 2)) continue;

                // Main Avenue corridor filled by Shinjuku strip — keep clear for canyon
                const mainClear = ROAD.main.w / 2 + ROAD.curb + ROAD.sw + 12;
                const crossClear = ROAD.cross.w / 2 + ROAD.curb + ROAD.sw + 4;
                const quietClear = ROAD.north.w / 2 + ROAD.curb + ROAD.sw + 3.5;
                if (Math.abs(x) < mainClear) continue;
                // Setback from E-W roads
                if (Math.abs(z) < crossClear && Math.abs(x) > 16) continue;
                if (Math.abs(z - ROAD.north.z) < quietClear) continue;
                if (Math.abs(z - ROAD.south.z) < quietClear) continue;

                // Soft edge — don't pack right to slab edge
                if (Math.abs(x) > CITY_HX - 12 || Math.abs(z) > CITY_HZ - 12) continue;

                const assignedPoi = this._getAssignedBuilding(x, z);

                // Face nearest road
                let facing = 0;
                const dMain = Math.abs(x);
                const dCross = Math.abs(z);
                const dNorth = Math.abs(z - ROAD.north.z);
                const dSouth = Math.abs(z - ROAD.south.z);
                const nearest = Math.min(dMain, dCross, dNorth, dSouth);
                if (nearest === dMain) facing = x > 0 ? -Math.PI / 2 : Math.PI / 2;
                else if (nearest === dCross) facing = z > 0 ? Math.PI : 0;
                else if (nearest === dNorth) facing = z > ROAD.north.z ? Math.PI : 0;
                else facing = z > ROAD.south.z ? Math.PI : 0;

                const jitterX = ((s * 17 + 11) % 5 - 2.5) * 0.55;
                const jitterZ = ((s * 23 + 19) % 5 - 2.5) * 0.55;
                const yawJitter = ((s * 29 + 13) % 7 - 3.5) * 0.035;

                // Slightly taller / wider buildings for larger city feel
                const w = 9.5 + Math.abs((s * 41 + 3) % 4.5);
                const d = 9.5 + Math.abs((s * 47 + 5) % 4.0);
                const h = 8.5 + Math.abs((s * 2711 + 7) % 14);

                const px = x + jitterX;
                const pz = z + jitterZ;
                // Final safety: don't place into road after jitter
                if (this._isRoadOrPark(px, pz, 1)) { s++; continue; }

                let bld;
                if (assignedPoi) {
                    bld = this._buildThemedBuilding(w, h, d, s, assignedPoi);
                } else {
                    bld = buildJapaneseBuilding(w, h, d, s);
                }

                bld.position.set(px, 0, pz);
                bld.rotation.y = facing + yawJitter;
                this.scene.add(bld);

                this.colliders.push({ x: px, z: pz, w, d, h, floorY: 0 });
                s++;
            }
        }
    }

    _createDetailedShops() {
        const tableMat = toonMat(0x8a7a68);

        // Shops along Main Avenue edges (behind trees)
        for (let i = -1; i <= 1; i++) {
            const pot1 = createFlowerPot(i + 5);
            pot1.position.set(-14 + i * 1.3, 0, 42);
            this.scene.add(pot1);
            const pot2 = createFlowerPot(i + 8);
            pot2.position.set(14, 0, 40 + i * 1.1);
            this.scene.add(pot2);
        }

        // Tea benches near north quiet lane
        const tbl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.75, 1.0), tableMat);
        tbl.position.set(-28, 0.375, -78);
        this.scene.add(tbl);

        const bench1 = createBench();
        bench1.position.set(-30, 0, -78);
        bench1.rotation.y = Math.PI / 2;
        this.scene.add(bench1);

        const bench2 = createBench();
        bench2.position.set(-26, 0, -78);
        bench2.rotation.y = -Math.PI / 2;
        this.scene.add(bench2);

        // Dining tables south of plaza along avenue
        for (let xOff = -4; xOff <= 4; xOff += 8) {
            const diningTable = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.8, 8), tableMat);
            diningTable.position.set(18 + xOff, 0.4, 48);
            this.scene.add(diningTable);
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
                const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.45, 6), toonMat(0xcc9966));
                stool.position.set(18 + xOff + Math.cos(angle) * 1.2, 0.225, 48 + Math.sin(angle) * 1.2);
                this.scene.add(stool);
            }
        }
    }

    _buildThemedBuilding(w, h, d, seed, poi) {
        const g = new THREE.Group();
        const district = poi.district || '';

        let wallCol = 0xe5e5df;
        let accentCol = 0x90caf9;

        if (district === 'software') {
            wallCol = 0xd2e5f5;
            accentCol = 0x26c6da;
        } else if (district === 'marketing') {
            wallCol = 0xf9dfcb;
            accentCol = 0xffa726;
        } else {
            wallCol = 0xf7eec6;
            accentCol = 0xf06292;
        }

        const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallCol);
        body.mesh.position.y = h / 2;
        body.mesh.castShadow = true;
        body.mesh.receiveShadow = true;
        g.add(body.group);

        const strip = toonMesh(new THREE.BoxGeometry(w + 0.1, 0.4, d + 0.1), accentCol, { outline: false });
        strip.mesh.position.y = 3.2;
        g.add(strip.group);

        const glassMat = toonMat(accentCol, { emissive: accentCol, emissiveIntensity: 0.15 });
        const shop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 2.2, 0.1), glassMat);
        shop.position.set(0, 1.1, d / 2 + 0.02);
        shop.userData.cityLight = 'shop';
        shop.userData.litAtNight = true;
        glassMat.userData.cityLight = 'shop';
        g.add(shop);

        const frameMat = toonMat(0x1a1a1a);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.75, 0.15), frameMat);
        sign.position.set(0, h - 1.0, d / 2 + 0.05);
        g.add(sign);

        if (district === 'software') {
            const dish = toonMesh(new THREE.SphereGeometry(0.7, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x8898a8);
            dish.mesh.position.set(0, h + 0.5, 0);
            dish.mesh.rotation.x = -Math.PI / 4;
            g.add(dish.group);
            const mast = toonMesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), 0x4a4a4a);
            mast.mesh.position.set(0, h + 0.9, 0);
            g.add(mast.group);
        } else if (district === 'marketing') {
            for (let i = -1; i <= 1; i += 2) {
                const lantern = toonMesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 6), 0xff4422, {
                    emissive: 0xff4422, emissiveIntensity: 0.4,
                });
                lantern.mesh.position.set(i * (w * 0.3), 2.4, d / 2 + 0.5);
                g.add(lantern.group);
            }
        }

        return g;
    }

    _createMarketStall(seed) {
        const g = new THREE.Group();
        const woodMat = toonMat(0x8a7a68);
        const colors = [0xff5533, 0xffbb00, 0x33aa55, 0x3388ff];
        const clothMat = toonMat(colors[seed % colors.length]);

        const counter = toonMesh(new THREE.BoxGeometry(2.4, 0.9, 1.4), woodMat);
        counter.mesh.position.y = 0.45;
        counter.mesh.castShadow = true;
        g.add(counter.group);

        [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]].forEach(([px, pz]) => {
            const pillar = toonMesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), woodMat);
            pillar.mesh.position.set(px, 1.1, pz);
            g.add(pillar.group);
        });

        const canopy = toonMesh(new THREE.BoxGeometry(2.6, 0.15, 1.6), clothMat);
        canopy.mesh.position.y = 2.2;
        g.add(canopy.group);

        return g;
    }

    // ─── Street props on the few roads ──────────────────────────────────────
    _streetProps() {
        let s = 200;

        // Main Avenue lamps/signs handled by _mainAvenueProps (Shinjuku strip).
        // Side streets only here.
        const crossWalk = ROAD.cross.w / 2 + ROAD.curb + ROAD.sw * 0.7;
        const quietWalk = ROAD.south.w / 2 + ROAD.curb + ROAD.sw * 0.7;

        // Cross boulevard lamps
        for (let x = -140; x <= 140; x += 30) {
            if (Math.abs(x) < 14) continue;
            const lamp = createStreetLamp();
            lamp.position.set(x, 0, crossWalk);
            lamp.rotation.y = -Math.PI / 2;
            this.scene.add(lamp);
            s++;
        }

        // Quiet lane accents + a few market stalls on South Lane
        for (let x = -120; x <= 120; x += 22) {
            if (Math.abs(x) < 12) continue;
            const lamp = createStreetLamp();
            lamp.position.set(x, 0, ROAD.south.z + quietWalk);
            this.scene.add(lamp);

            if (s % 2 === 0 && Math.abs(x) > 25) {
                const stall = this._createMarketStall(s);
                stall.position.set(x + 4, 0, ROAD.south.z - quietWalk - 2.2);
                stall.rotation.y = Math.PI;
                this.scene.add(stall);
                this.colliders.push({
                    x: x + 4, z: ROAD.south.z - quietWalk - 2.2,
                    w: 2.5, d: 2.5, h: 2.5, floorY: 0,
                });
            }
            s++;
        }

        // North lane — quieter residential feel
        for (let x = -110; x <= 110; x += 32) {
            if (Math.abs(x) < 12) continue;
            const lamp = createStreetLamp();
            lamp.position.set(x, 0, ROAD.north.z - quietWalk);
            this.scene.add(lamp);
            if (s % 2 === 0) {
                const mail = createMailbox();
                mail.position.set(x + 3, 0, ROAD.north.z + quietWalk + 0.8);
                this.scene.add(mail);
            }
            s++;
        }

        // A few parked cars along side streets (not clogging the tree avenue)
        const carSpots = [
            [22, -40], [-24, 55], [48, 12], [-52, -12], [70, -90], [-68, 90],
        ];
        carSpots.forEach(([cx, cz], i) => {
            const car = createParkedCar(i);
            car.position.set(cx, 0, cz);
            car.rotation.y = i % 2 === 0 ? Math.PI / 2 : 0;
            this.scene.add(car);
        });
    }

    // ─── Wire network ───────────────────────────────────────────────────────
    _wireNetwork() {
        const wireMat = new THREE.LineBasicMaterial({ color: 0x18182a });
        const wire = (ax, ay, az, bx, by, bz, sag = 0.5) => {
            const pts = [];
            for (let t = 0; t <= 1; t += 0.08) {
                const x = THREE.MathUtils.lerp(ax, bx, t);
                const y = THREE.MathUtils.lerp(ay, by, t) - Math.sin(t * Math.PI) * sag;
                const z = THREE.MathUtils.lerp(az, bz, t);
                pts.push(new THREE.Vector3(x, y, z));
            }
            this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
        };

        // Light overhead wires along Main Avenue (one side)
        const poleH = 6.2;
        const wx = ROAD.main.w / 2 + ROAD.curb + ROAD.sw + 0.6;
        for (let z = -100; z <= 90; z += 18) {
            if (Math.abs(z) < 14) continue;
            wire(wx, poleH, z, wx, poleH, z + 18, 0.4);
            wire(wx, poleH - 0.9, z, wx, poleH - 0.9, z + 18, 0.32);
        }
        // Cross boulevard
        for (let x = -100; x <= 90; x += 20) {
            if (Math.abs(x) < 14) continue;
            wire(x, poleH, -wx, x + 20, poleH, -wx, 0.35);
        }
    }

    // ─── Surrounding nature ─────────────────────────────────────────────────
    _surroundingNature() {
        // Outer ring of trees — strictly outside city + clear margin (capped for FPS)
        const minDist = Math.hypot(CITY_HX, CITY_HZ) + (WORLD.cityClearMargin ?? 28) + 10;
        for (let i = 0; i < 70; i++) {
            const seed = i * 31 + 7;
            const angle = (seed * 0.618033) * Math.PI * 2;
            const dist = minDist + 15 + (seed % 95);
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            if (isCityFlat(x, z, WORLD.cityClearMargin ?? 28)) continue;
            const gy = this.getTerrainHeight(x, z);
            const tree = this._pickTree(seed);
            tree.position.set(x, gy, z);
            this.scene.add(tree);
        }

        // Soft green pockets in city blocks (street trees only — not hills)
        const pockets = [
            [-55, -45], [55, -45], [-55, 45], [55, 45],
            [-100, -45], [100, -45], [-100, 45], [100, 45],
            [-55, -115], [55, -115], [-55, 115], [55, 115],
            [-110, 0], [110, 0],
        ];
        pockets.forEach(([x, z], i) => {
            if (this._isRoadOrPark(x, z, 4)) return;
            for (let k = 0; k < 3; k++) {
                const tx = x + ((k * 7 + 3) % 5 - 2) * 2.2;
                const tz = z + ((k * 11 + 5) % 5 - 2) * 2.2;
                if (this._isRoadOrPark(tx, tz, 2)) continue;
                const tree = this._pickTree(i * 10 + k);
                tree.position.set(tx, 0, tz);
                tree.scale.setScalar(0.85 + (k % 3) * 0.1);
                this.scene.add(tree);
            }
        });

        this._backgroundHills();
    }

    _pickTree(seed) {
        const s = Math.abs(seed) % 4;
        if (s === 0) return createCherryTree(seed);
        if (s === 1) return createLargeTree(seed);
        if (s === 2) return createPineTree(seed);
        return createLargeTree(seed + 5);
    }

    _backgroundHills() {
        // Decorative silhouette hills — centers far outside city so spheres never clip slab
        const hillMat = toonMat(0x70a458);
        const hillDark = toonMat(0x568040);
        const clearX = CITY_HX + (WORLD.cityClearMargin ?? 28);
        const clearZ = CITY_HZ + (WORLD.cityClearMargin ?? 28);

        const hill = (cx, cz, rx, ry, rz, mat = hillMat) => {
            // Reject any hill that would intersect the city AABB
            const dx = Math.max(Math.abs(cx) - clearX, 0);
            const dz = Math.max(Math.abs(cz) - clearZ, 0);
            const reach = Math.hypot(rx, rz);
            if (dx * dx + dz * dz < reach * reach * 0.25) {
                // Push further out along the dominant axis
                if (Math.abs(cx) >= Math.abs(cz)) {
                    cx = Math.sign(cx || 1) * (clearX + rx + 25);
                } else {
                    cz = Math.sign(cz || 1) * (clearZ + rz + 25);
                }
            }
            const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat);
            m.scale.set(rx, ry, rz);
            // Sit on ground outside city — no upward bulge into urban area
            m.position.set(cx, ry * -0.35, cz);
            m.receiveShadow = true;
            m.castShadow = true;
            this.scene.add(m);
        };

        // North
        hill(-70, -270, 52, 16, 42);
        hill(25, -285, 65, 22, 50);
        hill(110, -265, 48, 14, 38);
        hill(-20, -255, 38, 12, 32, hillDark);
        // South
        hill(-55, 275, 54, 18, 44);
        hill(40, 290, 60, 20, 48);
        hill(115, 270, 46, 14, 36);
        // East
        hill(275, -45, 42, 18, 58);
        hill(285, 55, 46, 16, 54);
        hill(270, 145, 40, 14, 48);
        // West (past river)
        hill(-285, -40, 44, 20, 58);
        hill(-295, 55, 48, 16, 54, hillDark);
        hill(-275, 145, 40, 14, 48);
    }

    // ─── POIs ───────────────────────────────────────────────────────────────
    _pois() {
        const poiDefs = this.data.pois || this.data.buildings || [];
        // Spread POIs into the larger blocks (behind tree avenues)
        const spread = [
            [-40, -40], [40, -40], [0, -50], [-40, 40], [40, 40],
            [-80, -40], [80, -40], [-80, 40], [80, 40],
            [0, 50], [-40, -110], [40, -110], [-40, 110], [40, 110],
        ];
        poiDefs.forEach((poi, i) => {
            const [sx, sz] = spread[i % spread.length];
            const x = poi.x ?? sx;
            const z = poi.z ?? sz;
            this.pois.push({
                position: new THREE.Vector3(x, 0, z),
                type: poi.type || 'service',
                name: poi.name || 'Location',
                mapLabel: poi.shortName || poi.name?.slice(0, 8) || '',
                data: poi,
            });
        });
    }

    _createCentralTeaStall() {
        const g = new THREE.Group();
        const woodMat = toonMat(0x8a7a68);
        const counter = toonMesh(new THREE.BoxGeometry(2.8, 1.0, 1.4), woodMat);
        counter.mesh.position.y = 0.5;
        g.add(counter.group);

        const kettle = toonMesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), 0xb8c0bc);
        kettle.mesh.position.set(-0.6, 1.1, 0.2);
        g.add(kettle.group);

        for (let i = 0; i < 3; i++) {
            const cup = toonMesh(new THREE.CylinderGeometry(0.1, 0.08, 0.15, 6), 0xf8f8f0);
            cup.mesh.position.set(0.3 + i * 0.3, 1.075, 0.3);
            g.add(cup.group);
        }

        [[-1.3, -0.6], [1.3, -0.6], [-1.3, 0.6], [1.3, 0.6]].forEach(([px, pz]) => {
            const pillar = toonMesh(new THREE.BoxGeometry(0.08, 2.4, 0.08), woodMat);
            pillar.mesh.position.set(px, 1.2, pz);
            g.add(pillar.group);
        });

        const canopy = toonMesh(new THREE.BoxGeometry(3.0, 0.15, 1.6), 0xffbb33);
        canopy.mesh.position.y = 2.4;
        g.add(canopy.group);

        // Just off Main Avenue south of plaza, under the trees
        g.position.set(-12.5, 0, 28);
        this.scene.add(g);
        this.colliders.push({ x: -12.5, z: 28, w: 3.0, d: 1.8, h: 2.5, floorY: 0 });
    }

    cloudMeshes() { return this._cloudMeshes || []; }
}
