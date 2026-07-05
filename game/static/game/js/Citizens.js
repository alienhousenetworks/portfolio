import * as THREE from 'three';
import { WORLD, citizenHeight } from './config.js';
import {
    createHumanAvatar, createAlienAvatar, createNameTag,
    createStudentAvatar, createCommuterAvatar, createWandererAvatar, createCyclistAvatar,
    setCharacterPose, tickAnimator, updateLocomotionPose,
    animateCyclist,
} from './AvatarFactory.js';
import { isRiggedAvatar } from './CharacterAnimator.js';
import { getBodyKeyForCitizen } from './CharacterModels.js';

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
            const name = HUMAN_NAMES[i % HUMAN_NAMES.length];
            const modelKey = getBodyKeyForCitizen(name, 'human', i);
            const mesh = createHumanAvatar({ variant: i, modelKey, gender: modelKey, name });
            this._placeCitizen(mesh, spot, name, 'human', HUMAN_LINES[i % HUMAN_LINES.length], i * 0.7);
        }

        for (let i = 0; i < 12; i++) {
            const spot = spots[(i + 5) % spots.length];
            const name = ALIEN_NAMES[i % ALIEN_NAMES.length];
            const modelKey = getBodyKeyForCitizen(name, 'alien', i);
            const mesh = createAlienAvatar({ variant: i, modelKey, name });
            this._placeCitizen(mesh, spot, name, 'alien', ALIEN_LINES[i % ALIEN_LINES.length], i * 0.5 + 2);
        }

        teamMembers.slice(0, 6).forEach((m, i) => {
            const modelKey = getBodyKeyForCitizen(m.name || '', 'alien', i);
            const mesh = createAlienAvatar({ variant: i + 1, modelKey, name: m.name });
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
            const name = STUDENT_NAMES[i % STUDENT_NAMES.length];
            const mesh = createStudentAvatar({ variant: i, name });
            this._placeCitizen(
                mesh, spot,
                name, 'student',
                'Heading home along the riverbank. The light is gorgeous today.',
                i * 0.4, 0.9
            );
        });
    }

    _spawnCommuters() {
        const platforms = [
            { x: -80, z: -80, rx: -72, rz: -80 },
            { x: -80, z: 120, rx: -72, rz: 120 },
            { x: 80, z: -60, rx: 72, rz: -60 },
            { x: 80, z: 140, rx: 72, rz: 140 },
        ];
        platforms.forEach((spot, i) => {
            const name = HUMAN_NAMES[i % HUMAN_NAMES.length];
            const stature = citizenHeight(i);
            const mesh = createCommuterAvatar({ variant: i, name, targetHeight: stature });
            this._placeCitizen(
                mesh, spot, name, 'commuter',
                'Walking the platform while waiting for the metro.',
                i * 0.5, 0.85 + (i % 3) * 0.15
            );
            this.citizens[this.citizens.length - 1].isCommuter = true;
        });
    }

    _spawnWanderer() {
        const spot = { x: 58, z: 52, rx: 48, rz: 62 };
        const mesh = createWandererAvatar({ variant: 2, targetHeight: citizenHeight(2) });
        this._placeCitizen(
            mesh, spot, 'Kai', 'wanderer',
            'Nothing like a cold soda on a breezy afternoon.',
            0, 0.75
        );
        this.citizens[this.citizens.length - 1].isWanderer = true;
    }

    _spawnParkLife() {
        const parkSpots = [
            { x: WORLD.parkX - 8, z: WORLD.parkZ + 5, line: 'Perfect weather for cherry blossoms.' },
            { x: WORLD.parkX + 10, z: WORLD.parkZ - 6, line: 'This bench is my favorite reading spot.' },
            { x: WORLD.parkX, z: WORLD.parkZ + 14, line: 'The fountain sounds so peaceful.' },
        ];
        parkSpots.forEach((spot, i) => {
            const name = ['Sora', 'Hana', 'Ren'][i];
            const modelKey = getBodyKeyForCitizen(name, 'human', i);
            const mesh = createHumanAvatar({ variant: i + 1, modelKey, gender: modelKey, name });
            const walkSpot = {
                x: spot.x, z: spot.z,
                rx: spot.x + (i % 2 === 0 ? 6 : -6),
                rz: spot.z + (i % 2 === 0 ? -4 : 4),
            };
            this._placeCitizen(mesh, walkSpot, name, 'human', spot.line, i, 0.7 + i * 0.1);
            this.citizens[this.citizens.length - 1].isParkVisitor = true;
            this.citizens[this.citizens.length - 1].subtitle = 'PARK VISITOR';
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
            const name = HUMAN_NAMES[(i + 3) % HUMAN_NAMES.length];
            const mesh = createCyclistAvatar({ variant: i, name });
            this._placeCitizen(
                mesh,
                { x: route.x, z: route.z, rx: route.rx, rz: route.rz },
                name, 'cyclist',
                'Coasting down the slope. These mamachari bikes are the best.',
                i * 1.1, route.speed
            );
            this.citizens[this.citizens.length - 1].isCyclist = true;
        });
    }

    spawnBuildingHosts(buildings = []) {
        buildings.forEach((b, i) => {
            const isAlien = b.hostType === 'alien';
            const modelKey = getBodyKeyForCitizen(b.hostName || '', isAlien ? 'alien' : 'human', i);
            const mesh = isAlien
                ? createAlienAvatar({ variant: i, modelKey, name: b.hostName })
                : createHumanAvatar({ variant: i, modelKey, gender: modelKey, name: b.hostName });

            const hostAngle = Math.atan2(b.x - b.hostX, b.z - b.hostZ);
            const patrol = {
                x: b.hostX,
                z: b.hostZ,
                rx: b.hostX + Math.sin(hostAngle) * 3,
                rz: b.hostZ + Math.cos(hostAngle) * 3,
            };
            this._placeCitizen(
                mesh, patrol, b.hostName, isAlien ? 'alien' : 'human',
                b.hostLine || b.shortDescription || '',
                i, 0.55
            );
            const entry = this.citizens[this.citizens.length - 1];
            entry.subtitle = b.subtitle || 'BUILDING HOST';
            entry.panelContent = b.panelContent || b.content || b.description || '';
            entry.panelTitle = b.title;
            entry.isHost = true;
            entry.buildingId = b.id;
            entry.buildingTitle = b.title;
            entry.mesh.rotation.y = hostAngle;
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
        mesh.visible = true;
        mesh.traverse(child => { child.visible = true; });
        const stature = mesh.userData.targetHeight ?? citizenHeight(phase);
        mesh.userData.targetHeight = stature;
        mesh.add(createNameTag(name, stature));
        this.scene.add(mesh);
        this.citizens.push({
            mesh, name, type,
            subtitle: type === 'human' ? 'HUMAN CITIZEN'
                : type === 'student' ? 'STUDENT'
                    : type === 'cyclist' ? 'CYCLIST'
                        : type === 'commuter' ? 'COMMUTER'
                            : type === 'wanderer' ? 'WANDERER'
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
            const name = HUMAN_NAMES[i % HUMAN_NAMES.length];
            const modelKey = getBodyKeyForCitizen(name, 'human', i);
            const mesh = createHumanAvatar({ variant: i, modelKey, gender: modelKey, name });
            const hx = x + Math.cos(angle) * r;
            const hz = z + Math.sin(angle) * r;
            const line = district === 'software'
                ? 'Welcome to the software district! Great tech companies here.'
                : district === 'marketing'
                    ? 'Love the creative energy in this district!'
                    : `Just arrived in ${district} — quiet afternoon in the city.`;
            this._placeCitizen(mesh, { x: hx, z: hz, rx: hx + 4, rz: hz + 4 },
                name, 'human', line, 10 + i);
        }
        for (let i = 0; i < aliens; i++) {
            const angle = (i / aliens) * Math.PI * 2 + 0.5;
            const r = baseR + 4 + (i % 3) * 3;
            const name = ALIEN_NAMES[i % ALIEN_NAMES.length];
            const modelKey = getBodyKeyForCitizen(name, 'alien', i);
            const mesh = createAlienAvatar({ variant: i, modelKey, name });
            const ax = x + Math.cos(angle) * r;
            const az = z + Math.sin(angle) * r;
            const line = district === 'innovation'
                ? 'This innovation park showcases AlienHouse projects — impressive!'
                : 'Greetings! Our alien community welcomes visitors from all worlds.';
            this._placeCitizen(mesh, { x: ax, z: az, rx: ax - 3, rz: az + 3 },
                name, 'alien', line, 20 + i);
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

            if (c.isTeam) {
                if (isRiggedAvatar(c.mesh)) setCharacterPose(c.mesh, 'idle', 0.2);
                return;
            }

            if (c.speed === 0) {
                if (isRiggedAvatar(c.mesh)) setCharacterPose(c.mesh, 'idle', 0.2);
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
                if (isRiggedAvatar(c.mesh)) setCharacterPose(c.mesh, 'idle', 0.2);
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