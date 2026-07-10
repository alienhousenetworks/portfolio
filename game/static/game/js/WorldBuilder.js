/**
 * WorldBuilder.js — Japanese Anime Town
 * One compact city, nature surroundings.
 * Inspired by messenger.abeto.co street aesthetic.
 */
import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { toonMat, toonMesh, setupCityLighting, INK } from './ToonStyle.js';
import { buildJapaneseBuilding, buildJapaneseCorner } from './Buildings.js';
import {
    createStreetLamp, createBench, createFlowerPot, createMailbox,
    createBicycleParked, createCherryTree, createLargeTree, createPineTree,
    createRoundSign, createTrafficCone, createTrashCan, createPowerPole,
    createParkedCar, createPostBox, createVendingMachine,
} from './Props.js';

// ─── City layout constants ─────────────────────────────────────────────────
// Main road at Z=0 (E-W), width 9
// North road at Z=-32, width 7
// South road at Z=32, width 7
// West road at X=-38, width 7
// East road at X=38, width 7
// Short alley at X=0 connecting N/S roads, width 5

const ROAD = {
    main: { z: 0, w: 9 },
    north: { z: -32, w: 7 },
    south: { z: 32, w: 7 },
    west: { x: -38, w: 7 },
    east: { x: 38, w: 7 },
    alley: { x: 0, w: 5, z1: -32, z2: 32 },
    sw: 2.2,  // sidewalk width
};

