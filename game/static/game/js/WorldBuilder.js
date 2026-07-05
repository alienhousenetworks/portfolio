import * as THREE from 'three';
import { WORLD, PALETTE, POI_TYPES } from './config.js';
import { DISTRICT_DEFS, getDistrictAt } from './Districts.js';
import { getZoneAt, propDensity } from './CityZones.js';
import {
    createZoneBuilding, createServiceBuilding,
    createVendingMachine, createUtilityPole, createSchool,
} from './Buildings.js';
import { toonMat, toonMesh, sketchLines, setupCityLighting, INK } from './ToonStyle.js';
import {
    createCherryTree, createLargeTree, createBambooCluster, createFountain,
    createBench, createCrosswalk, createSidewalk, scatterStreetProps,
    createPineTree, createWillowTree, createRockCluster, createBridgeLamp,
} from './Props.js';

export class WorldBuilder {
    constructor(scene, gameData, terrain = null) {
        this.scene = scene;
        this.data = gameData;
        this.terrain = terrain;
        this.pois = [];
        this.colliders = [];
        this.buildingSites = new Set();
    }

    build() {
        this._skyDome();
        this._clouds();
        this._lights();
        this._ground();
        this._mountains();
        this._beach();
        this._waterfall();
        this._districtZones();
        this._roadGrid();
        this._city();
        this._landmarks();
        this._dbBuildings();
        this._parks();
        this._nature();
        this._riverForest();
        this._urbanDetails();
        this._pois();
        if (this.terrain) this.colliders.push(...this.terrain.wallColliders);
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

    _inPark(x, z, margin = 0) {
        return Math.hypot(x - WORLD.parkX, z - WORLD.parkZ) < WORLD.parkRadius + margin;
    }

    _inRiver(x, z, margin = 0) {
        return false;
    }

    _markSite(x, z, w = 24, d = 24, h = 0) {
        this.buildingSites.add(`${Math.round(x)},${Math.round(z)}`);
        this.colliders.push({ x, z, w, d, h, floorY: this.getTerrainHeight(x, z) });
    }

    _isOccupied(cx, cz) {
        for (const key of this.buildingSites) {
            const [bx, bz] = key.split(',').map(Number);
            if (Math.hypot(cx - bx, cz - bz) < 20) return true;
        }
        return false;
    }

    // ── Sky dome ────────────────────────────────────────────────────────────

    _skyDome() {
        // Large hemisphere for gradient sky
        const skyGeo = new THREE.SphereGeometry(580, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        // Vertex-color gradient: top = deep blue, horizon = lighter
        const colors = [];
        const posArr = skyGeo.attributes.position;
        for (let i = 0; i < posArr.count; i++) {
            const y = posArr.getY(i);
            const t = Math.max(0, Math.min(1, y / 580));
            // lerp from horizon color to zenith
            const r = THREE.MathUtils.lerp(0.72, 0.23, t);
            const g = THREE.MathUtils.lerp(0.88, 0.51, t);
            const b = THREE.MathUtils.lerp(0.96, 0.76, t);
            colors.push(r, g, b);
        }
        skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        sky.rotation.x = 0;
        this.scene.add(sky);

        this.scene.fog = new THREE.FogExp2(PALETTE.fog, 0.0018);
    }

    // ── Clouds ──────────────────────────────────────────────────────────────

    _clouds() {
        this._cloudMeshes = [];
        const cloudMat = toonMat(0xfcfcfc, { transparent: true, opacity: 0.88 });

        for (let i = 0; i < 22; i++) {
            const g = new THREE.Group();
            const seed = i * 13 + 7;
            const cx = ((seed * 37 + 11) % 600) - 300;
            const cz = ((seed * 53 + 19) % 600) - 300;
            const cy = 85 + (seed % 40);

            const puffs = 3 + (seed % 3);
            for (let p = 0; p < puffs; p++) {
                const r = 6 + (seed + p) % 8;
                const cloud = new THREE.Mesh(
                    new THREE.SphereGeometry(r, 7, 5),
                    cloudMat
                );
                cloud.scale.set(1.4, 0.55, 1.0);
                cloud.position.set(p * r * 0.9, (p % 2) * 2 - 1, (p * 3 % 7) - 3);
                cloud.castShadow = false;
                g.add(cloud);
            }
            g.position.set(cx, cy, cz);
            this.scene.add(g);
            this._cloudMeshes.push({ g, speed: 0.8 + (seed % 10) * 0.12, dir: (seed % 2 === 0 ? 1 : -1) });
        }
    }

    _lights() {
        setupCityLighting(this.scene);
    }

    // ── Ground ──────────────────────────────────────────────────────────────

    _ground() {
        // Main grass plane
        const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, 8, 8);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, toonMat(PALETTE.grass));
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        // Subtle grass variation patches
        for (let i = 0; i < 60; i++) {
            const s = i * 17 + 3;
            const px = ((s * 41) % 580) - 290;
            const pz = ((s * 67) % 580) - 290;
            if (this._inRiver(px, pz, 20)) continue;
            const col = i % 3 === 0 ? PALETTE.grassLight : (i % 3 === 1 ? PALETTE.grassDark : PALETTE.grassHighland);
            const patch = new THREE.Mesh(
                new THREE.PlaneGeometry(15 + (s % 20), 12 + (s % 15)),
                toonMat(col, { transparent: true, opacity: 0.4 })
            );
            patch.rotation.x = -Math.PI / 2;
            patch.position.set(px, 0.01, pz);
            this.scene.add(patch);
        }
    }

    // ── Mountains ───────────────────────────────────────────────────────────

    _mountains() {
        // Four mountain ranges: North, South, East, West
        const ranges = [
            { dir: 'N', peaks: this._northMountains() },
            { dir: 'S', peaks: this._southMountains() },
            { dir: 'E', peaks: this._eastMountains() },
            { dir: 'W', peaks: this._westMountains() },
        ];
        // ranges is just for reference; peaks added inside each method
    }

    _buildMountain(cx, cy_base, cz, radius, height, seed) {
        const type = seed % 6;
        if (type === 0) {
            this._buildShatteredSpire(cx, cy_base, cz, radius, height, seed);
        } else if (type === 1) {
            this._buildLushTerraces(cx, cy_base, cz, radius, height, seed);
        } else if (type === 2) {
            this._buildObsidianFang(cx, cy_base, cz, radius, height, seed);
        } else if (type === 3) {
            this._buildCrystalSpine(cx, cy_base, cz, radius, height, seed);
        } else if (type === 4) {
            this._buildFloatingIslands(cx, cy_base, cz, radius, height, seed);
        } else {
            this._buildForestMaw(cx, cy_base, cz, radius, height, seed);
        }

        // Pine forest on lower slopes of mountain bases
        if (height < 80) {
            const pineCount = 5 + (seed % 7);
            for (let p = 0; p < pineCount; p++) {
                const angle = (p / pineCount) * Math.PI * 2 + seed * 0.3;
                const r = radius * (0.55 + (p % 3) * 0.15);
                const px = cx + Math.cos(angle) * r;
                const pz = cz + Math.sin(angle) * r;
                const pine = createPineTree(seed + p, 0.75 + (p % 3) * 0.12);
                const ty = this.getTerrainHeight(px, pz);
                pine.position.set(px, ty, pz);
                this.scene.add(pine);
            }
        }
    }

