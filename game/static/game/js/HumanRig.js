import * as THREE from 'three';
import { toonMat } from './ToonStyle.js';

/** Reference character: headphones, black/yellow shirt, red shorts, chunky sneakers */
export const REFERENCE_OUTFIT = {
    skinTone: 0xdcd1c4,
    shirtColor: 0x1a1a1a,
    stripeColor: 0xfab134,
    shortsColor: 0xa63a3a,
    shoeColor: 0x111111,
    headphoneColor: 0xe2e2e2,
    hairColor: 0x2c2c35,
};

/** GTA-style bone hierarchy (~1.75 m) with screenshot-accurate styling */
export function buildHumanRig(opts = {}) {
    const o = { ...REFERENCE_OUTFIT, ...opts };
    const skin = o.skinTone;
    const skinMat = () => toonMat(skin);
    const skinDark = () => toonMat(new THREE.Color(skin).multiplyScalar(0.82).getHex());
    const mat = (c) => toonMat(c);

    const root = new THREE.Group();
    root.name = 'humanRig';

    const bones = {};
    const addBone = (name, parent, pos) => {
        const b = new THREE.Bone();
        b.name = name;
        b.position.set(...pos);
        (parent || root).add(b);
        bones[name] = b;
        return b;
    };

    const hips = addBone('hips', null, [0, 0.9, 0]);
    const spine = addBone('spine', hips, [0, 0.1, 0]);
    const chest = addBone('chest', spine, [0, 0.2, 0]);
    const neck = addBone('neck', chest, [0, 0.16, 0]);
    const head = addBone('head', neck, [0, 0.12, 0]);

    const shoulderL = addBone('shoulderL', chest, [-0.2, 0.12, 0]);
    const upperArmL = addBone('upperArmL', shoulderL, [-0.05, -0.04, 0]);
    const lowerArmL = addBone('lowerArmL', upperArmL, [0, -0.26, 0]);
    const handL = addBone('handL', lowerArmL, [0, -0.24, 0]);

    const shoulderR = addBone('shoulderR', chest, [0.2, 0.12, 0]);
    const upperArmR = addBone('upperArmR', shoulderR, [0.05, -0.04, 0]);
    const lowerArmR = addBone('lowerArmR', upperArmR, [0, -0.26, 0]);
    const handR = addBone('handR', lowerArmR, [0, -0.24, 0]);

    const upperLegL = addBone('upperLegL', hips, [-0.1, -0.04, 0]);
    const lowerLegL = addBone('lowerLegL', upperLegL, [0, -0.4, 0]);
    const footL = addBone('footL', lowerLegL, [0, -0.38, 0.04]);

    const upperLegR = addBone('upperLegR', hips, [0.1, -0.04, 0]);
    const lowerLegR = addBone('lowerLegR', upperLegR, [0, -0.4, 0]);
    const footR = addBone('footR', lowerLegR, [0, -0.38, 0.04]);

    const meshOn = (bone, geo, material, pos = [0, 0, 0], rot = [0, 0, 0]) => {
        const m = new THREE.Mesh(geo, material);
        m.position.set(...pos);
        m.rotation.set(...rot);
        m.castShadow = true;
        bone.add(m);
        return m;
    };

    // Red shorts
    meshOn(hips, new THREE.CylinderGeometry(0.22, 0.26, 0.32, 10), mat(o.shortsColor), [0, -0.12, 0]);

    // Black shirt torso
    meshOn(chest, new THREE.CylinderGeometry(0.22, 0.2, 0.46, 12), mat(o.shirtColor), [0, 0.08, 0]);

    // Yellow sleeve stripes
    meshOn(chest, new THREE.CylinderGeometry(0.23, 0.23, 0.03, 10), mat(o.stripeColor), [-0.22, 0.12, 0], [0, 0, 0.4]);
    meshOn(chest, new THREE.CylinderGeometry(0.23, 0.23, 0.03, 10), mat(o.stripeColor), [0.22, 0.12, 0], [0, 0, -0.4]);

    // Neck & head
    meshOn(neck, new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), skinMat(), [0, 0.03, 0]);
    meshOn(head, new THREE.SphereGeometry(0.17, 12, 12), skinMat(), [0, 0.1, 0]);

    // Hair cap
    const hairGeo = new THREE.SphereGeometry(0.18, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    meshOn(head, hairGeo, mat(o.hairColor), [0, 0.14, -0.01], [-0.3, 0, 0]);

    // Oversized headphones
    meshOn(head, new THREE.TorusGeometry(0.19, 0.02, 6, 20, Math.PI), mat(o.headphoneColor), [0, 0.08, 0], [0, 0, -Math.PI / 2]);
    [-0.17, 0.17].forEach(x => {
        meshOn(head, new THREE.CylinderGeometry(0.055, 0.055, 0.05, 10), mat(o.headphoneColor), [x, 0.08, 0], [0, 0, Math.PI / 2]);
    });

    // Eyes
    [-0.06, 0.06].forEach(x => {
        meshOn(head, new THREE.SphereGeometry(0.02, 6, 6), mat(0x1a1a2a), [x, 0.08, 0.15]);
    });

    // Arms
    meshOn(upperArmL, new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), skinMat(), [0, -0.13, 0]);
    meshOn(lowerArmL, new THREE.CapsuleGeometry(0.04, 0.18, 4, 8), skinDark(), [0, -0.13, 0]);
    meshOn(upperArmR, new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), skinMat(), [0, -0.13, 0]);
    meshOn(lowerArmR, new THREE.CapsuleGeometry(0.04, 0.18, 4, 8), skinDark(), [0, -0.13, 0]);

    // Legs (skin below shorts)
    meshOn(upperLegL, new THREE.CapsuleGeometry(0.055, 0.3, 4, 8), skinMat(), [0, -0.18, 0]);
    meshOn(lowerLegL, new THREE.CapsuleGeometry(0.05, 0.28, 4, 8), skinMat(), [0, -0.18, 0]);
    meshOn(upperLegR, new THREE.CapsuleGeometry(0.055, 0.3, 4, 8), skinMat(), [0, -0.18, 0]);
    meshOn(lowerLegR, new THREE.CapsuleGeometry(0.05, 0.28, 4, 8), skinMat(), [0, -0.18, 0]);

    // Chunky black sneakers
    meshOn(footL, new THREE.BoxGeometry(0.13, 0.14, 0.26), mat(o.shoeColor), [0, -0.06, 0.04]);
    meshOn(footR, new THREE.BoxGeometry(0.13, 0.14, 0.26), mat(o.shoeColor), [0, -0.06, 0.04]);

    return { root, bones };
}

