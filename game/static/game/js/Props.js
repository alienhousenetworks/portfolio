import * as THREE from 'three';
import { PALETTE } from './config.js';
import { toonMesh, toonMat, INK } from './ToonStyle.js';

export function createStreetLamp(isMonochrome = false) {
    const g = new THREE.Group();
    g.userData.isStreetLamp = true;
    const pole = toonMesh(new THREE.BoxGeometry(0.1, 4.2, 0.1), PALETTE.pole);
    pole.mesh.position.y = 2.1;
    g.add(pole.group);
    const arm = toonMesh(new THREE.BoxGeometry(0.8, 0.08, 0.08), PALETTE.pole);
    arm.mesh.position.set(0.35, 4, 0);
    g.add(arm.group);
    const bulbColor = isMonochrome ? 0xeeeeee : PALETTE.yellow;
    const bulb = toonMesh(new THREE.BoxGeometry(0.35, 0.25, 0.35), bulbColor, {
        emissive: bulbColor, emissiveIntensity: 0.2,
    });
    bulb.mesh.position.set(0.7, 3.85, 0);
    bulb.mesh.userData.cityLight = 'lamp';
    bulb.mesh.userData.litAtNight = true;
    if (bulb.mesh.material) bulb.mesh.material.userData.cityLight = 'lamp';
    g.add(bulb.group);

    // Soft cone glow (emissive sphere) — brightens strongly at night
    const glowColor = isMonochrome ? 0xffffff : 0xffe8a0;
    const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 8, 6),
        new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.12,
            depthWrite: false,
        })
    );
    glow.position.set(0.7, 3.85, 0);
    glow.userData.cityLight = 'lampGlow';
    glow.userData.litAtNight = true;
    g.add(glow);

    return g;
}

export function createBridgeLamp() {
    const g = new THREE.Group();
    const pole = toonMesh(new THREE.BoxGeometry(0.12, 3.5, 0.12), PALETTE.bridgeRail);
    pole.mesh.position.y = 1.75;
    g.add(pole.group);
    const orb = toonMesh(new THREE.SphereGeometry(0.22, 8, 8), PALETTE.yellow, { emissive: PALETTE.yellow, emissiveIntensity: 0.25 });
    orb.mesh.position.y = 3.7;
    g.add(orb.group);
    return g;
}

export function createBench(isMonochrome = false) {
    const g = new THREE.Group();
    const seatColor = isMonochrome ? 0xcccccc : PALETTE.wood[1];
    const legColor = isMonochrome ? 0x888888 : PALETTE.wood[0];
    const seat = toonMesh(new THREE.BoxGeometry(2.2, 0.15, 0.65), seatColor);
    seat.mesh.position.y = 0.45;
    g.add(seat.group);
    [-0.85, 0.85].forEach(x => {
        const leg = toonMesh(new THREE.BoxGeometry(0.1, 0.45, 0.55), legColor);
        leg.mesh.position.set(x, 0.22, 0);
        g.add(leg.group);
    });
    return g;
}

export function createFlowerPot(seed = 0) {
    const g = new THREE.Group();
    // Clay pot
    const pot = toonMesh(new THREE.CylinderGeometry(0.35, 0.25, 0.5, 8), 0xb98a67);
    pot.mesh.position.y = 0.25;
    g.add(pot.group);

    // Green leafy base
    const foliage = toonMesh(new THREE.SphereGeometry(0.4, 8, 8), 0x5ab860);
    foliage.mesh.position.y = 0.55;
    foliage.mesh.scale.set(1.2, 0.8, 1.2);
    g.add(foliage.group);

    // Small individual colored flower petals
    const petalColors = [0xf8b0c0, 0xffd966, 0x8c7ceb, 0xd66565];
    const col = petalColors[seed % petalColors.length];
    for (let i = 0; i < 5; i++) {
        const petal = toonMesh(new THREE.SphereGeometry(0.12, 6, 6), col);
        const angle = (i / 5) * Math.PI * 2;
        petal.mesh.position.set(Math.cos(angle) * 0.26, 0.65 + (i % 2) * 0.06, Math.sin(angle) * 0.26);
        g.add(petal.group);
    }
    return g;
}

export function createMailbox() {
    const g = new THREE.Group();
    const box = toonMesh(new THREE.BoxGeometry(0.35, 0.5, 0.25), PALETTE.red);
    box.mesh.position.y = 0.7;
    g.add(box.group);
    const post = toonMesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), PALETTE.pole);
    post.mesh.position.y = 0.35;
    g.add(post.group);
    return g;
}

export function createBicycleParked() {
    const g = new THREE.Group();
    const frame = toonMesh(new THREE.BoxGeometry(0.06, 0.4, 0.5), PALETTE.pole);
    frame.mesh.position.set(0, 0.5, 0);
    frame.mesh.rotation.x = 0.35;
    g.add(frame.group);
    const wheel = new THREE.TorusGeometry(0.22, 0.03, 6, 10);
    [-0.2, 0.2].forEach(z => {
        const w = toonMesh(wheel, 0x3a3a40, { outline: false });
        w.mesh.rotation.y = Math.PI / 2;
        w.mesh.position.set(0, 0.22, z);
        g.add(w.group);
    });
    return g;
}

function blobMesh(radius, x, y, z, color) {
    const geo = new THREE.SphereGeometry(radius, 14, 14);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const nx = pos.getX(i);
        const ny = pos.getY(i);
        const nz = pos.getZ(i);
        const n = Math.sin(nx * 7) + Math.sin(ny * 6) + Math.sin(nz * 5);
        const s = 1 + n * 0.04;
        pos.setXYZ(i, nx * s, ny * s, nz * s);
    }
    geo.computeVertexNormals();
    const { group, mesh } = toonMesh(geo, color);
    group.position.set(x, y, z);
    return group;
}