// Building row centerlines (where building centers are placed)
// Calculated as road_edge + sidewalk + half_building_depth
// We use depth=9 for main rows, depth=8 for inner rows
const BLD_Z_SOUTH_MAIN = -(ROAD.main.w / 2 + ROAD.sw + 4.5);   // ≈ -11.2
const BLD_Z_NORTH_MAIN = +(ROAD.main.w / 2 + ROAD.sw + 4.5);   // ≈ +11.2
const BLD_Z_NORTH_NROAD = -(ROAD.north.z * -1 + ROAD.north.w / 2 + ROAD.sw + 5);  // ≈ -42.5
const BLD_Z_SOUTH_NROAD = -(ROAD.north.z * -1 - ROAD.north.w / 2 - ROAD.sw - 4);  // ≈ -22
const BLD_Z_NORTH_SROAD = +(ROAD.south.z - ROAD.south.w / 2 - ROAD.sw - 4);  // ≈ +22
const BLD_Z_SOUTH_SROAD = +(ROAD.south.z + ROAD.south.w / 2 + ROAD.sw + 5);  // ≈ +42.5

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
        this._buildingRows();
        this._streetProps();
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
        };
    }

    getTerrainHeight(x, z) {
        return this.terrain ? this.terrain.getHeightAt(x, z) : WORLD.groundY;
    }

    // Stubs for backward-compat (main.js may reference these on terrain)
    _inPark() { return false; }
    _inRiver(x, z, margin = 0) { return false; }
    _markSite(x, z, w = 16, d = 16, h = 0) {
        this.colliders.push({ x, z, w, d, h, floorY: this.getTerrainHeight(x, z) });
    }

    // ─── Sky ────────────────────────────────────────────────────────────────
    _skyDome() {
        // Vibrant teal anime sky like abeto.co
        const geo = new THREE.SphereGeometry(560, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
        const cols = [];
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const t = Math.max(0, Math.min(1, pos.getY(i) / 560));
            // horizon: bright teal; zenith: slightly deeper
            const r = THREE.MathUtils.lerp(0.36, 0.12, t);
            const g = THREE.MathUtils.lerp(0.88, 0.62, t);
            const b = THREE.MathUtils.lerp(0.84, 0.62, t);
            cols.push(r, g, b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        this.scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            vertexColors: true, side: THREE.BackSide,
        })));
        this.scene.fog = new THREE.Fog(0x7adede, 95, 310);
    }

    // ─── Clouds ─────────────────────────────────────────────────────────────
    _clouds() {
        this._cloudMeshes = [];
        const cloudMat = toonMat(0xfcfcfc, { transparent: true, opacity: 0.9 });
        for (let i = 0; i < 22; i++) {
            const g = new THREE.Group();
            const seed = i * 19 + 5;
            const cx = ((seed * 53 + 17) % 480) - 240;
            const cz = ((seed * 71 + 23) % 480) - 240;
            const cy = 48 + (seed % 24);  // Low clouds — anime style
            const puffs = 3 + (seed % 4);
            for (let p = 0; p < puffs; p++) {
                const r = 9 + (seed + p) % 13;
                const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), cloudMat);
                puff.scale.set(1.8, 0.38, 1.0);  // Very flat watercolor blobs
                puff.position.set(p * r * 0.78, (p % 2) * 1.4, (p * 4 % 11) - 5);
                g.add(puff);
            }
            g.position.set(cx, cy, cz);
            this.scene.add(g);
            this._cloudMeshes.push({ g, speed: 0.65 + (seed % 8) * 0.08, dir: seed % 2 === 0 ? 1 : -1 });
        }
    }

    _lights() { setupCityLighting(this.scene); }

    // ─── Ground ─────────────────────────────────────────────────────────────
    _ground() {
        // Outer grass (warm green for anime warmth)
        const outer = new THREE.Mesh(
            Object.assign(new THREE.PlaneGeometry(WORLD.size, WORLD.size), { rotateX: true }),
            toonMat(0x90c87a)
        );
        outer.rotation.x = -Math.PI / 2;
        outer.receiveShadow = true;
        this.scene.add(outer);

        // City concrete base slab (light teal-grey, like the abeto.co streets)
        const city = new THREE.Mesh(
            new THREE.PlaneGeometry(170, 148),
            toonMat(0xa8b4b0)
        );
        city.rotation.x = -Math.PI / 2;
        city.position.y = 0.02;
        city.receiveShadow = true;
        this.scene.add(city);

        // Slight curb bump at city edge (visual border between grass and city)
        const curb = toonMesh(new THREE.BoxGeometry(170, 0.12, 148), 0xb8c0bc, { outline: false });
        curb.mesh.position.y = 0.1;
        this.scene.add(curb.group);
    }

    // ─── Road Network ────────────────────────────────────────────────────────
    _roadNetwork() {
        const roadMat = toonMat(0x748088);
        const swMat = toonMat(0xbcc4c0);

        const road = (x, z, w, d) => {
            const m = new THREE.Mesh(
                Object.assign(new THREE.PlaneGeometry(w, d), { }),
                roadMat
            );
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, 0.05, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };
        const sw = (x, z, w, d) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), swMat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, 0.07, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };

        // Main E-W road (wider)
        road(0, 0, 162, 9);
        sw(0, -6.2, 162, 2.4);
        sw(0, +6.2, 162, 2.4);

        // North E-W road
        road(0, -32, 118, 7);
        sw(0, -32 - 5.2, 118, 2.2);
        sw(0, -32 + 5.2, 118, 2.2);

        // South E-W road
        road(0, +32, 118, 7);
        sw(0, +32 - 5.2, 118, 2.2);
        sw(0, +32 + 5.2, 118, 2.2);

        // West N-S road
        road(-38, 0, 7, 72);
        sw(-38 - 5.2, 0, 2.2, 72);
        sw(-38 + 5.2, 0, 2.2, 72);

        // East N-S road
        road(+38, 0, 7, 72);
        sw(+38 - 5.2, 0, 2.2, 72);
        sw(+38 + 5.2, 0, 2.2, 72);

        // Center alley (N-S, from north road to south road)
        road(0, 0, 5.5, 60);
        sw(-3.8, 0, 1.8, 60);
        sw(+3.8, 0, 1.8, 60);
    }

    // ─── Crosswalks & Lane Markings ──────────────────────────────────────────
    _crosswalks() {
        const white = toonMat(0xf8f8f4, { transparent: true, opacity: 0.85 });
        const yellow = toonMat(0xeec820, { transparent: true, opacity: 0.72 });

        // Lane center dashes for main road
        for (let i = -8; i <= 8; i++) {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.24), yellow);
            m.rotation.x = -Math.PI / 2;
            m.position.set(i * 9.2, 0.08, 0);
            this.scene.add(m);
        }
        // N and S roads
        for (let i = -6; i <= 6; i++) {
            [-32, 32].forEach(rz => {
                const m = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.2), yellow);
                m.rotation.x = -Math.PI / 2;
                m.position.set(i * 8.8, 0.08, rz);
                this.scene.add(m);
            });
        }

        // Crosswalk helper
        const cw = (cx, cz, isEW) => {
            for (let s = -3; s <= 3; s++) {
                const m = new THREE.Mesh(
                    new THREE.PlaneGeometry(isEW ? 1.5 : 7.5, isEW ? 7.5 : 1.5),
                    white
                );
                m.rotation.x = -Math.PI / 2;
                m.position.set(
                    isEW ? cx + s * 2.2 : cx,
                    0.09,
                    isEW ? cz : cz + s * 2.2
                );
                this.scene.add(m);
            }
        };

        // All intersections
        cw(-38, 0, false);
        cw(+38, 0, false);
        cw(0, 0, false);
        cw(-38, -32, true);
        cw(+38, -32, true);
        cw(0, -32, true);
        cw(-38, +32, true);
        cw(+38, +32, true);
        cw(0, +32, true);
    }

    // ─── Building Rows ───────────────────────────────────────────────────────
    _buildingRows() {
        // rowX: buildings lined up along the X axis at constant z
        // facingAngle: 0 = faces +Z (north), Math.PI = faces -Z (south)
        const rowX = (x1, x2, zCenter, depth, facingAngle, seedOff) => {
            let x = x1;
            let s = seedOff;
            while (x + 5 < x2) {
                const w = 7 + Math.abs((s * 1337 + 11) % 11);  // 7-17
                const h = 5.5 + Math.abs((s * 2711 + 7) % 13);  // 5.5-17.5
                const d = depth;
                const cx = x + w / 2;
                if (cx + w / 2 > x2) break;
                const bld = buildJapaneseBuilding(w, h, d, s);
                bld.position.set(cx, 0, zCenter);
                bld.rotation.y = facingAngle;
                this.scene.add(bld);
                this.colliders.push({ x: cx, z: zCenter, w, d, h, floorY: 0 });
                x += w + 0.45;
                s++;
            }
        };

        // rowZ: buildings along Z axis at constant x
        const rowZ = (z1, z2, xCenter, depth, facingAngle, seedOff) => {
            let z = z1;
            let s = seedOff;
            while (z + 5 < z2) {
                const w = 7 + Math.abs((s * 1337 + 11) % 11);
                const h = 5.5 + Math.abs((s * 2711 + 7) % 13);
                const d = depth;
                const cz = z + w / 2;
                if (cz + w / 2 > z2) break;
                const bld = buildJapaneseBuilding(w, h, d, s);
                bld.position.set(xCenter, 0, cz);
                bld.rotation.y = facingAngle;
                this.scene.add(bld);
                this.colliders.push({ x: xCenter, z: cz, w: d, d: w, h, floorY: 0 });
                z += w + 0.45;
                s++;
            }
        };

        // ── MAIN ROAD (Z=0) ──────────────────────────────────────────────────
        // South side (buildings at z≈-11.5, facing +Z = north)
        rowX(-78, -41, -11.5, 9, 0, 0);
        rowX(-34.5, -2.5, -11.5, 9, 0, 12);
        rowX(2.5, 35, -11.5, 9, 0, 24);
        rowX(41, 78, -11.5, 9, 0, 36);
        // North side (buildings at z≈+11.5, facing -Z = south)
        rowX(-78, -41, +11.5, 9, Math.PI, 48);
        rowX(-34.5, -2.5, +11.5, 9, Math.PI, 60);
        rowX(2.5, 35, +11.5, 9, Math.PI, 72);
        rowX(41, 78, +11.5, 9, Math.PI, 84);

        // ── NORTH ROAD (Z=-32) ────────────────────────────────────────────────
        // Between main and north road — south side of north road: z≈-22, facing south
        rowX(-37, -2.5, -22, 8, Math.PI, 96);
        rowX(2.5, 37, -22, 8, Math.PI, 108);
        // North side of north road: z≈-43, facing north
        rowX(-72, -41, -43, 10, 0, 120);
        rowX(-34.5, -2.5, -43, 10, 0, 132);
        rowX(2.5, 35, -43, 10, 0, 144);
        rowX(41, 72, -43, 10, 0, 156);

        // ── SOUTH ROAD (Z=32) ─────────────────────────────────────────────────
        // North side of south road: z≈+22, facing north
        rowX(-37, -2.5, +22, 8, 0, 168);
        rowX(2.5, 37, +22, 8, 0, 180);
        // South side of south road: z≈+43, facing south
        rowX(-72, -41, +43, 10, Math.PI, 192);
        rowX(-34.5, -2.5, +43, 10, Math.PI, 204);
        rowX(2.5, 35, +43, 10, Math.PI, 216);
        rowX(41, 72, +43, 10, Math.PI, 228);

        // ── WEST ROAD (X=-38) ─────────────────────────────────────────────────
        // East side of west road (x≈-29.5, facing west = -X)
        rowZ(-31, -2.5, -29.5, 8, -Math.PI / 2, 240);
        rowZ(2.5, 31, -29.5, 8, -Math.PI / 2, 252);
        // West side of west road (x≈-48, facing east = +X)
        rowZ(-43, -2.5, -48, 10, Math.PI / 2, 264);
        rowZ(2.5, 43, -48, 10, Math.PI / 2, 276);

        // ── EAST ROAD (X=38) ──────────────────────────────────────────────────
        // West side of east road (x≈+29.5, facing east = +X)
        rowZ(-31, -2.5, +29.5, 8, Math.PI / 2, 288);
        rowZ(2.5, 31, +29.5, 8, Math.PI / 2, 300);
        // East side of east road (x≈+48, facing west = -X)
        rowZ(-43, -2.5, +48, 10, -Math.PI / 2, 312);
        rowZ(2.5, 43, +48, 10, -Math.PI / 2, 324);

        // ── Corner buildings at key intersections ─────────────────────────────
        const cornerSpots = [
            [-38, -32], [0, -32], [38, -32],
            [-38, 0], [38, 0],
            [-38, 32], [0, 32], [38, 32],
        ];
        cornerSpots.forEach(([cx, cz], i) => {
            const b = buildJapaneseCorner(i * 37 + 5);
            b.position.set(cx + (i % 2 === 0 ? -5 : 5), 0, cz + (i < 4 ? -5 : 5));
            b.rotation.y = (i * Math.PI / 4);
            this.scene.add(b);
            this.colliders.push({ x: cx, z: cz, w: 14, d: 14, h: 10, floorY: 0 });
        });
    }

    // ─── Street Props ─────────────────────────────────────────────────────────
    _streetProps() {
        // Power poles along main road north sidewalk (every 13 units)
        for (let x = -72; x <= 72; x += 13) {
            const p = createPowerPole(Math.round(x));
            p.position.set(x, 0, 7.5);
            this.scene.add(p);
        }
        // Power poles along west road
        for (let z = -38; z <= 38; z += 12) {
            const p = createPowerPole(Math.round(z) + 100);
            p.rotation.y = Math.PI / 2;
            p.position.set(-33, 0, z);
            this.scene.add(p);
        }
        // Power poles along east road
        for (let z = -38; z <= 38; z += 12) {
            const p = createPowerPole(Math.round(z) + 200);
            p.rotation.y = Math.PI / 2;
            p.position.set(33, 0, z);
            this.scene.add(p);
        }
        // North road poles
        for (let x = -60; x <= 60; x += 14) {
            const p = createPowerPole(Math.round(x) + 300);
            p.position.set(x, 0, -37.5);
            this.scene.add(p);
        }

        // ── Vending machines ──────────────────────────────────────────────
        const vmSpots = [
            // Main road south sidewalk
            [-68, -8.5], [-54, -8.5], [-32, -8.5], [-10, -8.5],
            [12, -8.5], [36, -8.5], [58, -8.5], [72, -8.5],
            // Main road north sidewalk
            [-65, 8.5], [-44, 8.5], [-20, 8.5], [5, 8.5],
            [28, 8.5], [52, 8.5], [70, 8.5],
            // North road
            [-55, -36.5], [-28, -36.5], [10, -36.5], [42, -36.5],
            // South road
            [-50, 36.5], [-22, 36.5], [15, 36.5], [44, 36.5],
        ];
        vmSpots.forEach(([x, z], i) => {
            const vm = createVendingMachine(i);
            vm.position.set(x, 0, z);
            vm.rotation.y = z < 0 ? Math.PI : 0;
            this.scene.add(vm);
        });

        // ── Street lamps ──────────────────────────────────────────────────
        for (let x = -76; x <= 76; x += 20) {
            const lamp = createStreetLamp();
            lamp.position.set(x, 0, -6.8);
            this.scene.add(lamp);
            const lamp2 = createStreetLamp();
            lamp2.position.set(x + 10, 0, 6.8);
            this.scene.add(lamp2);
        }
        for (let x = -60; x <= 60; x += 22) {
            const la = createStreetLamp();
            la.position.set(x, 0, -36.8);
            this.scene.add(la);
            const lb = createStreetLamp();
            lb.position.set(x + 11, 0, 36.8);
            this.scene.add(lb);
        }

        // ── Round signs ───────────────────────────────────────────────────
        const signSpots = [
            [-38, -7.5, 0], [38, -7.5, 0], [0, -7.5, 0],
            [-38, 7.5, Math.PI], [38, 7.5, Math.PI],
            [-38, -36.5, 0], [38, -36.5, 0],
            [-38, 36.5, Math.PI], [38, 36.5, Math.PI],
        ];
        signSpots.forEach(([x, z, ry], i) => {
            const s = createRoundSign(i);
            s.position.set(x + 1.5, 0, z);
            s.rotation.y = ry;
            this.scene.add(s);
        });

        // ── Traffic cones (clustered at intersections) ─────────────────────
        const coneGroups = [
            [-38, -5], [38, -5], [0, -5],
            [-38, 5], [38, 5],
            [-38, -30], [38, -30],
            [-38, 30], [38, 30],
        ];
        coneGroups.forEach(([cx, cz], i) => {
            for (let c = 0; c < 2; c++) {
                const cone = createTrafficCone(i * 3 + c);
                const off = c * 1.8;
                cone.position.set(cx + off, 0, cz + (c === 0 ? 0.5 : -0.5));
                this.scene.add(cone);
            }
        });

        // ── Trash cans ────────────────────────────────────────────────────
        const trashSpots = [
            [-70, -7], [-45, -7], [-18, -7], [20, -7], [48, -7], [72, -7],
            [-70, 7.2], [-42, 7.2], [18, 7.2], [50, 7.2], [72, 7.2],
            [-60, -36], [-25, -36], [20, -36], [55, -36],
        ];
        trashSpots.forEach(([x, z], i) => {
            const t = createTrashCan(i);
            t.position.set(x, 0, z);
            this.scene.add(t);
        });

        // ── Benches ───────────────────────────────────────────────────────
        const benchSpots = [
            [-58, -7.5, 0], [-20, -7.5, 0], [22, -7.5, 0], [62, -7.5, 0],
            [-58, 7.5, Math.PI], [-20, 7.5, Math.PI], [22, 7.5, Math.PI],
        ];
        benchSpots.forEach(([x, z, ry]) => {
            const b = createBench();
            b.position.set(x, 0, z);
            b.rotation.y = ry;
            this.scene.add(b);
        });

        // ── Post boxes ────────────────────────────────────────────────────
        [[-55, 8], [15, 8], [-15, -8], [55, -8]].forEach(([x, z]) => {
            const pb = createPostBox();
            pb.position.set(x, 0, z);
            this.scene.add(pb);
        });

        // ── Parked cars ───────────────────────────────────────────────────
        const carSpots = [
            // Parked on side of main road (south)
            [-62, -14, 0], [-48, -14, 0], [24, -14, 0], [58, -14, 0],
            // Parked on north road
            [-52, -38, 0], [-20, -38, 0], [30, -38, 0],
            // Parked on south road
            [-48, 38, 0], [15, 38, 0], [50, 38, 0],
        ];
        carSpots.forEach(([x, z, ry], i) => {
            const car = createParkedCar(i);
            car.position.set(x, 0, z);
            car.rotation.y = ry + (z < 0 ? 0 : Math.PI);
            this.scene.add(car);
            this.colliders.push({ x, z, w: 4.2, d: 2.2, h: 1.5, floorY: 0 });
        });

        // ── Bicycles ─────────────────────────────────────────────────────
        [[-40, -7.5], [10, -7.5], [-10, 7.5], [40, 7.5]].forEach(([x, z], i) => {
            const b = createBicycleParked();
            b.position.set(x, 0, z);
            this.scene.add(b);
        });

        // ── Flower pots on sidewalks ──────────────────────────────────────
        [[-55, 8.5], [-30, 8.5], [5, 8.5], [35, 8.5], [60, 8.5],
         [-55, -8.5], [5, -8.5], [55, -8.5]].forEach(([x, z], i) => {
            const fp = createFlowerPot(i);
            fp.position.set(x, 0, z);
            this.scene.add(fp);
        });
    }

    // ─── Wire network ─────────────────────────────────────────────────────────
    _wireNetwork() {
        const wireMat = new THREE.LineBasicMaterial({ color: 0x18182a });

        // Catenary wire helper
        const wire = (ax, ay, az, bx, by, bz, sag = 0.5) => {
            const pts = [];
            for (let t = 0; t <= 1; t += 0.06) {
                const x = THREE.MathUtils.lerp(ax, bx, t);
                const y = THREE.MathUtils.lerp(ay, by, t) - Math.sin(t * Math.PI) * sag;
                const z = THREE.MathUtils.lerp(az, bz, t);
                pts.push(new THREE.Vector3(x, y, z));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            this.scene.add(new THREE.Line(geo, wireMat));
        };

        // Main road north-side poles: Z=7.5, H≈6
        const poleH = 6.0;
        for (let x = -72; x <= 59; x += 13) {
            wire(x, poleH - 0.6, 7.5, x + 13, poleH - 0.6, 7.5, 0.35);
            wire(x, poleH - 1.6, 7.5, x + 13, poleH - 1.6, 7.5, 0.28);
        }
        // West road poles: X=-33
        for (let z = -38; z <= 26; z += 12) {
            wire(-33, poleH - 0.6, z, -33, poleH - 0.6, z + 12, 0.3);
        }
        // Cross-street wires (connecting N and main road poles)
        wire(-38, poleH - 0.7, 7.5, -38, poleH - 0.7, -37.5, 0.6);
        wire(38, poleH - 0.7, 7.5, 38, poleH - 0.7, -37.5, 0.6);
    }

    // ─── Surrounding Nature ────────────────────────────────────────────────────
    _surroundingNature() {
        // Trees scattered outside city
        for (let i = 0; i < 90; i++) {
            const seed = i * 31 + 7;
            const angle = (seed * 0.618033) * Math.PI * 2;
            const dist = 88 + (seed % 65);
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const gy = this.getTerrainHeight(x, z);
            const tree = this._pickTree(seed);
            tree.position.set(x, gy, z);
            this.scene.add(tree);
        }

        // Trees within city (at intersections, corners, small pockets)
        const cityTrees = [
            [-44, -36, 0], [44, -36, 1], [-44, 36, 2], [44, 36, 3],
            [-6, -38, 4], [6, -38, 5], [-6, 38, 6], [6, 38, 7],
            [-58, -15, 8], [58, -15, 9], [-58, 15, 10], [58, 15, 11],
            [-44, 0, 12], [44, 0, 13],
            [-20, -38, 14], [20, -38, 15], [-20, 38, 16], [20, 38, 17],
        ];
        cityTrees.forEach(([x, z, seed]) => {
            const tree = this._pickTree(seed);
            tree.position.set(x, this.getTerrainHeight(x, z), z);
            this.scene.add(tree);
        });

        // Low hills at far distance (silhouette behind city)
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
        const hillMat = toonMat(0x70a458);
        const hillDark = toonMat(0x568040);

        const hill = (cx, cz, rx, ry, rz, mat = hillMat) => {
            const geo = new THREE.SphereGeometry(1, 14, 10);
            const m = new THREE.Mesh(geo, mat);
            m.scale.set(rx, ry, rz);
            m.position.set(cx, ry * -0.3, cz);
            m.receiveShadow = true;
            m.castShadow = true;
            this.scene.add(m);
        };

        // N hills
        hill(-55, -130, 48, 14, 38);
        hill(15, -140, 60, 20, 46);
        hill(85, -118, 44, 12, 34);
        hill(-15, -120, 35, 10, 28, hillDark);
        // S hills
        hill(-45, 128, 50, 16, 40);
        hill(28, 138, 58, 18, 44);
        hill(95, 122, 42, 13, 32);
        // E hills
        hill(135, -35, 36, 16, 55);
        hill(128, 42, 40, 13, 50);
        // W hills
        hill(-132, -28, 38, 18, 54);
        hill(-125, 48, 42, 13, 50, hillDark);
    }

    // ─── POIs ──────────────────────────────────────────────────────────────────
    _pois() {
        const poiDefs = this.data.pois || this.data.buildings || [];
        const spread = [
            [-18, -18], [18, -18], [0, 0], [-18, 18], [18, 18],
            [-38, 0], [38, 0], [0, -32], [0, 32],
            [-25, -40], [25, -40], [-25, 40], [25, 40],
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

    // ─── Back-compat stubs (main.js calls these directly sometimes) ─────────────
    cloudMeshes() { return this._cloudMeshes || []; }
}