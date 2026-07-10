import * as THREE from 'three';
import { PALETTE } from './config.js';
import { toonMesh, INK } from './ToonStyle.js';
import { pickBuildingType } from './CityZones.js';
import { createAirConditioner, createRooftopTank, createHangingSign, createDetailedVendingMachine, createDetailedUtilityPole } from './Props.js';

function wall(seed, off = 0) {
    return PALETTE.building.wall[(seed + off) % PALETTE.building.wall.length];
}
function roof(seed, off = 0) {
    return PALETTE.building.roof[(seed + off) % PALETTE.building.roof.length];
}

function addWindows(group, w, h, d, seed) {
    const winColor = PALETTE.glass;
    const frameColor = 0x3a3a40;
    
    // Windows on front side (z = d/2)
    const frontRows = Math.max(1, Math.floor(h / 3));
    const frontCols = Math.max(1, Math.floor(w / 3.5));
    
    for (let r = 0; r < frontRows; r++) {
        for (let c = 0; c < frontCols; c++) {
            // skip first floor center for doors
            if (r === 0 && Math.abs(c - (frontCols - 1) / 2) < 0.8) continue;
            
            const wx = -w/2 + (c + 0.5) * (w / frontCols);
            const wy = 1.4 + r * 2.6;
            if (wy >= h - 0.8) continue;

            const winG = new THREE.Group();
            winG.position.set(wx, wy, d/2 + 0.02);

            // Outer frame
            const frame = toonMesh(new THREE.BoxGeometry(1.2, 1.4, 0.06), frameColor, { outline: false });
            winG.add(frame.group);

            // Glass pane
            const glass = toonMesh(new THREE.BoxGeometry(1.0, 1.2, 0.02), winColor, { transparent: true, opacity: 0.7, outline: false });
            glass.mesh.position.z = 0.03;
            winG.add(glass.group);

            // Grid lines (horizontal/vertical)
            const gridH = toonMesh(new THREE.BoxGeometry(1.0, 0.04, 0.02), frameColor, { outline: false });
            gridH.mesh.position.z = 0.04;
            winG.add(gridH.group);
            const gridV = toonMesh(new THREE.BoxGeometry(0.04, 1.2, 0.02), frameColor, { outline: false });
            gridV.mesh.position.z = 0.04;
            winG.add(gridV.group);

            // Window ledge/sill
            const sill = toonMesh(new THREE.BoxGeometry(1.4, 0.08, 0.2), 0xdddddd);
            sill.mesh.position.set(0, -0.74, 0.08);
            winG.add(sill.group);

            group.add(winG);
        }
    }

    // Windows on sides (x = -w/2 and x = w/2)
    const sideCols = Math.max(1, Math.floor(d / 3.5));
    for (let r = 0; r < frontRows; r++) {
        for (let c = 0; c < sideCols; c++) {
            const wz = -d/2 + (c + 0.5) * (d / sideCols);
            const wy = 1.4 + r * 2.6;
            if (wy >= h - 0.8) continue;

            [-w/2, w/2].forEach(wx => {
                const winG = new THREE.Group();
                winG.position.set(wx + (wx < 0 ? -0.02 : 0.02), wy, wz);
                winG.rotation.y = wx < 0 ? -Math.PI/2 : Math.PI/2;

                const frame = toonMesh(new THREE.BoxGeometry(1.0, 1.2, 0.06), frameColor, { outline: false });
                winG.add(frame.group);

                const glass = toonMesh(new THREE.BoxGeometry(0.8, 1.0, 0.02), winColor, { transparent: true, opacity: 0.7, outline: false });
                glass.mesh.position.z = 0.03;
                winG.add(glass.group);

                const sill = toonMesh(new THREE.BoxGeometry(1.2, 0.08, 0.2), 0xdddddd);
                sill.mesh.position.set(0, -0.64, 0.08);
                winG.add(sill.group);

                group.add(winG);
            });
        }
    }
}

