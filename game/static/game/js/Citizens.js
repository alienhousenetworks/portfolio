import * as THREE from 'three';
import { WORLD } from './config.js';
import { createHumanAvatar, createAlienAvatar, createNameTag } from './AvatarFactory.js';

const HUMAN_NAMES = ['Alex', 'Jordan', 'Sam', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Jamie', 'Quinn', 'Avery'];
const ALIEN_NAMES = ['Zyx', 'Nara', 'Kov', 'Eli', 'Pax', 'Ryn', 'Oma', 'Dex', 'Vex', 'Luma', 'Kira', 'Zeno'];
const HUMAN_LINES = [
    'Just moved here from Earth. This planet is incredible!',
    'The aliens here are so friendly. Best city in the galaxy.',
    'Have you tried the metro? Fastest way across town.',
    'I work at the tech district. AlienHouse builds amazing stuff.',
    'The buses are always on time. Well, mostly.',
    'Beautiful weather today. Perfect for exploring downtown.',
];
const ALIEN_LINES = [
    'Greetings, traveler! Welcome to our world.',
    'We have lived on this planet for generations. Humans are always welcome.',
    'The green districts are my favorite. So peaceful.',
    'AlienHouse taught me everything about engineering.',
    'You should visit the HQ tower. It is magnificent.',
    'Our metro train was built by the finest alien architects.',
];

const SHIRT_COLORS = [0x3a5a8a, 0x8a3a3a, 0x3a8a5a, 0x8a6a3a, 0x5a3a8a, 0x8a3a6a];

export class CitizenManager {
    constructor(scene) {
        this.scene = scene;
        this.citizens = [];
    }

    spawn(teamMembers = [], buildings = []) {
        const spots = this._walkSpots();

        for (let i = 0; i < 20; i++) {
            const spot = spots[i % spots.length];
            const name = HUMAN_NAMES[i % HUMAN_NAMES.length];
            const mesh = createHumanAvatar({
                shirtColor: SHIRT_COLORS[i % SHIRT_COLORS.length],
                skinTone: [0xe0b090, 0xc49a7a, 0xf0d0b0, 0xb88860][i % 4],
            });
            this._placeCitizen(mesh, spot, name, 'human', HUMAN_LINES[i % HUMAN_LINES.length], i * 0.7);
        }

        for (let i = 0; i < 24; i++) {
            const spot = spots[(i + 5) % spots.length];
            const name = ALIEN_NAMES[i % ALIEN_NAMES.length];
            const mesh = createAlienAvatar({ variant: i % 4 });
            this._placeCitizen(mesh, spot, name, 'alien', ALIEN_LINES[i % ALIEN_LINES.length], i * 0.5 + 2);
        }

        teamMembers.slice(0, 6).forEach((m, i) => {
            const mesh = createAlienAvatar({ variant: i });
            mesh.position.set(-12 + i * 4, WORLD.groundY, WORLD.parkZ - 12 - i);
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

    spawnBuildingHosts(buildings = []) {
        buildings.forEach((b, i) => {
            const isAlien = b.hostType === 'alien';
            const mesh = isAlien
                ? createAlienAvatar({ variant: i % 4 })
                : createHumanAvatar({
                    shirtColor: SHIRT_COLORS[i % SHIRT_COLORS.length],
                    skinTone: [0xe0b090, 0xc49a7a][i % 2],
                });

            mesh.position.set(b.hostX, WORLD.groundY, b.hostZ);
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
                if (Math.abs(x) < 20 && Math.abs(z - WORLD.parkZ) < 35) continue;
                spots.push({ x, z, rx: x + 10, rz: z + 10 });
            }
        }
        return spots;
    }

    _placeCitizen(mesh, spot, name, type, line, phase) {
        mesh.position.set(spot.x, WORLD.groundY, spot.z);
        mesh.add(createNameTag(name));
        this.scene.add(mesh);
        this.citizens.push({
            mesh, name, type,
            subtitle: type === 'human' ? 'HUMAN CITIZEN' : 'ALIEN CITIZEN',
            line,
            homeX: spot.x, homeZ: spot.z,
            targetX: spot.rx, targetZ: spot.rz,
            speed: 1.2 + Math.random() * 1.5,
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
            const mesh = createHumanAvatar({
                shirtColor: SHIRT_COLORS[i % SHIRT_COLORS.length],
                skinTone: [0xe0b090, 0xc49a7a, 0xf0d0b0][i % 3],
            });
            const hx = x + Math.cos(angle) * r;
            const hz = z + Math.sin(angle) * r;
            const line = district === 'software'
                ? 'Welcome to the software district! Great tech companies here.'
                : district === 'marketing'
                    ? 'Love the creative energy in this marketing city!'
                    : `Just arrived in ${district} — busy day in the city!`;
            this._placeCitizen(mesh, { x: hx, z: hz, rx: hx + 4, rz: hz + 4 },
                HUMAN_NAMES[i % HUMAN_NAMES.length], 'human', line, 10 + i);
        }
        for (let i = 0; i < aliens; i++) {
            const angle = (i / aliens) * Math.PI * 2 + 0.5;
            const r = baseR + 4 + (i % 3) * 3;
            const mesh = createAlienAvatar({ variant: i % 4 });
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
            if (c.isTeam || c.isHost || c.speed === 0) return;

            const target = c.goingToTarget
                ? { x: c.targetX, z: c.targetZ }
                : { x: c.homeX, z: c.homeZ };

            const dx = target.x - c.mesh.position.x;
            const dz = target.z - c.mesh.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < 1) {
                c.goingToTarget = !c.goingToTarget;
            } else {
                const step = c.speed * dt;
                c.mesh.position.x += (dx / dist) * step;
                c.mesh.position.z += (dz / dist) * step;
                c.mesh.rotation.y = Math.atan2(dx, dz);
                c.walkT += dt * 9;

                (c.mesh.userData.walkParts || []).forEach((partName, i) => {
                    const p = c.mesh.getObjectByName(partName);
                    if (p) {
                        const s = Math.sin(c.walkT + i) * 0.3;
                        if (partName.includes('leg')) p.rotation.x = s;
                        if (partName.includes('arm')) p.rotation.x = -s * 0.4;
                    }
                });
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
        const verb = c.isHost ? c.buildingTitle : c.name;
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