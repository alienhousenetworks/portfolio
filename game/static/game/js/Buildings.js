/**
 * Buildings.js — Japanese Anime Town style buildings
 * Inspired by messenger.abeto.co — muted concrete, flat roofs, dark windows, awnings, signs
 */
import * as THREE from 'three';
import { PALETTE } from './config.js';
import { toonMesh, toonMat, INK } from './ToonStyle.js';

// ─── Japanese palette ──────────────────────────────────────────────────────
const JP = {
    // Wall colors: light-shaded Japanese anime pastel tones
    walls: [
        0xf5d6d8,  // Blossom Pink
        0xd0ede5,  // Mint green
        0xd2e5f5,  // Soft sky blue
        0xf7eec6,  // Vanilla cream
        0xf9dfcb,  // Light peach
        0xe3e0f5,  // Soft lavender
        0xe5e5df,  // Warm linen gray
        0xdce5d6,  // Sage pastel
    ],
    // Roof/parapet: slightly deeper but still soft anime colors
    roofs: [
        0xe3a8ac,  // Soft coral
        0x80cbc4,  // Soft teal
        0x90caf9,  // Pastel blue
        0xffdd80,  // Soft gold
        0xe6a188,  // Light terracotta
        0xb39ddb,  // Soft lilac
        0xa5d6a7,  // Soft green
    ],
    // Accent colors for facade panels
    accents: [
        0xffa726,  // Pastel orange
        0xf06292,  // Pastel rose
        0x26a69a,  // Soft sea green
        0x5c6bc0,  // Soft indigo
        0x8d6e63,  // Warm brown
        0x26c6da,  // Bright sky cyan
    ],
    // Ground floor shop
    shopGlass: 0x6ab8c8,
    shopFrame: 0x2a3038,
    // Windows
    winFrame: 0x2a3038,
    winGlass: 0x7ac4d0,
    // Awning colors
    awnings: [0x48d2c9, 0xcc7070, 0xeece60, 0x7ab0c8, 0xaad090],
    awningStripe: 0xf8f8f0,
    // Signs
    signBg: [0x2a4858, 0x3a3028, 0x284840, 0x483828],
    signAccent: [0x48d2c9, 0xf5c842, 0xe88888, 0x88d0b8],
    // Misc
    acUnit: 0xd0d4d0,
    pipe: 0x8a9898,
    tank: 0x8aaa98,
    brick: 0xb89078,
};

function pick(arr, seed) { return arr[Math.abs(seed) % arr.length]; }

