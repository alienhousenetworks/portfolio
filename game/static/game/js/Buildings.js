/**
 * Buildings.js — Japanese Anime Town style buildings
 * Inspired by messenger.abeto.co — muted concrete, flat roofs, dark windows, awnings, signs
 */
import * as THREE from 'three';
import { PALETTE } from './config.js';
import { toonMesh, toonMat, INK, getGradientMap } from './ToonStyle.js';

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

// ─── Bengali colony buildings (photo-matched detail) ───────────────────────
// Thakur Colony = tall multi-storey Kolkata alley (image 1)
// Bose Colony   = low residential lane (image 2)

const THAKUR = {
    // Weathered pastel façades matching photo 1
    walls: [
        0x5a9aaa, // faded teal-blue
        0xe8d4a8, // cream yellow
        0xc87860, // terracotta red
        0xb8c8d0, // grey-blue plaster
        0xd0b898, // warm sand
        0x6a8898, // dusty blue
    ],
    ground: [0xc87058, 0xd8c8a8, 0x5a8890], // red shop / cream / blue base
    shutter: [0x2d6b4f, 0x3a6070, 0x8a4038], // green / blue-grey / maroon
    balcony: 0xc8b8a0,
    lattice: 0xa89880,
    rail: 0x5a6068,
    ac: 0xd8dce0,
    door: 0x3a5058,
};

const BOSE = {
    walls: [
        0xd49868, // terracotta plaster
        0xc48858, // burnt orange
        0xb88870, // dusty brown
        0xe0b090, // peach clay
        0x8a7870, // grey-brown
        0xd8a878, // warm ochre
    ],
    wood: 0x6a4030,
    eave: 0x8a5040,
    shutter: 0x2a3038,
    tin: 0x8a9098,
    plinth: 0xc8b0a0,
};

/**
 * @param {'thakur'|'bose'|'sukumar'|'tall'|'low'} style
 * Local +Z is street-facing façade.
 */
export function buildColonyBuilding(w, h, d, seed, style = 'thakur') {
    if (style === 'sukumar') return _buildSukumarBuilding(w, h, d, seed);
    const tall = style === 'thakur' || style === 'tall';
    return tall
        ? _buildThakurBuilding(w, h, d, seed)
        : _buildBoseBuilding(w, h, d, seed);
}

// ─── Sukumar Roy Colony — pure white colonial façades ─
// Walls/trim/plinth pure white; soft grey shutters; black mural ink.
const SUKUMAR = {
    walls: [
        0xffffff, // pure white
        0xffffff,
        0xfefefe,
        0xffffff,
        0xfdfdfd,
        0xffffff,
    ],
    trim: 0xffffff,
    shutter: [0xb8b8b8, 0xa8a8a8, 0xc0c0c0, 0x9a9a9a], // soft grey louvers on white
    wood: 0x8b5a3c, // natural wood open shutter accent
    rail: 0xf0f0f0,
    mold: 0xffffff,
    mural: 0x1a1a1a, // black ink figures on white walls
    door: 0xe8e8e8, // light grey door
    frame: 0x555555,
    plinth: 0xffffff, // pure white base
    step: 0xf0f0f0,
    ac: 0xe8e8e8,
    open: 0x2a2a2a,
    louv: 0x6a6a6a,
};

/**
 * White colonial / Art-Deco Kolkata house — high-detail variants.
 * Variants: corner · pilaster · mural · arched · gallery
 */
function _buildSukumarBuilding(w, h, d, seed) {
    const s = Math.abs(Math.round(seed)) % 997;
    const variant = s % 5; // 0 corner, 1 pilaster, 2 mural, 3 arched, 4 gallery
    const g = new THREE.Group();
    const wallCol = pick(SUKUMAR.walls, s);
    const floors = Math.max(2, Math.min(3, Math.floor(h / 3.4)));
    const floorH = h / floors;

    const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallCol, { castShadow: true, receiveShadow: true });
    body.mesh.position.y = h / 2;
    g.add(body.group);

    // Pure white base band with slight thickness for depth
    const baseBand = toonMesh(
        new THREE.BoxGeometry(w + 0.14, Math.min(floorH * 0.42, 1.65), d + 0.14),
        SUKUMAR.plinth
    );
    baseBand.mesh.position.y = Math.min(floorH * 0.21, 0.82);
    g.add(baseBand.group);

    // Floor cornices + light dentil row (capped for quality without mesh spam)
    for (let f = 1; f < floors; f++) {
        const band = toonMesh(
            new THREE.BoxGeometry(w + 0.2, 0.2, d + 0.2),
            SUKUMAR.mold
        );
        band.mesh.position.y = f * floorH;
        g.add(band.group);
        const dents = Math.min(8, Math.max(4, Math.floor(w / 1.1)));
        for (let i = 0; i < dents; i++) {
            const dx = -w / 2 + (i + 0.5) * (w / dents);
            const dent = toonMesh(
                new THREE.BoxGeometry(0.18, 0.14, 0.1),
                SUKUMAR.trim,
                { outline: false }
            );
            dent.mesh.position.set(dx, f * floorH + 0.14, d / 2 + 0.09);
            g.add(dent.group);
        }
    }

    // Roof parapet + posts + finials
    const parapet = toonMesh(new THREE.BoxGeometry(w + 0.42, 0.58, d + 0.42), SUKUMAR.trim);
    parapet.mesh.position.y = h + 0.3;
    g.add(parapet.group);
    const posts = Math.max(4, Math.floor(w / 1.6));
    for (let i = 0; i <= posts; i++) {
        const px = -w / 2 + (i / posts) * w;
        const p = toonMesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), SUKUMAR.rail, { outline: false });
        p.mesh.position.set(px, h + 0.76, d / 2 + 0.06);
        g.add(p.group);
        const ball = toonMesh(new THREE.SphereGeometry(0.07, 8, 8), SUKUMAR.trim, { outline: false });
        ball.mesh.position.set(px, h + 1.05, d / 2 + 0.06);
        g.add(ball.group);
    }

    // Cupola on corner / tall houses
    if (variant === 0 || (s % 5 === 0 && floors >= 3)) {
        const cup = toonMesh(new THREE.CylinderGeometry(0.55, 0.72, 0.95, 10), SUKUMAR.walls[0]);
        cup.mesh.position.set(w * 0.28, h + 0.98, d * 0.15);
        g.add(cup.group);
        const cupTop = toonMesh(new THREE.ConeGeometry(0.68, 0.48, 10), SUKUMAR.mold);
        cupTop.mesh.position.set(w * 0.28, h + 1.6, d * 0.15);
        g.add(cupTop.group);
    }

    if (variant === 0) {
        _sukumarCorner(g, w, h, d, s, floorH, floors);
    } else if (variant === 1) {
        _sukumarPilasters(g, w, h, d, s, floorH, floors);
    } else if (variant === 2) {
        _sukumarMural(g, w, h, d, s, floorH, floors);
    } else if (variant === 3) {
        _sukumarArched(g, w, h, d, s, floorH, floors);
    } else {
        _sukumarGallery(g, w, h, d, s, floorH, floors);
    }

    _sukumarWindows(g, w, h, d, s, floorH, floors, variant);

    // Entrance plinth + steps
    const plinth = toonMesh(new THREE.BoxGeometry(w + 0.42, 0.48, 0.75), SUKUMAR.plinth);
    plinth.mesh.position.set(0, 0.24, d / 2 + 0.32);
    g.add(plinth.group);
    if (variant === 0 || s % 3 === 0) {
        for (let i = 0; i < 3; i++) {
            const step = toonMesh(
                new THREE.BoxGeometry(1.55 - i * 0.16, 0.15, 0.44),
                SUKUMAR.step,
                { outline: false }
            );
            step.mesh.position.set(0, 0.09 + i * 0.15, d / 2 + 0.58 + i * 0.16);
            g.add(step.group);
        }
    }

    if (s % 2 === 0) {
        const ac = toonMesh(new THREE.BoxGeometry(0.72, 0.42, 0.36), SUKUMAR.ac, { outline: false });
        ac.mesh.position.set(w / 2 - 0.5, floorH + 1.2, d / 2 + 0.22);
        g.add(ac.group);
    }

    // Wall lamp + hanging rope + balcony pots
    if (s % 3 !== 2) {
        const lampBody = toonMesh(new THREE.BoxGeometry(0.16, 0.26, 0.16), 0x5a5048, { outline: false });
        lampBody.mesh.position.set(-w * 0.35, floorH * 0.88, d / 2 + 0.2);
        g.add(lampBody.group);
        const glow = toonMesh(
            new THREE.SphereGeometry(0.13, 10, 10),
            0xffe0a0,
            { emissive: 0xffc870, emissiveIntensity: 0.22, outline: false }
        );
        glow.mesh.position.set(-w * 0.35, floorH * 0.88 - 0.22, d / 2 + 0.22);
        glow.mesh.userData.cityLight = 'lampGlow';
        if (glow.mesh.material) glow.mesh.material.userData = { cityLight: 'lampGlow' };
        g.add(glow.group);
    }

    if (s % 2 === 0) {
        const rope = toonMesh(
            new THREE.CylinderGeometry(0.028, 0.028, w * 0.88, 6),
            0x9a8a78,
            { outline: false }
        );
        rope.mesh.rotation.z = Math.PI / 2;
        rope.mesh.rotation.x = 0.06;
        rope.mesh.position.set(0, h * 0.74, d / 2 + 0.36);
        g.add(rope.group);
    }

    if (variant === 0 || variant === 4 || s % 3 === 0) {
        for (let i = 0; i < 2; i++) {
            const pot = toonMesh(
                new THREE.CylinderGeometry(0.13, 0.11, 0.2, 8),
                0xb07050,
                { outline: false }
            );
            pot.mesh.position.set(-w * 0.28 + i * w * 0.56, floorH + 0.28, d / 2 + 0.58);
            g.add(pot.group);
            const leaf = toonMesh(
                new THREE.SphereGeometry(0.17, 8, 6),
                0x3d8a40,
                { outline: false }
            );
            leaf.mesh.position.set(-w * 0.28 + i * w * 0.56, floorH + 0.46, d / 2 + 0.58);
            g.add(leaf.group);
        }
    }

    return g;
}

