import * as THREE from 'three';
import { COLORS } from './config.js';

function mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.75,
        metalness: opts.metalness ?? 0.05,
        emissive: opts.emissive,
        emissiveIntensity: opts.emissiveIntensity ?? 0,
        transparent: opts.transparent ?? false,
        opacity: opts.opacity ?? 1,
    });
}

/** Realistic human explorer — the player character */
export function createHumanAvatar(options = {}) {
    const {
        skinTone = COLORS.humanSkin,
        shirtColor = 0x4a7ab8,
        pantsColor = 0x556070,
        hairColor = 0x5c3a22,
        scale = 1,
        name = 'Explorer',
    } = options;

    const group = new THREE.Group();
    group.name = name;

    const skin = mat(skinTone);
    const shirt = mat(shirtColor);
    const pants = mat(pantsColor);
    const hair = mat(hairColor, { roughness: 0.95 });
    const shoe = mat(0x444450, { roughness: 0.9 });

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.28), pants);
    pelvis.position.y = 0.95;
    pelvis.name = 'pelvis';
    group.add(pelvis);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.3), shirt);
    torso.position.y = 1.38;
    torso.name = 'torso';
    group.add(torso);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 8), skin);
    neck.position.y = 1.72;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 16), skin);
    head.position.y = 1.95;
    head.name = 'head';
    group.add(head);

    const hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair);
    hairTop.position.y = 2.02;
    hairTop.scale.set(1, 0.7, 1);
    group.add(hairTop);

    const eyeWhiteL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat(0xffffff));
    eyeWhiteL.position.set(-0.07, 1.96, 0.17);
    eyeWhiteL.scale.z = 0.5;
    group.add(eyeWhiteL);
    const eyeWhiteR = eyeWhiteL.clone();
    eyeWhiteR.position.x = 0.07;
    group.add(eyeWhiteR);

    const pupilL = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), mat(0x1a1a2e));
    pupilL.position.set(-0.07, 1.96, 0.2);
    group.add(pupilL);
    const pupilR = pupilL.clone();
    pupilR.position.x = 0.07;
    group.add(pupilR);

    const armGeo = new THREE.CapsuleGeometry(0.07, 0.42, 4, 8);
    const armL = new THREE.Mesh(armGeo, shirt);
    armL.position.set(-0.34, 1.3, 0);
    armL.rotation.z = 0.12;
    armL.name = 'armL';
    group.add(armL);

    const forearmL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.32, 4, 6), skin);
    forearmL.position.set(-0.42, 0.92, 0.04);
    forearmL.rotation.z = 0.2;
    forearmL.name = 'forearmL';
    group.add(forearmL);

    const armR = armL.clone();
    armR.position.x = 0.34;
    armR.rotation.z = -0.12;
    armR.name = 'armR';
    group.add(armR);

    const forearmR = forearmL.clone();
    forearmR.position.set(0.42, 0.92, 0.04);
    forearmR.rotation.z = -0.2;
    forearmR.name = 'forearmR';
    group.add(forearmR);

    const legGeo = new THREE.CapsuleGeometry(0.1, 0.48, 4, 8);
    const legL = new THREE.Mesh(legGeo, pants);
    legL.position.set(-0.13, 0.42, 0);
    legL.name = 'legL';
    group.add(legL);

    const legR = legL.clone();
    legR.position.x = 0.13;
    legR.name = 'legR';
    group.add(legR);

    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.26), shoe);
    bootL.position.set(-0.13, 0.05, 0.04);
    group.add(bootL);
    const bootR = bootL.clone();
    bootR.position.x = 0.13;
    group.add(bootR);

    group.scale.setScalar(scale);
    group.userData.isHuman = true;
    group.userData.walkParts = ['legL', 'legR', 'armL', 'armR', 'forearmL', 'forearmR'];

    return group;
}

/** Alien inhabitant — native of the planet */
export function createAlienAvatar(options = {}) {
    const {
        skinTone = COLORS.alienSkin,
        accentColor = COLORS.alien,
        scale = 1,
        name = 'Alien',
        variant = 0,
    } = options;

    const group = new THREE.Group();
    group.name = name;

    const skin = mat(skinTone, { roughness: 0.6 });
    const robe = mat(
        [0x1a3a2a, 0x2a1a4a, 0x1a2a3a][variant % 3],
        { emissive: accentColor, emissiveIntensity: 0.02 }
    );
    const eyeMat = mat(0x0a0a0a, { roughness: 0.2, metalness: 0.1 });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.65, 6, 10), skin);
    body.position.y = 1.05;
    body.scale.set(1, 1.15, 0.85);
    group.add(body);

    const robeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.5, 0.7, 12), robe);
    robeMesh.position.y = 0.75;
    group.add(robeMesh);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 14), skin);
    head.position.y = 1.72;
    head.scale.set(1.1, 1.2, 0.9);
    group.add(head);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), eyeMat);
    eyeL.position.set(-0.1, 1.76, 0.2);
    eyeL.scale.set(1.3, 1.8, 0.6);
    group.add(eyeL);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;
    group.add(eyeR);

    const eyeGlowL = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 6, 6),
        mat(accentColor, { emissive: accentColor, emissiveIntensity: 0.35 })
    );
    eyeGlowL.position.set(-0.1, 1.76, 0.26);
    group.add(eyeGlowL);
    const eyeGlowR = eyeGlowL.clone();
    eyeGlowR.position.x = 0.1;
    group.add(eyeGlowR);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), skin);
    antenna.position.set(variant % 2 === 0 ? -0.08 : 0.08, 2.05, 0);
    antenna.rotation.z = variant % 2 === 0 ? -0.3 : 0.3;
    group.add(antenna);

    const antennaTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        mat(accentColor, { emissive: accentColor, emissiveIntensity: 0.3 })
    );
    antennaTip.position.copy(antenna.position);
    antennaTip.position.y = 2.22;
    group.add(antennaTip);

    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.38, 4, 6), skin);
    armL.position.set(-0.38, 1.1, 0);
    armL.rotation.z = 0.2;
    group.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.38;
    armR.rotation.z = -0.2;
    group.add(armR);

    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), skin);
    handL.position.set(-0.45, 0.82, 0);
    group.add(handL);
    const handR = handL.clone();
    handR.position.x = 0.45;
    group.add(handR);

    group.scale.setScalar(scale);
    group.userData.isAlien = true;

    return group;
}

