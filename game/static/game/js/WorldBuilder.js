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
    }

    // Organic cell grid mapping helper
    _getCellType(c, r) {
        // Main winding road (curving through the city)
        const isMainRoad = 
            (c === 8 && r >= 0 && r <= 8) ||
            (r === 8 && c >= 0 && c <= 8) ||
            (c === 8 && r >= 8 && r <= 12) ||
            (r === 12 && c >= 8 && c <= 15) ||
            (c === 15 && r >= 7 && r <= 12) ||
            (r === 7 && c >= 15 && c <= 21);

        // Alleys (galleys/narrow paths that let the player walk inside blocks)
        const isAlley = 
            (c === 3) ||
            (c === 18) ||
            (r === 3) ||
            (r === 13) ||
            (c === 12 && r >= 4 && r <= 12);
        
        // Market Plaza (central open gathering spot)
        const isPlaza = (c >= 9 && c <= 11 && r >= 9 && r <= 11);

        if (isMainRoad) return 'road';
        if (isPlaza) return 'plaza';
        if (isAlley) return 'alley';
        return 'bld';
    }

    _getAssignedBuilding(x, z) {
        const buildings = this.data.buildings || [];
        return buildings.find(b => Math.hypot(b.x - x, b.z - z) < 4.0);
    }

    // ─── Road Network ────────────────────────────────────────────────────────
    _roadNetwork() {
        const roadMat = toonMat(0x748088);
        const alleyMat = toonMat(0x606c74);
        const plazaMat = toonMat(0xc4b4a0);

        const road = (x, z, w, d) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, 0.05, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };
        const alley = (x, z, w, d) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), alleyMat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, 0.05, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };
        const plaza = (x, z, w, d) => {
            const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), plazaMat);
            m.rotation.x = -Math.PI / 2;
            m.position.set(x, 0.06, z);
            m.receiveShadow = true;
            this.scene.add(m);
        };

        for (let r = 0; r < 16; r++) {
            const cz = r * 12 - 90;
            for (let c = 0; c < 22; c++) {
                const cx = c * 12 - 126;
                const type = this._getCellType(c, r);

                if (type === 'road') {
                    road(cx, cz, 12.2, 12.2);
                } else if (type === 'alley') {
                    alley(cx, cz, 12.2, 12.2);
                } else if (type === 'plaza') {
                    plaza(cx, cz, 12.2, 12.2);
                }
            }
        }
    }

    // ─── Crosswalks & Lane Markings ──────────────────────────────────────────
    _crosswalks() {
        const white = toonMat(0xf8f8f4, { transparent: true, opacity: 0.85 });
        const yellow = toonMat(0xeec820, { transparent: true, opacity: 0.72 });

        // Simple lane markers and crosswalks at winding road nodes
        const cw = (cx, cz) => {
            for (let s = -2; s <= 2; s++) {
                const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 5.0), white);
                m.rotation.x = -Math.PI / 2;
                m.position.set(cx + s * 1.8, 0.08, cz);
                this.scene.add(m);
            }
        };

        cw(-30, 6);
        cw(54, -6);
        cw(18, 6);
    }

    // ─── Building Rows (Customized Organic Placement) ────────────────────────
    _buildingRows() {
        let s = 100;

        for (let r = 0; r < 16; r++) {
            const cz = r * 12 - 90;
            for (let c = 0; c < 22; c++) {
                const cx = c * 12 - 126;
                const type = this._getCellType(c, r);
                if (type !== 'bld') continue;

                // Check if a service or project building is assigned here
                const assignedPoi = this._getAssignedBuilding(cx, cz);
                
                // Determine facing direction by checking neighboring road cells
                let facingAngle = 0;
                if (c > 0 && this._getCellType(c - 1, r) !== 'bld') facingAngle = -Math.PI / 2;
                else if (c < 21 && this._getCellType(c + 1, r) !== 'bld') facingAngle = Math.PI / 2;
                else if (r > 0 && this._getCellType(c, r - 1) !== 'bld') facingAngle = 0;
                else if (r < 15 && this._getCellType(c, r + 1) !== 'bld') facingAngle = Math.PI;

                const w = 9.4;
                const d = 9.4;
                const h = 6.5 + Math.abs((s * 2711 + 7) % 11);

                let bld;
                if (assignedPoi) {
                    bld = this._buildThemedBuilding(w, h, d, s, assignedPoi);
                } else {
                    bld = buildJapaneseBuilding(w, h, d, s);
                }

                bld.position.set(cx, 0, cz);
                bld.rotation.y = facingAngle;
                this.scene.add(bld);
                
                this.colliders.push({ x: cx, z: cz, w, d, h, floorY: 0 });
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
            // Cyber code antenna/satellite dish
            const dish = toonMesh(new THREE.SphereGeometry(0.7, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x8898a8);
            dish.mesh.position.set(0, h + 0.5, 0);
            dish.mesh.rotation.x = -Math.PI / 4;
            g.add(dish.group);
            
            const mast = toonMesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), 0x4a4a4a);
            mast.mesh.position.set(0, h + 0.9, 0);
            g.add(mast.group);
        } else if (district === 'marketing') {
            // Paper lanterns
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