    _buildShatteredSpire(cx, cy_base, cz, radius, height, seed) {
        const g = new THREE.Group();
        g.position.set(cx, cy_base, cz);

        // Core Energy
        const core = toonMesh(new THREE.CylinderGeometry(radius * 0.12, radius * 0.12, height, 6), 0x00ffff, {
            emissive: 0x0088ff,
            emissiveIntensity: 1.5
        });
        core.mesh.position.y = height / 2;
        g.add(core.group);

        // Fractured Shells
        const rockMatColor = 0x4a4a5a;
        for (let i = 0; i < 15; i++) {
            const rockGeo = new THREE.TetrahedronGeometry((0.15 + (i % 3) * 0.08) * radius, 1);
            const rock = toonMesh(rockGeo, rockMatColor);
            
            const angle = (i / 15) * Math.PI * 2 + (i * 0.7);
            const r = radius * (0.3 + (i % 3) * 0.22);
            rock.mesh.position.set(
                Math.cos(angle) * r,
                ((i / 15) * height),
                Math.sin(angle) * r
            );
            rock.mesh.rotation.set(i * 0.5, i * 0.8, 0);
            g.add(rock.group);
        }
        this.scene.add(g);
    }

    _buildLushTerraces(cx, cy_base, cz, radius, height, seed) {
        const g = new THREE.Group();
        g.position.set(cx, cy_base, cz);

        const numLevels = 7;
        const levelHeight = height / numLevels;
        let currentRadius = radius;
        const terraceData = [];

        // Colors matching aesthetic
        const rockColor = 0x7a6c62;
        const grassColor = PALETTE.grass;
        const waterColor = PALETTE.riverShallow;
        const treeFoliageColor = 0x8a3ba0; // Purple foliage
        const woodColor = PALETTE.wood[0];

        for (let i = 0; i < numLevels; i++) {
            const nextRadius = currentRadius - (radius * 0.12);
            
            // 1. Rock Base
            const rock = toonMesh(new THREE.CylinderGeometry(nextRadius, currentRadius, levelHeight, 16), rockColor);
            rock.mesh.position.y = (i * levelHeight) + (levelHeight / 2);
            g.add(rock.group);

            // 2. Grass Layer on top
            const grassHeight = 0.4;
            const grass = toonMesh(new THREE.CylinderGeometry(nextRadius, nextRadius, grassHeight, 16), grassColor);
            grass.mesh.position.y = (i * levelHeight) + levelHeight + grassHeight / 2;
            g.add(grass.group);

            terraceData.push({ y: (i * levelHeight) + levelHeight + grassHeight / 2, radius: nextRadius });

            // 3. Add Purple Trees around the perimeter (leaving a gap for the waterfall at angle 0)
            const numTrees = 4 + (seed % 3);
            for (let t = 0; t < numTrees; t++) {
                const angle = (t / numTrees) * Math.PI * 2 + (seed * 0.5);
                if (angle > -0.5 && angle < 0.5) continue; // Gap for waterfall

                const treeRadius = nextRadius - 1.2;
                const treeSize = 0.6 + (t % 3) * 0.2;
                const tree = toonMesh(new THREE.SphereGeometry(treeSize, 12, 12), treeFoliageColor);
                
                tree.mesh.position.set(
                    Math.cos(angle) * treeRadius,
                    ((i * levelHeight) + levelHeight + grassHeight) + treeSize * 0.5,
                    Math.sin(angle) * treeRadius
                );
                g.add(tree.group);
            }

            currentRadius = nextRadius;
        }

        // 4. Create Waterfall Cascades (down Z axis)
        for (let i = 1; i < numLevels; i++) {
            const upper = terraceData[i];
            const lower = terraceData[i - 1];
            
            const waterWidth = 1.6 + ((numLevels - i) * 0.4); 
            const waterHeight = (upper.y - lower.y) * 1.4;

            const water = toonMesh(new THREE.PlaneGeometry(waterWidth, waterHeight), waterColor, { transparent: true, opacity: 0.85 });
            
            water.mesh.position.set(0, (upper.y + lower.y) / 2, upper.radius - 0.1);
            water.mesh.rotation.x = -Math.PI / 8; // angle it down/outwards slightly
            
            g.add(water.group);
        }

        // 5. Add Temple at the Peak
        const topLevel = terraceData[numLevels - 1];
        const base = toonMesh(new THREE.BoxGeometry(3, 1.5, 3), woodColor);
        base.mesh.position.set(0, topLevel.y + 0.75, 0);
        g.add(base.group);

        const roof = toonMesh(new THREE.ConeGeometry(2.5, 2, 4), treeFoliageColor);
        roof.mesh.position.set(0, topLevel.y + 2.5, 0);
        roof.mesh.rotation.y = Math.PI / 4;
        g.add(roof.group);

        this.scene.add(g);
    }