function addWallDetails(group, w, h, d, seed) {
    // Air Conditioner units
    const numAc = (seed % 2) + 1;
    for (let i = 0; i < numAc; i++) {
        const ac = createAirConditioner();
        const side = seed % 2 === 0 ? 1 : -1;
        const acX = (w / 2 + 0.3) * side;
        const acY = 2.0 + (i * 2.5) + (seed % 2) * 0.5;
        const acZ = -d / 4 + i * 2.0;
        if (acY < h - 0.8) {
            ac.position.set(acX, acY, acZ);
            ac.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
            group.add(ac);

            // AC drainage pipe running down
            const pipe = toonMesh(new THREE.CylinderGeometry(0.03, 0.03, acY, 4), 0xbbbbbb, { outline: false });
            pipe.mesh.position.set(acX, acY / 2, acZ + 0.4);
            group.add(pipe.group);
        }
    }

    // Thick industrial conduit pipe on back or side wall
    const pipeX = -w / 2 + 0.15;
    const pipeZ = -d / 2 + 0.5;
    const conduit = toonMesh(new THREE.CylinderGeometry(0.06, 0.06, h, 6), 0x777777);
    conduit.mesh.position.set(pipeX, h / 2, pipeZ);
    group.add(conduit.group);
}

function shopFront(g, w, h, d, seed, signColor = PALETTE.orange) {
    const awning = PALETTE.awning;
    const stripeW = w / 7;
    const awningG = new THREE.Group();
    awningG.position.set(0, h * 0.65, d / 2 + 0.7);
    
    for (let i = 0; i < 7; i++) {
        const s = toonMesh(new THREE.BoxGeometry(stripeW, 0.15, 1.4), awning[i % awning.length]);
        s.mesh.position.set(-w / 2 + stripeW / 2 + i * stripeW, 0, 0);
        s.mesh.rotation.x = 0.25; // Sloped down
        awningG.add(s.group);
    }
    g.add(awningG);

    const sign = createHangingSign('', signColor);
    sign.position.set(0, h * 0.72, d / 2 + 0.2);
    g.add(sign);

    // Roll-up shutter door with slats
    const shutterW = w * 0.6;
    const shutterH = h * 0.55;
    const shutterG = new THREE.Group();
    shutterG.position.set(0, shutterH / 2, d / 2 + 0.06);
    
    const numSlats = 12;
    for (let i = 0; i < numSlats; i++) {
        const slat = toonMesh(new THREE.BoxGeometry(shutterW, shutterH / numSlats - 0.02, 0.06), PALETTE.asphaltLight, { outline: false });
        slat.mesh.position.y = -shutterH / 2 + (i + 0.5) * (shutterH / numSlats);
        shutterG.add(slat.group);
    }
    g.add(shutterG);

    // Side windows on storefront
    const glassW = (w - shutterW) / 2 - 0.4;
    if (glassW > 0.5) {
        [-1, 1].forEach(side => {
            const win = toonMesh(new THREE.BoxGeometry(glassW, h * 0.6, 0.08), PALETTE.glass);
            win.mesh.position.set(side * (shutterW / 2 + glassW / 2 + 0.2), h * 0.3, d / 2 + 0.06);
            g.add(win.group);
        });
    }
}

/**
 * Creates a base building group.
 * Returns { group, w, d, h } where h is the building height above its base.
 */
function base(cx, cz, w, d, h, wallColor, seed) {
    const g = new THREE.Group();
    g.position.set(cx, 0, cz);
    const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallColor);
    body.mesh.position.y = h / 2;
    body.mesh.castShadow = true;
    body.mesh.receiveShadow = true;
    g.add(body.group);

    // Add anime windows and details
    addWindows(g, w, h, d, seed);
    addWallDetails(g, w, h, d, seed);

    return { group: g, w, d, h };
}

/**
 * Wraps a building with its collider.
 * Collider includes h (height) so physics can determine block-top stepping.
 */
