import * as THREE from 'three';
import { PALETTE } from './config.js';
import { toonMat, toonMesh } from './ToonStyle.js';
import { buildHumanRig, setupHumanAnimator } from './HumanRig.js';

const DEFAULT_OUTFIT = {
    skinTone: 0xffdbac,
    jacketColor: 0x3b4d36,
    vestColor: 0x2d3436,
    shirtColor: 0xffffff,
    pantsColor: 0x232b38,
    shoeColor: 0x111111,
    hairColor: 0x224466,
    bagColor: 0x3b5998,
    strapColor: 0x8b5a2b,
};

function std(color, opts = {}) {
    return toonMat(color, opts);
}

/** Full skeletal human with bone-driven animations (GTA-style structure). */
export function createHumanAvatar(opts = {}) {
    const g = new THREE.Group();
    const outfit = { ...DEFAULT_OUTFIT, ...opts };
    const { root } = buildHumanRig(outfit);
    g.add(root);

    const { mixer, actions } = setupHumanAnimator(root);
    g.userData.mixer = mixer;
    g.userData.actions = actions;
    g.userData._activeAction = actions.idle ?? null;
    g.userData.isHuman = true;
    g.userData.rigRoot = root;
    return g;
}

export function createStudentAvatar(opts = {}) {
    return createHumanAvatar({
        skinTone: opts.skinTone ?? PALETTE.humanSkin,
        jacketColor: PALETTE.uniformNavy,
        vestColor: 0x1a2a4a,
        pantsColor: 0x1a2030,
        hairColor: 0x1a1a28,
        bagColor: 0x6a4a30,
        strapColor: 0x6a4a30,
        ...opts,
    });
}

export function createCommuterAvatar(opts = {}) {
    return createHumanAvatar({
        skinTone: opts.skinTone ?? PALETTE.humanSkin,
        jacketColor: PALETTE.trench,
        vestColor: 0xc8b8a0,
        pantsColor: 0x3a3a48,
        hairColor: 0x2a2018,
        bagColor: 0x2a2a38,
        ...opts,
    });
}

export function createWandererAvatar(opts = {}) {
    const g = createHumanAvatar({
        shirtColor: opts.shirtColor ?? 0xf0a040,
        jacketColor: opts.shirtColor ?? 0xf0a040,
        pantsColor: 0x4a5a6a,
        skinTone: opts.skinTone ?? PALETTE.humanSkin,
        hairColor: 0x2a2018,
        ...opts,
    });
    g.userData.isWanderer = true;

    const head = g.userData.rigRoot?.getObjectByName('head');
    if (head) {
        const phones = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.12), std(0x2a2a38));
        phones.position.set(0, 0.12, 0.02);
        head.add(phones);
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.04), std(0x2a2a38));
        band.position.set(0, 0.22, 0);
        head.add(band);
    }
    return g;
}

export function createBicycle() {
    const bike = new THREE.Group();
    bike.name = 'bicycle';
    const frame = toonMesh(new THREE.BoxGeometry(0.08, 0.5, 0.6), 0x6a7a88);
    frame.mesh.position.set(0, 0.65, 0);
    frame.mesh.rotation.x = 0.4;
    bike.add(frame.group);
    const bar = toonMesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), 0x6a7a88);
    bar.mesh.position.set(0, 0.95, 0.15);
    bar.mesh.rotation.y = 0.3;
    bike.add(bar.group);
    const seat = toonMesh(new THREE.BoxGeometry(0.18, 0.06, 0.1), 0x2a2a2a);
    seat.mesh.position.set(-0.1, 0.88, -0.15);
    bike.add(seat.group);
    const basket = toonMesh(new THREE.BoxGeometry(0.35, 0.25, 0.3), 0xc8a878);
    basket.mesh.position.set(0, 0.95, 0.45);
    bike.add(basket.group);
    const wheelGeo = new THREE.TorusGeometry(0.28, 0.04, 6, 12);
    [-0.35, 0.35].forEach(z => {
        const w = toonMesh(wheelGeo, 0x2a2a2a);
        w.mesh.rotation.y = Math.PI / 2;
        w.mesh.position.set(0, 0.28, z);
        bike.add(w.group);
    });
    return bike;
}

