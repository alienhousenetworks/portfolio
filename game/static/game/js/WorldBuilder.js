import * as THREE from 'three';
import { WORLD, PALETTE, POI_TYPES } from './config.js';
import { DISTRICT_DEFS } from './Districts.js';
import { createRandomBuilding, createServiceBuilding } from './Buildings.js';

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
        this._districtZones();
        this._roadGrid();
        this._city();
        this._dbBuildings();
        this._park();
        this._palms();
        this._pois();
        return { pois: this.pois, colliders: this.colliders, buildings: this.data.buildings || [] };
    }

    getTerrainHeight() { return WORLD.groundY; }

    _inPark(x, z, margin = 0) {
        const dx = x - WORLD.parkX;
        const dz = z - WORLD.parkZ;
        return Math.sqrt(dx * dx + dz * dz) < WORLD.parkRadius + margin;
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

    _districtZones() {
        Object.values(DISTRICT_DEFS).forEach(d => {
            if (d.id === 'downtown') return;
            const pad = new THREE.Mesh(
                new THREE.CircleGeometry(d.radius, 32),
                new THREE.MeshStandardMaterial({
                    color: d.groundColor,
                    roughness: 0.95,
                    transparent: true,
                    opacity: d.id === 'park' ? 0.5 : 0.35,
                })
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
        const post = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 4, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.4 })
        );
        post.position.y = 2;
        g.add(post);
        const board = new THREE.Mesh(
            new THREE.BoxGeometry(12, 2.5, 0.2),
            new THREE.MeshStandardMaterial({ color: color, emissive: new THREE.Color(color), emissiveIntensity: 0.1 })
        );
        board.position.y = 4.5;
        g.add(board);
        return g;
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
                if (this._isOccupied(cx, cz)) continue;

                const floors = 2 + ((Math.abs(gx) + Math.abs(gz) + seed) % 5);
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
                b.x, b.z, 14,
                b.title, b.subtitle, b.content || b.description,
                b.district
            );
        });
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
        this._markSite(x, z, 30, 20);
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

        this._addPOI('hq', POI_TYPES.HQ, 0, -115, 12, `${site} HQ`, 'HEADQUARTERS', this._aboutText(), 'hq');

        (this.data.team || []).slice(0, 4).forEach((m, i) => {
            this._addPOI(`team-${i}`, POI_TYPES.TEAM, -10 + i * 7, WORLD.parkZ - 18, 6,
                m.name, m.role, `${m.name} — ${m.role} at ${site}.`, 'park');
        });

        this._addPOI('contact', POI_TYPES.CONTACT, 0, -60, 10,
            'Contact', 'UPLINK', `Reach us at ${this.data.email || 'signal@alienhouse.net'}`, 'hq');
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
            [POI_TYPES.HQ]: 0x00cc44,
            [POI_TYPES.SERVICE]: 0x4488ff,
            [POI_TYPES.PROJECT]: 0x88aa44,
            [POI_TYPES.TEAM]: 0xcc88ff,
            [POI_TYPES.CONTACT]: 0xffaa66,
        };
        const col = colors[type] || PALETTE.accent;

        const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.12, 3, 6),
            new THREE.MeshStandardMaterial({ color: col, emissive: new THREE.Color(col), emissiveIntensity: 0.1 })
        );
        pole.position.y = 1.5;
        marker.add(pole);

        const icon = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(col), emissiveIntensity: 0.2 })
        );
        icon.position.y = 3.2;
        marker.add(icon);

        this.scene.add(marker);
        this.pois.push({
            id, type, position: new THREE.Vector3(x, 0, z), radius,
            title, subtitle, content, marker, district,
            mapLabel: title.length > 10 ? title.slice(0, 9) + '…' : title,
        });
    }
}