function createTrunk(height = 6) {
    const geo = new THREE.CylinderGeometry(0.16, 0.26, height, 8);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        pos.setX(i, pos.getX(i) + Math.sin(y * 0.5) * 0.1);
    }
    geo.computeVertexNormals();
    const { group, mesh } = toonMesh(geo, PALETTE.wood[0]);
    mesh.position.y = height / 2;
    return group;
}

export function createOak(seed = 0, color = null) {
    const g = new THREE.Group();
    const leafColor = color ?? PALETTE.foliage[seed % PALETTE.foliage.length];
    g.add(createTrunk(6.0));
    
    g.add(blobMesh(2.4, 0, 6.5, 0, leafColor));
    g.add(blobMesh(2.0, -1.5, 5.0, 0, leafColor));
    g.add(blobMesh(2.0, 1.5, 5.0, 0, leafColor));
    g.add(blobMesh(1.7, 0, 8.2, 0, leafColor));
    return g;
}

export function createMaple(seed = 0, color = null) {
    const g = new THREE.Group();
    const leafColor = color ?? PALETTE.foliage[seed % PALETTE.foliage.length];
    g.add(createTrunk(4.5));
    
    g.add(blobMesh(2.3, 0, 5.0, 0, leafColor));
    g.add(blobMesh(2.0, -1.8, 5.0, 0, leafColor));
    g.add(blobMesh(2.0, 1.8, 5.0, 0, leafColor));
    g.add(blobMesh(2.0, 0, 6.8, 0, leafColor));
    g.add(blobMesh(1.7, 0, 3.2, 0, leafColor));
    return g;
}

export function createWideTree(seed = 0, color = null) {
    const g = new THREE.Group();
    const leafColor = color ?? PALETTE.foliage[seed % PALETTE.foliage.length];
    g.add(createTrunk(4.5));
    
    g.add(blobMesh(2.2, -2.5, 5.0, 0, leafColor));
    g.add(blobMesh(2.3, -1.2, 5.5, 0, leafColor));
    g.add(blobMesh(2.5, 0, 5.8, 0, leafColor));
    g.add(blobMesh(2.3, 1.2, 5.4, 0, leafColor));
    g.add(blobMesh(2.2, 2.5, 5.0, 0, leafColor));
    g.add(blobMesh(1.8, 0, 7.2, 0, leafColor));
    return g;
}

export function createYoungTree(seed = 0, color = null) {
    const g = new THREE.Group();
    const leafColor = color ?? PALETTE.foliage[seed % PALETTE.foliage.length];
    g.add(createTrunk(3.5));
    
    g.add(blobMesh(1.3, 0, 4.0, 0, leafColor));
    g.add(blobMesh(1.0, -0.8, 3.2, 0, leafColor));
    g.add(blobMesh(1.0, 0.8, 3.2, 0, leafColor));
    return g;
}

export function createFantasyTree(seed = 0, color = null) {
    const g = new THREE.Group();
    const leafColor = color ?? PALETTE.foliage[seed % PALETTE.foliage.length];
    g.add(createTrunk(6.0));
    
    g.add(blobMesh(2.1, 0, 7.5, 0, leafColor));
    g.add(blobMesh(2.0, -1.8, 6.0, 0, leafColor));
    g.add(blobMesh(2.0, 1.8, 6.0, 0, leafColor));
    g.add(blobMesh(2.0, -3.0, 4.5, 0, leafColor));
    g.add(blobMesh(2.0, 3.0, 4.5, 0, leafColor));
    g.add(blobMesh(2.0, 0, 5.0, 0, leafColor));
    g.add(blobMesh(1.5, 0, 9.2, 0, leafColor));
    return g;
}

export function createCherryTree() {
    return createOak(0, PALETTE.blossom);
}

export function createLargeTree(seed = 0) {
    const type = seed % 5;
    if (type === 0) return createOak(seed);
    if (type === 1) return createMaple(seed);
    if (type === 2) return createWideTree(seed);
    if (type === 3) return createYoungTree(seed);
    return createFantasyTree(seed);
}

export function createPineTree(seed = 0, height = 1.0) {
    const g = new THREE.Group();
    const h = 6 * height;
    const col = seed % 3 === 0 ? PALETTE.pineDark : PALETTE.pineGreen;
    g.add(createTrunk(h * 0.35));

    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
        const radius = (1.8 - i * 0.25) * height;
        const coneH = 2.0 * height;
        const { group, mesh } = toonMesh(new THREE.ConeGeometry(radius, coneH, 10), col);
        group.position.set(0, h * 0.25 + i * 1.0, 0);
        g.add(group);
    }
    return g;
}

export function createWillowTree(seed = 0) {
    return createFantasyTree(seed, PALETTE.willowGreen);
}

/**
 * Tall zelkova-style avenue tree — dense high canopy that arches over the road
 * (matches PHOTO tree-tunnel streets). `lean` tilts foliage toward the road center.
 * lean > 0 leans +X; lean < 0 leans -X. For N-S roads use lean on X; for E-W rotate group.
 */
