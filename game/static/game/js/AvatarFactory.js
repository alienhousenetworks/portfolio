import * as THREE from 'three';
import { PALETTE } from './config.js';
import { toonMat, toonMesh } from './ToonStyle.js';

function std(color, opts = {}) {
    return toonMat(color, opts);
}

function limb(name, geo, mat, parent, pos, rot = [0, 0, 0]) {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(...pos);
    pivot.rotation.set(...rot);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    pivot.add(mesh);
    parent.add(pivot);
    return pivot;
}

function buildHumanBase(g, opts = {}) {
    const skin = std(opts.skinTone ?? 0xffdbac);
    const skinDark = std(
        new THREE.Color(opts.skinTone ?? 0xffdbac).multiplyScalar(0.85).getHex()
    );
    
    // Ghibli/Anime style palette from reference image
    const jacketCol = std(0x3b4d36); // Camo green jacket
    const vestCol = std(0x2d3436);   // Dark grey vest
    const shirtCol = std(0xffffff);  // White shirt collar
    const pantsCol = std(0x232b38);  // Dark blue/grey pants
    const shoeCol = std(0x111111);   // Black sneakers
    const hairCol = std(0x224466);   // Cool blue styled hair
    const leatherCol = std(0x8b5a2b); // Messenger bag strap
    const bagCol = std(0x3b5998);     // Blue bag

    // Torso (Jacket base)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.52, 0.24), jacketCol);
    torso.position.y = 1.18;
    torso.castShadow = true;
    g.add(torso);

    // Inner grey vest
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.25), vestCol);
    vest.position.set(0, 1.17, 0.01);
    g.add(vest);

    // White shirt collar peaking out
    const collarL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), shirtCol);
    collarL.position.set(-0.06, 1.42, 0.11);
    collarL.rotation.z = -0.3;
    g.add(collarL);

    const collarR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), shirtCol);
    collarR.position.set(0.06, 1.42, 0.11);
    collarR.rotation.z = 0.3;
    g.add(collarR);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), skin);
    neck.position.y = 1.48;
    g.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.28), skin);
    head.position.y = 1.68;
    head.castShadow = true;
    g.add(head);

    // Blue styled Ghibli haircut (undercut spikes)
    const hairBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.3), hairCol);
    hairBase.position.set(0, 1.86, -0.01);
    g.add(hairBase);

    const spikes = [
        { size: [0.09, 0.16, 0.09], pos: [-0.07, 1.76, 0.14], rot: [0.2, 0, -0.3] },
        { size: [0.09, 0.18, 0.09], pos: [0.01, 1.73, 0.14], rot: [0.25, 0.1, -0.15] },
        { size: [0.09, 0.14, 0.09], pos: [0.08, 1.77, 0.13], rot: [0.18, 0.2, 0.2] },
        { size: [0.08, 0.15, 0.08], pos: [-0.15, 1.76, 0.04], rot: [0, 0, 0.35] },
        { size: [0.08, 0.15, 0.08], pos: [0.15, 1.76, 0.04], rot: [0, 0, -0.35] },
        { size: [0.12, 0.14, 0.12], pos: [0, 1.68, -0.14], rot: [-0.3, 0, 0] }
    ];
    spikes.forEach(s => {
        const spike = new THREE.Mesh(new THREE.BoxGeometry(...s.size), hairCol);
        spike.position.set(...s.pos);
        spike.rotation.set(...s.rot);
        g.add(spike);
    });

    // Glasses frame (White/grey frames)
    const glassFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.03), std(0xcccccc));
    glassFrame.position.set(0, 1.7, 0.15);
    g.add(glassFrame);

    // Earpods (Small white cylinders in ears)
    [-0.155, 0.155].forEach(x => {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8), std(0xffffff));
        pod.position.set(x, 1.66, 0.02);
        pod.rotation.x = 0.2;
        g.add(pod);
    });

    // Eyes
    [-0.07, 0.07].forEach(x => {
        const ew = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), std(0xf5f5f0));
        ew.position.set(x, 1.7, 0.14);
        g.add(ew);
        const ep = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.02), std(0x1a1a2a));
        ep.position.set(x, 1.7, 0.155);
        g.add(ep);
    });

    // Legs
    const legL = limb('legL', new THREE.BoxGeometry(0.12, 0.42, 0.12), pantsCol, g, [-0.1, 0.88, 0]);
    legL.children[0].position.y = -0.2;
    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), shoeCol);
    footL.position.set(0, -0.42, 0.04);
    legL.add(footL);

    const legR = limb('legR', new THREE.BoxGeometry(0.12, 0.42, 0.12), pantsCol, g, [0.1, 0.88, 0]);
    legR.children[0].position.y = -0.2;
    const footR = footL.clone();
    legR.add(footR);

    // Arms
    const armL = limb('armL', new THREE.BoxGeometry(0.1, 0.3, 0.1), jacketCol, g, [-0.27, 1.22, 0], [0, 0, 0.12]);
    armL.children[0].position.y = -0.14;
    const foreL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.08), skinDark);
    foreL.position.set(0, -0.36, 0);
    foreL.name = 'foreL';
    armL.add(foreL);

    const armR = limb('armR', new THREE.BoxGeometry(0.1, 0.3, 0.1), jacketCol, g, [0.27, 1.22, 0], [0, 0, -0.12]);
    armR.children[0].position.y = -0.14;
    const foreR = foreL.clone();
    foreR.name = 'foreR';
    armR.add(foreR);

    // Messenger Shoulder Bag
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.26), bagCol);
    bag.position.set(0.24, 1.05, 0.04);
    bag.rotation.y = 0.15;
    g.add(bag);

    // Messenger Strap running across chest from left shoulder to right hip
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.55, 0.03), leatherCol);
    strap.position.set(0.06, 1.26, 0.06);
    strap.rotation.z = -0.65;
    g.add(strap);

    g.userData.walkParts = ['legL', 'legR', 'armL', 'armR'];
    g.userData.isHuman = true;
    return g;
}

