import * as THREE from 'three';
import { COLORS, WORLD_SIZE, POI_TYPES } from './config.js';
import { createAlienAvatar } from './AvatarFactory.js';

export class WorldBuilder {
    constructor(scene, textureLoader, gameData, textureBase = '/static/core/textures/') {
        this.scene = scene;
        this.loader = textureLoader;
        this.data = gameData;
        this.textureBase = textureBase;
        this.pois = [];
        this.colliders = [];
        this.alienResidents = [];
        this.groundY = 0;
    }

    build() {
        this._createSky();
        this._createLighting();
        this._createTerrain();
        this._createCity();
        this._createLandingZone();
        this._createPOIs();
        this._createDecorations();
        this._spawnAlienResidents();
        return { pois: this.pois, colliders: this.colliders, alienResidents: this.alienResidents };
    }

    _createSky() {
        this.scene.fog = new THREE.Fog(COLORS.fog, 80, 350);
        this.scene.background = new THREE.Color(COLORS.skyTop);

        const skyGeo = new THREE.SphereGeometry(500, 32, 16);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                topColor: { value: new THREE.Color(COLORS.skyTop) },
                bottomColor: { value: new THREE.Color(COLORS.skyBottom) },
                offset: { value: 20 },
                exponent: { value: 0.5 },
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
        });
        this.scene.add(new THREE.Mesh(skyGeo, skyMat));
    }

    _createLighting() {
        const ambient = new THREE.AmbientLight(0xd4e8f0, 0.55);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xfff4d6, 1.4);
        sun.position.set(80, 120, 60);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 300;
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        this.scene.add(sun);

        const fill = new THREE.HemisphereLight(COLORS.skyBottom, COLORS.grass, 0.45);
        this.scene.add(fill);
    }

    _createTerrain() {
        const segments = 128;
        const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, segments, segments);
        geo.rotateX(-Math.PI / 2);

        const positions = geo.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getZ(i);
            const dist = Math.sqrt(x * x + z * z);
            let y = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 1.8;
            y += Math.sin(x * 0.1 + z * 0.07) * 1.2;
            y += (Math.random() - 0.5) * 0.2;
            if (dist < 30) y *= dist / 30;
            positions.setY(i, y);
        }
        geo.computeVertexNormals();

        const surfaceTex = this.loader.load(`${this.textureBase}alien_earth_like_surface.webp`);
        surfaceTex.wrapS = surfaceTex.wrapT = THREE.RepeatWrapping;
        surfaceTex.repeat.set(16, 16);

        const groundMat = new THREE.MeshStandardMaterial({
            map: surfaceTex,
            color: 0xa8d8a0,
            roughness: 0.95,
            metalness: 0.0,
        });

        const ground = new THREE.Mesh(geo, groundMat);
        ground.receiveShadow = true;
        ground.name = 'terrain';
        this.scene.add(ground);
        this.terrain = ground;
    }

    _createCity() {
        const cityGroup = new THREE.Group();
        cityGroup.name = 'city';

        const buildingMat = new THREE.MeshStandardMaterial({
            color: COLORS.building,
            roughness: 0.8,
            metalness: 0.2,
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: COLORS.buildingAccent,
            emissive: COLORS.buildingAccent,
            emissiveIntensity: 0.3,
        });

        const layouts = [
            { x: -60, z: -80, count: 8, dir: 1 },
            { x: 60, z: -80, count: 8, dir: -1 },
            { x: -80, z: 40, count: 6, dir: 1 },
            { x: 80, z: 40, count: 6, dir: -1 },
            { x: 0, z: -120, count: 10, dir: 0 },
        ];

        layouts.forEach(layout => {
            for (let i = 0; i < layout.count; i++) {
                const w = 4 + Math.random() * 6;
                const h = 8 + Math.random() * 25;
                const d = 4 + Math.random() * 6;
                const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildingMat);
                const bx = layout.x + (layout.dir !== 0 ? layout.dir * i * 12 : (i - 5) * 14);
                const bz = layout.z + (layout.dir === 0 ? 0 : Math.random() * 8);
                building.position.set(bx, h / 2, bz);
                building.castShadow = true;
                building.receiveShadow = true;
                cityGroup.add(building);
                this.colliders.push({ x: bx, z: bz, w: w + 1, d: d + 1 });

                const windowRows = Math.floor(h / 3);
                for (let row = 0; row < windowRows; row++) {
                    const winCount = Math.floor(w / 1.5);
                    for (let wn = 0; wn < winCount; wn++) {
                        if (Math.random() > 0.6) {
                            const win = new THREE.Mesh(
                                new THREE.PlaneGeometry(0.8, 1.2),
                                accentMat.clone()
                            );
                            win.material.emissiveIntensity = 0.1 + Math.random() * 0.4;
                            win.position.set(
                                bx - w / 2 + 1 + wn * 1.5,
                                2 + row * 3,
                                bz + d / 2 + 0.01
                            );
                            cityGroup.add(win);
                        }
                    }
                }
            }
        });

        this._createHQBuilding(cityGroup, buildingMat, accentMat);
        this.scene.add(cityGroup);
    }

    _createHQBuilding(group, buildingMat, accentMat) {
        const hq = new THREE.Group();
        hq.position.set(0, 0, -60);

        const main = new THREE.Mesh(new THREE.BoxGeometry(20, 15, 12), buildingMat);
        main.position.y = 7.5;
        main.castShadow = true;
        hq.add(main);
        this.colliders.push({ x: 0, z: -60, w: 22, d: 14 });

        const tower = new THREE.Mesh(new THREE.BoxGeometry(6, 25, 6), buildingMat);
        tower.position.set(0, 12.5, 0);
        tower.castShadow = true;
        hq.add(tower);

        const logo = new THREE.Mesh(
            new THREE.TorusGeometry(3, 0.3, 8, 24),
            accentMat
        );
        logo.position.set(0, 18, 6.1);
        hq.add(logo);

        const antenna = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, 8),
            accentMat
        );
        antenna.position.set(0, 29, 0);
        hq.add(antenna);

        const beacon = new THREE.PointLight(COLORS.alien, 2, 30);
        beacon.position.set(0, 33, 0);
        hq.add(beacon);

        group.add(hq);
    }

    _createLandingZone() {
        const pad = new THREE.Mesh(
            new THREE.CircleGeometry(12, 32),
            new THREE.MeshStandardMaterial({
                color: COLORS.alienDim,
                emissive: COLORS.alien,
                emissiveIntensity: 0.1,
                roughness: 0.6,
                metalness: 0.4,
            })
        );
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(0, 0.05, 30);
        pad.receiveShadow = true;
        this.scene.add(pad);

        const ringMat = new THREE.MeshBasicMaterial({
            color: COLORS.alien,
            transparent: true,
            opacity: 0.6,
        });
        for (let r = 0; r < 3; r++) {
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(8 + r * 2, 8.3 + r * 2, 32),
                ringMat
            );
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(0, 0.06 + r * 0.01, 30);
            this.scene.add(ring);
        }
    }

    _createPOIs() {
        this._addPOI({
            id: 'hq',
            type: POI_TYPES.HQ,
            position: new THREE.Vector3(0, 0, -55),
            radius: 8,
            title: `${this.data.siteName} HQ`,
            subtitle: '// COMMAND CENTER',
            content: this._formatAbout(),
        });

        (this.data.services || []).forEach((svc, i) => {
            const angle = (i / Math.max((this.data.services || []).length, 1)) * Math.PI * 1.5 - Math.PI * 0.75;
            const dist = 45 + (i % 3) * 10;
            this._addPOI({
                id: `service-${i}`,
                type: POI_TYPES.SERVICE,
                position: new THREE.Vector3(Math.sin(angle) * dist, 0, Math.cos(angle) * dist - 20),
                radius: 5,
                title: svc.name,
                subtitle: '// SERVICE MODULE',
                content: svc.description,
            });
        });

        (this.data.team || []).forEach((member, i) => {
            const x = -30 + i * 15;
            this._addPOI({
                id: `team-${i}`,
                type: POI_TYPES.TEAM,
                position: new THREE.Vector3(x, 0, 10),
                radius: 4,
                title: member.name,
                subtitle: member.role,
                content: `${member.name} is an alien inhabitant of this planet and part of the ${this.data.siteName} crew, specializing in ${member.role}.`,
                npc: member,
            });
        });

        (this.data.projects || []).forEach((proj, i) => {
            const x = -50 + i * 25;
            this._addPOI({
                id: `project-${i}`,
                type: POI_TYPES.PROJECT,
                position: new THREE.Vector3(x, 0, -100),
                radius: 5,
                title: proj.title,
                subtitle: proj.tech,
                content: proj.description,
            });
        });

        (this.data.tactics || []).forEach((tactic, i) => {
            this._addPOI({
                id: `tactic-${i}`,
                type: POI_TYPES.TACTIC,
                position: new THREE.Vector3(50 + i * 12, 0, 50),
                radius: 4,
                title: tactic.title,
                subtitle: '// TACTICAL ADVANTAGE',
                content: tactic.description,
            });
        });

        this._addPOI({
            id: 'contact',
            type: POI_TYPES.CONTACT,
            position: new THREE.Vector3(0, 0, -30),
            radius: 5,
            title: 'Establish Connection',
            subtitle: '// UPLINK BEACON',
            content: `Ready to collaborate? Reach us at ${this.data.email}`,
        });
    }

    _addPOI(config) {
        const marker = this._createMarker(config);
        this.scene.add(marker);
        this.pois.push({ ...config, marker });
    }

    _createMarker(config) {
        const group = new THREE.Group();
        group.position.copy(config.position);

        const pillar = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.3, 6, 8),
            new THREE.MeshStandardMaterial({
                color: COLORS.alien,
                emissive: COLORS.alien,
                emissiveIntensity: 0.5,
                transparent: true,
                opacity: 0.7,
            })
        );
        pillar.position.y = 3;
        group.add(pillar);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.5, 0.05, 8, 24),
            new THREE.MeshBasicMaterial({ color: COLORS.alienCyan, transparent: true, opacity: 0.8 })
        );
        ring.position.y = 0.3;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        const light = new THREE.PointLight(COLORS.alien, 1, 12);
        light.position.y = 5;
        group.add(light);

        if (config.type === POI_TYPES.SERVICE) {
            const platform = new THREE.Mesh(
                new THREE.BoxGeometry(4, 0.3, 4),
                new THREE.MeshStandardMaterial({ color: COLORS.building, emissive: COLORS.alienDim, emissiveIntensity: 0.1 })
            );
            platform.position.y = 0.15;
            group.add(platform);
        }

        if (config.type === POI_TYPES.PROJECT) {
            const holo = new THREE.Mesh(
                new THREE.OctahedronGeometry(1.5),
                new THREE.MeshStandardMaterial({
                    color: COLORS.alienCyan,
                    emissive: COLORS.alienCyan,
                    emissiveIntensity: 0.6,
                    wireframe: true,
                })
            );
            holo.position.y = 4;
            holo.name = 'holo';
            group.add(holo);
        }

        group.userData.poiId = config.id;
        return group;
    }

    _createDecorations() {
        const treeGroup = new THREE.Group();
        for (let i = 0; i < 55; i++) {
            const tree = this._createEarthTree();
            const angle = Math.random() * Math.PI * 2;
            const dist = 25 + Math.random() * 160;
            const tx = Math.sin(angle) * dist;
            const tz = Math.cos(angle) * dist;
            if (Math.abs(tx) < 15 && Math.abs(tz - 30) < 15) continue;
            tree.position.set(tx, 0, tz);
            treeGroup.add(tree);
        }
        this.scene.add(treeGroup);

        const flowerColors = [0xff88aa, 0xffcc66, 0xaa88ff, 0x88ddff];
        for (let i = 0; i < 80; i++) {
            const flower = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 6, 6),
                new THREE.MeshStandardMaterial({
                    color: flowerColors[i % flowerColors.length],
                    roughness: 0.8,
                })
            );
            const angle = Math.random() * Math.PI * 2;
            const dist = 15 + Math.random() * 120;
            flower.position.set(Math.sin(angle) * dist, 0.12, Math.cos(angle) * dist);
            this.scene.add(flower);
        }
    }

    _createEarthTree() {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.22, 2.8, 8),
            new THREE.MeshStandardMaterial({ color: COLORS.earthBrown, roughness: 0.95 })
        );
        trunk.position.y = 1.4;
        tree.add(trunk);

        const foliage = new THREE.Mesh(
            new THREE.SphereGeometry(1.6, 10, 10),
            new THREE.MeshStandardMaterial({
                color: COLORS.grass,
                roughness: 0.85,
            })
        );
        foliage.position.y = 3.4;
        foliage.scale.set(1, 1.2, 1);
        tree.add(foliage);

        const foliage2 = foliage.clone();
        foliage2.position.y = 4.2;
        foliage2.scale.set(0.7, 0.8, 0.7);
        tree.add(foliage2);

        return tree;
    }

    _spawnAlienResidents() {
        const residentNames = ['Zyx', 'Nara', 'Kov', 'Eli', 'Pax', 'Ryn', 'Oma', 'Dex'];
        for (let i = 0; i < 12; i++) {
            const alien = createAlienAvatar({
                name: residentNames[i % residentNames.length] + (i > 7 ? `-${i}` : ''),
                variant: i,
                scale: 0.85 + Math.random() * 0.15,
            });
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 100;
            alien.position.set(Math.sin(angle) * dist, 0, Math.cos(angle) * dist);
            alien.position.y = this.getTerrainHeight(alien.position.x, alien.position.z);
            alien.userData.wanderAngle = Math.random() * Math.PI * 2;
            alien.userData.wanderSpeed = 0.3 + Math.random() * 0.5;
            alien.userData.homeX = alien.position.x;
            alien.userData.homeZ = alien.position.z;
            this.scene.add(alien);
            this.alienResidents.push(alien);
        }
    }

    updateResidents(dt, elapsed) {
        this.alienResidents.forEach((alien, i) => {
            alien.userData.wanderAngle += dt * alien.userData.wanderSpeed;
            const radius = 3 + (i % 4);
            alien.position.x = alien.userData.homeX + Math.sin(alien.userData.wanderAngle) * radius;
            alien.position.z = alien.userData.homeZ + Math.cos(alien.userData.wanderAngle) * radius;
            alien.position.y = this.getTerrainHeight(alien.position.x, alien.position.z);
            alien.rotation.y = alien.userData.wanderAngle + Math.PI;
            alien.children.forEach(child => {
                if (child.material?.emissive) {
                    child.material.emissiveIntensity = 0.4 + Math.sin(elapsed * 2 + i) * 0.2;
                }
            });
        });
    }

    _formatAbout() {
        const about = this.data.about || [];
        const hero = this.data.hero || {};
        if (!about.length) {
            return hero.subtext || 'Welcome to AlienHouse Networks.';
        }
        return about.map(a => `${a.heading}: ${a.subheading}`).join('\n\n');
    }

    getTerrainHeight(x, z) {
        if (!this.terrain) return 0;
        const raycaster = new THREE.Raycaster();
        raycaster.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
        const hits = raycaster.intersectObject(this.terrain);
        return hits.length ? hits[0].point.y : 0;
    }
}