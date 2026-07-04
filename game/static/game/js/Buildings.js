import * as THREE from 'three';
import { PALETTE } from './config.js';

function mat(color, opts = {}) {
    const p = { color, roughness: opts.roughness ?? 0.85, metalness: opts.metalness ?? 0 };
    if (opts.emissive != null) {
        p.emissive = opts.emissive;
        p.emissiveIntensity = opts.emissiveIntensity ?? 0.12;
    }
    if (opts.transparent) { p.transparent = true; p.opacity = opts.opacity ?? 0.75; }
    return new THREE.MeshStandardMaterial(p);
}

function addWindows(group, cx, cz, bw, bd, h, floors, glassMat) {
    for (let row = 1; row < floors; row++) {
        for (let col = 0; col < 4; col++) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.8), glassMat);
            win.position.set(cx - bw * 0.3 + col * (bw * 0.2), row * (h / floors), cz + bd / 2 + 0.02);
            group.parent ? group.parent.add(win) : group.add(win);
        }
    }
}

export function createResidential(cx, cz, seed) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const wallColor = [0xd8c8b0, 0xc8b8a0, 0xe8d8c0, 0xb8a890][seed % 4];
    const w = 14, d = 12, h = 8;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(wallColor));
    body.position.y = h / 2;
    body.castShadow = true;
    g.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 4, 4), mat(0x8b4513, { roughness: 0.95 }));
    roof.position.y = h + 2;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.1), mat(0x5c4033));
    door.position.set(0, 1.1, d / 2 + 0.05);
    g.add(door);
    return { group: g, collider: { x: cx, z: cz, w, d } };
}

export function createRetailShop(cx, cz, seed) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 16, d = 14, h = 6;
    const colors = [0xe8a0a0, 0xa0c8e8, 0xe8d8a0, 0xc8a0e8];
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(colors[seed % colors.length]));
    body.position.y = h / 2;
    body.castShadow = true;
    g.add(body);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.3, 3), mat(0xffffff));
    awning.position.set(0, h, d / 2 + 1);
    g.add(awning);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, h * 0.6), mat(PALETTE.glass, { transparent: true, opacity: 0.65 }));
    glass.position.set(0, h * 0.45, d / 2 + 0.03);
    g.add(glass);
    return { group: g, collider: { x: cx, z: cz, w, d } };
}

export function createOfficeTower(cx, cz, floors, accent = 0xe0d8c8) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const bw = 20, bd = 20, floorH = 3.2, h = floors * floorH;
    const body = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), mat(accent));
    body.position.y = h / 2;
    body.castShadow = true;
    g.add(body);
    const glass = mat(PALETTE.glass, { transparent: true, opacity: 0.7, metalness: 0.2 });
    for (let row = 1; row < floors; row++) {
        for (let col = 0; col < 4; col++) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2), glass);
            win.position.set(-7 + col * 4.5, row * floorH, bd / 2 + 0.02);
            g.add(win);
        }
    }
    return { group: g, collider: { x: cx, z: cz, w: bw, d: bd } };
}

export function createIndustrial(cx, cz, seed) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 24, d = 18, h = 10;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0x909090, { metalness: 0.2 }));
    body.position.y = h / 2;
    body.castShadow = true;
    g.add(body);
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1, 6, 8), mat(0x707070));
    chimney.position.set(w * 0.3, h + 3, -d * 0.2);
    g.add(chimney);
    return { group: g, collider: { x: cx, z: cz, w, d } };
}

export function createTechCampus(cx, cz, data = {}) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 22, d = 18, h = 22;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0xd8e4f0, { metalness: 0.15 }));
    body.position.y = h / 2;
    body.castShadow = true;
    g.add(body);
    const glass = mat(0x88bbdd, { transparent: true, opacity: 0.55, metalness: 0.4 });
    for (let row = 1; row < 6; row++) {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.85, 2.8), glass);
        panel.position.set(0, row * 3.5, d / 2 + 0.03);
        g.add(panel);
    }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 1.2, 0.2), mat(0x2244aa, { emissive: 0x2244aa }));
    sign.position.set(0, h + 0.8, d / 2 + 0.2);
    g.add(sign);
    if (data.title) g.userData.label = data.title;
    return { group: g, collider: { x: cx, z: cz, w: w + 2, d: d + 2 }, style: 'tech' };
}

export function createMarketingStudio(cx, cz, data = {}) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 20, d = 16, h = 12;
    const colors = [0xff8866, 0xffaa44, 0xee6688, 0xdd8855];
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(colors[(data.seed || 0) % colors.length]));
    body.position.y = h / 2;
    body.castShadow = true;
    g.add(body);
    const billboard = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 4, 0.3), mat(0xffffff));
    billboard.position.set(0, h + 2.5, d / 2 + 0.5);
    g.add(billboard);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.4, 0.35), mat(0xcc3344, { emissive: 0xcc3344 }));
    accent.position.set(0, h + 2.5, d / 2 + 0.65);
    g.add(accent);
    return { group: g, collider: { x: cx, z: cz, w: w + 2, d: d + 2 }, style: 'marketing' };
}

export function createConsultingOffice(cx, cz, data = {}) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 18, d = 16, h = 14;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0xe8e0d0));
    body.position.y = h / 2;
    body.castShadow = true;
    g.add(body);
    const band = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 1, d + 0.1), mat(0x556677, { metalness: 0.3 }));
    band.position.set(0, h * 0.7, 0);
    g.add(band);
    return { group: g, collider: { x: cx, z: cz, w, d }, style: 'consulting' };
}

export function createProjectShowcase(cx, cz, data = {}) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const w = 16, d = 14, h = 16;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0xf0ece4));
    body.position.y = h / 2;
    body.castShadow = true;
    g.add(body);
    const spire = new THREE.Mesh(new THREE.BoxGeometry(4, 8, 4), mat(0x88aa66, { emissive: 0x446633, emissiveIntensity: 0.08 }));
    spire.position.set(0, h + 4, 0);
    g.add(spire);
    return { group: g, collider: { x: cx, z: cz, w, d }, style: 'project' };
}

const RANDOM_STYLES = ['residential', 'retail', 'office', 'industrial'];

export function createRandomBuilding(cx, cz, floors, seed) {
    const style = RANDOM_STYLES[seed % RANDOM_STYLES.length];
    switch (style) {
        case 'residential': return createResidential(cx, cz, seed);
        case 'retail': return createRetailShop(cx, cz, seed);
        case 'industrial': return createIndustrial(cx, cz, seed);
        default: return createOfficeTower(cx, cz, floors, PALETTE.building[seed % PALETTE.building.length]);
    }
}

export function createServiceBuilding(cx, cz, buildingData) {
    const style = buildingData.buildingStyle || 'office';
    switch (style) {
        case 'tech': return createTechCampus(cx, cz, buildingData);
        case 'marketing': return createMarketingStudio(cx, cz, buildingData);
        case 'consulting': return createConsultingOffice(cx, cz, buildingData);
        case 'project': return createProjectShowcase(cx, cz, buildingData);
        default: return createOfficeTower(cx, cz, 4, 0xe0d8c8);
    }
}