// ─── Main Japanese Building Factory ────────────────────────────────────────
export function buildJapaneseBuilding(w, h, d, seed) {
    const s = Math.abs(Math.round(seed)) % 997;
    const g = new THREE.Group();

    const wallCol = pick(JP.walls, s);
    const roofCol = pick(JP.roofs, s + 3);
    const floors = Math.max(1, Math.floor(h / 3.2));

    // ── Main body ─────────────────────────────────────────────────────────
    const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallCol);
    body.mesh.position.y = h / 2;
    body.mesh.castShadow = true;
    body.mesh.receiveShadow = true;
    g.add(body.group);

    // ── Roof parapet ──────────────────────────────────────────────────────
    const parapet = toonMesh(new THREE.BoxGeometry(w + 0.25, 0.5, d + 0.25), roofCol);
    parapet.mesh.position.y = h + 0.25;
    g.add(parapet.group);

    // ── Floor bands (horizontal concrete lines between floors) ────────────
    for (let f = 1; f < floors; f++) {
        const bandY = f * 3.2;
        if (bandY >= h - 0.5) break;
        const band = toonMesh(new THREE.BoxGeometry(w + 0.06, 0.18, d + 0.06), roofCol, { outline: false });
        band.mesh.position.y = bandY;
        g.add(band.group);
    }

    // ── Accent strip (top of ground floor) ───────────────────────────────
    if (s % 3 === 0) {
        const accCol = pick(JP.accents, s + 5);
        const strip = toonMesh(new THREE.BoxGeometry(w + 0.05, 0.22, d + 0.05), accCol, { outline: false });
        strip.mesh.position.y = 3.1;
        g.add(strip.group);
    }

    // ── Ground floor: shop treatment ────────────────────────────────────
    _shopFront(g, w, d, s);

    // ── Windows (upper floors) ───────────────────────────────────────────
    _windows(g, w, h, d, s, floors);

    // ── Awning over shop front ───────────────────────────────────────────
    if (s % 2 === 0) _awning(g, w, d, s);

    // ── Building sign ─────────────────────────────────────────────────────
    _sign(g, w, h, d, s);

    // ── Side-wall details: AC units ───────────────────────────────────────
    if (h > 7 && s % 2 === 0) _acUnits(g, w, h, d, s);

    // ── Rooftop details ───────────────────────────────────────────────────
    if (h > 9) _rooftopDetails(g, w, h, d, s);

    // ── Staggered upper step (variety in silhouette) ─────────────────────
    if (s % 5 === 0 && h > 9 && floors >= 3) _upperStep(g, w, h, d, s, wallCol, roofCol);

    // ── Drainpipes on wall edges ──────────────────────────────────────────
    if (s % 3 !== 2) {
        const pipe = toonMesh(new THREE.BoxGeometry(0.08, h, 0.08), JP.pipe, { outline: false });
        pipe.mesh.position.set(w / 2 - 0.12, h / 2, d / 2 - 0.12);
        g.add(pipe.group);
    }

    return g;
}

function _shopFront(g, w, d, seed) {
    // Large glass storefront at ground level (lit at night by EnvironmentSystem)
    const glassW = w * 0.72;
    const glassMat = toonMat(JP.shopGlass, {
        transparent: true, opacity: 0.55,
        emissive: 0xffcc88, emissiveIntensity: 0,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(glassW, 2.5, 0.05), glassMat);
    glass.position.set(0, 1.25, d / 2 + 0.02);
    glass.userData.cityLight = 'shop';
    glass.userData.litAtNight = true;
    glassMat.userData.cityLight = 'shop';
    g.add(glass);

    // Dark frame around storefront
    const frame = toonMesh(new THREE.BoxGeometry(glassW + 0.2, 2.65, 0.1), JP.shopFrame, { outline: false });
    frame.mesh.position.set(0, 1.3, d / 2 - 0.02);
    g.add(frame.group);

    // Door (slightly offset)
    const doorX = (seed % 2 === 0 ? 0.28 : -0.28) * w;
    const door = toonMesh(new THREE.BoxGeometry(0.85, 2.15, 0.07), 0x3a4848, { outline: false });
    door.mesh.position.set(doorX, 1.08, d / 2 + 0.03);
    g.add(door.group);

    // Door handle
    const handle = toonMesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), 0xb0b0a0, { outline: false });
    handle.mesh.position.set(doorX + 0.32, 1.0, d / 2 + 0.07);
    g.add(handle.group);
}

