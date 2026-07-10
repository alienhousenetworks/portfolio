/**
 * WorldBuilder.js — Japanese Anime Town
 * One compact city, nature surroundings.
 * Inspired by messenger.abeto.co street aesthetic.
 */
import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { toonMat, toonMesh, setupCityLighting, INK } from './ToonStyle.js';
import { buildJapaneseBuilding, buildJapaneseCorner, createVendingMachine } from './Buildings.js';
import {
    createStreetLamp, createBench, createFlowerPot, createMailbox,
    createBicycleParked, createCherryTree, createLargeTree, createPineTree,
    createRoundSign, createTrafficCone, createTrashCan, createPowerPole,
    createParkedCar, createPostBox,
} from './Props.js';

// ─── City layout constants ─────────────────────────────────────────────────
const ROAD = {
    showroom: { z: -75, w: 9 },
    bazaar: { z: 55, w: 9 },
    mohr: { x: -45, w: 8 },
    tech1: { x: 45, w: 8 },
    tech2: { x: 90, w: 8 },
    techHoriz1: { z: -30, w: 8, x1: 45, x2: 130 },
    techHoriz2: { z: 30, w: 8, x1: 45, x2: 130 },
    promenade: { angle: Math.atan2(-130, 180), w: 9 },
    floral: { rInner: 35, rOuter: 41 },
    sw: 2.2,  // sidewalk width
};

