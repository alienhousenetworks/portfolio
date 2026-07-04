import * as THREE from 'three';
import { WORLD, PALETTE, POI_TYPES } from './config.js';

export class WorldBuilder {
    constructor(scene, gameData) {
        this.scene = scene;
        this.data = gameData;
        this.pois = [];
        this.colliders = [];
    }

    build() {
        this._sky();
        this._lights();
        this._ground();
        this._roadGrid();
        this._city();
        this._park();
        this._palms();
        this._pois();
        return { pois: this.pois, colliders: this.colliders };
    }

    getTerrainHeight() { return WORLD.groundY; }

    _inPark(x, z, margin = 0) {
        const dx = x - WORLD.parkX;
        const dz = z - WORLD.parkZ;
        return Math.sqrt(dx * dx + dz * dz) < WORLD.parkRadius + margin;
    }

    _sky() {
        this.scene.background = new THREE.Color(PALETTE.sky);
        this.scene.fog = new THREE.Fog(PALETTE.sky, 200, 620);
    }

    _lights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.65));
        const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
        sun.position.set(80, 120, 60);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 400;
        const s = 200;
        sun.shadow.camera.left = -s;
        sun.shadow.camera.right = s;
        sun.shadow.camera.top = s;
        sun.shadow.camera.bottom = -s;
        this.scene.add(sun);
        this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0x5a7a42, 0.4));
    }

    _ground() {
        const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size);
        geo.rotateX(-Math.PI / 2);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 }));
        mesh.receiveShadow = true;
        this.scene.add(mesh);
    }

    _roadGrid() {
        const asphalt = new THREE.MeshStandardMaterial({ color: PALETTE.asphalt, roughness: 0.95 });
        const line = new THREE.MeshBasicMaterial({ color: 0xeeeecc });
        const span = WORLD.size - 30;
        const half = Math.floor((WORLD.size / 2) / WORLD.roadSpacing);

        for (let i = -half; i <= half; i++) {
            const offset = i * WORLD.roadSpacing;
            const vRoad = new THREE.Mesh(new THREE.BoxGeometry(WORLD.roadWidth, 0.06, span), asphalt);
            vRoad.position.set(offset, 0.03, 0);
            this.scene.add(vRoad);

            const hRoad = new THREE.Mesh(new THREE.BoxGeometry(span, 0.06, WORLD.roadWidth), asphalt);
            hRoad.position.set(0, 0.03, offset);
            this.scene.add(hRoad);

            const vLine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, span * 0.95), line);
            vLine.position.set(offset, 0.04, 0);
            this.scene.add(vLine);

            const hLine = new THREE.Mesh(new THREE.BoxGeometry(span * 0.95, 0.07, 0.2), line);
            hLine.position.set(0, 0.04, offset);
            this.scene.add(hLine);
        }
    }

    _city() {
        const half = Math.floor((WORLD.size / 2 - 40) / WORLD.roadSpacing);
        let seed = 0;

        for (let gx = -half; gx <= half; gx++) {
            for (let gz = -half; gz <= half; gz++) {
                const cx = gx * WORLD.roadSpacing + WORLD.roadSpacing / 2;
                const cz = gz * WORLD.roadSpacing + WORLD.roadSpacing / 2;

                if (this._inPark(cx, cz, 18)) continue;
                if (Math.abs(cx) < 8 && Math.abs(cz) < 8) continue;

                const floors = 2 + ((Math.abs(gx) + Math.abs(gz) + seed) % 6);
                this._cityBlock(cx, cz, floors, seed++);
            }
        }

        this._hqTower(0, -120);
    }

    _cityBlock(cx, cz, floors, seed) {
        const bw = 22;
        const bd = 22;
        const floorH = 3.2;
        const h = floors * floorH;
        const color = PALETTE.building[seed % PALETTE.building.length];

        const wall = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
        const glass = new THREE.MeshStandardMaterial({
            color: PALETTE.glass, roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.7,
        });

        const body = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), wall);
        body.position.set(cx, h / 2, cz);
        body.castShadow = true;
        body.receiveShadow = true;
        this.scene.add(body);
        this.colliders.push({ x: cx, z: cz, w: bw, d: bd });

        for (let row = 1; row < floors; row++) {
            for (let col = 0; col < 4; col++) {
                const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2), glass);
                win.position.set(cx - 7 + col * 4.5, row * floorH, cz + bd / 2 + 0.02);
                this.scene.add(win);
            }
        }
    }

    _hqTower(x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(28, 18, 18),
            new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.7 })
        );
        base.position.y = 9;
        base.castShadow = true;
        g.add(base);

        const tower = new THREE.Mesh(
            new THREE.BoxGeometry(12, 32, 12),
            new THREE.MeshStandardMaterial({ color: 0xe4eaf0, roughness: 0.6, metalness: 0.1 })
        );
        tower.position.y = 26;
        tower.castShadow = true;
        g.add(tower);

        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(10, 1.2, 0.3),
            new THREE.MeshStandardMaterial({ color: PALETTE.accent, emissive: new THREE.Color(PALETTE.accent), emissiveIntensity: 0.12 })
        );
        sign.position.set(0, 40, 6.1);
        g.add(sign);

        this.scene.add(g);
        this.colliders.push({ x, z, w: 30, d: 20 });
    }

    _park() {
        const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(18, 18, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: PALETTE.concrete, roughness: 0.8 })
        );
        pad.position.set(WORLD.parkX, 0.05, WORLD.parkZ);
        this.scene.add(pad);
    }

    _palms() {
        const spots = [];
        for (let a = 0; a < 12; a++) {
            const angle = (a / 12) * Math.PI * 2;
            spots.push([
                WORLD.parkX + Math.cos(angle) * 24,
                WORLD.parkZ + Math.sin(angle) * 24,
            ]);
        }
        [-150, -80, 150, 80].forEach((z, i) => {
            spots.push([40 + i * 20, z], [-40 - i * 20, z]);
        });
        spots.forEach(([x, z]) => { if (!this._inPark(x, z, 5)) this._palmTree(x, z); });
    }

    _palmTree(x, z) {
        const g = new THREE.Group();
        g.position.set(x, 0, z);
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.2, 0.35, 5, 8),
            new THREE.MeshStandardMaterial({ color: PALETTE.trunk, roughness: 0.9 })
        );
        trunk.position.y = 2.5;
        g.add(trunk);
        const leafMat = new THREE.MeshStandardMaterial({ color: PALETTE.palm, roughness: 0.8 });
        for (let i = 0; i < 6; i++) {
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 3), leafMat);
            leaf.position.y = 5.2;
            leaf.rotation.y = (i / 6) * Math.PI * 2;
            leaf.rotation.x = -0.5;
            g.add(leaf);
        }
        this.scene.add(g);
    }

    _pois() {
        const site = this.data.siteName || 'ALIENHOUSE';

        this._addPOI('hq', POI_TYPES.HQ, 0, -115, 12, `${site} HQ`, 'HEADQUARTERS', this._aboutText());

        (this.data.services || []).slice(0, 8).forEach((s, i) => {
            const spots = [[-75, -50], [75, -50], [-75, 50], [75, 50], [-150, 0], [150, 0], [-50, -150], [50, 150]];
            const [x, z] = spots[i] || [i * 40, -80];
            this._addPOI(`svc-${i}`, POI_TYPES.SERVICE, x, z, 10, s.name, 'SERVICE', s.description);
        });

        (this.data.team || []).slice(0, 4).forEach((m, i) => {
            this._addPOI(`team-${i}`, POI_TYPES.TEAM, -10 + i * 7, WORLD.parkZ - 18, 6,
                m.name, m.role, `${m.name} — ${m.role} at ${site}.`);
        });

        (this.data.projects || []).slice(0, 6).forEach((p, i) => {
            this._addPOI(`proj-${i}`, POI_TYPES.PROJECT, -120 + i * 50, -180, 10, p.title, p.tech, p.description);
        });

        this._addPOI('contact', POI_TYPES.CONTACT, 0, -60, 10,
            'Contact', 'UPLINK', `Reach us at ${this.data.email || 'signal@alienhouse.net'}`);
    }

    _aboutText() {
        const about = this.data.about || [];
        if (!about.length) return this.data.hero?.subtext || 'Welcome.';
        return about.map(a => `${a.heading}: ${a.subheading}`).join('\n\n');
    }

    _addPOI(id, type, x, z, radius, title, subtitle, content) {
        const marker = new THREE.Group();
        marker.position.set(x, 0, z);

        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.12, 3, 6),
            new THREE.MeshStandardMaterial({ color: PALETTE.accent, emissive: new THREE.Color(PALETTE.accent), emissiveIntensity: 0.08 })
        );
        pole.position.y = 1.5;
        marker.add(pole);

        const icon = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(PALETTE.accent), emissiveIntensity: 0.15 })
        );
        icon.position.y = 3.2;
        marker.add(icon);

        this.scene.add(marker);
        this.pois.push({ id, type, position: new THREE.Vector3(x, 0, z), radius, title, subtitle, content, marker });
    }
}