export function createHumanAnimations() {
    const times2 = [0, 0.5, 1];
    const times4 = [0, 0.25, 0.5, 0.75, 1];

    const idle = new THREE.AnimationClip('idle', 2, [
        new THREE.VectorKeyframeTrack('hips.spine.chest.rotation', [0, 1, 2], [0, 0, 0, 0.02, 0, 0, 0, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.position', [0, 1, 2], [0, 0, 0, 0, 0.01, 0, 0, 0, 0]),
    ]);

    const walk = new THREE.AnimationClip('walk', 0.8, [
        new THREE.VectorKeyframeTrack('hips.upperLegL.rotation', times2, [0.45, 0, 0, -0.45, 0, 0, 0.45, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.rotation', times2, [-0.45, 0, 0, 0.45, 0, 0, -0.45, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegL.lowerLegL.rotation', times2, [0.1, 0, 0, 0.5, 0, 0, 0.1, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.lowerLegR.rotation', times2, [0.5, 0, 0, 0.1, 0, 0, 0.5, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderL.upperArmL.rotation', times2, [-0.35, 0, 0.1, 0.35, 0, 0.1, -0.35, 0, 0.1]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderR.upperArmR.rotation', times2, [0.35, 0, -0.1, -0.35, 0, -0.1, 0.35, 0, -0.1]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.position', times2, [0, 0, 0, 0, 0.02, 0, 0, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.neck.head.rotation', times2, [0, 0, 0, 0, 0.04, 0, 0, 0, 0]),
    ]);

    const run = new THREE.AnimationClip('run', 0.45, [
        new THREE.VectorKeyframeTrack('hips.upperLegL.rotation', times2, [0.75, 0, 0, -0.75, 0, 0, 0.75, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.rotation', times2, [-0.75, 0, 0, 0.75, 0, 0, -0.75, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderL.upperArmL.rotation', times2, [-0.65, 0, 0.15, 0.65, 0, 0.15, -0.65, 0, 0.15]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderR.upperArmR.rotation', times2, [0.65, 0, -0.15, -0.65, 0, -0.15, 0.65, 0, -0.15]),
    ]);

    const jump = new THREE.AnimationClip('jump', 0.6, [
        new THREE.VectorKeyframeTrack('hips.rotation', [0, 0.15, 0.35, 0.6], [0, 0, 0, -0.15, 0, 0, 0.1, 0, 0, 0, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegL.rotation', [0, 0.15, 0.35, 0.6], [0, 0, 0, -0.5, 0, 0, 0.3, 0, 0, 0, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.rotation', [0, 0.15, 0.35, 0.6], [0, 0, 0, -0.5, 0, 0, 0.3, 0, 0, 0, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderL.upperArmL.rotation', [0, 0.2, 0.6], [-0.8, 0, 0, 0, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderR.upperArmR.rotation', [0, 0.2, 0.6], [-0.8, 0, 0, 0, 0, 0]),
    ]);

    const climb = new THREE.AnimationClip('climb', 0.7, [
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderL.upperArmL.rotation', times4, [-1.2, 0, 0.2, -0.4, 0, 0.2, -1.2, 0, 0.2, -0.4, 0, 0.2, -1.2, 0, 0.2]),
        new THREE.VectorKeyframeTrack('hips.spine.chest.shoulderR.upperArmR.rotation', times4, [-0.4, 0, -0.2, -1.2, 0, -0.2, -0.4, 0, -0.2, -1.2, 0, -0.2, -0.4, 0, -0.2]),
        new THREE.VectorKeyframeTrack('hips.upperLegL.rotation', times4, [0.3, 0, 0, 0.1, 0, 0, 0.3, 0, 0, 0.1, 0, 0, 0.3, 0, 0]),
        new THREE.VectorKeyframeTrack('hips.upperLegR.rotation', times4, [0.1, 0, 0, 0.3, 0, 0, 0.1, 0, 0, 0.3, 0, 0, 0.1, 0, 0]),
    ]);

    return { idle, walk, run, jump, climb };
}

export function setupHumanAnimator(rigRoot) {
    const mixer = new THREE.AnimationMixer(rigRoot);
    const clips = createHumanAnimations();
    const actions = {};
    Object.entries(clips).forEach(([name, clip]) => {
        actions[name] = mixer.clipAction(clip);
    });
    if (actions.idle) actions.idle.play();
    return { mixer, actions, clips };
}