function _sukumarWindows(g, w, h, d, s, floorH, floors, variant) {
    const cols = Math.max(2, Math.min(4, Math.floor(w / 2.35)));
    for (let r = 0; r < floors; r++) {
        const wy = r * floorH + floorH * (r === 0 ? 0.55 : 0.45);
        if (wy >= h - 0.5) continue;
        for (let c = 0; c < cols; c++) {
            if (r === 0 && Math.abs(c - (cols - 1) / 2) < 0.6 && variant !== 2) continue;
            const wx = -w / 2 + (c + 0.5) * (w / cols);
            const shut = pick(SUKUMAR.shutter, s + r + c);

            // Arched heritage window head
            const arch = toonMesh(
                new THREE.BoxGeometry(1.1, 0.26, 0.09),
                SUKUMAR.mold,
                { outline: false }
            );
            arch.mesh.position.set(wx, wy + 0.74, d / 2 + 0.04);
            g.add(arch.group);
            const archRound = new THREE.Mesh(
                new THREE.CylinderGeometry(0.5, 0.5, 0.09, 12, 1, false, 0, Math.PI),
                toonMat(SUKUMAR.mold)
            );
            archRound.rotation.z = Math.PI / 2;
            archRound.rotation.y = Math.PI / 2;
            archRound.position.set(wx, wy + 0.88, d / 2 + 0.04);
            archRound.castShadow = false;
            g.add(archRound);

            const frame = toonMesh(new THREE.BoxGeometry(1.05, 1.35, 0.08), SUKUMAR.frame, { outline: false });
            frame.mesh.position.set(wx, wy, d / 2 + 0.03);
            g.add(frame.group);

            if ((s + c + r) % 3 === 0) {
                const pane = toonMesh(
                    new THREE.BoxGeometry(0.72, 0.95, 0.04),
                    0xffe8b0,
                    { emissive: 0xffc870, emissiveIntensity: 0.12, outline: false }
                );
                pane.mesh.position.set(wx, wy, d / 2 + 0.01);
                pane.mesh.userData.cityLight = 'window';
                if (pane.mesh.material) pane.mesh.material.userData = { cityLight: 'window' };
                g.add(pane.group);
            }

            const shL = toonMesh(new THREE.BoxGeometry(0.43, 1.2, 0.06), shut, { outline: false });
            shL.mesh.position.set(wx - 0.22, wy, d / 2 + 0.08);
            g.add(shL.group);
            const shR = toonMesh(new THREE.BoxGeometry(0.43, 1.2, 0.06), shut, { outline: false });
            shR.mesh.position.set(wx + 0.22, wy, d / 2 + 0.08);
            g.add(shR.group);

            // 3 louver lines per shutter (readable detail, not 10)
            for (let L = 0; L < 3; L++) {
                const ly = wy - 0.4 + L * 0.35;
                const louvL = toonMesh(
                    new THREE.BoxGeometry(0.38, 0.05, 0.03),
                    SUKUMAR.louv,
                    { outline: false }
                );
                louvL.mesh.position.set(wx - 0.22, ly, d / 2 + 0.12);
                g.add(louvL.group);
                const louvR = toonMesh(
                    new THREE.BoxGeometry(0.38, 0.05, 0.03),
                    SUKUMAR.louv,
                    { outline: false }
                );
                louvR.mesh.position.set(wx + 0.22, ly, d / 2 + 0.12);
                g.add(louvR.group);
            }

            if ((s + c + r) % 7 === 0) {
                const wood = toonMesh(new THREE.BoxGeometry(0.5, 1.15, 0.08), SUKUMAR.wood, { outline: false });
                wood.mesh.position.set(wx + 0.56, wy, d / 2 + 0.15);
                wood.mesh.rotation.y = 0.52;
                g.add(wood.group);
            }
        }
    }

    // Double door with panels
    if (variant !== 2) {
        const df = toonMesh(new THREE.BoxGeometry(1.42, 2.48, 0.08), SUKUMAR.mold);
        df.mesh.position.set(0, 1.3, d / 2 + 0.02);
        g.add(df.group);
        const doorL = toonMesh(new THREE.BoxGeometry(0.5, 2.18, 0.1), SUKUMAR.door, { outline: false });
        doorL.mesh.position.set(-0.28, 1.2, d / 2 + 0.08);
        g.add(doorL.group);
        const doorR = toonMesh(new THREE.BoxGeometry(0.5, 2.18, 0.1), SUKUMAR.door, { outline: false });
        doorR.mesh.position.set(0.28, 1.2, d / 2 + 0.08);
        g.add(doorR.group);
        for (const sx of [-0.28, 0.28]) {
            for (const py of [0.58, 1.48]) {
                const panel = toonMesh(
                    new THREE.BoxGeometry(0.34, 0.55, 0.04),
                    SUKUMAR.mold,
                    { outline: false }
                );
                panel.mesh.position.set(sx, py, d / 2 + 0.14);
                g.add(panel.group);
            }
        }
    }
}

