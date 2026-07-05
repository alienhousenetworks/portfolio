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
        this._sky();
        this._lights();
        this._ground();
        this._mountains();
        this._beach();
        this._river();
        this._bridges();
        this._districtZones();
        this._roadGrid();
        this._city();
        this._landmarks();
        this._dbBuildings();
        this._parks();
        this._nature();
        this._urbanDetails();
        this._pois();
        if (this.terrain) this.colliders.push(...this.terrain.wallColliders);
        return { pois: this.pois, colliders: this.colliders, buildings: this.data.buildings || [] };
    }

    getTerrainHeight(x, z) {
        return this.terrain ? this.terrain.getHeightAt(x, z) : WORLD.groundY;
    }

    _inPark(x, z, margin = 0) {
        return Math.hypot(x - WORLD.parkX, z - WORLD.parkZ) < WORLD.parkRadius + margin;
    }

    _inRiver(x, z, margin = 0) {
        return Math.abs(x - WORLD.riverX) < WORLD.riverWidth / 2 + margin;
    }

    _markSite(x, z, w = 24, d = 24) {
        this.buildingSites.add(`${Math.round(x)},${Math.round(z)}`);
        this.colliders.push({ x, z, w, d });
    }

    _isOccupied(cx, cz) {
        for (const key of this.buildingSites) {
            const [bx, bz] = key.split(',').map(Number);
            if (Math.hypot(cx - bx, cz - bz) < 20) return true;
        }
        return false;
    }

    _sky() {
        this.scene.background = new THREE.Color(PALETTE.sky);
        this.scene.fog = new THREE.Fog(PALETTE.fog, 200, 600);
    }

    _lights() {
        setupCityLighting(this.scene);
    }

    _ground() {
        const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, toonMat(PALETTE.grass));
        mesh.receiveShadow = true;
        this.scene.add(mesh);
    }

    _mountains() {
        const layers = [
            { z: -310, colors: [PALETTE.mountain[0], PALETTE.mountain[1]] },
            { z: 310, colors: [PALETTE.mountain[2], PALETTE.mountain[3]] },
            { x: -300, colors: [PALETTE.mountain[0], PALETTE.mountain[2]] },
            { x: 300, colors: [PALETTE.mountain[1], PALETTE.mountain[3]] },
        ];
        layers.forEach((layer, li) => {
            for (let i = 0; i < 5; i++) {
                const g = new THREE.Group();
                const w = 100 + i * 35;
                const h = 45 + i * 15;
                const color = layer.colors[i % 2];
                const shape = new THREE.Shape();
                const hw = w / 2;
                shape.moveTo(-hw, 0);
                for (let b = 0; b <= 5; b++) {
                    const t = b / 5;
                    shape.lineTo(-hw + t * w, h * (0.4 + 0.6 * Math.sin(t * Math.PI)));
                }
                shape.closePath();
                const extrude = new THREE.ExtrudeGeometry(shape, { depth: 6, bevelEnabled: false });
                extrude.rotateX(-Math.PI / 2);
                const { group, mesh } = toonMesh(extrude, color, { castShadow: false });
                mesh.position.y = 0.4;
                g.add(group);
                if (layer.z != null) g.position.set(-150 + i * 70, 0, layer.z);
                else g.position.set(layer.x, 0, -160 + i * 80);
                this.scene.add(g);
            }
        });
    }

    _beach() {
        const sand = toonMesh(new THREE.BoxGeometry(WORLD.size * 0.9, 0.2, 50), PALETTE.sand);
        sand.mesh.position.set(0, 0.05, 265);
        sand.mesh.receiveShadow = true;
        this.scene.add(sand.group);
        const water = toonMesh(new THREE.BoxGeometry(WORLD.size, 0.1, 30), PALETTE.waterDeep, { transparent: true, opacity: 0.85 });
        water.mesh.position.set(0, -0.05, 295);
        this.scene.add(water.group);
    }

    _river() {
        const len = WORLD.riverLength;
        const w = WORLD.riverWidth;
        const water = toonMesh(new THREE.BoxGeometry(w, 0.12, len), PALETTE.river);
        water.mesh.position.set(WORLD.riverX, -0.02, 0);
        water.mesh.receiveShadow = true;
        this.scene.add(water.group);

        for (let z = -len / 2; z < len / 2; z += 16) {
            sketchLines(this.scene, [
                new THREE.Vector3(WORLD.riverX - 3, 0.05, z),
                new THREE.Vector3(WORLD.riverX, 0.05, z + 8),
                new THREE.Vector3(WORLD.riverX + 4, 0.05, z + 14),
            ], 0xffffff, 0.5);
        }

        [-1, 1].forEach(side => {
            const bank = toonMesh(new THREE.BoxGeometry(12, 1.2, len), PALETTE.embankment);
            bank.mesh.position.set(WORLD.riverX + side * (w / 2 + 6), 0.4, 0);
            bank.mesh.receiveShadow = true;
            this.scene.add(bank.group);
        });
    }

    _bridges() {
        [-120, -40, 60, 160].forEach(z => {
            const g = new THREE.Group();
            g.position.set(WORLD.riverX, 1.2, z);
            const deck = toonMesh(new THREE.BoxGeometry(WORLD.riverWidth + 5, 0.45, 7), PALETTE.concrete);
            deck.mesh.position.y = 0.22;
            g.add(deck.group);
            [-1, 1].forEach(s => {
                const rail = toonMesh(new THREE.BoxGeometry(0.25, 1, 7), PALETTE.concreteLight);
                rail.mesh.position.set(s * (WORLD.riverWidth / 2 + 1.2), 0.7, 0);
                g.add(rail.group);
            });
            this.scene.add(g);
        });
    }

    _districtZones() {
        Object.values(DISTRICT_DEFS).forEach(d => {
            if (d.id === 'downtown') return;
            const pad = new THREE.Mesh(
                new THREE.CircleGeometry(d.radius, 32),
                toonMat(d.groundColor, { transparent: true, opacity: 0.22 })
            );
            pad.rotation.x = -Math.PI / 2;
            pad.position.set(d.x, 0.02, d.z);
            this.scene.add(pad);
        });
    }

    _roadGrid() {
        const asphalt = toonMat(PALETTE.asphalt);
        const line = toonMat(0xffffff);
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
                built.group.position.y = this.getTerrainHeight(cx, cz);
                this.scene.add(built.group);
                this.colliders.push(built.collider);
                this._markSite(cx, cz, built.collider.w, built.collider.d);
            }
        }
    }

    _landmarks() {
        this._hqTower(0, -120);

        const school = createSchool(-150, -130, 1);
        school.group.position.y = this.getTerrainHeight(-150, -130);
        this.scene.add(school.group);
        this._markSite(-150, -130, 30, 24);

        const lib = createServiceBuilding(155, -125, { buildingStyle: 'consulting' });
        lib.group.position.y = this.getTerrainHeight(155, -125);
        this.scene.add(lib.group);
        this._markSite(155, -125, 20, 18);
    }

    _hqTower(x, z) {
        const g = new THREE.Group();
        const ty = this.getTerrainHeight(x, z);
        g.position.set(x, ty, z);
        const base = toonMesh(new THREE.BoxGeometry(26, 16, 16), PALETTE.concreteLight);
        base.mesh.position.y = 8;
        g.add(base.group);
        const tower = toonMesh(new THREE.BoxGeometry(11, 28, 11), 0xddd9d0);
        tower.mesh.position.y = 30;
        g.add(tower.group);
        const sign = toonMesh(new THREE.BoxGeometry(9, 1, 0.25), PALETTE.mint, { emissive: PALETTE.mint, emissiveIntensity: 0.08 });
        sign.mesh.position.set(0, 46, 5.6);
        g.add(sign.group);
        this.scene.add(g);
        this._markSite(x, z, 28, 18);
    }

    _dbBuildings() {
        (this.data.buildings || []).forEach(b => {
            if (this._isOccupied(b.x, b.z)) return;
            const built = createServiceBuilding(b.x, b.z, b);
            built.group.position.y = this.getTerrainHeight(b.x, b.z);
            this.scene.add(built.group);
            this.colliders.push(built.collider);
            this._markSite(b.x, b.z, built.collider.w, built.collider.d);
            this._addPOI(
                b.id, b.type === 'project' ? POI_TYPES.PROJECT : POI_TYPES.SERVICE,
                b.x, b.z, 18,
                b.title, b.subtitle, b.panelContent || b.content || b.description,
                b.district
            );
        });
    }

    _parks() {
        const ty = this.getTerrainHeight(WORLD.parkX, WORLD.parkZ);
        const fountain = createFountain();
        fountain.position.set(WORLD.parkX, ty, WORLD.parkZ);
        this.scene.add(fountain);

        for (let a = 0; a < 10; a++) {
            const angle = (a / 10) * Math.PI * 2;
            const r = 12 + (a % 3) * 4;
            const tx = WORLD.parkX + Math.cos(angle) * r;
            const tz = WORLD.parkZ + Math.sin(angle) * r;
            const tree = a % 2 === 0 ? createCherryTree() : createLargeTree(a);
            tree.position.set(tx, ty, tz);
            this.scene.add(tree);
        }

        for (let a = 0; a < 6; a++) {
            const angle = (a / 6) * Math.PI * 2 + 0.4;
            const bench = createBench();
            bench.position.set(WORLD.parkX + Math.cos(angle) * 20, ty, WORLD.parkZ + Math.sin(angle) * 20);
            bench.rotation.y = angle + Math.PI;
            this.scene.add(bench);
        }

        const path = toonMesh(new THREE.BoxGeometry(3, 0.06, 40), PALETTE.concrete);
        path.mesh.position.set(WORLD.parkX, ty + 0.03, WORLD.parkZ);
        this.scene.add(path.group);
    }

    _nature() {
        for (let i = 0; i < 8; i++) {
            const bamboo = createBambooCluster();
            bamboo.position.set(-180 + i * 8, this.getTerrainHeight(-180 + i * 8, -240), -240 + (i % 3) * 6);
            this.scene.add(bamboo);
        }
        for (let i = 0; i < 12; i++) {
            const x = -250 + i * 40;
            const z = 230 + (i % 4) * 15;
            const tree = createLargeTree(i);
            tree.position.set(x, this.getTerrainHeight(x, z), z);
            this.scene.add(tree);
        }
    }

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
        const pole = toonMesh(new THREE.BoxGeometry(0.1, 3, 0.1), col, { emissive: col, emissiveIntensity: 0.08 });
        pole.mesh.position.y = 1.5;
        marker.add(pole.group);
        const icon = toonMesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), 0xffffff, { emissive: col, emissiveIntensity: 0.12 });
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