export function createAvenueTree(seed = 0, lean = 0) {
    const g = new THREE.Group();
    const s = Math.abs(seed);
    const trunkH = 10.5 + (s % 5) * 0.45;
    const trunkR = 0.28 + (s % 3) * 0.04;
    const trunkCol = s % 2 === 0 ? 0x4a4038 : 0x5a5048;

    // Tall straight trunk with slight swell at base
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.72, trunkR * 1.35, trunkH, 8);
    const trunk = toonMesh(trunkGeo, trunkCol);
    trunk.mesh.position.y = trunkH / 2;
    trunk.mesh.castShadow = true;
    g.add(trunk.group);

    // Root flare
    const flare = toonMesh(new THREE.CylinderGeometry(trunkR * 1.5, trunkR * 2.1, 0.45, 8), trunkCol, { outline: false });
    flare.mesh.position.y = 0.2;
    g.add(flare.group);

    // Bright spring greens like the reference photo
    const greens = [0x5ab860, 0x6ec86a, 0x78cc68, 0x4aaa50, 0x8ad878, 0x62b858];
    const leafA = greens[s % greens.length];
    const leafB = greens[(s + 2) % greens.length];
    const leafC = greens[(s + 4) % greens.length];

    const canopyY = trunkH * 0.72;
    const leanAmt = lean * 1.15;

    // Dense high canopy — blobs that lean over the road for tunnel effect
    const blobs = [
        [0 + leanAmt * 0.3, canopyY + 1.8, 0, 2.6, leafA],
        [-1.6 + leanAmt * 0.5, canopyY + 0.6, 0.3, 2.3, leafB],
        [1.8 + leanAmt * 0.9, canopyY + 0.9, -0.2, 2.5, leafA],
        [0.2 + leanAmt * 0.4, canopyY + 3.2, 0.1, 2.0, leafC],
        [-2.2 + leanAmt * 0.35, canopyY - 0.4, -0.6, 1.9, leafB],
        [2.4 + leanAmt * 1.1, canopyY + 0.1, 0.5, 2.1, leafA],
        [leanAmt * 1.3, canopyY + 1.2, 1.4, 1.8, leafC],
        [leanAmt * 1.2, canopyY + 1.0, -1.5, 1.7, leafB],
        [leanAmt * 1.6, canopyY - 0.8, 0, 1.6, leafA], // droop toward road
    ];
    blobs.forEach(([x, y, z, r, col]) => {
        const b = blobMesh(r, x, y, z, col);
        b.traverse?.(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
        g.add(b);
    });

    // Slight overall scale variation
    const sc = 0.92 + (s % 7) * 0.025;
    g.scale.set(sc, sc, sc);
    return g;
}

/** Low trimmed hedge strip along avenue sidewalks (photo curb planting) */
export function createHedge(length = 4, seed = 0) {
    const g = new THREE.Group();
    const greens = [0x5a9e48, 0x68b050, 0x4e9040, 0x72b858];
    const col = greens[Math.abs(seed) % greens.length];
    const h = 0.55 + (Math.abs(seed) % 3) * 0.08;
    const body = toonMesh(new THREE.BoxGeometry(0.7, h, length), col, { outline: false });
    body.mesh.position.y = h / 2;
    body.mesh.castShadow = true;
    body.mesh.receiveShadow = true;
    g.add(body.group);
    // Soft top bumps
    for (let i = 0; i < 3; i++) {
        const bump = toonMesh(
            new THREE.SphereGeometry(0.28 + (seed + i) % 2 * 0.05, 6, 5),
            greens[(seed + i) % greens.length],
            { outline: false }
        );
        bump.mesh.position.set(((i - 1) * 0.12), h * 0.85, (i - 1) * (length * 0.28));
        bump.mesh.scale.set(1.1, 0.55, 1.0);
        g.add(bump.group);
    }
    return g;
}

/** Low courtyard / property wall behind avenue trees */
export function createLowWall(length = 8, seed = 0) {
    const g = new THREE.Group();
    const wallCol = seed % 2 === 0 ? 0xc8c4bc : 0xb8b4ac;
    const body = toonMesh(new THREE.BoxGeometry(0.35, 1.35, length), wallCol);
    body.mesh.position.y = 0.68;
    body.mesh.castShadow = true;
    g.add(body.group);
    const cap = toonMesh(new THREE.BoxGeometry(0.48, 0.12, length + 0.1), 0x8a8880, { outline: false });
    cap.mesh.position.y = 1.4;
    g.add(cap.group);
    return g;
}


/** Mountain rock cluster */
export function createRockCluster(seed = 0) {
    const g = new THREE.Group();
    const sizes = [
        [1.2, 0.9, 1.0], [0.8, 0.6, 0.7], [1.5, 1.1, 1.3], [0.6, 0.5, 0.6]
    ];
    const offsets = [[0, 0, 0], [1.2, 0, 0.5], [-0.8, 0, 0.8], [0.4, 0, -0.9]];
    const col = seed % 2 === 0 ? PALETTE.mountainRock : PALETTE.mountain[2];

    sizes.forEach(([rx, ry, rz], i) => {
        const [ox, oy, oz] = offsets[i];
        const rock = toonMesh(
            new THREE.DodecahedronGeometry(rx * 0.7, 0),
            col
        );
        rock.mesh.position.set(ox, ry * 0.4, oz);
        rock.mesh.scale.set(1, 0.65, 0.85);
        rock.mesh.rotation.y = (seed + i) * 0.9;
        rock.mesh.castShadow = true;
        rock.mesh.receiveShadow = true;
        g.add(rock.group);
    });
    return g;
}

export function createBambooCluster() {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
        const h = 4 + (i % 3) * 1.5;
        const stalk = toonMesh(new THREE.BoxGeometry(0.12, h, 0.12), 0x5a9450, { outline: false });
        stalk.mesh.position.set((i % 3) * 0.5 - 0.5, h / 2, Math.floor(i / 3) * 0.5);
        g.add(stalk.group);
    }
    return g;
}