/** Chamfered corner building with upper balcony (photo hero) */
function _sukumarCorner(g, w, h, d, s, floorH, floors) {
    // Chamfer cut suggestion: angled corner panel
    const chamfer = toonMesh(new THREE.BoxGeometry(1.6, h * 0.95, 1.6), pick(SUKUMAR.walls, s + 1));
    chamfer.mesh.position.set(w / 2 - 0.3, h * 0.48, d / 2 - 0.3);
    chamfer.mesh.rotation.y = Math.PI / 4;
    g.add(chamfer.group);

    // Corner balcony on 1st floor
    const balW = Math.min(w * 0.55, 4.5);
    const bal = toonMesh(new THREE.BoxGeometry(balW, 0.14, 1.2), SUKUMAR.rail);
    bal.mesh.position.set(0, floorH + 0.1, d / 2 + 0.65);
    g.add(bal.group);
    // Balcony posts + rail
    for (let i = 0; i <= 5; i++) {
        const px = -balW / 2 + (i / 5) * balW;
        const post = toonMesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), SUKUMAR.trim, { outline: false });
        post.mesh.position.set(px, floorH + 0.55, d / 2 + 1.15);
        g.add(post.group);
    }
    const topR = toonMesh(new THREE.BoxGeometry(balW, 0.1, 0.1), SUKUMAR.trim, { outline: false });
    topR.mesh.position.set(0, floorH + 0.95, d / 2 + 1.15);
    g.add(topR.group);

    // Decorative pilasters on front
    [-w * 0.35, w * 0.35].forEach(px => {
        const pil = toonMesh(new THREE.BoxGeometry(0.35, h * 0.9, 0.2), SUKUMAR.mold, { outline: false });
        pil.mesh.position.set(px, h * 0.45, d / 2 + 0.05);
        g.add(pil.group);
    });
}

/** Vertical pilasters + molded panels */
function _sukumarPilasters(g, w, h, d, s, floorH, floors) {
    const n = 3 + (s % 2);
    for (let i = 0; i < n; i++) {
        const px = -w / 2 + ((i + 0.5) / n) * w;
        const pil = toonMesh(new THREE.BoxGeometry(0.32, h * 0.92, 0.18), SUKUMAR.mold, { outline: false });
        pil.mesh.position.set(px, h * 0.46, d / 2 + 0.04);
        g.add(pil.group);
        // Capital
        const cap = toonMesh(new THREE.BoxGeometry(0.45, 0.2, 0.25), SUKUMAR.trim, { outline: false });
        cap.mesh.position.set(px, h * 0.9, d / 2 + 0.06);
        g.add(cap.group);
    }
    // Base molding
    const base = toonMesh(new THREE.BoxGeometry(w + 0.1, 0.35, 0.25), SUKUMAR.mold, { outline: false });
    base.mesh.position.set(0, 0.4, d / 2 + 0.08);
    g.add(base.group);
}

const _sukumarMuralCache = {};