function finish(b, cx, cz, extraH = 0) {
    return {
        group: b.group,
        collider: {
            x: cx, z: cz,
            w: b.w + 1.5, d: b.d + 1.5,
            h: b.h + extraH,  // roof height above group.position.y
            floorY: 0,        // relative floor — will be offset by group.position.y
        }
    };
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
    return finish(b, cx, cz, 1.4);
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
    const b = base(cx, cz, 13, 10, 5, 0xe8e6dd, seed);
    const r = toonMesh(new THREE.BoxGeometry(b.w + 0.5, 0.8, b.d + 0.5), PALETTE.wood[2]);
    r.mesh.position.set(0, b.h + 0.4, 0);
    r.mesh.rotation.x = 0.1;
    b.group.add(r.group);
    return finish(b, cx, cz, 0.8);
}

export function createMediterranean(cx, cz, seed) {
    const b = base(cx, cz, 14, 12, 5.5, 0xdbd7ce, seed);
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
    return finish(b, cx, cz, 1);
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
    const b = base(cx, cz, 18, 16, 7, 0xe8e6dd, seed);
    const r = toonMesh(new THREE.BoxGeometry(b.w + 0.4, 0.4, b.d + 0.4), roof(seed));
    r.mesh.position.y = b.h + 0.2;
    b.group.add(r.group);
    const garden = toonMesh(new THREE.BoxGeometry(b.w + 4, 0.1, 3), PALETTE.grass);
    garden.mesh.position.set(0, 0.05, b.d / 2 + 2);
    b.group.add(garden.group);
    return finish(b, cx, cz);
}

export function createApartment(cx, cz, seed) {
    const group = new THREE.Group();
    group.position.set(cx, 0, cz);
    const floorColor = 0xeeeeee;
    const glassColor = 0x4488cc;

    const numFloors = 6 + (seed % 4);
    const floorHeight = 2.5;

    for (let i = 0; i < numFloors; i++) {
        // Floor slab
        const slab = toonMesh(new THREE.CylinderGeometry(8, 8, 0.5, 32), floorColor);
        slab.mesh.position.y = i * floorHeight;
        group.add(slab.group);

        // Glass body for the floor
        if (i < numFloors - 1) {
            const windowMesh = toonMesh(new THREE.CylinderGeometry(7.5, 7.5, floorHeight - 0.5, 32), glassColor, { transparent: true, opacity: 0.7 });
            windowMesh.mesh.position.y = (i * floorHeight) + (floorHeight / 2) + 0.25;
            group.add(windowMesh.group);
        }
    }

    return finish({ group, w: 16, d: 16, h: numFloors * floorHeight }, cx, cz);
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
    const b = base(cx, cz, 28, 22, 8, 0xe8e6dd, seed);
    const gym = toonMesh(new THREE.BoxGeometry(12, 5, 10), PALETTE.blue);
    gym.mesh.position.set(b.w / 2 + 4, 2.5, 0);
    gym.mesh.castShadow = true;
    b.group.add(gym.group);
    return finish(b, cx, cz);
}

export function createLibrary(cx, cz, seed) {
    const group = new THREE.Group();
    group.position.set(cx, 0, cz);
    const stoneColor = 0xddddcc;

    // Base/Steps
    const baseM = toonMesh(new THREE.BoxGeometry(22, 2, 12), stoneColor);
    baseM.mesh.position.y = 1;
    group.add(baseM.group);

    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.5, 10, 16);
    for (let i = -9; i <= 9; i += 3) {
        const pillarFront = toonMesh(pillarGeo, stoneColor);
        pillarFront.mesh.position.set(i, 7, 4.5);
        group.add(pillarFront.group);
    }

    // Main Hall (behind pillars)
    const hall = toonMesh(new THREE.BoxGeometry(20, 10, 8), stoneColor);
    hall.mesh.position.set(0, 7, -1);
    group.add(hall.group);

    // Roof (Pediment)
    const roofCone = new THREE.ConeGeometry(12, 5, 4);
    const roof = toonMesh(roofCone, stoneColor);
    roof.mesh.rotation.y = Math.PI / 4;
    roof.mesh.position.set(0, 14.5, 0);
    roof.mesh.scale.set(1, 1, 0.6);
    group.add(roof.group);

    return finish({ group, w: 22, d: 12, h: 17 }, cx, cz);
}

