import * as THREE from 'three';
import { WORLD } from './config.js';
import { getAnimatedHumanKey } from './CharacterModels.js';
import {
    createHumanAvatar, createAlienAvatar, createNameTag,
    createStudentAvatar, createCommuterAvatar, createWandererAvatar, createCyclistAvatar,
    setCharacterPose, tickAnimator, updateLocomotionPose,
    animateWanderer, animateCyclist,
} from './AvatarFactory.js';
import { isRiggedAvatar } from './CharacterAnimator.js';

const HUMAN_NAMES = ['Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Jamie', 'Quinn', 'Avery'];
const ALIEN_NAMES = ['Zyx', 'Nara', 'Kov', 'Eli', 'Pax', 'Ryn', 'Oma', 'Dex', 'Vex', 'Luma', 'Kira', 'Zeno'];
const STUDENT_NAMES = ['Yuki', 'Hana', 'Ren', 'Mio', 'Sora', 'Aki'];
const HUMAN_LINES = [
    'Just moved here. This city feels like a quiet afternoon painting.',
    'The river breeze is perfect today.',
    'Have you tried the metro? It glides right above downtown.',
    'I work at the tech district. AlienHouse builds amazing stuff.',
    'The buses are delightfully boxy. I love them.',
    'Beautiful late afternoon light. Perfect for exploring.',
];
const ALIEN_LINES = [
    'Greetings, traveler! Welcome to our world.',
    'We have lived on this planet for generations. Humans are always welcome.',
    'The green embankments along the river are my favorite.',
    'AlienHouse taught me everything about engineering.',
    'You should visit the HQ tower. It is magnificent.',
    'Our elevated metro was built by the finest architects.',
];

export class CitizenManager {
    constructor(scene, terrain = null) {
        this.scene = scene;
        this.terrain = terrain;
        this.citizens = [];
    }

    _groundY(x, z) {
        return this.terrain ? this.terrain.getHeightAt(x, z) : WORLD.groundY;
    }

    spawn(teamMembers = [], buildings = []) {
        this._spawnStudents();
        this._spawnCommuters();
        this._spawnWanderer();
        this._spawnCyclists();
        this._spawnParkLife();

        const spots = this._walkSpots();
        for (let i = 0; i < 10; i++) {
            const spot = spots[i % spots.length];
            const mesh = createHumanAvatar({ modelKey: getAnimatedHumanKey(i), variant: i });
            this._placeCitizen(mesh, spot, HUMAN_NAMES[i % HUMAN_NAMES.length], 'human', HUMAN_LINES[i % HUMAN_LINES.length], i * 0.7);
        }

        for (let i = 0; i < 12; i++) {
            const spot = spots[(i + 5) % spots.length];
            const mesh = createAlienAvatar({ variant: i });
            this._placeCitizen(mesh, spot, ALIEN_NAMES[i % ALIEN_NAMES.length], 'alien', ALIEN_LINES[i % ALIEN_LINES.length], i * 0.5 + 2);
        }

        teamMembers.slice(0, 6).forEach((m, i) => {
            const mesh = createAlienAvatar({ variant: i + 1 });
            mesh.position.set(-12 + i * 4, this._groundY(-12 + i * 4, WORLD.parkZ - 12 - i), WORLD.parkZ - 12 - i);
            mesh.visible = false;
            mesh.add(createNameTag(m.name));
            this.scene.add(mesh);
            this.citizens.push({
                mesh, name: m.name, type: 'team',
                subtitle: 'ALIENHOUSE CREW',
                line: `I'm ${m.name}, ${m.role}. Proud to represent AlienHouse on this planet!`,
                speed: 0, phase: i, visible: false, isTeam: true,
            });
        });

        this.spawnBuildingHosts(buildings);
    }