function getSukumarMuralTexture(kind = 0) {
    if (_sukumarMuralCache[kind]) return _sukumarMuralCache[kind];

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Pure white colonial wall wash
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1024, 512);
    // Lower white band
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(0, 430, 1024, 82);

    ctx.strokeStyle = '#1a1a1a';
    ctx.fillStyle = '#1a1a1a';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (kind === 1) {
        // Telescope man + child (Abol Tabol vibe from street photo)
        ctx.lineWidth = 5;
        // Child left
        ctx.beginPath();
        ctx.arc(220, 200, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(220, 230);
        ctx.lineTo(220, 320);
        ctx.moveTo(220, 260);
        ctx.lineTo(170, 300);
        ctx.moveTo(220, 260);
        ctx.lineTo(270, 295);
        ctx.moveTo(220, 320);
        ctx.lineTo(190, 400);
        ctx.moveTo(220, 320);
        ctx.lineTo(255, 400);
        // Arm raised
        ctx.moveTo(220, 250);
        ctx.lineTo(250, 180);
        ctx.stroke();
        // Man with telescope
        ctx.beginPath();
        ctx.arc(620, 170, 38, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(620, 210);
        ctx.quadraticCurveTo(560, 280, 540, 420);
        ctx.moveTo(620, 210);
        ctx.quadraticCurveTo(700, 290, 740, 420);
        ctx.moveTo(620, 250);
        ctx.lineTo(760, 200);
        ctx.lineTo(820, 175); // telescope barrel
        ctx.lineTo(760, 185);
        ctx.stroke();
        // Telescope rings
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.arc(800, 178, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '26px "Times New Roman", serif';
        ctx.textAlign = 'left';
        ctx.fillText('আয় তোর মুঠো দেখি', 560, 470);
        ctx.fillText('আয় দেখি ফুটুক পারি', 560, 500);
    } else {
        // Goat-rooster + poem + tray man (images-11 style)
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.moveTo(180, 200);
        ctx.lineTo(140, 230);
        ctx.lineTo(160, 260);
        ctx.lineTo(200, 230);
        ctx.moveTo(185, 205);
        ctx.quadraticCurveTo(170, 150, 150, 140);
        ctx.moveTo(195, 210);
        ctx.quadraticCurveTo(185, 155, 170, 145);
        ctx.moveTo(200, 220);
        ctx.lineTo(220, 240);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(170, 218, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.moveTo(200, 230);
        ctx.quadraticCurveTo(240, 280, 290, 270);
        ctx.quadraticCurveTo(340, 250, 360, 180);
        ctx.quadraticCurveTo(330, 280, 300, 310);
        ctx.quadraticCurveTo(240, 340, 200, 290);
        ctx.lineTo(200, 230);
        ctx.moveTo(290, 270);
        ctx.quadraticCurveTo(360, 220, 370, 160);
        ctx.moveTo(300, 285);
        ctx.quadraticCurveTo(370, 260, 380, 200);
        ctx.moveTo(230, 315);
        ctx.lineTo(225, 370);
        ctx.lineTo(215, 380);
        ctx.moveTo(230, 315);
        ctx.lineTo(235, 375);
        ctx.moveTo(270, 305);
        ctx.lineTo(275, 365);
        ctx.lineTo(265, 375);
        ctx.moveTo(275, 365);
        ctx.lineTo(285, 370);
        ctx.stroke();

        ctx.fillStyle = '#1a1a1a';
        ctx.font = '28px "Times New Roman", "Courier New", serif';
        ctx.textAlign = 'center';
        ctx.fillText('"আমি অর্থাৎ শ্রী গোবিন্দ', 520, 180);
        ctx.fillText('বাবুয়াটি নই বাঁকা', 520, 230);
        ctx.fillText('বলি যা সব ভেবে বলি', 520, 280);
        ctx.fillText('কথা কইনে ফাঁকা"', 520, 330);

        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.arc(820, 200, 35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(820, 185, 38, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.lineWidth = 6;
        ctx.moveTo(790, 215);
        ctx.quadraticCurveTo(820, 215, 820, 222);
        ctx.quadraticCurveTo(820, 215, 850, 215);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(808, 195, 3, 0, Math.PI * 2);
        ctx.arc(832, 195, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.moveTo(795, 233);
        ctx.lineTo(750, 280);
        ctx.lineTo(750, 450);
        ctx.lineTo(890, 450);
        ctx.lineTo(890, 280);
        ctx.lineTo(845, 233);
        ctx.moveTo(805, 235);
        ctx.lineTo(820, 275);
        ctx.lineTo(835, 235);
        ctx.moveTo(820, 275);
        ctx.lineTo(815, 320);
        ctx.lineTo(820, 330);
        ctx.lineTo(825, 320);
        ctx.lineTo(820, 275);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(750, 280);
        ctx.lineTo(700, 320);
        ctx.lineTo(700, 270);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = '#eeeae2';
        ctx.rect(630, 240, 140, 30);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.lineWidth = 2;
        for (let i = 1; i <= 3; i++) {
            ctx.moveTo(630 + i * 35, 240);
            ctx.lineTo(630 + i * 35, 270);
        }
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.rect(800, 300, 40, 25);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1a1a1a';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('যত্র', 820, 318);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    _sukumarMuralCache[kind] = tex;
    return tex;
}

/** Mural wall — Sukumar Ray caricature vibe (black figures on white colonial wall) */
function _sukumarMural(g, w, h, d, s, floorH, floors) {
    const wash = toonMesh(
        new THREE.BoxGeometry(w * 0.95, h * 0.72, 0.06),
        0xffffff,
        { outline: false }
    );
    wash.mesh.position.set(0, h * 0.5, d / 2 + 0.04);
    g.add(wash.group);

    // Pure white lower wall band under murals
    const cream = toonMesh(
        new THREE.BoxGeometry(w * 0.95, h * 0.22, 0.08),
        0xffffff,
        { outline: false }
    );
    cream.mesh.position.set(0, h * 0.18, d / 2 + 0.05);
    g.add(cream.group);

    const tex = getSukumarMuralTexture(s % 2);
    const muralMat = new THREE.MeshToonMaterial({
        map: tex,
        gradientMap: getGradientMap(),
    });
    const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(w * 0.9, h * 0.62),
        muralMat
    );
    plate.position.set(0, h * 0.52, d / 2 + 0.075);
    g.add(plate);
}

/** Arched ground openings like heritage shop-houses */
function _sukumarArched(g, w, h, d, s, floorH, floors) {
    const arches = 2 + (s % 2);
    for (let i = 0; i < arches; i++) {
        const ax = -w / 2 + ((i + 0.5) / arches) * w;
        // Arch frame
        const frame = toonMesh(new THREE.BoxGeometry(1.5, 2.4, 0.12), SUKUMAR.mold, { outline: false });
        frame.mesh.position.set(ax, 1.35, d / 2 + 0.05);
        g.add(frame.group);
        // Arch top (half cylinder)
        const arch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.75, 0.75, 0.14, 12, 1, false, 0, Math.PI),
            toonMat(SUKUMAR.mold)
        );
        arch.rotation.z = Math.PI / 2;
        arch.rotation.y = Math.PI / 2;
        arch.position.set(ax, 2.55, d / 2 + 0.05);
        g.add(arch);
        // Dark opening
        const open = toonMesh(new THREE.BoxGeometry(1.1, 1.9, 0.08), SUKUMAR.open, { outline: false });
        open.mesh.position.set(ax, 1.15, d / 2 + 0.08);
        g.add(open.group);
    }
    // Upper string course
    const course = toonMesh(new THREE.BoxGeometry(w + 0.1, 0.2, 0.22), SUKUMAR.trim, { outline: false });
    course.mesh.position.set(0, floorH, d / 2 + 0.06);
    g.add(course.group);
}

/** Long gallery balcony across upper floor */
function _sukumarGallery(g, w, h, d, s, floorH, floors) {
    const bal = toonMesh(new THREE.BoxGeometry(w * 0.92, 0.12, 1.1), SUKUMAR.rail);
    bal.mesh.position.set(0, floorH + 0.08, d / 2 + 0.55);
    g.add(bal.group);
    const n = Math.max(5, Math.floor(w / 1.1));
    for (let i = 0; i <= n; i++) {
        const px = -w * 0.45 + (i / n) * w * 0.9;
        const post = toonMesh(new THREE.BoxGeometry(0.07, 0.8, 0.07), SUKUMAR.trim, { outline: false });
        post.mesh.position.set(px, floorH + 0.5, d / 2 + 1.0);
        g.add(post.group);
    }
    const rail = toonMesh(new THREE.BoxGeometry(w * 0.92, 0.08, 0.08), SUKUMAR.trim, { outline: false });
    rail.mesh.position.set(0, floorH + 0.88, d / 2 + 1.0);
    g.add(rail.group);
    // Ground rusticated panels
    for (let i = 0; i < 3; i++) {
        const panel = toonMesh(
            new THREE.BoxGeometry(w * 0.28, floorH * 0.7, 0.08),
            SUKUMAR.mold,
            { outline: false }
        );
        panel.mesh.position.set(-w * 0.3 + i * w * 0.3, floorH * 0.4, d / 2 + 0.04);
        g.add(panel.group);
    }
}

/** Thakur Colony — multi-storey ornate alley (photo 1) */
function _buildThakurBuilding(w, h, d, seed) {
    const s = Math.abs(Math.round(seed)) % 997;
    const g = new THREE.Group();
    const wallCol = pick(THAKUR.walls, s);
    const floors = Math.max(3, Math.floor(h / 3.0));
    const floorH = h / floors;

    // Main body
    const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallCol);
    body.mesh.position.y = h / 2;
    body.mesh.castShadow = true;
    body.mesh.receiveShadow = true;
    g.add(body.group);

    // Contrasting ground-floor shop band (red/cream corner shops in photo)
    const gCol = pick(THAKUR.ground, s + 2);
    const groundBand = toonMesh(new THREE.BoxGeometry(w + 0.08, floorH * 0.95, d + 0.08), gCol);
    groundBand.mesh.position.y = floorH * 0.48;
    g.add(groundBand.group);

    // Parapet
    const parapet = toonMesh(new THREE.BoxGeometry(w + 0.25, 0.4, d + 0.25), 0xb8a898);
    parapet.mesh.position.y = h + 0.2;
    g.add(parapet.group);

    // Floor cornice lines
    for (let f = 1; f < floors; f++) {
        const by = f * floorH;
        const cornice = toonMesh(
            new THREE.BoxGeometry(w + 0.12, 0.14, d + 0.12),
            0xc8b8a8,
            { outline: false }
        );
        cornice.mesh.position.y = by;
        g.add(cornice.group);
    }

    // Ground door with decorative frame (photo: ornate red doorway)
    const doorX = ((s % 3) - 1) * w * 0.22;
    if (s % 4 === 0) {
        // Ornate shop frame
        const frame = toonMesh(new THREE.BoxGeometry(1.4, 2.5, 0.12), 0xd8d0c8, { outline: false });
        frame.mesh.position.set(doorX, 1.25, d / 2 + 0.04);
        g.add(frame.group);
        const arch = toonMesh(new THREE.BoxGeometry(1.5, 0.25, 0.1), 0xc87860, { outline: false });
        arch.mesh.position.set(doorX, 2.45, d / 2 + 0.06);
        g.add(arch.group);
    }
    const door = toonMesh(new THREE.BoxGeometry(0.85, 2.05, 0.08), THAKUR.door, { outline: false });
    door.mesh.position.set(doorX, 1.05, d / 2 + 0.08);
    g.add(door.group);

    // Green / colored window shutters + glass
    const cols = Math.max(2, Math.floor(w / 2.2));
    for (let r = 1; r < floors; r++) {
        const wy = r * floorH + floorH * 0.4;
        if (wy >= h - 0.5) continue;
        for (let c = 0; c < cols; c++) {
            const wx = -w / 2 + (c + 0.5) * (w / cols);
            const shut = pick(THAKUR.shutter, s + r + c);

            const frame = toonMesh(new THREE.BoxGeometry(1.15, 1.25, 0.08), 0x2a3038, { outline: false });
            frame.mesh.position.set(wx, wy, d / 2 + 0.03);
            g.add(frame.group);

            const glass = new THREE.Mesh(
                new THREE.BoxGeometry(0.9, 1.0, 0.05),
                toonMat(0x6ab0c0, {
                    transparent: true, opacity: 0.6,
                    emissive: 0xffe8b0, emissiveIntensity: 0,
                })
            );
            glass.position.set(wx, wy, d / 2 + 0.05);
            glass.userData.cityLight = 'window';
            glass.userData.litAtNight = ((s + r + c) % 5) !== 0;
            glass.material.userData.cityLight = 'window';
            g.add(glass);

            // Split shutters left/right (photo green casements)
            const shL = toonMesh(new THREE.BoxGeometry(0.28, 1.0, 0.05), shut, { outline: false });
            shL.mesh.position.set(wx - 0.38, wy, d / 2 + 0.07);
            g.add(shL.group);
            const shR = toonMesh(new THREE.BoxGeometry(0.28, 1.0, 0.05), shut, { outline: false });
            shR.mesh.position.set(wx + 0.38, wy, d / 2 + 0.07);
            g.add(shR.group);
        }
    }

    // Ornate balconies with lattice rails (photo signature)
    for (let r = 1; r < Math.min(floors, 5); r++) {
        if ((s + r) % 3 === 2) continue;
        const by = r * floorH + 0.15;
        const bw = Math.min(w * 0.7, 5.0);
        const bx = ((s + r) % 2 === 0 ? -0.15 : 0.15) * w;

        // Floor slab
        const slab = toonMesh(new THREE.BoxGeometry(bw, 0.14, 1.15), THAKUR.balcony);
        slab.mesh.position.set(bx, by, d / 2 + 0.6);
        slab.mesh.castShadow = true;
        g.add(slab.group);

        // Front lattice rail (barred balcony look)
        const railH = 0.75;
        const posts = 6;
        for (let p = 0; p <= posts; p++) {
            const px = bx - bw / 2 + (p / posts) * bw;
            const post = toonMesh(new THREE.BoxGeometry(0.05, railH, 0.05), THAKUR.lattice, { outline: false });
            post.mesh.position.set(px, by + railH / 2, d / 2 + 1.1);
            g.add(post.group);
        }
        // Horizontal bars
        for (let b = 0; b < 3; b++) {
            const bar = toonMesh(new THREE.BoxGeometry(bw, 0.04, 0.04), THAKUR.rail, { outline: false });
            bar.mesh.position.set(bx, by + 0.2 + b * 0.22, d / 2 + 1.1);
            g.add(bar.group);
        }
        // Side rails
        [-1, 1].forEach(side => {
            const sideR = toonMesh(new THREE.BoxGeometry(0.05, railH, 1.0), THAKUR.rail, { outline: false });
            sideR.mesh.position.set(bx + side * bw / 2, by + railH / 2, d / 2 + 0.65);
            g.add(sideR.group);
        });
    }

    // AC outdoor units (photo left wall)
    const acCount = 1 + (s % 3);
    for (let i = 0; i < acCount; i++) {
        const ac = toonMesh(new THREE.BoxGeometry(0.85, 0.5, 0.4), THAKUR.ac, { outline: false });
        ac.mesh.position.set(
            -w / 2 + 0.55 + (i % 2) * 1.6,
            2.8 + i * 2.6,
            d / 2 + 0.28
        );
        g.add(ac.group);
        // Grill lines
        const grill = toonMesh(new THREE.BoxGeometry(0.7, 0.12, 0.05), 0x9aa0a8, { outline: false });
        grill.mesh.position.set(
            -w / 2 + 0.55 + (i % 2) * 1.6,
            2.8 + i * 2.6,
            d / 2 + 0.48
        );
        g.add(grill.group);
    }

    // Wall poster panel (photo: portrait poster near door)
    if (s % 3 === 1) {
        const poster = toonMesh(new THREE.BoxGeometry(0.7, 0.9, 0.04), 0xf0e8d8, { outline: false });
        poster.mesh.position.set(-doorX * 0.8, 1.4, d / 2 + 0.1);
        g.add(poster.group);
        const face = toonMesh(new THREE.BoxGeometry(0.45, 0.55, 0.03), 0xc8a888, { outline: false });
        face.mesh.position.set(-doorX * 0.8, 1.5, d / 2 + 0.13);
        g.add(face.group);
    }

    // Drainpipe
    const pipe = toonMesh(new THREE.BoxGeometry(0.08, h * 0.9, 0.08), 0x7a8088, { outline: false });
    pipe.mesh.position.set(w / 2 - 0.15, h * 0.45, d / 2 - 0.1);
    g.add(pipe.group);

    // Raised plinth
    const plinth = toonMesh(new THREE.BoxGeometry(w + 0.35, 0.4, 0.6), 0xc0b8ac, { outline: false });
    plinth.mesh.position.set(0, 0.2, d / 2 + 0.28);
    g.add(plinth.group);

    return g;
}

/** Bose Colony — low residential lane (photo 2) */
function _buildBoseBuilding(w, h, d, seed) {
    const s = Math.abs(Math.round(seed)) % 997;
    const g = new THREE.Group();
    const wallCol = pick(BOSE.walls, s);
    const floors = Math.max(1, Math.min(3, Math.floor(h / 2.9)));
    const floorH = h / Math.max(floors, 1);

    // Main body
    const body = toonMesh(new THREE.BoxGeometry(w, h, d), wallCol);
    body.mesh.position.y = h / 2;
    body.mesh.castShadow = true;
    body.mesh.receiveShadow = true;
    g.add(body.group);

    // Carved wooden eave / chhajja (photo left overhang)
    if (s % 2 === 0) {
        const eave = toonMesh(new THREE.BoxGeometry(w + 0.4, 0.18, 1.3), BOSE.eave);
        eave.mesh.position.set(0, h * 0.55, d / 2 + 0.55);
        eave.mesh.rotation.x = 0.12;
        g.add(eave.group);
        // Decorative underside beams
        for (let i = 0; i < 4; i++) {
            const beam = toonMesh(
                new THREE.BoxGeometry(0.1, 0.12, 1.0),
                BOSE.wood,
                { outline: false }
            );
            beam.mesh.position.set(-w / 2 + 0.5 + i * (w / 3.5), h * 0.52, d / 2 + 0.45);
            g.add(beam.group);
        }
    }

    // Tin / corrugated roof edge
    const tin = toonMesh(new THREE.BoxGeometry(w + 0.3, 0.12, d + 0.4), BOSE.tin);
    tin.mesh.position.y = h + 0.08;
    g.add(tin.group);
    // Ridge
    const ridge = toonMesh(new THREE.BoxGeometry(w * 0.3, 0.35, 0.2), BOSE.wood, { outline: false });
    ridge.mesh.position.set(0, h + 0.3, 0);
    g.add(ridge.group);

    // Dark shuttered shop / room fronts
    const shutW = w * 0.55;
    const shut = toonMesh(new THREE.BoxGeometry(shutW, 1.8, 0.1), BOSE.shutter, { outline: false });
    shut.mesh.position.set(-w * 0.1, 1.0, d / 2 + 0.04);
    g.add(shut.group);
    // Door
    const door = toonMesh(new THREE.BoxGeometry(0.75, 1.9, 0.08), 0x3a3028, { outline: false });
    door.mesh.position.set(w * 0.28, 0.95, d / 2 + 0.05);
    g.add(door.group);

    // Upper windows (if multi-floor)
    if (floors >= 2) {
        const cols = Math.max(1, Math.floor(w / 2.5));
        for (let c = 0; c < cols; c++) {
            const wx = -w / 2 + (c + 0.5) * (w / cols);
            const wy = floorH + floorH * 0.4;
            const frame = toonMesh(new THREE.BoxGeometry(1.0, 1.1, 0.07), 0x2a3038, { outline: false });
            frame.mesh.position.set(wx, wy, d / 2 + 0.03);
            g.add(frame.group);
            const glass = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.9, 0.04),
                toonMat(0x6ab0c0, {
                    transparent: true, opacity: 0.55,
                    emissive: 0xffe0a0, emissiveIntensity: 0,
                })
            );
            glass.position.set(wx, wy, d / 2 + 0.05);
            glass.userData.cityLight = 'window';
            glass.userData.litAtNight = true;
            glass.material.userData.cityLight = 'window';
            g.add(glass);
        }
    }

    // Laundry on façade / roof edge (photo)
    if (s % 2 === 0) {
        const clothes = [0xf2b0c5, 0x48d2c9, 0xf8f0e8, 0xf5c842, 0xd08080];
        for (let i = 0; i < 4; i++) {
            const cloth = toonMesh(
                new THREE.BoxGeometry(0.45 + (i % 2) * 0.15, 0.7 + (i % 3) * 0.1, 0.04),
                clothes[i % clothes.length],
                { outline: false }
            );
            cloth.mesh.position.set(
                -w / 2 + 0.6 + i * 0.55,
                1.6 + (i % 2) * 0.3,
                d / 2 + 0.2
            );
            cloth.mesh.rotation.z = (i - 1.5) * 0.06;
            g.add(cloth.group);
        }
    }

    // Sitting plinth / ghat-style raised seat along street (photo left)
    const seat = toonMesh(new THREE.BoxGeometry(w * 0.7, 0.55, 0.85), BOSE.plinth);
    seat.mesh.position.set(-w * 0.1, 0.28, d / 2 + 0.5);
    seat.mesh.castShadow = true;
    g.add(seat.group);
    // Step
    const step = toonMesh(new THREE.BoxGeometry(w * 0.5, 0.22, 0.4), 0xb8a898, { outline: false });
    step.mesh.position.set(-w * 0.1, 0.11, d / 2 + 0.95);
    g.add(step.group);

    // Metal window grills on upper (photo mid buildings)
    if (s % 3 === 1 && floors >= 2) {
        const grill = toonMesh(new THREE.BoxGeometry(w * 0.6, 1.0, 0.06), 0x3a4850, { outline: false });
        grill.mesh.position.set(0, floorH + 0.9, d / 2 + 0.08);
        g.add(grill.group);
        for (let i = 0; i < 5; i++) {
            const bar = toonMesh(new THREE.BoxGeometry(0.04, 0.9, 0.04), 0x5a6870, { outline: false });
            bar.mesh.position.set(-w * 0.25 + i * 0.22, floorH + 0.9, d / 2 + 0.12);
            g.add(bar.group);
        }
    }

    // Drainpipe
    const pipe = toonMesh(new THREE.BoxGeometry(0.07, h * 0.85, 0.07), 0x7a8088, { outline: false });
    pipe.mesh.position.set(w / 2 - 0.12, h * 0.42, d / 2 - 0.08);
    g.add(pipe.group);

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

// ─── Mahapalika Bhavan (BMC-inspired Indo-Gothic civic landmark) ───────────
// Single monumental city hall — sandstone stripes, gothic windows, ribbed dome.
// Scaled for the anime town (~0.42 of the full architectural study model).

const BMC = {
    stoneBase: 0x937c68,
    stoneLight: 0xc2af9e,
    stoneDark: 0x6e5948,
    dome: 0x8a715b,
    trim: 0xe2d6c7,
    roofRed: 0xa64b39,
    gold: 0xcca662,
    window: 0x1a2128,
    sign: 0x1e3d7b,
    hedge: 0x4a9a58,
    plinth: 0x4a5058,
    step: 0xdcdde1,
};

function _bmcMat(hex, opts = {}) {
    return toonMat(hex, opts);
}

function _bmcStripedWall(w, h, d) {
    const g = new THREE.Group();
    const stripeH = 0.85;
    const layers = Math.ceil(h / stripeH);
    const mats = [
        _bmcMat(BMC.stoneLight),
        _bmcMat(BMC.stoneDark),
        _bmcMat(BMC.stoneBase),
    ];
    for (let i = 0; i < layers; i++) {
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(w, stripeH, d),
            mats[i % 3]
        );
        box.position.y = i * stripeH + stripeH / 2;
        box.castShadow = true;
        box.receiveShadow = true;
        g.add(box);
    }
    return g;
}

function _bmcDome(radius, height, segments = 28) {
    const points = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = t * height;
        let r;
        if (t < 0.22) {
            r = radius * (1.0 + Math.sin((t / 0.22) * Math.PI * 0.5) * 0.12);
        } else if (t < 0.72) {
            const nt = (t - 0.22) / 0.5;
            r = radius * 1.12 * Math.cos(nt * Math.PI * 0.45);
        } else {
            const nt = (t - 0.72) / 0.28;
            r = radius * 0.38 * Math.pow(1.0 - nt, 2.0);
        }
        points.push(new THREE.Vector2(Math.max(0.05, r), y));
    }
    const domeGeo = new THREE.LatheGeometry(points, segments);
    const group = new THREE.Group();
    const domeMesh = new THREE.Mesh(domeGeo, _bmcMat(BMC.dome));
    domeMesh.castShadow = true;
    group.add(domeMesh);

    // Cream ribs
    const ribCount = 12;
    for (let i = 0; i < ribCount; i++) {
        const angle = (i / ribCount) * Math.PI * 2;
        const ribPts = points.map(p => new THREE.Vector3(
            Math.sin(angle) * p.x * 1.01,
            p.y,
            Math.cos(angle) * p.x * 1.01
        ));
        const curve = new THREE.CatmullRomCurve3(ribPts);
        const tube = new THREE.Mesh(
            new THREE.TubeGeometry(curve, 20, 0.07, 5, false),
            _bmcMat(BMC.trim)
        );
        group.add(tube);
    }

    // Gold spire + finial
    const gold = _bmcMat(BMC.gold, { emissive: BMC.gold, emissiveIntensity: 0.15 });
    const ball = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.16, 10, 10), gold);
    ball.position.y = height;
    group.add(ball);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.08, height * 0.45, 8), gold);
    cone.position.y = height + height * 0.22;
    group.add(cone);
    const cross = new THREE.Mesh(new THREE.BoxGeometry(0.12, height * 0.22, 0.12), gold);
    cross.position.y = height + height * 0.5;
    group.add(cross);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.28, 0.1, 0.1), gold);
    bar.position.y = height + height * 0.48;
    group.add(bar);

    return group;
}

