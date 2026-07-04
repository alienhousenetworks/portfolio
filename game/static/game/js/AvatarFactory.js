import * as THREE from 'three';
import { PALETTE } from './config.js';

function std(color, opts = {}) {
    const params = {
        color,
        roughness: opts.roughness ?? 0.8,
        metalness: opts.metalness ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
    };
    if (opts.emissive != null) {
        params.emissive = opts.emissive;
        params.emissiveIntensity = opts.emissiveIntensity ?? 0.1;
    }
    return new THREE.MeshStandardMaterial(params);
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

export function createHumanAvatar(opts = {}) {
    const g = new THREE.Group();
    const skin = std(opts.skinTone ?? PALETTE.humanSkin, { roughness: 0.75 });
    const skinDark = std(
        new THREE.Color(opts.skinTone ?? PALETTE.humanSkin).multiplyScalar(0.85).getHex(),
        { roughness: 0.8 }
    );
    const shirt = std(opts.shirtColor ?? 0x3a5a8a, { roughness: 0.9 });
    const pants = std(opts.pantsColor ?? 0x2e3340, { roughness: 0.95 });
    const shoe = std(0x1a1a22, { roughness: 0.7 });
    const hairCol = std(opts.hairColor ?? 0x2a2018, { roughness: 0.95 });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.42, 6, 10), shirt);
    torso.position.y = 1.18;
    torso.castShadow = true;
    g.add(torso);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), skin);
    neck.position.y = 1.52;
    g.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), skin);
    head.position.y = 1.68;
    head.scale.set(1, 1.05, 0.95);
    head.castShadow = true;
    g.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairCol);
    hair.position.set(0, 1.78, -0.02);
    hair.scale.set(1.02, 0.85, 1);
    g.add(hair);

    const eyeWhite = std(0xf5f5f0);
    const eyePupil = std(0x1a1a2a);
    [-0.06, 0.06].forEach(x => {
        const ew = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeWhite);
        ew.position.set(x, 1.7, 0.16);
        g.add(ew);
        const ep = new THREE.Mesh(new THREE.SphereGeometry(0.014, 6, 6), eyePupil);
        ep.position.set(x, 1.7, 0.185);
        g.add(ep);
    });

    const legMat = pants;
    const legL = limb('legL', new THREE.CapsuleGeometry(0.09, 0.38, 4, 8), legMat, g, [-0.11, 0.88, 0]);
    legL.children[0].position.y = -0.22;
    const calfL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.32, 4, 8), legMat);
    calfL.position.set(0, -0.48, 0);
    calfL.name = 'calfL';
    legL.add(calfL);
    const footL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.22), shoe);
    footL.position.set(0, -0.72, 0.04);
    legL.add(footL);

    const legR = limb('legR', new THREE.CapsuleGeometry(0.09, 0.38, 4, 8), legMat, g, [0.11, 0.88, 0]);
    legR.children[0].position.y = -0.22;
    const calfR = calfL.clone();
    calfR.name = 'calfR';
    legR.add(calfR);
    const footR = footL.clone();
    legR.add(footR);

    const armL = limb('armL', new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), shirt, g, [-0.3, 1.22, 0], [0, 0, 0.15]);
    armL.children[0].position.y = -0.16;
    const foreL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.26, 4, 8), skinDark);
    foreL.position.set(0, -0.42, 0);
    foreL.name = 'foreL';
    armL.add(foreL);
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skin);
    handL.position.set(0, -0.58, 0);
    armL.add(handL);

    const armR = limb('armR', new THREE.CapsuleGeometry(0.07, 0.28, 4, 8), shirt, g, [0.3, 1.22, 0], [0, 0, -0.15]);
    armR.children[0].position.y = -0.16;
    const foreR = foreL.clone();
    foreR.name = 'foreR';
    armR.add(foreR);
    const handR = handL.clone();
    armR.add(handR);

    g.userData.walkParts = ['legL', 'legR', 'armL', 'armR'];
    g.userData.isHuman = true;
    return g;
}

export function createAlienAvatar(opts = {}) {
    const g = new THREE.Group();
    const skin = std(opts.skinTone ?? PALETTE.alienSkin, { roughness: 0.6 });
    const robe = std([0x2a4a3a, 0x3a2a4a, 0x2a3a4a, 0x4a3a2a][(opts.variant ?? 0) % 4]);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.6, 4, 8), skin);
    body.position.y = 1.0;
    g.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), skin);
    head.position.y = 1.65;
    g.add(head);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), std(0x111122));
    eyeL.position.set(-0.09, 1.68, 0.18);
    g.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.09;
    g.add(eyeR);

    const robeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.6, 10), robe);
    robeMesh.position.y = 0.7;
    g.add(robeMesh);

    g.userData.walkParts = [];
    return g;
}

export function createUFO() {
    const ufo = new THREE.Group();
    const metal = std(0xb0b8c0, { metalness: 0.7, roughness: 0.3 });

    const hull = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, 0.5, 32), metal);
    ufo.add(hull);

    const rim = new THREE.Mesh(
        new THREE.TorusGeometry(3.8, 0.12, 8, 32),
        std(0x00cc44, { emissive: 0x00cc44, emissiveIntensity: 0.25, metalness: 0.5 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.1;
    rim.name = 'rimLight';
    ufo.add(rim);

    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        std(0x88bbdd, { metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.7 })
    );
    dome.position.y = 0.3;
    ufo.add(dome);

    const thruster = new THREE.PointLight(0x66ffaa, 2, 40);
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
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
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
            const calf = p.getObjectByName(partName === 'legL' ? 'calfL' : 'calfR');
            if (calf) calf.rotation.x = Math.max(0, -s * 0.6);
        }
        if (partName.includes('arm')) {
            p.rotation.x = -s * 0.45;
            const fore = p.getObjectByName(partName === 'armL' ? 'foreL' : 'foreR');
            if (fore) fore.rotation.x = -s * 0.2;
        }
    });
}