    _spawnStudents() {
        const riverPairs = [
            { x: 18, z: -60, rx: 22, rz: -40 },
            { x: 22, z: -58, rx: 26, rz: -38 },
            { x: -18, z: 40, rx: -22, rz: 60 },
            { x: -22, z: 42, rx: -26, rz: 62 },
            { x: 20, z: 100, rx: 24, rz: 120 },
            { x: 24, z: 98, rx: 28, rz: 118 },
        ];
        riverPairs.forEach((spot, i) => {
            const mesh = createStudentAvatar({ variant: i });
            this._placeCitizen(
                mesh, spot,
                STUDENT_NAMES[i % STUDENT_NAMES.length], 'student',
                'Heading home along the riverbank. The light is gorgeous today.',
                i * 0.4, 0.9
            );
        });
    }

    _spawnCommuters() {
        const platforms = [
            { x: -80, z: -80 }, { x: -80, z: 120 }, { x: 80, z: -60 }, { x: 80, z: 140 },
        ];
        platforms.forEach((spot, i) => {
            const mesh = createCommuterAvatar({ variant: i });
            mesh.position.set(spot.x + (i % 2) * 2, this._groundY(spot.x, spot.z), spot.z);
            mesh.rotation.y = Math.PI / 2;
            mesh.add(createNameTag(HUMAN_NAMES[i % HUMAN_NAMES.length]));
            this.scene.add(mesh);
            this.citizens.push({
                mesh,
                name: HUMAN_NAMES[i % HUMAN_NAMES.length],
                type: 'commuter',
                subtitle: 'COMMUTER',
                line: 'Waiting for the metro. Just checking messages.',
                speed: 0,
                phase: i,
                isCommuter: true,
            });
        });
    }

    _spawnWanderer() {
        const spot = { x: 58, z: 52 };
        const mesh = createWandererAvatar({ variant: 2 });
        mesh.position.set(spot.x, this._groundY(spot.x, spot.z), spot.z);
        mesh.rotation.y = -0.6;
        mesh.add(createNameTag('Kai'));
        this.scene.add(mesh);
        this.citizens.push({
            mesh, name: 'Kai', type: 'wanderer',
            subtitle: 'WANDERER',
            line: 'Nothing like a cold soda on a breezy afternoon.',
            speed: 0, phase: 0, isWanderer: true, wanderT: 0,
        });
    }

    _spawnParkLife() {
        const parkSpots = [
            { x: WORLD.parkX - 8, z: WORLD.parkZ + 5, line: 'Perfect weather for cherry blossoms.' },
            { x: WORLD.parkX + 10, z: WORLD.parkZ - 6, line: 'This bench is my favorite reading spot.' },
            { x: WORLD.parkX, z: WORLD.parkZ + 14, line: 'The fountain sounds so peaceful.' },
        ];
        parkSpots.forEach((spot, i) => {
            const mesh = createHumanAvatar({ variant: i + 1 });
            mesh.position.set(spot.x, this._groundY(spot.x, spot.z), spot.z);
            mesh.add(createNameTag(['Sora', 'Hana', 'Ren'][i]));
            this.scene.add(mesh);
            this.citizens.push({
                mesh, name: ['Sora', 'Hana', 'Ren'][i], type: 'human',
                subtitle: 'PARK VISITOR', line: spot.line,
                speed: 0, phase: i, isParkVisitor: true,
            });
        });
    }

    _spawnCyclists() {
        const routes = [
            { x: -160, z: -120, rx: -120, rz: -90, speed: 2.2 },
            { x: 150, z: -100, rx: 120, rz: -75, speed: 1.8 },
            { x: -140, z: 130, rx: -100, rz: 100, speed: 2.0 },
            { x: 130, z: 110, rx: 100, rz: 85, speed: 2.4 },
        ];
        routes.forEach((route, i) => {
            const mesh = createCyclistAvatar({ variant: i });
            this._placeCitizen(
                mesh,
                { x: route.x, z: route.z, rx: route.rx, rz: route.rz },
                HUMAN_NAMES[(i + 3) % HUMAN_NAMES.length], 'cyclist',
                'Coasting down the slope. These mamachari bikes are the best.',
                i * 1.1, route.speed
            );
            this.citizens[this.citizens.length - 1].isCyclist = true;
        });
    }