function _bmcGothicWindow(parent, x, y, z, w, h, d, rotY = 0) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), _bmcMat(BMC.stoneDark));
    g.add(frame);
    const arch = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.5, w * 0.5, d, 12, 1, false, 0, Math.PI),
        _bmcMat(BMC.stoneDark)
    );
    arch.rotation.z = Math.PI / 2;
    arch.rotation.y = Math.PI / 2;
    arch.position.y = h / 2;
    g.add(arch);

    const glassMat = toonMat(BMC.window, {
        emissive: 0xffbb66,
        emissiveIntensity: 0,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, h * 0.82, d * 1.05), glassMat);
    glass.position.y = -h * 0.05;
    glass.userData.cityLight = 'window';
    glass.userData.litAtNight = true;
    glassMat.userData.cityLight = 'window';
    g.add(glass);

    const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, d + 0.08), _bmcMat(BMC.trim));
    leftTrim.position.set(-w / 2 - 0.08, 0, 0);
    g.add(leftTrim);
    const rightTrim = leftTrim.clone();
    rightTrim.position.x = w / 2 + 0.08;
    g.add(rightTrim);

    const outerArch = new THREE.Mesh(
        new THREE.CylinderGeometry(w * 0.58, w * 0.58, d + 0.1, 12, 1, false, 0, Math.PI),
        _bmcMat(BMC.trim)
    );
    outerArch.rotation.z = Math.PI / 2;
    outerArch.rotation.y = Math.PI / 2;
    outerArch.position.y = h / 2;
    g.add(outerArch);

    g.position.set(x, y, z);
    g.rotation.y = rotY;
    parent.add(g);
}

