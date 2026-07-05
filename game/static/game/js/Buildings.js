import * as THREE from 'three';
import { PALETTE } from './config.js';
import { toonMesh, INK } from './ToonStyle.js';
import { pickBuildingType } from './CityZones.js';
import { createAirConditioner, createRooftopTank, createHangingSign } from './Props.js';

function wall(seed, off = 0) {
    return PALETTE.building.wall[(seed + off) % PALETTE.building.wall.length];
}
function roof(seed, off = 0) {
    return PALETTE.building.roof[(seed + off) % PALETTE.building.roof.length];
}

function shopFront(g, w, h, d, seed, signColor = PALETTE.orange) {
    const awning = PALETTE.awning;
    const stripeW = w / 5;
    for (let i = 0; i < 5; i++) {
        const s = toonMesh(new THREE.BoxGeometry(stripeW, 0.2, 2.2), awning[i % awning.length]);
        s.mesh.position.set(-w / 2 + stripeW / 2 + i * stripeW, h + 0.05, d / 2 + 1);
        g.add(s.group);
    }
    const sign = createHangingSign('', signColor);
    sign.position.set(0, h, d / 2 + 0.4);
    g.add(sign);
    const shutter = toonMesh(new THREE.BoxGeometry(w * 0.7, h * 0.5, 0.12), PALETTE.asphaltLight);
    shutter.mesh.position.set(0, h * 0.32, d / 2 + 0.06);
    g.add(shutter.group);
}

function base(cx, cz, w, d, h, wallColor, seed) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallColor);
    body.mesh.position.y = h / 2;
    g.add(body.group);
    return { group: g, w, d, h };
}

function finish(b, cx, cz) {
    return { group: b.group, collider: { x: cx, z: cz, w: b.w + 1.5, d: b.d + 1.5 } };
}

// ── Residential ──────────────────────────────────────────────

export function createResidential(cx, cz, seed) {
    const b = base(cx, cz, 12 + seed % 3, 10, 5 + seed % 2, wall(seed), seed);
    const roofM = toonMesh(new THREE.BoxGeometry(b.w + 0.3, 0.45, b.d + 0.3), roof(seed));
    roofM.mesh.position.y = b.h + 0.22;
    b.group.add(roofM.group);
    return finish(b, cx, cz);
}

export function createJapaneseTraditional(cx, cz, seed) {
    const b = base(cx, cz, 14, 12, 4.5, wall(seed), seed);
    const r = toonMesh(new THREE.BoxGeometry(b.w + 0.6, 1.4, b.d + 0.6), PALETTE.wood[0]);
    r.mesh.position.set(0, b.h + 0.7, 0);
    r.mesh.rotation.x = 0.06;
    b.group.add(r.group);
    const engawa = toonMesh(new THREE.BoxGeometry(b.w + 1, 0.15, 1.8), PALETTE.wood[1]);
    engawa.mesh.position.set(0, 0.08, b.d / 2 + 0.8);
    b.group.add(engawa.group);
    return finish(b, cx, cz);
}

export function createJapaneseModern(cx, cz, seed) {
    const b = base(cx, cz, 13, 11, 6 + seed % 2, wall(seed, 1), seed);
    const r = toonMesh(new THREE.BoxGeometry(b.w + 0.2, 0.35, b.d + 0.2), roof(seed));
    r.mesh.position.y = b.h + 0.18;
    b.group.add(r.group);
    const balcony = toonMesh(new THREE.BoxGeometry(3, 0.12, 1.5), PALETTE.concrete);
    balcony.mesh.position.set(0, b.h * 0.55, b.d / 2 + 0.7);
    b.group.add(balcony.group);
    const ac = createAirConditioner();
    ac.position.set(b.w / 2 - 0.5, b.h * 0.6, b.d / 2 + 0.3);
    b.group.add(ac);
    return finish(b, cx, cz);
}

export function createKoreanTownhouse(cx, cz, seed) {
    const b = base(cx, cz, 11, 14, 8 + seed % 3, wall(seed, 2), seed);
    const band = toonMesh(new THREE.BoxGeometry(b.w + 0.1, 0.6, b.d + 0.1), PALETTE.blue);
    band.mesh.position.set(0, b.h * 0.65, 0);
    b.group.add(band.group);
    for (let f = 1; f < 3; f++) {
        const win = toonMesh(new THREE.PlaneGeometry(1.4, 1.6), PALETTE.glass);
        win.mesh.position.set(0, f * 2.5, b.d / 2 + 0.04);
        b.group.add(win.group);
    }
    return finish(b, cx, cz);
}