export function createFountain() {
    const g = new THREE.Group();
    const base = toonMesh(new THREE.CylinderGeometry(2.5, 2.8, 0.5, 12), PALETTE.concrete);
    base.mesh.position.y = 0.25;
    base.mesh.receiveShadow = true;
    g.add(base.group);
    const pool = toonMesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 12), PALETTE.mint, { transparent: true, opacity: 0.85 });
    pool.mesh.position.y = 0.45;
    g.add(pool.group);
    const spout = toonMesh(new THREE.BoxGeometry(0.3, 1.2, 0.3), PALETTE.concreteLight);
    spout.mesh.position.y = 0.9;
    g.add(spout.group);
    // Water jet effect
    const jet = toonMesh(new THREE.CylinderGeometry(0.08, 0.18, 1.0, 6), PALETTE.riverShallow, { transparent: true, opacity: 0.7, outline: false });
    jet.mesh.position.y = 1.9;
    g.add(jet.group);
    return g;
}

export function createHangingSign(text, color = PALETTE.orange) {
    const g = new THREE.Group();
    const board = toonMesh(new THREE.BoxGeometry(2.2, 0.7, 0.12), color);
    board.mesh.position.y = 2.8;
    g.add(board.group);
    const bracket = toonMesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), PALETTE.pole, { outline: false });
    bracket.mesh.position.y = 3.2;
    g.add(bracket.group);
    return g;
}

export function createAirConditioner() {
    const g = new THREE.Group();
    const unit = toonMesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), 0xe8e6dd, { outline: false });
    g.add(unit.group);
    return g;
}

export function createRooftopTank() {
    const g = new THREE.Group();
    const tank = toonMesh(new THREE.CylinderGeometry(0.6, 0.6, 1.2, 8), PALETTE.concrete);
    tank.mesh.position.y = 0.6;
    g.add(tank.group);
    return g;
}

export function createLaundryLine() {
    const g = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({ color: INK });
    const pts = [new THREE.Vector3(-1.5, 1.2, 0), new THREE.Vector3(1.5, 1.2, 0)];
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    const cloth = toonMesh(new THREE.BoxGeometry(0.5, 0.35, 0.05), PALETTE.blue, { outline: false });
    cloth.mesh.position.set(-0.3, 1, 0);
    g.add(cloth.group);
    const cloth2 = cloth.group.clone();
    cloth2.position.set(0.5, 1, 0);
    g.add(cloth2);
    return g;
}

export function createCat() {
    const g = new THREE.Group();
    const body = toonMesh(new THREE.BoxGeometry(0.35, 0.25, 0.5), 0xf08b3a, { outline: false });
    body.mesh.position.y = 0.15;
    g.add(body.group);
    const head = toonMesh(new THREE.BoxGeometry(0.25, 0.22, 0.22), 0xf08b3a, { outline: false });
    head.mesh.position.set(0, 0.28, 0.28);
    g.add(head.group);
    return g;
}


export function createKeiTruck() {
    const g = new THREE.Group();
    
    // Wheels (4)
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.22, 12);
    const wheelMatColor = 0x222222;
    const wheelPositions = [
        [-0.6, 0.3, 0.9],
        [0.6, 0.3, 0.9],
        [-0.6, 0.3, -0.9],
        [0.6, 0.3, -0.9]
    ];
    wheelPositions.forEach(([wx, wy, wz]) => {
        const w = toonMesh(wheelGeo, wheelMatColor, { outline: false });
        w.mesh.rotation.z = Math.PI / 2;
        w.mesh.position.set(wx, wy, wz);
        g.add(w.group);
    });

    // Chassis / Base
    const chassis = toonMesh(new THREE.BoxGeometry(1.3, 0.15, 2.8), 0x333333);
    chassis.mesh.position.set(0, 0.4, 0);
    g.add(chassis.group);

    // Front Cabin (White)
    const cab = toonMesh(new THREE.BoxGeometry(1.3, 1.1, 0.9), 0xffffff);
    cab.mesh.position.set(0, 1.05, 0.9);
    g.add(cab.group);

    // Windshield (glass)
    const windshield = toonMesh(new THREE.BoxGeometry(1.22, 0.5, 0.05), PALETTE.glass);
    windshield.mesh.position.set(0, 1.25, 1.36);
    g.add(windshield.group);

    // Side windows (glass)
    [-0.66, 0.66].forEach(sx => {
        const swin = toonMesh(new THREE.BoxGeometry(0.05, 0.45, 0.5), PALETTE.glass);
        swin.mesh.position.set(sx, 1.2, 0.9);
        g.add(swin.group);
    });

    // Flatbed Back / Cargo Bed (Grey)
    const bed = toonMesh(new THREE.BoxGeometry(1.3, 0.4, 1.7), 0xdddddd);
    bed.mesh.position.set(0, 0.65, -0.45);
    g.add(bed.group);
    
    // Cargo bed rails/sides
    const leftRail = toonMesh(new THREE.BoxGeometry(0.05, 0.3, 1.7), 0xcccccc);
    leftRail.mesh.position.set(-0.625, 0.85, -0.45);
    g.add(leftRail.group);
    const rightRail = toonMesh(new THREE.BoxGeometry(0.05, 0.3, 1.7), 0xcccccc);
    rightRail.mesh.position.set(0.625, 0.85, -0.45);
    g.add(rightRail.group);
    const backRail = toonMesh(new THREE.BoxGeometry(1.3, 0.3, 0.05), 0xcccccc);
    backRail.mesh.position.set(0, 0.85, -1.325);
    g.add(backRail.group);

    // Headlights
    [-0.45, 0.45].forEach(sx => {
        const light = toonMesh(new THREE.BoxGeometry(0.18, 0.12, 0.05), 0xffecc0, { emissive: 0xffecc0, emissiveIntensity: 0.3, outline: false });
        light.mesh.position.set(sx, 0.75, 1.36);
        g.add(light.group);
    });

    // Bumper (Black)
    const bumper = toonMesh(new THREE.BoxGeometry(1.3, 0.18, 0.15), 0x1a1a1a);
    bumper.mesh.position.set(0, 0.45, 1.38);
    g.add(bumper.group);

    return g;
}