export function createCyclistAvatar(opts = {}) {
    const g = createHumanAvatar({
        jacketColor: opts.shirtColor ?? 0xe8a0a0,
        pantsColor: 0x4a5a68,
        skinTone: opts.skinTone ?? PALETTE.humanSkin,
        ...opts,
    });
    g.position.y = 0.35;
    const bike = createBicycle();
    g.add(bike);
    g.userData.isCyclist = true;
    g.userData.bike = bike;
    return g;
}

export function createAlienAvatar(opts = {}) {
    const g = new THREE.Group();
    const skin = std(opts.skinTone ?? PALETTE.alienSkin);
    const robe = std([0x4a6a5a, 0x5a4a6a, 0x4a5a6a, 0x6a5a4a][(opts.variant ?? 0) % 4]);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 4, 8), skin);
    body.position.y = 1.0;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), skin);
    head.position.y = 1.62;
    g.add(head);

    [-0.08, 0.08].forEach(x => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), std(0x111122));
        eye.position.set(x, 1.64, 0.15);
        g.add(eye);
    });

    const robeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.55, 10), robe);
    robeMesh.position.y = 0.72;
    g.add(robeMesh);

    g.userData.walkParts = [];
    return g;
}

export function createUFO() {
    const ufo = new THREE.Group();
    const metal = std(0xc0c8d0, { emissive: 0x8898a8, emissiveIntensity: 0.05 });
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, 0.5, 32), metal);
    ufo.add(hull);
    const rim = new THREE.Mesh(
        new THREE.TorusGeometry(3.8, 0.12, 8, 32),
        std(PALETTE.orange, { emissive: PALETTE.orange, emissiveIntensity: 0.2 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.1;
    rim.name = 'rimLight';
    ufo.add(rim);
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        std(0xa8c8e0, { transparent: true, opacity: 0.75 })
    );
    dome.position.y = 0.3;
    ufo.add(dome);
    const thruster = new THREE.PointLight(0xa8e8c8, 2, 40);
    thruster.position.y = -1.5;
    thruster.name = 'thrusterLight';
    ufo.add(thruster);
    const rampPivot = new THREE.Group();
    rampPivot.position.set(0, 0, 3.5);
    rampPivot.name = 'rampPivot';
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 3.2), metal);
    ramp.position.z = 1.6;
    rampPivot.add(ramp);
    rampPivot.rotation.x = -Math.PI / 2;
    ufo.add(rampPivot);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.06), metal);
    door.position.set(0, 0.5, 3.9);
    door.name = 'door';
    ufo.add(door);
    return ufo;
}

export function createNameTag(name) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 48;
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(26,26,34,0.7)';
    ctx.fillRect(0, 0, 256, 48);
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 30);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true }));
    sp.scale.set(2, 0.45, 1);
    sp.position.y = 2.05;
    return sp;
}

/** Fade between skeletal animation states */
export function fadeHumanAction(avatar, name, duration = 0.2) {
    const actions = avatar.userData.actions;
    if (!actions || !actions[name]) return;
    const prev = avatar.userData._activeAction;
    const next = actions[name];
    if (prev === next) return;
    if (prev) prev.fadeOut(duration);
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(duration).play();
    avatar.userData._activeAction = next;
}

/** Update mixer each frame */
export function updateHumanAnimator(avatar, dt) {
    if (avatar.userData.mixer) avatar.userData.mixer.update(dt);
}

/** Legacy procedural walk — only used for aliens / fallback */
export function animateHumanWalk(avatar, walkT, intensity = 1) {
    if (avatar.userData.mixer) return;
    (avatar.userData.walkParts || []).forEach((partName, i) => {
        const p = avatar.getObjectByName(partName);
        if (!p) return;
        const s = Math.sin(walkT + i * Math.PI * 0.5) * 0.55 * intensity;
        if (partName.includes('leg')) p.rotation.x = s;
        if (partName.includes('arm')) p.rotation.x = -s * 0.45;
    });
}

export function animateWanderer(avatar, t) {
    fadeHumanAction(avatar, 'idle', 0.3);
    const arm = avatar.userData.rigRoot?.getObjectByName('upperArmR');
    if (arm) arm.rotation.x = -0.9 + Math.sin(t * 2) * 0.25;
}

export function animateCyclist(avatar, t, speed = 1) {
    fadeHumanAction(avatar, 'walk', 0.15);
    if (avatar.userData.mixer) avatar.userData.mixer.timeScale = speed * 1.4;
    const bike = avatar.userData.bike;
    if (bike) bike.rotation.z += speed * 0.02;
}