export function createScandinavian(cx, cz, seed) {
    const b = base(cx, cz, 13, 10, 5, 0xeae8df, seed);
    const r = toonMesh(new THREE.BoxGeometry(b.w + 0.5, 0.8, b.d + 0.5), PALETTE.wood[2]);
    r.mesh.position.set(0, b.h + 0.4, 0);
    r.mesh.rotation.x = 0.1;
    b.group.add(r.group);
    return finish(b, cx, cz);
}

export function createMediterranean(cx, cz, seed) {
    const b = base(cx, cz, 14, 12, 5.5, 0xddd9d0, seed);
    const r = toonMesh(new THREE.BoxGeometry(b.w, 0.5, b.d), PALETTE.red);
    r.mesh.position.y = b.h + 0.25;
    b.group.add(r.group);
    const arch = toonMesh(new THREE.BoxGeometry(1.8, 2.2, 0.15), PALETTE.concreteLight);
    arch.mesh.position.set(0, 1.1, b.d / 2 + 0.06);
    b.group.add(arch.group);
    return finish(b, cx, cz);
}

export function createEuropean(cx, cz, seed) {
    const b = base(cx, cz, 10, 9, 9 + seed % 2, wall(seed), seed);
    const r = toonMesh(new THREE.BoxGeometry(b.w + 0.3, 1, b.d + 0.3), roof(seed, 1));
    r.mesh.position.set(0, b.h + 0.5, 0);
    r.mesh.rotation.x = 0.12;
    b.group.add(r.group);
    shopFront(b.group, b.w, b.h, b.d, seed, PALETTE.pink);
    return finish(b, cx, cz);
}

export function createTinyHome(cx, cz, seed) {
    const b = base(cx, cz, 8, 7, 4, wall(seed), seed);
    const r = toonMesh(new THREE.BoxGeometry(b.w, 0.6, b.d), PALETTE.mint);
    r.mesh.position.set(0, b.h + 0.3, 0);
    r.mesh.rotation.x = 0.15;
    b.group.add(r.group);
    return finish(b, cx, cz);
}

export function createVilla(cx, cz, seed) {
    const b = base(cx, cz, 18, 16, 7, 0xeae8df, seed);
    const r = toonMesh(new THREE.BoxGeometry(b.w + 0.4, 0.4, b.d + 0.4), roof(seed));
    r.mesh.position.y = b.h + 0.2;
    b.group.add(r.group);
    const garden = toonMesh(new THREE.BoxGeometry(b.w + 4, 0.1, 3), PALETTE.grass);
    garden.mesh.position.set(0, 0.05, b.d / 2 + 2);
    b.group.add(garden.group);
    return finish(b, cx, cz);
}

export function createApartment(cx, cz, seed) {
    const floors = 4 + seed % 2;
    const b = base(cx, cz, 16, 14, floors * 3, wall(seed), seed);
    for (let f = 1; f < floors; f++) {
        for (let c = 0; c < 3; c++) {
            const win = toonMesh(new THREE.PlaneGeometry(1.3, 1.8), PALETTE.glass);
            win.mesh.position.set(-4 + c * 4, f * 3, b.d / 2 + 0.04);
            b.group.add(win.group);
        }
    }
    const tank = createRooftopTank();
    tank.position.set(0, b.h + 0.6, 0);
    b.group.add(tank);
    return finish(b, cx, cz);
}

export function createStudentHousing(cx, cz, seed) {
    const b = base(cx, cz, 15, 12, 10, wall(seed, 1), seed);
    const sign = toonMesh(new THREE.BoxGeometry(4, 0.8, 0.15), PALETTE.blue);
    sign.mesh.position.set(0, b.h + 0.5, b.d / 2 + 0.1);
    b.group.add(sign.group);
    return finish(b, cx, cz);
}

// ── Commercial ─────────────────────────────────────────────

function createShop(cx, cz, seed, opts) {
    const { w = 14, d = 11, h = 5, signColor = PALETTE.orange, accent = null } = opts;
    const b = base(cx, cz, w, d, h, wall(seed), seed);
    shopFront(b.group, w, h, d, seed, signColor);
    if (accent) {
        const a = toonMesh(new THREE.BoxGeometry(w * 0.5, 0.5, 0.15), accent);
        a.mesh.position.set(0, h + 1.2, d / 2 + 0.35);
        b.group.add(a.group);
    }
    return finish(b, cx, cz);
}