function _windows(g, w, h, d, seed, floors) {
    const cols = Math.max(1, Math.floor(w / 2.8));
    const frameMat = toonMat(JP.winFrame);

    for (let r = 1; r < floors; r++) {
        const wy = r * 3.2 + 1.4;
        if (wy >= h - 0.9) continue;

        for (let c = 0; c < cols; c++) {
            const wx = -w / 2 + (c + 0.5) * (w / cols);
            // Per-window material so some rooms stay dark at night
            const lit = ((seed + r * 17 + c * 31) % 5) !== 0;
            const warm = ((seed + r + c) % 3) === 0 ? 0xffe8a8 : 0xffd080;
            const glassMat = toonMat(JP.winGlass, {
                transparent: true, opacity: 0.72,
                emissive: warm, emissiveIntensity: 0,
            });

            // Front face windows
            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 0.07), frameMat);
            frame.position.set(wx, wy, d / 2 + 0.02);
            g.add(frame);

            const glass = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.25, 0.05), glassMat);
            glass.position.set(wx, wy, d / 2 + 0.04);
            glass.userData.cityLight = 'window';
            glass.userData.litAtNight = lit;
            glassMat.userData.cityLight = 'window';
            g.add(glass);

            // Horizontal grid bar on window
            const bar = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.07, 0.04), frameMat);
            bar.position.set(wx, wy, d / 2 + 0.06);
            g.add(bar);

            // Window sill
            const sill = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.1, 0.22), toonMat(0xd4d8d4));
            sill.position.set(wx, wy - 0.8, d / 2 + 0.12);
            g.add(sill);
        }
    }

    // Side windows (fewer, every other floor)
    const sideCols = Math.max(1, Math.floor(d / 4.5));
    for (let r = 1; r < Math.min(floors, 3); r += 2) {
        const wy = r * 3.2 + 1.4;
        if (wy >= h - 0.9) continue;
        for (let c = 0; c < sideCols; c++) {
            const wz = -d / 2 + (c + 0.5) * (d / sideCols);
            [-1, 1].forEach(side => {
                const f = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.3, 1.1), frameMat);
                f.position.set((w / 2 + 0.02) * side, wy, wz);
                g.add(f);
            });
        }
    }
}

function _awning(g, w, d, seed) {
    const col = pick(JP.awnings, seed + 2);
    // Main awning body
    const aw = toonMesh(new THREE.BoxGeometry(w * 0.82, 0.18, 1.6), col);
    aw.mesh.position.set(0, 2.95, d / 2 + 0.7);
    aw.mesh.rotation.x = 0.22;
    g.add(aw.group);

    // Light stripes (every other stripe lighter)
    const stripeW = w * 0.82 / 5;
    for (let i = 0; i < 5; i += 2) {
        const stripe = toonMesh(
            new THREE.BoxGeometry(stripeW * 0.7, 0.07, 1.6), JP.awningStripe,
            { transparent: true, opacity: 0.5, outline: false }
        );
        stripe.mesh.position.set(-w * 0.82 / 2 + (i + 0.5) * stripeW, 2.99, d / 2 + 0.72);
        stripe.mesh.rotation.x = 0.22;
        g.add(stripe.group);
    }

    // Awning supports (angled brackets)
    [-w * 0.38, 0, w * 0.38].forEach(ox => {
        const bracket = toonMesh(new THREE.BoxGeometry(0.05, 0.9, 0.05), 0x8a9898, { outline: false });
        bracket.mesh.position.set(ox, 2.5, d / 2 + 0.4);
        bracket.mesh.rotation.x = 0.5;
        g.add(bracket.group);
    });
}

function _sign(g, w, h, d, seed) {
    // Hanging sign panel on building face
    const signW = Math.min(w * 0.55, 4.8);
    const signH = 0.85;
    const signY = Math.min(h * 0.62 + 1.5, h - 1.2);

    const bg = toonMesh(new THREE.BoxGeometry(signW, signH, 0.1), pick(JP.signBg, seed + 1));
    bg.mesh.position.set(0, signY, d / 2 + 0.06);
    g.add(bg.group);

    // Accent border line
    const border = toonMesh(
        new THREE.BoxGeometry(signW + 0.1, signH + 0.1, 0.05),
        pick(JP.signAccent, seed), { outline: false }
    );
    border.mesh.position.set(0, signY, d / 2 + 0.03);
    g.add(border.group);

    // Vertical hanging sign on side (abeto.co style)
    if (seed % 3 === 1 && w > 8) {
        const vSign = toonMesh(new THREE.BoxGeometry(0.55, 2.2, 0.1), pick(JP.signBg, seed + 4));
        vSign.mesh.position.set(w / 2 - 0.5, signY - 0.8, d / 2 + 0.06);
        g.add(vSign.group);
    }
}