    spawnBuildingHosts(buildings = []) {
        buildings.forEach((b, i) => {
            const isAlien = b.hostType === 'alien';
            const mesh = isAlien
                ? createAlienAvatar({ variant: i })
                : createHumanAvatar({ variant: i });

            mesh.position.set(b.hostX, this._groundY(b.hostX, b.hostZ), b.hostZ);
            mesh.rotation.y = Math.atan2(b.x - b.hostX, b.z - b.hostZ);
            mesh.add(createNameTag(b.hostName));
            this.scene.add(mesh);

            this.citizens.push({
                mesh,
                name: b.hostName,
                type: isAlien ? 'alien' : 'human',
                subtitle: b.subtitle || 'BUILDING HOST',
                line: b.hostLine || b.shortDescription || '',
                panelContent: b.panelContent || b.content || b.description || '',
                panelTitle: b.title,
                isHost: true,
                buildingId: b.id,
                buildingTitle: b.title,
                speed: 0,
                homeX: b.hostX,
                homeZ: b.hostZ,
                targetX: b.hostX,
                targetZ: b.hostZ,
                phase: i,
            });
        });
    }

    _walkSpots() {
        const spots = [];
        for (let i = -5; i <= 5; i++) {
            for (let j = -5; j <= 5; j++) {
                if (i === 0 && j === 0) continue;
                const x = i * WORLD.roadSpacing + 8;
                const z = j * WORLD.roadSpacing + 8;
                if (Math.abs(x) < 28 && Math.abs(z) < 20) continue;
                if (Math.abs(x) < 20 && Math.abs(z - WORLD.parkZ) < 35) continue;
                spots.push({ x, z, rx: x + 10, rz: z + 10 });
            }
        }
        return spots;
    }

    _placeCitizen(mesh, spot, name, type, line, phase, speed = null) {
        mesh.position.set(spot.x, this._groundY(spot.x, spot.z), spot.z);
        mesh.add(createNameTag(name));
        this.scene.add(mesh);
        this.citizens.push({
            mesh, name, type,
            subtitle: type === 'human' ? 'HUMAN CITIZEN'
                : type === 'student' ? 'STUDENT'
                    : type === 'cyclist' ? 'CYCLIST'
                        : type === 'alien' ? 'ALIEN CITIZEN' : 'CITIZEN',
            line,
            homeX: spot.x, homeZ: spot.z,
            targetX: spot.rx, targetZ: spot.rz,
            speed: speed ?? (1.2 + Math.random() * 1.5),
            phase, walkT: 0,
            goingToTarget: true,
        });
    }

    spawnCrowdAt(x, z, district = 'downtown', count = 10) {
        const humans = Math.ceil(count * 0.55);
        const aliens = count - humans;
        const baseR = 14;
        for (let i = 0; i < humans; i++) {
            const angle = (i / humans) * Math.PI * 2;
            const r = baseR + (i % 3) * 4;
            const mesh = createHumanAvatar({ modelKey: getAnimatedHumanKey(i), variant: i });
            const hx = x + Math.cos(angle) * r;
            const hz = z + Math.sin(angle) * r;
            const line = district === 'software'
                ? 'Welcome to the software district! Great tech companies here.'
                : district === 'marketing'
                    ? 'Love the creative energy in this district!'
                    : `Just arrived in ${district} — quiet afternoon in the city.`;
            this._placeCitizen(mesh, { x: hx, z: hz, rx: hx + 4, rz: hz + 4 },
                HUMAN_NAMES[i % HUMAN_NAMES.length], 'human', line, 10 + i);
        }
        for (let i = 0; i < aliens; i++) {
            const angle = (i / aliens) * Math.PI * 2 + 0.5;
            const r = baseR + 4 + (i % 3) * 3;
            const mesh = createAlienAvatar({ variant: i });
            const ax = x + Math.cos(angle) * r;
            const az = z + Math.sin(angle) * r;
            const line = district === 'innovation'
                ? 'This innovation park showcases AlienHouse projects — impressive!'
                : 'Greetings! Our alien community welcomes visitors from all worlds.';
            this._placeCitizen(mesh, { x: ax, z: az, rx: ax - 3, rz: az + 3 },
                ALIEN_NAMES[i % ALIEN_NAMES.length], 'alien', line, 20 + i);
        }
    }