export const createCafe = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.wood[1], accent: PALETTE.orange });
export const createBakery = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.yellow, accent: PALETTE.orange });
export const createBoba = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.pink, accent: PALETTE.pink });
export const createRamen = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.red, h: 4.5 });
export const createConvenience = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.mint, w: 12, h: 4 });
export const createBookstore = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.purple, h: 6 });
export const createFlowerShop = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.pink, accent: PALETTE.grass });
export const createDessert = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.pink });
export const createIceCream = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.mint, h: 4 });
export const createFashion = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.purple, h: 6 });
export const createElectronics = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.blue, h: 6 });
export const createMusic = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.orange });
export const createFurniture = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.wood[0], w: 16 });
export const createGallery = (cx, cz, s) => createShop(cx, cz, s, { signColor: PALETTE.purple, h: 7 });
export const createTeaHouse = (cx, cz, s) => createJapaneseTraditional(cx, cz, s);

export function createRetailShop(cx, cz, seed) {
    return createShop(cx, cz, seed, { signColor: PALETTE.awning[seed % 4] });
}

export function createArcade(cx, cz, seed) {
    const b = base(cx, cz, 16, 13, 6, 0x2a2a38, seed);
    const neon = toonMesh(new THREE.BoxGeometry(10, 1, 0.2), PALETTE.purple, { emissive: PALETTE.purple, emissiveIntensity: 0.12 });
    neon.mesh.position.set(0, b.h + 0.6, b.d / 2 + 0.2);
    b.group.add(neon.group);
    shopFront(b.group, b.w, b.h, b.d, seed, PALETTE.purple);
    return finish(b, cx, cz);
}

// ── Public & institutional ─────────────────────────────────

export function createSchool(cx, cz, seed) {
    const b = base(cx, cz, 28, 22, 8, 0xeae8df, seed);
    const gym = toonMesh(new THREE.BoxGeometry(12, 5, 10), PALETTE.blue);
    gym.mesh.position.set(b.w / 2 + 4, 2.5, 0);
    b.group.add(gym.group);
    return finish(b, cx, cz);
}

export function createLibrary(cx, cz, seed) {
    const b = base(cx, cz, 22, 18, 10, wall(seed), seed);
    [-8, 8].forEach(x => {
        const col = toonMesh(new THREE.BoxGeometry(0.5, 10, 0.5), PALETTE.concrete);
        col.mesh.position.set(x, 5, b.d / 2 + 1);
        b.group.add(col.group);
    });
    return finish(b, cx, cz);
}

export function createGlassTower(cx, cz, seed) {
    const floors = 5 + seed % 3;
    const b = base(cx, cz, 18, 18, floors * 3.2, PALETTE.concreteLight, seed);
    for (let f = 1; f < floors; f++) {
        const panel = toonMesh(new THREE.PlaneGeometry(b.w * 0.85, 2.5), PALETTE.glass, { transparent: true, opacity: 0.9 });
        panel.mesh.position.set(0, f * 3.2, b.d / 2 + 0.04);
        b.group.add(panel.group);
    }
    return finish(b, cx, cz);
}

// ── Industrial ───────────────────────────────────────────

export function createWarehouse(cx, cz, seed) {
    const b = base(cx, cz, 26, 18, 9, PALETTE.asphaltLight, seed);
    const r = toonMesh(new THREE.BoxGeometry(b.w + 0.2, 0.5, b.d + 0.2), PALETTE.asphaltDark);
    r.mesh.position.y = b.h + 0.25;
    b.group.add(r.group);
    return finish(b, cx, cz);
}

export function createWorkshop(cx, cz, seed) {
    const b = base(cx, cz, 16, 12, 5, PALETTE.concrete, seed);
    return finish(b, cx, cz);
}

export function createIndustrial(cx, cz, seed) {
    return createWarehouse(cx, cz, seed);
}

// ── Legacy service buildings (game POIs) ───────────────────

export function createOfficeTower(cx, cz, floors, accent = 0xeae8df) {
    const b = base(cx, cz, 18, 16, floors * 3.4, accent, 0);
    for (let row = 1; row < floors; row++) {
        for (let col = 0; col < 4; col++) {
            const win = toonMesh(new THREE.PlaneGeometry(1.5, 2), PALETTE.glass);
            win.mesh.position.set(-5.5 + col * 3.7, row * 3.4, b.d / 2 + 0.04);
            b.group.add(win.group);
        }
    }
    return finish(b, cx, cz);
}