export function createConvexMirror() {
    const g = new THREE.Group();
    // Tall orange pole
    const pole = toonMesh(new THREE.CylinderGeometry(0.07, 0.07, 3.8, 8), 0xf26419);
    pole.mesh.position.y = 1.9;
    g.add(pole.group);

    // Mirror back (Orange bowl)
    const back = toonMesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 16), 0xf26419);
    back.mesh.rotation.x = Math.PI / 2;
    back.mesh.position.set(0, 3.4, 0.1);
    g.add(back.group);

    // Mirror face (Silver/glass)
    const face = toonMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16), PALETTE.glass, { outline: false });
    face.mesh.rotation.x = Math.PI / 2;
    face.mesh.position.set(0, 3.4, 0.18);
    g.add(face.group);

    // Hood/visor
    const visor = toonMesh(new THREE.BoxGeometry(0.9, 0.1, 0.25), 0xf26419);
    visor.mesh.position.set(0, 3.85, 0.18);
    g.add(visor.group);

    return g;
}

export function createGreenUtilityBox() {
    const g = new THREE.Group();
    // Concrete base
    const base = toonMesh(new THREE.BoxGeometry(0.8, 0.2, 0.8), 0xd0cdc7);
    base.mesh.position.y = 0.1;
    g.add(base.group);

    // Main cabinet (Green)
    const box = toonMesh(new THREE.BoxGeometry(0.7, 1.2, 0.7), 0x487955);
    box.mesh.position.y = 0.8;
    g.add(box.group);

    // Side vents details
    [-0.36, 0.36].forEach(sx => {
        const vent = toonMesh(new THREE.BoxGeometry(0.02, 0.5, 0.4), 0x385e42, { outline: false });
        vent.mesh.position.set(sx, 0.8, 0);
        g.add(vent.group);
    });

    // Front door seams/handle
    const seam = toonMesh(new THREE.BoxGeometry(0.02, 1.0, 0.02), INK, { outline: false });
    seam.mesh.position.set(0, 0.8, 0.36);
    g.add(seam.group);

    const handle = toonMesh(new THREE.BoxGeometry(0.04, 0.12, 0.04), 0xd0cdc7, { outline: false });
    handle.mesh.position.set(0.08, 0.8, 0.37);
    g.add(handle.group);

    return g;
}

export function createRecyclingBin() {
    const g = new THREE.Group();
    // Blue cylinder
    const body = toonMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12), 0x3d70b2);
    body.mesh.position.y = 0.45;
    g.add(body.group);

    // Lid (grey dome)
    const lid = toonMesh(new THREE.SphereGeometry(0.31, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0x555555);
    lid.mesh.position.y = 0.9;
    g.add(lid.group);

    // Discard holes (black cylinder)
    const hole = toonMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10), 0x111111, { outline: false });
    hole.mesh.rotation.x = Math.PI / 2;
    hole.mesh.position.set(0, 0.88, 0.2);
    g.add(hole.group);

    return g;
}

export function createDetailedVendingMachine(seed = 0) {
    const g = new THREE.Group();
    const color = PALETTE.vending[seed % PALETTE.vending.length];

    // Grey/concrete base pad
    const base = toonMesh(new THREE.BoxGeometry(1.05, 0.12, 0.85), 0xdddddd);
    base.mesh.position.y = 0.06;
    g.add(base.group);

    // Main cabinet body
    const body = toonMesh(new THREE.BoxGeometry(1.0, 2.1, 0.8), color);
    body.mesh.position.y = 1.11;
    g.add(body.group);

    // White/Light display area panel on front
    const panel = toonMesh(new THREE.BoxGeometry(0.85, 1.1, 0.04), 0xf5f5f5);
    panel.mesh.position.set(0, 1.45, 0.41);
    g.add(panel.group);

    // Inner window (glass)
    const glass = toonMesh(new THREE.BoxGeometry(0.8, 0.85, 0.02), PALETTE.glass, { transparent: true, opacity: 0.6 });
    glass.mesh.position.set(0, 1.55, 0.44);
    g.add(glass.group);

    // Inside shelves & cans (cylinders)
    const shelfY = [1.75, 1.45, 1.25];
    const canColors = [0xd66565, 0x4e90e8, 0x79b36a, 0xffd966, 0x8c7ceb];
    shelfY.forEach((sy, shIdx) => {
        // Shelf lines
        const shelfLine = toonMesh(new THREE.BoxGeometry(0.78, 0.02, 0.15), 0xcccccc, { outline: false });
        shelfLine.mesh.position.set(0, sy - 0.02, 0.35);
        g.add(shelfLine.group);

        // Row of cans (4 per shelf)
        for (let c = 0; c < 4; c++) {
            const canCol = canColors[(seed + shIdx * 3 + c) % canColors.length];
            const can = toonMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 6), canCol, { outline: false });
            can.mesh.position.set(-0.27 + c * 0.18, sy + 0.06, 0.36);
            g.add(can.group);
        }
    });

    // Delivery flap at bottom
    const delivery = toonMesh(new THREE.BoxGeometry(0.7, 0.3, 0.05), 0x2a2a2a);
    delivery.mesh.position.set(0, 0.4, 0.41);
    g.add(delivery.group);

    // Coin slot and return
    const coinSec = toonMesh(new THREE.BoxGeometry(0.12, 0.35, 0.04), 0x444444);
    coinSec.mesh.position.set(0.35, 0.75, 0.41);
    g.add(coinSec.group);

    const redLight = toonMesh(new THREE.BoxGeometry(0.04, 0.04, 0.02), 0xd66565, { emissive: 0xd66565, emissiveIntensity: 0.3, outline: false });
    redLight.mesh.position.set(0.35, 0.85, 0.44);
    g.add(redLight.group);

    // Add recycling bin next to it!
    const bin = createRecyclingBin();
    bin.position.set(0.8, 0, 0);
    g.add(bin);

    return g;
}

