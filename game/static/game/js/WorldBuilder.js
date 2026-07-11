/**
 * WorldBuilder.js — Japanese Anime Town (tree-avenue city)
 * Larger city, few main roads, dense canopy avenues like residential
 * tree-tunnel streets (buildings sit behind the trees).
 */
import * as THREE from 'three';
import { WORLD, PALETTE, isCityFlat } from './config.js';
import { toonMat, toonMesh, setupCityLighting, INK } from './ToonStyle.js';
import {
    buildJapaneseBuilding, buildJapaneseCorner, buildShinjukuBuilding,
    buildColonyBuilding, createVendingMachine,
} from './Buildings.js';
import {
    createStreetLamp, createBench, createFlowerPot, createMailbox,
    createBicycleParked, createCherryTree, createLargeTree, createPineTree,
    createAvenueTree, createHedge, createLowWall,
    createRoundSign, createTrafficCone, createTrashCan, createPowerPole,
    createParkedCar, createPostBox,
} from './Props.js';

// ─── Sparse road network — German-style (Fahrbahn + Bordstein + Gehweg) ───
// Layout (from road center outward):
//   asphalt | curb | Gehweg (pedestrian) | air gap | building façade
// Trees/lamps/props live ONLY on Gehweg — never inside building footprints.
//
// Main Avenue   : N–S at X=0  (Shinjuku commercial canyon)
// Cross Blvd    : E–W at Z=0
// North Quiet   : E–W at Z=-105
// South Quiet   : E–W at Z= 105
// Thakur Colony : N–S at X= 55  (tall multi-storey alley — Kolkata photo 1)
// Bose Colony   : N–S at X=-55  (low residential lane — photo 2)
const ROAD = {
    main:  { x: 0,   w: 15, z1: -160, z2: 160, sw: 2.8 },
    cross: { z: 0,   w: 13, x1: -185, x2: 185, sw: 1.7 },
    north: { z: -105, w: 11, x1: -175, x2: 175, sw: 1.6 },
    south: { z: 105,  w: 11, x1: -175, x2: 175, sw: 1.6 },
    // Named Bengali colonies (tight canyon, buildings close to road)
    thakur: {
        x: 55, w: 6.0, z1: -135, z2: 135, sw: 0.9,
        style: 'thakur', name: 'Thakur Colony', nameBn: 'ঠাকুর কলোনী',
    },
    bose: {
        x: -55, w: 5.6, z1: -135, z2: 135, sw: 1.05,
        style: 'bose', name: 'Bose Colony', nameBn: 'বোস কলোনী',
    },
    // legacy aliases
    get colonyTall() { return this.thakur; },
    get colonyLow() { return this.bose; },
    sw: 1.6,
    curb: 0.28,
    facadeGap: 1.2,
    mainBldgDepth: 10.5,
    colonyBldgDepth: 8.0,
};

/** Per-road sidewalk width */
function roadSw(r) {
    return r.sw ?? ROAD.sw;
}

/** Outer edge of Gehweg from road center (asphalt/2 + curb + walk) */
function walkOuter(halfW, sw = ROAD.sw) {
    return halfW + ROAD.curb + sw;
}

/** Building front X/Z distance from Main Avenue center */
function mainFacadeLine() {
    return walkOuter(ROAD.main.w / 2, roadSw(ROAD.main)) + ROAD.facadeGap;
}

