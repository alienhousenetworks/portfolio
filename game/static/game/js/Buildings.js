import * as THREE from 'three';
import { PALETTE } from './config.js';
import { toonMesh, INK } from './ToonStyle.js';

function isNearRiver(cx, cz) {
    return Math.abs(cx) < 55;
}

function isDowntown(cx, cz) {
    return Math.abs(cx) < 90 && Math.abs(cz) < 90;
}

export function createResidential(cx, cz, seed) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);

    const wallColor = PALETTE.building.wall[seed % PALETTE.building.wall.length];
    const roofColor = PALETTE.building.roof[seed % PALETTE.building.roof.length];
    const w = 12 + (seed % 3) * 2;
    const d = 10 + (seed % 2) * 2;
    const h = 5 + (seed % 3) * 1.5;

    const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallColor);
    body.mesh.position.y = h / 2;
    g.add(body.group);

    const roofFlat = seed % 3 !== 0;
    if (roofFlat) {
        const roof = toonMesh(new THREE.BoxGeometry(w + 0.4, 0.5, d + 0.4), roofColor);
        roof.mesh.position.y = h + 0.25;
        g.add(roof.group);
    } else {
        const roof = toonMesh(new THREE.BoxGeometry(w + 0.2, 1.2, d + 0.2), roofColor);
        roof.mesh.position.set(0, h + 0.6, 0);
        roof.mesh.rotation.x = 0.08;
        g.add(roof.group);
    }

    const wallH = toonMesh(new THREE.BoxGeometry(w + 3, 1.2, 0.3), 0xc8c0b0);
    wallH.mesh.position.set(0, 0.6, d / 2 + 1.8);
    g.add(wallH.group);

    const door = toonMesh(new THREE.BoxGeometry(1.2, 2, 0.12), 0x5a4a3a);
    door.mesh.position.set(0, 1, d / 2 + 0.06);
    g.add(door.group);

    return { group: g, collider: { x: cx, z: cz, w: w + 2, d: d + 2 } };
}

export function createRetailShop(cx, cz, seed) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);

    const floors = 3 + (seed % 2);
    const w = 16, d = 13, floorH = 3.2, h = floors * floorH;
    const wallColor = PALETTE.building.wall[(seed + 1) % PALETTE.building.wall.length];

    const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallColor);
    body.mesh.position.y = h / 2;
    g.add(body.group);

    const awningColors = PALETTE.awning;
    const stripeW = w / 6;
    for (let i = 0; i < 6; i++) {
        const stripe = toonMesh(
            new THREE.BoxGeometry(stripeW, 0.25, 2.8),
            awningColors[i % awningColors.length]
        );
        stripe.mesh.position.set(-w / 2 + stripeW / 2 + i * stripeW, h + 0.1, d / 2 + 1.2);
        g.add(stripe.group);
    }

    const shutter = toonMesh(new THREE.BoxGeometry(w * 0.75, h * 0.55, 0.15), 0x8a9098);
    shutter.mesh.position.set(0, h * 0.35, d / 2 + 0.08);
    g.add(shutter.group);

    const signBg = toonMesh(new THREE.BoxGeometry(w * 0.6, 2.2, 0.2), 0xf8f0e8);
    signBg.mesh.position.set(0, h + 1.8, d / 2 + 0.3);
    g.add(signBg.group);

    const signAccent = toonMesh(new THREE.BoxGeometry(w * 0.45, 0.8, 0.22), PALETTE.accent, { emissive: PALETTE.accent, emissiveIntensity: 0.08 });
    signAccent.mesh.position.set(0, h + 2.2, d / 2 + 0.35);
    g.add(signAccent.group);

    for (let row = 1; row < floors; row++) {
        for (let col = 0; col < 3; col++) {
            const win = toonMesh(new THREE.PlaneGeometry(1.6, 2), PALETTE.glass);
            win.mesh.position.set(-4 + col * 4, row * floorH, d / 2 + 0.04);
            g.add(win.group);
        }
    }

    return { group: g, collider: { x: cx, z: cz, w, d } };
}

export function createOfficeTower(cx, cz, floors, accent = 0xe8e0d0) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const bw = 18, bd = 16, floorH = 3.4, h = floors * floorH;

    const body = toonMesh(new THREE.BoxGeometry(bw, h, bd), accent);
    body.mesh.position.y = h / 2;
    g.add(body.group);

    for (let row = 1; row < floors; row++) {
        for (let col = 0; col < 4; col++) {
            const win = toonMesh(new THREE.PlaneGeometry(1.6, 2.2), PALETTE.glass);
            win.mesh.position.set(-6 + col * 4, row * floorH, bd / 2 + 0.04);
            g.add(win.group);
        }
    }

    const sign = toonMesh(new THREE.BoxGeometry(bw * 0.5, 1.4, 0.25), 0xf0e8e0);
    sign.mesh.position.set(0, h + 1, bd / 2 + 0.2);
    g.add(sign.group);

    return { group: g, collider: { x: cx, z: cz, w: bw, d: bd } };
}

export function createIndustrial(cx, cz, seed) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 22, d = 16, h = 9;

    const body = toonMesh(new THREE.BoxGeometry(w, h, d), 0xa0a4a8);
    body.mesh.position.y = h / 2;
    g.add(body.group);

    const chimney = toonMesh(new THREE.BoxGeometry(1.2, 5, 1.2), 0x888c90);
    chimney.mesh.position.set(w * 0.3, h + 2.5, -d * 0.2);
    g.add(chimney.group);

    return { group: g, collider: { x: cx, z: cz, w, d } };
}

