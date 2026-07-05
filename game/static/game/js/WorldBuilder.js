import * as THREE from 'three';
import { WORLD, PALETTE, POI_TYPES } from './config.js';
import { DISTRICT_DEFS } from './Districts.js';
import { createRandomBuilding, createServiceBuilding, createVendingMachine, createUtilityPole } from './Buildings.js';
import { toonMat, toonMesh, sketchLines, INK } from './ToonStyle.js';

export class WorldBuilder {
    constructor(scene, gameData) {
        this.scene = scene;
        this.data = gameData;
        this.pois = [];
        this.colliders = [];
        this.buildingSites = new Set();
    }

    build() {
        this._sky();
        this._lights();
        this._ground();
        this._mountains();
        this._river();
        this._bridges();
        this._districtZones();
        this._roadGrid();
        this._city();
        this._dbBuildings();
        this._park();
        this._urbanDetails();
        this._pois();
        return { pois: this.pois, colliders: this.colliders, buildings: this.data.buildings || [] };
    }

    getTerrainHeight() { return WORLD.groundY; }

    _inPark(x, z, margin = 0) {
        const dx = x - WORLD.parkX;
        const dz = z - WORLD.parkZ;
        return Math.sqrt(dx * dx + dz * dz) < WORLD.parkRadius + margin;
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
        this.scene.fog = new THREE.Fog(PALETTE.fog, 180, 580);
    }

    _lights() {
        this.scene.add(new THREE.AmbientLight(0xfff8f0, 0.72));
        const sun = new THREE.DirectionalLight(0xfff0d8, 1.05);
        sun.position.set(-60, 90, 80);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 400;
        sun.shadow.bias = -0.0008;
        const s = 220;
        sun.shadow.camera.left = -s;
        sun.shadow.camera.right = s;
        sun.shadow.camera.top = s;
        sun.shadow.camera.bottom = -s;
        this.scene.add(sun);
        this.scene.add(new THREE.HemisphereLight(0xc8d8f0, 0xa8d070, 0.35));
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
            { z: -310, scale: 1.4, colors: [PALETTE.mountain[0], PALETTE.mountain[1]] },
            { z: -280, scale: 1.1, colors: [PALETTE.mountain[1], PALETTE.mountain[2]] },
            { z: 310, scale: 1.3, colors: [PALETTE.mountain[2], PALETTE.mountain[3]] },
            { x: -300, scale: 1.2, colors: [PALETTE.mountain[0], PALETTE.mountain[2]] },
            { x: 300, scale: 1.15, colors: [PALETTE.mountain[1], PALETTE.mountain[3]] },
        ];

