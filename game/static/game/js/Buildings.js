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

// ─── Colony / alley buildings (narrow street refs) ─────────────────────────
// Tall multi-storey (image 1) and low residential (image 2), pastel toon.

const COLONY = {
    tallWalls: [
        0xd4b8a8, // warm clay
        0xc8d8e0, // faded blue
        0xe8c8b0, // peach plaster
        0xb8c4c8, // grey-blue
        0xd8c0a0, // sand ochre
        0xc0b0c8, // dusty lilac
    ],
    lowWalls: [
        0xd8a878, // terracotta
        0xc4a890, // mud plaster
        0xb89070, // brown clay
        0xe0b898, // peach
        0xa88878, // dusty rose-brown
    ],
    accents: [0x48a888, 0xd46858, 0xe8c84a, 0x5a90c8, 0xc878a0],
    balcony: 0xc8b8a0,
    rail: 0x6a7078,
    shutter: [0x3a7860, 0x486878, 0x8a5040, 0x5a6880],
};

/**
 * @param {'tall'|'low'} style
 * Local +Z is street-facing façade.
 */
export function buildColonyBuilding(w, h, d, seed, style = 'tall') {
    const s = Math.abs(Math.round(seed)) % 997;
    const g = new THREE.Group();
    const tall = style === 'tall';
    const wallCol = pick(tall ? COLONY.tallWalls : COLONY.lowWalls, s);
    const floors = Math.max(1, Math.floor(h / (tall ? 3.0 : 2.8)));

    // Main body
    const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallCol);
    body.mesh.position.y = h / 2;
    body.mesh.castShadow = true;
    body.mesh.receiveShadow = true;
    g.add(body.group);

    // Flat parapet / terrace lip
    const roofCol = pick(JP.roofs, s + 2);
    const parapet = toonMesh(new THREE.BoxGeometry(w + 0.2, 0.35, d + 0.2), roofCol);
    parapet.mesh.position.y = h + 0.18;
    g.add(parapet.group);

    // Floor bands
    for (let f = 1; f < floors; f++) {
        const by = f * (h / floors);
        if (by >= h - 0.3) break;
        const band = toonMesh(
            new THREE.BoxGeometry(w + 0.04, 0.1, d + 0.04),
            0xb0a898,
            { outline: false }
        );
        band.mesh.position.y = by;
        g.add(band.group);
    }

    // Ground door + windows
    const doorX = ((s % 2) - 0.5) * w * 0.25;
    const door = toonMesh(new THREE.BoxGeometry(0.9, 2.1, 0.08), 0x3a4848, { outline: false });
    door.mesh.position.set(doorX, 1.05, d / 2 + 0.03);
    g.add(door.group);

    // Windows per floor on street face
    const cols = Math.max(1, Math.floor(w / 2.4));
    for (let r = 1; r < floors; r++) {
        const wy = r * (h / floors) + (h / floors) * 0.35;
        if (wy >= h - 0.6) continue;
        for (let c = 0; c < cols; c++) {
            const wx = -w / 2 + (c + 0.5) * (w / cols);
            const shut = pick(COLONY.shutter, s + r + c);
            const frame = toonMesh(new THREE.BoxGeometry(1.1, 1.2, 0.08), 0x2a3038, { outline: false });
            frame.mesh.position.set(wx, wy, d / 2 + 0.02);
            g.add(frame.group);
            const glass = new THREE.Mesh(
                new THREE.BoxGeometry(0.85, 0.95, 0.05),
                toonMat(0x7ac4d0, {
                    transparent: true, opacity: 0.65,
                    emissive: 0xffe0a0, emissiveIntensity: 0,
                })
            );
            glass.position.set(wx, wy, d / 2 + 0.04);
            glass.userData.cityLight = 'window';
            glass.userData.litAtNight = ((s + r + c) % 4) !== 0;
            glass.material.userData.cityLight = 'window';
            g.add(glass);

            // Colored shutter strip
            if ((s + c) % 2 === 0) {
                const sh = toonMesh(new THREE.BoxGeometry(0.35, 0.95, 0.04), shut, { outline: false });
                sh.mesh.position.set(wx - 0.35, wy, d / 2 + 0.06);
                g.add(sh.group);
            }
        }
    }

    // Balconies (tall style — photo 1)
    if (tall && floors >= 2) {
        for (let r = 1; r < Math.min(floors, 4); r++) {
            if ((s + r) % 2 === 0) continue;
            const by = r * (h / floors) + 0.2;
            const bw = Math.min(w * 0.55, 4.2);
            const bal = toonMesh(new THREE.BoxGeometry(bw, 0.12, 0.9), COLONY.balcony);
            bal.mesh.position.set(((s + r) % 2 === 0 ? -1 : 1) * w * 0.12, by, d / 2 + 0.5);
            g.add(bal.group);
            // Rail
            const rail = toonMesh(new THREE.BoxGeometry(bw, 0.55, 0.06), COLONY.rail, { outline: false });
            rail.mesh.position.set(((s + r) % 2 === 0 ? -1 : 1) * w * 0.12, by + 0.3, d / 2 + 0.9);
            g.add(rail.group);
        }
    }

    // AC boxes on façade
    if (tall) {
        for (let i = 0; i < 2; i++) {
            const ac = toonMesh(new THREE.BoxGeometry(0.7, 0.4, 0.35), 0xd0d4d0, { outline: false });
            ac.mesh.position.set(
                -w / 2 + 0.6 + i * 1.4,
                3.2 + i * 2.8,
                d / 2 + 0.25
            );
            g.add(ac.group);
        }
    }

    // Laundry poles (low residential — photo 2)
    if (!tall && s % 2 === 0) {
        const pole = toonMesh(new THREE.BoxGeometry(0.06, 1.4, 0.06), 0x8a9098, { outline: false });
        pole.mesh.position.set(w * 0.3, h + 0.9, d / 2 - 0.2);
        g.add(pole.group);
        const clothes = [0xf2b0c5, 0x48d2c9, 0xf5c842, 0xffffff];
        for (let i = 0; i < 3; i++) {
            const cloth = toonMesh(
                new THREE.BoxGeometry(0.55, 0.7, 0.04),
                clothes[i % clothes.length],
                { outline: false }
            );
            cloth.mesh.position.set(w * 0.3 - 0.7 + i * 0.55, h + 0.5, d / 2 + 0.15);
            cloth.mesh.rotation.z = (i - 1) * 0.08;
            g.add(cloth.group);
        }
    }

    // Shop accent strip on ground floor (tall corner feel)
    if (tall && s % 3 === 0) {
        const acc = pick(COLONY.accents, s);
        const strip = toonMesh(new THREE.BoxGeometry(w + 0.05, 0.25, d + 0.05), acc, { outline: false });
        strip.mesh.position.y = 2.9;
        g.add(strip.group);
    }

    // Raised plinth / sidewalk edge (both styles)
    const plinth = toonMesh(new THREE.BoxGeometry(w + 0.3, 0.35, 0.55), 0xc8c0b4, { outline: false });
    plinth.mesh.position.set(0, 0.18, d / 2 + 0.25);
    g.add(plinth.group);

    return g;
}