function _bmcBalcony(w, d) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), _bmcMat(BMC.stoneLight)));
    const posts = 7;
    const railH = 0.9;
    for (let i = 0; i <= posts; i++) {
        const t = -w / 2 + (i / posts) * w;
        const post = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07, 0.07, railH, 6),
            _bmcMat(BMC.trim)
        );
        post.position.set(t, railH / 2 + 0.18, d / 2 - 0.1);
        g.add(post);
    }
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, 0.12), _bmcMat(BMC.trim));
    topRail.position.set(0, railH + 0.18, d / 2 - 0.1);
    g.add(topRail);
    return g;
}

function _bmcClock(parent, tx, ty, tz, rotY) {
    const cg = new THREE.Group();
    cg.add(new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.32, 6, 24), _bmcMat(BMC.trim)));
    const face = new THREE.Mesh(
        new THREE.CylinderGeometry(2.35, 2.35, 0.18, 20),
        _bmcMat(BMC.stoneDark)
    );
    face.rotation.x = Math.PI / 2;
    cg.add(face);
    const gold = _bmcMat(BMC.gold, { emissive: BMC.gold, emissiveIntensity: 0.12 });
    const hour = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), gold);
    hour.position.y = 0.5;
    cg.add(hour);
    const min = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.1), gold);
    min.position.y = 0.85;
    min.rotation.z = -Math.PI / 3;
    cg.add(min);
    cg.position.set(tx, ty, tz);
    cg.rotation.y = rotY;
    parent.add(cg);
}