// Exact building layouts from the City of Harmonia map
const HARMONIA_BUILDINGS = [
    // --- Showroom & Retail Drive (S) ---
    // Above road (Z = -86)
    { id: 'S1', x: -100, z: -86, w: 10, d: 10, h: 9, style: 'showroom', yaw: 0 },
    { id: 'S8_1', x: -75, z: -86, w: 12, d: 10, h: 10, style: 'showroom', yaw: 0 },
    { id: 'S3', x: -50, z: -86, w: 10, d: 10, h: 8, style: 'showroom', yaw: 0 },
    { id: 'S8_2', x: -25, z: -86, w: 12, d: 10, h: 11, style: 'showroom', yaw: 0 },
    { id: 'S5', x: 0, z: -86, w: 10, d: 10, h: 9, style: 'showroom', yaw: 0 },
    { id: 'S6', x: 25, z: -86, w: 12, d: 10, h: 10, style: 'showroom', yaw: 0 },
    { id: 'S7', x: 50, z: -86, w: 12, d: 10, h: 8, style: 'showroom', yaw: 0 },
    { id: 'I3_1', x: 80, z: -86, w: 14, d: 10, h: 12, style: 'showroom', yaw: 0 },

    // Below road (Z = -64)
    { id: 'R18', x: -30, z: -64, w: 10, d: 10, h: 8, style: 'residential', yaw: Math.PI },
    { id: 'S8_3', x: -5, z: -64, w: 12, d: 10, h: 10, style: 'showroom', yaw: Math.PI },
    { id: 'S7_2', x: 20, z: -64, w: 12, d: 10, h: 9, style: 'showroom', yaw: Math.PI },
    { id: 'S1_2', x: 45, z: -64, w: 10, d: 10, h: 8, style: 'showroom', yaw: Math.PI },
    { id: 'C10_1', x: 60, z: -64, w: 6, d: 6, h: 5, style: 'cafe', yaw: Math.PI },

    // --- West Block (left of Mohr Ave X = -45) ---
    // Column next to river (X = -85)
    { id: 'I1_1', x: -85, z: -50, w: 12, d: 12, h: 14, style: 'showroom', yaw: Math.PI/2 },
    { id: 'I3_2', x: -85, z: -25, w: 12, d: 12, h: 10, style: 'showroom', yaw: Math.PI/2 },
    { id: 'I3_3', x: -85, z: 5, w: 16, d: 16, h: 15, style: 'showroom', yaw: Math.PI/2 },
    { id: 'I4_1', x: -85, z: 35, w: 12, d: 12, h: 9, style: 'showroom', yaw: Math.PI/2 },

    // Column next to Mohr Ave (X = -65)
    { id: 'R1_1', x: -65, z: -50, w: 10, d: 10, h: 8, style: 'residential', yaw: -Math.PI/2 },
    { id: 'R2_1', x: -65, z: -20, w: 10, d: 10, h: 9, style: 'residential', yaw: -Math.PI/2 },
    { id: 'R3_1', x: -65, z: 15, w: 10, d: 10, h: 10, style: 'residential', yaw: -Math.PI/2 },
    { id: 'I4_2', x: -75, z: 50, w: 12, d: 12, h: 9, style: 'showroom', yaw: 0 },
    { id: 'I1_2', x: -55, z: 75, w: 14, d: 10, h: 11, style: 'showroom', yaw: 0 },

    // --- Central Left Block (between Mohr Ave X = -45 and Floral Way) ---
    { id: 'R2_2', x: -28, z: -48, w: 10, d: 10, h: 8, style: 'residential', yaw: Math.PI/4 },
    { id: 'R20_1', x: -32, z: -24, w: 10, d: 10, h: 9, style: 'residential', yaw: Math.PI/4 },
    { id: 'R20_2', x: -32, z: 0, w: 10, d: 10, h: 9, style: 'residential', yaw: Math.PI/4 },
    { id: 'R1_2', x: -24, z: 24, w: 10, d: 10, h: 8, style: 'residential', yaw: -Math.PI/4 },
    { id: 'R5_1', x: -24, z: 46, w: 10, d: 10, h: 9, style: 'residential', yaw: -Math.PI/4 },
    { id: 'R7_1', x: -10, z: 12, w: 10, d: 10, h: 9, style: 'residential', yaw: 0 },
    { id: 'R4_1', x: -10, z: 34, w: 10, d: 10, h: 8, style: 'residential', yaw: 0 },

    // Cafes in Central Left
    { id: 'C1_1', x: -15, z: 46, w: 6, d: 6, h: 5, style: 'cafe', yaw: 0 },
    { id: 'C10_2', x: -35, z: 46, w: 6, d: 6, h: 5, style: 'cafe', yaw: 0 },

    // --- Central Top Area (below Showrooms) ---
    { id: 'R9_1', x: -10, z: -45, w: 14, d: 14, h: 11, style: 'residential', yaw: Math.PI },
    { id: 'S8_4', x: 10, z: -45, w: 12, d: 12, h: 10, style: 'showroom', yaw: Math.PI },
    { id: 'S7_3', x: 28, z: -45, w: 12, d: 12, h: 9, style: 'showroom', yaw: Math.PI },
    { id: 'C1_2', x: 42, z: -45, w: 6, d: 6, h: 5, style: 'cafe', yaw: Math.PI },

    // --- Central Bottom Area (above Bazaar road Z = 55) ---
    { id: 'M2_1', x: -28, z: 40, w: 8, d: 8, h: 7, style: 'market', yaw: 0 },
    { id: 'M2_2', x: -12, z: 40, w: 8, d: 8, h: 7, style: 'market', yaw: 0 },
    { id: 'M1_1', x: 12, z: 40, w: 8, d: 8, h: 7, style: 'market', yaw: 0 },
    { id: 'M2_3', x: 28, z: 40, w: 8, d: 8, h: 7, style: 'market', yaw: 0 },

    // --- Bottom Row (below Bazaar road Z = 55) ---
    { id: 'G2_1', x: -95, z: 70, w: 10, d: 10, h: 8, style: 'market', yaw: 0 },
    { id: 'R1_3', x: -95, z: 86, w: 10, d: 10, h: 8, style: 'residential', yaw: 0 },
    { id: 'R22_1', x: -80, z: 70, w: 10, d: 10, h: 9, style: 'residential', yaw: 0 },
    { id: 'R14_1', x: -80, z: 86, w: 10, d: 10, h: 8, style: 'residential', yaw: 0 },
    { id: 'R15_1', x: -65, z: 86, w: 10, d: 10, h: 8, style: 'residential', yaw: 0 },
    { id: 'G3_1', x: -65, z: 70, w: 10, d: 10, h: 8, style: 'market', yaw: 0 },
    { id: 'R16_1', x: -50, z: 86, w: 10, d: 10, h: 8, style: 'residential', yaw: 0 },
    { id: 'G4_1', x: -50, z: 70, w: 10, d: 10, h: 8, style: 'market', yaw: 0 },
    { id: 'G5_1', x: -35, z: 70, w: 10, d: 10, h: 8, style: 'market', yaw: 0 },
    { id: 'R17_1', x: -35, z: 86, w: 10, d: 10, h: 8, style: 'residential', yaw: 0 },
    { id: 'G5_2', x: -20, z: 70, w: 10, d: 10, h: 8, style: 'market', yaw: 0 },
    { id: 'R20_3', x: -20, z: 86, w: 10, d: 10, h: 9, style: 'residential', yaw: 0 },
    { id: 'G4_2', x: -5, z: 70, w: 10, d: 10, h: 8, style: 'market', yaw: 0 },
    { id: 'R19_1', x: 5, z: 86, w: 10, d: 10, h: 8, style: 'residential', yaw: 0 },
    { id: 'G8_1', x: 10, z: 70, w: 10, d: 10, h: 8, style: 'market', yaw: 0 },
    { id: 'R20_4', x: 25, z: 70, w: 10, d: 10, h: 9, style: 'residential', yaw: 0 },

    // --- East Block (Tech Hub District Y) ---
    // Below Promenade
    { id: 'T5_1', x: 32, z: -12, w: 10, d: 10, h: 8, style: 'tech', yaw: -Math.PI/2 },
    { id: 'T5_2', x: 32, z: 14, w: 10, d: 10, h: 8, style: 'tech', yaw: -Math.PI/2 },

    // Inside Tech Hub grid
    { id: 'T11_1', x: 65, z: -48, w: 12, d: 12, h: 11, style: 'tech', yaw: -Math.PI/2 },
    { id: 'T11_2', x: 100, z: -48, w: 12, d: 12, h: 11, style: 'tech', yaw: -Math.PI/2 },
    { id: 'T13_1', x: 80, z: -24, w: 14, d: 14, h: 13, style: 'tech', yaw: -Math.PI/2 },
    { id: 'T10_1', x: 115, z: -24, w: 10, d: 10, h: 10, style: 'tech', yaw: -Math.PI/2 },
    { id: 'T10_2', x: 65, z: 0, w: 10, d: 10, h: 10, style: 'tech', yaw: -Math.PI/2 },
    { id: 'T11_3', x: 80, z: 0, w: 12, d: 12, h: 11, style: 'tech', yaw: -Math.PI/2 },
    { id: 'T10_3', x: 100, z: 0, w: 10, d: 10, h: 10, style: 'tech', yaw: -Math.PI/2 },
    { id: 'T19_1', x: 80, z: 24, w: 16, d: 16, h: 15, style: 'tech', yaw: -Math.PI/2 },
    { id: 'T10_4', x: 115, z: 24, w: 10, d: 10, h: 10, style: 'tech', yaw: -Math.PI/2 },
    { id: 'T11_4', x: 95, z: 66, w: 18, d: 18, h: 16, style: 'tech', yaw: 0 },
    { id: 'I1_3', x: 105, z: -76, w: 12, d: 12, h: 12, style: 'showroom', yaw: 0 },
    { id: 'H_1', x: 124, z: -64, w: 8, d: 8, h: 15, style: 'tech', yaw: 0 }
];

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
            new THREE.PlaneGeometry(WORLD.size, WORLD.size),
            toonMat(0x90c87a)
        );
        outer.rotation.x = -Math.PI / 2;
        outer.receiveShadow = true;
        this.scene.add(outer);

        // Draw River Harmony along the West side (X ≈ -115)
        const riverGeo = new THREE.PlaneGeometry(24, 540);
        const riverMat = toonMat(0x7ac4d0, { transparent: true, opacity: 0.85 });
        const river = new THREE.Mesh(riverGeo, riverMat);
        river.rotation.x = -Math.PI / 2;
        river.position.set(-115, 0.03, 0);
        this.scene.add(river);

        // Specific block foundation pads following the Harmonia diagram
        this._drawBlockPads();
    }

    _drawBlockPads() {
        const padMat = toonMat(0xb8c0bc);
        const drawPad = (x, z, w, d) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), padMat);
            m.position.set(x, 0.03, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };

        // North Showrooms pad (above Showroom & Retail Drive Z = -75)
        drawPad(0, -86, 250, 14);

        // South Market pad (below Bazaar Street Z = 55)
        drawPad(0, 71, 240, 24);

        // West Residential pad (left of Mohr Ave X = -45, right of River X = -115)
        drawPad(-75, -10, 52, 120);

        // East Tech Hub pads (divided by Tech Lanes at X = 45 and X = 90)
        drawPad(67.5, -10, 37, 120);
        drawPad(107.5, -10, 27, 120);

        // Radial buildings pad (a ring of concrete around the Floral Way circular road)
        const ringPadGeo = new THREE.RingGeometry(43, 53, 64);
        const ringPad = new THREE.Mesh(ringPadGeo, padMat);
        ringPad.rotation.x = -Math.PI / 2;
        ringPad.position.set(0, 0.04, 0);
        ringPad.receiveShadow = true;
        this.scene.add(ringPad);
    }

    // City of Harmonia layout mathematical checks
    _isRoadOrPark(x, z) {
        // Central Flower Park (Radius 35 around (0,0))
        if (Math.hypot(x, z) < 35) return true;

        // Circular Floral Way Ring Road (Radius 34 to 42 around (0,0))
        const r = Math.hypot(x, z);
        if (r >= 33 && r <= 43) return true;

        // Showroom & Retail Drive (Z = -75, width 8)
        if (Math.abs(z - (-75)) < 6) return true;

        // Road Market & Bazaar (Z = 55, width 8)
        if (Math.abs(z - 55) < 6) return true;

        // Mohr Ave (X = -45, width 7)
        if (Math.abs(x - (-45)) < 5 && z > -75 && z < 55) return true;

        // Tech Lanes (X = 45 and X = 90, width 7)
        if ((Math.abs(x - 45) < 5 || Math.abs(x - 90) < 5) && z > -75 && z < 55) return true;

        // E-W streets / Tech lanes horizontal
        if (x > 45 && (Math.abs(z - 30) < 5 || Math.abs(z - (-30)) < 5)) return true;

        // Diagonal Promenade: z = -0.6 * x
        const distToPromenade = Math.abs(0.6 * x + z) / Math.sqrt(0.6 * 0.6 + 1 * 1);
        if (distToPromenade < 6.5) return true;

        // River Harmony boundary on the far West (X < -100)
        if (x < -100) return true;

        return false;
    }

    _getAssignedBuilding(x, z) {
        const buildings = this.data.buildings || [];
        return buildings.find(b => Math.hypot(b.x - x, b.z - z) < 8.0);
    }

    // ─── Road Network ────────────────────────────────────────────────────────
    _roadNetwork() {
        const roadMat = toonMat(0x748088);

        const road = (x, z, w, d, ry = 0) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
            m.rotation.x = -Math.PI / 2;
            m.rotation.z = -ry;
            m.position.set(x, 0.05, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };

        // 1. Showroom & Retail Drive (Z = -75)
        road(0, -75, 260, 9);

        // 2. Road Market & Bazaar (Z = 55)
        road(0, 55, 260, 9);

        // 3. Mohr Ave (X = -45)
        road(-45, -10, 8, 120);

        // 4. Tech Lanes (X = 45 and X = 90)
        road(45, -10, 8, 120);
        road(90, -10, 8, 120);

        // 5. Tech Lanes Horizontal (Z = -30 and Z = 30 for Tech Hub)
        road(87.5, -30, 85, 8);
        road(87.5, 30, 85, 8);

        // 6. Diagonal Promenade (A1) from SW to NE
        const promAngle = Math.atan2(-130, 180); // ≈ -0.62 rad
        road(0, 0, 240, 9, promAngle);

        // 7. Circular Floral Way Ring Road (Radius 35 to 41 around (0,0))
        const ringRoadGeo = new THREE.RingGeometry(35, 41, 64);
        const ringRoad = new THREE.Mesh(ringRoadGeo, roadMat);
        ringRoad.rotation.x = -Math.PI / 2;
        ringRoad.position.set(0, 0.05, 0);
        ringRoad.receiveShadow = true;
        this.scene.add(ringRoad);

        // 8. Central Flower Park and Atrium
        this._buildCentralPark();
    }

    _buildCentralPark() {
        const colors = [0xff5566, 0xffbb33, 0x9955ff, 0x55ccff, 0xa6d58f];
        // Draw concentric flower bed rings
        const ringWidth = 4.5;
        for (let i = 0; i < 5; i++) {
            const innerR = 8 + i * ringWidth;
            const outerR = innerR + ringWidth;
            const ringGeo = new THREE.RingGeometry(innerR, outerR, 32);
            const ringMat = toonMat(colors[i]);
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = -Math.PI / 2;
            ringMesh.position.set(0, 0.06, 0);
            this.scene.add(ringMesh);
        }

        // Center grass circle
        const centerGrass = new THREE.Mesh(new THREE.CircleGeometry(8, 32), toonMat(0x6b8e4e));
        centerGrass.rotation.x = -Math.PI / 2;
        centerGrass.position.set(0, 0.07, 0);
        this.scene.add(centerGrass);

        // Atrium Glass Dome
        const domeMat = toonMat(0xa8c8e0, { transparent: true, opacity: 0.65, emissive: 0xa8c8e0, emissiveIntensity: 0.15 });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
        dome.position.set(0, 0.08, 0);
        dome.scale.set(1, 0.8, 1);
        this.scene.add(dome);

        // Dome frames
        const frameMat = toonMat(0x2a3038);
        const domeFrame = new THREE.Mesh(new THREE.SphereGeometry(6.05, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), frameMat);
        domeFrame.position.set(0, 0.08, 0);
        domeFrame.scale.set(1, 0.8, 1);
        domeFrame.material.wireframe = true;
        this.scene.add(domeFrame);
    }

    // ─── Crosswalks & Lane Markings ──────────────────────────────────────────
    _crosswalks() {
        const white = toonMat(0xf8f8f4, { transparent: true, opacity: 0.85 });
        const cw = (cx, cz) => {
            for (let s = -2; s <= 2; s++) {
                const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5.0), white);
                m.rotation.x = -Math.PI / 2;
                m.position.set(cx + s * 1.8, 0.08, cz);
                this.scene.add(m);
            }
        };

        cw(-45, -75);
        cw(45, -75);
        cw(-45, 55);
        cw(45, 55);
    }

    // ─── Building Rows (Exact Hand-Placed Layout) ───────────────────────────
    _buildingRows() {
        let s = 100;

        HARMONIA_BUILDINGS.forEach(bDef => {
            const assignedPoi = this._getAssignedBuilding(bDef.x, bDef.z);
            let bld;
            if (assignedPoi) {
                bld = this._buildThemedBuilding(bDef.w, bDef.h, bDef.d, s, assignedPoi);
            } else {
                bld = this._buildStylizedBuilding(bDef.w, bDef.h, bDef.d, s, bDef.style);
            }
            bld.position.set(bDef.x, 0, bDef.z);
            bld.rotation.y = bDef.yaw;
            this.scene.add(bld);

            this.colliders.push({ x: bDef.x, z: bDef.z, w: bDef.w, d: bDef.d, h: bDef.h, floorY: 0 });
            s++;
        });
    }

    _buildStylizedBuilding(w, h, d, seed, style) {
        const g = new THREE.Group();
        
        let wallCol = 0xc0c4bc;
        let accentCol = 0x48d2c9;
        
        if (style === 'tech') {
            wallCol = 0x22262d;      // Cool dark tech wall
            accentCol = 0x00ffff;    // Cyber neon cyan
        } else if (style === 'market') {
            wallCol = 0xd4cec8;      // Warm market concrete
            accentCol = 0xff5533;    // Bright red-orange
        } else if (style === 'showroom') {
            wallCol = 0xc8bada;      // Light purple
            accentCol = 0x8a55cc;    // Deep purple
        } else if (style === 'cafe') {
            wallCol = 0xece9e1;
            accentCol = 0xf59a45;    // Orange cafe accent
        } else {
            wallCol = 0xeae0b8;      // Yellowish warm residential
            accentCol = 0xcc9966;
        }

        // Build main body
        const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallCol);
        body.mesh.position.y = h / 2;
        body.mesh.castShadow = true;
        body.mesh.receiveShadow = true;
        g.add(body.group);

        // Accent roof parapet
        const parapet = toonMesh(new THREE.BoxGeometry(w + 0.25, 0.4, d + 0.25), accentCol);
        parapet.mesh.position.y = h + 0.2;
        g.add(parapet.group);

        // Glass window or shop front
        const glassMat = toonMat(style === 'tech' ? 0x00ffff : 0x7ac4d0, { transparent: true, opacity: 0.65 });
        const shop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 2.2, 0.1), glassMat);
        shop.position.set(0, 1.1, d / 2 + 0.02);
        g.add(shop);

        // Shop sign
        const frameMat = toonMat(0x1a1a1a);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.75, 0.15), frameMat);
        sign.position.set(0, h - 0.8, d / 2 + 0.05);
        g.add(sign);

        // Rooftop bits
        if (style === 'tech') {
            const dish = toonMesh(new THREE.SphereGeometry(0.6, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x8898a8);
            dish.mesh.position.set(0, h + 0.4, 0);
            dish.mesh.rotation.x = -Math.PI / 4;
            g.add(dish.group);
        } else if (style === 'market') {
            const canopy = toonMesh(new THREE.BoxGeometry(w * 0.8, 0.15, 1.2), accentCol);
            canopy.mesh.position.set(0, 2.3, d / 2 + 0.5);
            g.add(canopy.group);
        }

        return g;
    }

    _buildThemedBuilding(w, h, d, seed, poi) {
        return this._buildStylizedBuilding(w, h, d, seed, poi.district === 'software' ? 'tech' : (poi.district === 'marketing' ? 'market' : 'showroom'));
    }

    _createMarketStall(seed) {
        const g = new THREE.Group();
        const woodMat = toonMat(0x8a7a68);
        const colors = [0xff5533, 0xffbb00, 0x33aa55, 0x3388ff];
        const clothMat = toonMat(colors[seed % colors.length]);

        // Counter
        const counter = toonMesh(new THREE.BoxGeometry(2.4, 0.9, 1.4), woodMat);
        counter.mesh.position.y = 0.45;
        counter.mesh.castShadow = true;
        g.add(counter.group);

        // Pillars
        [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]].forEach(([px, pz]) => {
            const pillar = toonMesh(new THREE.BoxGeometry(0.08, 2.2, 0.08), woodMat);
            pillar.mesh.position.set(px, 1.1, pz);
            g.add(pillar.group);
        });

        // Cloth roof
        const canopy = toonMesh(new THREE.BoxGeometry(2.6, 0.15, 1.6), clothMat);
        canopy.mesh.position.y = 2.2;
        g.add(canopy.group);

        return g;
    }

    // ─── Street Props ─────────────────────────────────────────────────────────
    _streetProps() {
        let s = 200;

        // 1. Central Flower Park Benches (placed around the circle of radius 35)
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const bx = Math.cos(angle) * 33;
            const bz = Math.sin(angle) * 33;
            const b = createBench();
            b.position.set(bx, 0, bz);
            b.rotation.y = -angle + Math.PI / 2;
            this.scene.add(b);
        }

        // 2. Showroom & Retail Drive (Z = -75) Props
        for (let x = -110; x <= 110; x += 22) {
            // Street lamps on both sides
            const lamp1 = createStreetLamp();
            lamp1.position.set(x, 0, -79.5);
            this.scene.add(lamp1);

            const lamp2 = createStreetLamp();
            lamp2.position.set(x + 11, 0, -70.5);
            this.scene.add(lamp2);

            // Vending machines
            if (s % 3 === 0) {
                const vm = createVendingMachine(s);
                vm.position.set(x + 5, 0, -79.5);
                vm.rotation.y = 0;
                this.scene.add(vm);
            }
            s++;
        }

        // 3. Road Market & Bazaar (Z = 55) Props
        for (let x = -100; x <= 100; x += 16) {
            // Market stalls directly on the Bazaar street side
            if (s % 2 === 0) {
                const stall = this._createMarketStall(s);
                stall.position.set(x, 0, 51.5);
                stall.rotation.y = Math.PI;
                this.scene.add(stall);
                this.colliders.push({ x, z: 51.5, w: 2.5, d: 2.5, h: 2.5, floorY: 0 });
            }

            const lamp = createStreetLamp();
            lamp.position.set(x + 8, 0, 59.5);
            this.scene.add(lamp);
            s++;
        }

        // 4. Mohr Ave (X = -45) Props
        for (let z = -60; z <= 40; z += 20) {
            const lamp = createStreetLamp();
            lamp.position.set(-49.5, 0, z);
            lamp.rotation.y = Math.PI / 2;
            this.scene.add(lamp);

            if (s % 2 === 0) {
                const pb = createPostBox();
                pb.position.set(-40.5, 0, z + 5);
                this.scene.add(pb);
            }
            s++;
        }

        // 5. Tech Lanes (X = 45 and X = 90) Props
        for (let z = -60; z <= 40; z += 20) {
            const lamp1 = createStreetLamp();
            lamp1.position.set(40.5, 0, z);
            lamp1.rotation.y = -Math.PI / 2;
            this.scene.add(lamp1);

            const lamp2 = createStreetLamp();
            lamp2.position.set(94.5, 0, z + 10);
            lamp2.rotation.y = Math.PI / 2;
            this.scene.add(lamp2);
            s++;
        }
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
        // Trees scattered outside city (strictly pushed past the 142 unit border)
        for (let i = 0; i < 110; i++) {
            const seed = i * 31 + 7;
            const angle = (seed * 0.618033) * Math.PI * 2;
            const dist = 145 + (seed % 75);
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            const gy = this.getTerrainHeight(x, z);
            const tree = this._pickTree(seed);
            tree.position.set(x, gy, z);
            this.scene.add(tree);
        }

        // Trees within city (strictly kept in the Central Flower Park or residential pockets)
        const cityTrees = [
            [-25, -20, 0], [25, -20, 1], [-25, 20, 2], [25, 20, 3],
            [0, 42, 4], [0, -42, 5],
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

        // N hills (moved far North past Z = -155)
        hill(-55, -165, 48, 14, 38);
        hill(15, -170, 60, 20, 46);
        hill(85, -158, 44, 12, 34);
        hill(-15, -160, 35, 10, 28, hillDark);
        // S hills (moved far South past Z = 155)
        hill(-45, 168, 50, 16, 40);
        hill(28, 178, 58, 18, 44);
        hill(95, 162, 42, 13, 32);
        // E hills (moved far East past X = 165)
        hill(175, -35, 36, 16, 55);
        hill(168, 42, 40, 13, 50);
        // W hills (moved far West past X = -165)
        hill(-172, -28, 38, 18, 54);
        hill(-165, 48, 42, 13, 50, hillDark);
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

    _wireNetwork() {
        // Draw decorative overhead wires between alley intersection points
        const wireMat = new THREE.LineBasicMaterial({ color: 0x18182a });
        const wire = (ax, ay, az, bx, by, bz, sag = 0.5) => {
            const pts = [];
            for (let t = 0; t <= 1; t += 0.1) {
                const x = THREE.MathUtils.lerp(ax, bx, t);
                const y = THREE.MathUtils.lerp(ay, by, t) - Math.sin(t * Math.PI) * sag;
                const z = THREE.MathUtils.lerp(az, bz, t);
                pts.push(new THREE.Vector3(x, y, z));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            this.scene.add(new THREE.Line(geo, wireMat));
        };

        // Draw some cool tech/cyber lines running across the Code Section!
        wire(-90, 6, -50, -90, 6, 50, 0.4);
        wire(-66, 6, -50, -66, 6, 50, 0.4);
        wire(-90, 6, 0, -30, 6, 0, 0.5);
    }

    // ─── Back-compat stubs (main.js calls these directly sometimes) ─────────────
    cloudMeshes() { return this._cloudMeshes || []; }
}