// ─── Shinjuku-style commercial tower (pastel anime) ───────────────────────
// Dense façade, vertical kanban signs, billboards, neon glow — matches
// japan-725347 photo composition but in the game's pastel toon palette.
const SHINJUKU = {
    walls: [
        0xe8e4f0, // soft grey-lavender
        0xdce8f0, // cool grey-blue
        0xf0e8e4, // warm concrete
        0xe4ece8, // mint-grey
        0xf2e8f0, // pink-grey
        0xe8ece4, // sage grey
    ],
    // Pastel "neon" sign colors (bright but soft)
    neon: [
        0xff6b9d, // hot pink
        0x5ec8ff, // electric sky
        0xffd966, // soft gold
        0x7dffb3, // mint neon
        0xff8c5a, // coral
        0xc49bff, // lilac
        0xff5c7a, // rose red (like the photo's vertical signs)
        0x48d2c9, // teal
    ],
    billboard: [
        0xffe0ec, 0xd0f0ff, 0xfff0c8, 0xe0ffe8, 0xf0e0ff, 0xffe8d0,
    ],
    panel: [0x3a4858, 0x2a3848, 0x483848, 0x284848],
};

/**
 * Tall commercial building for Main Avenue canyon.
 * Local +Z is the street-facing façade.
 */
