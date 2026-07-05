import * as THREE from 'three';
import { PALETTE } from './config.js';
import { toonMesh, toonMat, INK } from './ToonStyle.js';

export function createStreetLamp() {
    const g = new THREE.Group();
    const pole = toonMesh(new THREE.BoxGeometry(0.1, 4.2, 0.1), PALETTE.pole);
    pole.mesh.position.y = 2.1;
    g.add(pole.group);
    const arm = toonMesh(new THREE.BoxGeometry(0.8, 0.08, 0.08), PALETTE.pole);
    arm.mesh.position.set(0.35, 4, 0);
    g.add(arm.group);
    const bulb = toonMesh(new THREE.BoxGeometry(0.35, 0.25, 0.35), PALETTE.yellow, { emissive: PALETTE.yellow, emissiveIntensity: 0.18 });
    bulb.mesh.position.set(0.7, 3.85, 0);
    g.add(bulb.group);
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

export function createBench() {
    const g = new THREE.Group();
    const seat = toonMesh(new THREE.BoxGeometry(2.2, 0.15, 0.65), PALETTE.wood[1]);
    seat.mesh.position.y = 0.45;
    g.add(seat.group);
    [-0.85, 0.85].forEach(x => {
        const leg = toonMesh(new THREE.BoxGeometry(0.1, 0.45, 0.55), PALETTE.wood[0]);
        leg.mesh.position.set(x, 0.22, 0);
        g.add(leg.group);
    });
    return g;
}

export function createFlowerPot(seed = 0) {
    const g = new THREE.Group();
    const pot = toonMesh(new THREE.BoxGeometry(0.45, 0.4, 0.45), PALETTE.concrete);
    pot.mesh.position.y = 0.2;
    g.add(pot.group);
    const flower = toonMesh(new THREE.BoxGeometry(0.5, 0.35, 0.5), [PALETTE.pink, PALETTE.yellow, PALETTE.purple][seed % 3]);
    flower.mesh.position.y = 0.55;
    g.add(flower.group);
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

export function createCherryTree() {
    const g = new THREE.Group();
    const trunk = toonMesh(new THREE.BoxGeometry(0.35, 2.8, 0.35), PALETTE.blossomTrunk);
    trunk.mesh.position.y = 1.4;
    trunk.mesh.castShadow = true;
    g.add(trunk.group);
    const canopy = toonMesh(new THREE.SphereGeometry(2.2, 8, 8), PALETTE.blossom);
    canopy.mesh.position.y = 3.8;
    canopy.mesh.scale.set(1.1, 0.75, 1.1);
    canopy.mesh.castShadow = true;
    g.add(canopy.group);
    return g;
}

export function createLargeTree(seed = 0) {
    const g = new THREE.Group();
    const col = PALETTE.foliage[seed % PALETTE.foliage.length];
    const trunk = toonMesh(new THREE.BoxGeometry(0.4, 3.5, 0.4), PALETTE.wood[0]);
    trunk.mesh.position.y = 1.75;
    trunk.mesh.castShadow = true;
    g.add(trunk.group);
    const canopy = toonMesh(new THREE.SphereGeometry(2.5, 8, 8), col);
    canopy.mesh.position.y = 4.5;
    canopy.mesh.scale.set(1, 0.85, 1);
    canopy.mesh.castShadow = true;
    g.add(canopy.group);
    return g;
}

/** Pine tree for mountain slopes — tall cone */
export function createPineTree(seed = 0, height = 1.0) {
    const g = new THREE.Group();
    const h = (5 + (seed % 4)) * height;
    const col = seed % 3 === 0 ? PALETTE.pineDark : PALETTE.pineGreen;

    // Trunk
    const trunk = toonMesh(new THREE.CylinderGeometry(0.15, 0.22, h * 0.35, 5), PALETTE.wood[0]);
    trunk.mesh.position.y = h * 0.175;
    trunk.mesh.castShadow = true;
    g.add(trunk.group);

    // Tiered cone foliage
    const tiers = 3;
    for (let t = 0; t < tiers; t++) {
        const tierH = h * (0.45 - t * 0.08);
        const tierR = (h * 0.32) * (1 - t * 0.25);
        const tierY = h * 0.3 + t * (h * 0.22);
        const cone = toonMesh(new THREE.ConeGeometry(tierR, tierH, 7), col);
        cone.mesh.position.y = tierY;
        cone.mesh.castShadow = true;
        g.add(cone.group);
    }
    return g;
}

/** Willow-style tree for riverbanks — drooping sphere */
export function createWillowTree(seed = 0) {
    const g = new THREE.Group();
    const trunk = toonMesh(new THREE.CylinderGeometry(0.18, 0.28, 5, 6), PALETTE.wood[0]);
    trunk.mesh.position.y = 2.5;
    trunk.mesh.castShadow = true;
    g.add(trunk.group);

    // Drooping canopy — elongated ellipsoid
    const canopy = toonMesh(new THREE.SphereGeometry(2.6, 9, 7), PALETTE.willowGreen);
    canopy.mesh.position.y = 6.5;
    canopy.mesh.scale.set(1.2, 0.9, 1.2);
    canopy.mesh.castShadow = true;
    g.add(canopy.group);

    // Draping tendrils
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const r = 1.8 + (seed + i) % 3 * 0.3;
        const drape = toonMesh(new THREE.CylinderGeometry(0.04, 0.01, 2.2, 4), PALETTE.willowGreen, { outline: false });
        drape.mesh.position.set(Math.cos(angle) * r, 4.8, Math.sin(angle) * r);
        drape.mesh.rotation.z = Math.cos(angle) * 0.3;
        drape.mesh.rotation.x = Math.sin(angle) * 0.3;
        g.add(drape.group);
    }
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

export function createTrafficCone() {
    const g = new THREE.Group();
    const cone = toonMesh(new THREE.ConeGeometry(0.18, 0.45, 6), PALETTE.orange, { outline: false });
    cone.mesh.position.y = 0.22;
    g.add(cone.group);
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
    if (seed % 5 === 0) props.push(createStreetLamp());
    if (seed % 4 === 0) props.push(createBench());
    if (seed % 3 === 0) props.push(createFlowerPot(seed));
    if (seed % 7 === 0) props.push(createBicycleParked());
    if (seed % 11 === 0) props.push(createMailbox());
    if (seed % 13 === 0) props.push(createTrafficCone());
    if (seed % 17 === 0) props.push(createCat());

    props.forEach((p, i) => {
        p.position.set((i % 2) * 3 - 1.5, 0, Math.floor(i / 2) * 2);
        p.rotation.y = (seed + i) * 0.7;
        g.add(p);
    });

    if (props.length) scene.add(g);
}