/** Outer clear for Main corridor (rear of commercial buildings + margin) */
function mainCorridorClear() {
    return mainFacadeLine() + ROAD.mainBldgDepth + 3;
}

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
        this._colonyDistricts();    // Thakur Colony + Bose Colony
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
        // Nature grass only OUTSIDE the city (outer world)
        const grassMat = toonMat(PALETTE.grass ?? 0x90c87a);
        const outer = new THREE.Mesh(
            new THREE.PlaneGeometry(WORLD.size, WORLD.size),
            grassMat
        );
        outer.rotation.x = -Math.PI / 2;
        outer.receiveShadow = true;
        this.scene.add(outer);
        this._groundGrass = outer;

        // City lots under buildings — warm concrete grey (NOT green)
        const cityW = CITY_HX * 2;
        const cityD = CITY_HZ * 2;
        const city = new THREE.Mesh(
            new THREE.PlaneGeometry(cityW, cityD),
            toonMat(PALETTE.concrete ?? 0xb8b4ac)
        );
        city.rotation.x = -Math.PI / 2;
        city.position.y = 0.03;
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

    // Keep clear of roads + Gehweg + façade gap (not building interiors)
    _isRoadOrPark(x, z, pad = 0) {
        // Central plaza (small green at crossroads)
        if (Math.hypot(x, z) < 16 + pad) return true;

        // Public right-of-way only (asphalt + curb + Gehweg + small pad)
        const row = (w, sw) => w / 2 + ROAD.curb + sw + 0.6 + pad;

        // Main Avenue N-S
        if (Math.abs(x - ROAD.main.x) < row(ROAD.main.w, roadSw(ROAD.main))
            && z >= ROAD.main.z1 - pad && z <= ROAD.main.z2 + pad) return true;

        // Cross Boulevard E-W
        if (Math.abs(z - ROAD.cross.z) < row(ROAD.cross.w, roadSw(ROAD.cross))
            && x >= ROAD.cross.x1 - pad && x <= ROAD.cross.x2 + pad) return true;

        // North / South quiet lanes
        if (Math.abs(z - ROAD.north.z) < row(ROAD.north.w, roadSw(ROAD.north))
            && x >= ROAD.north.x1 - pad && x <= ROAD.north.x2 + pad) return true;
        if (Math.abs(z - ROAD.south.z) < row(ROAD.south.w, roadSw(ROAD.south))
            && x >= ROAD.south.x1 - pad && x <= ROAD.south.x2 + pad) return true;

        // Thakur / Bose colonies (narrow N–S)
        for (const col of [ROAD.thakur, ROAD.bose]) {
            if (Math.abs(x - col.x) < row(col.w, roadSw(col))
                && z >= col.z1 - pad && z <= col.z2 + pad) return true;
        }

        // River (west of city)
        const riverX = WORLD.riverX ?? -(CITY_HX + 20);
        if (x < riverX + (WORLD.riverWidth ?? 28) / 2 + 4) return true;

        return false;
    }

    /** True if point is inside Main Avenue commercial building zone (not public walk) */
    _inMainBuildingZone(x, z) {
        const front = mainFacadeLine();
        const rear = front + ROAD.mainBldgDepth;
        const ax = Math.abs(x);
        if (ax < front - 0.2 || ax > rear + 0.5) return false;
        if (z < ROAD.main.z1 + 4 || z > ROAD.main.z2 - 4) return false;
        if (Math.abs(z) < 18) return false;
        return true;
    }

    _getAssignedBuilding(x, z) {
        const buildings = this.data.buildings || [];
        return buildings.find(b => Math.hypot(b.x - x, b.z - z) < 10.0);
    }

    // ─── Road Network — clear asphalt vs concrete walk (not green) ─────────
    // Fahrbahn (dark asphalt) | Bordstein (pale curb) | Gehweg (light concrete)
    _roadNetwork() {
        const asphalt = toonMat(PALETTE.asphalt ?? 0x5a6068);
        const asphaltEdge = toonMat(PALETTE.asphaltDark ?? 0x4a5058);
        const gehwegA = toonMat(PALETTE.sidewalk ?? 0xd4d0c8);
        const gehwegB = toonMat(PALETTE.sidewalkAlt ?? 0xc8c4bc);
        const curbMat = toonMat(PALETTE.curb ?? 0xe4e0d8);
        const lineMat = toonMat(0xf4f2ea, { transparent: true, opacity: 0.92 });

        // Slightly raised so green ground never shows through road/walk
        const Y_ROAD = 0.07;
        const Y_EDGE = 0.072;
        const Y_CURB = 0.14;

        const plane = (x, z, w, d, mat, y = Y_ROAD) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, y, z);
            m.receiveShadow = true;
            this.scene.add(m);
            return m;
        };

        /** N–S road: Fahrbahn + two Bordsteine + two Gehwege */
        const nsRoad = (cx, z1, z2, w, sw = ROAD.sw) => {
            const len = z2 - z1;
            const midZ = (z1 + z2) / 2;
            const half = w / 2;
            const cw = ROAD.curb;

            // Fahrbahn (dark asphalt carriageway)
            plane(cx, midZ, w, len, asphalt, Y_ROAD);
            plane(cx - half + 0.35, midZ, 0.55, len, asphaltEdge, Y_EDGE);
            plane(cx + half - 0.35, midZ, 0.55, len, asphaltEdge, Y_EDGE);

            // Bordstein (raised pale curb) each side
            [-1, 1].forEach(side => {
                const curbX = cx + side * (half + cw / 2);
                const curb = toonMesh(new THREE.BoxGeometry(cw, 0.16, len), curbMat, { outline: false });
                curb.mesh.position.set(curbX, Y_CURB, midZ);
                curb.mesh.receiveShadow = true;
                this.scene.add(curb.group);
            });

            // Gehweg — light concrete sidewalks only outside curb
            [-1, 1].forEach(side => {
                const walkX = cx + side * (half + cw + sw / 2);
                this._buildGehwegStrip(walkX, midZ, sw, len, 'ns', gehwegA, gehwegB);
            });

            this._germanLaneMarkings(cx, midZ, w, len, 'ns', lineMat);
        };

        /** E–W road */
        const ewRoad = (cz, x1, x2, w, sw = ROAD.sw) => {
            const len = x2 - x1;
            const midX = (x1 + x2) / 2;
            const half = w / 2;
            const cw = ROAD.curb;

            plane(midX, cz, len, w, asphalt, Y_ROAD);
            plane(midX, cz - half + 0.35, len, 0.55, asphaltEdge, Y_EDGE);
            plane(midX, cz + half - 0.35, len, 0.55, asphaltEdge, Y_EDGE);

            [-1, 1].forEach(side => {
                const curbZ = cz + side * (half + cw / 2);
                const curb = toonMesh(new THREE.BoxGeometry(len, 0.16, cw), curbMat, { outline: false });
                curb.mesh.position.set(midX, Y_CURB, curbZ);
                curb.mesh.receiveShadow = true;
                this.scene.add(curb.group);
            });

            [-1, 1].forEach(side => {
                const walkZ = cz + side * (half + cw + sw / 2);
                this._buildGehwegStrip(midX, walkZ, len, sw, 'ew', gehwegA, gehwegB);
            });

            this._germanLaneMarkings(midX, cz, w, len, 'ew', lineMat);
        };

        nsRoad(ROAD.main.x, ROAD.main.z1, ROAD.main.z2, ROAD.main.w, roadSw(ROAD.main));
        ewRoad(ROAD.cross.z, ROAD.cross.x1, ROAD.cross.x2, ROAD.cross.w, roadSw(ROAD.cross));
        ewRoad(ROAD.north.z, ROAD.north.x1, ROAD.north.x2, ROAD.north.w, roadSw(ROAD.north));
        ewRoad(ROAD.south.z, ROAD.south.x1, ROAD.south.x2, ROAD.south.w, roadSw(ROAD.south));

        // Thakur & Bose colony lanes — worn asphalt, minimal markings
        this._buildColonyRoad(ROAD.thakur);
        this._buildColonyRoad(ROAD.bose);

        this._buildCentralPlaza();
    }

    /** Narrow worn colony lane (no big highway markings) */
    _buildColonyRoad(def) {
        const asphalt = toonMat(PALETTE.asphalt ?? 0x5a6068);
        const edge = toonMat(PALETTE.asphaltDark ?? 0x4a5058);
        const sw = roadSw(def);
        const half = def.w / 2;
        const len = def.z2 - def.z1;
        const midZ = (def.z1 + def.z2) / 2;
        const cw = ROAD.curb;
        const Y_ROAD = 0.07;

        const plane = (x, z, w, d, mat, y = Y_ROAD) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, y, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };

        plane(def.x, midZ, def.w, len, asphalt, Y_ROAD);
        plane(def.x - half + 0.25, midZ, 0.4, len, edge, Y_ROAD + 0.002);
        plane(def.x + half - 0.25, midZ, 0.4, len, edge, Y_ROAD + 0.002);

        // Low curb / plinth edge (photo: raised building footings)
        [-1, 1].forEach(side => {
            const curb = toonMesh(
                new THREE.BoxGeometry(cw + 0.12, 0.22, len),
                PALETTE.curb ?? 0xe4e0d8,
                { outline: false }
            );
            curb.mesh.position.set(def.x + side * (half + (cw + 0.12) / 2), 0.14, midZ);
            curb.mesh.receiveShadow = true;
            this.scene.add(curb.group);
        });

        // Thin side walks — light concrete (not green)
        const gehwegA = toonMat(PALETTE.sidewalk ?? 0xd4d0c8);
        const gehwegB = toonMat(PALETTE.sidewalkAlt ?? 0xc8c4bc);
        [-1, 1].forEach(side => {
            const walkX = def.x + side * (half + cw + sw / 2);
            this._buildGehwegStrip(walkX, midZ, sw, len, 'ns', gehwegA, gehwegB);
        });

        // Occasional manhole covers (photo 2)
        for (let z = def.z1 + 20; z < def.z2 - 20; z += 42) {
            if (Math.abs(z) < 14) continue;
            const hole = toonMesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 12), 0x4a5058, { outline: false });
            hole.mesh.position.set(def.x + ((z * 0.1) % 1.2) - 0.4, Y_ROAD + 0.01, z);
            this.scene.add(hole.group);
        }
    }

    /**
     * Light concrete pedestrian strip (Gehweg) — never green.
     * sizeX / sizeZ are world-axis extents of the strip.
     * axis 'ns' = strip runs along Z; 'ew' = along X.
     */
    _buildGehwegStrip(cx, cz, sizeX, sizeZ, axis, matA, matB) {
        // Raised light-concrete sidewalk above asphalt + city lot
        const base = new THREE.Mesh(new THREE.BoxGeometry(sizeX, 0.12, sizeZ), matA);
        base.position.set(cx, 0.14, cz);
        base.receiveShadow = true;
        this.scene.add(base);

        // Grey seam lines (stone joints), not green
        const seamMat = toonMat(0xa8a49c);
        const along = axis === 'ns' ? sizeZ : sizeX;
        const across = axis === 'ns' ? sizeX : sizeZ;
        const tile = 1.6;
        const halfAlong = along / 2;
        const seamY = 0.205;

        for (let t = -halfAlong + tile; t < halfAlong - 0.5; t += tile) {
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
            if (axis === 'ns') seam.position.set(cx, seamY, cz + t);
            else seam.position.set(cx + t, seamY, cz);
            this.scene.add(seam);
        }

        const longSeam = new THREE.Mesh(
            new THREE.BoxGeometry(
                axis === 'ns' ? 0.04 : along * 0.98,
                0.014,
                axis === 'ns' ? along * 0.98 : 0.04
            ),
            seamMat
        );
        longSeam.position.set(cx, seamY - 0.002, cz);
        this.scene.add(longSeam);

        // Sparse alternating concrete paver tint (still grey)
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
            if (axis === 'ns') tint.position.set(cx, seamY - 0.004, cz + t);
            else tint.position.set(cx + t, seamY - 0.004, cz);
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
        // Plaza: paved concrete ring + small lawn center (lawn only in the middle)
        const plazaPave = new THREE.Mesh(
            new THREE.CircleGeometry(14, 40),
            toonMat(PALETTE.sidewalk ?? 0xd4d0c8)
        );
        plazaPave.rotation.x = -Math.PI / 2;
        plazaPave.position.set(0, 0.08, 0);
        this.scene.add(plazaPave);

        const lawn = new THREE.Mesh(new THREE.CircleGeometry(6.5, 32), toonMat(PALETTE.grass ?? 0x90c87a));
        lawn.rotation.x = -Math.PI / 2;
        lawn.position.set(0, 0.09, 0);
        this.scene.add(lawn);

        const path = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), toonMat(PALETTE.concrete ?? 0xb8b4ac));
        path.rotation.x = -Math.PI / 2;
        path.position.set(0, 0.1, 0);
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

    // ─── Tree-lined side streets (never inside building footprints) ─────────
    _avenueTrees() {
        let seed = 500;
        // Main commercial canyon: skip entirely (buildings + sparse trees handled separately)
        const mainSkip = mainCorridorClear();

        // E–W avenue: trees/hedges strictly on Gehweg; walls outside façade gap
        // roadW = full carriageway width
        const ewAvenue = (roadZ, x1, x2, roadW, sw, spacing = 7.5) => {
            const half = roadW / 2;
            const curbOuter = half + ROAD.curb;
            const treeOff = curbOuter + sw * 0.5;          // mid-Gehweg only
            const hedgeOff = curbOuter + sw * 0.85;        // outer walk edge
            const wallOff = curbOuter + sw + ROAD.facadeGap + 2.0; // past building front
            for (let x = x1; x <= x2; x += spacing) {
                if (Math.hypot(x, roadZ) < 18) continue;
                // Never plant into Main Avenue building canyon
                if (Math.abs(x) < mainSkip) continue;
                // Skip colony alleys (tight canyons — no big avenue trees)
                if (Math.abs(x - ROAD.thakur.x) < 14) continue;
                if (Math.abs(x - ROAD.bose.x) < 14) continue;

                const tN = createAvenueTree(seed++, +1);
                tN.rotation.y = Math.PI / 2;
                tN.scale.setScalar(0.72);
                tN.position.set(x, 0, roadZ - treeOff);
                this.scene.add(tN);

                const tS = createAvenueTree(seed++, -1);
                tS.rotation.y = Math.PI / 2;
                tS.scale.setScalar(0.72);
                // Offset along road so trunks don't stack; stay on Gehweg
                tS.position.set(x + spacing * 0.45, 0, roadZ + treeOff);
                this.scene.add(tS);

                const hN = createHedge(spacing * 0.65, seed);
                hN.rotation.y = Math.PI / 2;
                hN.position.set(x + spacing * 0.2, 0, roadZ - hedgeOff);
                this.scene.add(hN);
                const hS = createHedge(spacing * 0.65, seed + 2);
                hS.rotation.y = Math.PI / 2;
                hS.position.set(x + spacing * 0.2, 0, roadZ + hedgeOff);
                this.scene.add(hS);

                if (seed % 2 === 0) {
                    const wN = createLowWall(spacing * 0.7, seed);
                    wN.rotation.y = Math.PI / 2;
                    wN.position.set(x + spacing * 0.25, 0, roadZ - wallOff);
                    this.scene.add(wN);
                    const wS = createLowWall(spacing * 0.7, seed + 1);
                    wS.rotation.y = Math.PI / 2;
                    wS.position.set(x + spacing * 0.25, 0, roadZ + wallOff);
                    this.scene.add(wS);
                }
            }
        };

        ewAvenue(ROAD.cross.z, ROAD.cross.x1 + 10, ROAD.cross.x2 - 10, ROAD.cross.w, roadSw(ROAD.cross), 8.0);
        ewAvenue(ROAD.north.z, ROAD.north.x1 + 12, ROAD.north.x2 - 12, ROAD.north.w, roadSw(ROAD.north), 8.5);
        ewAvenue(ROAD.south.z, ROAD.south.x1 + 12, ROAD.south.x2 - 12, ROAD.south.w, roadSw(ROAD.south), 8.5);
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
        // Colony alleys × Cross / North / South
        for (const col of [ROAD.thakur, ROAD.bose]) {
            cw(col.x, ROAD.cross.z, col.w, 'x');
            cw(col.x, ROAD.north.z, col.w, 'x');
            cw(col.x, ROAD.south.z, col.w, 'x');
        }
    }

    /**
     * Full Main Avenue — Shinjuku-style commercial canyon (pastel).
     * Clear bands: asphalt | curb | Gehweg | air gap | building façade
     * Trees / signs / lamps only on Gehweg — never inside buildings.
     */
    _mainAvenueShinjuku() {
        const halfRoad = ROAD.main.w / 2;
        const sw = roadSw(ROAD.main);
        const wOuter = walkOuter(halfRoad, sw);   // outer edge of Gehweg
        const facade = mainFacadeLine();          // building front
        const depth = ROAD.mainBldgDepth;
        let seed = 7000;

        this._mainAvenueLanePaint();

        // Building slots — fixed spacing, no jitter into the walk
        const spacing = 12;
        for (let z = ROAD.main.z1 + 10; z <= ROAD.main.z2 - 10; z += spacing) {
            if (Math.abs(z) < 22) continue;
            if (Math.abs(z - ROAD.north.z) < 14) continue;
            if (Math.abs(z - ROAD.south.z) < 14) continue;

            for (const side of [-1, 1]) {
                seed++;
                const facadeW = 10 + (seed % 3); // width along street
                const h = 18 + (seed % 12) + ((seed * 3) % 5);

                // Center so FRONT face is exactly at facade line
                const bx = side * (facade + depth / 2);
                const bz = z;

                const bld = buildShinjukuBuilding(facadeW, h, depth, seed);
                bld.position.set(bx, 0, bz);
                bld.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
                this.scene.add(bld);
                // Collider in world axes (depth along X, façade width along Z)
                this.colliders.push({ x: bx, z: bz, w: depth, d: facadeW, h, floorY: 0 });

                // Kanban poles strictly mid-Gehweg (not in façade / asphalt)
                if (seed % 2 === 0) {
                    const kanbanX = side * (halfRoad + ROAD.curb + sw * 0.55);
                    this._spawnVerticalKanban(kanbanX, bz + 2.5 * side, seed, side);
                }
            }
        }

        // Guide signs on Gehweg near plaza — not on asphalt, not in buildings
        const guideX = halfRoad + ROAD.curb + sw * 0.5;
        this._spawnGuideSign(-guideX, 16, 0);
        this._spawnGuideSign(guideX, -16, Math.PI);

        // Sparse street trees ONLY in open gaps (plaza / junctions), on Gehweg
        // Avoids canopy clipping into dense commercial façades
        const treeZs = [
            -110, -70, -50, -28, 28, 50, 70, 110,
        ];
        treeZs.forEach((tz, i) => {
            if (Math.abs(tz - ROAD.north.z) < 10) return;
            if (Math.abs(tz - ROAD.south.z) < 10) return;
            for (const side of [-1, 1]) {
                const t = createAvenueTree(seed++ + i, side > 0 ? -0.3 : 0.3);
                t.scale.setScalar(0.42); // small — fits sidewalk tree pit
                // Mid-Gehweg; slight inward so canopy hangs over walk not into façade
                const tx = side * (halfRoad + ROAD.curb + sw * 0.42);
                t.position.set(tx, 0, tz + side * 1.5);
                this.scene.add(t);
            }
        });
    }

    /**
     * Thakur Colony (east) + Bose Colony (west) — photo-matched alleys.
     * Buildings sit tight to the narrow road for a canyon/colony feel.
     */
    _colonyDistricts() {
        this._buildColonyStrip(ROAD.thakur, 'thakur');
        this._buildColonyStrip(ROAD.bose, 'bose');
        // Entry nameplates at both ends of each colony
        this._colonyNameSigns(ROAD.thakur, 0xd46858);
        this._colonyNameSigns(ROAD.bose, 0xd49868);
    }

    _buildColonyStrip(def, style) {
        const half = def.w / 2;
        const sw = roadSw(def);
        const facadeGap = 0.35; // photos: buildings right on the street edge
        const depth = ROAD.colonyBldgDepth;
        const facadeLine = half + ROAD.curb + sw + facadeGap;
        const tall = style === 'thakur';
        const spacing = tall ? 8.6 : 9.8;
        let seed = tall ? 12000 : 15000;

        for (let z = def.z1 + 7; z <= def.z2 - 7; z += spacing) {
            if (Math.abs(z) < 15) continue;
            if (Math.abs(z - ROAD.north.z) < 11) continue;
            if (Math.abs(z - ROAD.south.z) < 11) continue;
            if (Math.abs(z - ROAD.cross.z) < 11) continue;

            for (const side of [-1, 1]) {
                seed++;
                // Vary widths so façades feel irregular like real colonies
                const facadeW = tall
                    ? 7.2 + (seed % 4) * 0.7
                    : 7.8 + (seed % 4) * 0.85;
                const h = tall
                    ? 12 + (seed % 9) + ((seed * 3) % 5)      // 12–25 multi-storey
                    : 5.2 + (seed % 5) + ((seed * 2) % 3) * 0.6; // 5–12 low

                const bx = def.x + side * (facadeLine + depth / 2);
                const bz = z;

                const bld = buildColonyBuilding(facadeW, h, depth, seed, style);
                bld.position.set(bx, 0, bz);
                bld.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
                this.scene.add(bld);
                this.colliders.push({ x: bx, z: bz, w: depth, d: facadeW, h, floorY: 0 });
            }
        }

        this._colonyWiresAndPoles(def, style);
        if (tall) this._thakurProps(def);
        else this._boseProps(def);
    }

    /** Name board at north & south mouths of the colony lane */
    _colonyNameSigns(def, color) {
        const half = def.w / 2;
        const walk = half + ROAD.curb + roadSw(def) * 0.6;
        [def.z1 + 10, def.z2 - 10].forEach((z, i) => {
            const g = new THREE.Group();
            const pole = toonMesh(new THREE.BoxGeometry(0.12, 2.8, 0.12), 0x6a6058, { outline: false });
            pole.mesh.position.y = 1.4;
            g.add(pole.group);
            // Board
            const board = toonMesh(new THREE.BoxGeometry(2.6, 1.0, 0.12), color);
            board.mesh.position.set(0.2, 2.5, 0);
            g.add(board.group);
            // Accent bar
            const bar = toonMesh(new THREE.BoxGeometry(2.2, 0.12, 0.05), 0xf8f0e0, { outline: false });
            bar.mesh.position.set(0.2, 2.75, 0.08);
            g.add(bar.group);
            const bar2 = toonMesh(new THREE.BoxGeometry(2.2, 0.12, 0.05), 0xf8f0e0, { outline: false });
            bar2.mesh.position.set(0.2, 2.25, 0.08);
            g.add(bar2.group);

            g.position.set(def.x + (i === 0 ? walk : -walk), 0, z);
            g.rotation.y = i === 0 ? -0.2 : Math.PI + 0.2;
            this.scene.add(g);
        });
    }

    _colonyWiresAndPoles(def, style) {
        const half = def.w / 2;
        const poleOff = half + ROAD.curb + roadSw(def) * 0.35;
        const wireMat = toonMat(0x1e1e28);
        const tall = style === 'thakur';
        let seed = tall ? 200 : 300;

        for (let z = def.z1 + 12; z < def.z2 - 12; z += 16) {
            if (Math.abs(z) < 14) continue;
            seed++;
            const side = seed % 2 === 0 ? 1 : -1;
            const px = def.x + side * poleOff;

            // Concrete utility pole
            const poleH = tall ? 7.2 : 6.0;
            const pole = toonMesh(new THREE.BoxGeometry(0.16, poleH, 0.16), 0x6a6860);
            pole.mesh.position.set(px, poleH / 2, z);
            pole.mesh.castShadow = true;
            this.scene.add(pole.group);

            // Cross arms
            const arm = toonMesh(new THREE.BoxGeometry(2.0, 0.08, 0.08), 0x4a4840, { outline: false });
            arm.mesh.position.set(px - side * 0.6, poleH - 0.8, z);
            this.scene.add(arm.group);
            const arm2 = toonMesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), 0x4a4840, { outline: false });
            arm2.mesh.position.set(px - side * 0.4, poleH - 1.5, z);
            this.scene.add(arm2.group);

            // Loudspeaker horns — Thakur Colony photo 1
            if (tall && seed % 2 === 0) {
                for (let i = 0; i < 2; i++) {
                    const horn = toonMesh(
                        new THREE.CylinderGeometry(0.18, 0.38, 0.45, 8),
                        0x3a4048
                    );
                    horn.mesh.position.set(px - side * 0.7, poleH - 2.2 - i * 0.5, z);
                    horn.mesh.rotation.z = side * 1.1;
                    this.scene.add(horn.group);
                }
            }

            // Dense overhead wires (both colonies)
            const nextZ = z + 16;
            if (nextZ < def.z2 - 10) {
                for (let w = 0; w < (tall ? 3 : 2); w++) {
                    const wire = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.015, 0.015, 16.4, 3),
                        wireMat
                    );
                    wire.position.set(
                        px - side * (0.2 + w * 0.15),
                        poleH - 0.9 - w * 0.35,
                        z + 8
                    );
                    wire.rotation.x = Math.PI / 2;
                    this.scene.add(wire);
                }
            }
        }
    }

    /** Thakur Colony street life — photo 1 */
    _thakurProps(def) {
        const half = def.w / 2;
        const walk = half + ROAD.curb + roadSw(def) * 0.5;
        let s = 400;

        for (let z = def.z1 + 14; z < def.z2 - 14; z += 18) {
            if (Math.abs(z) < 15) continue;
            s++;

            const lamp = createStreetLamp();
            lamp.position.set(def.x + (s % 2 === 0 ? -1 : 1) * walk, 0, z);
            this.scene.add(lamp);

            if (s % 3 === 0) {
                const trash = createTrashCan();
                trash.position.set(def.x + (s % 2 === 0 ? 1 : -1) * (walk + 0.15), 0, z + 3);
                this.scene.add(trash);
            }
            if (s % 4 === 0) {
                const bike = createBicycleParked();
                bike.position.set(def.x - walk * 0.85, 0, z + 5);
                bike.rotation.y = Math.PI / 2;
                this.scene.add(bike);
            }
            // Potted plants on plinths
            if (s % 3 === 1) {
                const pot = createFlowerPot(s);
                pot.position.set(def.x + walk * 0.9, 0, z + 2);
                this.scene.add(pot);
            }
            // Small dog-scale marker prop (photo has a street dog) — trash + bowl
            if (s % 6 === 0) {
                const bowl = toonMesh(new THREE.CylinderGeometry(0.18, 0.15, 0.08, 8), 0xc8c0b0, { outline: false });
                bowl.mesh.position.set(def.x + (s % 2 === 0 ? 0.8 : -0.8), 0.05, z + 1);
                this.scene.add(bowl.group);
            }
        }
    }

    /** Bose Colony street life — photo 2 */
    _boseProps(def) {
        const half = def.w / 2;
        const walk = half + ROAD.curb + roadSw(def) * 0.55;
        let s = 500;

        for (let z = def.z1 + 12; z < def.z2 - 12; z += 16) {
            if (Math.abs(z) < 15) continue;
            s++;

            // Parked motorcycles / bikes along wall (photo right)
            if (s % 2 === 0) {
                const bike = createBicycleParked();
                bike.scale.setScalar(1.2);
                bike.position.set(
                    def.x + (s % 4 === 0 ? 1 : -1) * (half + 0.4),
                    0,
                    z
                );
                bike.rotation.y = Math.PI / 2 + ((s % 5) - 2) * 0.08;
                this.scene.add(bike);
            }

            // Sitting plinths / benches (photo left ledge)
            if (s % 3 === 0) {
                const bench = createBench();
                bench.position.set(def.x - walk * 0.75, 0, z + 4);
                bench.rotation.y = Math.PI / 2;
                this.scene.add(bench);
            }

            // Laundry lines across the lane (photo signature)
            if (s % 3 === 1) {
                const y = 2.9 + (s % 2) * 0.4;
                const left = def.x - half - 1.0;
                const right = def.x + half + 1.0;
                const line = toonMesh(
                    new THREE.BoxGeometry(right - left, 0.025, 0.025),
                    0x6a7078,
                    { outline: false }
                );
                line.mesh.position.set(def.x, y, z + 2);
                this.scene.add(line.group);
                const clothCols = [0xf2b0c5, 0x48d2c9, 0xf8f0e8, 0xf5c842, 0xd08080, 0x88c4d0];
                for (let i = 0; i < 5; i++) {
                    const cloth = toonMesh(
                        new THREE.BoxGeometry(0.45 + (i % 2) * 0.2, 0.55 + (i % 3) * 0.12, 0.04),
                        clothCols[i % clothCols.length],
                        { outline: false }
                    );
                    cloth.mesh.position.set(left + 1.1 + i * 0.85, y - 0.35, z + 2);
                    cloth.mesh.rotation.z = (i - 2) * 0.05;
                    this.scene.add(cloth.group);
                }
            }

            if (s % 4 === 0) {
                const trash = createTrashCan();
                trash.position.set(def.x + walk * 0.85, 0, z + 6);
                this.scene.add(trash);
            }

            // Small water pots / buckets on plinths
            if (s % 5 === 0) {
                const pot = toonMesh(new THREE.CylinderGeometry(0.2, 0.18, 0.35, 8), 0xc8a888);
                pot.mesh.position.set(def.x - walk * 0.9, 0.35, z + 1);
                this.scene.add(pot.group);
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

    _spawnVerticalKanban(x, z, seed, side = 1) {
        const g = new THREE.Group();
        const neonCols = [0xff6b9d, 0x5ec8ff, 0xffd966, 0xff5c7a, 0x48d2c9, 0xc49bff];
        const col = neonCols[Math.abs(seed) % neonCols.length];
        const h = 4.2 + (seed % 4) * 0.5;

        const pole = toonMesh(new THREE.BoxGeometry(0.12, h, 0.12), 0x4a5058, { outline: false });
        pole.mesh.position.y = h / 2;
        g.add(pole.group);

        // Sign face points toward road (inward), stays on sidewalk band
        const faceOff = -side * 0.22;
        const faceMat = toonMat(col, { emissive: col, emissiveIntensity: 0.4 });
        const face = new THREE.Mesh(new THREE.BoxGeometry(0.5, h * 0.82, 0.08), faceMat);
        face.position.set(faceOff, h * 0.55, 0);
        face.userData.cityLight = 'sign';
        face.userData.litAtNight = true;
        faceMat.userData.cityLight = 'sign';
        g.add(face);

        const segs = Math.floor(h * 0.82 / 0.65);
        for (let i = 0; i < segs; i++) {
            const bar = toonMesh(
                new THREE.BoxGeometry(0.36, 0.07, 0.04),
                0xf8f8f0,
                { outline: false, transparent: true, opacity: 0.5 }
            );
            bar.mesh.position.set(faceOff, 0.85 + i * 0.65, 0.05);
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
        // All props mid-Gehweg — never past façade line, never in asphalt
        const half = ROAD.main.w / 2;
        const sw = roadSw(ROAD.main);
        const midWalk = half + ROAD.curb + sw * 0.5;
        const outerWalk = half + ROAD.curb + sw * 0.82; // still inside Gehweg
        const facade = mainFacadeLine();
        let s = 900;

        for (let z = ROAD.main.z1 + 12; z <= ROAD.main.z2 - 12; z += 18) {
            if (Math.abs(z) < 20) continue;
            if (Math.abs(z - ROAD.north.z) < 12) continue;
            if (Math.abs(z - ROAD.south.z) < 12) continue;

            for (const side of [-1, 1]) {
                const lamp = createStreetLamp();
                // Lamp on mid walk, clear of building face
                const lx = side * midWalk;
                if (Math.abs(lx) >= facade - 0.3) continue;
                lamp.position.set(lx, 0, z + side * 2);
                if (side > 0) lamp.rotation.y = Math.PI;
                this.scene.add(lamp);
            }

            // Vending / bike / postbox along outer third of Gehweg (still < façade)
            const propX = (s % 2 === 0 ? -1 : 1) * outerWalk;
            if (Math.abs(propX) < facade - 0.5) {
                if (s % 2 === 0) {
                    const vm = createVendingMachine(s);
                    vm.position.set(propX, 0, z + 4);
                    this.scene.add(vm);
                }
                if (s % 3 === 0) {
                    const bike = createBicycleParked();
                    bike.position.set(-outerWalk, 0, z + 7);
                    this.scene.add(bike);
                }
                if (s % 4 === 0) {
                    const pb = createPostBox();
                    pb.position.set(outerWalk, 0, z + 1);
                    this.scene.add(pb);
                }
            }
            s++;
        }

        // Cones on asphalt edge (road, not sidewalk/building)
        const junctions = [ROAD.north.z, ROAD.south.z, 0];
        junctions.forEach((jz, i) => {
            for (const side of [-1, 1]) {
                const cone = createTrafficCone();
                cone.position.set(side * (half - 1.0), 0, jz + side * 7);
                this.scene.add(cone);
            }
            const sign = createRoundSign(i);
            sign.position.set(midWalk, 0, jz + 9);
            this.scene.add(sign);
        });
    }

    // ─── Buildings BEHIND the tree lines ────────────────────────────────────
    _buildingRows() {
        let s = 100;
        // Larger blocks: buildings sit well behind avenue trees (~16+ from road center)
        const cell = 16;

        // Candidate slots across expanded city
        for (let x = -185; x <= 185; x += cell) {
            for (let z = -155; z <= 155; z += cell) {
                // Keep roads + tree buffer clear
                if (this._isRoadOrPark(x, z, 2)) continue;

                // Keep generic lots outside Main canyon + colony alleys + side ROW
                const mainClear = mainCorridorClear();
                const colHalf = (def) =>
                    def.w / 2 + ROAD.curb + roadSw(def) + ROAD.colonyBldgDepth + 2.5;
                const crossClear = walkOuter(ROAD.cross.w / 2, roadSw(ROAD.cross)) + ROAD.facadeGap + 5;
                const quietClear = walkOuter(ROAD.north.w / 2, roadSw(ROAD.north)) + ROAD.facadeGap + 4.5;
                if (Math.abs(x) < mainClear) continue;
                if (Math.abs(x - ROAD.thakur.x) < colHalf(ROAD.thakur)) continue;
                if (Math.abs(x - ROAD.bose.x) < colHalf(ROAD.bose)) continue;
                // Setback from E-W roads (buildings behind Gehweg + gap)
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
        // Side streets only here — props mid-Gehweg.
        const crossWalk = ROAD.cross.w / 2 + ROAD.curb + roadSw(ROAD.cross) * 0.55;
        const quietWalk = ROAD.south.w / 2 + ROAD.curb + roadSw(ROAD.south) * 0.55;

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
        // Power poles just outside Gehweg (not in building façade)
        const wx = walkOuter(ROAD.main.w / 2, roadSw(ROAD.main)) + 0.35;
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

        // North — flank Pastel Ridge (ridge sits ~z=-255, leave that clear)
        hill(-140, -230, 40, 14, 36);
        hill(140, -240, 42, 15, 38);
        // South
        hill(-55, 275, 54, 18, 44);
        hill(40, 290, 60, 20, 48);
        hill(115, 270, 46, 14, 36);
        // East
        hill(275, -45, 42, 18, 58);
        hill(285, 55, 46, 16, 54);
        hill(270, 145, 40, 14, 48);
        // West — far past River Gorge (gorge ~x=-255)
        hill(-330, -120, 36, 16, 44);
        hill(-325, 170, 38, 14, 42, hillDark);
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

        // Explore destinations (map markers — outside city)
        this.pois.push({
            position: new THREE.Vector3(20, 0, -200),
            type: 'explore',
            name: 'Pastel Ridge Trail',
            mapLabel: 'RIDGE',
            data: {
                name: 'Pastel Ridge Trail',
                description: 'Walk north out of town into the pastel mountain ridge. Soft peaks, rock knobs, and open trails.',
            },
        });
        this.pois.push({
            position: new THREE.Vector3(-250, 0, 20),
            type: 'explore',
            name: 'River Gorge',
            mapLabel: 'GORGE',
            data: {
                name: 'River Gorge',
                description: 'Cross the west bridges and follow the winding gorge — turquoise water, rocky banks, autumn foliage and river cottages.',
            },
        });
        this.pois.push({
            position: new THREE.Vector3(55, 0, 40),
            type: 'explore',
            name: 'Thakur Colony',
            mapLabel: 'THAKUR',
            data: {
                name: 'Thakur Colony (ঠাকুর কলোনী)',
                description: 'Narrow multi-storey Kolkata-style alley — balconies, green shutters, AC units, loudspeaker poles and tangled wires.',
            },
        });
        this.pois.push({
            position: new THREE.Vector3(-55, 0, -40),
            type: 'explore',
            name: 'Bose Colony',
            mapLabel: 'BOSE',
            data: {
                name: 'Bose Colony (বোস কলোনী)',
                description: 'Quiet low residential lane — terracotta walls, laundry lines, sitting plinths, manholes and parked bikes.',
            },
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