function _bmcWing(w, h, d, x, isLeft) {
    const g = new THREE.Group();
    g.add(_bmcStripedWall(w, h, d));

    const cols = 4;
    for (let c = 0; c < cols; c++) {
        const wx = -w / 2 + (c + 0.5) * (w / cols);
        _bmcGothicWindow(g, wx, h * 0.28, d / 2 + 0.08, 1.7, 3.8, 0.5);
        _bmcGothicWindow(g, wx, h * 0.68, d / 2 + 0.08, 1.7, 3.8, 0.5);
        const dormer = new THREE.Mesh(
            new THREE.ConeGeometry(1.6, 4, 4),
            _bmcMat(BMC.roofRed)
        );
        dormer.rotation.y = Math.PI / 4;
        dormer.position.set(wx, h + 2.0, d / 2 - 0.15);
        g.add(dormer);
    }

    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.5, 1.6, d + 0.5),
        _bmcMat(BMC.roofRed)
    );
    roof.position.y = h + 0.85;
    g.add(roof);

    // Outer corner tower + small dome
    const tw = 6.5;
    const th = h + 10;
    const twX = isLeft ? -w / 2 : w / 2;
    const wingTower = _bmcStripedWall(tw, th, d + 0.8);
    wingTower.position.set(twX, 0, 0);
    g.add(wingTower);
    const wingDome = _bmcDome(tw * 0.48, 7.5, 20);
    wingDome.position.set(twX, th, 0);
    g.add(wingDome);

    g.position.set(x, 0, -1.5);
    return g;
}

