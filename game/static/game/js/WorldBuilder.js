/**
 * WorldBuilder.js — Japanese Anime Town (tree-avenue city)
 * Larger city, few main roads, dense canopy avenues like residential
 * tree-tunnel streets (buildings sit behind the trees).
 */
import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { toonMat, toonMesh, setupCityLighting, INK } from './ToonStyle.js';
import { buildJapaneseBuilding, buildJapaneseCorner, createVendingMachine } from './Buildings.js';
import {
    createStreetLamp, createBench, createFlowerPot, createMailbox,
    createBicycleParked, createCherryTree, createLargeTree, createPineTree,
    createAvenueTree, createHedge, createLowWall,
    createRoundSign, createTrafficCone, createTrashCan, createPowerPole,
    createParkedCar, createPostBox,
} from './Props.js';

// ─── Sparse road network (few roads, big blocks) ───────────────────────────
// Main Avenue   : N–S at X=0  (the photo tree-tunnel street)
// Cross Blvd    : E–W at Z=0
// North Quiet   : E–W at Z=-90
// South Quiet   : E–W at Z= 90
const ROAD = {
    main:  { x: 0,   w: 11, z1: -135, z2: 135 }, // N-S
    cross: { z: 0,   w: 10, x1: -155, x2: 155 }, // E-W
    north: { z: -90, w: 8,  x1: -145, x2: 145 },
    south: { z: 90,  w: 8,  x1: -145, x2: 145 },
    sw: 2.4, // sidewalk half-width beyond road edge
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
        this._avenueTrees();      // tree tunnels first so buildings sit behind
        this._buildingRows();
        this._streetProps();
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
        this.scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            vertexColors: true, side: THREE.BackSide,
        })));
        this.scene.fog = new THREE.Fog(0x7adede, 110, 360);
    }

    _clouds() {
        this._cloudMeshes = [];
        const cloudMat = toonMat(0xfcfcfc, { transparent: true, opacity: 0.9 });
        for (let i = 0; i < 26; i++) {
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

    _lights() { setupCityLighting(this.scene); }

    // ─── Ground (larger city slab) ──────────────────────────────────────────
    _ground() {
        const outer = new THREE.Mesh(
            new THREE.PlaneGeometry(WORLD.size, WORLD.size),
            toonMat(0x90c87a)
        );
        outer.rotation.x = -Math.PI / 2;
        outer.receiveShadow = true;
        this.scene.add(outer);

        const cityW = CITY_HX * 2;
        const cityD = CITY_HZ * 2;
        const city = new THREE.Mesh(
            new THREE.PlaneGeometry(cityW, cityD),
            toonMat(0xa8b4b0)
        );
        city.rotation.x = -Math.PI / 2;
        city.position.y = 0.02;
        city.receiveShadow = true;
        this.scene.add(city);

        const curb = toonMesh(new THREE.BoxGeometry(cityW, 0.12, cityD), 0xb8c0bc, { outline: false });
        curb.mesh.position.y = 0.1;
        this.scene.add(curb.group);

        // River along far west edge of the expanded city
        const riverGeo = new THREE.PlaneGeometry(22, cityD + 20);
        const riverMat = toonMat(0x7ac4d0, { transparent: true, opacity: 0.85 });
        const river = new THREE.Mesh(riverGeo, riverMat);
        river.rotation.x = -Math.PI / 2;
        river.position.set(WORLD.riverX, 0.03, 0);
        this.scene.add(river);
    }

    // Keep clear of roads, tree buffer, small central plaza, river
    _isRoadOrPark(x, z, pad = 0) {
        // Central plaza (small green at crossroads)
        if (Math.hypot(x, z) < 16 + pad) return true;

        // Main Avenue N-S
        if (Math.abs(x - ROAD.main.x) < ROAD.main.w / 2 + ROAD.sw + 3.5 + pad
            && z >= ROAD.main.z1 - pad && z <= ROAD.main.z2 + pad) return true;

        // Cross Boulevard E-W
        if (Math.abs(z - ROAD.cross.z) < ROAD.cross.w / 2 + ROAD.sw + 3.5 + pad
            && x >= ROAD.cross.x1 - pad && x <= ROAD.cross.x2 + pad) return true;

        // North / South quiet lanes
        if (Math.abs(z - ROAD.north.z) < ROAD.north.w / 2 + ROAD.sw + 3 + pad
            && x >= ROAD.north.x1 - pad && x <= ROAD.north.x2 + pad) return true;
        if (Math.abs(z - ROAD.south.z) < ROAD.south.w / 2 + ROAD.sw + 3 + pad
            && x >= ROAD.south.x1 - pad && x <= ROAD.south.x2 + pad) return true;

        // River
        if (x < WORLD.riverX + 14) return true;

        return false;
    }

    _getAssignedBuilding(x, z) {
        const buildings = this.data.buildings || [];
        return buildings.find(b => Math.hypot(b.x - x, b.z - z) < 10.0);
    }

    // ─── Road Network (few roads only) ──────────────────────────────────────
    _roadNetwork() {
        const roadMat = toonMat(0x6a747c); // slightly darker asphalt like the photo
        const sideMat = toonMat(0xb8c0b8);

        const strip = (x, z, w, d, mat = roadMat, y = 0.05) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, y, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };

        // Sidewalks under roads (slightly wider, lighter)
        const mainLen = ROAD.main.z2 - ROAD.main.z1;
        const crossLen = ROAD.cross.x2 - ROAD.cross.x1;
        strip(0, 0, ROAD.main.w + ROAD.sw * 2, mainLen + 4, sideMat, 0.035);
        strip(0, 0, crossLen + 4, ROAD.cross.w + ROAD.sw * 2, sideMat, 0.035);
        strip(0, ROAD.north.z, crossLen - 10, ROAD.north.w + ROAD.sw * 2, sideMat, 0.035);
        strip(0, ROAD.south.z, crossLen - 10, ROAD.south.w + ROAD.sw * 2, sideMat, 0.035);

        // Asphalt
        strip(ROAD.main.x, 0, ROAD.main.w, mainLen);
        strip(0, ROAD.cross.z, crossLen, ROAD.cross.w);
        strip(0, ROAD.north.z, ROAD.north.x2 - ROAD.north.x1, ROAD.north.w);
        strip(0, ROAD.south.z, ROAD.south.x2 - ROAD.south.x1, ROAD.south.w);

        // Soft center-line dashes on Main Avenue
        const dashMat = toonMat(0xd8d8d0, { transparent: true, opacity: 0.55 });
        for (let z = -120; z <= 120; z += 8) {
            if (Math.abs(z) < 12) continue; // skip plaza
            const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 3.2), dashMat);
            dash.rotation.x = -Math.PI / 2;
            dash.position.set(0, 0.06, z);
            this.scene.add(dash);
        }

        this._buildCentralPlaza();
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
        const nsAvenue = (roadX, z1, z2, halfW, spacing = 7.2) => {
            const treeX = halfW / 2 + 1.35; // just off curb
            const hedgeX = halfW / 2 + 0.55;
            const wallX = halfW / 2 + 4.2;
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
            const treeZ = halfW / 2 + 1.35;
            const hedgeZ = halfW / 2 + 0.55;
            const wallZ = halfW / 2 + 4.2;
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

        // Signature tree-tunnel: Main Avenue (photo look)
        nsAvenue(ROAD.main.x, ROAD.main.z1 + 6, ROAD.main.z2 - 6, ROAD.main.w, 6.8);

        // Cross boulevard trees (slightly wider spacing)
        ewAvenue(ROAD.cross.z, ROAD.cross.x1 + 8, ROAD.cross.x2 - 8, ROAD.cross.w, 7.4);

        // Quiet residential lanes — still tree-lined, a bit airier
        ewAvenue(ROAD.north.z, ROAD.north.x1 + 10, ROAD.north.x2 - 10, ROAD.north.w, 8.2);
        ewAvenue(ROAD.south.z, ROAD.south.x1 + 10, ROAD.south.x2 - 10, ROAD.south.w, 8.2);
    }

    // ─── Crosswalks ─────────────────────────────────────────────────────────
    _crosswalks() {
        const white = toonMat(0xf8f8f4, { transparent: true, opacity: 0.85 });
        const cw = (cx, cz, axis = 'x') => {
            for (let s = -2; s <= 2; s++) {
                const m = new THREE.Mesh(
                    new THREE.PlaneGeometry(axis === 'x' ? 1.15 : 5.2, axis === 'x' ? 5.2 : 1.15),
                    white
                );
                m.rotation.x = -Math.PI / 2;
                if (axis === 'x') m.position.set(cx + s * 1.7, 0.08, cz);
                else m.position.set(cx, 0.08, cz + s * 1.7);
                this.scene.add(m);
            }
        };

        // Main × Cross
        cw(0, 9, 'x');
        cw(0, -9, 'x');
        cw(9, 0, 'z');
        cw(-9, 0, 'z');
        // Main × North / South quiet lanes
        cw(0, ROAD.north.z, 'x');
        cw(0, ROAD.south.z, 'x');
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

                // Extra setback from main avenue so trees read in front of façades
                if (Math.abs(x) < 17 && Math.abs(z) > 16) continue;
                // Setback from E-W roads
                if (Math.abs(z) < 16 && Math.abs(x) > 16) continue;
                if (Math.abs(z - ROAD.north.z) < 14) continue;
                if (Math.abs(z - ROAD.south.z) < 14) continue;

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

        const glassMat = toonMat(accentCol, { emissive: accentCol, emissiveIntensity: 0.35 });
        const shop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 2.2, 0.1), glassMat);
        shop.position.set(0, 1.1, d / 2 + 0.02);
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

        // Main Avenue lamps (between trees, not cluttering)
        for (let z = -120; z <= 120; z += 28) {
            if (Math.abs(z) < 16) continue;
            const lampL = createStreetLamp();
            lampL.position.set(-ROAD.main.w / 2 - 0.9, 0, z);
            this.scene.add(lampL);
            const lampR = createStreetLamp();
            lampR.position.set(ROAD.main.w / 2 + 0.9, 0, z + 14);
            lampR.rotation.y = Math.PI;
            this.scene.add(lampR);

            if (s % 3 === 0) {
                const vm = createVendingMachine(s);
                vm.position.set(ROAD.main.w / 2 + 2.2, 0, z + 6);
                this.scene.add(vm);
            }
            if (s % 4 === 0) {
                const bike = createBicycleParked();
                bike.position.set(-ROAD.main.w / 2 - 2.0, 0, z + 4);
                this.scene.add(bike);
            }
            if (s % 5 === 0) {
                const pb = createPostBox();
                pb.position.set(-ROAD.main.w / 2 - 2.4, 0, z + 10);
                this.scene.add(pb);
            }
            s++;
        }

        // Cross boulevard lamps
        for (let x = -140; x <= 140; x += 30) {
            if (Math.abs(x) < 14) continue;
            const lamp = createStreetLamp();
            lamp.position.set(x, 0, ROAD.cross.w / 2 + 0.9);
            lamp.rotation.y = -Math.PI / 2;
            this.scene.add(lamp);
            s++;
        }

        // Quiet lane accents + a few market stalls on South Lane
        for (let x = -120; x <= 120; x += 22) {
            if (Math.abs(x) < 12) continue;
            const lamp = createStreetLamp();
            lamp.position.set(x, 0, ROAD.south.z + ROAD.south.w / 2 + 0.8);
            this.scene.add(lamp);

            if (s % 2 === 0 && Math.abs(x) > 25) {
                const stall = this._createMarketStall(s);
                stall.position.set(x + 4, 0, ROAD.south.z - ROAD.south.w / 2 - 3.5);
                stall.rotation.y = Math.PI;
                this.scene.add(stall);
                this.colliders.push({ x: x + 4, z: ROAD.south.z - ROAD.south.w / 2 - 3.5, w: 2.5, d: 2.5, h: 2.5, floorY: 0 });
            }
            s++;
        }

        // North lane — quieter residential feel
        for (let x = -110; x <= 110; x += 32) {
            if (Math.abs(x) < 12) continue;
            const lamp = createStreetLamp();
            lamp.position.set(x, 0, ROAD.north.z - ROAD.north.w / 2 - 0.8);
            this.scene.add(lamp);
            if (s % 2 === 0) {
                const mail = createMailbox();
                mail.position.set(x + 3, 0, ROAD.north.z + ROAD.north.w / 2 + 2.5);
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
        const wx = ROAD.main.w / 2 + 2.8;
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
        // Outer ring of trees past the larger city edge
        for (let i = 0; i < 140; i++) {
            const seed = i * 31 + 7;
            const angle = (seed * 0.618033) * Math.PI * 2;
            const dist = 175 + (seed % 90);
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const gy = this.getTerrainHeight(x, z);
            const tree = this._pickTree(seed);
            tree.position.set(x, gy, z);
            this.scene.add(tree);
        }

        // Soft green pockets in large blocks (not on roads)
        const pockets = [
            [-55, -45], [55, -45], [-55, 45], [55, 45],
            [-100, -45], [100, -45], [-100, 45], [100, 45],
            [-55, -115], [55, -115], [-55, 115], [55, 115],
            [-110, 0], [110, 0],
        ];
        pockets.forEach(([x, z], i) => {
            if (this._isRoadOrPark(x, z, 4)) return;
            for (let k = 0; k < 3; k++) {
                const tree = this._pickTree(i * 10 + k);
                tree.position.set(
                    x + ((k * 7 + 3) % 5 - 2) * 2.2,
                    0,
                    z + ((k * 11 + 5) % 5 - 2) * 2.2
                );
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
        const hillMat = toonMat(0x70a458);
        const hillDark = toonMat(0x568040);

        const hill = (cx, cz, rx, ry, rz, mat = hillMat) => {
            const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), mat);
            m.scale.set(rx, ry, rz);
            m.position.set(cx, ry * -0.3, cz);
            m.receiveShadow = true;
            m.castShadow = true;
            this.scene.add(m);
        };

        hill(-55, -195, 48, 14, 38);
        hill(15, -200, 60, 20, 46);
        hill(85, -188, 44, 12, 34);
        hill(-15, -190, 35, 10, 28, hillDark);
        hill(-45, 198, 50, 16, 40);
        hill(28, 208, 58, 18, 44);
        hill(95, 192, 42, 13, 32);
        hill(195, -35, 36, 16, 55);
        hill(188, 42, 40, 13, 50);
        hill(-192, -28, 38, 18, 54);
        hill(-185, 48, 42, 13, 50, hillDark);
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
