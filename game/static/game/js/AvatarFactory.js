import * as THREE from 'three';
import { PALETTE } from './config.js';
import { toonMat } from './ToonStyle.js';
import {
    createCharacterInstance,
    getBodyKeyForCitizen,
    getBodyKeyForGender,
    ALIEN_TINTS,
} from './CharacterModels.js';
import {
    setCharacterPose,
    updateLocomotionPose,
    tickAnimator,
    isRiggedAvatar,
    playEmote,
} from './CharacterAnimator.js';

export { setCharacterPose, updateLocomotionPose, tickAnimator, isRiggedAvatar, playEmote };
export const fadeHumanAction = setCharacterPose;
export const updateHumanAnimator = tickAnimator;

/** Rigged GLB — idle / walk / run / emote / jump */
export function createHumanAvatar(opts = {}) {
    const modelKey = opts.modelKey ?? getBodyKeyForGender(opts.gender ?? 'male');
    const g = createCharacterInstance('human', modelKey, opts);
    g.userData.isHuman = true;
    if (isRiggedAvatar(g)) setCharacterPose(g, 'idle', 0);
    return g;
}

/** Same rigged body, alien skin tint — full locomotion */
export function createAlienAvatar(opts = {}) {
    const variant = opts.variant ?? 0;
    const modelKey = opts.modelKey ?? getBodyKeyForCitizen('', 'alien', variant);
    const g = createCharacterInstance('alien', modelKey, {
        ...opts,
        variant,
        tint: opts.tint ?? ALIEN_TINTS[variant % ALIEN_TINTS.length],
        tintStrength: opts.tintStrength ?? 0.42,
    });
    g.userData.isAlien = true;
    if (isRiggedAvatar(g)) setCharacterPose(g, 'idle', 0);
    return g;
}

export function createStudentAvatar(opts = {}) {
    const name = opts.name ?? '';
    const modelKey = getBodyKeyForCitizen(name, 'human', opts.variant ?? 0);
    return createHumanAvatar({ ...opts, modelKey, gender: modelKey });
}

export function createCommuterAvatar(opts = {}) {
    const modelKey = getBodyKeyForCitizen(opts.name ?? '', 'human', opts.variant ?? 1);
    return createHumanAvatar({ ...opts, modelKey, gender: modelKey });
}

export function createWandererAvatar(opts = {}) {
    const g = createHumanAvatar({ variant: 0, gender: 'male', ...opts });
    g.userData.isWanderer = true;
    return g;
}

export function createCyclistAvatar(opts = {}) {
    const modelKey = getBodyKeyForCitizen(opts.name ?? '', 'human', opts.variant ?? 1);
    const g = createHumanAvatar({ ...opts, modelKey, gender: modelKey });
    g.position.y = 0.35;
    const bike = createBicycle();
    g.add(bike);
    g.userData.isCyclist = true;
    g.userData.bike = bike;
    return g;
}

export function createBicycle() {
    const bike = new THREE.Group();
    bike.name = 'bicycle';
    const frameMat = toonMat(0x6a7a88);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.6), frameMat);
    frame.position.set(0, 0.65, 0);
    frame.rotation.x = 0.4;
    frame.castShadow = true;
    bike.add(frame);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.06), frameMat);
    bar.position.set(0, 0.95, 0.15);
    bar.rotation.y = 0.3;
    bar.castShadow = true;
    bike.add(bar);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.1), toonMat(0x2a2a2a));
    seat.position.set(-0.1, 0.88, -0.15);
    seat.castShadow = true;
    bike.add(seat);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.3), toonMat(0xc8a878));
    basket.position.set(0, 0.95, 0.45);
    basket.castShadow = true;
    bike.add(basket);
    const wheelGeo = new THREE.TorusGeometry(0.28, 0.04, 8, 16);
    [-0.35, 0.35].forEach(z => {
        const w = new THREE.Mesh(wheelGeo, toonMat(0x2a2a2a));
        w.rotation.y = Math.PI / 2;
        w.position.set(0, 0.28, z);
        w.castShadow = true;
        bike.add(w);
    });
    return bike;
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

export function animateHumanWalk(avatar, _walkT, _intensity = 1) {
    if (isRiggedAvatar(avatar)) setCharacterPose(avatar, 'walk', 0.12);
}

export function animateWanderer(avatar, t) {
    if (isRiggedAvatar(avatar) && Math.sin(t * 0.4) > 0.95) {
        playEmote(avatar, 0.3);
    } else {
        setCharacterPose(avatar, 'idle', 0.3);
    }
}

export function animateCyclist(avatar, _t, speed = 1) {
    updateLocomotionPose(avatar, { moving: true, running: false, onGround: true, fade: 0.15 });
    if (avatar.userData.mixer) avatar.userData.mixer.timeScale = speed * 1.2;
    const bike = avatar.userData.bike;
    if (bike) bike.rotation.z += speed * 0.02;
}

export function createUFO() {
    const ufo = new THREE.Group();
    const metal = toonMat(0xc0c8d0, { emissive: 0x8898a8, emissiveIntensity: 0.05 });
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4, 0.5, 32), metal);
    ufo.add(hull);
    const rim = new THREE.Mesh(
        new THREE.TorusGeometry(3.8, 0.12, 8, 32),
        toonMat(PALETTE.orange, { emissive: PALETTE.orange, emissiveIntensity: 0.2 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.1;
    rim.name = 'rimLight';
    ufo.add(rim);
    const dome = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        toonMat(0xa8c8e0, { transparent: true, opacity: 0.75 })
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