export function createStreetWall(length = 10, seed = 0) {
    const g = new THREE.Group();
    const wallCol = 0xDDD8CF; // warm grey/white

    // Main wall body
    const body = toonMesh(new THREE.BoxGeometry(0.5, 1.8, length), wallCol);
    body.mesh.position.y = 0.9;
    g.add(body.group);

    // Slate cap on top
    const cap = toonMesh(new THREE.BoxGeometry(0.65, 0.15, length + 0.15), 0x6c777b);
    cap.mesh.position.y = 1.8 + 0.075;
    g.add(cap.group);

    // Posts/Columns along the wall to break up repetition
    const postInterval = 3.3;
    const halfLen = length / 2;
    for (let z = -halfLen; z <= halfLen + 0.01; z += postInterval) {
        const post = toonMesh(new THREE.BoxGeometry(0.58, 1.9, 0.4), wallCol);
        post.mesh.position.set(0, 0.95, z);
        g.add(post.group);

        const postCap = toonMesh(new THREE.BoxGeometry(0.72, 0.15, 0.52), 0x6c777b);
        postCap.mesh.position.set(0, 1.9 + 0.075, z);
        g.add(postCap.group);
    }

    return g;
}

export function createDetailedUtilityPole(x = 0, z = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    
    // Main concrete pole
    const pole = toonMesh(new THREE.CylinderGeometry(0.12, 0.18, 7.5, 8), 0xa0a0a0);
    pole.mesh.position.y = 3.75;
    g.add(pole.group);

    // Crossbar 1 (Lower)
    const bar1 = toonMesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), 0x555555);
    bar1.mesh.position.set(0, 6.2, 0);
    g.add(bar1.group);

    // Crossbar 2 (Upper)
    const bar2 = toonMesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), 0x555555);
    bar2.mesh.position.set(0, 6.8, 0);
    g.add(bar2.group);

    // Transformer (Cylinder mounted on side)
    const trans = toonMesh(new THREE.CylinderGeometry(0.25, 0.25, 0.7, 8), 0x888888);
    trans.mesh.position.set(0.35, 5.5, 0);
    g.add(trans.group);

    // Bracket connecting transformer to pole
    const transBrac = toonMesh(new THREE.BoxGeometry(0.2, 0.08, 0.08), 0x444444, { outline: false });
    transBrac.mesh.position.set(0.18, 5.5, 0);
    g.add(transBrac.group);

    // Insulators (small white/porcelain cylinders on the crossbars)
    [-0.6, 0.6].forEach(offset => {
        const ins = toonMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6), 0xeeeeee, { outline: false });
        ins.mesh.position.set(offset, 6.3, 0);
        g.add(ins.group);
    });
    [-0.4, 0.4].forEach(offset => {
        const ins = toonMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6), 0xeeeeee, { outline: false });
        ins.mesh.position.set(offset, 6.9, 0);
        g.add(ins.group);
    });

    // Streetlamp extension arm
    const arm = toonMesh(new THREE.BoxGeometry(0.8, 0.06, 0.06), 0x444444);
    arm.mesh.position.set(-0.4, 4.5, 0);
    g.add(arm.group);

    const lamp = toonMesh(new THREE.BoxGeometry(0.25, 0.15, 0.2), 0xffd966, { emissive: 0xffd966, emissiveIntensity: 0.2 });
    lamp.mesh.position.set(-0.8, 4.4, 0);
    g.add(lamp.group);

    return g;
}

export function createCrosswalk(x, z, axis = 'x') {
    const g = new THREE.Group();
    g.position.set(x, 0.05, z);
    const stripeMat = toonMat(0xffffff);
    for (let i = 0; i < 5; i++) {
        const stripe = new THREE.Mesh(
            axis === 'x' ? new THREE.BoxGeometry(0.5, 0.04, 3.5) : new THREE.BoxGeometry(3.5, 0.04, 0.5),
            stripeMat
        );
        stripe.position.set(axis === 'x' ? -2 + i : 0, 0, axis === 'z' ? -2 + i : 0);
        stripe.receiveShadow = true;
        g.add(stripe);
    }
    return g;
}

export function createSidewalk(w, d) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), toonMat(PALETTE.sidewalk));
    mesh.receiveShadow = true;
    return mesh;
}

