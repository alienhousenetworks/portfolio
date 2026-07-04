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
        this._downtown();
        this._park();
        this._palms();
        this._pois();
        return { pois: this.pois, colliders: this.colliders };
    }

    getTerrainHeight() {
        return WORLD.groundY;
    }

    _sky() {
        this.scene.background = new THREE.Color(PALETTE.sky);
        this.scene.fog = new THREE.Fog(PALETTE.sky, 120, 280);
    }

    _lights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const sun = new THREE.DirectionalLight(0xfff5e0, 1.1);
        sun.position.set(50, 80, 30);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 200;
        const s = 90;
        sun.shadow.camera.left = -s;
        sun.shadow.camera.right = s;
        sun.shadow.camera.top = s;
        sun.shadow.camera.bottom = -s;
        this.scene.add(sun);
        this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0x5a7a42, 0.35));
    }

    _ground() {
        const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshStandardMaterial({ color: PALETTE.grass, roughness: 1 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        this.scene.add(mesh);
    }

    _roadGrid() {
        const asphalt = new THREE.MeshStandardMaterial({ color: PALETTE.asphalt, roughness: 0.95 });
        const sidewalk = new THREE.MeshStandardMaterial({ color: PALETTE.sidewalk, roughness: 0.9 });
        const line = new THREE.MeshBasicMaterial({ color: 0xeeeecc });

        const roads = [];
        for (let i = -4; i <= 4; i++) {
            roads.push({ x: i * 44, z: 0, w: WORLD.roadWidth, d: WORLD.size - 20, horiz: false });
            roads.push({ x: 0, z: i * 44, w: WORLD.size - 20, d: WORLD.roadWidth, horiz: true });
        }

        roads.forEach(r => {
            const road = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.06, r.d), asphalt);
            road.position.set(r.x, 0.03, r.z);
            road.receiveShadow = true;
            this.scene.add(road);

            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(r.horiz ? r.w * 0.9 : 0.2, 0.07, r.horiz ? 0.2 : r.d * 0.9),
                line
            );
            stripe.position.set(r.x, 0.04, r.z);
            this.scene.add(stripe);
        });
    }

    _downtown() {
        const blocks = [
            { x: -44, z: -44, floors: 4 },
            { x: 44, z: -44, floors: 3 },
            { x: -44, z: 44, floors: 2 },
            { x: 44, z: 44, floors: 3 },
            { x: -44, z: 0, floors: 5 },
            { x: 44, z: 0, floors: 4 },
            { x: 0, z: -44, floors: 6 },
            { x: 0, z: 44, floors: 2 },
            { x: -88, z: -44, floors: 3 },
            { x: 88, z: -44, floors: 4 },
            { x: -88, z: 44, floors: 2 },
            { x: 88, z: 44, floors: 3 },
            { x: -44, z: -88, floors: 5 },
            { x: 44, z: -88, floors: 4 },
            { x: 0, z: -88, floors: 7 },
        ];

        blocks.forEach((b, i) => this._cityBlock(b.x, b.z, b.floors, i));
        this._hqTower(0, -70);
    }

    _cityBlock(cx, cz, floors, seed) {
        const bw = 28;
        const bd = 28;
        const floorH = 3.2;
        const h = floors * floorH;
        const color = PALETTE.building[seed % PALETTE.building.length];

        const wall = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
        const glass = new THREE.MeshStandardMaterial({
            color: PALETTE.glass, roughness: 0.2, metalness: 0.3,
            transparent: true, opacity: 0.7,
        });

        const body = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), wall);
        body.position.set(cx, h / 2, cz);
        body.castShadow = true;
        body.receiveShadow = true;
        this.scene.add(body);
        this.colliders.push({ x: cx, z: cz, w: bw + 1, d: bd + 1 });

        const winRows = floors - 1;
        const winCols = 5;
        for (let row = 1; row <= winRows; row++) {
            for (let col = 0; col < winCols; col++) {
                const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.2), glass);
                win.position.set(cx - 10 + col * 5, row * floorH, cz + bd / 2 + 0.02);
                this.scene.add(win);
            }
        }

        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(bw + 0.4, 0.3, bd + 0.4),
            new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.9 })
        );
        roof.position.set(cx, h + 0.15, cz);
        this.scene.add(roof);
    }

    _hqTower(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);

        const base = new THREE.Mesh(
            new THREE.BoxGeometry(30, 20, 20),
            new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.7 })
        );
        base.position.y = 10;
        base.castShadow = true;
        group.add(base);

        const tower = new THREE.Mesh(
            new THREE.BoxGeometry(14, 35, 14),
            new THREE.MeshStandardMaterial({ color: 0xe4eaf0, roughness: 0.6, metalness: 0.1 })
        );
        tower.position.y = 27.5;
        tower.castShadow = true;
        group.add(tower);

        const glass = new THREE.MeshStandardMaterial({
            color: PALETTE.glass, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.65,
        });
        for (let row = 1; row < 10; row++) {
            for (let s = 0; s < 4; s++) {
                const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.8), glass);
                const a = (s / 4) * Math.PI * 2;
                panel.position.set(Math.sin(a) * 7.01, 12 + row * 3.2, Math.cos(a) * 7.01);
                panel.lookAt(0, panel.position.y, 0);
                group.add(panel);
            }
        }

        const sign = new THREE.Mesh(
            new THREE.BoxGeometry(12, 1.5, 0.3),
            new THREE.MeshStandardMaterial({ color: PALETTE.accent, emissive: PALETTE.accent, emissiveIntensity: 0.15 })
        );
        sign.position.set(0, 42, 7.1);
        group.add(sign);

        this.scene.add(group);
        this.colliders.push({ x, z, w: 32, d: 22 });
    }

    _park() {
        const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(14, 14, 0.1, 32),
            new THREE.MeshStandardMaterial({ color: PALETTE.concrete, roughness: 0.8 })
        );
        pad.position.set(0, 0.05, 55);
        this.scene.add(pad);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(12, 13, 32),
            new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.4 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(0, 0.06, 55);
        this.scene.add(ring);
    }

    _palms() {
        const spots = [
            [-15, 30], [15, 30], [-20, 55], [20, 55],
            [-30, -20], [30, -20], [-60, 0], [60, 0],
            [-15, -50], [15, -50],
        ];
        spots.forEach(([x, z]) => this._palmTree(x, z));
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

        this._addPOI('hq', POI_TYPES.HQ, 0, -65, 10,
            `${site} HQ`, 'HEADQUARTERS', this._aboutText());

        (this.data.services || []).slice(0, 6).forEach((s, i) => {
            const spots = [[-44, -20], [44, -20], [-44, 20], [44, 20], [-88, 0], [88, 0]];
            const [x, z] = spots[i] || [i * 30, -40];
            this._addPOI(`svc-${i}`, POI_TYPES.SERVICE, x, z, 8, s.name, 'SERVICE', s.description);
        });

        (this.data.team || []).slice(0, 4).forEach((m, i) => {
            this._addPOI(`team-${i}`, POI_TYPES.TEAM, -8 + i * 5, 35, 5,
                m.name, m.role, `${m.name} — alien crew member, ${m.role} at ${site}.`);
        });

        (this.data.projects || []).slice(0, 4).forEach((p, i) => {
            this._addPOI(`proj-${i}`, POI_TYPES.PROJECT, -60 + i * 40, -90, 8,
                p.title, p.tech, p.description);
        });

        this._addPOI('contact', POI_TYPES.CONTACT, 0, -40, 8,
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
            new THREE.MeshStandardMaterial({ color: PALETTE.accent, emissive: PALETTE.accent, emissiveIntensity: 0.1 })
        );
        pole.position.y = 1.5;
        marker.add(pole);

        const icon = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: PALETTE.accent, emissiveIntensity: 0.2 })
        );
        icon.position.y = 3.2;
        marker.add(icon);

        this.scene.add(marker);
        this.pois.push({ id, type, position: new THREE.Vector3(x, 0, z), radius, title, subtitle, content, marker });
    }
}