    _buildObsidianFang(cx, cy_base, cz, radius, height, seed) {
        const g = new THREE.Group();
        g.position.set(cx, cy_base, cz);

        const magmaCol = 0xff2200;
        const obsidianCol = 0x1a1a1c;

        // 1. The Glowing Core (Magma Base)
        const core = toonMesh(new THREE.ConeGeometry(radius, height, 16), magmaCol, {
            emissive: 0xff3300,
            emissiveIntensity: 1.5
        });
        core.mesh.position.y = height / 2;
        g.add(core.group);

        // Magma Glow PointLight
        const light = new THREE.PointLight(0xff4500, 2.0, radius * 2.5);
        light.position.set(0, height * 0.4, 0);
        g.add(light);

        // 2. Procedural Obsidian Rock Shell (optimized count for performance)
        const numRocks = 120;
        for (let i = 0; i < numRocks; i++) {
            const yPos = (i / numRocks) * height;
            const angle = (i * 2.39) % (Math.PI * 2); // Fibonacci spiral-like angle distribution
            const currentRadius = radius * (1.0 - (yPos / height));
            const size = (0.08 + (i % 5) * 0.03) * radius * (1.0 - (yPos / height) * 0.5);

            const rock = toonMesh(new THREE.DodecahedronGeometry(size, 0), obsidianCol);
            rock.mesh.position.set(
                Math.cos(angle) * (currentRadius + 0.1),
                yPos,
                Math.sin(angle) * (currentRadius + 0.1)
            );
            rock.mesh.rotation.set((i * 0.3) % Math.PI, (i * 0.7) % Math.PI, (i * 1.1) % Math.PI);
            rock.mesh.scale.set(1.0, 1.4, 0.6); // Flat slab shape
            g.add(rock.group);
        }

        // 3. Magma River Tube
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, height - 1.5, 0),
            new THREE.Vector3(radius * 0.18, height * 0.6, radius * 0.32),
            new THREE.Vector3(radius * 0.12, height * 0.3, radius * 0.68),
            new THREE.Vector3(radius * 0.28, 0.5, radius * 1.02)
        ]);
        const riverGeo = new THREE.TubeGeometry(curve, 16, radius * 0.07, 6, false);
        const river = toonMesh(riverGeo, magmaCol, {
            emissive: 0xff3300,
            emissiveIntensity: 1.5
        });
        g.add(river.group);

        // 4. Static smoke clouds at the peak
        const smokeMat = toonMat(0x444444, { transparent: true, opacity: 0.6 });
        for (let i = 0; i < 5; i++) {
            const smoke = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.12, 8, 8), smokeMat);
            smoke.position.set(
                (Math.sin(i * 3) * radius * 0.1),
                height + (i * radius * 0.08),
                (Math.cos(i * 3) * radius * 0.1)
            );
            smoke.scale.set(1.4, 0.8, 1.2);
            g.add(smoke);
        }

        this.scene.add(g);
    }

    _buildCrystalSpine(cx, cy_base, cz, radius, height, seed) {
        const g = new THREE.Group();
        g.position.set(cx, cy_base, cz);
        const crystalColor = 0xaaccff;

        for (let i = 0; i < 8; i++) {
            const crystalGeo = new THREE.OctahedronGeometry(radius * 0.28, 0);
            const crystal = toonMesh(crystalGeo, crystalColor, {
                transparent: true,
                opacity: 0.85,
                emissive: crystalColor,
                emissiveIntensity: 0.15
            });
            
            const scaleY = 1.5 + (i % 3) * 0.8;
            crystal.mesh.scale.set(1.0, scaleY, 1.0);
            
            const angle = (i / 8) * Math.PI * 2;
            const dist = radius * 0.35;
            crystal.mesh.position.set(
                Math.cos(angle) * dist,
                (radius * 0.2) * scaleY,
                Math.sin(angle) * dist
            );
            
            crystal.mesh.rotation.z = Math.cos(angle) * 0.3;
            crystal.mesh.rotation.x = Math.sin(angle) * 0.3;
            crystal.mesh.rotation.y = i * 0.7;
            g.add(crystal.group);
        }
        this.scene.add(g);
    }

    _buildFloatingIslands(cx, cy_base, cz, radius, height, seed) {
        const g = new THREE.Group();
        g.position.set(cx, cy_base, cz);

        const islands = [
            { x: 0, y: height, z: 0, r: radius * 0.5 },
            { x: -radius * 0.6, y: height * 0.8, z: radius * 0.35, r: radius * 0.35 },
            { x: radius * 0.55, y: height * 1.1, z: -radius * 0.25, r: radius * 0.4 }
        ];

        islands.forEach(data => {
            const base = toonMesh(new THREE.ConeGeometry(data.r, data.r * 2.0, 7), 0x666677);
            base.mesh.rotation.x = Math.PI;
            base.mesh.position.set(data.x, data.y - data.r, data.z);
            g.add(base.group);

            const top = toonMesh(new THREE.CylinderGeometry(data.r * 0.9, data.r, 0.4, 7), PALETTE.grass);
            top.mesh.position.set(data.x, data.y, data.z);
            g.add(top.group);
        });

        const bridge = toonMesh(new THREE.CylinderGeometry(radius * 0.04, radius * 0.04, height * 0.75, 8), 0xee88ff, {
            transparent: true,
            opacity: 0.7,
            emissive: 0xee88ff,
            emissiveIntensity: 0.5
        });
        bridge.mesh.position.set(-radius * 0.3, height * 0.9, radius * 0.18);
        bridge.mesh.rotation.z = Math.PI / 4;
        bridge.mesh.rotation.y = -Math.PI / 6;
        g.add(bridge.group);

        this.scene.add(g);
    }

    _buildForestMaw(cx, cy_base, cz, radius, height, seed) {
        const g = new THREE.Group();
        g.position.set(cx, cy_base, cz);

        const scale = radius * 0.055;
        const rockColor = 0x82857d;
        const mossColor = 0x5b7548;
        const barkColor = 0x3d3224;
        const leafColor = 0x4a6e38;
        const ruinColor = 0x6e7368;
        const mushroomGlowColor = 0x66ffcc;

        // Cave interior mysterious light
        const caveLight = new THREE.PointLight(0x4444ff, 2.0, 25 * scale);
        caveLight.position.set(0, 4 * scale, -5 * scale);
        g.add(caveLight);

        // 1. Dome Rocks & Mossy Patches
        const rockLayout = [
            { x: -6 * scale, y: 3 * scale, z: 2 * scale, s: 7 * scale },
            { x: 6 * scale, y: 3 * scale, z: 2 * scale, s: 7 * scale },
            { x: 0 * scale, y: 8 * scale, z: -2 * scale, s: 8 * scale },
            { x: -4 * scale, y: 6 * scale, z: -4 * scale, s: 6 * scale },
            { x: 4 * scale, y: 6 * scale, z: -4 * scale, s: 6 * scale },
            { x: 0 * scale, y: 3 * scale, z: -8 * scale, s: 8 * scale }
        ];

        rockLayout.forEach((data, idx) => {
            // Jagged rock
            const rock = toonMesh(new THREE.IcosahedronGeometry(data.s, 1), rockColor);
            rock.mesh.position.set(data.x, data.y, data.z);
            rock.mesh.scale.set(1.0, 1.2, 1.0);
            rock.mesh.rotation.set((idx * 0.4) % Math.PI, (idx * 0.7) % Math.PI, (idx * 1.1) % Math.PI);
            g.add(rock.group);

            // Moss patch on top
            const moss = toonMesh(new THREE.IcosahedronGeometry(data.s * 0.95, 1), mossColor);
            moss.mesh.position.set(data.x, data.y + (data.s * 0.18), data.z);
            moss.mesh.scale.set(1.05, 0.9, 1.05);
            moss.mesh.rotation.copy(rock.mesh.rotation);
            g.add(moss.group);
        });

        // Dark depth background plane
        const darkPlane = toonMesh(new THREE.PlaneGeometry(20 * scale, 15 * scale), 0x050508);
        darkPlane.mesh.position.set(0, 5 * scale, -10 * scale);
        g.add(darkPlane.group);

        // 2. Prehistoric Ruins (Broken Pillars)
        const pillarGeo = new THREE.BoxGeometry(1.2 * scale, 4 * scale, 1.2 * scale);
        
        const pillar1 = toonMesh(pillarGeo, ruinColor);
        pillar1.mesh.position.set(-2 * scale, 2 * scale, -1 * scale);
        pillar1.mesh.rotation.set(0, 0.4, 0.1);
        g.add(pillar1.group);

        const pillar2 = toonMesh(pillarGeo, ruinColor);
        pillar2.mesh.position.set(2.5 * scale, 1.5 * scale, -2 * scale);
        pillar2.mesh.rotation.set(-0.1, 0, -0.2);
        g.add(pillar2.group);

        // 3. Twisting Roots
        const createRoot = (pts, rad) => {
            const curve = new THREE.CatmullRomCurve3(pts);
            const tube = toonMesh(new THREE.TubeGeometry(curve, 16, rad, 6, false), barkColor);
            g.add(tube.group);
        };

        // Left draping root
        createRoot([
            new THREE.Vector3(-4 * scale, 14 * scale, -2 * scale),
            new THREE.Vector3(-7 * scale, 9 * scale, 2 * scale),
            new THREE.Vector3(-5 * scale, 4 * scale, 6 * scale),
            new THREE.Vector3(-8 * scale, 0, 8 * scale)
        ], 0.6 * scale);

        // Right framing root
        createRoot([
            new THREE.Vector3(4 * scale, 13 * scale, -1 * scale),
            new THREE.Vector3(6 * scale, 8 * scale, 4 * scale),
            new THREE.Vector3(8 * scale, 3 * scale, 5 * scale),
            new THREE.Vector3(5 * scale, 0, 9 * scale)
        ], 0.5 * scale);

        // 4. Top Forest Trees
        const createTopTree = (x, y, z, sc) => {
            const treeGroup = new THREE.Group();
            treeGroup.position.set(x, y, z);
            treeGroup.scale.setScalar(sc);

            const trunk = toonMesh(new THREE.CylinderGeometry(0.8 * scale, 1.2 * scale, 4 * scale, 7), barkColor);
            trunk.mesh.position.y = 2 * scale;
            treeGroup.add(trunk.group);

            const leafGeo = new THREE.IcosahedronGeometry(2.5 * scale, 1);
            for (let i = 0; i < 3; i++) {
                const leaves = toonMesh(leafGeo, leafColor);
                leaves.mesh.position.set(
                    (Math.sin(i * 2) * 0.8 * scale),
                    (4 * scale + i * 0.8 * scale),
                    (Math.cos(i * 2) * 0.8 * scale)
                );
                treeGroup.add(leaves.group);
            }
            g.add(treeGroup);
        };

        createTopTree(2 * scale, 13 * scale, -3 * scale, 1.5);
        createTopTree(-3 * scale, 11 * scale, -4 * scale, 1.2);
        createTopTree(-8 * scale, 5 * scale, 2 * scale, 0.8);

        // 5. Glowing Cyan Mushrooms
        const createMushroom = (x, y, z, sc) => {
            const shroom = new THREE.Group();
            shroom.position.set(x, y, z);
            shroom.scale.setScalar(sc);

            const stalk = toonMesh(new THREE.CylinderGeometry(0.1 * scale, 0.2 * scale, 1 * scale, 8), barkColor);
            stalk.mesh.position.y = 0.5 * scale;
            shroom.add(stalk.group);

            const cap = toonMesh(new THREE.SphereGeometry(0.6 * scale, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), mushroomGlowColor, {
                emissive: 0x22ccaa,
                emissiveIntensity: 2.0
            });
            cap.mesh.position.y = 1 * scale;
            cap.mesh.scale.set(1.0, 0.5, 1.0);
            shroom.add(cap.group);

            const shroomLight = new THREE.PointLight(0x66ffcc, 1.0, 4 * scale);
            shroomLight.position.y = 1 * scale;
            shroom.add(shroomLight);

            g.add(shroom);
        };

        createMushroom(-6 * scale, 2 * scale, 6 * scale, 1.2);
        createMushroom(-7 * scale, 1.5 * scale, 7 * scale, 0.8);
        createMushroom(6 * scale, 4 * scale, 5 * scale, 1.5);
        createMushroom(8 * scale, 1 * scale, 4 * scale, 1.0);

        this.scene.add(g);
    }

    _northMountains() {
        const configs = [
            { cx: -220, cz: -330, r: 80, h: 105, s: 1 },
            { cx: -120, cz: -320, r: 65, h: 88,  s: 4 },
            { cx:   20, cz: -340, r: 90, h: 118, s: 7 },
            { cx:  140, cz: -315, r: 70, h: 95,  s: 2 },
            { cx:  250, cz: -330, r: 75, h: 82,  s: 9 },
            // Near hills
            { cx: -190, cz: -290, r: 42, h: 52, s: 12 },
            { cx:   80, cz: -295, r: 38, h: 44, s: 15 },
            { cx:  195, cz: -285, r: 44, h: 50, s: 18 },
        ];
        configs.forEach(c => this._buildMountain(c.cx, 0, c.cz, c.r, c.h, c.s));
    }

    _southMountains() {
        const configs = [
            { cx: -230, cz: 330, r: 72, h: 90,  s: 3  },
            { cx: -100, cz: 340, r: 85, h: 112, s: 6  },
            { cx:   30, cz: 325, r: 65, h: 78,  s: 11 },
            { cx:  160, cz: 335, r: 80, h: 100, s: 14 },
            { cx:  260, cz: 320, r: 60, h: 72,  s: 17 },
            // Near hills
            { cx: -160, cz: 295, r: 36, h: 42, s: 20 },
            { cx:   90, cz: 290, r: 40, h: 48, s: 23 },
        ];
        configs.forEach(c => this._buildMountain(c.cx, 0, c.cz, c.r, c.h, c.s));
    }

    _eastMountains() {
        const configs = [
            { cx: 330, cz: -200, r: 68, h: 88,  s: 5  },
            { cx: 325, cz:  -50, r: 78, h: 102, s: 8  },
            { cx: 335, cz:  110, r: 62, h: 76,  s: 13 },
            { cx: 320, cz:  240, r: 55, h: 65,  s: 16 },
            // Near hills
            { cx: 295, cz: -130, r: 38, h: 46, s: 21 },
            { cx: 290, cz:  170, r: 34, h: 40, s: 24 },
        ];
        configs.forEach(c => this._buildMountain(c.cx, 0, c.cz, c.r, c.h, c.s));
    }

    _westMountains() {
        const configs = [
            { cx: -330, cz: -180, r: 75, h: 96,  s: 10 },
            { cx: -325, cz:  -20, r: 82, h: 108, s: 19 },
            { cx: -335, cz:  130, r: 58, h: 72,  s: 22 },
            { cx: -320, cz:  260, r: 70, h: 85,  s: 25 },
            // Near hills
            { cx: -292, cz: -100, r: 40, h: 48, s: 26 },
            { cx: -288, cz:  200, r: 36, h: 44, s: 27 },
        ];
        configs.forEach(c => this._buildMountain(c.cx, 0, c.cz, c.r, c.h, c.s));
    }

    // ── Beach ───────────────────────────────────────────────────────────────

    _beach() {
        const sand = toonMesh(new THREE.BoxGeometry(WORLD.size * 0.9, 0.22, 55), PALETTE.sand);
        sand.mesh.position.set(0, 0.06, 268);
        sand.mesh.receiveShadow = true;
        this.scene.add(sand.group);

        // Sandy dunes
        for (let i = 0; i < 8; i++) {
            const dune = toonMesh(
                new THREE.SphereGeometry(4 + i % 3, 8, 4),
                PALETTE.sand
            );
            dune.mesh.position.set(-180 + i * 52, 0.4, 272 + (i % 3) * 5);
            dune.mesh.scale.set(1.4, 0.35, 1.0);
            dune.mesh.receiveShadow = true;
            this.scene.add(dune.group);
        }

        const water = toonMesh(new THREE.BoxGeometry(WORLD.size, 0.15, 35), PALETTE.waterDeep, { transparent: true, opacity: 0.88 });
        water.mesh.position.set(0, -0.05, 297);
        this.scene.add(water.group);

        // Shallow water overlap
        const shallow = toonMesh(new THREE.BoxGeometry(WORLD.size * 0.85, 0.1, 18), PALETTE.riverShallow, { transparent: true, opacity: 0.65 });
        shallow.mesh.position.set(0, 0.02, 282);
        this.scene.add(shallow.group);
    }

    // ── River ───────────────────────────────────────────────────────────────

    _river() {
        const len = WORLD.riverLength;
        const w = WORLD.riverWidth;

        // Deep water
        const water = toonMesh(new THREE.BoxGeometry(w, 0.18, len), PALETTE.river);
        water.mesh.position.set(WORLD.riverX, -0.04, 0);
        water.mesh.receiveShadow = true;
        this.scene.add(water.group);

        // Shallow edges
        [-1, 1].forEach(side => {
            const shallow = toonMesh(
                new THREE.BoxGeometry(5, 0.12, len),
                PALETTE.riverShallow,
                { transparent: true, opacity: 0.75 }
            );
            shallow.mesh.position.set(WORLD.riverX + side * (w / 2 - 2.5), -0.01, 0);
            this.scene.add(shallow.group);
        });

        // Water ripple sketch lines
        for (let z = -len / 2; z < len / 2; z += 14) {
            sketchLines(this.scene, [
                new THREE.Vector3(WORLD.riverX - 4, 0.06, z),
                new THREE.Vector3(WORLD.riverX, 0.06, z + 7),
                new THREE.Vector3(WORLD.riverX + 5, 0.06, z + 13),
            ], 0xffffff, 0.35);
        }
        // Shorter cross ripples
        for (let z = -len / 2 + 7; z < len / 2; z += 22) {
            sketchLines(this.scene, [
                new THREE.Vector3(WORLD.riverX - 8, 0.06, z),
                new THREE.Vector3(WORLD.riverX + 8, 0.06, z + 4),
            ], 0xe8f4f8, 0.25);
        }

        // Embankment banks (grass slopes)
        [-1, 1].forEach(side => {
            const bank = toonMesh(new THREE.BoxGeometry(14, 1.4, len), PALETTE.embankment);
            bank.mesh.position.set(WORLD.riverX + side * (w / 2 + 7), 0.5, 0);
            bank.mesh.receiveShadow = true;
            this.scene.add(bank.group);

            // Stone edge along bank
            const stone = toonMesh(new THREE.BoxGeometry(1.5, 0.6, len), PALETTE.bridgeStone);
            stone.mesh.position.set(WORLD.riverX + side * (w / 2 + 0.75), 0.1, 0);
            stone.mesh.receiveShadow = true;
            this.scene.add(stone.group);
        });
    }

    // ── Bridges ─────────────────────────────────────────────────────────────

    _bridges() {
        const bridgeZs = [-130, -40, 65, 170];
        bridgeZs.forEach((z, bi) => {
            this._buildBridge(WORLD.riverX, z, bi);
        });
    }

    _buildBridge(rx, z, seed) {
        const g = new THREE.Group();
        const deckW = WORLD.riverWidth + 14;
        const deckH = 1.8;   // height above ground
        const deckThick = 0.55;

        g.position.set(rx, 0, z);

        // --- Stone arch supports below deck ---
        const archCount = 3;
        const archSpacing = WORLD.riverWidth / (archCount + 1);
        for (let a = 0; a < archCount; a++) {
            const ax = -WORLD.riverWidth / 2 + archSpacing * (a + 1);
            const arch = toonMesh(new THREE.BoxGeometry(2.5, deckH, 2.5), PALETTE.bridgeStone);
            arch.mesh.position.set(ax, deckH / 2 - 0.1, 0);
            arch.mesh.castShadow = true;
            g.add(arch.group);

            // Arch curve suggestion (a flat arc ring approximation)
            const ring = toonMesh(new THREE.TorusGeometry(2.0, 0.28, 6, 8, Math.PI), PALETTE.bridge);
            ring.mesh.rotation.z = Math.PI;
            ring.mesh.position.set(ax, deckH - 0.5, 0);
            g.add(ring.group);
        }

        // --- Bridge deck ---
        const deck = toonMesh(new THREE.BoxGeometry(deckW, deckThick, 8.5), PALETTE.bridge);
        deck.mesh.position.y = deckH + deckThick / 2;
        deck.mesh.castShadow = true;
        deck.mesh.receiveShadow = true;
        g.add(deck.group);

        // Stone edge trim
        [-1, 1].forEach(s => {
            const trim = toonMesh(new THREE.BoxGeometry(deckW, 0.18, 0.25), PALETTE.bridgeStone);
            trim.mesh.position.set(0, deckH + deckThick + 0.09, s * 4.25);
            g.add(trim.group);
        });

        // --- Rails ---
        [-1, 1].forEach(s => {
            const rail = toonMesh(new THREE.BoxGeometry(deckW, 0.18, 0.14), PALETTE.bridgeRail);
            rail.mesh.position.set(0, deckH + deckThick + 0.95, s * 4.1);
            g.add(rail.group);

            // Balusters
            const bCount = Math.floor(deckW / 2.2);
            for (let b = 0; b <= bCount; b++) {
                const bx = -deckW / 2 + b * (deckW / bCount);
                const baluster = toonMesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), PALETTE.bridgeStone);
                baluster.mesh.position.set(bx, deckH + deckThick + 0.5, s * 4.1);
                g.add(baluster.group);
            }
        });

        // --- Lamp posts on bridge ---
        const lampPositions = [-deckW / 2 + 2, -deckW / 2 + deckW * 0.35, deckW / 2 - deckW * 0.35, deckW / 2 - 2];
        lampPositions.forEach(lx => {
            [-1, 1].forEach(ls => {
                const lamp = createBridgeLamp();
                lamp.position.set(lx, deckH + deckThick, ls * 3.8);
                g.add(lamp);
            });
        });

        this.scene.add(g);

        // Add the bridge deck as a walkable platform collider
        const worldRx = rx;
        const deckTopY = deckH + deckThick;
        this.colliders.push({
            x: worldRx,
            z: z,
            w: deckW + 2,
            d: 10,
            h: deckTopY,      // height of bridge top surface
            floorY: 0,        // bridge sits at world origin
        });
    }

    // ── Waterfall ───────────────────────────────────────────────────────────

    _waterfall() {
        // At northern end of river — a cascading waterfall feature
        const wfX = WORLD.riverX;
        const wfZ = -WORLD.riverLength / 2 - 5;
        const g = new THREE.Group();
        g.position.set(wfX, 0, wfZ);

        const tiers = [
            { y: 12, w: WORLD.riverWidth + 4,  d: 6, depth: 4 },
            { y: 7,  w: WORLD.riverWidth + 10, d: 7, depth: 5 },
            { y: 3,  w: WORLD.riverWidth + 16, d: 8, depth: 4 },
        ];

        tiers.forEach(t => {
            // Ledge platform
            const ledge = toonMesh(new THREE.BoxGeometry(t.w, 0.8, t.d), PALETTE.bridgeStone);
            ledge.mesh.position.set(0, t.y, 0);
            ledge.mesh.castShadow = true;
            ledge.mesh.receiveShadow = true;
            g.add(ledge.group);

            // Falling water curtain
            const fall = toonMesh(
                new THREE.BoxGeometry(t.w * 0.7, t.depth, 0.35),
                PALETTE.riverShallow,
                { transparent: true, opacity: 0.65, outline: false }
            );
            fall.mesh.position.set(0, t.y - t.depth / 2 - 0.2, t.d / 2 - 0.1);
            g.add(fall.group);

            // Mist splash
            const mist = toonMesh(
                new THREE.BoxGeometry(t.w + 2, 0.3, 4),
                PALETTE.waterFoam,
                { transparent: true, opacity: 0.5, outline: false }
            );
            mist.mesh.position.set(0, t.y - t.depth + 0.4, t.d);
            g.add(mist.group);
        });

        // Rocky cliff face behind waterfall
        const cliff = toonMesh(new THREE.BoxGeometry(WORLD.riverWidth + 28, 18, 10), PALETTE.mountainRock);
        cliff.mesh.position.set(0, 9, -8);
        cliff.mesh.castShadow = true;
        g.add(cliff.group);

        // Cliff side rocks
        [-1, 1].forEach(side => {
            const rock = toonMesh(new THREE.BoxGeometry(14, 16, 12), PALETTE.mountain[0]);
            rock.mesh.position.set(side * (WORLD.riverWidth / 2 + 16), 8, -4);
            rock.mesh.castShadow = true;
            g.add(rock.group);

            // Pine trees on cliff
            for (let p = 0; p < 5; p++) {
                const pine = createPineTree(p + side * 10, 0.9);
                pine.position.set(side * (WORLD.riverWidth / 2 + 12 + p * 3), 15, -5 + p * 2);
                g.add(pine);
            }
        });

        this.scene.add(g);
    }

    // ── District zones (unchanged) ───────────────────────────────────────────

    _districtZones() {
        Object.values(DISTRICT_DEFS).forEach(d => {
            if (d.id === 'downtown') return;
            const pad = new THREE.Mesh(
                new THREE.CircleGeometry(d.radius, 32),
                toonMat(d.groundColor, { transparent: true, opacity: 0.18 })
            );
            pad.rotation.x = -Math.PI / 2;
            pad.position.set(d.x, 0.02, d.z);
            this.scene.add(pad);
        });
    }

    // ── Roads ───────────────────────────────────────────────────────────────

    _roadGrid() {
        const asphalt = toonMat(PALETTE.asphalt);
        const span = WORLD.size - 30;
        const half = Math.floor((WORLD.size / 2) / WORLD.roadSpacing);

        for (let i = -half; i <= half; i++) {
            const offset = i * WORLD.roadSpacing;
            if (Math.abs(offset - WORLD.riverX) < WORLD.riverWidth / 2 + 8) continue;

            const y = 0.03;
            const vRoad = new THREE.Mesh(new THREE.BoxGeometry(WORLD.roadWidth, 0.06, span), asphalt);
            vRoad.position.set(offset, y, 0);
            vRoad.receiveShadow = true;
            this.scene.add(vRoad);

            const hRoad = new THREE.Mesh(new THREE.BoxGeometry(span, 0.06, WORLD.roadWidth), asphalt);
            hRoad.position.set(0, y, offset);
            hRoad.receiveShadow = true;
            this.scene.add(hRoad);

            const sw = createSidewalk(WORLD.roadWidth + 2, span);
            sw.position.set(offset + WORLD.roadWidth * 0.65, 0.02, 0);
            this.scene.add(sw);

            if (i % 2 === 0 && Math.abs(offset) > 20) {
                this.scene.add(createCrosswalk(offset, offset, 'x'));
            }
        }

        this._slopeRoads();
    }

    _slopeRoads() {
        const asphalt = toonMat(PALETTE.asphalt);
        const curves = this.terrain?.slopes || [];
        curves.forEach(curve => {
            const pts = curve.pts;
            for (let s = 0; s < pts.length - 1; s++) {
                const [x1, z1, h1] = pts[s];
                const [x2, z2, h2] = pts[s + 1];
                const dx = x2 - x1, dz = z2 - z1;
                const len = Math.hypot(dx, dz);
                const angle = Math.atan2(dx, dz);
                const midH = (h1 + h2) / 2 + 0.04;
                const seg = new THREE.Mesh(new THREE.BoxGeometry(curve.w, 0.1, len), asphalt);
                seg.position.set((x1 + x2) / 2, midH, (z1 + z2) / 2);
                seg.rotation.y = angle;
                seg.rotation.x = -Math.atan2(h2 - h1, len);
                seg.receiveShadow = true;
                this.scene.add(seg);
            }
        });
    }

    // ── City buildings ───────────────────────────────────────────────────────

    _city() {
        const half = Math.floor((WORLD.size / 2 - 40) / WORLD.roadSpacing);
        let seed = 0;

        for (let gx = -half; gx <= half; gx++) {
            for (let gz = -half; gz <= half; gz++) {
                const cx = gx * WORLD.roadSpacing + WORLD.roadSpacing / 2;
                const cz = gz * WORLD.roadSpacing + WORLD.roadSpacing / 2;

                if (this._inPark(cx, cz, 20)) continue;
                if (this._inRiver(cx, cz, 14)) continue;
                if (Math.abs(cx) < 6 && Math.abs(cz) < 6) continue;
                if (this._isOccupied(cx, cz)) continue;

                const district = getDistrictAt(cx, cz);
                const gameDist = district.id !== 'downtown' ? district.id : null;
                const built = createZoneBuilding(cx, cz, seed++, gameDist);
                const ty = this.getTerrainHeight(cx, cz);
                built.group.position.y = ty;
                // Update collider floorY to actual terrain height
                if (built.collider) built.collider.floorY = ty;
                this.scene.add(built.group);
                this.colliders.push(built.collider);
                this._markSite(cx, cz, built.collider.w, built.collider.d, built.collider.h || 0);
            }
        }
    }

    // ── Landmarks ───────────────────────────────────────────────────────────

    _landmarks() {
        this._hqTower(0, -120);

        const school = createSchool(-150, -130, 1);
        const sty = this.getTerrainHeight(-150, -130);
        school.group.position.y = sty;
        if (school.collider) school.collider.floorY = sty;
        this.scene.add(school.group);
        this._markSite(-150, -130, 30, 24);

        const lib = createServiceBuilding(155, -125, { buildingStyle: 'consulting' });
        const lty = this.getTerrainHeight(155, -125);
        lib.group.position.y = lty;
        if (lib.collider) lib.collider.floorY = lty;
        this.scene.add(lib.group);
        this._markSite(155, -125, 20, 18);
    }

    _hqTower(x, z) {
        const g = new THREE.Group();
        const ty = this.getTerrainHeight(x, z);
        g.position.set(x, ty, z);
        const base = toonMesh(new THREE.BoxGeometry(26, 16, 16), PALETTE.concreteLight);
        base.mesh.position.y = 8;
        base.mesh.castShadow = true;
        g.add(base.group);
        const tower = toonMesh(new THREE.BoxGeometry(11, 28, 11), 0xdbd7ce);
        tower.mesh.position.y = 30;
        tower.mesh.castShadow = true;
        g.add(tower.group);
        const sign = toonMesh(new THREE.BoxGeometry(9, 1, 0.25), PALETTE.mint, { emissive: PALETTE.mint, emissiveIntensity: 0.1 });
        sign.mesh.position.set(0, 46, 5.6);
        g.add(sign.group);
        this.scene.add(g);
        this._markSite(x, z, 28, 18, 44);
    }

    // ── Database buildings ───────────────────────────────────────────────────

    _dbBuildings() {
        (this.data.buildings || []).forEach(b => {
            if (this._isOccupied(b.x, b.z)) return;
            const built = createServiceBuilding(b.x, b.z, b);
            const ty = this.getTerrainHeight(b.x, b.z);
            built.group.position.y = ty;
            if (built.collider) built.collider.floorY = ty;
            this.scene.add(built.group);
            this.colliders.push(built.collider);
            this._markSite(b.x, b.z, built.collider.w, built.collider.d, built.collider.h || 0);
            this._addPOI(
                b.id, b.type === 'project' ? POI_TYPES.PROJECT : POI_TYPES.SERVICE,
                b.x, b.z, 18,
                b.title, b.subtitle, b.panelContent || b.content || b.description,
                b.district
            );
        });
    }

    // ── Parks ────────────────────────────────────────────────────────────────

    _parks() {
        const ty = this.getTerrainHeight(WORLD.parkX, WORLD.parkZ);
        const fountain = createFountain();
        fountain.position.set(WORLD.parkX, ty, WORLD.parkZ);
        this.scene.add(fountain);

        // Ring of mixed trees
        for (let a = 0; a < 14; a++) {
            const angle = (a / 14) * Math.PI * 2;
            const r = 14 + (a % 4) * 4;
            const tx = WORLD.parkX + Math.cos(angle) * r;
            const tz = WORLD.parkZ + Math.sin(angle) * r;
            let tree;
            if (a % 4 === 0) tree = createCherryTree();
            else if (a % 4 === 1) tree = createLargeTree(a);
            else if (a % 4 === 2) tree = createLargeTree(a + 3);
            else tree = createCherryTree();
            tree.position.set(tx, ty, tz);
            this.scene.add(tree);
        }

        // Benches
        for (let a = 0; a < 6; a++) {
            const angle = (a / 6) * Math.PI * 2 + 0.4;
            const bench = createBench();
            bench.position.set(WORLD.parkX + Math.cos(angle) * 22, ty, WORLD.parkZ + Math.sin(angle) * 22);
            bench.rotation.y = angle + Math.PI;
            this.scene.add(bench);
        }

        // Park paths (cross-shaped)
        ['x', 'z'].forEach(axis => {
            const path = toonMesh(new THREE.BoxGeometry(
                axis === 'x' ? 3 : 44,
                0.06,
                axis === 'z' ? 3 : 44
            ), PALETTE.concrete);
            path.mesh.position.set(WORLD.parkX, ty + 0.03, WORLD.parkZ);
            this.scene.add(path.group);
        });

        // Wildflower patches
        for (let i = 0; i < 18; i++) {
            const angle = (i / 18) * Math.PI * 2;
            const r = 8 + (i % 4) * 5;
            const fx = WORLD.parkX + Math.cos(angle) * r + (i % 3) * 2 - 1;
            const fz = WORLD.parkZ + Math.sin(angle) * r + (i % 2) * 2 - 1;
            const cols = [PALETTE.pink, PALETTE.yellow, PALETTE.purple, PALETTE.mint, PALETTE.orange];
            const flower = toonMesh(
                new THREE.CylinderGeometry(0.15, 0.12, 0.45, 5),
                cols[i % cols.length],
                { outline: false }
            );
            flower.mesh.position.set(fx, ty + 0.22, fz);
            this.scene.add(flower.group);
        }
    }

    // ── General nature ───────────────────────────────────────────────────────

    _nature() {
        // Bamboo grove north-east
        for (let i = 0; i < 10; i++) {
            const bamboo = createBambooCluster();
            bamboo.position.set(-185 + i * 7, this.getTerrainHeight(-185 + i * 7, -245), -245 + (i % 3) * 6);
            this.scene.add(bamboo);
        }

        // Beach trees south
        for (let i = 0; i < 16; i++) {
            const x = -280 + i * 38;
            const z = 232 + (i % 5) * 12;
            const tree = i % 3 === 0 ? createWillowTree(i) : createLargeTree(i);
            tree.position.set(x, this.getTerrainHeight(x, z), z);
            this.scene.add(tree);
        }

        // Scattered trees in residential hills
        for (let i = 0; i < 20; i++) {
            const s = i * 19 + 5;
            const x = ((s * 43) % 280) - 140;
            const z = ((s * 71) % 280) - 140;
            if (this._inRiver(x, z, 20) || this._inPark(x, z, 25)) continue;
            if (this._isOccupied(x, z)) continue;
            const tree = i % 5 === 0 ? createCherryTree() : createLargeTree(i);
            tree.position.set(x, this.getTerrainHeight(x, z), z);
            this.scene.add(tree);
        }

        // Rock clusters near mountain bases
        const rockPositions = [
            [-210, -265], [195, -255], [-195, 268], [205, 262],
            [-240, -120], [238, -110], [-235, 140], [242, 135],
        ];
        rockPositions.forEach(([x, z], i) => {
            const rock = createRockCluster(i);
            rock.position.set(x, this.getTerrainHeight(x, z), z);
            this.scene.add(rock);
        });
    }

    // ── River forest (willows along banks) ──────────────────────────────────

    _riverForest() {
        const len = WORLD.riverLength;
        const bankOffset = WORLD.riverWidth / 2 + 16;

        for (let z = -len / 2 + 20; z < len / 2 - 20; z += 28) {
            [-1, 1].forEach(side => {
                const x = WORLD.riverX + side * bankOffset;
                const ty = this.getTerrainHeight(x, z);
                // Alternate between willow and large tree
                const seed = Math.abs(Math.round(z)) + side + 1;
                const tree = seed % 3 === 0 ? createWillowTree(seed) : createLargeTree(seed);
                tree.position.set(x + side * (seed % 5) - 2, ty, z + (seed % 9) - 4);
                this.scene.add(tree);
            });
        }
    }

    // ── Urban details ────────────────────────────────────────────────────────

    _urbanDetails() {
        const half = Math.floor((WORLD.size / 2 - 40) / WORLD.roadSpacing);
        let pi = 0;

        for (let gx = -half; gx <= half; gx++) {
            for (let gz = -half; gz <= half; gz++) {
                const cx = gx * WORLD.roadSpacing + WORLD.roadSpacing / 2;
                const cz = gz * WORLD.roadSpacing + WORLD.roadSpacing / 2;
                if (this._inRiver(cx, cz, 8)) continue;

                const zone = getZoneAt(cx, cz);
                const density = propDensity(zone);
                if (((gx * 13 + gz * 7) % 10) / 10 > density) continue;

                const px = cx + ((gx * 3 + gz) % 5) * 2 - 4;
                const pz = cz + ((gx + gz * 5) % 5) * 2 - 4;

                if ((gx + gz) % 4 === 0) {
                    const pole = createUtilityPole(px, pz);
                    pole.position.y = this.getTerrainHeight(px, pz);
                    this.scene.add(pole);
                }
                if ((gx * 2 + gz) % 7 === 0) {
                    const vm = createVendingMachine(px + 3, pz, pi++);
                    vm.position.y = this.getTerrainHeight(px + 3, pz);
                    this.scene.add(vm);
                }
                scatterStreetProps(this.scene, px - 2, pz + 2, zone, gx * 17 + gz, (x, z) => this.getTerrainHeight(x, z));
            }
        }
    }

    // ── POIs ─────────────────────────────────────────────────────────────────

    _pois() {
        const site = this.data.siteName || 'ALIENHOUSE';
        const hqBody = this.data.company?.hqContent || this._aboutText();
        this._addPOI('hq', POI_TYPES.HQ, 0, -115, 14, `${site} HQ`, 'HEADQUARTERS', hqBody, 'hq');

        (this.data.team || []).slice(0, 4).forEach((m, i) => {
            this._addPOI(`team-${i}`, POI_TYPES.TEAM, -10 + i * 7, WORLD.parkZ - 18, 7,
                m.name, m.role, m.panelContent || `${m.name} — ${m.role} at ${site}.`, 'park');
        });

        const contactBody = this.data.company?.contactContent
            || `Email: ${this.data.email || 'signal@alienhouse.net'}`;
        this._addPOI('contact', POI_TYPES.CONTACT, 0, -60, 12, 'Contact', 'UPLINK', contactBody, 'hq');
    }

    _aboutText() {
        const about = this.data.about || [];
        if (!about.length) return this.data.hero?.subtext || 'Welcome.';
        return about.map(a => `${a.heading}: ${a.subheading}`).join('\n\n');
    }

    _addPOI(id, type, x, z, radius, title, subtitle, content, district = null) {
        const marker = new THREE.Group();
        const ty = this.getTerrainHeight(x, z);
        marker.position.set(x, ty, z);
        const colors = {
            [POI_TYPES.HQ]: PALETTE.mint,
            [POI_TYPES.SERVICE]: PALETTE.blue,
            [POI_TYPES.PROJECT]: PALETTE.grassDark,
            [POI_TYPES.TEAM]: PALETTE.purple,
            [POI_TYPES.CONTACT]: PALETTE.orange,
        };
        const col = colors[type] || PALETTE.accent;
        const pole = toonMesh(new THREE.BoxGeometry(0.1, 3, 0.1), col, { emissive: col, emissiveIntensity: 0.1 });
        pole.mesh.position.y = 1.5;
        marker.add(pole.group);
        const icon = toonMesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), 0xffffff, { emissive: col, emissiveIntensity: 0.14 });
        icon.mesh.position.y = 3.1;
        marker.add(icon.group);
        this.scene.add(marker);
        this.pois.push({
            id, type, position: new THREE.Vector3(x, ty, z), radius,
            title, subtitle, content, marker, district,
            mapLabel: title.length > 10 ? title.slice(0, 9) + '…' : title,
        });
    }
}