    getTeamMeshes() {
        return this.citizens.filter(c => c.isTeam).map(c => c.mesh);
    }

    setTeamVisible(visible) {
        this.citizens.filter(c => c.isTeam).forEach(c => { c.mesh.visible = visible; });
    }

    update(dt) {
        this.citizens.filter(c => !c.isTeam || c.mesh.visible).forEach(c => {
            tickAnimator(c.mesh, dt);

            if (c.isTeam || c.isHost || c.isParkVisitor || c.speed === 0) {
                if (c.isWanderer) {
                    c.wanderT = (c.wanderT || 0) + dt;
                    animateWanderer(c.mesh, c.wanderT);
                } else if (isRiggedAvatar(c.mesh)) {
                    setCharacterPose(c.mesh, 'stand', 0.2);
                }
                return;
            }

            const target = c.goingToTarget
                ? { x: c.targetX, z: c.targetZ }
                : { x: c.homeX, z: c.homeZ };

            const dx = target.x - c.mesh.position.x;
            const dz = target.z - c.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 1) {
                c.goingToTarget = !c.goingToTarget;
                if (isRiggedAvatar(c.mesh)) setCharacterPose(c.mesh, 'stand', 0.2);
            } else {
                const step = c.speed * dt;
                const nx = c.mesh.position.x + (dx / dist) * step;
                const nz = c.mesh.position.z + (dz / dist) * step;
                if (!this.terrain || this.terrain.canTraverse(c.mesh.position.x, c.mesh.position.z, c.mesh.position.y, nx, nz)) {
                    c.mesh.position.x = nx;
                    c.mesh.position.z = nz;
                }
                const ty = this._groundY(c.mesh.position.x, c.mesh.position.z);
                c.mesh.position.y += (ty - c.mesh.position.y) * (1 - Math.exp(-8 * dt));
                c.mesh.rotation.y = Math.atan2(dx, dz);
                c.walkT += dt * 9;

                if (c.isCyclist) {
                    animateCyclist(c.mesh, c.walkT, c.speed / 2);
                } else if (isRiggedAvatar(c.mesh)) {
                    updateLocomotionPose(c.mesh, {
                        moving: true,
                        running: c.speed > 1.8,
                        onGround: true,
                        fade: 0.15,
                    });
                }
            }
        });
    }

    getNearby(playerPos, radius = 4) {
        let best = null, dist = radius;
        this.citizens.forEach(c => {
            if (c.isTeam && !c.mesh.visible) return;
            const d = playerPos.distanceTo(c.mesh.position);
            if (d < dist) { best = c; dist = d; }
        });
        return best;
    }

    toInteractable(c) {
        if (!c) return null;
        return {
            id: c.isHost ? `host-${c.buildingId}` : `citizen-${c.name}`,
            type: 'citizen',
            position: c.mesh.position.clone(),
            radius: c.isHost ? 6 : 4,
            title: c.name,
            subtitle: c.subtitle,
            content: c.line,
            panelContent: c.panelContent,
            panelTitle: c.panelTitle || c.buildingTitle,
            mapLabel: c.isHost ? (c.buildingTitle?.slice(0, 8) || c.name) : null,
            citizen: c,
            isHost: c.isHost,
            hostBuilding: c.buildingTitle,
        };
    }
}