export function createHumanAvatar(opts = {}) {
    return buildHumanBase(new THREE.Group(), opts);
}

export function createStudentAvatar(opts = {}) {
    return buildHumanBase(new THREE.Group(), opts);
}

export function createCommuterAvatar(opts = {}) {
    return buildHumanBase(new THREE.Group(), opts);
}

export function createWandererAvatar(opts = {}) {
    const g = buildHumanBase(new THREE.Group(), opts);
    g.userData.isWanderer = true;
    g.userData.canPhase = 0;
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
    const g = buildHumanBase(new THREE.Group(), {
        shirtColor: opts.shirtColor ?? 0xe8a0a0,
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

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.7, 0.3), skin);
    body.position.y = 1.0;
    g.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.32), skin);
    head.position.y = 1.62;
    g.add(head);

    [-0.09, 0.09].forEach(x => {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.04), std(0x111122));
        eye.position.set(x, 1.65, 0.16);
        g.add(eye);
    });

    const robeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.4), robe);
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
        std(0xe88870, { emissive: 0xe88870, emissiveIntensity: 0.2 })
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
    sp.position.y = 2.2;
    return sp;
}

export function animateHumanWalk(avatar, walkT, intensity = 1) {
    (avatar.userData.walkParts || []).forEach((partName, i) => {
        const p = avatar.getObjectByName(partName);
        if (!p) return;
        const s = Math.sin(walkT + i * Math.PI * 0.5) * 0.55 * intensity;
        if (partName.includes('leg')) {
            p.rotation.x = s;
        }
        if (partName.includes('arm')) {
            p.rotation.x = -s * 0.45;
            const fore = p.getObjectByName(partName === 'armL' ? 'foreL' : 'foreR');
            if (fore) fore.rotation.x = -s * 0.2;
        }
    });
}

export function animateWanderer(avatar, t) {
    const foreR = avatar.getObjectByName('armR')?.getObjectByName('foreR');
    if (foreR) {
        foreR.rotation.x = -0.8 + Math.sin(t * 2) * 0.3;
        foreR.position.y = -0.3 + Math.abs(Math.sin(t * 3)) * 0.15;
    }
}

export function animateCyclist(avatar, t, speed = 1) {
    const legs = ['legL', 'legR'];
    legs.forEach((name, i) => {
        const p = avatar.getObjectByName(name);
        if (p) p.rotation.x = Math.sin(t * 6 * speed + i) * 0.35;
    });
    const bike = avatar.userData.bike;
    if (bike) {
        bike.children.forEach((child, i) => {
            if (child.name === 'bicycle' || i > 2) {
                child.children.forEach(w => {
                    if (w.rotation) w.rotation.z += speed * 0.08;
                });
            }
        });
    }
}