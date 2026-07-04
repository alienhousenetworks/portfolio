import * as THREE from 'three';
import { COLORS, WORLD_SIZE, POI_TYPES } from './config.js';
import { createAvatar } from './AvatarFactory.js';

export class WorldBuilder {
    constructor(scene, textureLoader, gameData, textureBase = '/static/core/textures/') {
        this.scene = scene;
        this.loader = textureLoader;
        this.data = gameData;
        this.textureBase = textureBase;
        this.pois = [];
        this.colliders = [];
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
        return { pois: this.pois, colliders: this.colliders };
    }

    _createSky() {
        this.scene.fog = new THREE.FogExp2(COLORS.fog, 0.008);
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
        const ambient = new THREE.AmbientLight(0x88aa88, 0.4);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xfff5e0, 1.2);
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

        const fill = new THREE.HemisphereLight(COLORS.alienDim, COLORS.ground, 0.5);
        this.scene.add(fill);

        const planetGlow = new THREE.PointLight(COLORS.alien, 0.8, 200);
        planetGlow.position.set(0, 30, 0);
        this.scene.add(planetGlow);
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
            let y = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2;
            y += Math.sin(x * 0.12 + z * 0.08) * 1.5;
            y += (Math.random() - 0.5) * 0.3;
            if (dist < 25) y *= dist / 25;
            positions.setY(i, y);
        }
        geo.computeVertexNormals();

        const surfaceTex = this.loader.load(`${this.textureBase}alien_planet_surface_v2.webp`);
        surfaceTex.wrapS = surfaceTex.wrapT = THREE.RepeatWrapping;
        surfaceTex.repeat.set(20, 20);

        const groundMat = new THREE.MeshStandardMaterial({
            map: surfaceTex,
            color: 0x88cc88,
            roughness: 0.9,
            metalness: 0.05,
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

        this.data.services.forEach((svc, i) => {
            const angle = (i / Math.max(this.data.services.length, 1)) * Math.PI * 1.5 - Math.PI * 0.75;
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

        this.data.team.forEach((member, i) => {
            const x = -30 + i * 15;
            this._addPOI({
                id: `team-${i}`,
                type: POI_TYPES.TEAM,
                position: new THREE.Vector3(x, 0, 10),
                radius: 4,
                title: member.name,
                subtitle: member.role,
                content: `${member.name} is part of the ${this.data.siteName} crew, specializing in ${member.role}.`,
                npc: member,
            });
        });

        this.data.projects.forEach((proj, i) => {
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

        this.data.tactics.forEach((tactic, i) => {
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
        const crystalGeo = new THREE.OctahedronGeometry(1);
        const crystalMat = new THREE.MeshStandardMaterial({
            color: COLORS.alienCyan,
            emissive: COLORS.alienCyan,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.8,
        });

        for (let i = 0; i < 30; i++) {
            const crystal = new THREE.Mesh(crystalGeo, crystalMat);
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 150;
            crystal.position.set(Math.sin(angle) * dist, 1 + Math.random() * 3, Math.cos(angle) * dist);
            crystal.scale.setScalar(0.5 + Math.random() * 1.5);
            crystal.rotation.set(Math.random(), Math.random(), Math.random());
            this.scene.add(crystal);
        }

        const treeGroup = new THREE.Group();
        for (let i = 0; i < 40; i++) {
            const tree = this._createAlienTree();
            const angle = Math.random() * Math.PI * 2;
            const dist = 20 + Math.random() * 170;
            tree.position.set(Math.sin(angle) * dist, 0, Math.cos(angle) * dist);
            treeGroup.add(tree);
        }
        this.scene.add(treeGroup);
    }

    _createAlienTree() {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.15, 0.3, 3, 6),
            new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 })
        );
        trunk.position.y = 1.5;
        tree.add(trunk);

        const canopy = new THREE.Mesh(
            new THREE.SphereGeometry(1.5, 8, 8),
            new THREE.MeshStandardMaterial({
                color: COLORS.alienDim,
                emissive: COLORS.alien,
                emissiveIntensity: 0.15,
                roughness: 0.7,
            })
        );
        canopy.position.y = 3.5;
        canopy.scale.y = 1.5;
        tree.add(canopy);
        return tree;
    }

    _formatAbout() {
        if (!this.data.about.length) {
            return this.data.hero.subtext;
        }
        return this.data.about.map(a => `${a.heading}: ${a.subheading}`).join('\n\n');
    }

    getTerrainHeight(x, z) {
        if (!this.terrain) return 0;
        const raycaster = new THREE.Raycaster();
        raycaster.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
        const hits = raycaster.intersectObject(this.terrain);
        return hits.length ? hits[0].point.y : 0;
    }
}