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

export function createHumanAvatar(opts = {}) {
    const g = new THREE.Group();
    const skin = std(opts.skinTone ?? PALETTE.humanSkin);
    const shirt = std(opts.shirtColor ?? 0x3a5a8a);
    const pants = std(opts.pantsColor ?? 0x3a3a48);
    const shoe = std(0x2a2a30);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.28), shirt);
    torso.position.y = 1.25;
    g.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), skin);
    head.position.y = 1.72;
    g.add(head);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.7, 0.16), pants);
    legL.position.set(-0.12, 0.55, 0);
    legL.name = 'legL';
    g.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.12;
    legR.name = 'legR';
    g.add(legR);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.14), shirt);
    armL.position.set(-0.35, 1.2, 0);
    armL.name = 'armL';
    g.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.35;
    armR.name = 'armR';
    g.add(armR);

    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.24), shoe);
    bootL.position.set(-0.12, 0.05, 0.03);
    g.add(bootL);
    const bootR = bootL.clone();
    bootR.position.x = 0.12;
    g.add(bootR);

    g.userData.walkParts = ['legL', 'legR', 'armL', 'armR'];
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

    ufo.add(new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, 0.5, 32), metal));

    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        std(0x88bbdd, { metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.7 })
    );
    dome.position.y = 0.3;
    ufo.add(dome);

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