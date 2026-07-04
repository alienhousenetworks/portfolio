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
        this._createRoads();
        this._createCity();
        this._createLandingZone();
        this._createPOIs();
        this._createDecorations();
        this._spawnAlienResidents();
        return { pois: this.pois, colliders: this.colliders, alienResidents: this.alienResidents };
    }

    _createSky() {
        this.scene.fog = new THREE.Fog(COLORS.fog, 180, 450);
        this.scene.background = new THREE.Color(COLORS.skyBottom);

        const skyGeo = new THREE.SphereGeometry(500, 32, 16);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                topColor: { value: new THREE.Color(COLORS.skyTop) },
                bottomColor: { value: new THREE.Color(COLORS.skyBottom) },
                offset: { value: 10 },
                exponent: { value: 0.35 },
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
        const ambient = new THREE.AmbientLight(0xffffff, 0.75);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xfff8e8, 1.8);
        sun.position.set(60, 100, 40);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.near = 1;
        sun.shadow.camera.far = 300;
        sun.shadow.camera.left = -100;
        sun.shadow.camera.right = 100;
        sun.shadow.camera.top = 100;
        sun.shadow.camera.bottom = -100;
        this.scene.add(sun);

        const fill = new THREE.HemisphereLight(COLORS.skyBottom, COLORS.grassLight, 0.65);
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

        const surfaceTex = this.loader.load(`${this.textureBase}earth_daymap.webp`);
        surfaceTex.wrapS = surfaceTex.wrapT = THREE.RepeatWrapping;
        surfaceTex.repeat.set(12, 12);

        const groundMat = new THREE.MeshStandardMaterial({
            map: surfaceTex,
            color: 0xd8f0b8,
            roughness: 0.88,
            metalness: 0.0,
        });

        const ground = new THREE.Mesh(geo, groundMat);
        ground.receiveShadow = true;
        ground.name = 'terrain';
        this.scene.add(ground);
        this.terrain = ground;
    }

    _createRoads() {
        const roadGroup = new THREE.Group();
        roadGroup.name = 'roads';

        const asphaltMat = new THREE.MeshStandardMaterial({
            color: COLORS.asphalt,
            roughness: 0.92,
            metalness: 0.05,
        });
        const sidewalkMat = new THREE.MeshStandardMaterial({
            color: COLORS.sidewalk,
            roughness: 0.85,
        });
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xf0f0e8 });

        const roads = [
            { x: 0, z: -40, w: 14, d: 200, rot: 0 },
            { x: -50, z: -40, w: 14, d: 160, rot: 0 },
            { x: 50, z: -40, w: 14, d: 160, rot: 0 },
            { x: 0, z: -100, w: 200, d: 14, rot: 0 },
            { x: 0, z: 20, w: 120, d: 14, rot: 0 },
            { x: -70, z: 30, w: 100, d: 12, rot: 0 },
            { x: 70, z: 30, w: 100, d: 12, rot: 0 },
        ];

        roads.forEach(r => {
            const road = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.08, r.d), asphaltMat);
            road.position.set(r.x, 0.04, r.z);
            road.receiveShadow = true;
            roadGroup.add(road);

            const sw1 = new THREE.Mesh(
                new THREE.BoxGeometry(r.w + 3, 0.06, 1.5),
                sidewalkMat
            );
            sw1.position.set(r.x, 0.05, r.z - r.d / 2 - 1);
            roadGroup.add(sw1);

            const sw2 = sw1.clone();
            sw2.position.z = r.z + r.d / 2 + 1;
            roadGroup.add(sw2);

            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, r.d * 0.8), lineMat);
            stripe.position.set(r.x, 0.06, r.z);
            roadGroup.add(stripe);
        });

        this.scene.add(roadGroup);
    }

    _createCity() {
        const cityGroup = new THREE.Group();
        cityGroup.name = 'city';

        const blocks = [
            { x: -35, z: -70, face: 'z' },
            { x: 35, z: -70, face: 'z' },
            { x: -35, z: -100, face: 'z' },
            { x: 35, z: -100, face: 'z' },
            { x: -70, z: -55, face: 'x' },
            { x: 70, z: -55, face: 'x' },
            { x: -55, z: 5, face: 'z' },
            { x: 55, z: 5, face: 'z' },
            { x: -75, z: 40, face: 'x' },
            { x: 75, z: 40, face: 'x' },
            { x: -30, z: -130, face: 'z' },
            { x: 30, z: -130, face: 'z' },
            { x: -90, z: -90, face: 'x' },
            { x: 90, z: -90, face: 'x' },
        ];

        blocks.forEach((block, idx) => {
            this._createGTABuilding(cityGroup, block.x, block.z, block.face, idx);
        });

        this._createHQBuilding(cityGroup);
        this._createStreetProps(cityGroup);
        this.scene.add(cityGroup);
    }

    _createGTABuilding(group, bx, bz, face, seed) {
        const w = 8 + (seed % 4) * 2;
        const d = 7 + (seed % 3) * 2;
        const h = 10 + (seed % 6) * 5 + Math.floor(seed / 3) * 3;
        const wallColor = COLORS.buildingPalette[seed % COLORS.buildingPalette.length];

        const wallMat = new THREE.MeshStandardMaterial({
            color: wallColor,
            roughness: 0.75,
            metalness: 0.05,
        });
        const roofMat = new THREE.MeshStandardMaterial({
            color: 0xd0ccc4,
            roughness: 0.9,
        });
        const glassMat = new THREE.MeshStandardMaterial({
            color: COLORS.windowGlass,
            roughness: 0.15,
            metalness: 0.4,
            transparent: true,
            opacity: 0.75,
        });

        const building = new THREE.Group();
        building.position.set(bx, 0, bz);

        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        body.position.y = h / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        building.add(body);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), roofMat);
        roof.position.y = h + 0.25;
        building.add(roof);

        const faceDir = face === 'z' ? 1 : -1;
        const faceOffset = face === 'z' ? d / 2 : w / 2;
        const rows = Math.floor(h / 2.8);
        const cols = Math.floor((face === 'z' ? w : d) / 2);

        for (let row = 1; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), glassMat.clone());
                if (face === 'z') {
                    win.position.set(-w / 2 + 1.5 + col * 2, 1.5 + row * 2.8, faceDir * (faceOffset + 0.02));
                } else {
                    win.position.set(faceDir * (faceOffset + 0.02), 1.5 + row * 2.8, -d / 2 + 1.5 + col * 2);
                    win.rotation.y = Math.PI / 2;
                }
                building.add(win);
            }
        }

        const trim = new THREE.Mesh(
            new THREE.BoxGeometry(face === 'z' ? w : w + 0.2, 0.3, face === 'z' ? d + 0.2 : d),
            new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })
        );
        trim.position.y = 0.15;
        building.add(trim);

        if (seed % 4 === 0) {
            const awning = new THREE.Mesh(
                new THREE.BoxGeometry(face === 'z' ? 3 : 0.2, 0.1, face === 'z' ? 0.2 : 3),
                new THREE.MeshStandardMaterial({ color: 0xf0a858, roughness: 0.8 })
            );
            awning.position.set(0, 2.5, face === 'z' ? faceDir * (faceOffset + 1) : 0);
            if (face !== 'z') awning.position.x = faceDir * (faceOffset + 1);
            building.add(awning);
        }

        group.add(building);
        this.colliders.push({ x: bx, z: bz, w: w + 1.5, d: d + 1.5 });
    }

    _createHQBuilding(group) {
        const hq = new THREE.Group();
        hq.position.set(0, 0, -60);

        const baseMat = new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.6, metalness: 0.1 });
        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x99ccee,
            roughness: 0.1,
            metalness: 0.5,
            transparent: true,
            opacity: 0.7,
        });
        const accentMat = new THREE.MeshStandardMaterial({
            color: COLORS.alien,
            emissive: COLORS.alien,
            emissiveIntensity: 0.15,
            roughness: 0.5,
        });

        const podium = new THREE.Mesh(new THREE.BoxGeometry(24, 4, 16), baseMat);
        podium.position.y = 2;
        podium.castShadow = true;
        hq.add(podium);

        const main = new THREE.Mesh(new THREE.BoxGeometry(20, 14, 12), baseMat);
        main.position.y = 11;
        main.castShadow = true;
        hq.add(main);

        const tower = new THREE.Mesh(new THREE.BoxGeometry(10, 28, 10), new THREE.MeshStandardMaterial({
            color: 0xe8eef5,
            roughness: 0.55,
            metalness: 0.15,
        }));
        tower.position.y = 22;
        tower.castShadow = true;
        hq.add(tower);

        for (let row = 1; row < 10; row++) {
            for (let side = 0; side < 4; side++) {
                const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2), glassMat.clone());
                const angle = (side / 4) * Math.PI * 2;
                panel.position.set(Math.sin(angle) * 5.05, 6 + row * 2.5, Math.cos(angle) * 5.05);
                panel.lookAt(0, panel.position.y, 0);
                hq.add(panel);
            }
        }

        const logo = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.25, 8, 24), accentMat);
        logo.position.set(0, 32, 5.1);
        hq.add(logo);

        const entrance = new THREE.Mesh(
            new THREE.BoxGeometry(6, 4, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.6, roughness: 0.3 })
        );
        entrance.position.set(0, 2, 8.1);
        hq.add(entrance);

        this.colliders.push({ x: 0, z: -60, w: 26, d: 18 });
        group.add(hq);
    }

    _createStreetProps(group) {
        const poleMat = new THREE.MeshStandardMaterial({ color: 0x888890, metalness: 0.5, roughness: 0.4 });
        const lampMat = new THREE.MeshStandardMaterial({
            color: 0xffffee,
            emissive: 0xffffcc,
            emissiveIntensity: 0.3,
        });

        const polePositions = [
            [-20, -50], [20, -50], [-20, -90], [20, -90],
            [-40, -30], [40, -30], [-60, -70], [60, -70],
        ];

        polePositions.forEach(([px, pz]) => {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 5, 8), poleMat);
            pole.position.set(px, 2.5, pz);
            group.add(pole);

            const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), lampMat);
            lamp.position.set(px, 5.2, pz);
            group.add(lamp);

            const light = new THREE.PointLight(0xfff8e0, 0.6, 18);
            light.position.set(px, 5, pz);
            group.add(light);
        });
    }

    _createLandingZone() {
        const pad = new THREE.Mesh(
            new THREE.CircleGeometry(12, 32),
            new THREE.MeshStandardMaterial({
                color: COLORS.concrete,
                roughness: 0.7,
                metalness: 0.1,
            })
        );
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(0, 0.05, 30);
        pad.receiveShadow = true;
        this.scene.add(pad);

        const ringMat = new THREE.MeshBasicMaterial({
            color: COLORS.alien,
            transparent: true,
            opacity: 0.35,
        });
        for (let r = 0; r < 2; r++) {
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
                emissiveIntensity: 0.2,
                transparent: true,
                opacity: 0.85,
            })
        );
        pillar.position.y = 3;
        group.add(pillar);

        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(1.5, 0.05, 8, 24),
            new THREE.MeshBasicMaterial({ color: COLORS.alienCyan, transparent: true, opacity: 0.5 })
        );
        ring.position.y = 0.3;
        ring.rotation.x = Math.PI / 2;
        group.add(ring);

        const light = new THREE.PointLight(COLORS.alien, 0.5, 12);
        light.position.y = 5;
        group.add(light);

        if (config.type === POI_TYPES.SERVICE) {
            const platform = new THREE.Mesh(
                new THREE.BoxGeometry(4, 0.3, 4),
                new THREE.MeshStandardMaterial({ color: COLORS.concrete, roughness: 0.8 })
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
                    emissiveIntensity: 0.25,
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

        const flowerColors = [0xffaacc, 0xffdd77, 0xccaaee, 0xaaddff, 0xffbb88];
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
                color: COLORS.grassLight,
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
                    child.material.emissiveIntensity = 0.15 + Math.sin(elapsed * 2 + i) * 0.1;
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