function _acUnits(g, w, h, d, seed) {
    const numAC = 1 + (seed % 3);
    for (let i = 0; i < numAC; i++) {
        const side = (seed + i) % 2 === 0 ? 1 : -1;
        const acY = 2.8 + i * 3.2;
        if (acY >= h - 0.6) continue;
        const acZ = 0;
        const ac = toonMesh(new THREE.BoxGeometry(0.75, 0.38, 0.28), JP.acUnit, { outline: false });
        ac.mesh.position.set((w / 2 + 0.15) * side, acY, acZ);
        g.add(ac.group);

        // AC fan grill lines
        const grill = toonMesh(new THREE.BoxGeometry(0.6, 0.08, 0.04), 0xaaaaaa, { outline: false });
        grill.mesh.position.set((w / 2 + 0.16) * side, acY, acZ);
        g.add(grill.group);
    }
}

function _rooftopDetails(g, w, h, d, seed) {
    // Water tank
    if (seed % 3 === 0) {
        const tankR = 0.7 + (seed % 3) * 0.2;
        const tankH = 1.6 + (seed % 2) * 0.5;
        const tank = toonMesh(new THREE.CylinderGeometry(tankR, tankR + 0.05, tankH, 10), JP.tank);
        tank.mesh.position.set(w * 0.28, h + tankH / 2, -d * 0.15);
        tank.mesh.castShadow = true;
        g.add(tank.group);
        // Tank legs
        [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(([lx, lz]) => {
            const leg = toonMesh(new THREE.BoxGeometry(0.07, 0.7, 0.07), 0x7a8888, { outline: false });
            leg.mesh.position.set(w * 0.28 + lx * tankR, h + 0.35, -d * 0.15 + lz * tankR);
            g.add(leg.group);
        });
    }

    // Rooftop AC / ventilation block
    if (seed % 4 === 1) {
        const vent = toonMesh(new THREE.BoxGeometry(1.4, 0.6, 1.4), 0xb0b8b0, { outline: false });
        vent.mesh.position.set(-w * 0.28, h + 0.3, d * 0.18);
        g.add(vent.group);
    }

    // Satellite dish
    if (seed % 7 === 2) {
        const dish = toonMesh(
            new THREE.SphereGeometry(0.4, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
            0xcccccc, { outline: false }
        );
        dish.mesh.position.set(-w * 0.32, h + 0.22, 0);
        dish.mesh.rotation.z = Math.PI / 4;
        g.add(dish.group);
    }

    // Guard rail on roof edge
    if (h > 12) {
        const rail = toonMesh(new THREE.BoxGeometry(w, 0.08, 0.08), 0x8a9898, { outline: false });
        rail.mesh.position.set(0, h + 0.54, d / 2 + 0.14);
        g.add(rail.group);
    }
}

function _upperStep(g, w, h, d, seed, wallCol, roofCol) {
    // Additional recessed upper section — creates stepped silhouette like abeto buildings
    const stepH = 3.5 + (seed % 3) * 1.5;
    const stepW = w * (0.5 + (seed % 3) * 0.1);
    const stepOff = (seed % 2 === 0 ? 1 : -1) * (w - stepW) * 0.4;

    const step = toonMesh(new THREE.BoxGeometry(stepW, stepH, d * 0.85), wallCol);
    step.mesh.position.set(stepOff, h + stepH / 2, 0);
    step.mesh.castShadow = true;
    g.add(step.group);

    const stepRoof = toonMesh(new THREE.BoxGeometry(stepW + 0.22, 0.4, d * 0.85 + 0.22), roofCol);
    stepRoof.mesh.position.set(stepOff, h + stepH + 0.2, 0);
    g.add(stepRoof.group);

    // Window on step face
    const stepFloors = Math.floor(stepH / 3.2);
    for (let r = 0; r < stepFloors; r++) {
        const wy = h + 1.5 + r * 3.2;
        if (wy >= h + stepH - 0.5) continue;
        const f = toonMesh(new THREE.BoxGeometry(1.2, 1.4, 0.07), JP.winFrame, { outline: false });
        f.mesh.position.set(stepOff, wy, d * 0.425 + 0.02);
        g.add(f.group);
        const gl = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.15, 0.05), toonMat(JP.winGlass, { transparent: true, opacity: 0.7 }));
        gl.position.set(stepOff, wy, d * 0.425 + 0.04);
        g.add(gl);
    }
}

