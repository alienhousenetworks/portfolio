import * as THREE from 'three';
import { COLORS } from './config.js';

const SKIN_TONES = [0xc4a882, 0x8d6e4c, 0xf5d0a9, 0x6b4c3b];
const SUIT_COLORS = [COLORS.alienDim, 0x1a3a2a, 0x0a2030, 0x2a1a3a, COLORS.alien];

export function createAvatar(options = {}) {
    const {
        skinTone = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
        suitColor = SUIT_COLORS[Math.floor(Math.random() * SUIT_COLORS.length)],
        accentColor = COLORS.alien,
        scale = 1,
        name = 'Visitor',
    } = options;

    const group = new THREE.Group();
    group.name = name;

    const bodyMat = new THREE.MeshStandardMaterial({
        color: suitColor,
        roughness: 0.7,
        metalness: 0.1,
    });
    const skinMat = new THREE.MeshStandardMaterial({
        color: skinTone,
        roughness: 0.8,
    });
    const accentMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.15,
        roughness: 0.5,
    });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 4, 8), bodyMat);
    torso.position.y = 1.1;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), skinMat);
    head.position.y = 1.75;
    group.add(head);

    const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.08, 0.15),
        new THREE.MeshStandardMaterial({
            color: COLORS.alienCyan,
            emissive: COLORS.alienCyan,
            emissiveIntensity: 0.4,
            transparent: true,
            opacity: 0.8,
        })
    );
    visor.position.set(0, 1.78, 0.12);
    group.add(visor);

    const shoulderPadL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.25), accentMat);
    shoulderPadL.position.set(-0.42, 1.45, 0);
    group.add(shoulderPadL);

    const shoulderPadR = shoulderPadL.clone();
    shoulderPadR.position.x = 0.42;
    group.add(shoulderPadR);

    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.4, 4, 6), bodyMat);
    armL.position.set(-0.45, 1.0, 0);
    armL.rotation.z = 0.15;
    group.add(armL);

    const armR = armL.clone();
    armR.position.x = 0.45;
    armR.rotation.z = -0.15;
    group.add(armR);

    const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.5, 4, 6), bodyMat);
    legL.position.set(-0.15, 0.35, 0);
    group.add(legL);

    const legR = legL.clone();
    legR.position.x = 0.15;
    group.add(legR);

    const bootMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.22), bootMat);
    bootL.position.set(-0.15, 0.05, 0.03);
    group.add(bootL);
    const bootR = bootL.clone();
    bootR.position.x = 0.15;
    group.add(bootR);

    group.scale.setScalar(scale);
    group.userData.isAvatar = true;

    return group;
}

export function createUFO() {
    const ufo = new THREE.Group();
    ufo.name = 'UFO';

    const hullMat = new THREE.MeshStandardMaterial({
        color: COLORS.ufoHull,
        metalness: 0.8,
        roughness: 0.3,
    });
    const glowMat = new THREE.MeshStandardMaterial({
        color: COLORS.ufoGlow,
        emissive: COLORS.ufoGlow,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9,
    });

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 0.6, 32), hullMat);
    disc.position.y = 0;
    ufo.add(disc);

    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({
            color: COLORS.alienCyan,
            emissive: COLORS.alienCyan,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6,
            metalness: 0.5,
        })
    );
    dome.position.y = 0.3;
    ufo.add(dome);

    const ringCount = 12;
    for (let i = 0; i < ringCount; i++) {
        const angle = (i / ringCount) * Math.PI * 2;
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), glowMat);
        light.position.set(Math.cos(angle) * 3.2, -0.1, Math.sin(angle) * 3.2);
        ufo.add(light);
    }

    const beam = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 4, 16, 1, true),
        new THREE.MeshBasicMaterial({
            color: COLORS.alien,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
        })
    );
    beam.position.y = -2.5;
    beam.name = 'beam';
    ufo.add(beam);

    const engineLight = new THREE.PointLight(COLORS.ufoGlow, 3, 20);
    engineLight.position.y = -1;
    ufo.add(engineLight);

    return ufo;
}

export function createNameTag(name, color = COLORS.alien) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(2, 2, 2, 0.7)';
    ctx.fillRect(0, 0, 256, 64);
    ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 248, 56);
    ctx.font = 'bold 22px Orbitron, sans-serif';
    ctx.fillStyle = '#e0ffe0';
    ctx.textAlign = 'center';
    ctx.fillText(name, 128, 40);

    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, transparent: true })
    );
    sprite.scale.set(2.5, 0.6, 1);
    sprite.position.y = 2.3;
    return sprite;
}