export function createTechCampus(cx, cz, data = {}) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 22, d = 18, h = 20;

    const body = toonMesh(new THREE.BoxGeometry(w, h, d), 0xe8ecf0);
    body.mesh.position.y = h / 2;
    g.add(body.group);

    for (let row = 1; row < 5; row++) {
        const panel = toonMesh(new THREE.PlaneGeometry(w * 0.8, 2.6), PALETTE.frostGlass, { transparent: true, opacity: 0.9 });
        panel.mesh.position.set(0, row * 4, d / 2 + 0.04);
        g.add(panel.group);
    }

    const sign = toonMesh(new THREE.BoxGeometry(w * 0.65, 1.2, 0.2), 0x5a7aaa, { emissive: 0x3a5a8a, emissiveIntensity: 0.1 });
    sign.mesh.position.set(0, h + 0.8, d / 2 + 0.2);
    g.add(sign.group);
    if (data.title) g.userData.label = data.title;

    return { group: g, collider: { x: cx, z: cz, w: w + 2, d: d + 2 }, style: 'tech' };
}

export function createMarketingStudio(cx, cz, data = {}) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 20, d = 16, h = 12;
    const colors = [0xf0a8a0, 0xf0c888, 0xe8a0b8, 0xe0b888];

    const body = toonMesh(new THREE.BoxGeometry(w, h, d), colors[(data.seed || 0) % colors.length]);
    body.mesh.position.y = h / 2;
    g.add(body.group);

    const billboard = toonMesh(new THREE.BoxGeometry(w * 0.9, 3.5, 0.3), 0xf8f4f0);
    billboard.mesh.position.set(0, h + 2.2, d / 2 + 0.5);
    g.add(billboard.group);

    const accent = toonMesh(new THREE.BoxGeometry(w * 0.8, 0.5, 0.35), 0xd06070, { emissive: 0xc05060, emissiveIntensity: 0.1 });
    accent.mesh.position.set(0, h + 2.5, d / 2 + 0.65);
    g.add(accent.group);

    return { group: g, collider: { x: cx, z: cz, w: w + 2, d: d + 2 }, style: 'marketing' };
}

export function createConsultingOffice(cx, cz, data = {}) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 18, d = 16, h = 13;

    const body = toonMesh(new THREE.BoxGeometry(w, h, d), 0xe8e0d4);
    body.mesh.position.y = h / 2;
    g.add(body.group);

    const band = toonMesh(new THREE.BoxGeometry(w + 0.1, 0.8, d + 0.1), 0x6a7a88);
    band.mesh.position.set(0, h * 0.72, 0);
    g.add(band.group);

    return { group: g, collider: { x: cx, z: cz, w, d }, style: 'consulting' };
}

export function createProjectShowcase(cx, cz, data = {}) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 16, d = 14, h = 15;

    const body = toonMesh(new THREE.BoxGeometry(w, h, d), 0xf0ece4);
    body.mesh.position.y = h / 2;
    g.add(body.group);

    const spire = toonMesh(new THREE.BoxGeometry(3.5, 7, 3.5), 0x9ab888, { emissive: 0x5a7848, emissiveIntensity: 0.06 });
    spire.mesh.position.set(0, h + 3.5, 0);
    g.add(spire.group);

    return { group: g, collider: { x: cx, z: cz, w, d }, style: 'project' };
}

const RANDOM_STYLES = ['residential', 'retail', 'office', 'industrial'];

export function createRandomBuilding(cx, cz, floors, seed) {
    const nearRiver = isNearRiver(cx, cz);
    const downtown = isDowntown(cx, cz);

    let style;
    if (nearRiver || downtown) {
        style = seed % 3 === 0 ? 'office' : 'retail';
        floors = Math.max(floors, 3);
    } else {
        style = seed % 4 === 0 ? 'residential' : RANDOM_STYLES[seed % RANDOM_STYLES.length];
        if (style === 'office' && !downtown) style = 'residential';
    }

    switch (style) {
        case 'residential': return createResidential(cx, cz, seed);
        case 'retail': return createRetailShop(cx, cz, seed);
        case 'industrial': return createIndustrial(cx, cz, seed);
        default: return createOfficeTower(cx, cz, floors, PALETTE.building.wall[seed % PALETTE.building.wall.length]);
    }
}

export function createServiceBuilding(cx, cz, buildingData) {
    const style = buildingData.buildingStyle || 'office';
    switch (style) {
        case 'tech': return createTechCampus(cx, cz, buildingData);
        case 'marketing': return createMarketingStudio(cx, cz, buildingData);
        case 'consulting': return createConsultingOffice(cx, cz, buildingData);
        case 'project': return createProjectShowcase(cx, cz, buildingData);
        default: return createOfficeTower(cx, cz, 4, 0xe8e0d0);
    }
}

export function createVendingMachine(x, z, seed = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const color = PALETTE.vending[seed % PALETTE.vending.length];
    const body = toonMesh(new THREE.BoxGeometry(1.1, 2.2, 0.9), color);
    body.mesh.position.y = 1.1;
    g.add(body.group);
    const screen = toonMesh(new THREE.BoxGeometry(0.7, 1, 0.08), 0x3a5a8a);
    screen.mesh.position.set(0, 1.3, 0.46);
    g.add(screen.group);
    return g;
}

export function createUtilityPole(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pole = toonMesh(new THREE.BoxGeometry(0.12, 7, 0.12), PALETTE.pole);
    pole.mesh.position.y = 3.5;
    g.add(pole.group);

    const wireMat = new THREE.LineBasicMaterial({ color: INK, linewidth: 1 });
    for (let i = 0; i < 3; i++) {
        const pts = [
            new THREE.Vector3(-4 + i * 2, 6.5, 0),
            new THREE.Vector3(4 - i, 6.8 + i * 0.2, 8),
            new THREE.Vector3(10, 6.4, 16),
        ];
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat);
        g.add(line);
    }
    return g;
}