export function createTechCampus(cx, cz, data = {}) {
    const r = createGlassTower(cx, cz, 6, data.seed || 0);
    if (data.title) r.group.userData.label = data.title;
    return { ...r, style: 'tech' };
}

export function createMarketingStudio(cx, cz, data = {}) {
    const r = createGallery(cx, cz, data.seed || 0);
    return { ...r, style: 'marketing' };
}

export function createConsultingOffice(cx, cz, data = {}) {
    const r = createOfficeTower(cx, cz, 4, 0xddd9d0);
    return { ...r, style: 'consulting' };
}

export function createProjectShowcase(cx, cz, data = {}) {
    const b = base(cx, cz, 16, 14, 14, 0xeae8df, 0);
    const spire = toonMesh(new THREE.BoxGeometry(3, 6, 3), PALETTE.mint, { emissive: PALETTE.mint, emissiveIntensity: 0.06 });
    spire.mesh.position.set(0, b.h + 3, 0);
    b.group.add(spire.group);
    return { ...finish(b, cx, cz), style: 'project' };
}

// ── Street utilities ─────────────────────────────────────

export function createVendingMachine(x, z, seed = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const color = PALETTE.vending[seed % PALETTE.vending.length];
    const body = toonMesh(new THREE.BoxGeometry(1, 2.1, 0.85), color);
    body.mesh.position.y = 1.05;
    g.add(body.group);
    const screen = toonMesh(new THREE.BoxGeometry(0.65, 0.9, 0.06), PALETTE.blue);
    screen.mesh.position.set(0, 1.2, 0.44);
    g.add(screen.group);
    return g;
}

export function createUtilityPole(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pole = toonMesh(new THREE.BoxGeometry(0.1, 7, 0.1), PALETTE.pole);
    pole.mesh.position.y = 3.5;
    g.add(pole.group);
    const wireMat = new THREE.LineBasicMaterial({ color: INK });
    for (let i = 0; i < 3; i++) {
        const pts = [
            new THREE.Vector3(-3 + i * 2, 6.5, 0),
            new THREE.Vector3(4, 6.8, 10),
            new THREE.Vector3(12, 6.3, 18),
        ];
        g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    }
    return g;
}

// ── Building factory ───────────────────────────────────────

const BUILDERS = {
    residential: createResidential,
    japaneseTraditional: createJapaneseTraditional,
    japaneseModern: createJapaneseModern,
    koreanTownhouse: createKoreanTownhouse,
    scandinavian: createScandinavian,
    mediterranean: createMediterranean,
    european: createEuropean,
    tinyHome: createTinyHome,
    villa: createVilla,
    apartment: createApartment,
    studentHousing: createStudentHousing,
    cafe: createCafe, bakery: createBakery, boba: createBoba, ramen: createRamen,
    convenience: createConvenience, bookstore: createBookstore, flower: createFlowerShop,
    dessert: createDessert, iceCream: createIceCream, fashion: createFashion,
    electronics: createElectronics, music: createMusic, furniture: createFurniture,
    gallery: createGallery, teaHouse: createTeaHouse, retail: createRetailShop,
    arcade: createArcade, school: createSchool, library: createLibrary,
    glassTower: createGlassTower, warehouse: createWarehouse, workshop: createWorkshop,
    industrial: createIndustrial,
};

export function createZoneBuilding(cx, cz, seed, gameDistrict = null) {
    const type = pickBuildingType(cx, cz, seed, gameDistrict);
    const fn = BUILDERS[type] || BUILDERS.residential;
    return fn(cx, cz, seed);
}

export function createRandomBuilding(cx, cz, floors, seed) {
    return createZoneBuilding(cx, cz, seed);
}

export function createServiceBuilding(cx, cz, buildingData) {
    const style = buildingData.buildingStyle || 'office';
    switch (style) {
        case 'tech': return createTechCampus(cx, cz, buildingData);
        case 'marketing': return createMarketingStudio(cx, cz, buildingData);
        case 'consulting': return createConsultingOffice(cx, cz, buildingData);
        case 'project': return createProjectShowcase(cx, cz, buildingData);
        default: return createOfficeTower(cx, cz, 4, 0xddd9d0);
    }
}