        layers.forEach((layer, li) => {
            const count = 5 + li;
            for (let i = 0; i < count; i++) {
                const g = new THREE.Group();
                const w = 120 + (i % 3) * 40;
                const h = 55 + (i % 4) * 18;
                const color = layer.colors[i % layer.colors.length];
                const shape = new THREE.Shape();
                const hw = w / 2;
                shape.moveTo(-hw, 0);
                const bumps = 4 + (i % 3);
                for (let b = 0; b <= bumps; b++) {
                    const t = b / bumps;
                    const x = -hw + t * w;
                    const y = h * (0.35 + 0.65 * Math.sin(t * Math.PI) * (0.8 + (i % 5) * 0.04));
                    shape.lineTo(x, y);
                }
                shape.lineTo(hw, 0);
                shape.closePath();

                const extrude = new THREE.ExtrudeGeometry(shape, { depth: 8, bevelEnabled: false });
                extrude.rotateX(-Math.PI / 2);
                const { group, mesh } = toonMesh(extrude, color, { castShadow: false, receiveShadow: false });
                mesh.position.y = 0.5;
                g.add(group);

                if (layer.z != null) {
                    g.position.set(-180 + i * (360 / count) + (li * 12), 0, layer.z);
                } else {
                    g.position.set(layer.x, 0, -200 + i * (400 / count));
                }
                g.scale.setScalar(layer.scale);
                this.scene.add(g);

                const ridgePts = [];
                for (let b = 0; b <= 6; b++) {
                    const t = b / 6;
                    ridgePts.push(new THREE.Vector3(
                        -hw * 0.7 + t * w * 0.7,
                        h * (0.5 + 0.4 * Math.sin(t * Math.PI)),
                        4
                    ));
                }
                sketchLines(g, ridgePts, INK, 0.25);
            }
        });
    }

    _river() {
        const len = WORLD.riverLength;
        const w = WORLD.riverWidth;

        const water = toonMesh(new THREE.BoxGeometry(w, 0.15, len), PALETTE.river);
        water.mesh.position.set(WORLD.riverX, -0.02, 0);
        water.mesh.receiveShadow = true;
        this.scene.add(water.group);

        for (let z = -len / 2; z < len / 2; z += 18) {
            const offset = Math.sin(z * 0.04) * 3;
            const pts = [
                new THREE.Vector3(WORLD.riverX + offset - 4, 0.06, z),
                new THREE.Vector3(WORLD.riverX + offset, 0.06, z + 9),
                new THREE.Vector3(WORLD.riverX + offset + 5, 0.06, z + 16),
            ];
            sketchLines(this.scene, pts, 0xffffff, 0.55);
        }

        [-1, 1].forEach(side => {
            const bank = toonMesh(new THREE.BoxGeometry(14, 1.8, len), PALETTE.embankment);
            bank.mesh.position.set(WORLD.riverX + side * (w / 2 + 7), 0.5, 0);
            bank.mesh.receiveShadow = true;
            this.scene.add(bank.group);

            for (let z = -len / 2 + 20; z < len / 2; z += 30) {
                const step = toonMesh(new THREE.BoxGeometry(12, 0.6, 4), PALETTE.retainingWall);
                step.mesh.position.set(WORLD.riverX + side * (w / 2 + 6), 0.3, z);
                this.scene.add(step.group);
            }
        });
    }

    _bridges() {
        const positions = [-120, -40, 60, 160];
        positions.forEach(z => {
            const g = new THREE.Group();
            g.position.set(WORLD.riverX, 0.8, z);

            const deck = toonMesh(new THREE.BoxGeometry(WORLD.riverWidth + 6, 0.5, 8), PALETTE.bridge);
            deck.mesh.position.y = 0.25;
            g.add(deck.group);

            const arch = toonMesh(new THREE.BoxGeometry(WORLD.riverWidth + 2, 2.5, 1.2), PALETTE.bridge);
            arch.mesh.position.set(0, -0.5, 0);
            g.add(arch.group);

            [-1, 1].forEach(side => {
                const rail = toonMesh(new THREE.BoxGeometry(0.3, 1.2, 8), 0xf0e8e0);
                rail.mesh.position.set(side * (WORLD.riverWidth / 2 + 1.5), 0.9, 0);
                g.add(rail.group);
                for (let i = 0; i < 5; i++) {
                    const post = toonMesh(new THREE.BoxGeometry(0.15, 1, 0.15), 0xe8e0d8);
                    post.mesh.position.set(side * (WORLD.riverWidth / 2 + 1.5), 0.6, -3 + i * 1.5);
                    g.add(post.group);
                }
            });

            this.scene.add(g);
        });
    }

    _districtZones() {
        Object.values(DISTRICT_DEFS).forEach(d => {
            if (d.id === 'downtown') return;
            const pad = new THREE.Mesh(
                new THREE.CircleGeometry(d.radius, 32),
                toonMat(d.groundColor, { transparent: true, opacity: d.id === 'park' ? 0.45 : 0.28 })
            );
            pad.rotation.x = -Math.PI / 2;
            pad.position.set(d.x, 0.02, d.z);
            this.scene.add(pad);

            const label = this._districtSign(d.label, d.color);
            label.position.set(d.x, 0, d.z - d.radius + 12);
            this.scene.add(label);
        });
    }

    _districtSign(text, color) {
        const g = new THREE.Group();
        const post = toonMesh(new THREE.BoxGeometry(0.15, 4, 0.15), PALETTE.pole);
        post.mesh.position.y = 2;
        g.add(post.group);
        const col = typeof color === 'string' ? parseInt(color.replace('#', ''), 16) : color;
        const board = toonMesh(new THREE.BoxGeometry(12, 2.5, 0.2), col, { emissive: col, emissiveIntensity: 0.08 });
        board.mesh.position.y = 4.5;
        g.add(board.group);
        return g;
    }

    _roadGrid() {
        const asphalt = toonMat(PALETTE.asphalt);
        const line = toonMat(0xffffff);
        const span = WORLD.size - 30;
        const half = Math.floor((WORLD.size / 2) / WORLD.roadSpacing);

        for (let i = -half; i <= half; i++) {
            const offset = i * WORLD.roadSpacing;
            if (Math.abs(offset - WORLD.riverX) < WORLD.riverWidth / 2 + 8) continue;

            const vRoad = new THREE.Mesh(new THREE.BoxGeometry(WORLD.roadWidth, 0.06, span), asphalt);
            vRoad.position.set(offset, 0.03, 0);
            vRoad.receiveShadow = true;
            this.scene.add(vRoad);

            const hRoad = new THREE.Mesh(new THREE.BoxGeometry(span, 0.06, WORLD.roadWidth), asphalt);
            hRoad.position.set(0, 0.03, offset);
            hRoad.receiveShadow = true;
            this.scene.add(hRoad);

            if (Math.abs(offset) > 100 || Math.abs(i) > 2) {
                const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.07, span * 0.92), line);
                vLine.position.set(offset + WORLD.roadWidth * 0.35, 0.04, 0);
                this.scene.add(vLine);
            }
        }

        this._slopeRoads();
    }

    _slopeRoads() {
        const asphalt = toonMat(PALETTE.asphalt);
        const white = toonMat(0xffffff);
        const curves = [
            { pts: [[-200, -180], [-160, -140], [-120, -110], [-80, -90]], w: 8 },
            { pts: [[200, -170], [165, -130], [130, -100], [95, -80]], w: 8 },
            { pts: [[-190, 150], [-150, 120], [-110, 100], [-70, 85]], w: 7 },
            { pts: [[190, 140], [155, 115], [120, 95], [85, 80]], w: 7 },
        ];

        curves.forEach(curve => {
            for (let s = 0; s < curve.pts.length - 1; s++) {
                const [x1, z1] = curve.pts[s];
                const [x2, z2] = curve.pts[s + 1];
                const dx = x2 - x1, dz = z2 - z1;
                const len = Math.hypot(dx, dz);
                const angle = Math.atan2(dx, dz);
                const seg = new THREE.Mesh(new THREE.BoxGeometry(curve.w, 0.06, len), asphalt);
                seg.position.set((x1 + x2) / 2, 0.035, (z1 + z2) / 2);
                seg.rotation.y = angle;
                seg.receiveShadow = true;
                this.scene.add(seg);

                const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, len * 0.9), white);
                edge.position.set((x1 + x2) / 2 + Math.cos(angle) * curve.w * 0.38, 0.045, (z1 + z2) / 2 - Math.sin(angle) * curve.w * 0.38);
                edge.rotation.y = angle;
                this.scene.add(edge);
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

                if (this._inPark(cx, cz, 18)) continue;
                if (this._inRiver(cx, cz, 12)) continue;
                if (Math.abs(cx) < 8 && Math.abs(cz) < 8) continue;
                if (this._isOccupied(cx, cz)) continue;

                const distRiver = Math.abs(cx);
                const floors = distRiver < 70 ? 3 + ((Math.abs(gx) + Math.abs(gz) + seed) % 3)
                    : 2 + ((Math.abs(gx) + Math.abs(gz) + seed) % 3);

                const built = createRandomBuilding(cx, cz, floors, seed++);
                this.scene.add(built.group);
                this.colliders.push(built.collider);
                this._markSite(cx, cz, built.collider.w, built.collider.d);
            }
        }

        this._hqTower(0, -120);
    }

    _dbBuildings() {
        (this.data.buildings || []).forEach(b => {
            if (this._isOccupied(b.x, b.z)) return;
            const built = createServiceBuilding(b.x, b.z, b);
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

    _hqTower(x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);

        const base = toonMesh(new THREE.BoxGeometry(28, 18, 18), 0xf0ece4);
        base.mesh.position.y = 9;
        g.add(base.group);

        const tower = toonMesh(new THREE.BoxGeometry(12, 32, 12), 0xe8ecf0);
        tower.mesh.position.y = 34;
        g.add(tower.group);

        const sign = toonMesh(new THREE.BoxGeometry(10, 1.2, 0.3), PALETTE.accent, { emissive: PALETTE.accent, emissiveIntensity: 0.1 });
        sign.mesh.position.set(0, 52, 6.1);
        g.add(sign.group);

        for (let row = 2; row < 10; row++) {
            for (let col = 0; col < 3; col++) {
                const win = toonMesh(new THREE.PlaneGeometry(1.4, 1.8), PALETTE.glass);
                win.mesh.position.set(-3 + col * 3, row * 3.2, 6.06);
                g.add(win.group);
            }
        }

        this.scene.add(g);
        this._markSite(x, z, 30, 20);
    }

    _park() {
        const pad = toonMesh(new THREE.CylinderGeometry(18, 18, 0.1, 32), PALETTE.concrete);
        pad.mesh.position.set(WORLD.parkX, 0.05, WORLD.parkZ);
        this.scene.add(pad.group);

        for (let a = 0; a < 8; a++) {
            const angle = (a / 8) * Math.PI * 2;
            const bx = WORLD.parkX + Math.cos(angle) * 14;
            const bz = WORLD.parkZ + Math.sin(angle) * 14;
            const bench = toonMesh(new THREE.BoxGeometry(2.5, 0.2, 0.7), 0xc8a878);
            bench.mesh.position.set(bx, 0.35, bz);
            bench.mesh.rotation.y = angle;
            this.scene.add(bench.group);
        }
    }

    _urbanDetails() {
        const poleSpots = [];
        const vendingSpots = [];
        const half = Math.floor((WORLD.size / 2 - 40) / WORLD.roadSpacing);

        for (let gx = -half; gx <= half; gx++) {
            for (let gz = -half; gz <= half; gz++) {
                const cx = gx * WORLD.roadSpacing;
                const cz = gz * WORLD.roadSpacing;
                if (this._inRiver(cx, cz, 5)) continue;
                if ((gx + gz) % 3 === 0) poleSpots.push([cx + 6, cz + 6]);
                if ((gx * 7 + gz * 3) % 11 === 0 && Math.abs(cx) > 30) {
                    vendingSpots.push([cx + WORLD.roadSpacing / 2, cz + WORLD.roadSpacing / 2]);
                }
            }
        }

        poleSpots.slice(0, 45).forEach(([x, z]) => this.scene.add(createUtilityPole(x, z)));
        vendingSpots.slice(0, 28).forEach(([x, z], i) => this.scene.add(createVendingMachine(x, z, i)));
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
        this._addPOI('contact', POI_TYPES.CONTACT, 0, -60, 12,
            'Contact', 'UPLINK', contactBody, 'hq');
    }

    _aboutText() {
        const about = this.data.about || [];
        if (!about.length) return this.data.hero?.subtext || 'Welcome.';
        return about.map(a => `${a.heading}: ${a.subheading}`).join('\n\n');
    }

    _addPOI(id, type, x, z, radius, title, subtitle, content, district = null) {
        const marker = new THREE.Group();
        marker.position.set(x, 0, z);

        const colors = {
            [POI_TYPES.HQ]: 0xe88870,
            [POI_TYPES.SERVICE]: 0x6a9ad8,
            [POI_TYPES.PROJECT]: 0x9ab878,
            [POI_TYPES.TEAM]: 0xc8a0e0,
            [POI_TYPES.CONTACT]: 0xf0c090,
        };
        const col = colors[type] || PALETTE.accent;

        const pole = toonMesh(new THREE.BoxGeometry(0.1, 3, 0.1), col, { emissive: col, emissiveIntensity: 0.08 });
        pole.mesh.position.y = 1.5;
        marker.add(pole.group);

        const icon = toonMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), 0xffffff, { emissive: col, emissiveIntensity: 0.15 });
        icon.mesh.position.y = 3.2;
        marker.add(icon.group);

        this.scene.add(marker);
        this.pois.push({
            id, type, position: new THREE.Vector3(x, 0, z), radius,
            title, subtitle, content, marker, district,
            mapLabel: title.length > 10 ? title.slice(0, 9) + '…' : title,
        });
    }
}