export function createGlassTower(cx, cz, seed) {
    const group = new THREE.Group();
    group.position.set(cx, 0, cz);
    const floors = 6 + (seed % 3);
    const height = floors * 4.5;
    
    const geometry = new THREE.BoxGeometry(10, height, 10);
    const { group: bGroup, mesh } = toonMesh(geometry, 0x113355, { transparent: true, opacity: 0.9 });
    mesh.position.y = height / 2;
    group.add(bGroup);

    // Structural grid overlay
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: INK, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.position.y = height / 2;
    group.add(wireframe);

    return finish({ group, w: 10, d: 10, h: height }, cx, cz);
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

export function createOfficeTower(cx, cz, floors, accent = 0xe8e6dd) {
    const group = new THREE.Group();
    group.position.set(cx, 0, cz);
    const height = floors * 4.5;
    
    const geometry = new THREE.BoxGeometry(14, height, 12);
    const { group: bGroup, mesh } = toonMesh(geometry, 0x113355, { transparent: true, opacity: 0.9 });
    mesh.position.y = height / 2;
    group.add(bGroup);

    // Structural grid overlay
    const edges = new THREE.EdgesGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: INK, linewidth: 2 });
    const wireframe = new THREE.LineSegments(edges, lineMaterial);
    wireframe.position.y = height / 2;
    group.add(wireframe);

    return finish({ group, w: 14, d: 12, h: height }, cx, cz);
}

export function createClockTower(cx, cz, seed = 0) {
    const group = new THREE.Group();
    group.position.set(cx, 0, cz);
    const brickColor = 0xaa7755;
    const darkRoofColor = 0x222222;
    const clockFaceColor = 0xffffff;

    // Main Tower Shaft
    const shaft = toonMesh(new THREE.BoxGeometry(6, 35, 6), brickColor);
    shaft.mesh.position.y = 17.5;
    group.add(shaft.group);

    // Clock Section
    const clockSection = toonMesh(new THREE.BoxGeometry(7, 8, 7), brickColor);
    clockSection.mesh.position.y = 39;
    group.add(clockSection.group);

    // Clock Face
    const face = toonMesh(new THREE.CylinderGeometry(2, 2, 0.2, 32), clockFaceColor);
    face.mesh.rotation.x = Math.PI / 2;
    face.mesh.position.set(0, 39, 3.6);
    group.add(face.group);

    // Spire/Roof
    const spire = toonMesh(new THREE.ConeGeometry(4, 15, 4), darkRoofColor);
    spire.mesh.rotation.y = Math.PI / 4;
    spire.mesh.position.y = 50.5;
    group.add(spire.group);

    return finish({ group, w: 7, d: 7, h: 58 }, cx, cz);
}

export function createTechCampus(cx, cz, data = {}) {
    const seed = data.seed || 0;
    const r = createGlassTower(cx, cz, seed);
    if (data.title) r.group.userData.label = data.title;
    return { ...r, style: 'tech' };
}

export function createMarketingStudio(cx, cz, data = {}) {
    const r = createGallery(cx, cz, data.seed || 0);
    return { ...r, style: 'marketing' };
}

export function createConsultingOffice(cx, cz, data = {}) {
    const r = createClockTower(cx, cz, data.seed || 0);
    return { ...r, style: 'consulting' };
}

export function createProjectShowcase(cx, cz, data = {}) {
    const b = base(cx, cz, 16, 14, 14, 0xe8e6dd, 0);
    const spire = toonMesh(new THREE.BoxGeometry(3, 6, 3), PALETTE.mint, { emissive: PALETTE.mint, emissiveIntensity: 0.06 });
    spire.mesh.position.set(0, b.h + 3, 0);
    b.group.add(spire.group);
    return { ...finish(b, cx, cz, 9), style: 'project' };
}

// ── Street utilities ─────────────────────────────────────

export function createVendingMachine(x, z, seed = 0) {
    const v = createDetailedVendingMachine(seed);
    v.position.set(x, 0, z);
    return v;
}

export function createUtilityPole(x, z) {
    return createDetailedUtilityPole(x, z);
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
        default: return createOfficeTower(cx, cz, 4, 0xdbd7ce);
    }
}