export function scatterStreetProps(scene, x, z, zone, seed, getHeight) {
    const g = new THREE.Group();
    const y = getHeight(x, z);
    g.position.set(x, y, z);

    const props = [];
    if (seed % 7 === 0) {
        props.push(createDetailedUtilityPole());
    } else if (seed % 5 === 0) {
        props.push(createStreetLamp());
    }
    
    if (seed % 4 === 0) props.push(createBench());
    if (seed % 6 === 0) props.push(createFlowerPot(seed));
    if (seed % 9 === 0) props.push(createBicycleParked());
    if (seed % 11 === 0) props.push(createMailbox());
    
    // Add new anime-style elements:
    if (seed % 13 === 0) props.push(createTrafficCone());
    if (seed % 15 === 0) props.push(createDetailedVendingMachine(seed));
    if (seed % 17 === 0) props.push(createKeiTruck());
    if (seed % 19 === 0) props.push(createConvexMirror());
    if (seed % 21 === 0) props.push(createGreenUtilityBox());
    if (seed % 23 === 0) props.push(createCat());

    props.forEach((p, i) => {
        p.position.set((i % 2) * 3 - 1.5, 0, Math.floor(i / 2) * 2);
        p.rotation.y = (seed + i) * 0.7;
        g.add(p);
    });

    if (props.length) scene.add(g);
}

export function createBus(color = 0xF59A45) {
    const g = new THREE.Group();

    // Main Bus Body
    const body = toonMesh(new THREE.BoxGeometry(2.2, 2.0, 6.5), color);
    body.mesh.position.y = 1.25;
    body.mesh.castShadow = true;
    body.mesh.receiveShadow = true;
    g.add(body.group);

    // Roof
    const roof = toonMesh(new THREE.BoxGeometry(2.2, 0.25, 6.5), 0xfafafa);
    roof.mesh.position.set(0, 2.3, 0);
    g.add(roof.group);

    // Windows Band (Dark glass)
    const glass = toonMesh(new THREE.BoxGeometry(2.24, 0.7, 5.8), 0x223338);
    glass.mesh.position.set(0, 1.6, 0.1);
    g.add(glass.group);

    // Front Windshield
    const windshield = toonMesh(new THREE.BoxGeometry(2.0, 0.7, 0.1), 0x223338);
    windshield.mesh.position.set(0, 1.6, -3.21);
    g.add(windshield.group);

    // Wheels (4 cylinders)
    const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.4, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = toonMat(0x1a1a1a);

    const positions = [
        [-1.0, 0.48, -2.0], [1.0, 0.48, -2.0],
        [-1.0, 0.48, 2.0], [1.0, 0.48, 2.0]
    ];
    positions.forEach(([wx, wy, wz]) => {
        const wh = new THREE.Mesh(wheelGeo, wheelMat);
        wh.position.set(wx, wy, wz);
        wh.castShadow = true;
        g.add(wh);
    });

    // Headlights
    [-0.8, 0.8].forEach(sx => {
        const hl = toonMesh(new THREE.BoxGeometry(0.24, 0.18, 0.1), 0xfff3a8, { emissive: 0xfff3a8, emissiveIntensity: 0.5 });
        hl.mesh.position.set(sx, 0.7, -3.26);
        g.add(hl.group);
    });

    return g;
}

export function createMetro() {
    const g = new THREE.Group();

    // Main Train Carriage Body
    const body = toonMesh(new THREE.BoxGeometry(2.0, 2.0, 8.5), 0xd0d4d8);
    body.mesh.position.y = 1.35;
    body.mesh.castShadow = true;
    body.mesh.receiveShadow = true;
    g.add(body.group);

    // Roof
    const roof = toonMesh(new THREE.BoxGeometry(1.9, 0.2, 8.5), 0xa0a4a8);
    roof.mesh.position.set(0, 2.4, 0);
    g.add(roof.group);

    // Subway Stripe (Tokyo Green style)
    const stripe = toonMesh(new THREE.BoxGeometry(2.04, 0.22, 8.4), 0x79B36A);
    stripe.mesh.position.set(0, 1.0, 0);
    g.add(stripe.group);

    // Windows Band (Dark glass)
    const glass = toonMesh(new THREE.BoxGeometry(2.04, 0.65, 7.8), 0x223338);
    glass.mesh.position.set(0, 1.7, 0);
    g.add(glass.group);

    // Wheels Bogies (Black cylinders)
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = toonMat(0x1a1a1a);

    const positions = [
        [-0.9, 0.42, -2.8], [0.9, 0.42, -2.8],
        [-0.9, 0.42, -1.8], [0.9, 0.42, -1.8],
        [-0.9, 0.42, 1.8], [0.9, 0.42, 1.8],
        [-0.9, 0.42, 2.8], [0.9, 0.42, 2.8]
    ];
    positions.forEach(([wx, wy, wz]) => {
        const wh = new THREE.Mesh(wheelGeo, wheelMat);
        wh.position.set(wx, wy, wz);
        wh.castShadow = true;
        g.add(wh);
    });

    return g;
}

// ─── Japanese Town Props (new) ─────────────────────────────────────────────

/** Round Japanese road sign (like the ones in abeto.co) */
export function createRoundSign(seed = 0) {
    const g = new THREE.Group();
    // Pole
    const pole = toonMesh(new THREE.BoxGeometry(0.08, 2.8, 0.08), 0x6a6a58);
    pole.mesh.position.y = 1.4;
    g.add(pole.group);
    // Round sign disc
    const disc = toonMesh(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 16), 0xf8f8f0);
    disc.mesh.position.y = 2.85;
    disc.mesh.rotation.x = Math.PI / 2;
    g.add(disc.group);
    // Red/orange border ring
    const ring = toonMesh(new THREE.TorusGeometry(0.52, 0.07, 8, 20), seed % 2 === 0 ? 0xd46858 : 0xe0a030);
    ring.mesh.position.y = 2.85;
    g.add(ring.group);
    // Inner symbol (small block = character representation)
    const symbol = toonMesh(new THREE.BoxGeometry(0.22, 0.22, 0.04), 0x2a5058, { outline: false });
    symbol.mesh.position.set(0, 2.85, 0.06);
    g.add(symbol.group);
    return g;
}