/** Classic flying saucer with ramp and door */
export function createUFO() {
    const ufo = new THREE.Group();
    ufo.name = 'UFO';

    const hullMat = mat(COLORS.ufoHull, { metalness: 0.85, roughness: 0.25 });
    const glowMat = mat(COLORS.ufoGlow, { emissive: COLORS.ufoGlow, emissiveIntensity: 1.2 });

    const lowerDisc = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.2, 0.5, 48), hullMat);
    lowerDisc.position.y = -0.15;
    ufo.add(lowerDisc);

    const upperDisc = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.8, 0.35, 48), hullMat);
    upperDisc.position.y = 0.15;
    ufo.add(upperDisc);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.9, 0.12, 8, 48), glowMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.35;
    ufo.add(rim);

    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(0x88ccff, {
            emissive: COLORS.ufoGlow,
            emissiveIntensity: 0.2,
            metalness: 0.6,
            roughness: 0.1,
        })
    );
    dome.position.y = 0.35;
    dome.name = 'dome';
    ufo.add(dome);

    for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), glowMat.clone());
        light.material.emissiveIntensity = 0.8 + (i % 3) * 0.3;
        light.position.set(Math.cos(angle) * 3.6, -0.2, Math.sin(angle) * 3.6);
        ufo.add(light);
    }

    const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.2, 0.08),
        mat(0x667788, { metalness: 0.7, roughness: 0.3 })
    );
    door.position.set(0, 0.5, 3.85);
    door.name = 'door';
    ufo.add(door);

    const rampPivot = new THREE.Group();
    rampPivot.position.set(0, 0.1, 3.5);
    rampPivot.name = 'rampPivot';

    const ramp = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.06, 3.5),
        mat(0x8899aa, { metalness: 0.6, roughness: 0.35 })
    );
    ramp.position.set(0, 0, 1.75);
    ramp.name = 'ramp';
    rampPivot.add(ramp);

    const rampGlow = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.02, 3.3),
        mat(COLORS.alien, { emissive: COLORS.alien, emissiveIntensity: 0.4, transparent: true, opacity: 0.5 })
    );
    rampGlow.position.set(0, 0.04, 1.75);
    rampPivot.add(rampGlow);

    rampPivot.rotation.x = -Math.PI / 2;
    ufo.add(rampPivot);

    const beam = new THREE.Mesh(
        new THREE.ConeGeometry(2, 6, 32, 1, true),
        new THREE.MeshBasicMaterial({
            color: COLORS.alien,
            transparent: true,
            opacity: 0.12,
            side: THREE.DoubleSide,
            depthWrite: false,
        })
    );
    beam.position.y = -3.5;
    beam.name = 'beam';
    ufo.add(beam);

    const undersideGlow = new THREE.PointLight(COLORS.ufoGlow, 4, 25);
    undersideGlow.position.y = -1.5;
    ufo.add(undersideGlow);

    const dustRing = new THREE.Mesh(
        new THREE.RingGeometry(5, 8, 32),
        new THREE.MeshBasicMaterial({
            color: 0xccaa88,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
        })
    );
    dustRing.rotation.x = -Math.PI / 2;
    dustRing.position.y = -0.5;
    dustRing.name = 'dustRing';
    ufo.add(dustRing);

    return ufo;
}

export function createNameTag(name, color = COLORS.alien, prefix = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(2, 20, 10, 0.75)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 248, 56);
    ctx.font = 'bold 18px Orbitron, sans-serif';
    ctx.fillStyle = '#e0ffe0';
    ctx.textAlign = 'center';
    if (prefix) {
        ctx.font = '12px Share Tech Mono, monospace';
        ctx.fillStyle = '#00ff41';
        ctx.fillText(prefix, 128, 22);
        ctx.font = 'bold 18px Orbitron, sans-serif';
        ctx.fillStyle = '#e0ffe0';
    }
    ctx.fillText(name, 128, prefix ? 44 : 40);

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.scale.set(2.8, 0.7, 1);
    sprite.position.y = 2.5;
    return sprite;
}