export function buildShinjukuBuilding(w, h, d, seed) {
    const s = Math.abs(Math.round(seed)) % 997;
    const g = new THREE.Group();
    const wallCol = pick(SHINJUKU.walls, s);
    const floors = Math.max(4, Math.floor(h / 3.0));

    // ── Body ──────────────────────────────────────────────────────────────
    const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallCol);
    body.mesh.position.y = h / 2;
    body.mesh.castShadow = true;
    body.mesh.receiveShadow = true;
    g.add(body.group);

    // Parapet
    const roofCol = pick(JP.roofs, s + 2);
    const parapet = toonMesh(new THREE.BoxGeometry(w + 0.3, 0.55, d + 0.3), roofCol);
    parapet.mesh.position.y = h + 0.28;
    g.add(parapet.group);

    // Floor bands
    for (let f = 1; f < floors; f++) {
        const bandY = f * (h / floors);
        if (bandY >= h - 0.4) break;
        const band = toonMesh(
            new THREE.BoxGeometry(w + 0.05, 0.12, d + 0.05),
            0xc8c4c0,
            { outline: false }
        );
        band.mesh.position.y = bandY;
        g.add(band.group);
    }

    // Dense window grid on street face
    const cols = Math.max(2, Math.floor(w / 2.2));
    for (let r = 1; r < floors; r++) {
        const wy = r * (h / floors) + (h / floors) * 0.35;
        if (wy >= h - 0.8) continue;
        for (let c = 0; c < cols; c++) {
            const wx = -w / 2 + (c + 0.5) * (w / cols);
            const lit = ((s + r * 13 + c * 7) % 4) !== 0;
            const glow = pick(SHINJUKU.neon, s + r + c);
            const glassMat = toonMat(0x7ac4d0, {
                transparent: true,
                opacity: 0.7,
                emissive: lit ? glow : 0x224040,
                emissiveIntensity: 0,
            });
            const frame = new THREE.Mesh(
                new THREE.BoxGeometry(1.15, 1.35, 0.06),
                toonMat(0x2a3038)
            );
            frame.position.set(wx, wy, d / 2 + 0.02);
            g.add(frame);
            const glass = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.1, 0.05), glassMat);
            glass.position.set(wx, wy, d / 2 + 0.04);
            glass.userData.cityLight = 'window';
            glass.userData.litAtNight = lit;
            glassMat.userData.cityLight = 'window';
            g.add(glass);
        }
    }

    // Ground-floor shop (bright, lit)
    const shopCol = pick(SHINJUKU.neon, s + 3);
    const shopMat = toonMat(0x6ab8c8, {
        transparent: true,
        opacity: 0.55,
        emissive: shopCol,
        emissiveIntensity: 0,
    });
    const shop = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 2.6, 0.08), shopMat);
    shop.position.set(0, 1.35, d / 2 + 0.03);
    shop.userData.cityLight = 'shop';
    shop.userData.litAtNight = true;
    shopMat.userData.cityLight = 'shop';
    g.add(shop);

    const shopFrame = toonMesh(
        new THREE.BoxGeometry(w * 0.88, 2.75, 0.1),
        0x1e2830,
        { outline: false }
    );
    shopFrame.mesh.position.set(0, 1.4, d / 2 - 0.01);
    g.add(shopFrame.group);

    // Colorful awning strip
    const awCol = pick(SHINJUKU.neon, s + 5);
    const awning = toonMesh(new THREE.BoxGeometry(w * 0.9, 0.2, 1.4), awCol);
    awning.mesh.position.set(0, 2.85, d / 2 + 0.65);
    awning.mesh.rotation.x = 0.18;
    g.add(awning.group);

    // ── Vertical kanban signs (photo signature) ──────────────────────────
    const vCount = 2 + (s % 3);
    for (let i = 0; i < vCount; i++) {
        const neon = pick(SHINJUKU.neon, s + i * 3);
        const vh = 3.5 + (s + i * 11) % 5;
        const vw = 0.45 + ((s + i) % 3) * 0.12;
        const vx = -w / 2 + 0.4 + i * (w / Math.max(vCount, 1)) * 0.85;
        const vy = 3.2 + (i % 3) * 1.8;
        if (vy + vh / 2 > h - 0.5) continue;

        // Outer glow frame
        const frame = toonMesh(
            new THREE.BoxGeometry(vw + 0.12, vh + 0.12, 0.14),
            0x1a2030,
            { outline: false }
        );
        frame.mesh.position.set(vx, vy + vh / 2, d / 2 + 0.18);
        g.add(frame.group);

        // Pastel neon face
        const faceMat = toonMat(neon, {
            emissive: neon,
            emissiveIntensity: 0.35,
        });
        const face = new THREE.Mesh(new THREE.BoxGeometry(vw, vh, 0.1), faceMat);
        face.position.set(vx, vy + vh / 2, d / 2 + 0.26);
        face.userData.cityLight = 'sign';
        face.userData.litAtNight = true;
        faceMat.userData.cityLight = 'sign';
        g.add(face);

        // Segment bars (suggest text rows)
        const segs = Math.floor(vh / 0.7);
        for (let k = 0; k < segs; k++) {
            const bar = toonMesh(
                new THREE.BoxGeometry(vw * 0.7, 0.08, 0.04),
                0xf8f8f0,
                { outline: false, transparent: true, opacity: 0.55 }
            );
            bar.mesh.position.set(vx, vy + 0.4 + k * 0.7, d / 2 + 0.32);
            g.add(bar.group);
        }
    }

    // ── Horizontal billboards / posters ──────────────────────────────────
    const billCount = 1 + (s % 3);
    for (let i = 0; i < billCount; i++) {
        const bw = w * (0.35 + (s % 3) * 0.1);
        const bh = 1.4 + (s % 2) * 0.5;
        const by = 5 + i * 4.5 + (s % 3);
        if (by + bh / 2 > h - 1) continue;
        const bx = ((s + i) % 2 === 0 ? -1 : 1) * (w * 0.15);
        const bgCol = pick(SHINJUKU.billboard, s + i);
        const frameCol = pick(SHINJUKU.panel, s + i);

        const frame = toonMesh(
            new THREE.BoxGeometry(bw + 0.15, bh + 0.15, 0.12),
            frameCol,
            { outline: false }
        );
        frame.mesh.position.set(bx, by, d / 2 + 0.1);
        g.add(frame.group);

        const posterMat = toonMat(bgCol, {
            emissive: bgCol,
            emissiveIntensity: 0.12,
        });
        const poster = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.08), posterMat);
        poster.position.set(bx, by, d / 2 + 0.18);
        poster.userData.cityLight = 'sign';
        poster.userData.litAtNight = true;
        posterMat.userData.cityLight = 'sign';
        g.add(poster);

        // Accent bar on poster
        const accent = toonMesh(
            new THREE.BoxGeometry(bw * 0.9, 0.18, 0.05),
            pick(SHINJUKU.neon, s + i + 2),
            { outline: false, emissive: pick(SHINJUKU.neon, s + i + 2), emissiveIntensity: 0.2 }
        );
        accent.mesh.position.set(bx, by + bh * 0.3, d / 2 + 0.22);
        g.add(accent.group);
    }

    // Rooftop billboard (skyline silhouette like the photo)
    if (h > 16) {
        const rbW = w * 0.7;
        const rbH = 2.2 + (s % 3) * 0.4;
        const rb = toonMesh(
            new THREE.BoxGeometry(rbW, rbH, 0.2),
            pick(SHINJUKU.neon, s + 8),
            { emissive: pick(SHINJUKU.neon, s + 8), emissiveIntensity: 0.25 }
        );
        rb.mesh.position.set(0, h + 0.55 + rbH / 2, d / 2 - 0.2);
        rb.mesh.userData.cityLight = 'sign';
        rb.mesh.userData.litAtNight = true;
        g.add(rb.group);

        // Support poles
        [-rbW * 0.4, rbW * 0.4].forEach(ox => {
            const pole = toonMesh(new THREE.BoxGeometry(0.1, 1.2, 0.1), 0x6a7078, { outline: false });
            pole.mesh.position.set(ox, h + 0.6, d / 2 - 0.2);
            g.add(pole.group);
        });
    }

    // Side-wall vertical signs (visible when looking down the street)
    if (s % 2 === 0) {
        const sideNeon = pick(SHINJUKU.neon, s + 11);
        const side = toonMesh(
            new THREE.BoxGeometry(0.12, 4.5, 0.5),
            sideNeon,
            { emissive: sideNeon, emissiveIntensity: 0.3 }
        );
        side.mesh.position.set(w / 2 + 0.08, 6, 0);
        side.mesh.userData.cityLight = 'sign';
        side.mesh.userData.litAtNight = true;
        g.add(side.group);
    }

    // AC units on side (urban clutter)
    if (h > 12) {
        for (let i = 0; i < 2; i++) {
            const ac = toonMesh(new THREE.BoxGeometry(0.7, 0.35, 0.25), 0xc8ccc8, { outline: false });
            ac.mesh.position.set(-w / 2 - 0.12, 4 + i * 3.5, (i - 0.5) * d * 0.3);
            g.add(ac.group);
        }
    }

    return g;
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