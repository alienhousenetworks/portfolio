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
            new THREE.PlaneGeometry(WORLD.size, WORLD.size),
            toonMat(0x90c87a)
        );
        outer.rotation.x = -Math.PI / 2;
        outer.receiveShadow = true;
        this.scene.add(outer);

        // City concrete base slab (light teal-grey, like the abeto.co streets) - Expanded to 280 x 220
        const city = new THREE.Mesh(
            new THREE.PlaneGeometry(280, 220),
            toonMat(0xa8b4b0)
        );
        city.rotation.x = -Math.PI / 2;
        city.position.y = 0.02;
        city.receiveShadow = true;
        this.scene.add(city);

        // Slight curb bump at city edge (visual border between grass and city)
        const curb = toonMesh(new THREE.BoxGeometry(280, 0.12, 220), 0xb8c0bc, { outline: false });
        curb.mesh.position.y = 0.1;
        this.scene.add(curb.group);

        // Draw River Harmony along the West side (X ≈ -115)
        const riverGeo = new THREE.PlaneGeometry(24, 220);
        const riverMat = toonMat(0x7ac4d0, { transparent: true, opacity: 0.85 });
        const river = new THREE.Mesh(riverGeo, riverMat);
        river.rotation.x = -Math.PI / 2;
        river.position.set(-115, 0.03, 0);
        this.scene.add(river);
    }

    // City of Harmonia layout mathematical checks
    _isRoadOrPark(x, z) {
        // Central Flower Park (Radius 35 around (0,0))
        if (Math.hypot(x, z) < 35) return true;

        // Showroom & Retail Drive (Z = -75, width 8)
        if (Math.abs(z - (-75)) < 5) return true;

        // Road Market & Bazaar (Z = 55, width 8)
        if (Math.abs(z - 55) < 5) return true;

        // Mohr Ave (X = -45, width 7)
        if (Math.abs(x - (-45)) < 4.5 && z > -75 && z < 55) return true;

        // Tech Lanes (X = 45 and X = 90, width 7)
        if ((Math.abs(x - 45) < 4.5 || Math.abs(x - 90) < 4.5) && z > -75 && z < 55) return true;

        // E-W streets at Z = -30 and Z = 15
        if ((Math.abs(z - (-30)) < 4 || Math.abs(z - 15) < 4) && Math.abs(x) < 120) return true;

        // Diagonal Promenade: z = -0.6 * x
        const distToPromenade = Math.abs(0.6 * x + z) / Math.sqrt(0.6 * 0.6 + 1 * 1);
        if (distToPromenade < 5) return true;

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
        const swMat = toonMat(0xbcc4c0);

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

        // 5. E-W Connecting Streets (Z = -30 and Z = 15)
        road(0, -30, 260, 7);
        road(0, 15, 260, 7);

        // 6. Diagonal Promenade (A1) from SW to NE
        const promAngle = Math.atan2(-130, 180); // ≈ -0.62 rad
        road(0, -10, 240, 9, promAngle);

        // 7. Central Flower Park and Atrium
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
        // wireframe to represent structural panels
        domeFrame.material.wireframe = true;
        this.scene.add(domeFrame);
    }

    // ─── Crosswalks & Lane Markings ──────────────────────────────────────────
    _crosswalks() {
        // Decorative crosswalk line markers at main intersections
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

    // ─── Building Rows (Customized Organic Placement) ────────────────────────
    _buildingRows() {
        let s = 100;
        const cellSpacing = 13.5;

        // Generate buildings in grid cells that are NOT roads, park, or river
        for (let xCoord = -120; xCoord <= 120; xCoord += cellSpacing) {
            for (let zCoord = -90; zCoord <= 90; zCoord += cellSpacing) {
                if (this._isRoadOrPark(xCoord, zCoord)) continue;

                // Check if a service or project building is assigned here
                const assignedPoi = this._getAssignedBuilding(xCoord, zCoord);
                
                // Rotation based on sector
                let facingAngle = 0;
                if (xCoord > 45) facingAngle = -Math.PI / 2; // Tech section faces West
                else if (xCoord < -45) facingAngle = Math.PI / 2; // Residential faces East
                else if (zCoord < 0) facingAngle = Math.PI; // North side faces South
                else facingAngle = 0; // South side faces North

                const w = 9.8;
                const d = 9.8;
                const h = 7.0 + Math.abs((s * 2711 + 7) % 11);

                let bld;
                if (assignedPoi) {
                    bld = this._buildThemedBuilding(w, h, d, s, assignedPoi);
                } else {
                    bld = buildJapaneseBuilding(w, h, d, s);
                }

                bld.position.set(xCoord, 0, zCoord);
                bld.rotation.y = facingAngle;
                this.scene.add(bld);
                
                this.colliders.push({ x: xCoord, z: zCoord, w, d, h, floorY: 0 });
                s++;
            }
        }
    }

    _buildThemedBuilding(w, h, d, seed, poi) {
        const g = new THREE.Group();
        const district = poi.district || '';

        let wallCol = 0xbcc0bc;
        let accentCol = 0x48d2c9;

        if (district === 'software') {
            wallCol = 0x22262d;      // Cool dark tech wall
            accentCol = 0x00ffff;    // Cyber neon cyan
        } else if (district === 'marketing') {
            wallCol = 0xd4cec8;      // Warm market concrete
            accentCol = 0xff5533;    // Bright red-orange awning/signs
        } else {
            wallCol = 0xc0c4bc;
            accentCol = 0xf5c842;
        }

        // Main body
        const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallCol);
        body.mesh.position.y = h / 2;
        body.mesh.castShadow = true;
        body.mesh.receiveShadow = true;
        g.add(body.group);

        // Accent strip
        const strip = toonMesh(new THREE.BoxGeometry(w + 0.1, 0.4, d + 0.1), accentCol, { outline: false });
        strip.mesh.position.y = 3.2;
        g.add(strip.group);

        // Large display window
        const glassMat = toonMat(accentCol, { emissive: accentCol, emissiveIntensity: 0.35 });
        const shop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 2.2, 0.1), glassMat);
        shop.position.set(0, 1.1, d / 2 + 0.02);
        g.add(shop);

        // Hanging sign
        const frameMat = toonMat(0x1a1a1a);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.75, 0.15), frameMat);
        sign.position.set(0, h - 1.0, d / 2 + 0.05);
        g.add(sign);

        // Rooftop decorations
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
                const lantern = toonMesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 6), 0xff4422, { emissive: 0xff4422, emissiveIntensity: 0.4 });
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
        for (let r = 0; r < 16; r++) {
            const cz = r * 12 - 90;
            for (let c = 0; c < 22; c++) {
                const cx = c * 12 - 126;
                const type = this._getCellType(c, r);
                
                if (type === 'bld') {
                    const adjRoad = 
                        (c > 0 && this._getCellType(c - 1, r) !== 'bld') ||
                        (c < 21 && this._getCellType(c + 1, r) !== 'bld') ||
                        (r > 0 && this._getCellType(c, r - 1) !== 'bld') ||
                        (r < 15 && this._getCellType(c, r + 1) !== 'bld');
                        
                    if (adjRoad) {
                        if (s % 7 === 0) {
                            const vm = createVendingMachine(s);
                            vm.position.set(cx, 0, cz + 4.8);
                            this.scene.add(vm);
                        } else if (s % 5 === 0) {
                            const lamp = createStreetLamp();
                            lamp.position.set(cx + 4.8, 0, cz);
                            this.scene.add(lamp);
                        } else if (s % 9 === 0) {
                            const b = createBench();
                            b.position.set(cx, 0, cz - 4.8);
                            this.scene.add(b);
                        }
                    }
                }
                
                if (type === 'plaza') {
                    if ((c + r) % 3 === 0) {
                        const stall = this._createMarketStall(s);
                        stall.position.set(cx, 0, cz);
                        stall.rotation.y = (s % 4) * (Math.PI / 2);
                        this.scene.add(stall);
                        this.colliders.push({ x: cx, z: cz, w: 3, d: 3, h: 2.5, floorY: 0 });
                    }
                }
                s++;
            }
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