/** Japanese traffic cone */
export function createTrafficCone(seed = 0) {
    const g = new THREE.Group();
    const cone = toonMesh(new THREE.ConeGeometry(0.22, 0.7, 8), 0xe05020);
    cone.mesh.position.y = 0.35;
    g.add(cone.group);
    // White stripes
    [0.15, 0.38].forEach(y => {
        const band = toonMesh(new THREE.CylinderGeometry(0.22 - y * 0.2, 0.22 - y * 0.15, 0.07, 8), 0xf8f8f0, { outline: false });
        band.mesh.position.y = y;
        g.add(band.group);
    });
    // Base
    const base = toonMesh(new THREE.CylinderGeometry(0.28, 0.32, 0.05, 8), 0xd04818, { outline: false });
    base.mesh.position.y = 0.025;
    g.add(base.group);
    return g;
}

/** Trash/rubbish bin (blue, common in Japanese streets) */
export function createTrashCan(seed = 0, isMonochrome = false) {
    const g = new THREE.Group();
    const colors = isMonochrome ? [0x888888, 0xaaaaaa, 0x666666] : [0x5888c8, 0x58a858, 0xd86848];
    const col = colors[Math.abs(seed) % 3];
    const body = toonMesh(new THREE.CylinderGeometry(0.3, 0.28, 0.72, 10), col);
    body.mesh.position.y = 0.36;
    body.mesh.castShadow = true;
    g.add(body.group);
    const lid = toonMesh(new THREE.CylinderGeometry(0.32, 0.32, 0.1, 10), 0x2a3038);
    lid.mesh.position.y = 0.77;
    g.add(lid.group);
    return g;
}

/** Detailed power/utility pole with crossarms (abeto.co style) */
export function createPowerPole(seed = 0) {
    const g = new THREE.Group();
    const poleH = 6.0 + (seed % 3) * 0.5;
    // Pole
    const pole = toonMesh(new THREE.BoxGeometry(0.14, poleH, 0.14), 0x4a4a3a);
    pole.mesh.position.y = poleH / 2;
    pole.mesh.castShadow = true;
    g.add(pole.group);
    // Cross arm (main)
    const arm = toonMesh(new THREE.BoxGeometry(2.6, 0.1, 0.1), 0x4a4a3a, { outline: false });
    arm.mesh.position.y = poleH - 0.6;
    g.add(arm.group);
    // Cross arm (secondary, lower)
    const arm2 = toonMesh(new THREE.BoxGeometry(1.6, 0.09, 0.09), 0x4a4a3a, { outline: false });
    arm2.mesh.position.y = poleH - 1.6;
    g.add(arm2.group);
    // Insulators (small knobs)
    [-1.2, 0, 1.2].forEach(ox => {
        const ins = toonMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 6), 0xc8c8c0, { outline: false });
        ins.mesh.position.set(ox, poleH - 0.55, 0);
        g.add(ins.group);
    });
    return g;
}

/** Japanese-style parked car (simple, sketch-like) */
export function createParkedCar(seed = 0) {
    const g = new THREE.Group();
    const colors = [0xc8ccc8, 0xd4d0c8, 0x8ab0c0, 0xc8a880, 0xa8c8a0];
    const col = colors[Math.abs(seed) % 5];
    // Body
    const body = toonMesh(new THREE.BoxGeometry(3.8, 0.85, 1.7), col);
    body.mesh.position.y = 0.72;
    body.mesh.castShadow = true;
    g.add(body.group);
    // Cabin
    const cabin = toonMesh(new THREE.BoxGeometry(2.0, 0.7, 1.6), col);
    cabin.mesh.position.set(-0.3, 1.42, 0);
    cabin.mesh.castShadow = true;
    g.add(cabin.group);
    // Windshield (front)
    const wsf = toonMesh(new THREE.BoxGeometry(0.06, 0.6, 1.4), 0x6ab8c8, { transparent: true, opacity: 0.7, outline: false });
    wsf.mesh.position.set(0.68, 1.42, 0);
    g.add(wsf.group);
    // Windshield (rear)
    const wsr = toonMesh(new THREE.BoxGeometry(0.06, 0.6, 1.4), 0x6ab8c8, { transparent: true, opacity: 0.5, outline: false });
    wsr.mesh.position.set(-1.28, 1.42, 0);
    g.add(wsr.group);
    // Wheels
    const wheelMat = toonMat(0x2a2a2a);
    [[1.1, -0.78], [1.1, 0.78], [-1.1, -0.78], [-1.1, 0.78]].forEach(([wz, wx]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.28, 12), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.34, wz);
        g.add(wheel);
    });
    // Headlights
    const hl = toonMesh(new THREE.BoxGeometry(0.04, 0.18, 0.38), 0xf8f0c8, { outline: false });
    hl.mesh.position.set(1.92, 0.72, 0.5);
    g.add(hl.group);
    const hl2 = hl.group.clone();
    hl2.position.set(1.92, 0.72, -0.5);
    g.add(hl2);
    return g;
}

/** Mailbox post (red Japanese post box) */
export function createPostBox() {
    const g = new THREE.Group();
    const base = toonMesh(new THREE.CylinderGeometry(0.28, 0.3, 1.1, 10), 0xcc2828);
    base.mesh.position.y = 0.55;
    base.mesh.castShadow = true;
    g.add(base.group);
    const top = toonMesh(new THREE.CylinderGeometry(0.3, 0.3, 0.28, 10), 0xaa2020);
    top.mesh.position.y = 1.24;
    g.add(top.group);
    const slot = toonMesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), 0x2a2a2a, { outline: false });
    slot.mesh.position.set(0.26, 0.9, 0);
    g.add(slot.group);
    return g;
}