// ─── Corner Building (L-shape, wider for intersections) ───────────────────
export function buildJapaneseCorner(seed) {
    const s = Math.abs(seed) % 997;
    const g = new THREE.Group();
    const wallCol = pick(JP.walls, s);
    const roofCol = pick(JP.roofs, s + 2);

    // Main wing
    const m1 = toonMesh(new THREE.BoxGeometry(12, 10, 8), wallCol);
    m1.mesh.position.set(0, 5, 0);
    m1.mesh.castShadow = true;
    g.add(m1.group);

    // Side wing
    const m2 = toonMesh(new THREE.BoxGeometry(8, 7, 12), wallCol);
    m2.mesh.position.set(-2, 3.5, -2);
    m2.mesh.castShadow = true;
    g.add(m2.group);

    // Roof
    const r1 = toonMesh(new THREE.BoxGeometry(12.3, 0.45, 8.3), roofCol);
    r1.mesh.position.set(0, 10.2, 0);
    g.add(r1.group);
    const r2 = toonMesh(new THREE.BoxGeometry(8.3, 0.45, 12.3), roofCol);
    r2.mesh.position.set(-2, 7.2, -2);
    g.add(r2.group);

    return g;
}

// ─── Legacy exports (keep API compatibility with old WorldBuilder imports) ──
export function createZoneBuilding(zone, x, z, w, d, h, seed) {
    return buildJapaneseBuilding(w, h, d, seed);
}
export function createServiceBuilding(type, seed) {
    return buildJapaneseBuilding(10, 8, 10, seed);
}
export function createVendingMachine(seed = 0) {
    const g = new THREE.Group();
    const body = toonMesh(new THREE.BoxGeometry(0.82, 1.75, 0.48), seed % 2 === 0 ? 0x48d2c9 : 0x4898e8);
    body.mesh.position.y = 0.875;
    body.mesh.castShadow = true;
    g.add(body.group);
    const panel = toonMesh(new THREE.BoxGeometry(0.62, 1.25, 0.06), 0x2a3838, { outline: false });
    panel.mesh.position.set(0, 0.92, 0.25);
    g.add(panel.group);
    const coin = toonMesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), 0xf5c842, { outline: false });
    coin.mesh.position.set(0.25, 1.5, 0.26);
    g.add(coin.group);
    return g;
}
export function createUtilityPole(x, z, scene) {
    const g = new THREE.Group();
    const pole = toonMesh(new THREE.BoxGeometry(0.15, 6.5, 0.15), 0x4a4a3a);
    pole.mesh.position.y = 3.25;
    pole.mesh.castShadow = true;
    g.add(pole.group);
    const arm = toonMesh(new THREE.BoxGeometry(2.4, 0.1, 0.1), 0x4a4a3a, { outline: false });
    arm.mesh.position.y = 5.8;
    g.add(arm.group);
    const arm2 = toonMesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), 0x4a4a3a, { outline: false });
    arm2.mesh.position.set(0, 5.0, 0);
    g.add(arm2.group);
    g.position.set(x, 0, z);
    if (scene) scene.add(g);
    return g;
}
export function createSchool(seed) { return buildJapaneseBuilding(20, 9, 14, seed); }
export function createResidential(seed) { return buildJapaneseBuilding(10, 7.5, 10, seed); }
export function createTinyHome(seed) { return buildJapaneseBuilding(7, 5.5, 8, seed); }
export function createCafe(seed) { return buildJapaneseBuilding(9, 6.5, 9, seed); }
export function createJapaneseModern(seed) { return buildJapaneseBuilding(13, 14, 10, seed); }