/**
 * Mahapalika Bhavan — single Indo-Gothic civic landmark for the city.
 * Front faces +Z (street). Dimensions roughly 38×32×~55 (scaled).
 */
export function buildMahapalikaBhavan() {
    const root = new THREE.Group();
    root.name = 'MahapalikaBhavan';

    // Scale whole composition to fit the city
    const S = 0.42;
    const bmc = new THREE.Group();

    const towerW = 20, towerD = 20, towerH = 74;
    const central = _bmcStripedWall(towerW, towerH, towerD);
    bmc.add(central);

    // Floor bands
    const floorCount = 5;
    for (let i = 1; i <= floorCount; i++) {
        const fy = (towerH / floorCount) * i;
        const band = new THREE.Mesh(
            new THREE.BoxGeometry(towerW + 1.0, 0.9, towerD + 1.0),
            _bmcMat(BMC.trim)
        );
        band.position.y = fy;
        central.add(band);
    }

    // Windows + balconies on front face
    for (let f = 0; f < floorCount; f++) {
        const fy = (towerH / floorCount) * (f + 0.5);
        _bmcGothicWindow(central, -5, fy, towerD / 2 + 0.08, 2.2, 4.5, 0.55);
        _bmcGothicWindow(central, 0, fy, towerD / 2 + 0.08, 2.2, 4.5, 0.55);
        _bmcGothicWindow(central, 5, fy, towerD / 2 + 0.08, 2.2, 4.5, 0.55);
        if (f === 1 || f === 3) {
            const bal = _bmcBalcony(14, 2.0);
            bal.position.set(0, fy - 2.5, towerD / 2 + 0.9);
            central.add(bal);
        }
    }

    // Four clock faces
    _bmcClock(central, 0, towerH - 8, towerD / 2 + 0.15, 0);
    _bmcClock(central, 0, towerH - 8, -towerD / 2 - 0.15, Math.PI);
    _bmcClock(central, towerW / 2 + 0.15, towerH - 8, 0, Math.PI / 2);
    _bmcClock(central, -towerW / 2 - 0.15, towerH - 8, 0, -Math.PI / 2);

    // Corner spirelets
    [
        [towerW / 2, towerD / 2],
        [towerW / 2, -towerD / 2],
        [-towerW / 2, towerD / 2],
        [-towerW / 2, -towerD / 2],
    ].forEach(([cx, cz]) => {
        const mid = new THREE.Mesh(
            new THREE.CylinderGeometry(0.35, 0.55, 12, 8),
            _bmcMat(BMC.trim)
        );
        mid.position.set(cx * 1.02, towerH * 0.58, cz * 1.02);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.5, 8), _bmcMat(BMC.gold));
        cap.position.set(cx * 1.02, towerH * 0.58 + 7.5, cz * 1.02);
        central.add(mid);
        central.add(cap);
    });

    // Drum + main dome
    const drumH = 12;
    const drum = new THREE.Mesh(
        new THREE.CylinderGeometry(towerW * 0.48, towerW * 0.48, drumH, 20),
        _bmcMat(BMC.stoneBase)
    );
    drum.position.y = towerH + drumH / 2;
    drum.castShadow = true;
    bmc.add(drum);

    for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 2;
        const dx = Math.sin(ang) * towerW * 0.49;
        const dz = Math.cos(ang) * towerW * 0.49;
        const niche = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5.2, 0.5), _bmcMat(BMC.stoneLight));
        niche.position.set(dx, towerH + drumH / 2, dz);
        niche.lookAt(0, towerH + drumH / 2, 0);
        bmc.add(niche);
    }

    const mainDome = _bmcDome(towerW * 0.48, 24, 28);
    mainDome.position.set(0, towerH + drumH, 0);
    bmc.add(mainDome);

    // Blue civic signboard
    const sign = new THREE.Mesh(new THREE.BoxGeometry(14, 2.1, 0.5), _bmcMat(BMC.sign));
    sign.position.set(0, 22, towerD / 2 + 0.7);
    bmc.add(sign);
    const textBar = new THREE.Mesh(new THREE.BoxGeometry(12, 0.55, 0.55), _bmcMat(0xf8f8f0));
    textBar.position.set(0, 22, towerD / 2 + 0.72);
    bmc.add(textBar);

    // Wings
    const wingW = 30, wingH = 38, wingD = 16;
    bmc.add(_bmcWing(wingW, wingH, wingD, -towerW / 2 - wingW / 2, true));
    bmc.add(_bmcWing(wingW, wingH, wingD, towerW / 2 + wingW / 2, false));

    // Exhibition plinth + steps
    const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(100, 2.6, 42),
        _bmcMat(BMC.plinth)
    );
    plinth.position.set(0, 1.3, 5);
    plinth.receiveShadow = true;
    bmc.add(plinth);

    for (let i = 0; i < 4; i++) {
        const step = new THREE.Mesh(
            new THREE.BoxGeometry(20 - i * 1.0, 0.35, 5 - i * 0.7),
            _bmcMat(BMC.step)
        );
        step.position.set(0, 2.7 + i * 0.35, towerD / 2 + 2.4 + i * 0.35);
        step.receiveShadow = true;
        bmc.add(step);
    }

    // Pedestal + statue silhouette (front plaza)
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 3.2, 10), _bmcMat(BMC.stoneDark));
    ped.position.set(0, 1.6 + 2.6, towerD / 2 + 14);
    bmc.add(ped);
    const statue = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.85, 4.2, 8),
        _bmcMat(0x2a2e34)
    );
    statue.position.set(0, 2.6 + 3.2 + 2.1, towerD / 2 + 14);
    bmc.add(statue);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), _bmcMat(0x2a2e34));
    head.position.set(0, 2.6 + 3.2 + 4.4, towerD / 2 + 14);
    bmc.add(head);

    // Side hedges
    const hedgeL = new THREE.Mesh(new THREE.BoxGeometry(26, 1.2, 3.2), _bmcMat(BMC.hedge));
    hedgeL.position.set(-30, 3.2, 18);
    bmc.add(hedgeL);
    const hedgeR = hedgeL.clone();
    hedgeR.position.x = 30;
    bmc.add(hedgeR);

    bmc.scale.setScalar(S);
    root.add(bmc);

    // Approx footprint for colliders (scaled)
    root.userData.collider = {
        w: 100 * S,
        d: 50 * S,
        h: (towerH + drumH + 28) * S,
    };
    return root;
}